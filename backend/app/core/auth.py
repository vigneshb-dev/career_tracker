import logging
from typing import List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_access_token
from app.core.redis_store import redis_store
from app.models.entities import User, Trainee, Employer

logger = logging.getLogger("skilltrace.auth")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Authenticates requests via JWT bearer token.
    Enforces token validity, blacklist revocation, and active user verification.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check revocation blacklist in Redis / cache
    if redis_store.is_token_blacklisted(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session token has been revoked / logged out.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: Optional[str] = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is missing user subject identifier.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        # Fallback query by email if sub was email in legacy tokens
        email = payload.get("email")
        if email:
            user = db.query(User).filter(User.email == email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated user record does not exist.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This user account has been deactivated.",
        )

    return user


def require_roles(allowed_roles: List[str]):
    """
    Role-Based Access Control (RBAC) dependency factory.
    Enforces that the current authenticated user possesses one of the allowed roles.
    """
    allowed_upper = [r.upper() for r in allowed_roles]

    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role = (current_user.role or "").upper()
        if user_role not in allowed_upper:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: User role '{user_role}' is not authorized. Required: {allowed_roles}"
            )
        return current_user

    return role_checker


# ---------------- Resource-Level Authorization Helpers ---------------- #

def verify_trainee_resource_access(trainee_id: str, current_user: User, db: Session) -> Trainee:
    """
    Enforces strict resource-level authorization for Trainee records:
    - ADMIN: Full access to all trainees
    - COACH: Access only if trainee is assigned to this coach
    - TRAINEE: Access ONLY to their own profile
    - EMPLOYER: Access only if trainee is in authorized candidates
    """
    user_role = (current_user.role or "").upper()
    trainee = db.query(Trainee).filter(Trainee.id == trainee_id).first()
    if not trainee:
        raise HTTPException(status_code=404, detail="Trainee record not found.")

    if user_role == "ADMIN":
        return trainee

    if user_role == "TRAINEE":
        # Check ownership via user_id, profile link, or email match
        owns_record = (
            trainee.user_id == current_user.id or
            trainee.email.lower() == current_user.email.lower() or
            (current_user.trainee_profile and current_user.trainee_profile.trainee_id == trainee.id)
        )
        if not owns_record:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Trainees are strictly restricted to their own record."
            )
        return trainee

    if user_role == "COACH":
        assigned_ids = []
        if current_user.coach_profile and current_user.coach_profile.assigned_trainee_ids:
            assigned_ids = current_user.coach_profile.assigned_trainee_ids
        if trainee.id not in assigned_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Trainee {trainee_id} is not assigned to coach {current_user.full_name}."
            )
        return trainee

    if user_role == "EMPLOYER":
        authorized_ids = []
        if current_user.employer_profile and current_user.employer_profile.authorized_candidate_ids:
            authorized_ids = current_user.employer_profile.authorized_candidate_ids
        if trainee.id not in authorized_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Employer lacks authorized access to candidate {trainee_id}."
            )
        return trainee

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized resource access.")


def verify_employer_resource_access(employer_id: str, current_user: User, db: Session) -> Employer:
    """
    Enforces resource-level authorization for Employer records:
    - ADMIN: Full access
    - EMPLOYER: Access only to their own organization
    """
    user_role = (current_user.role or "").upper()
    employer = db.query(Employer).filter(Employer.id == employer_id).first()
    if not employer:
        raise HTTPException(status_code=404, detail="Employer organization not found.")

    if user_role == "ADMIN":
        return employer

    if user_role == "EMPLOYER":
        user_emp_id = current_user.employer_profile.employer_id if current_user.employer_profile else None
        if user_emp_id != employer_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You may only manage your own employer organization."
            )
        return employer

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized employer resource access.")
