from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any

from app.core.database import get_db
from app.models.entities import Trainee, Skill, TraineeSkill, TraineeSkillEvidence
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
def get_scoring_config():
    """Returns the active scoring formula configuration, weights, and time-decay parameters."""
    return SkillScoringEngine.get_scoring_configuration()

@router.put("/config")
def update_scoring_config(payload: ScoringConfigRequest):
    """Updates configurable weights for evidence streams (project, assessment, trainer, cert, employer)."""
    try:
        updated = SkillScoringEngine.update_scoring_configuration(payload.source_weights)
        return updated
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/trainees/{trainee_id}/radar")
def get_trainee_radar_profile(trainee_id: str, db: Session = Depends(get_db)):
    """
    Returns Trainee Skill Radar and Profile dataset:
    Current Level (0-5) | Target Level (0-5) | Confidence | Evidence List | Scoring Explanation.
    """
    profile = SkillScoringEngine.get_trainee_radar_profile(db, trainee_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Trainee not found")
    return profile

@router.get("/trainees/{trainee_id}/unified-profile")
def get_trainee_unified_profile(trainee_id: str, db: Session = Depends(get_db)):
    """
    Returns Trainee Unified Skill Profile combining multiple evidence streams:
    Resume + Assessments + Practical Projects + Certifications + Coach Evaluation + Employer Feedback.
    Enforces rule: Resume claims alone do not become verified competency scores.
    """
    trainee = db.query(Trainee).filter(Trainee.id == trainee_id).first()
    if not trainee:
        raise HTTPException(status_code=404, detail="Trainee not found")
    
    profile = SkillScoringEngine.get_unified_skill_profile(db, trainee_id)
    return profile

@router.get("/trainees/{trainee_id}/evidence", response_model=List[TraineeSkillEvidenceRead])
def get_trainee_evidence(
    trainee_id: str,
    skill_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Retrieves all evidence records supporting proficiency scores for a trainee."""
    trainee = db.query(Trainee).filter(Trainee.id == trainee_id).first()
    if not trainee:
        raise HTTPException(status_code=404, detail="Trainee not found")

    query = db.query(TraineeSkillEvidence).filter(TraineeSkillEvidence.trainee_id == trainee_id)
    if skill_id:
        query = query.filter(TraineeSkillEvidence.skill_id == skill_id)
    
    return query.order_by(TraineeSkillEvidence.assessment_date.desc()).all()

@router.post("/trainees/{trainee_id}/evidence", response_model=TraineeSkillEvidenceRead, status_code=status.HTTP_201_CREATED)
def add_skill_evidence(
    trainee_id: str,
    evidence_in: TraineeSkillEvidenceCreate,
    db: Session = Depends(get_db)
):
    """
    Ingests an evidence item for a trainee skill and triggers automated score recalculation.
    Evidence sources: assessment, practical_project, certification, trainer_evaluation, employer_feedback.
    """
    trainee = db.query(Trainee).filter(Trainee.id == trainee_id).first()
    if not trainee:
        raise HTTPException(status_code=404, detail="Trainee not found")

    # Ensure TraineeSkill record exists
    ts = db.query(TraineeSkill).filter(
        TraineeSkill.trainee_id == trainee_id,
        TraineeSkill.skill_id == evidence_in.skill_id
    ).first()

    if not ts:
        ts = TraineeSkill(
            trainee_id=trainee_id,
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
        trainee_id=trainee_id,
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
    SkillScoringEngine.sync_trainee_skill_scores(db, trainee_id)

    return ev

@router.get("/soft-skills/scenarios")
def get_soft_skill_scenarios():
    """
    Returns situational judgement scenario questions and structured rubrics for:
    Communication, Teamwork, Problem Solving, Adaptability, Time Management.
    """
    return SoftSkillAssessmentService.get_all_scenarios()

@router.post("/soft-skills/evaluate")
def evaluate_soft_skill_assessment(
    submission: SoftSkillAssessmentSubmission,
    db: Session = Depends(get_db)
):
    """
    Evaluates scenario situational assessment answers against objective behavioral rubrics,
    stores verified evidence in database, and updates trainee skill proficiency scores.
    """
    trainee = db.query(Trainee).filter(Trainee.id == submission.trainee_id).first()
    if not trainee:
        raise HTTPException(status_code=404, detail="Trainee not found")

    answers_dict = [{"question_id": a.question_id, "selected_option_id": a.selected_option_id} for a in submission.answers]
    evidence_items = SoftSkillAssessmentService.evaluate_scenario_answers(
        answers=answers_dict,
        reviewer=submission.reviewer_name or "Workforce Behavioral Assessment Engine"
    )

    created_records = []
    for item in evidence_items:
        # Check if TraineeSkill exists or create
        ts = db.query(TraineeSkill).filter(
            TraineeSkill.trainee_id == submission.trainee_id,
            TraineeSkill.skill_id == item["skill_id"]
        ).first()

        if not ts:
            ts = TraineeSkill(
                trainee_id=submission.trainee_id,
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
            trainee_id=submission.trainee_id,
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
        created_records.append(item)

    db.commit()

    # Recalculate scores
    SkillScoringEngine.sync_trainee_skill_scores(db, submission.trainee_id)

    # Return updated radar profile
    return SkillScoringEngine.get_trainee_radar_profile(db, submission.trainee_id)

@router.post("/trainees/{trainee_id}/recalculate")
def recalculate_trainee_skills(trainee_id: str, db: Session = Depends(get_db)):
    """Forces recalculation of all skill proficiency scores for a trainee."""
    trainee = db.query(Trainee).filter(Trainee.id == trainee_id).first()
    if not trainee:
        raise HTTPException(status_code=404, detail="Trainee not found")

    updated = SkillScoringEngine.sync_trainee_skill_scores(db, trainee_id)
    return {
        "status": "success",
        "trainee_id": trainee_id,
        "skills_updated": len(updated),
        "details": updated
    }
