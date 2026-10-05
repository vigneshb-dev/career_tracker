import logging
import time
import threading
from typing import Optional
import redis
from app.core.config import settings

logger = logging.getLogger("skilltrace.redis_store")

class InMemoryStore:
    """Thread-safe in-memory fallback store with TTL support for development."""
    def __init__(self):
        self._store = {}
        self._lock = threading.Lock()

    def _cleanup_expired_locked(self, now: float):
        """Removes expired entries while lock is already acquired."""
        expired_keys = [k for k, (_, exp) in self._store.items() if exp and now > exp]
        for k in expired_keys:
            del self._store[k]

    def set(self, key: str, value: str, ex: Optional[int] = None) -> bool:
        now = time.time()
        expire_at = (now + ex) if ex else None
        with self._lock:
            # Bound store size by pruning expired keys periodically
            if len(self._store) > 50:
                self._cleanup_expired_locked(now)
            self._store[key] = (value, expire_at)
        return True

    def get(self, key: str) -> Optional[str]:
        now = time.time()
        with self._lock:
            if key not in self._store:
                return None
            val, expire_at = self._store[key]
            if expire_at and now > expire_at:
                del self._store[key]
                return None
            return val

    def delete(self, key: str) -> bool:
        with self._lock:
            if key in self._store:
                del self._store[key]
                return True
            return False

    def exists(self, key: str) -> bool:
        return self.get(key) is not None


class RedisManager:
    """Manages Redis connection with graceful in-memory fallback."""
    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        self.in_memory = InMemoryStore()
        self.is_connected = False
        self._init_connection()

    def _init_connection(self):
        try:
            client = redis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=1,
                socket_timeout=1
            )
            client.ping()
            self.redis_client = client
            self.is_connected = True
            logger.info(f"Connected to Redis at {settings.REDIS_URL}")
        except Exception as e:
            self.redis_client = None
            self.is_connected = False
            logger.warning(f"Redis unavailable ({e}). Using thread-safe in-memory cache for auth sessions & OTP.")

    def set(self, key: str, value: str, ex: Optional[int] = None) -> bool:
        if self.is_connected and self.redis_client:
            try:
                return bool(self.redis_client.set(key, value, ex=ex))
            except Exception as e:
                logger.warning(f"Redis error during set: {e}. Falling back to in-memory store.")
                self.is_connected = False
        return self.in_memory.set(key, value, ex=ex)

    def get(self, key: str) -> Optional[str]:
        if self.is_connected and self.redis_client:
            try:
                return self.redis_client.get(key)
            except Exception as e:
                logger.warning(f"Redis error during get: {e}. Falling back to in-memory store.")
                self.is_connected = False
        return self.in_memory.get(key)

    def delete(self, key: str) -> bool:
        if self.is_connected and self.redis_client:
            try:
                return bool(self.redis_client.delete(key))
            except Exception as e:
                logger.warning(f"Redis error during delete: {e}. Falling back to in-memory store.")
                self.is_connected = False
        return self.in_memory.delete(key)

    def exists(self, key: str) -> bool:
        if self.is_connected and self.redis_client:
            try:
                return bool(self.redis_client.exists(key))
            except Exception as e:
                logger.warning(f"Redis error during exists: {e}. Falling back to in-memory store.")
                self.is_connected = False
        return self.in_memory.exists(key)

    # ---------------- Auth-specific helpers ---------------- #
    def set_otp(self, email: str, otp: str, expire_seconds: int = 600) -> bool:
        """Stores a 6-digit OTP for an email with 10-minute expiry."""
        key = f"otp:{email.lower().strip()}"
        return self.set(key, otp, ex=expire_seconds)

    def verify_otp(self, email: str, otp: str) -> bool:
        """Verifies and consumes the OTP."""
        key = f"otp:{email.lower().strip()}"
        stored = self.get(key)
        if stored and stored == str(otp).strip():
            self.delete(key)
            return True
        return False

    def get_otp(self, email: str) -> Optional[str]:
        key = f"otp:{email.lower().strip()}"
        return self.get(key)

    def blacklist_token(self, token: str, expire_seconds: int = 86400) -> bool:
        """Adds a revoked JWT token to the blacklist."""
        key = f"token_blacklist:{token}"
        return self.set(key, "revoked", ex=expire_seconds)

    def is_token_blacklisted(self, token: str) -> bool:
        key = f"token_blacklist:{token}"
        return self.exists(key)


redis_store = RedisManager()
