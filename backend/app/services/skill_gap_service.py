"""
Core AI Skill-Gap Engine
Compares:
  Trainee Demonstrated Skills + Proficiency
against
  Occupation Required Skills + Proficiency + Market Demand

Calculates:
  Skill Gap = Required Proficiency - Current Proficiency (only positive differences become gaps)
  Priority = Gap Severity x Skill Importance x Market Demand x Confidence

Classifies gaps into:
  - Learner Gap: skill is taught in course but insufficiently mastered by candidate
  - Curriculum Gap: target occupation requires a skill that the enrolled course does not teach
  - Workplace Gap: employer feedback / internship review identifies a missing practical competency

Deterministic calculations for final scores and AI only for semantic matching/classification.
"""

import math
import logging
from typing import Dict, Any, List, Optional, Set, Tuple
from sqlalchemy.orm import Session

from app.models.entities import (
    Trainee,
    TraineeSkill,
    TraineeSkillEvidence,
    Occupation,
    Course,
    Competency,
    Skill,
    SkillAlias,
    SkillGap,
    Job,
)
from app.services.normalization_service import SkillNormalizationService
from app.services.job_intelligence_service import (
    JobIntelligenceService,
    get_sentence_transformer,
)

logger = logging.getLogger("skilltrace.skill_gap_engine")


def vector_cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """Computes cosine similarity between two unit or non-unit float vectors."""
    if not vec1 or not vec2 or len(vec1) != len(vec2):
        return 0.0
    dot = sum(a * b for a, b in zip(vec1, vec2))
    norm_a = math.sqrt(sum(a * a for a in vec1))
    norm_b = math.sqrt(sum(b * b for b in vec2))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return max(0.0, min(1.0, dot / (norm_a * norm_b)))


class SkillGapEngine:
    """
    Production-grade AI Skill Gap Analysis Engine.
    Combines deterministic scoring formulas with semantic vector matching.
    """

    @classmethod
    def get_enrolled_course_skills(cls, db: Session, trainee: Trainee) -> Tuple[Optional[Course], Set[str], Set[str]]:
        """
        Resolves the trainee's enrolled course and extracts the full set of skills taught
        through the course -> competencies -> skills ontology.
        Returns (Course, set_of_skill_ids, set_of_lowercase_skill_names).
        """
        course = None
        course_id = None

        # Check training_details JSON
        if trainee.training_details and isinstance(trainee.training_details, dict):
            course_id = trainee.training_details.get("course_id")
            course_title = trainee.training_details.get("course_title", "").strip().lower()

            if course_id:
                course = db.query(Course).filter(Course.id == course_id).first()

            if not course and course_title:
                all_courses = db.query(Course).all()
                for c in all_courses:
                    if c.title.lower() in course_title or course_title in c.title.lower():
                        course = c
                        break

        # Fallback by trainee program string
        if not course and trainee.program:
            prog = trainee.program.lower()
            if "software" in prog or "web" in prog or "full-stack" in prog:
                course = db.query(Course).filter(Course.id == "crs-sw-01").first()
            elif "data" in prog or "analytics" in prog or "bi" in prog:
                course = db.query(Course).filter(Course.id == "crs-da-01").first()
            elif "marketing" in prog:
                course = db.query(Course).filter(Course.id == "crs-dm-01").first()
            elif "electrician" in prog:
                course = db.query(Course).filter(Course.id == "crs-el-01").first()
            elif "health" in prog or "medical" in prog:
                course = db.query(Course).filter(Course.id == "crs-hc-01").first()
            elif "retail" in prog:
                course = db.query(Course).filter(Course.id == "crs-rt-01").first()
            elif "machin" in prog or "manufacturing" in prog:
                course = db.query(Course).filter(Course.id == "crs-mf-01").first()

        if not course:
            course = db.query(Course).first()

        course_skill_ids: Set[str] = set()
        course_skill_names: Set[str] = set()

        if course and course.competency_ids:
            competencies = db.query(Competency).filter(Competency.id.in_(course.competency_ids)).all()
            for comp in competencies:
                if comp.skill_ids:
                    for sid in comp.skill_ids:
                        course_skill_ids.add(sid)

            if course_skill_ids:
                skills = db.query(Skill).filter(Skill.id.in_(list(course_skill_ids))).all()
                for s in skills:
                    course_skill_names.add(s.name.lower().strip())
                    if s.canonical_name:
                        course_skill_names.add(s.canonical_name.lower().strip())
                    for al in (s.aliases or []):
                        course_skill_names.add(al.lower().strip())

        return course, course_skill_ids, course_skill_names

    @classmethod
    def resolve_target_occupation(cls, db: Session, trainee: Trainee, target_occ_id: Optional[str] = None) -> Optional[Occupation]:
        """Resolves target occupation via parameter, career preference, or domain."""
        if target_occ_id:
            occ = db.query(Occupation).filter(Occupation.id == target_occ_id).first()
            if occ:
                return occ

        # Check trainee career_preference target_roles
        if trainee.career_preference and isinstance(trainee.career_preference, dict):
            target_roles = trainee.career_preference.get("target_roles", [])
            all_occs = db.query(Occupation).all()
            for role in target_roles:
                role_clean = role.lower().strip()
                for o in all_occs:
                    if o.title.lower() in role_clean or role_clean in o.title.lower():
                        return o

        # Fallback by program domain
        prog = (trainee.program or "").lower()
        if "software" in prog or "web" in prog or "full-stack" in prog:
            return db.query(Occupation).filter(Occupation.id == "occ-sw-01").first()
        elif "backend" in prog or "cloud" in prog or "devops" in prog:
            return db.query(Occupation).filter(Occupation.id == "occ-sw-02").first()
        elif "data" in prog or "analytics" in prog:
            return db.query(Occupation).filter(Occupation.id == "occ-da-01").first()
        elif "cyber" in prog or "infrastructure" in prog:
            return db.query(Occupation).filter(Occupation.id == "occ-sw-02").first()
        elif "marketing" in prog:
            return db.query(Occupation).filter(Occupation.id == "occ-dm-01").first()
        elif "electrician" in prog:
            return db.query(Occupation).filter(Occupation.id == "occ-el-01").first()
        elif "health" in prog:
            return db.query(Occupation).filter(Occupation.id == "occ-hc-01").first()
        elif "retail" in prog:
            return db.query(Occupation).filter(Occupation.id == "occ-rt-01").first()
        elif "manufactur" in prog:
            return db.query(Occupation).filter(Occupation.id == "occ-mf-01").first()

        return db.query(Occupation).first()

    @classmethod
    def get_occupation_required_skills(cls, db: Session, occupation: Occupation) -> List[Dict[str, Any]]:
        """
        Assembles comprehensive list of required skills for an occupation,
        including required proficiency benchmarks, importance weights, and market demand scores.
        """
        required_list: List[Dict[str, Any]] = []
        seen_skill_ids: Set[str] = set()

        # 1. Base required skills from Occupation entity
        base_skill_ids = occupation.required_skill_ids or []
        for sid in base_skill_ids:
            skill = db.query(Skill).filter(Skill.id == sid).first()
            if skill:
                seen_skill_ids.add(skill.id)
                # Benchmark required proficiency (core skills benchmark at 4.0/5.0)
                req_level = 4.0
                importance = 1.0  # Core Essential
                required_list.append({
                    "skill_id": skill.id,
                    "name": skill.name,
                    "canonical_name": skill.canonical_name or skill.name,
                    "category": skill.category or "hard",
                    "domain": skill.domain or occupation.domain,
                    "required_proficiency": req_level,
                    "skill_importance": importance,
                    "importance_label": "Core Requirement",
                    "market_demand_score": skill.demand_score or 90,
                    "market_demand": min(1.0, max(0.5, (skill.demand_score or 90) / 100.0)),
                    "description": skill.description or "",
                })

        # 2. Add complementary domain skills from Competencies
        if occupation.competency_ids:
            competencies = db.query(Competency).filter(Competency.id.in_(occupation.competency_ids)).all()
            for comp in competencies:
                for sid in (comp.skill_ids or []):
                    if sid not in seen_skill_ids and len(required_list) < 8:
                        skill = db.query(Skill).filter(Skill.id == sid).first()
                        if skill:
                            seen_skill_ids.add(skill.id)
                            required_list.append({
                                "skill_id": skill.id,
                                "name": skill.name,
                                "canonical_name": skill.canonical_name or skill.name,
                                "category": skill.category or "hard",
                                "domain": skill.domain or occupation.domain,
                                "required_proficiency": 3.5,  # Secondary benchmark
                                "skill_importance": 0.85,     # Primary
                                "importance_label": "Primary Competency",
                                "market_demand_score": skill.demand_score or 85,
                                "market_demand": min(1.0, max(0.5, (skill.demand_score or 85) / 100.0)),
                                "description": skill.description or "",
                            })

        # 3. Augment with common workplace soft-skills for balanced holistic evaluation
        standard_soft_skills = [
            ("sk-comm-01", "Technical Communication", 4.0, 0.90, 95),
            ("sk-team-01", "Cross-Functional Collaboration", 4.0, 0.90, 92),
            ("sk-prob-01", "Critical Problem Solving", 4.0, 0.95, 96),
            ("sk-time-01", "Time Management & Prioritization", 4.0, 0.85, 90),
        ]
        for sid, sname, req_prof, imp, mkt_dem in standard_soft_skills:
            # Check if not already in list
            if not any(r["skill_id"] == sid or r["name"].lower() == sname.lower() for r in required_list):
                skill = db.query(Skill).filter(Skill.id == sid).first()
                required_list.append({
                    "skill_id": sid,
                    "name": skill.name if skill else sname,
                    "canonical_name": sname,
                    "category": "soft",
                    "domain": occupation.domain,
                    "required_proficiency": req_prof,
                    "skill_importance": imp,
                    "importance_label": "Essential Workplace Behavior",
                    "market_demand_score": mkt_dem,
                    "market_demand": mkt_dem / 100.0,
                    "description": skill.description if skill else f"Demonstrated {sname} in professional settings.",
                })

        # 4. If occupation is Software Development, ensure Cloud / Containerization requirement is tested
        if "Software" in occupation.domain or "Backend" in occupation.title or "Full-Stack" in occupation.title:
            specialized_tech = [
                ("sk-9", "Docker & Containerization", "hard", 4.0, 0.90, 94),
                ("sk-k8s", "Kubernetes Orchestration & Microservices", "hard", 3.5, 0.85, 92),
                ("sk-cloud-sec", "Network & Cloud Security Protocols", "hard", 3.5, 0.80, 88),
            ]
            for st_id, st_name, st_cat, st_prof, st_imp, st_mkt in specialized_tech:
                if not any(r["name"].lower() == st_name.lower() for r in required_list) and len(required_list) < 9:
                    sk = db.query(Skill).filter(Skill.name == st_name).first()
                    required_list.append({
                        "skill_id": sk.id if sk else st_id,
                        "name": st_name,
                        "canonical_name": st_name,
                        "category": st_cat,
                        "domain": occupation.domain,
                        "required_proficiency": st_prof,
                        "skill_importance": st_imp,
                        "importance_label": "High-Demand Industry Skill",
                        "market_demand_score": st_mkt,
                        "market_demand": st_mkt / 100.0,
                        "description": sk.description if sk else f"Applied {st_name} for enterprise production workflows.",
                    })

        return required_list

    @classmethod
    def match_trainee_skill_semantic(
        cls,
        db: Session,
        req_skill: Dict[str, Any],
        trainee_skills: List[TraineeSkill],
        trainee_evidence: List[TraineeSkillEvidence]
    ) -> Tuple[Optional[TraineeSkill], float, float, Optional[TraineeSkillEvidence]]:
        """
        AI Semantic Matching:
        Matches an occupation required skill to the trainee's demonstrated skills.
        Uses exact ID, canonical normalization, alias lookups, and SentenceTransformer cosine similarity.

        Returns: (matched_trainee_skill, current_proficiency, confidence, employer_evidence_record)
        """
        req_id = req_skill["skill_id"]
        req_name_clean = req_skill["name"].lower().strip()
        req_canonical = req_skill["canonical_name"].lower().strip()

        # 1. Exact ID or name match
        for ts in trainee_skills:
            if ts.skill_id == req_id or ts.name.lower().strip() in (req_name_clean, req_canonical):
                # Check for employer feedback evidence specifically
                emp_ev = next(
                    (e for e in trainee_evidence if e.skill_id == ts.skill_id and e.evidence_source == "employer_feedback"),
                    None
                )
                return ts, ts.proficiency_score or 0.0, ts.confidence or 0.90, emp_ev

        # 2. Canonical normalization match via SkillAlias table
        norm_res = SkillNormalizationService.normalize_skill(db, req_skill["name"])
        if norm_res.get("canonical_skill_id"):
            cid = norm_res["canonical_skill_id"]
            for ts in trainee_skills:
                if ts.skill_id == cid:
                    emp_ev = next(
                        (e for e in trainee_evidence if e.skill_id == ts.skill_id and e.evidence_source == "employer_feedback"),
                        None
                    )
                    return ts, ts.proficiency_score or 0.0, ts.confidence or 0.90, emp_ev

        # 3. AI Semantic Embedding Similarity using Sentence Transformers
        req_vec = JobIntelligenceService.generate_embedding(f"{req_skill['name']}. {req_skill.get('description', '')}")
        best_match = None
        best_sim = 0.0

        for ts in trainee_skills:
            ts_vec = JobIntelligenceService.generate_embedding(ts.name)
            sim = vector_cosine_similarity(req_vec, ts_vec)
            if sim > best_sim and sim >= 0.78:
                best_sim = sim
                best_match = ts

        if best_match:
            emp_ev = next(
                (e for e in trainee_evidence if e.skill_id == best_match.skill_id and e.evidence_source == "employer_feedback"),
                None
            )
            # Adjust confidence slightly based on semantic similarity
            effective_conf = (best_match.confidence or 0.90) * best_sim
            return best_match, best_match.proficiency_score or 0.0, round(effective_conf, 2), emp_ev

        # No demonstration found
        # Check if there is any employer feedback mentioning this skill
        emp_ev = None
        for ev in trainee_evidence:
            if ev.evidence_source == "employer_feedback":
                if req_name_clean in ev.skill_name.lower() or (ev.notes and req_name_clean in ev.notes.lower()):
                    emp_ev = ev
                    break

        return None, 0.0, 0.85, emp_ev

    @classmethod
    def analyze_trainee_skill_gap(
        cls,
        db: Session,
        trainee_id: str,
        target_occupation_id: Optional[str] = None,
        target_employer: Optional[str] = None,
        save_record: bool = True
    ) -> Dict[str, Any]:
        """
        Executes complete Skill Gap Analysis comparing:
        Trainee Demonstrated Skills (0-5) vs Occupation Required Skills (0-5).

        Calculates:
        - Skill Gap = Required Proficiency - Current Proficiency (only positive differences)
        - Priority = Gap Severity x Skill Importance x Market Demand x Confidence
        - Classification into Learner Gap, Curriculum Gap, Workplace Gap.
        """
        trainee = db.query(Trainee).filter(Trainee.id == trainee_id).first()
        if not trainee:
            raise ValueError(f"Trainee '{trainee_id}' not found.")

        # 1. Resolve Target Occupation & Enrolled Course Curriculum
        occupation = cls.resolve_target_occupation(db, trainee, target_occupation_id)
        if not occupation:
            raise ValueError("Could not resolve target occupation.")

        course, course_skill_ids, course_skill_names = cls.get_enrolled_course_skills(db, trainee)

        # 2. Fetch Demonstrated Skills & Evidence Records
        trainee_skills = db.query(TraineeSkill).filter(TraineeSkill.trainee_id == trainee.id).all()
        trainee_evidence = db.query(TraineeSkillEvidence).filter(TraineeSkillEvidence.trainee_id == trainee.id).all()

        # 3. Retrieve Occupation Requirements
        required_skills = cls.get_occupation_required_skills(db, occupation)

        gaps_breakdown: List[Dict[str, Any]] = []
        acquired_skills_list: List[Dict[str, Any]] = []

        total_critical = 0
        total_moderate = 0
        total_low = 0
        total_curriculum = 0
        total_learner = 0
        total_workplace = 0
        total_hard_gaps = 0
        total_soft_gaps = 0

        # Accumulated scores for match percentage
        total_required_points = 0.0
        total_earned_points = 0.0

        for req in required_skills:
            req_prof = float(req["required_proficiency"])
            total_required_points += req_prof

            matched_skill, current_prof, conf, emp_ev = cls.match_trainee_skill_semantic(
                db=db,
                req_skill=req,
                trainee_skills=trainee_skills,
                trainee_evidence=trainee_evidence
            )

            # Cap earned points at required
            total_earned_points += min(current_prof, req_prof)

            # Deterministic Skill Gap:
            # Skill Gap = Required Proficiency - Current Proficiency
            # Only positive differences should become gaps
            raw_gap = req_prof - current_prof
            skill_gap = round(max(0.0, raw_gap), 2)

            if skill_gap <= 0.0:
                # Skill is mastered / surplus
                acquired_skills_list.append({
                    "skill_id": req["skill_id"],
                    "skill_name": req["name"],
                    "category": req["category"],
                    "required_proficiency": req_prof,
                    "current_proficiency": current_prof,
                    "surplus": round(current_prof - req_prof, 2),
                    "confidence": conf,
                    "status": "Mastered / Exceeds Target",
                })
                continue

            # A positive gap was detected!
            # ----------------------------------------------------
            # Formula: Priority = Gap Severity x Skill Importance x Market Demand x Confidence
            # ----------------------------------------------------
            # Gap Severity = skill_gap / 5.0 in (0.0, 1.0]
            gap_severity = round(skill_gap / 5.0, 4)
            skill_importance = float(req["skill_importance"])
            market_demand = float(req["market_demand"])
            confidence = float(conf)

            priority_raw = gap_severity * skill_importance * market_demand * confidence
            priority_score = min(100, max(5, round(priority_raw * 100)))

            # Priority Tier Classification
            if priority_score >= 50 or skill_gap >= 2.0:
                priority_tier = "critical"
                priority_label = "Critical Gap"
                total_critical += 1
            elif priority_score >= 25:
                priority_tier = "moderate"
                priority_label = "Moderate Gap"
                total_moderate += 1
            else:
                priority_tier = "low"
                priority_label = "Low Gap"
                total_low += 1

            if req["category"] == "hard":
                total_hard_gaps += 1
            else:
                total_soft_gaps += 1

            # ----------------------------------------------------
            # Gap Classification Logic:
            # 1. Workplace Gap: employer feedback identifies missing practical competency
            # 2. Curriculum Gap: course does not teach this skill
            # 3. Learner Gap: skill is taught in course but candidate insufficiently mastered it
            # ----------------------------------------------------
            gap_type = "learner_gap"
            gap_type_label = "Learner Gap"
            detected_reason = ""
            remediation_action = ""

            # Check 1: Workplace Gap
            is_workplace = False
            employer_notes = None
            if emp_ev:
                # If employer gave rating < 3.5 or explicitly noted workplace application friction
                if emp_ev.score < 3.5 or (emp_ev.notes and any(w in emp_ev.notes.lower() for w in ["friction", "struggl", "inconsisten", "delay", "gap", "revisit", "supervis"])):
                    is_workplace = True
                    employer_notes = emp_ev.notes
            elif req["category"] == "hard" and current_prof > 2.0 and req_prof >= 4.0:
                # If trainee has classroom assessment >= 3.5 but employer feedback is absent or noted practical gaps
                # e.g. for Docker / Staging environments
                for ev in trainee_evidence:
                    if ev.evidence_source == "employer_feedback" and ev.notes:
                        if req["name"].lower() in ev.notes.lower() or "production" in ev.notes.lower() or "staging" in ev.notes.lower():
                            if ev.score < 3.8:
                                is_workplace = True
                                employer_notes = ev.notes
                                break

            # Check 2: Course Curriculum Coverage
            req_id_in_course = req["skill_id"] in course_skill_ids
            req_name_in_course = req["name"].lower().strip() in course_skill_names or req["canonical_name"].lower().strip() in course_skill_names
            is_taught_in_course = req_id_in_course or req_name_in_course

            course_title = course.title if course else "Enrolled Workforce Curriculum"

            if is_workplace:
                gap_type = "workplace_gap"
                gap_type_label = "Workplace Gap"
                total_workplace += 1
                detected_reason = (
                    f"Employer / internship performance audit identifies a practical workplace application deficit in {req['name']}. "
                    f"While theoretical or classroom fundamentals may be present, on-the-job execution autonomy scored below benchmark "
                    f"({f'Employer Feedback: {employer_notes}' if employer_notes else f'Practical Score: {current_prof}/5.0 vs Required {req_prof}/5.0'})."
                )
                remediation_action = f"Pair with a Senior {occupation.title} mentor for targeted on-the-job apprenticeship shadowing and live staging deployment drills."
            elif not is_taught_in_course:
                gap_type = "curriculum_gap"
                gap_type_label = "Curriculum Gap"
                total_curriculum += 1
                detected_reason = (
                    f"Target occupation '{occupation.title}' requires {req['name']} (Required Level: {req_prof}/5.0, Market Demand: {req['market_demand_score']}%), "
                    f"but the trainee's enrolled program '{course_title}' does NOT cover this competency in its core curriculum. "
                    f"This represents an institutional syllabus gap between the training program and modern employer requisitions."
                )
                remediation_action = f"Enroll in elective bridge module: 'Advanced {req['name']} Industry Certification Track' or supplementary lab series."
            else:
                gap_type = "learner_gap"
                gap_type_label = "Learner Gap"
                total_learner += 1
                detected_reason = (
                    f"Skill is formally included in the enrolled curriculum '{course_title}', but the candidate demonstrated Level {current_prof}/5.0 "
                    f"against the occupational benchmark of Level {req_prof}/5.0 (Deficit: -{skill_gap}). "
                    f"The trainee has received instructional coverage but requires additional deliberate practice to reach autonomous workplace mastery."
                )
                remediation_action = f"Complete guided remediation lab exercises and capstone practical milestones focusing on {req['name']} core rubrics."

            # Append structured gap entry
            gaps_breakdown.append({
                "skill_id": req["skill_id"],
                "skill_name": req["name"],
                "category": req["category"],
                "domain": req["domain"],
                "required_proficiency": req_prof,
                "current_proficiency": current_prof,
                "skill_gap": skill_gap,
                "gap_severity": gap_severity,
                "skill_importance": skill_importance,
                "importance_label": req["importance_label"],
                "market_demand": market_demand,
                "market_demand_score": req["market_demand_score"],
                "confidence": confidence,
                "priority_score": priority_score,
                "priority_tier": priority_tier,
                "priority_label": priority_label,
                "gap_type": gap_type,
                "gap_type_label": gap_type_label,
                "is_taught_in_course": is_taught_in_course,
                "course_title": course_title,
                "detected_reason": detected_reason,
                "remediation_action": remediation_action,
                "employer_notes": employer_notes,
                "formula_breakdown": {
                    "formula": "Priority = Gap Severity x Skill Importance x Market Demand x Confidence",
                    "gap_calculation": f"{req_prof} (Required) - {current_prof} (Current) = {skill_gap} Gap",
                    "severity_factor": f"{skill_gap} / 5.0 = {gap_severity}",
                    "skill_importance": f"{skill_importance} ({req['importance_label']})",
                    "market_demand": f"{market_demand} ({req['market_demand_score']}% hiring index)",
                    "confidence": f"{confidence * 100:.0f}% evaluation certainty",
                    "raw_product": f"{gap_severity} x {skill_importance} x {market_demand} x {confidence} = {priority_raw:.4f}",
                    "normalized_priority_score": priority_score,
                }
            })

        # Sort gaps by priority descending (Critical first)
        gaps_breakdown.sort(key=lambda x: x["priority_score"], reverse=True)

        # Calculate Overall Match Score & Gap Score
        match_score = round((total_earned_points / max(total_required_points, 1.0)) * 100)
        gap_score = max(0, 100 - match_score)

        # Generate holistic recommendation narrative
        recommendation_text = (
            f"Candidate alignment for {occupation.title}: Match Score {match_score}% with {len(gaps_breakdown)} identified skill gap(s). "
            f"Immediate focus should be directed at {total_critical} Critical Gap(s) and {total_curriculum} Curriculum Gap(s) "
            f"where high market demand ({gaps_breakdown[0]['skill_name'] if gaps_breakdown else 'None'}) impacts presentation to hiring partners."
        )

        effective_employer = target_employer or trainee.current_employer or "Partner Employer Network"

        # Generate or update record in database
        skill_gap_record = None
        if save_record:
            gap_id = f"GAP-{trainee.id}"
            skill_gap_record = db.query(SkillGap).filter(SkillGap.trainee_id == trainee.id).first()
            if not skill_gap_record:
                skill_gap_record = SkillGap(
                    id=gap_id,
                    trainee_id=trainee.id,
                    trainee_name=trainee.full_name,
                    target_job_title=occupation.title,
                    target_employer=effective_employer,
                    target_occupation_id=occupation.id,
                    target_occupation_title=occupation.title,
                    enrolled_course_id=course.id if course else None,
                    enrolled_course_title=course.title if course else None,
                    gap_score=gap_score,
                    match_score=match_score,
                    total_gaps_count=len(gaps_breakdown),
                    critical_gaps_count=total_critical,
                    moderate_gaps_count=total_moderate,
                    low_gaps_count=total_low,
                    curriculum_gaps_count=total_curriculum,
                    learner_gaps_count=total_learner,
                    workplace_gaps_count=total_workplace,
                    hard_gaps_count=total_hard_gaps,
                    soft_gaps_count=total_soft_gaps,
                    gaps_breakdown=gaps_breakdown,
                    missing_skills=[g["skill_name"] for g in gaps_breakdown],
                    acquired_skills=[a["skill_name"] for a in acquired_skills_list],
                    recommendation=recommendation_text,
                )
                db.add(skill_gap_record)
            else:
                skill_gap_record.trainee_name = trainee.full_name
                skill_gap_record.target_job_title = occupation.title
                skill_gap_record.target_employer = effective_employer
                skill_gap_record.target_occupation_id = occupation.id
                skill_gap_record.target_occupation_title = occupation.title
                skill_gap_record.enrolled_course_id = course.id if course else None
                skill_gap_record.enrolled_course_title = course.title if course else None
                skill_gap_record.gap_score = gap_score
                skill_gap_record.match_score = match_score
                skill_gap_record.total_gaps_count = len(gaps_breakdown)
                skill_gap_record.critical_gaps_count = total_critical
                skill_gap_record.moderate_gaps_count = total_moderate
                skill_gap_record.low_gaps_count = total_low
                skill_gap_record.curriculum_gaps_count = total_curriculum
                skill_gap_record.learner_gaps_count = total_learner
                skill_gap_record.workplace_gaps_count = total_workplace
                skill_gap_record.hard_gaps_count = total_hard_gaps
                skill_gap_record.soft_gaps_count = total_soft_gaps
                skill_gap_record.gaps_breakdown = gaps_breakdown
                skill_gap_record.missing_skills = [g["skill_name"] for g in gaps_breakdown]
                skill_gap_record.acquired_skills = [a["skill_name"] for a in acquired_skills_list]
                skill_gap_record.recommendation = recommendation_text

            db.commit()
            db.refresh(skill_gap_record)

        return {
            "id": skill_gap_record.id if skill_gap_record else f"GAP-{trainee.id}",
            "trainee_id": trainee.id,
            "trainee_name": trainee.full_name,
            "target_occupation_id": occupation.id,
            "target_occupation_title": occupation.title,
            "target_employer": effective_employer,
            "enrolled_course_id": course.id if course else None,
            "enrolled_course_title": course.title if course else None,
            "match_score": match_score,
            "gap_score": gap_score,
            "total_gaps_count": len(gaps_breakdown),
            "critical_gaps_count": total_critical,
            "moderate_gaps_count": total_moderate,
            "low_gaps_count": total_low,
            "curriculum_gaps_count": total_curriculum,
            "learner_gaps_count": total_learner,
            "workplace_gaps_count": total_workplace,
            "hard_gaps_count": total_hard_gaps,
            "soft_gaps_count": total_soft_gaps,
            "gaps_breakdown": gaps_breakdown,
            "acquired_skills": acquired_skills_list,
            "recommendation": recommendation_text,
            "scoring_formula_metadata": {
                "formula": "Priority = Gap Severity x Skill Importance x Market Demand x Confidence",
                "gap_definition": "Required Proficiency - Current Proficiency (only positive differences)",
                "gap_severity_scale": "Gap / 5.0",
                "classification_categories": [
                    {"type": "learner_gap", "title": "Learner Gap", "description": "Skill is taught in the curriculum but insufficiently mastered by candidate."},
                    {"type": "curriculum_gap", "title": "Curriculum Gap", "description": "Occupation requires a skill that the enrolled course does not teach."},
                    {"type": "workplace_gap", "title": "Workplace Gap", "description": "Employer feedback identifies a missing practical competency in production environments."}
                ]
            }
        }

    @classmethod
    def get_workforce_summary(cls, db: Session) -> Dict[str, Any]:
        """Calculates aggregated workforce metrics for the executive Skill Gap Dashboard."""
        all_gaps = db.query(SkillGap).all()

        total_critical = sum(g.critical_gaps_count or 0 for g in all_gaps)
        total_moderate = sum(g.moderate_gaps_count or 0 for g in all_gaps)
        total_low = sum(g.low_gaps_count or 0 for g in all_gaps)
        total_curriculum = sum(g.curriculum_gaps_count or 0 for g in all_gaps)
        total_learner = sum(g.learner_gaps_count or 0 for g in all_gaps)
        total_workplace = sum(g.workplace_gaps_count or 0 for g in all_gaps)
        total_hard = sum(g.hard_gaps_count or 0 for g in all_gaps)
        total_soft = sum(g.soft_gaps_count or 0 for g in all_gaps)

        avg_match = round(sum(g.match_score for g in all_gaps) / max(len(all_gaps), 1), 1) if all_gaps else 82.5

        # Most frequent missing skills
        skill_freq: Dict[str, Dict[str, Any]] = {}
        for g in all_gaps:
            breakdown = g.gaps_breakdown or []
            for item in breakdown:
                sname = item.get("skill_name")
                if sname:
                    if sname not in skill_freq:
                        skill_freq[sname] = {
                            "skill_name": sname,
                            "category": item.get("category", "hard"),
                            "count": 0,
                            "avg_gap": 0.0,
                            "gap_type": item.get("gap_type", "learner_gap"),
                            "market_demand": item.get("market_demand_score", 90),
                            "gaps_sum": 0.0
                        }
                    skill_freq[sname]["count"] += 1
                    skill_freq[sname]["gaps_sum"] += item.get("skill_gap", 1.0)

        top_missing = []
        for sname, data in skill_freq.items():
            avg_g = round(data["gaps_sum"] / max(data["count"], 1), 2)
            top_missing.append({
                "skill_name": sname,
                "category": data["category"],
                "count": data["count"],
                "avg_gap": avg_g,
                "gap_type": data["gap_type"],
                "market_demand": data["market_demand"],
            })
        top_missing.sort(key=lambda x: (x["count"], x["avg_gap"]), reverse=True)

        return {
            "total_audited_candidates": len(all_gaps),
            "average_match_score": avg_match,
            "critical_gaps_total": total_critical,
            "moderate_gaps_total": total_moderate,
            "low_gaps_total": total_low,
            "curriculum_gaps_total": total_curriculum,
            "learner_gaps_total": total_learner,
            "workplace_gaps_total": total_workplace,
            "hard_skills_gaps_total": total_hard,
            "soft_skills_gaps_total": total_soft,
            "top_missing_market_skills": top_missing[:8],
            "severity_distribution": [
                {"name": "Critical Gaps (Priority >= 50)", "count": total_critical, "color": "#ef4444"},
                {"name": "Moderate Gaps (25-49)", "count": total_moderate, "color": "#f59e0b"},
                {"name": "Low Gaps (< 25)", "count": total_low, "color": "#10b981"},
            ],
            "classification_distribution": [
                {"name": "Learner Gaps", "count": total_learner, "color": "#3b82f6", "description": "Taught in course, insufficient mastery"},
                {"name": "Curriculum Gaps", "count": total_curriculum, "color": "#8b5cf6", "description": "Required by employer, missing from course"},
                {"name": "Workplace Gaps", "count": total_workplace, "color": "#ec4899", "description": "Identified by employer feedback / reviews"},
            ],
            "category_distribution": [
                {"name": "Hard Skills", "count": total_hard, "color": "#0284c7"},
                {"name": "Soft Skills", "count": total_soft, "color": "#14b8a6"},
            ]
        }
