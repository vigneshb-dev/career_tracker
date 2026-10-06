import uuid
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    generate_otp
)
from app.core.redis_store import redis_store
from app.core.auth import get_current_user, oauth2_scheme
from app.models.entities import User, Trainee, Employer, TraineeProfile, CoachProfile, EmployerProfile
from app.schemas.schemas import (
    SignupRequest,
    LoginRequest,
    LoginResponse,
    VerifyOtpRequest,
    ResendOtpRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    UserProfileResponse
)

logger = logging.getLogger("skilltrace.auth_router")

router = APIRouter(prefix="/auth", tags=["Authentication & RBAC"])


def build_user_response(user: User, db: Session) -> UserProfileResponse:
    """Builds a rich UserProfileResponse including role-specific profile links."""
    trainee_id = None
    employer_id = None
    company_id = None
    training_institute_id = None
    profile_id = None
    details: Dict[str, Any] = {}

    user_role = (user.role or "").upper()
    if user_role == "TRAINEE":
        trn = None
        email_clean = (user.email or "").strip().lower()
        full_name_clean = (user.full_name or "").strip()
        user_prefix = email_clean.split("@")[0] if "@" in email_clean else email_clean

        # Priority 1: Match canonical seed profiles by name or email prefix
        if "priya" in user_prefix or "priya sharma" in full_name_clean.lower():
            trn = db.query(Trainee).filter(Trainee.id == "TRN-2024-001").first()
        elif "rajesh" in user_prefix or "rajesh kumar" in full_name_clean.lower():
            trn = db.query(Trainee).filter(Trainee.id == "TRN-2024-002").first()
        elif "sneha" in user_prefix or "sneha patel" in full_name_clean.lower():
            trn = db.query(Trainee).filter(Trainee.id == "TRN-2024-003").first()
        elif "karthik" in user_prefix or "karthik venkataraman" in full_name_clean.lower():
            trn = db.query(Trainee).filter(Trainee.id == "TRN-2024-004").first()
        elif "aditya" in user_prefix or "aditya" in full_name_clean.lower():
            trn = db.query(Trainee).filter(Trainee.id == "TRN-2024-005").first()
        elif "ananya" in user_prefix or "ananya" in full_name_clean.lower():
            trn = db.query(Trainee).filter(Trainee.id == "TRN-2024-006").first()

        # Priority 2: Check profile trainee_id if it's already a non-ghost canonical ID
        if not trn and user.trainee_profile and user.trainee_profile.trainee_id and not user.trainee_profile.trainee_id.startswith("TRN-2026"):
            trn = db.query(Trainee).filter(Trainee.id == user.trainee_profile.trainee_id).first()

        # Priority 3: Match by user_id
        if not trn:
            trn = db.query(Trainee).filter(Trainee.user_id == user.id).first()

        # Priority 4: Match by email exact or username prefix
        if not trn and email_clean:
            trn = db.query(Trainee).filter(
                (Trainee.email.ilike(email_clean)) |
                (Trainee.email.ilike(f"{user_prefix}@%"))
            ).first()

        # Priority 5: Match by full name
        if not trn and full_name_clean:
            trn = db.query(Trainee).filter(Trainee.full_name.ilike(full_name_clean)).first()

        # Priority 6: Any existing trainee in profile
        if not trn and user.trainee_profile and user.trainee_profile.trainee_id:
            trn = db.query(Trainee).filter(Trainee.id == user.trainee_profile.trainee_id).first()

        if trn:
            trainee_id = trn.id
        elif user.trainee_profile and user.trainee_profile.trainee_id:
            trainee_id = user.trainee_profile.trainee_id

        if user.trainee_profile:
            profile_id = user.trainee_profile.id
            details = {
                "headline": user.trainee_profile.headline,
                "bio": user.trainee_profile.bio,
                "education": user.trainee_profile.education,
                "resume_url": user.trainee_profile.resume_url,
                "resume_filename": user.trainee_profile.resume_filename,
                "resume_parsed_skills": user.trainee_profile.resume_parsed_skills or []
            }
        elif trn:
            details = {
                "headline": f"Workforce Candidate ({trn.program})",
                "bio": trn.bio,
                "education": "Technical Certification",
                "resume_url": None,
                "resume_filename": None,
                "resume_parsed_skills": []
            }

    elif user_role == "COACH":
        if user.coach_profile:
            profile_id = user.coach_profile.id
            training_institute_id = user.coach_profile.training_institute_id
            details = {
                "title": user.coach_profile.title,
                "organization": user.coach_profile.organization,
                "specialization": user.coach_profile.specialization,
                "assigned_trainee_ids": user.coach_profile.assigned_trainee_ids or [],
                "training_institute_id": user.coach_profile.training_institute_id,
                "designation": user.coach_profile.designation,
                "verification_status": user.coach_profile.verification_status
            }

    elif user_role == "EMPLOYER":
        if user.employer_profile:
            profile_id = user.employer_profile.id
            employer_id = user.employer_profile.employer_id
            company_id = user.employer_profile.company_id
            details = {
                "company_id": user.employer_profile.company_id,
                "company_name": user.employer_profile.company_name,
                "designation": user.employer_profile.designation,
                "department": user.employer_profile.department,
                "verification_status": user.employer_profile.verification_status,
                "authorized_candidate_ids": user.employer_profile.authorized_candidate_ids or []
            }

    elif user_role == "ADMIN":
        details = {
            "title": "Platform Workforce Director",
            "jurisdiction": "National Ecosystem"
        }

    return UserProfileResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user_role,
        phone=user.phone,
        is_active=user.is_active,
        is_verified=user.is_verified,
        profile_id=profile_id,
        trainee_id=trainee_id,
        employer_id=employer_id,
        company_id=company_id,
        training_institute_id=training_institute_id,
        details=details
    )


@router.post("/signup", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    """
    Self-service registration endpoint for TRAINEE, COACH, and EMPLOYER.
    Admin registration is strictly prohibited.
    """
    requested_role = payload.role.strip().upper()

    # Security check: Prohibit self-service Admin registration
    if requested_role == "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Self-registration as Admin is strictly prohibited. Administrator accounts must be provisioned via protected configuration."
        )

    if requested_role not in ["TRAINEE", "COACH", "EMPLOYER"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role specified. Supported self-service roles are TRAINEE, COACH, or EMPLOYER."
        )

    # Check for duplicate email
    existing_user = db.query(User).filter(User.email.ilike(payload.email.strip())).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists. Please sign in or use password reset."
        )

    user_id = f"USR-{uuid.uuid4().hex[:8].upper()}"
    new_user = User(
        id=user_id,
        email=payload.email.strip().lower(),
        hashed_password=get_password_hash(payload.password),
        role=requested_role,
        full_name=payload.full_name.strip(),
        phone=payload.phone,
        is_active=True,
        is_verified=False,
        created_at=datetime.now().isoformat()
    )
    db.add(new_user)
    db.flush()

    # Create role-specific profile
    if requested_role == "TRAINEE":
        email_clean = payload.email.strip().lower()
        full_name_clean = payload.full_name.strip()
        user_prefix = email_clean.split("@")[0] if "@" in email_clean else email_clean

        # Check canonical seed or existing trainee record
        existing_trainee = None
        if "priya" in user_prefix or "priya sharma" in full_name_clean.lower():
            existing_trainee = db.query(Trainee).filter(Trainee.id == "TRN-2024-001").first()
        elif "rajesh" in user_prefix or "rajesh kumar" in full_name_clean.lower():
            existing_trainee = db.query(Trainee).filter(Trainee.id == "TRN-2024-002").first()
        elif "sneha" in user_prefix or "sneha patel" in full_name_clean.lower():
            existing_trainee = db.query(Trainee).filter(Trainee.id == "TRN-2024-003").first()
        elif "karthik" in user_prefix or "karthik venkataraman" in full_name_clean.lower():
            existing_trainee = db.query(Trainee).filter(Trainee.id == "TRN-2024-004").first()

        if not existing_trainee:
            existing_trainee = db.query(Trainee).filter(
                (Trainee.email.ilike(email_clean)) |
                (Trainee.email.ilike(f"{user_prefix}@%")) |
                (Trainee.full_name.ilike(full_name_clean))
            ).first()

        if existing_trainee:
            trainee_record = existing_trainee
            trainee_record.user_id = new_user.id
            trainee_record.email = email_clean
            if payload.phone:
                trainee_record.phone = payload.phone
            db.flush()
        else:
            trainee_id = f"TRN-{datetime.now().year}-{uuid.uuid4().hex[:4].upper()}"
            trainee_record = Trainee(
                id=trainee_id,
                user_id=new_user.id,
                full_name=full_name_clean,
                email=email_clean,
                phone=payload.phone,
                location=payload.location or "Bengaluru, KA",
                bio=payload.bio,
                program=payload.program or "Full Stack Cloud & AI Engineering",
                cohort=payload.cohort or f"{datetime.now().year}-Q{(datetime.now().month - 1) // 3 + 1}",
                status="in_training",
                enrollment_date=datetime.now().strftime("%Y-%m-%d"),
                primary_outcome_type="employment",
                evidence_level="self_reported",
                overall_score=75,
                match_score=70
            )
            db.add(trainee_record)
            db.flush()

        trainee_prof = TraineeProfile(
            id=f"TP-{uuid.uuid4().hex[:8].upper()}",
            user_id=new_user.id,
            trainee_id=trainee_record.id,
            headline=payload.headline or f"Workforce Trainee in {trainee_record.program}",
            bio=payload.bio,
            education=payload.education,
            experience_years=0.0
        )
        db.add(trainee_prof)

    elif requested_role == "COACH":
        coach_prof = CoachProfile(
            id=f"CP-{uuid.uuid4().hex[:8].upper()}",
            user_id=new_user.id,
            full_name=payload.full_name.strip(),
            title=payload.title or "Workforce Career Coach",
            organization=payload.organization or "National Skill Development Ecosystem",
            specialization=payload.specialization or "Software & Cloud Systems",
            phone=payload.phone,
            assigned_trainee_ids=[]
        )
        db.add(coach_prof)

    elif requested_role == "EMPLOYER":
        # Check or create employer
        company_name = payload.company_name or f"{payload.full_name}'s Enterprise"
        emp = db.query(Employer).filter(Employer.name.ilike(company_name.strip())).first()
        if not emp:
            emp = Employer(
                id=f"EMP-{uuid.uuid4().hex[:6].upper()}",
                name=company_name.strip(),
                industry="Information Technology & Services",
                location="Bengaluru, KA",
                contact_person=payload.full_name.strip(),
                contact_email=payload.email.strip().lower(),
                contact_phone=payload.phone,
                active_openings=1,
                hired_trainees_count=0,
                retention_rate=95.0,
                tier="Standard"
            )
            db.add(emp)
            db.flush()

        emp_prof = EmployerProfile(
            id=f"EP-{uuid.uuid4().hex[:8].upper()}",
            user_id=new_user.id,
            employer_id=emp.id,
            company_name=company_name.strip(),
            designation=payload.designation or "Talent Acquisition Partner",
            contact_phone=payload.phone,
            authorized_candidate_ids=[]
        )
        db.add(emp_prof)

    db.commit()
    db.refresh(new_user)

    # Generate OTP for email verification
    otp = generate_otp()
    redis_store.set_otp(new_user.email, otp, expire_seconds=600)
    logger.info(f"[EMAIL SIMULATION] Sent OTP {otp} to {new_user.email}")

    # Generate initial JWT token
    token = create_access_token({
        "sub": new_user.id,
        "email": new_user.email,
        "role": new_user.role
    })

    return LoginResponse(
        token=token,
        token_type="Bearer",
        user=build_user_response(new_user, db),
        requires_verification=True,
        demo_otp=otp
    )


@router.post("/verify-otp", response_model=LoginResponse)
def verify_otp(payload: VerifyOtpRequest, db: Session = Depends(get_db)):
    """Verifies the email OTP and activates the account."""
    email = payload.email.strip().lower()
    is_valid = redis_store.verify_otp(email, payload.otp)

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification OTP. Please request a new code."
        )

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    user.is_verified = True
    db.commit()
    db.refresh(user)

    token = create_access_token({
        "sub": user.id,
        "email": user.email,
        "role": user.role
    })

    return LoginResponse(
        token=token,
        token_type="Bearer",
        user=build_user_response(user, db),
        requires_verification=False
    )


@router.post("/resend-otp")
def resend_otp(payload: ResendOtpRequest, db: Session = Depends(get_db)):
    """Resends a fresh 6-digit OTP code to the user's email."""
    email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    otp = generate_otp()
    redis_store.set_otp(email, otp, expire_seconds=600)
    logger.info(f"[EMAIL SIMULATION] Resent OTP {otp} to {email}")

    return {
        "message": f"A verification code has been resent to {email}.",
        "demo_otp": otp
    }


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Authenticates users across all roles using bcrypt password hash and JWT."""
    email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password combination."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated. Please contact support."
        )

    token = create_access_token({
        "sub": user.id,
        "email": user.email,
        "role": user.role
    })

    demo_otp = None
    if not user.is_verified:
        demo_otp = redis_store.get_otp(user.email)
        if not demo_otp:
            demo_otp = generate_otp()
            redis_store.set_otp(user.email, demo_otp, expire_seconds=600)

    return LoginResponse(
        token=token,
        token_type="Bearer",
        user=build_user_response(user, db),
        requires_verification=not user.is_verified,
        demo_otp=demo_otp
    )


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Generates a secure password reset OTP for account recovery."""
    email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Return positive response to prevent user enumeration
        return {
            "message": "If an account exists with this email, a password reset code has been dispatched.",
            "demo_otp": None
        }

    otp = generate_otp()
    redis_store.set_otp(f"reset:{email}", otp, expire_seconds=600)
    logger.info(f"[EMAIL SIMULATION] Password reset OTP {otp} for {email}")

    return {
        "message": "A 6-digit password reset code has been sent to your email address.",
        "demo_otp": otp
    }


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Resets user password with valid OTP."""
    email = payload.email.strip().lower()
    is_valid = redis_store.verify_otp(f"reset:{email}", payload.otp)

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset OTP."
        )

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    user.hashed_password = get_password_hash(payload.new_password)
    user.is_verified = True
    db.commit()

    return {
        "message": "Password successfully updated. You may now log in with your new credentials."
    }


@router.get("/me", response_model=UserProfileResponse)
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns the authenticated user's profile and RBAC permissions."""
    return build_user_response(current_user, db)


@router.post("/logout")
def logout(
    token: str = Depends(oauth2_scheme),
    current_user: User = Depends(get_current_user)
):
    """Invalidates the caller's JWT token by adding it to the revocation blacklist."""
    if token:
        redis_store.blacklist_token(token)
    return {"message": "Successfully logged out."}
