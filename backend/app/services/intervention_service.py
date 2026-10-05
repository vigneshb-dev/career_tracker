"""
Personalized Gap-to-Intervention Engine Service
Matches identified skill gaps to structured interventions from the catalogue using:
- Sentence Transformers for semantic matching
- Skill gap severity, target occupation, current proficiency, prerequisites, market demand, and learning effort.
Provides lifecycle progress tracking and post-completion reassessment with automatic competency re-scoring.
"""

import math
import logging
from datetime import date
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session

from app.models.entities import (
    Trainee,
    TraineeSkill,
    TraineeSkillEvidence,
    SkillGap,
    Occupation,
    Intervention,
    TraineeIntervention
)
from app.core.intervention_catalogue_data import INTERVENTIONS_CATALOGUE_DATA
from app.services.job_intelligence_service import JobIntelligenceService
from app.core.math_utils import vector_cosine_similarity
from app.services.skill_gap_service import SkillGapEngine

logger = logging.getLogger("skilltrace.intervention_engine")


class InterventionEngine:
    @classmethod
    def seed_catalogue(cls, db: Session, force_reseed: bool = False):
        """Seeds the intervention catalogue with vector embeddings."""
        existing_count = db.query(Intervention).count()
        if not force_reseed and existing_count >= len(INTERVENTIONS_CATALOGUE_DATA):
            logger.info(f"Intervention catalogue already populated ({existing_count} items). Skipping.")
            return

        if force_reseed:
            db.query(Intervention).delete()
            db.commit()

        logger.info("Seeding structured Intervention Catalogue and generating semantic embeddings...")
        inserted_count = 0
        updated_count = 0
        failed_count = 0

        for item in INTERVENTIONS_CATALOGUE_DATA:
            try:
                with db.begin_nested():
                    existing = db.query(Intervention).filter(Intervention.id == item["id"]).first()
                    embed_text = f"{item['title']}. {item['type']}. {item['domain']}. {' '.join(item['target_skills'])}. {item['description']}"
                    embedding = JobIntelligenceService.generate_embedding(embed_text)

                    if existing:
                        for k, v in item.items():
                            setattr(existing, k, v)
                        existing.embedding = embedding
                        updated_count += 1
                    else:
                        db.add(Intervention(
                            id=item["id"],
                            title=item["title"],
                            type=item["type"],
                            domain=item["domain"],
                            target_skills=item["target_skills"],
                            target_occupations=item["target_occupations"],
                            difficulty_level=item.get("difficulty_level", "intermediate"),
                            min_proficiency=item.get("min_proficiency", 0.0),
                            target_proficiency=item.get("target_proficiency", 4.0),
                            estimated_effort=item["estimated_effort"],
                            provider_or_platform=item["provider_or_platform"],
                            description=item["description"],
                            why_it_matters=item.get("why_it_matters"),
                            prerequisites=item.get("prerequisites", []),
                            learning_outcomes=item.get("learning_outcomes", []),
                            reassessment_rubric=item.get("reassessment_rubric", {}),
                            market_demand_alignment=item.get("market_demand_alignment", 90),
                            embedding=embedding
                        ))
                        inserted_count += 1
            except Exception as e:
                failed_count += 1
                logger.error(f"Error seeding intervention {item.get('id')}: {e}")

        db.commit()
        if failed_count > 0:
            logger.warning(
                f"Intervention catalogue seed completed with issues: "
                f"{inserted_count} inserted, {updated_count} updated, {failed_count} failed."
            )
        else:
            logger.info(
                f"Intervention catalogue successfully seeded: "
                f"{inserted_count} inserted, {updated_count} updated."
            )
        return {
            "inserted": inserted_count,
            "updated": updated_count,
            "failed": failed_count,
            "total": len(INTERVENTIONS_CATALOGUE_DATA)
        }

    @classmethod
    def get_all_interventions(cls, db: Session, type_filter: Optional[str] = None, domain_filter: Optional[str] = None) -> List[Intervention]:
        """Lists all catalogue interventions with optional filters."""
        query = db.query(Intervention)
        if type_filter and type_filter != "all":
            query = query.filter(Intervention.type == type_filter)
        if domain_filter and domain_filter != "all":
            query = query.filter(Intervention.domain == domain_filter)
        return query.all()

    @classmethod
    def recommend_interventions_for_gap(
        cls,
        db: Session,
        trainee_id: str,
        gap_skill_name: str,
        target_occupation_id: Optional[str] = None,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        AI-Powered Gap-to-Intervention Recommendation Algorithm.
        Synthesizes:
        - Gap Severity (Critical vs Moderate vs Low)
        - Target Occupation requirements
        - Candidate's current demonstrated proficiency vs prerequisites
        - Gap classification (Learner Gap vs Curriculum Gap vs Workplace Gap)
        - Market demand index
        - SentenceTransformer semantic vector similarity
        """
        # Ensure catalogue is seeded
        if db.query(Intervention).count() == 0:
            cls.seed_catalogue(db)

        trainee = db.query(Trainee).filter(Trainee.id == trainee_id).first()
        if not trainee:
            raise ValueError(f"Trainee '{trainee_id}' not found.")

        # Find specific gap analysis
        skill_gap_rec = db.query(SkillGap).filter(SkillGap.trainee_id == trainee.id).first()
        if not skill_gap_rec or not skill_gap_rec.gaps_breakdown:
            SkillGapEngine.analyze_trainee_skill_gap(db, trainee.id, save_record=True)
            skill_gap_rec = db.query(SkillGap).filter(SkillGap.trainee_id == trainee.id).first()

        breakdown = skill_gap_rec.gaps_breakdown or []
        target_gap = next((g for g in breakdown if g["skill_name"].lower() == gap_skill_name.lower()), None)

        if not target_gap and breakdown:
            target_gap = breakdown[0]

        if not target_gap:
            target_gap = {
                "skill_name": gap_skill_name,
                "category": "hard",
                "skill_gap": 2.0,
                "gap_severity": 0.40,
                "current_proficiency": 2.0,
                "required_proficiency": 4.0,
                "priority_tier": "critical",
                "gap_type": "learner_gap",
                "detected_reason": f"Deficit in {gap_skill_name} against target occupational requirements.",
                "market_demand_score": 90,
                "course_title": "Enrolled Curriculum"
            }

        target_occ_title = skill_gap_rec.target_job_title if skill_gap_rec else "Software Engineer"
        if target_occupation_id:
            occ = db.query(Occupation).filter(Occupation.id == target_occupation_id).first()
            if occ:
                target_occ_title = occ.title

        # Semantic query vector using SentenceTransformers
        gap_context = (
            f"Remediate {target_gap['skill_name']} gap for {target_occ_title}. "
            f"Classification: {target_gap['gap_type']}. Deficit: {target_gap['skill_gap']}. "
            f"Current Level: {target_gap['current_proficiency']}/5.0. {target_gap.get('detected_reason', '')}"
        )
        gap_embedding = JobIntelligenceService.generate_embedding(gap_context)

        all_interventions = db.query(Intervention).all()
        scored_recommendations: List[Dict[str, Any]] = []

        cur_prof = float(target_gap["current_proficiency"])
        req_prof = float(target_gap["required_proficiency"])
        gap_sev = float(target_gap["gap_severity"])
        gap_type = target_gap["gap_type"]
        is_critical = target_gap.get("priority_tier") == "critical"

        for item in all_interventions:
            # 1. Semantic Cosine Similarity
            semantic_sim = 0.5
            if item.embedding and gap_embedding:
                semantic_sim = vector_cosine_similarity(gap_embedding, item.embedding)

            # Direct skill name match bonus
            direct_skill_match = any(
                s.lower() in target_gap["skill_name"].lower() or target_gap["skill_name"].lower() in s.lower()
                for s in (item.target_skills or [])
            )
            if direct_skill_match:
                semantic_sim = min(1.0, semantic_sim + 0.35)

            # 2. Proficiency & Prerequisite Fit
            # Check if candidate satisfies minimum prerequisite level
            min_req = float(item.min_proficiency or 0.0)
            target_out = float(item.target_proficiency or 4.0)

            if cur_prof < min_req:
                # Candidate does not yet meet prerequisites
                prof_fit = max(0.2, 1.0 - (min_req - cur_prof) * 0.4)
                prereq_met = False
                prereq_note = f"Prerequisite Level {min_req} required (Current: {cur_prof})"
            else:
                prof_fit = 1.0
                prereq_met = True
                prereq_note = "Prerequisites Satisfied"

            # Expected skill growth alignment
            growth_delta = target_out - cur_prof
            if growth_delta > 0:
                prof_fit = min(1.0, prof_fit + 0.1)

            # 3. Gap Classification Fit
            # Learner Gap -> practice_task, project, soft_skill_practice
            # Curriculum Gap -> course_module, certification, project
            # Workplace Gap -> mentorship, practice_task, apprenticeship
            type_fit = 0.6
            itype = item.type

            if gap_type == "workplace_gap":
                if itype in ("mentorship", "practice_task", "apprenticeship"):
                    type_fit = 1.0
                elif itype in ("project", "soft_skill_practice"):
                    type_fit = 0.8
                else:
                    type_fit = 0.5
            elif gap_type == "curriculum_gap":
                if itype in ("course_module", "certification", "project"):
                    type_fit = 1.0
                elif itype in ("apprenticeship", "mentorship"):
                    type_fit = 0.8
                else:
                    type_fit = 0.5
            elif gap_type == "learner_gap":
                if itype in ("practice_task", "project", "mentorship", "soft_skill_practice"):
                    type_fit = 1.0
                elif itype in ("course_module", "certification"):
                    type_fit = 0.85
                else:
                    type_fit = 0.6

            # 4. Target Occupation Alignment
            occ_fit = 0.7
            if item.target_occupations and any(
                target_occ_title.lower() in occ.lower() or occ.lower() in target_occ_title.lower()
                for occ in item.target_occupations
            ):
                occ_fit = 1.0

            # 5. Market Demand Alignment
            mkt_fit = (item.market_demand_alignment or 90) / 100.0

            # ----------------------------------------------------
            # Combined Recommendation Fit Score (0 - 100)
            # Weighted: 40% Semantic, 20% Proficiency/Prereq, 20% Gap Type, 10% Occupation, 10% Market Demand
            # ----------------------------------------------------
            combined_score = (
                (semantic_sim * 0.40) +
                (prof_fit * 0.20) +
                (type_fit * 0.20) +
                (occ_fit * 0.10) +
                (mkt_fit * 0.10)
            )

            # Extra boost for critical gaps matching high-intensity interventions
            if is_critical and itype in ("project", "mentorship", "course_module", "certification"):
                combined_score = min(1.0, combined_score + 0.05)

            rec_score_pct = round(combined_score * 100)

            # Recommendation narrative explanation
            if gap_type == "workplace_gap" and itype in ("mentorship", "practice_task"):
                rec_rationale = f"Prescribed to resolve documented employer staging/workplace friction through 1-on-1 practical execution."
            elif gap_type == "curriculum_gap" and itype in ("course_module", "certification"):
                rec_rationale = f"Teaches high-demand syllabus topics ({item.title}) not covered in the candidate's enrolled bootcamp curriculum."
            else:
                rec_rationale = f"Provides deliberate practice targeting autonomous Level {item.target_proficiency} performance for {target_occ_title}."

            # Check if trainee already has this intervention tracked
            active_tracking = db.query(TraineeIntervention).filter(
                TraineeIntervention.trainee_id == trainee.id,
                TraineeIntervention.intervention_id == item.id
            ).first()

            scored_recommendations.append({
                "intervention_id": item.id,
                "title": item.title,
                "type": item.type,
                "type_label": item.type.replace("_", " ").title(),
                "domain": item.domain,
                "difficulty_level": item.difficulty_level,
                "estimated_effort": item.estimated_effort,
                "provider_or_platform": item.provider_or_platform,
                "description": item.description,
                "why_it_matters": item.why_it_matters or rec_rationale,
                "recommendation_rationale": rec_rationale,
                "recommendation_score": rec_score_pct,
                "semantic_similarity": round(semantic_sim, 3),
                "current_proficiency": cur_prof,
                "expected_skill_level": item.target_proficiency,
                "min_proficiency": item.min_proficiency,
                "prerequisites_satisfied": prereq_met,
                "prerequisite_note": prereq_note,
                "prerequisites": item.prerequisites or [],
                "learning_outcomes": item.learning_outcomes or [],
                "reassessment_rubric": item.reassessment_rubric or {},
                "market_demand_alignment": item.market_demand_alignment,
                "tracking_status": active_tracking.status if active_tracking else "recommended",
                "progress_percent": active_tracking.progress_percent if active_tracking else 0,
                "trainee_intervention_id": active_tracking.id if active_tracking else None
            })

        # Sort descending by recommendation fit score
        scored_recommendations.sort(key=lambda x: x["recommendation_score"], reverse=True)
        return scored_recommendations[:limit]

    @classmethod
    def start_trainee_intervention(
        cls,
        db: Session,
        trainee_id: str,
        gap_skill_id: str,
        gap_skill_name: str,
        intervention_id: str
    ) -> TraineeIntervention:
        """Enrolls trainee into the intervention and transitions status to 'in_progress'."""
        trainee = db.query(Trainee).filter(Trainee.id == trainee_id).first()
        if not trainee:
            raise ValueError(f"Trainee '{trainee_id}' not found.")

        intervention = db.query(Intervention).filter(Intervention.id == intervention_id).first()
        if not intervention:
            raise ValueError(f"Intervention '{intervention_id}' not found.")

        # Check existing skill gap record for gap type and baseline level
        skill_rec = db.query(TraineeSkill).filter(
            TraineeSkill.trainee_id == trainee.id,
            TraineeSkill.skill_id == gap_skill_id
        ).first()

        baseline_prof = skill_rec.proficiency_score if skill_rec else 0.0

        gap_rec = db.query(SkillGap).filter(SkillGap.trainee_id == trainee.id).first()
        gap_type = "learner_gap"
        if gap_rec and gap_rec.gaps_breakdown:
            matched_g = next((g for g in gap_rec.gaps_breakdown if g["skill_id"] == gap_skill_id), None)
            if matched_g:
                gap_type = matched_g.get("gap_type", "learner_gap")

        # Find or create TraineeIntervention
        tint = db.query(TraineeIntervention).filter(
            TraineeIntervention.trainee_id == trainee.id,
            TraineeIntervention.intervention_id == intervention.id
        ).first()

        today_str = date.today().isoformat()

        if not tint:
            tint_id = f"TINT-{trainee.id}-{intervention.id}"
            tint = TraineeIntervention(
                id=tint_id,
                trainee_id=trainee.id,
                trainee_name=trainee.full_name,
                gap_skill_id=gap_skill_id,
                gap_skill_name=gap_skill_name,
                gap_type=gap_type,
                intervention_id=intervention.id,
                intervention_title=intervention.title,
                intervention_type=intervention.type,
                status="in_progress",
                progress_percent=10,
                started_at=today_str,
                baseline_proficiency=baseline_prof,
                expected_proficiency=intervention.target_proficiency,
                why_it_matters=intervention.why_it_matters
            )
            db.add(tint)
        else:
            tint.status = "in_progress"
            if not tint.started_at:
                tint.started_at = today_str
            if tint.progress_percent == 0:
                tint.progress_percent = 15

        db.commit()
        db.refresh(tint)
        return tint

    @classmethod
    def update_intervention_progress(
        cls,
        db: Session,
        trainee_intervention_id: str,
        progress_percent: int,
        notes: Optional[str] = None
    ) -> TraineeIntervention:
        """Updates real-time progress for an active intervention."""
        tint = db.query(TraineeIntervention).filter(TraineeIntervention.id == trainee_intervention_id).first()
        if not tint:
            raise ValueError(f"Trainee intervention '{trainee_intervention_id}' not found.")

        tint.progress_percent = max(0, min(100, progress_percent))
        if notes:
            tint.notes = notes

        if tint.progress_percent >= 100 and tint.status == "in_progress":
            tint.status = "completed"
            tint.completed_at = date.today().isoformat()

        db.commit()
        db.refresh(tint)
        return tint

    @classmethod
    def submit_reassessment_and_update_scores(
        cls,
        db: Session,
        trainee_intervention_id: str,
        reassessed_score: float,
        reviewer_name: str,
        evaluator_notes: str,
        artifact_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Closed-Loop Reassessment Workflow:
        1. Records reassessment evidence in TraineeSkillEvidence.
        2. Recalculates 0-5 proficiency score via SkillScoringEngine.
        3. Re-evaluates candidate skill gap audit via SkillGapEngine.
        4. Marks TraineeIntervention as 'reassessed' and closes the gap.
        """
        tint = db.query(TraineeIntervention).filter(TraineeIntervention.id == trainee_intervention_id).first()
        if not tint:
            raise ValueError(f"Trainee intervention '{trainee_intervention_id}' not found.")

        trainee = db.query(Trainee).filter(Trainee.id == tint.trainee_id).first()
        today_str = date.today().isoformat()

        # Map intervention type to evidence source
        type_to_source = {
            "course_module": "assessment",
            "practice_task": "practical_project",
            "project": "practical_project",
            "certification": "certification",
            "mentorship": "trainer_evaluation",
            "apprenticeship": "employer_feedback",
            "interview_prep": "assessment",
            "soft_skill_practice": "assessment",
        }
        evidence_source = type_to_source.get(tint.intervention_type, "practical_project")

        # 1. Add new TraineeSkillEvidence record
        matching_ts = db.query(TraineeSkill).filter(
            TraineeSkill.trainee_id == tint.trainee_id,
            (TraineeSkill.skill_id == tint.gap_skill_id) | (TraineeSkill.name.ilike(tint.gap_skill_name))
        ).first()
        target_skill_id = matching_ts.skill_id if matching_ts else tint.gap_skill_id
        target_skill_name = matching_ts.name if matching_ts else tint.gap_skill_name

        reassess_evidence = TraineeSkillEvidence(
            trainee_id=tint.trainee_id,
            skill_id=target_skill_id,
            skill_name=target_skill_name,
            evidence_source=evidence_source,
            score=min(5.0, max(0.0, float(reassessed_score))),
            confidence=0.95,
            assessment_date=today_str,
            reviewer_source=reviewer_name,
            notes=evaluator_notes,
            artifact_url=artifact_url
        )
        db.add(reassess_evidence)
        db.commit()

        db.refresh(reassess_evidence)

        # 2. Resynchronize Trainee Skill Scores using Configurable Multi-Source Formula
        SkillScoringEngine.sync_trainee_skill_scores(db, tint.trainee_id)

        # 3. Re-run Skill Gap Engine to re-evaluate gap status
        updated_gap_audit = SkillGapEngine.analyze_trainee_skill_gap(db, tint.trainee_id, save_record=True)

        # 4. Update TraineeIntervention record
        tint.status = "reassessed"
        tint.progress_percent = 100
        tint.reassessed_proficiency = reassessed_score
        tint.reassessment_date = today_str
        tint.reassessment_notes = evaluator_notes
        tint.reassessment_evidence_id = reassess_evidence.id

        db.commit()
        db.refresh(tint)

        # Check if the gap was closed
        updated_breakdown = updated_gap_audit.get("gaps_breakdown", [])
        gap_still_present = any(g["skill_id"] == tint.gap_skill_id for g in updated_breakdown)

        # Fetch updated skill proficiency score
        updated_ts = db.query(TraineeSkill).filter(
            TraineeSkill.trainee_id == tint.trainee_id,
            TraineeSkill.skill_id == tint.gap_skill_id
        ).first()

        new_proficiency = updated_ts.proficiency_score if updated_ts else reassessed_score

        return {
            "status": "success",
            "trainee_id": tint.trainee_id,
            "trainee_name": trainee.full_name if trainee else tint.trainee_name,
            "skill_name": tint.gap_skill_name,
            "baseline_proficiency": tint.baseline_proficiency,
            "reassessed_score": reassessed_score,
            "new_overall_proficiency": new_proficiency,
            "gap_closed": not gap_still_present,
            "updated_match_score": updated_gap_audit.get("match_score"),
            "remaining_gaps_count": updated_gap_audit.get("total_gaps_count"),
            "evidence_id": reassess_evidence.id,
            "reassessment_date": today_str,
            "message": (
                f"Successfully reassessed {tint.gap_skill_name}! "
                f"Proficiency progressed from {tint.baseline_proficiency}/5.0 to {new_proficiency}/5.0. "
                f"{'Skill gap is now officially closed.' if not gap_still_present else 'Gap deficit significantly reduced.'}"
            )
        }

    @classmethod
    def get_trainee_interventions(cls, db: Session, trainee_id: str) -> List[Dict[str, Any]]:
        """Returns all recommended, active, or completed interventions for a trainee."""
        tints = db.query(TraineeIntervention).filter(TraineeIntervention.trainee_id == trainee_id).all()
        results = []
        for ti in tints:
            results.append({
                "id": ti.id,
                "trainee_id": ti.trainee_id,
                "trainee_name": ti.trainee_name,
                "gap_skill_id": ti.gap_skill_id,
                "gap_skill_name": ti.gap_skill_name,
                "gap_type": ti.gap_type,
                "intervention_id": ti.intervention_id,
                "intervention_title": ti.intervention_title,
                "intervention_type": ti.intervention_type,
                "status": ti.status,
                "progress_percent": ti.progress_percent,
                "started_at": ti.started_at,
                "completed_at": ti.completed_at,
                "baseline_proficiency": ti.baseline_proficiency,
                "expected_proficiency": ti.expected_proficiency,
                "reassessed_proficiency": ti.reassessed_proficiency,
                "reassessment_date": ti.reassessment_date,
                "reassessment_notes": ti.reassessment_notes,
                "why_it_matters": ti.why_it_matters,
                "notes": ti.notes
            })
        return results
