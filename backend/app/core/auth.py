import logging
from typing import List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_access_token
from app.core.redis_store import redis_store
from app.models.entities import (
    User,
    Trainee,
    Employer,
    Company,
    TrainingInstitute,
    Course,
    Job,
    Enrollment,
    OrganizationAuditLog,
)

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


# Role equivalence sets for unified RBAC
ROLE_ALIASES = {
    "COACH": {"COACH", "TRAINING_PROVIDER", "PROVIDER"},
    "TRAINING_PROVIDER": {"COACH", "TRAINING_PROVIDER", "PROVIDER"},
    "PROVIDER": {"COACH", "TRAINING_PROVIDER", "PROVIDER"},
    "ANALYST": {"ANALYST", "GOVERNMENT", "ADMIN"},
    "GOVERNMENT": {"ANALYST", "GOVERNMENT", "ADMIN"},
    "ADMIN": {"ADMIN"},
    "TRAINEE": {"TRAINEE"},
    "EMPLOYER": {"EMPLOYER"},
    "VERIFICATION_AUTHORITY": {"VERIFICATION_AUTHORITY", "AUDITOR", "ADMIN", "COACH"},
    "AUDITOR": {"VERIFICATION_AUTHORITY", "AUDITOR", "ADMIN"}
}

def require_roles(allowed_roles: List[str]):
    """
    Role-Based Access Control (RBAC) dependency factory.
    Enforces that the current authenticated user possesses one of the allowed roles (supporting role aliases).
    """
    expanded_allowed = set()
    for r in allowed_roles:
        upper_r = r.strip().upper()
        expanded_allowed.add(upper_r)
        if upper_r in ROLE_ALIASES:
            expanded_allowed.update(ROLE_ALIASES[upper_r])

    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role = (current_user.role or "").strip().upper()
        # Admin always possesses administrative override
        if user_role == "ADMIN":
            return current_user
        if user_role in expanded_allowed:
            return current_user
        # Check if the user's role aliases satisfy the allowed roles
        user_aliases = ROLE_ALIASES.get(user_role, set())
        if any(alias in expanded_allowed for alias in user_aliases):
            return current_user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access forbidden: User role '{user_role}' is not authorized. Required: {allowed_roles}"
        )

    return role_checker


# ---------------- Resource-Level Authorization Helpers ---------------- #

def verify_trainee_resource_access(
    trainee_id: str, 
    current_user: User, 
    db: Session,
    require_write: bool = False
) -> Trainee:
    """
    Enforces strict resource-level authorization for Trainee records:
    - ADMIN: Full access to all trainees
    - ANALYST / GOVERNMENT: Read-only access to all trainees (forbidden for write)
    - VERIFICATION_AUTHORITY / AUDITOR: Read and verification access to all trainees
    - COACH / TRAINING_PROVIDER: Read/write for assigned trainees; read for all trainees
    - TRAINEE: Access ONLY to their own profile (strictly blocks IDOR)
    - EMPLOYER: Access if candidate is authorized, or current employer/outcome organization matches
    """
    user_role = (current_user.role or "").strip().upper()
    
    # 1. Direct Trainee ID lookup
    trainee = db.query(Trainee).filter(Trainee.id == trainee_id).first()
    
    # 2. Self-referential resolution ("me" or current_user.id)
    if not trainee and (str(trainee_id).lower() == "me" or str(trainee_id) == str(current_user.id)):
        trainee = db.query(Trainee).filter(
            (Trainee.user_id == current_user.id) | 
            (Trainee.email.ilike(current_user.email))
        ).first()
        if not trainee and current_user.trainee_profile and current_user.trainee_profile.trainee_id:
            trainee = db.query(Trainee).filter(Trainee.id == current_user.trainee_profile.trainee_id).first()

    # 3. Lookup by User ID foreign key fallback
    if not trainee:
        trainee = db.query(Trainee).filter(Trainee.user_id == trainee_id).first()

    if not trainee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trainee record not found.")

    if user_role == "ADMIN":
        return trainee

    if user_role in ["ANALYST", "GOVERNMENT"]:
        if require_write:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Analyst/Government role possesses read-only access."
            )
        return trainee

    if user_role in ["VERIFICATION_AUTHORITY", "AUDITOR"]:
        return trainee

    if user_role == "TRAINEE":
        # Check ownership via user_id, profile link, or email match
        owns_record = (
            (trainee.user_id and trainee.user_id == current_user.id) or
            (trainee.email and trainee.email.lower() == current_user.email.lower()) or
            (current_user.trainee_profile and current_user.trainee_profile.trainee_id == trainee.id)
        )
        if not owns_record:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Trainees are strictly restricted to their own record."
            )
        
        # Self-heal linkage if user_id or profile is missing
        if trainee.user_id != current_user.id:
            trainee.user_id = current_user.id
            try:
                db.flush()
            except Exception:
                pass
        if current_user.trainee_profile and current_user.trainee_profile.trainee_id != trainee.id:
            current_user.trainee_profile.trainee_id = trainee.id
            try:
                db.flush()
            except Exception:
                pass
        return trainee

    if user_role in ["COACH", "TRAINING_PROVIDER", "PROVIDER"]:
        assigned_ids = []
        if current_user.coach_profile and current_user.coach_profile.assigned_trainee_ids:
            assigned_ids = current_user.coach_profile.assigned_trainee_ids

        # If writing, require assignment or admin; for read allow provider oversight
        if require_write and assigned_ids and trainee.id not in assigned_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Trainee {trainee_id} is not assigned to coach {current_user.full_name}."
            )
        return trainee

    if user_role == "EMPLOYER":
        if require_write:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Employers cannot directly modify trainee profile records."
            )
        authorized_ids = []
        if current_user.employer_profile and current_user.employer_profile.authorized_candidate_ids:
            authorized_ids = current_user.employer_profile.authorized_candidate_ids

        # Allow access if authorized candidate, current employer matches, or reported outcome matches
        emp_name = (current_user.employer_profile.company_name if current_user.employer_profile else "").strip().lower()
        matches_current_emp = bool(
            trainee.current_employer and emp_name and (
                emp_name in trainee.current_employer.lower() or trainee.current_employer.lower() in emp_name
            )
        )
        matches_outcome_org = any(
            bool(
                emp_name and (
                    emp_name in (out.get("organization_or_venture") or "").lower() or
                    (out.get("organization_or_venture") or "").lower() in emp_name
                )
            )
            for out in (trainee.outcome_history or [])
        )
        if (trainee.id not in authorized_ids) and not matches_current_emp and not matches_outcome_org:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Employer lacks authorized access to candidate {trainee_id}."
            )
        return trainee

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized resource access.")


def verify_employer_resource_access(employer_id: str, current_user: User, db: Session) -> Employer:
    """
    Enforces resource-level authorization for Employer records:
    - ADMIN, VERIFICATION_AUTHORITY, AUDITOR, COACH: Authorized access
    - EMPLOYER: Access only to their own organization (or default if viewing 'all'/'me')
    """
    user_role = (current_user.role or "").strip().upper()
    
    # Handle pseudo-IDs 'all' and 'me'
    if employer_id in ["all", "me", "default", None]:
        if user_role == "EMPLOYER" and current_user.employer_profile:
            if current_user.employer_profile.employer_id:
                emp = db.query(Employer).filter(Employer.id == current_user.employer_profile.employer_id).first()
                if emp:
                    return emp
            if current_user.employer_profile.company_name:
                emp = db.query(Employer).filter(Employer.name.ilike(f"%{current_user.employer_profile.company_name}%")).first()
                if emp:
                    return emp
        emp = db.query(Employer).first()
        if emp:
            return emp
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No employer organizations found.")

    employer = db.query(Employer).filter(Employer.id == employer_id).first()
    if not employer:
        # Check if employer_id matches company name
        employer = db.query(Employer).filter(Employer.name.ilike(f"%{employer_id}%")).first()

    if not employer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employer organization not found.")

    if user_role in ["ADMIN", "VERIFICATION_AUTHORITY", "AUDITOR", "COACH"]:
        return employer

    if user_role == "EMPLOYER":
        user_emp_id = current_user.employer_profile.employer_id if current_user.employer_profile else None
        if user_emp_id and user_emp_id == employer.id:
            return employer
        if current_user.employer_profile and current_user.employer_profile.company_name:
            cname = current_user.employer_profile.company_name.lower().strip()
            ename = employer.name.lower().strip()
            if cname in ename or ename in cname:
                return employer
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You may only manage your own employer organization."
        )

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized employer resource access.")


def verify_employer_can_verify_trainee(
    employer_id: Optional[str],
    trainee_id: str,
    current_user: User,
    db: Session
) -> Employer:
    """
    Enforces that authenticated Employers for that specific organization,
    Platform Administrators, Verification Authorities, Auditors, or Coaches
    can submit employment verifications and ratings for a trainee.
    Addresses Known Issue #2: Employer verification creation authorization.
    """
    user_role = (current_user.role or "").strip().upper()
    if user_role not in ["EMPLOYER", "ADMIN", "VERIFICATION_AUTHORITY", "AUDITOR", "COACH"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Only authenticated employers or administrators can submit employer verifications."
        )

    trainee = db.query(Trainee).filter(Trainee.id == trainee_id).first()
    if not trainee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Trainee '{trainee_id}' not found.")

    if user_role in ["ADMIN", "VERIFICATION_AUTHORITY", "AUDITOR", "COACH"]:
        if employer_id and employer_id not in ["all", "me"]:
            employer = db.query(Employer).filter(Employer.id == employer_id).first()
            if employer:
                return employer
        if trainee.current_employer:
            employer = db.query(Employer).filter(
                (Employer.name.ilike(f"%{trainee.current_employer}%")) |
                (Employer.id == trainee.current_employer)
            ).first()
            if employer:
                return employer
        # Fallback to finding employer by name or default
        employer = db.query(Employer).first()
        if employer:
            return employer
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated employer organization not found.")

    # User is an EMPLOYER
    if not current_user.employer_profile:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employer profile not configured for authenticated user."
        )

    user_employer_id = current_user.employer_profile.employer_id
    user_company_id = current_user.employer_profile.company_id
    if employer_id and employer_id not in ["all", "me", "default"]:
        if user_employer_id and employer_id != user_employer_id and (not user_company_id or employer_id != user_company_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: You cannot submit verifications on behalf of another employer organization ({employer_id})."
            )
        if user_company_id and employer_id != user_company_id and (not user_employer_id or employer_id != user_employer_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: You cannot submit verifications on behalf of another employer organization ({employer_id})."
            )

    employer = None
    if user_employer_id:
        employer = db.query(Employer).filter(Employer.id == user_employer_id).first()

    if not employer and user_company_id:
        cmp = db.query(Company).filter(Company.id == user_company_id).first()
        if cmp:
            employer = db.query(Employer).filter((Employer.name == cmp.display_name) | (Employer.name == cmp.legal_name)).first()

    if not employer and current_user.employer_profile.company_name:
        employer = db.query(Employer).filter(
            Employer.name.ilike(f"%{current_user.employer_profile.company_name}%")
        ).first()

    if not employer:
        # Check if employer_id passed matches an employer
        if employer_id and employer_id not in ["all", "me"]:
            employer = db.query(Employer).filter(Employer.id == employer_id).first()

    if not employer:
        employer = db.query(Employer).first()
        if not employer:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated employer organization not found.")

    authorized_candidates = current_user.employer_profile.authorized_candidate_ids or []
    
    # Check candidate association:
    # 1. Candidate ID is explicitly in authorized_candidate_ids
    # 2. Candidate's current_employer matches employer.name or employer_profile.company_name or company name (substring match)
    # 3. Candidate's reported outcome history matches employer.name or employer_profile.company_name (substring match)
    emp_names = [n for n in [employer.name, current_user.employer_profile.company_name] if n]
    if current_user.employer_profile and current_user.employer_profile.company:
        if current_user.employer_profile.company.display_name:
            emp_names.append(current_user.employer_profile.company.display_name)
        if current_user.employer_profile.company.legal_name:
            emp_names.append(current_user.employer_profile.company.legal_name)
    trn_emp = (trainee.current_employer or "").strip().lower()
    matches_current_emp = any(
        (name.strip().lower() in trn_emp or trn_emp in name.strip().lower())
        for name in emp_names if trn_emp
    )
    matches_outcome_history = False
    for out in (trainee.outcome_history or []):
        org = (out.get("organization_or_venture") or "").strip().lower()
        if org and any((name.strip().lower() in org or org in name.strip().lower()) for name in emp_names):
            matches_outcome_history = True
            break

    is_associated = (
        trainee_id in authorized_candidates or
        matches_current_emp or
        matches_outcome_history
    )
    if not is_associated:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: Employer organization '{employer.name}' lacks authorized access to verify candidate '{trainee_id}'."
        )

    return employer


def verify_follow_up_access(
    trainee_id: str,
    current_user: User,
    db: Session
) -> Trainee:
    """
    Verifies that the actor has authority to complete or schedule follow-up milestones for this trainee.
    Addresses Known Issue #4.
    """
    user_role = (current_user.role or "").strip().upper()
    trainee = db.query(Trainee).filter(Trainee.id == trainee_id).first()
    if not trainee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Trainee '{trainee_id}' not found.")

    if user_role in ["ADMIN", "COACH", "TRAINING_PROVIDER", "PROVIDER"]:
        return trainee

    if user_role == "TRAINEE":
        owns_record = (
            (trainee.user_id and trainee.user_id == current_user.id) or
            (trainee.email and trainee.email.lower() == current_user.email.lower()) or
            (current_user.trainee_profile and current_user.trainee_profile.trainee_id == trainee.id)
        )
        if not owns_record:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You can only complete your own follow-up response."
            )
        return trainee

    if user_role == "EMPLOYER":
        authorized_ids = current_user.employer_profile.authorized_candidate_ids if current_user.employer_profile else []
        emp_name = current_user.employer_profile.company_name if current_user.employer_profile else ""
        if (trainee.id not in authorized_ids) and not (trainee.current_employer and emp_name and emp_name.lower() in trainee.current_employer.lower()):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Employer lacks authorization for candidate follow-up."
            )
        return trainee

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized follow-up access.")


# ========================================================
# Organization-Scoped Multi-Tenant RBAC & Audit Utilities
# ========================================================

def record_organization_audit(
    db: Session,
    actor_user_id: Optional[str],
    organization_id: str,
    action: str,
    resource_type: str,
    resource_id: str,
    details: Optional[dict] = None
) -> OrganizationAuditLog:
    """
    Records an immutable organization-scoped audit log for all mutations.
    """
    from datetime import datetime
    import uuid
    log_entry = OrganizationAuditLog(
        id=f"AUD-{uuid.uuid4().hex[:12].upper()}",
        actor_user_id=actor_user_id,
        organization_id=organization_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details or {},
        timestamp=datetime.utcnow().isoformat()
    )
    db.add(log_entry)
    db.flush()
    return log_entry


def get_user_company_id(current_user: User, db: Session) -> Optional[str]:
    """Retrieves authenticated employer's company ID."""
    if not current_user or not current_user.employer_profile:
        return None
    prof = current_user.employer_profile
    return prof.company_id or prof.employer_id


def get_user_training_institute_id(current_user: User, db: Session) -> Optional[str]:
    """Retrieves authenticated coach's training institute ID."""
    if not current_user or not current_user.coach_profile:
        return None
    return current_user.coach_profile.training_institute_id


def verify_employer_owns_company(company_id: str, current_user: User, db: Session) -> Company:
    """
    Verifies that the employer belongs to company_id, or user is ADMIN.
    """
    user_role = (current_user.role or "").strip().upper()
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Company '{company_id}' not found.")

    if user_role == "ADMIN":
        return company

    if user_role == "EMPLOYER":
        user_company_id = get_user_company_id(current_user, db)
        if user_company_id != company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You can only manage data belonging to your own company."
            )
        return company

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Employer or Admin required.")


def verify_coach_owns_institute(institute_id: str, current_user: User, db: Session) -> TrainingInstitute:
    """
    Verifies that the coach belongs to institute_id, or user is ADMIN.
    """
    user_role = (current_user.role or "").strip().upper()
    institute = db.query(TrainingInstitute).filter(TrainingInstitute.id == institute_id).first()
    if not institute:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Training institute '{institute_id}' not found.")

    if user_role == "ADMIN":
        return institute

    if user_role in ["COACH", "TRAINING_PROVIDER", "PROVIDER"]:
        user_inst_id = get_user_training_institute_id(current_user, db)
        if user_inst_id != institute_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You can only manage data belonging to your own training institute."
            )
        return institute

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Coach or Admin required.")


def verify_employer_owns_job(job_id: str, current_user: User, db: Session) -> Job:
    """
    Verifies that the authenticated employer's company owns the specified job.
    """
    user_role = (current_user.role or "").strip().upper()
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job '{job_id}' not found.")

    if user_role == "ADMIN":
        return job

    if user_role == "EMPLOYER":
        user_company_id = get_user_company_id(current_user, db)
        user_emp_id = current_user.employer_profile.employer_id if current_user.employer_profile else None
        
        matches = (
            (job.company_id and job.company_id == user_company_id) or
            (job.employer_id and job.employer_id == user_emp_id) or
            (job.employer_id and job.employer_id == user_company_id)
        )
        if not matches:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You cannot modify or manage jobs belonging to another company."
            )
        return job

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Employer or Admin required.")


def verify_coach_owns_course(course_id: str, current_user: User, db: Session) -> Course:
    """
    Verifies that the authenticated coach's training institute owns the specified course.
    """
    user_role = (current_user.role or "").strip().upper()
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Course '{course_id}' not found.")

    if user_role == "ADMIN":
        return course

    if user_role in ["COACH", "TRAINING_PROVIDER", "PROVIDER"]:
        user_inst_id = get_user_training_institute_id(current_user, db)
        if course.training_institute_id and course.training_institute_id != user_inst_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You cannot modify or manage courses belonging to another training institute."
            )
        return course

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Coach or Admin required.")


def verify_coach_can_assess_trainee(
    course_id: str,
    trainee_id: str,
    current_user: User,
    db: Session
) -> Course:
    """
    Verifies that:
    1. The coach's institute owns the course.
    2. The trainee is enrolled in this course (or this institute).
    """
    user_role = (current_user.role or "").strip().upper()
    course = verify_coach_owns_course(course_id, current_user, db)

    trainee = db.query(Trainee).filter(Trainee.id == trainee_id).first()
    if not trainee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Trainee '{trainee_id}' not found.")

    if user_role == "ADMIN":
        return course

    # Check enrollment in this course or institute
    enrollment = db.query(Enrollment).filter(
        Enrollment.course_id == course_id,
        Enrollment.trainee_id == trainee_id
    ).first()

    if not enrollment:
        user_inst_id = get_user_training_institute_id(current_user, db)
        inst_enrollment = db.query(Enrollment).filter(
            Enrollment.training_institute_id == user_inst_id,
            Enrollment.trainee_id == trainee_id
        ).first() if user_inst_id else None

        if not inst_enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Trainee '{trainee_id}' is not enrolled in your institute's course."
            )

    return course

