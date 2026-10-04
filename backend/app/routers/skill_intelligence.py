import logging
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user, require_roles, verify_trainee_resource_access
from app.models.entities import User, Course
from app.schemas.schemas import (
    TraineeSkillGapDetailResponse,
    CourseSkillAnalysisResponse,
    TopSkillGapsResponse,
    EmergingSkillsResponse,
    JobSkillDemandResponse,
)
from app.services.skill_gap_intelligence_service import SkillGapIntelligenceService

logger = logging.getLogger("skilltrace.skill_intelligence_router")

router = APIRouter(prefix="/skill-intelligence", tags=["Skill Gap Intelligence"])


@router.get("/trainee/{id}", response_model=TraineeSkillGapDetailResponse)
def get_trainee_skill_gap(
    id: str,
    target_role: Optional[str] = Query(None, description="Optional target role or title benchmark"),
    target_job_id: Optional[str] = Query(None, description="Optional specific target Job ID benchmark"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Trainee Skill Gap Intelligence Dashboard:
    Compares:
      Current Assessed Skills
      vs
      Required Job Skills
      vs
      Training Course Curricula
      vs
      Skills Associated with Successful Outcomes

    Calculates: skillGap = requiredSkillLevel - traineeSkillLevel
    Categorizes: NO_GAP, LOW, MEDIUM, HIGH, CRITICAL.
    Labels: SIMULATION, ESTIMATION. Never claims causation.
    """
    verify_trainee_resource_access(id, current_user, db)
    try:
        return SkillGapIntelligenceService.get_trainee_skill_gap_intelligence(
            trainee_id=id,
            db=db,
            target_role=target_role,
            target_job_id=target_job_id,
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        logger.error(f"Error fetching skill gap for trainee {id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate skill gap intelligence: {str(e)}",
        )


@router.get("/course/{id}", response_model=CourseSkillAnalysisResponse)
def get_course_skill_intelligence(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Course-Level Skill Analysis:
    Compares:
      Training Skills Taught
      vs
      Actual Employer Job Requirements
      vs
      Trainee Assessed Proficiencies

    Calculates:
      - trainingCoverageRate
      - jobDemandFrequency
      - skillGapFrequency
      - averageSkillGap
      - employmentAssociation
    Identifies HIGH-DEMAND / LOW-COVERAGE vs GOOD COVERAGE.
    """
    try:
        return SkillGapIntelligenceService.get_course_skill_intelligence(id, db)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        logger.error(f"Error calculating course intelligence for {id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate course intelligence: {str(e)}",
        )


@router.get("/courses")
def list_courses_for_intelligence(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lists courses available for curriculum intelligence analysis."""
    courses = db.query(Course).all()
    return [
        {
            "id": c.id,
            "code": c.code,
            "title": c.title,
            "domain": c.domain,
            "provider": c.provider,
            "duration_weeks": c.duration_weeks,
        }
        for c in courses
    ]


@router.get("/top-gaps", response_model=TopSkillGapsResponse)
def get_top_skill_gaps(
    course_id: Optional[str] = Query(None),
    provider: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    sector: Optional[str] = Query(None),
    cohort: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Aggregates top skill gaps across trainees, courses, and job postings.
    Filters: course, provider, district, sector, cohort.
    Exposes sample sizes, severity levels, and filter context.
    """
    try:
        return SkillGapIntelligenceService.get_top_skill_gaps(
            db,
            course_id=course_id,
            provider=provider,
            district=district,
            sector=sector,
            cohort=cohort,
        )
    except Exception as e:
        logger.error(f"Error getting top gaps: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve top skill gaps: {str(e)}",
        )


@router.get("/emerging-skills", response_model=EmergingSkillsResponse)
def get_emerging_skills(
    min_sample_size: int = Query(5, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Analyzes job requirements longitudinally across quarters (2026 Q1 - 2026 Q4).
    Detects EMERGING_SKILL flags based on quarter-over-quarter percentage growth.
    Includes sample size safety checks to prevent misleading small-sample conclusions.
    """
    try:
        return SkillGapIntelligenceService.detect_emerging_skills(db, min_sample_size=min_sample_size)
    except Exception as e:
        logger.error(f"Error detecting emerging skills: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze emerging skills: {str(e)}",
        )


@router.get("/job-demand", response_model=JobSkillDemandResponse)
def get_job_skill_demands(
    sector: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Overview of skills frequently demanded by employers across sectors."""
    try:
        return SkillGapIntelligenceService.get_job_skill_demands(db, sector=sector, district=district)
    except Exception as e:
        logger.error(f"Error analyzing job demands: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve job demands: {str(e)}",
        )


@router.post("/recalculate")
def recalculate_all_skill_gaps(
    current_user: User = Depends(require_roles(["ADMIN", "COACH"])),
    db: Session = Depends(get_db),
):
    """
    Batch recalculates course skill gaps and refreshes aggregate tables.
    Restricted to ADMIN and COACH.
    """
    try:
        result = SkillGapIntelligenceService.recalculate_all_skill_gaps(db)
        return result
    except Exception as e:
        logger.error(f"Error recalculating skill gaps: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Batch recalculation failed: {str(e)}",
        )
