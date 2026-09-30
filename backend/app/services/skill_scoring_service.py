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
    "resume": 0.00,  # Unverified claims alone do not generate verified scores
}

# Source Display Labels
SOURCE_LABELS = {
    "resume": "Resume Evidence (Detected)",
    "practical_project": "Project / Capstone (Verified)",
    "assessment": "Standardized Assessment (Verified)",
    "trainer_evaluation": "Coach / Trainer Evaluation (Verified)",
    "certification": "Industry Certification (Verified)",
    "employer_feedback": "Employer Feedback (Verified)",
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
        Fuses multiple evidence sources (Resume, Assessment, Project, Certification, Coach, Employer)
        into a unified skill profile.
        CRITICAL RULE: Resume claims alone do NOT become verified competency scores!
        """
        if not evidence_list:
            return {
                "proficiency_score": 0.0,
                "current_score": 0.0,
                "target_level": target_benchmark,
                "confidence": 0.0,
                "evidence_count": 0,
                "distinct_source_count": 0,
                "sources_present": [],
                "verification_status": "unverified",
                "is_verified": False,
                "sources_summary": {
                    "resume": "Not Listed",
                    "assessment": "Pending",
                    "practical_project": "Unverified",
                    "certification": "None",
                    "coach_evaluation": "Pending",
                    "employer_feedback": "None",
                    "final_skill_profile": "0/5"
                },
                "evidence_label": "No Evidence",
                "date_assessed": None,
                "calculation_explanation": "No evidence recorded yet for this skill.",
                "breakdown": []
            }

        breakdown_items = []
        distinct_sources = set()
        confidences = []

        # Sort evidence by assessment date descending
        sorted_ev = sorted(evidence_list, key=lambda e: (e.assessment_date or ""), reverse=True)
        latest_date = sorted_ev[0].assessment_date if sorted_ev else None

        # Separate verified objective sources from self-reported resume claims
        verified_ev = [e for e in sorted_ev if e.evidence_source != "resume"]
        has_resume = any(e.evidence_source == "resume" for e in sorted_ev)

        for ev in sorted_ev:
            src = ev.evidence_source
            distinct_sources.add(src)
            confidences.append(ev.confidence)

            # Normalize raw score to 0-5
            raw_score = ev.score
            if raw_score > 5.0 and raw_score <= 100.0:
                score_0_5 = (raw_score / 100.0) * 5.0
            else:
                score_0_5 = max(0.0, min(5.0, raw_score))

            base_weight = cls._source_weights.get(src, 0.0)
            recency = cls.calculate_recency_factor(ev.assessment_date)

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
                "effective_weight": round(base_weight * ev.confidence * recency, 3),
                "notes": ev.notes,
                "rubric_scores": ev.rubric_scores,
                "is_verified_source": (src != "resume")
            })

        # --- CASE A: ONLY Resume Evidence Exists ---
        # Resume claims alone do NOT become verified competency scores!
        if not verified_ev:
            resume_item = next(e for e in sorted_ev if e.evidence_source == "resume")
            claim_score = round(resume_item.score, 1) if resume_item.score <= 5.0 else round(resume_item.score / 20.0, 1)
            sources_summary = {
                "resume": "Detected",
                "assessment": "None",
                "practical_project": "None",
                "certification": "None",
                "coach_evaluation": "None",
                "employer_feedback": "None",
                "final_skill_profile": "0/5"
            }
            return {
                "proficiency_score": 0.0,
                "current_score": 0.0,
                "target_level": target_benchmark,
                "confidence": round(resume_item.confidence * 0.70, 2),
                "evidence_count": len(evidence_list),
                "distinct_source_count": 1,
                "sources_present": ["resume"],
                "verification_status": "detected",
                "is_verified": False,
                "sources_summary": sources_summary,
                "evidence_label": "Resume Evidence (Detected Claim)",
                "date_assessed": latest_date,
                "calculation_explanation": (
                    f"Skill detected in uploaded resume (self-reported claim; {resume_item.notes or ''}). "
                    "In compliance with workforce competency protocols, resume claims alone are unverified and do not count toward verified proficiency "
                    "until corroborated by an assessment, practical project, coach review, certification, or employer feedback."
                ),
                "breakdown": breakdown_items
            }

        # --- CASE B: Objective / Verified Evidence Exists ---
        total_weighted_product = 0.0
        total_effective_weight = 0.0
        seen_source_counts: Dict[str, int] = {}

        for ev in verified_ev:
            src = ev.evidence_source
            count_for_src = seen_source_counts.get(src, 0)
            seen_source_counts[src] = count_for_src + 1
            supersede_factor = 1.0 if count_for_src == 0 else 0.20

            base_weight = cls._source_weights.get(src, 0.15)
            recency = cls.calculate_recency_factor(ev.assessment_date)
            effective_weight = base_weight * ev.confidence * recency * supersede_factor

            raw_score = ev.score
            if raw_score > 5.0 and raw_score <= 100.0:
                score_0_5 = (raw_score / 100.0) * 5.0
            else:
                score_0_5 = max(0.0, min(5.0, raw_score))

            total_weighted_product += effective_weight * score_0_5
            total_effective_weight += effective_weight

        if total_effective_weight > 0:
            final_score = round(total_weighted_product / total_effective_weight, 2)
        else:
            final_score = round(sum(e.score for e in verified_ev) / len(verified_ev), 2)

        final_score = max(0.0, min(5.0, final_score))

        # Corroboration bonus: cross-source confidence boost
        avg_conf = sum(e.confidence for e in verified_ev) / len(verified_ev)
        corroboration_bonus = min(0.12, (len(distinct_sources) - 1) * 0.04)
        if has_resume:
            corroboration_bonus += 0.03 # Extra bonus when self-reported claim is verified in practice
        overall_confidence = round(min(0.99, max(0.60, avg_conf + corroboration_bonus)), 2)

        # Assemble sources summary exactly matching specification:
        # Resume Evidence -> Detected | Assessment -> 4/5 | Project -> Verified | Employer Feedback -> 4/5
        assess_ev = next((e for e in sorted_ev if e.evidence_source == "assessment"), None)
        proj_ev = next((e for e in sorted_ev if e.evidence_source == "practical_project"), None)
        cert_ev = next((e for e in sorted_ev if e.evidence_source == "certification"), None)
        coach_ev = next((e for e in sorted_ev if e.evidence_source == "trainer_evaluation"), None)
        emp_ev = next((e for e in sorted_ev if e.evidence_source == "employer_feedback"), None)

        sources_summary = {
            "resume": "Detected" if has_resume else "None",
            "assessment": f"{round(assess_ev.score)}/5" if assess_ev else "None",
            "practical_project": "Verified" if proj_ev else "None",
            "certification": "Verified" if cert_ev else "None",
            "coach_evaluation": f"{round(coach_ev.score)}/5" if coach_ev else "None",
            "employer_feedback": f"{round(emp_ev.score)}/5" if emp_ev else "None",
            "final_skill_profile": f"{round(final_score)}/5"
        }

        # Build clean evidence sources label: e.g. "Resume + Assessment" or "Project + Employer Feedback"
        active_labels = []
        if has_resume:
            active_labels.append("Resume")
        if assess_ev:
            active_labels.append("Assessment")
        if proj_ev:
            active_labels.append("Project")
        if cert_ev:
            active_labels.append("Certification")
        if coach_ev:
            active_labels.append("Coach Evaluation")
        if emp_ev:
            active_labels.append("Employer Feedback")

        evidence_label = " + ".join(active_labels) if active_labels else "Verified Evidence"

        delta = round(final_score - target_benchmark, 2)
        status_str = f"+{delta} above" if delta >= 0 else f"{delta} below"

        explanation = (
            f"Unified Proficiency score of {final_score:.1f}/5.0 derived from {len(verified_ev)} verified evidence stream(s) "
            f"across {len(distinct_sources)} distinct source(s). Sources: {evidence_label}. "
            f"Target benchmark is {target_benchmark:.1f}/5.0 ({status_str} benchmark). "
            f"Overall confidence is {int(overall_confidence*100)}% with cross-source corroboration factor."
        )

        return {
            "proficiency_score": final_score,
            "current_score": final_score,
            "target_level": target_benchmark,
            "confidence": overall_confidence,
            "evidence_count": len(evidence_list),
            "distinct_source_count": len(distinct_sources),
            "sources_present": list(distinct_sources),
            "verification_status": "verified",
            "is_verified": True,
            "sources_summary": sources_summary,
            "evidence_label": evidence_label,
            "date_assessed": latest_date,
            "calculation_explanation": explanation,
            "breakdown": breakdown_items
        }

    @classmethod
    def sync_trainee_skill_scores(cls, db: Session, trainee_id: str) -> List[Dict[str, Any]]:
        """
        Recalculates and updates all TraineeSkill records for a trainee from their multi-source evidence.
        """
        all_skills = db.query(TraineeSkill).filter(TraineeSkill.trainee_id == trainee_id).all()
        all_evidence = db.query(TraineeSkillEvidence).filter(TraineeSkillEvidence.trainee_id == trainee_id).all()

        # Ensure resume evidence from latest ResumeAnalysisRecord is synced into TraineeSkillEvidence
        try:
            from app.models.entities import ResumeAnalysisRecord
            resume_record = db.query(ResumeAnalysisRecord).filter(
                ResumeAnalysisRecord.trainee_id == trainee_id
            ).order_by(ResumeAnalysisRecord.analyzed_at.desc()).first()
            if resume_record and resume_record.skills_profile:
                profile_skills = resume_record.skills_profile if isinstance(resume_record.skills_profile, list) else []
                new_added = False
                for sk in profile_skills:
                    cname = (sk.get("canonical_name") or sk.get("skill_name") or "").strip()
                    sk_id = sk.get("skill_id") or f"sk-res-{cname.lower()[:8]}"
                    if not cname:
                        continue
                    exists = any(
                        e.evidence_source == "resume" and (e.skill_name.lower() == cname.lower() or e.skill_id == sk_id)
                        for e in all_evidence
                    )
                    if not exists:
                        new_ev = TraineeSkillEvidence(
                            trainee_id=trainee_id,
                            skill_id=sk_id,
                            skill_name=cname,
                            evidence_source="resume",
                            score=float(sk.get("estimated_proficiency", 4.0)),
                            max_score=5.0,
                            confidence=float(sk.get("confidence", 0.90)),
                            assessment_date=resume_record.analyzed_at[:10] if resume_record.analyzed_at else "2026-09-30",
                            reviewer_source="Real-Time AI Resume Semantic Analyzer (spaCy + Sentence Transformers)",
                            notes=f"[Resume Evidence]: {sk.get('evidence_snippet', 'Extracted from resume')}",
                            artifact_url=resume_record.file_url or f"/uploads/resumes/{resume_record.filename}"
                        )
                        db.add(new_ev)
                        all_evidence.append(new_ev)
                        new_added = True
                if new_added:
                    db.commit()
        except Exception as e:
            logger.warning(f"Could not backfill resume evidence for {trainee_id}: {e}")

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
            ev_list = evidence_by_skill.get(ts.skill_id) or evidence_by_name.get(ts.name.strip().lower(), [])
            for e in ev_list:
                processed_ev_ids.add(e.id)

            calc = cls.compute_skill_proficiency(ev_list, target_benchmark=ts.target_level or 4.0)

            ts.proficiency_score = calc["proficiency_score"]
            ts.confidence = calc["confidence"]
            ts.calculation_explanation = calc["calculation_explanation"]
            ts.evidence_count = calc["evidence_count"]
            ts.formula_weights = cls._source_weights
            ts.verified = calc["is_verified"]
            if ev_list:
                ts.last_assessed_at = calc["date_assessed"]

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
                "current_score": calc["proficiency_score"],
                "proficiency_score": calc["proficiency_score"],
                "target_level": ts.target_level,
                "confidence": calc["confidence"],
                "date_assessed": calc["date_assessed"],
                "verification_status": calc["verification_status"],
                "is_verified": calc["is_verified"],
                "sources_summary": calc["sources_summary"],
                "evidence_label": calc["evidence_label"],
                "evidence_sources": calc["sources_present"],
                "calculation_explanation": calc["calculation_explanation"],
                "evidence_count": calc["evidence_count"],
                "evidence": calc["breakdown"]
            })

        # Register any evidence items without a pre-existing TraineeSkill row
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
                    verified=calc["is_verified"],
                    score=int((calc["proficiency_score"] / 5.0) * 100),
                    proficiency_score=calc["proficiency_score"],
                    target_level=4.0,
                    confidence=calc["confidence"],
                    calculation_explanation=calc["calculation_explanation"],
                    formula_weights=cls._source_weights,
                    evidence_count=len(ev_list),
                    last_assessed_at=calc["date_assessed"]
                )
                db.add(new_ts)
                updated_skills.append({
                    "skill_id": new_ts.skill_id,
                    "name": new_ts.name,
                    "current_score": calc["proficiency_score"],
                    "proficiency_score": calc["proficiency_score"],
                    "target_level": new_ts.target_level,
                    "confidence": calc["confidence"],
                    "date_assessed": calc["date_assessed"],
                    "verification_status": calc["verification_status"],
                    "is_verified": calc["is_verified"],
                    "sources_summary": calc["sources_summary"],
                    "evidence_label": calc["evidence_label"],
                    "evidence_sources": calc["sources_present"],
                    "calculation_explanation": calc["calculation_explanation"],
                    "evidence_count": calc["evidence_count"],
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

            meta = db.query(Skill).filter(Skill.id == ts.skill_id).first()
            category = meta.category if meta else ("soft" if any(w in ts.name.lower() for w in ["communication", "team", "problem", "collaborat", "time", "leadership"]) else "hard")

            radar_data.append({
                "skill": ts.name,
                "skill_id": ts.skill_id,
                "category": category,
                "current_level": calc["proficiency_score"],
                "target_level": calc["target_level"],
                "confidence": calc["confidence"],
                "verification_status": calc["verification_status"],
                "is_verified": calc["is_verified"],
                "full_mark": 5.0
            })

            skills_matrix.append({
                "skill_id": ts.skill_id,
                "name": ts.name,
                "category": category,
                "current_level": calc["proficiency_score"],
                "current_score": calc["proficiency_score"],
                "target_level": calc["target_level"],
                "confidence": calc["confidence"],
                "date_assessed": calc["date_assessed"],
                "verification_status": calc["verification_status"],
                "is_verified": calc["is_verified"],
                "sources_summary": calc["sources_summary"],
                "evidence_label": calc["evidence_label"],
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

    @classmethod
    def get_unified_skill_profile(cls, db: Session, trainee_id: str) -> Dict[str, Any]:
        """
        Unified Skill Profile:
        Fuses Resume + Assessments + Projects + Certifications + Coach Evaluation + Employer Feedback
        into a standardized, auditable multi-source record.
        """
        trainee = db.query(Trainee).filter(Trainee.id == trainee_id).first()
        if not trainee:
            return {}

        cls.sync_trainee_skill_scores(db, trainee_id)
        profile_data = cls.get_trainee_radar_profile(db, trainee_id)

        # Categorize skills into verified vs unverified/detected
        verified_count = sum(1 for s in profile_data.get("skills_matrix", []) if s.get("is_verified"))
        detected_count = sum(1 for s in profile_data.get("skills_matrix", []) if not s.get("is_verified"))

        return {
            "trainee_id": trainee.id,
            "trainee_name": trainee.full_name,
            "program": trainee.program,
            "total_skills": len(profile_data.get("skills_matrix", [])),
            "verified_skills_count": verified_count,
            "detected_skills_count": detected_count,
            "skills": profile_data.get("skills_matrix", []),
            "radar_data": profile_data.get("radar_data", []),
            "scoring_formula": profile_data.get("scoring_formula", {})
        }
