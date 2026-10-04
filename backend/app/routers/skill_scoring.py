from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any

from app.core.database import get_db
from app.core.auth import (
    get_current_user,
    require_roles,
    verify_trainee_resource_access,
)
from app.models.entities import Trainee, Skill, TraineeSkill, TraineeSkillEvidence, User, VerificationStatus
from app.schemas.schemas import (
    TraineeSkillEvidenceCreate,
    TraineeSkillEvidenceRead,
    ScoringConfigRequest,
    SoftSkillAssessmentSubmission
)
from app.services.skill_scoring_service import SkillScoringEngine
from app.core.soft_skill_rubrics import SoftSkillAssessmentService

router = APIRouter(prefix="/skill-scoring", tags=["Skill Scoring Engine"])

@router.get("/config")
def get_scoring_config(current_user: User = Depends(get_current_user)):
    """Returns the active scoring formula configuration, weights, and time-decay parameters."""
    return SkillScoringEngine.get_scoring_configuration()

@router.put("/config")
def update_scoring_config(
    payload: ScoringConfigRequest,
    current_user: User = Depends(require_roles(["ADMIN"]))
):
    """Updates configurable weights for evidence streams. Restricted to Administrator."""
    try:
        updated = SkillScoringEngine.update_scoring_configuration(payload.source_weights)
        return updated
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/trainees/{trainee_id}/radar")
def get_trainee_radar_profile(
    trainee_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns Trainee Skill Radar and Profile dataset:
    Current Level (0-5) | Target Level (0-5) | Confidence | Evidence List | Scoring Explanation.
    Protected by trainee resource-level authorization.
    """
    trainee = verify_trainee_resource_access(trainee_id, current_user, db, require_write=False)
    profile = SkillScoringEngine.get_trainee_radar_profile(db, trainee.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Trainee not found")
    return profile

@router.get("/trainees/{trainee_id}/unified-profile")
def get_trainee_unified_profile(
    trainee_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns Trainee Unified Skill Profile combining multiple evidence streams:
    Resume + Assessments + Practical Projects + Certifications + Coach Evaluation + Employer Feedback.
    Enforces rule: Resume claims alone do not become verified competency scores.
    """
    trainee = verify_trainee_resource_access(trainee_id, current_user, db, require_write=False)
    profile = SkillScoringEngine.get_unified_skill_profile(db, trainee.id)
    return profile

@router.get("/trainees/{trainee_id}/evidence", response_model=List[TraineeSkillEvidenceRead])
def get_trainee_evidence(
    trainee_id: str,
    skill_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves all evidence records supporting proficiency scores for an authorized trainee."""
    trainee = verify_trainee_resource_access(trainee_id, current_user, db, require_write=False)

    query = db.query(TraineeSkillEvidence).filter(TraineeSkillEvidence.trainee_id == trainee.id)
    if skill_id:
        query = query.filter(TraineeSkillEvidence.skill_id == skill_id)
    
    return query.order_by(TraineeSkillEvidence.assessment_date.desc()).all()

@router.post("/trainees/{trainee_id}/evidence", response_model=TraineeSkillEvidenceRead, status_code=status.HTTP_201_CREATED)
def add_skill_evidence(
    trainee_id: str,
    evidence_in: TraineeSkillEvidenceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Ingests an evidence item for a trainee skill and triggers automated score recalculation.
    Authorized for Coach, Training Provider, Admin, Employer (for authorized candidates),
    or Trainee (submitting self-reported evidence).
    """
    trainee = verify_trainee_resource_access(trainee_id, current_user, db, require_write=False)
    user_role = (current_user.role or "").strip().upper()

    # If trainee is adding evidence, ensure source is marked self-reported / project
    if user_role == "TRAINEE":
        if evidence_in.evidence_source not in ["practical_project", "self_assessment"]:
            evidence_in.evidence_source = "practical_project"
        evidence_in.reviewer_source = f"Self-Reported Submission by {current_user.full_name}"

    # Ensure TraineeSkill record exists
    ts = db.query(TraineeSkill).filter(
        TraineeSkill.trainee_id == trainee.id,
        TraineeSkill.skill_id == evidence_in.skill_id
    ).first()

    if not ts:
        ts = TraineeSkill(
            trainee_id=trainee.id,
            skill_id=evidence_in.skill_id,
            name=evidence_in.skill_name,
            level="intermediate",
            proficiency_score=evidence_in.score,
            target_level=4.0,
            confidence=evidence_in.confidence
        )
        db.add(ts)
        db.commit()

    # Create evidence entry
    ev = TraineeSkillEvidence(
        trainee_id=trainee.id,
        skill_id=evidence_in.skill_id,
        skill_name=evidence_in.skill_name,
        evidence_source=evidence_in.evidence_source,
        score=evidence_in.score,
        max_score=evidence_in.max_score,
        confidence=evidence_in.confidence,
        assessment_date=evidence_in.assessment_date,
        reviewer_source=evidence_in.reviewer_source,
        rubric_scores=evidence_in.rubric_scores or {},
        notes=evidence_in.notes,
        artifact_url=evidence_in.artifact_url
    )
    db.add(ev)
    db.commit()
    db.refresh(ev)

    # Recalculate skill score & explanation
    SkillScoringEngine.sync_trainee_skill_scores(db, trainee.id)

    return ev

@router.get("/soft-skills/scenarios")
def get_soft_skill_scenarios(current_user: User = Depends(get_current_user)):
    """
    Returns situational judgement scenario questions and structured rubrics for:
    Communication, Teamwork, Problem Solving, Adaptability, Time Management.
    """
    return SoftSkillAssessmentService.get_all_scenarios()

@router.post("/soft-skills/evaluate")
def evaluate_soft_skill_assessment(
    submission: SoftSkillAssessmentSubmission,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Evaluates scenario situational assessment answers against objective behavioral rubrics,
    stores verified evidence in database, and updates trainee skill proficiency scores.
    Enforces that trainee can only evaluate for their own profile.
    """
    trainee = verify_trainee_resource_access(submission.trainee_id, current_user, db, require_write=True)

    answers_dict = [{"question_id": a.question_id, "selected_option_id": a.selected_option_id} for a in submission.answers]
    evidence_items = SoftSkillAssessmentService.evaluate_scenario_answers(
        answers=answers_dict,
        reviewer=submission.reviewer_name or f"Workforce Behavioral Assessment Engine ({current_user.full_name})"
    )

    for item in evidence_items:
        ts = db.query(TraineeSkill).filter(
            TraineeSkill.trainee_id == trainee.id,
            TraineeSkill.skill_id == item["skill_id"]
        ).first()

        if not ts:
            ts = TraineeSkill(
                trainee_id=trainee.id,
                skill_id=item["skill_id"],
                name=item["canonical_name"],
                level="intermediate",
                proficiency_score=item["score"],
                target_level=4.0,
                confidence=item["confidence"]
            )
            db.add(ts)
            db.commit()

        ev = TraineeSkillEvidence(
            trainee_id=trainee.id,
            skill_id=item["skill_id"],
            skill_name=item["canonical_name"],
            evidence_source=item["evidence_source"],
            score=item["score"],
            max_score=item["max_score"],
            confidence=item["confidence"],
            assessment_date=item["assessment_date"],
            reviewer_source=item["reviewer_source"],
            rubric_scores=item["rubric_scores"],
            notes=item["notes"]
        )
        db.add(ev)

    db.commit()

    # Recalculate scores
    SkillScoringEngine.sync_trainee_skill_scores(db, trainee.id)

    # Return updated radar profile
    return SkillScoringEngine.get_trainee_radar_profile(db, trainee.id)

@router.post("/trainees/{trainee_id}/recalculate")
def recalculate_trainee_skills(
    trainee_id: str,
    current_user: User = Depends(require_roles(["ADMIN", "COACH", "TRAINING_PROVIDER"])),
    db: Session = Depends(get_db)
):
    """Forces recalculation of all skill proficiency scores for a trainee."""
    trainee = verify_trainee_resource_access(trainee_id, current_user, db, require_write=False)

    updated = SkillScoringEngine.sync_trainee_skill_scores(db, trainee.id)
    return {
        "status": "success",
        "trainee_id": trainee.id,
        "skills_updated": len(updated),
        "details": updated
    }
