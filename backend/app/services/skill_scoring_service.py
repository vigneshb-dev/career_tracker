"""
Trainee Skill Scoring Engine.
Calculates 0-5 proficiency scores based on multi-source evidence fusion:
Assessment, Practical Project, Certification, Trainer Evaluation, and Employer Feedback.
Uses a transparent, configurable formula with recency decay and multi-source confidence corroboration.
"""

from datetime import datetime, date
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from app.models.entities import Trainee, Skill, TraineeSkill, TraineeSkillEvidence

# Default Configurable Evidence Weights (sum = 1.0)
DEFAULT_SOURCE_WEIGHTS: Dict[str, float] = {
    "practical_project": 0.30,
    "assessment": 0.25,
    "trainer_evaluation": 0.20,
    "certification": 0.15,
    "employer_feedback": 0.10,
}

# Source Display Labels
SOURCE_LABELS = {
    "practical_project": "Practical Capstone / Project",
    "assessment": "Standardized Assessment / SJT",
    "trainer_evaluation": "Trainer / Instructor Evaluation",
    "certification": "Industry Certification / Credential",
    "employer_feedback": "Employer / Internship Feedback",
}

class SkillScoringEngine:
    """Configurable scoring engine fusing heterogeneous evidence into transparent 0-5 ratings."""

    _source_weights: Dict[str, float] = dict(DEFAULT_SOURCE_WEIGHTS)
    _min_score: float = 0.0
    _max_score: float = 5.0

    @classmethod
    def get_scoring_configuration(cls) -> Dict[str, Any]:
        """Returns the active scoring formula configuration."""
        return {
            "source_weights": dict(cls._source_weights),
            "source_labels": SOURCE_LABELS,
            "min_score": cls._min_score,
            "max_score": cls._max_score,
            "recency_decay_enabled": True,
            "formula_name": "Multi-Source Bayesian Corroboration (Workforce Standard 2026)",
            "description": (
                "Weights multiple verified evidence streams (Project 30%, Assessment 25%, "
                "Trainer 20%, Certification 15%, Employer 10%) with time-decay and cross-source confidence boosts."
            )
        }

    @classmethod
    def update_scoring_configuration(cls, new_weights: Dict[str, float]) -> Dict[str, Any]:
        """Updates the evidence source weights if valid."""
        total = sum(new_weights.values())
        if total <= 0:
            raise ValueError("Total weights must be greater than 0")
        
        # Normalize to sum to 1.0
        normalized = {k: round(v / total, 3) for k, v in new_weights.items()}
        for k in DEFAULT_SOURCE_WEIGHTS:
            if k not in normalized:
                normalized[k] = 0.0
        
        cls._source_weights = normalized
        return cls.get_scoring_configuration()

    @classmethod
    def calculate_recency_factor(cls, assessment_date_str: str) -> float:
        """Calculates time-decay factor based on assessment age."""
        try:
            assessed_dt = datetime.strptime(assessment_date_str[:10], "%Y-%m-%d").date()
            days_old = (date.today() - assessed_dt).days
            if days_old <= 90:
                return 1.00 # Fresh
            elif days_old <= 180:
                return 0.95 # Recent
            elif days_old <= 365:
                return 0.90 # Within 1 year
            elif days_old <= 730:
                return 0.80 # 1-2 years
            else:
                return 0.70 # > 2 years
        except Exception:
            return 1.00

    @classmethod
    def compute_skill_proficiency(
        cls,
        evidence_list: List[TraineeSkillEvidence],
        target_benchmark: float = 4.0
    ) -> Dict[str, Any]:
        """
        Fuses multiple evidence sources for a single skill into:
        - 0-5 proficiency score
        - confidence percentage
        - detailed human-readable calculation explanation
        """
        if not evidence_list:
            return {
                "proficiency_score": 0.0,
                "target_level": target_benchmark,
                "confidence": 0.0,
                "evidence_count": 0,
                "calculation_explanation": "No evidence recorded yet for this skill.",
                "sources_present": [],
                "breakdown": []
            }

        total_weighted_product = 0.0
        total_effective_weight = 0.0
        breakdown_items = []
        distinct_sources = set()
        confidences = []

        # Sort evidence by assessment date descending so latest reassessments take priority
        sorted_ev = sorted(evidence_list, key=lambda e: (e.assessment_date or ""), reverse=True)
        seen_source_counts: Dict[str, int] = {}

        for ev in sorted_ev:
            src = ev.evidence_source
            distinct_sources.add(src)
            confidences.append(ev.confidence)

            count_for_src = seen_source_counts.get(src, 0)
            seen_source_counts[src] = count_for_src + 1
            # Most recent evidence for each source gets full weight; superseded older assessments decay
            supersede_factor = 1.0 if count_for_src == 0 else 0.15

            base_weight = cls._source_weights.get(src, 0.15)
            recency = cls.calculate_recency_factor(ev.assessment_date)
            effective_weight = base_weight * ev.confidence * recency * supersede_factor

            # Normalize raw score to 0-5 if stored as 0-100
            raw_score = ev.score
            if raw_score > 5.0 and raw_score <= 100.0:
                score_0_5 = (raw_score / 100.0) * 5.0
            else:
                score_0_5 = max(0.0, min(5.0, raw_score))

            total_weighted_product += effective_weight * score_0_5
            total_effective_weight += effective_weight


            breakdown_items.append({
                "id": ev.id,
                "source": src,
                "source_label": SOURCE_LABELS.get(src, src.title()),
                "score": round(score_0_5, 2),
                "confidence": round(ev.confidence, 2),
                "assessment_date": ev.assessment_date,
                "reviewer_source": ev.reviewer_source,
                "base_weight": base_weight,
                "recency_factor": round(recency, 2),
                "effective_weight": round(effective_weight, 3),
                "notes": ev.notes,
                "rubric_scores": ev.rubric_scores
            })

        if total_effective_weight > 0:
            final_score = round(total_weighted_product / total_effective_weight, 2)
        else:
            final_score = round(sum(b["score"] for b in breakdown_items) / len(breakdown_items), 2)

        final_score = max(0.0, min(5.0, final_score))

        # Confidence Corroboration Formula:
        # Base confidence + corroboration bonus for multiple distinct evidence streams
        avg_conf = sum(confidences) / len(confidences) if confidences else 0.8
        corroboration_bonus = min(0.12, (len(distinct_sources) - 1) * 0.04)
        overall_confidence = round(min(0.99, max(0.50, avg_conf + corroboration_bonus)), 2)

        # Build Transparent Audit Explanation
        source_summary_parts = []
        for b in breakdown_items:
            pct_weight = int(b["base_weight"] * 100)
            source_summary_parts.append(
                f"{b['source_label']} (Score {b['score']}/5.0 @ {pct_weight}% weight, "
                f"{int(b['confidence']*100)}% conf by {b['reviewer_source']})"
            )

        sources_str = "; ".join(source_summary_parts)
        delta = round(final_score - target_benchmark, 2)
        status_str = f"+{delta} above" if delta >= 0 else f"{delta} below"

        explanation = (
            f"Proficiency score of {final_score:.1f}/5.0 derived from {len(evidence_list)} evidence item(s) "
            f"across {len(distinct_sources)} distinct source(s) using the Configurable Multi-Source Formula. "
            f"Evidence: {sources_str}. Target benchmark is {target_benchmark:.1f}/5.0 ({status_str} benchmark). "
            f"Overall confidence is {int(overall_confidence*100)}% with cross-source corroboration factor."
        )

        return {
            "proficiency_score": final_score,
            "target_level": target_benchmark,
            "confidence": overall_confidence,
            "evidence_count": len(evidence_list),
            "distinct_source_count": len(distinct_sources),
            "sources_present": list(distinct_sources),
            "calculation_explanation": explanation,
            "breakdown": breakdown_items
        }

    @classmethod
    def sync_trainee_skill_scores(cls, db: Session, trainee_id: str) -> List[Dict[str, Any]]:
        """
        Recalculates and updates all TraineeSkill records for a trainee from their evidence records.
        """
        all_skills = db.query(TraineeSkill).filter(TraineeSkill.trainee_id == trainee_id).all()
        all_evidence = db.query(TraineeSkillEvidence).filter(TraineeSkillEvidence.trainee_id == trainee_id).all()

        # Group evidence by skill_id and normalized skill_name
        evidence_by_skill: Dict[str, List[TraineeSkillEvidence]] = {}
        evidence_by_name: Dict[str, List[TraineeSkillEvidence]] = {}
        processed_ev_ids = set()

        for ev in all_evidence:
            evidence_by_skill.setdefault(ev.skill_id, []).append(ev)
            evidence_by_name.setdefault(ev.skill_name.strip().lower(), []).append(ev)

        updated_skills = []
        handled_names = set()

        for ts in all_skills:
            handled_names.add(ts.name.strip().lower())
            # Look up evidence by ID first, then fallback to normalized name
            ev_list = evidence_by_skill.get(ts.skill_id) or evidence_by_name.get(ts.name.strip().lower(), [])
            for e in ev_list:
                processed_ev_ids.add(e.id)

            calc = cls.compute_skill_proficiency(ev_list, target_benchmark=ts.target_level or 4.0)

            ts.proficiency_score = calc["proficiency_score"]
            ts.confidence = calc["confidence"]
            ts.calculation_explanation = calc["calculation_explanation"]
            ts.evidence_count = calc["evidence_count"]
            ts.formula_weights = cls._source_weights
            if ev_list:
                ts.last_assessed_at = max(e.assessment_date for e in ev_list)

            # Map 0-5 score to legacy level & score (0-100)
            score_100 = int((ts.proficiency_score / 5.0) * 100)
            ts.score = score_100
            if ts.proficiency_score >= 4.5:
                ts.level = "expert"
            elif ts.proficiency_score >= 3.5:
                ts.level = "advanced"
            elif ts.proficiency_score >= 2.5:
                ts.level = "intermediate"
            elif ts.proficiency_score >= 1.5:
                ts.level = "beginner"
            else:
                ts.level = "novice"

            updated_skills.append({
                "skill_id": ts.skill_id,
                "name": ts.name,
                "proficiency_score": ts.proficiency_score,
                "target_level": ts.target_level,
                "confidence": ts.confidence,
                "calculation_explanation": ts.calculation_explanation,
                "evidence_count": ts.evidence_count,
                "evidence": calc["breakdown"]
            })

        # Create new TraineeSkill records for newly demonstrated skills from interventions
        for norm_name, ev_list in evidence_by_name.items():
            if norm_name not in handled_names:
                handled_names.add(norm_name)
                rep = ev_list[0]
                calc = cls.compute_skill_proficiency(ev_list, target_benchmark=4.0)
                new_ts = TraineeSkill(
                    trainee_id=trainee_id,
                    skill_id=rep.skill_id,
                    name=rep.skill_name,
                    level="advanced" if calc["proficiency_score"] >= 3.5 else "intermediate",
                    verified=True,
                    score=int((calc["proficiency_score"] / 5.0) * 100),
                    proficiency_score=calc["proficiency_score"],
                    target_level=4.0,
                    confidence=calc["confidence"],
                    calculation_explanation=calc["calculation_explanation"],
                    formula_weights=cls._source_weights,
                    evidence_count=len(ev_list),
                    last_assessed_at=max(e.assessment_date for e in ev_list)
                )
                db.add(new_ts)
                updated_skills.append({
                    "skill_id": new_ts.skill_id,
                    "name": new_ts.name,
                    "proficiency_score": new_ts.proficiency_score,
                    "target_level": new_ts.target_level,
                    "confidence": new_ts.confidence,
                    "calculation_explanation": new_ts.calculation_explanation,
                    "evidence_count": new_ts.evidence_count,
                    "evidence": calc["breakdown"]
                })

        db.commit()
        return updated_skills


    @classmethod
    def get_trainee_radar_profile(cls, db: Session, trainee_id: str) -> Dict[str, Any]:
        """
        Generates radar chart data (Current Level vs Target Level) and detailed evidence tables.
        """
        trainee = db.query(Trainee).filter(Trainee.id == trainee_id).first()
        if not trainee:
            return {}

        all_skills = db.query(TraineeSkill).filter(TraineeSkill.trainee_id == trainee_id).all()
        all_evidence = db.query(TraineeSkillEvidence).filter(TraineeSkillEvidence.trainee_id == trainee_id).all()

        evidence_by_skill: Dict[str, List[TraineeSkillEvidence]] = {}
        for ev in all_evidence:
            if ev.skill_id not in evidence_by_skill:
                evidence_by_skill[ev.skill_id] = []
            evidence_by_skill[ev.skill_id].append(ev)

        radar_data = []
        skills_matrix = []

        for ts in all_skills:
            ev_list = evidence_by_skill.get(ts.skill_id, [])
            calc = cls.compute_skill_proficiency(ev_list, target_benchmark=ts.target_level or 4.0)

            # Look up skill metadata (category: hard/soft)
            meta = db.query(Skill).filter(Skill.id == ts.skill_id).first()
            category = meta.category if meta else ("soft" if "communication" in ts.name.lower() or "team" in ts.name.lower() or "problem" in ts.name.lower() else "hard")

            # Radar Data item for Recharts / Plotly
            radar_data.append({
                "skill": ts.name,
                "skill_id": ts.skill_id,
                "category": category,
                "current_level": calc["proficiency_score"],
                "target_level": calc["target_level"],
                "confidence": calc["confidence"],
                "full_mark": 5.0
            })

            skills_matrix.append({
                "skill_id": ts.skill_id,
                "name": ts.name,
                "category": category,
                "current_level": calc["proficiency_score"],
                "target_level": calc["target_level"],
                "confidence": calc["confidence"],
                "evidence_count": calc["evidence_count"],
                "sources_present": calc["sources_present"],
                "calculation_explanation": calc["calculation_explanation"],
                "evidence": calc["breakdown"]
            })

        return {
            "trainee_id": trainee.id,
            "trainee_name": trainee.full_name,
            "program": trainee.program,
            "scoring_formula": cls.get_scoring_configuration(),
            "radar_data": radar_data,
            "skills_matrix": skills_matrix,
            "total_skills": len(skills_matrix),
            "total_evidence_records": len(all_evidence)
        }
