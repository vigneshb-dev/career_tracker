"""
Lightweight Production Memory Diagnostics
==========================================
Zero-dependency, sub-millisecond process RSS and heap memory monitoring.
Safely detects memory pressure against Render's 512 MiB limit without imposing
runtime overhead or logging sensitive payload data.
"""

import os
import sys
import gc
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("skilltrace.diagnostics")

RENDER_MEMORY_LIMIT_MIB = float(os.getenv("RENDER_MEMORY_LIMIT_MIB", "512.0"))
MEMORY_WARNING_THRESHOLD_MIB = float(os.getenv("MEMORY_WARNING_THRESHOLD_MIB", "400.0"))


def get_process_rss_mb() -> float:
    """
    Returns current process Resident Set Size (RSS) in MiB.
    Platform-native, sub-millisecond execution:
    - Linux / Docker: parses /proc/self/statm or /proc/self/status directly.
    - Windows: calls GetProcessMemoryInfo via ctypes.
    - POSIX Fallback: resource.getrusage.
    """
    try:
        # 1. Linux / Docker container (Render runtime)
        if os.path.exists("/proc/self/statm"):
            with open("/proc/self/statm", "r") as f:
                parts = f.read().split()
                # Second field is resident pages
                resident_pages = int(parts[1])
                page_size = os.sysconf("SC_PAGE_SIZE") if hasattr(os, "sysconf") else 4096
                return round((resident_pages * page_size) / (1024.0 * 1024.0), 2)

        if os.path.exists("/proc/self/status"):
            with open("/proc/self/status", "r") as f:
                for line in f:
                    if line.startswith("VmRSS:"):
                        kb = float(line.split()[1])
                        return round(kb / 1024.0, 2)

        # 2. Windows development environment
        if sys.platform == "win32":
            import ctypes
            from ctypes import wintypes
            class PROCESS_MEMORY_COUNTERS_EX(ctypes.Structure):
                _fields_ = [
                    ('cb', wintypes.DWORD),
                    ('PageFaultCount', wintypes.DWORD),
                    ('PeakWorkingSetSize', ctypes.c_size_t),
                    ('WorkingSetSize', ctypes.c_size_t),
                    ('QuotaPeakPagedPoolUsage', ctypes.c_size_t),
                    ('QuotaPagedPoolUsage', ctypes.c_size_t),
                    ('QuotaPeakNonPagedPoolUsage', ctypes.c_size_t),
                    ('QuotaNonPagedPoolUsage', ctypes.c_size_t),
                    ('PagefileUsage', ctypes.c_size_t),
                    ('PeakPagefileUsage', ctypes.c_size_t),
                    ('PrivateUsage', ctypes.c_size_t),
                ]
            fn = ctypes.windll.psapi.GetProcessMemoryInfo
            fn.argtypes = [wintypes.HANDLE, ctypes.POINTER(PROCESS_MEMORY_COUNTERS_EX), wintypes.DWORD]
            fn.restype = wintypes.BOOL
            pmc = PROCESS_MEMORY_COUNTERS_EX()
            pmc.cb = ctypes.sizeof(PROCESS_MEMORY_COUNTERS_EX)
            h = ctypes.windll.kernel32.GetCurrentProcess()
            if fn(h, ctypes.byref(pmc), pmc.cb):
                return round(pmc.WorkingSetSize / (1024.0 * 1024.0), 2)

        # 3. Generic POSIX fallback
        try:
            import resource
            ru = resource.getrusage(resource.RUSAGE_SELF)
            maxrss = ru.ru_maxrss
            # On macOS maxrss is in bytes, on Linux in kilobytes
            if sys.platform == "darwin":
                return round(maxrss / (1024.0 * 1024.0), 2)
            return round(maxrss / 1024.0, 2)
        except ImportError:
            pass

    except Exception as e:
        logger.debug(f"Failed to read native process memory: {e}")

    return 0.0


def get_memory_diagnostics() -> Dict[str, Any]:
    """
    Returns structured memory consumption metrics for health and diagnostic reporting.
    """
    rss = get_process_rss_mb()
    limit = RENDER_MEMORY_LIMIT_MIB
    pct = round((rss / limit) * 100.0, 1) if limit > 0 else 0.0

    if rss >= limit * 0.85:
        pressure_level = "CRITICAL"
    elif rss >= limit * 0.70:
        pressure_level = "WARNING"
    else:
        pressure_level = "HEALTHY"

    return {
        "status": pressure_level,
        "rss_mb": rss,
        "limit_mb": limit,
        "usage_percent": pct,
        "safe_headroom_mb": round(max(0.0, limit - rss), 2),
        "warning_threshold_mb": MEMORY_WARNING_THRESHOLD_MIB,
        "environment": os.getenv("ENVIRONMENT", "development")
    }


def check_and_log_memory(operation: str, threshold_mb: Optional[float] = None) -> float:
    """
    Logs diagnostic warning if memory exceeds the specified threshold.
    Never logs request payloads, credentials, tokens, or PII.
    Safe: will never raise an exception or crash a request.
    """
    try:
        limit = threshold_mb or MEMORY_WARNING_THRESHOLD_MIB
        rss = get_process_rss_mb()
        if rss >= limit:
            logger.warning(
                f"[MEMORY ALERT] Operation '{operation}' reached {rss:.1f} MiB RSS "
                f"({(rss / RENDER_MEMORY_LIMIT_MIB) * 100:.1f}% of {RENDER_MEMORY_LIMIT_MIB:.0f} MiB limit). "
                f"Triggering garbage collection."
            )
            gc.collect()
        return rss
    except Exception:
        return 0.0
