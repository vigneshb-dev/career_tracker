import logging
from typing import List, Optional
from datetime import datetime
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import (
    get_current_user,
    require_roles,
    verify_employer_owns_company,
    get_user_company_id,
    record_organization_audit,
)
from app.models.entities import User, Company, EmployerProfile, Job, OrganizationAuditLog, JobApplication
from app.schemas.schemas import (
    CompanyRead,
    CompanyCreate,
    CompanyUpdate,
    EmployerProfileDetailRead,
    JobRead,
    JobCreate,
    OrganizationAuditLogRead,
    JobApplicationRead,
)
from app.services.job_intelligence_service import JobIntelligenceService

logger = logging.getLogger("skilltrace.companies")

router = APIRouter(prefix="/companies", tags=["Companies & Employers"])


@router.get("", response_model=List[CompanyRead])
def list_companies(
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Lists all registered enterprise employer companies."""
    query = db.query(Company)
    if status:
        query = query.filter(Company.status == status)
    return query.all()


@router.post("", response_model=CompanyRead, status_code=status.HTTP_201_CREATED)
def create_company(
    payload: CompanyCreate,
    current_user: User = Depends(require_roles(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """Creates a new Company organization (Admin only)."""
    company_id = f"CMP-{uuid.uuid4().hex[:6].upper()}"
    company = Company(
        id=company_id,
        legal_name=payload.legal_name,
        display_name=payload.display_name,
        industry=payload.industry,
        description=payload.description,
        location=payload.location,
        website=payload.website,
        contact_email=payload.contact_email,
        status=payload.status or "active",
        created_at=datetime.utcnow().isoformat()
    )
    db.add(company)
    db.commit()
    db.refresh(company)

    record_organization_audit(
        db=db,
        actor_user_id=current_user.id,
        organization_id=company.id,
        action="CREATE_COMPANY",
        resource_type="COMPANY",
        resource_id=company.id,
        details={"legal_name": company.legal_name}
    )
    db.commit()
    return company


@router.get("/{company_id}", response_model=CompanyRead)
def get_company(
    company_id: str,
    db: Session = Depends(get_db)
):
    """Retrieves full profile of a company."""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Company '{company_id}' not found.")
    return company


@router.put("/{company_id}", response_model=CompanyRead)
@router.patch("/{company_id}", response_model=CompanyRead)
def update_company(
    company_id: str,
    payload: CompanyUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Updates company profile.
    Strictly enforced: User must belong to this company, or be ADMIN.
    """
    company = verify_employer_owns_company(company_id, current_user, db)
    update_data = payload.model_dump(exclude_unset=True)

    for field, val in update_data.items():
        if hasattr(company, field) and val is not None:
            setattr(company, field, val)

    db.commit()
    db.refresh(company)

    record_organization_audit(
        db=db,
        actor_user_id=current_user.id,
        organization_id=company.id,
        action="UPDATE_COMPANY",
        resource_type="COMPANY",
        resource_id=company.id,
        details=update_data
    )
    db.commit()
    return company


@router.get("/{company_id}/employers", response_model=List[EmployerProfileDetailRead])
def list_company_employers(
    company_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lists all employer representatives belonging to this company."""
    verify_employer_owns_company(company_id, current_user, db)
    employers = db.query(EmployerProfile).filter(
        (EmployerProfile.company_id == company_id) | (EmployerProfile.employer_id == company_id)
    ).all()
    return employers


@router.get("/{company_id}/jobs", response_model=List[JobRead])
def list_company_jobs(
    company_id: str,
    db: Session = Depends(get_db)
):
    """Lists all active and archived job requisitions for this company."""
    jobs = db.query(Job).filter(
        (Job.company_id == company_id) | (Job.employer_id == company_id)
    ).all()
    return jobs


@router.post("/{company_id}/jobs", response_model=JobRead, status_code=status.HTTP_201_CREATED)
def create_company_job(
    company_id: str,
    job_in: JobCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Creates a new job posting scoped to the company.
    Strictly enforced: Current user must be an employer belonging to this company or ADMIN.
    Derives company_id from URL/authentication.
    """
    company = verify_employer_owns_company(company_id, current_user, db)

    job_data = job_in.model_dump()
    job_data["company_id"] = company.id
    job_data["employer_name"] = company.legal_name or company.display_name
    job_data["created_by"] = current_user.id
    if not job_data.get("employer_id"):
        job_data["employer_id"] = company.id

    job = JobIntelligenceService.process_and_save_job(db, job_data)

    record_organization_audit(
        db=db,
        actor_user_id=current_user.id,
        organization_id=company.id,
        action="CREATE_JOB",
        resource_type="JOB",
        resource_id=job.id,
        details={"title": job.title, "location": job.location}
    )
    db.commit()
    return job


@router.get("/{company_id}/audit-logs", response_model=List[OrganizationAuditLogRead])
def get_company_audit_logs(
    company_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves immutable audit trail for all company-scoped actions.
    Restricted to authorized company representatives or platform administrators.
    """
    verify_employer_owns_company(company_id, current_user, db)
    logs = (
        db.query(OrganizationAuditLog)
        .filter(OrganizationAuditLog.organization_id == company_id)
        .order_by(OrganizationAuditLog.timestamp.desc())
        .all()
    )
    return logs


@router.get("/{company_id}/applications", response_model=List[JobApplicationRead])
def list_company_applications(
    company_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lists all job applications submitted to this company.
    Restricted to authorized company representatives or platform administrators.
    """
    verify_employer_owns_company(company_id, current_user, db)
    applications = db.query(JobApplication).filter(JobApplication.company_id == company_id).all()
    return applications
