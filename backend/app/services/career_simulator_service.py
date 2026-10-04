import re
import logging
from typing import Dict, Any, List, Optional, Set, Tuple
from sqlalchemy.orm import Session
from datetime import datetime

from app.models.entities import (
    Trainee,
    TraineeSkill,
    TraineeSkillEvidence,
    Skill,
    SkillAlias,
    Job,
    JobExtractedSkill,
    Occupation,
    Course,
    Intervention,
    CareerPath,
    CareerSimulationRecord
)
from app.schemas.schemas import (
    ScenarioInput,
    SimulationResponse,
    JobImpactItem,
    RemainingGapItem,
    NewlyEligiblePathway,
    RequiredTrainingIntervention,
    ReadinessEstimation
)
from app.services.normalization_service import SkillNormalizationService
from app.services.job_intelligence_service import JobIntelligenceService

logger = logging.getLogger("skilltrace.career_simulator")

# Deterministic Level to Proficiency Mapping
LEVEL_TO_PROFICIENCY = {
    "weak": 2.0,
    "beginner": 2.0,
    "basic": 2.0,
    "moderate": 3.5,
    "intermediate": 3.5,
    "strong": 4.5,
    "advanced": 4.5,
    "expert": 5.0
}

PROFICIENCY_TO_LEVEL = [
    (1.5, "weak"),
    (2.5, "beginner"),
    (3.8, "moderate"),
    (4.5, "strong"),
    (5.0, "expert")
]

def proficiency_to_level_str(score: float) -> str:
    for threshold, lvl in PROFICIENCY_TO_LEVEL:
        if score <= threshold:
            return lvl
    return "strong"

# Industry standard tool & domain synonym clusters for intelligent matching
SKILL_SYNONYMS: Dict[str, List[str]] = {
    "power bi": [
        "business intelligence reporting",
        "power bi",
        "powerbi",
        "tableau visual analytics",
        "data visualization",
        "bi reporting",
        "business intelligence",
        "dax"
    ],
    "tableau": [
        "tableau visual analytics",
        "tableau",
        "business intelligence reporting",
        "data visualization"
    ],
    "sql": [
        "sql querying & data modeling",
        "sql",
        "postgresql & pgvector",
        "postgresql",
        "mysql",
        "database querying",
        "relational data modeling"
    ],
    "python": [
        "python",
        "python / fastapi",
        "python scripting",
        "fastapi",
        "django",
        "flask"
    ],
    "fastapi": [
        "python / fastapi",
        "fastapi",
        "rest apis",
        "microservices architecture"
    ],
    "react": [
        "react.js",
        "react",
        "reactjs",
        "frontend web architecture",
        "typescript"
    ],
    "docker": [
        "docker & containerization",
        "docker",
        "containerization",
        "microservices architecture",
        "kubernetes"
    ],
    "kubernetes": [
        "docker & containerization",
        "kubernetes",
        "k8s",
        "microservices architecture",
        "container orchestration"
    ],
    "aws": [
        "network & cloud security",
        "cloud infrastructure",
        "microservices architecture",
        "docker & containerization"
    ],
    "data analysis": [
        "sql querying & data modeling",
        "business intelligence reporting",
        "tableau visual analytics",
        "data storytelling & executive presentation",
        "python"
    ],
}

# Certifications and their imparted competencies
CERTIFICATION_COMPETENCIES: Dict[str, List[Tuple[str, str, float]]] = {
    "microsoft certified: power bi data analyst associate": [
        ("Business Intelligence Reporting", "expert", 4.8),
        ("SQL Querying & Data Modeling", "strong", 4.3),
        ("Data Storytelling & Executive Presentation", "strong", 4.2),
        ("Power BI", "expert", 5.0),
    ],
    "aws certified solutions architect - associate": [
        ("Network & Cloud Security", "expert", 4.7),
        ("Docker & Containerization", "strong", 4.5),
        ("Microservices Architecture", "strong", 4.5),
        ("PostgreSQL & pgvector", "moderate", 3.8),
    ],
    "meta front-end developer professional certificate": [
        ("React.js", "expert", 4.8),
        ("TypeScript", "strong", 4.5),
        ("Tailwind CSS", "strong", 4.4),
        ("Technical Communication", "strong", 4.2),
    ],
    "google data analytics professional certificate": [
        ("SQL Querying & Data Modeling", "expert", 4.6),
        ("Tableau Visual Analytics", "strong", 4.4),
        ("Python", "strong", 4.2),
        ("Data Storytelling & Executive Presentation", "strong", 4.0),
    ],
    "docker certified associate (dca)": [
        ("Docker & Containerization", "expert", 4.9),
        ("Microservices Architecture", "strong", 4.4),
    ],
    "certified kubernetes administrator (cka)": [
        ("Docker & Containerization", "expert", 5.0),
        ("Microservices Architecture", "expert", 4.7),
        ("Network & Cloud Security", "strong", 4.4),
    ],
    "comptia security+ certification": [
        ("Network & Cloud Security", "expert", 4.9),
        ("Critical Problem Solving", "strong", 4.5),
    ]
}


class CareerSimulatorService:

    @classmethod
    def get_trainee_baseline(cls, db: Session, trainee_id: str) -> Dict[str, Any]:
        """Fetches trainee's baseline profile for simulation."""
        trainee = db.query(Trainee).filter(Trainee.id == trainee_id).first()
        if not trainee:
            raise ValueError(f"Trainee with ID {trainee_id} not found.")

        trainee_skills = db.query(TraineeSkill).filter(TraineeSkill.trainee_id == trainee_id).all()
        skills_list = []
        for ts in trainee_skills:
            score = ts.proficiency_score if ts.proficiency_score is not None else (ts.score / 20.0 if ts.score else 3.0)
            skills_list.append({
                "skill_id": ts.skill_id,
                "name": ts.name,
                "level": ts.level or proficiency_to_level_str(score),
                "proficiency_score": round(float(score), 1),
                "verified": bool(ts.verified)
            })

        target_roles = []
        if trainee.career_preference and isinstance(trainee.career_preference, dict):
            target_roles = trainee.career_preference.get("target_roles", [])
        if not target_roles and trainee.current_role:
            target_roles = [trainee.current_role]

        return {
            "trainee_id": trainee.id,
            "trainee_name": trainee.full_name,
            "program": trainee.program,
            "location": trainee.location,
            "current_role": trainee.current_role,
            "target_roles": target_roles,
            "skills": skills_list,
            "certifications": trainee.certifications or []
        }

    @classmethod
    def _skills_overlap_score(cls, s_name: str, prof: float, req_clean: str) -> float:
        """
        Determines if candidate skill s_name satisfies required skill req_clean.
        Returns earned weight (0.0 to 1.0) or 0.0 if no match.
        """
        s_clean = s_name.lower().strip()
        # Direct equality or exact substring match (if >= 4 chars to prevent trivial false matches)
        if s_clean == req_clean:
            return min(1.0, max(0.4, prof / 4.0))
        if len(s_clean) >= 4 and len(req_clean) >= 4:
            if s_clean in req_clean or req_clean in s_clean:
                return min(1.0, max(0.4, prof / 4.0))

        # Check synonym clusters
        for root_key, synonyms in SKILL_SYNONYMS.items():
            if root_key in s_clean or any(syn in s_clean for syn in synonyms):
                if root_key in req_clean or any(syn in req_clean for syn in synonyms):
                    return min(1.0, max(0.4, prof / 4.0))

        # Token overlap for compound technical phrases with technical stop-word suppression
        stops = {
            "and", "for", "with", "the", "system", "systems", "operations", "level",
            "management", "power", "data", "developer", "engineer", "specialist",
            "analyst", "services", "cloud", "practice", "fundamentals", "foundations"
        }
        s_tokens = set(re.findall(r'\b[a-zA-Z0-9#+]{2,}\b', s_clean)) - stops
        r_tokens = set(re.findall(r'\b[a-zA-Z0-9#+]{2,}\b', req_clean)) - stops
        meaningful_overlap = s_tokens & r_tokens
        if meaningful_overlap:
            return min(1.0, max(0.4, (prof / 4.0) * 0.9))

        return 0.0

    @classmethod
    def calculate_skill_match_against_job(
        cls,
        skills_map: Dict[str, float], # skill_name -> proficiency_score
        job_required_skills: List[str]
    ) -> Tuple[float, List[str], List[str]]:
        """
        Calculates match score (0-100%) against a job's required skills.
        Returns: (match_score, matched_skills, missing_skills)
        """
        if not job_required_skills:
            return 80.0, [], []

        matched = []
        missing = []
        total_req = len(job_required_skills)
        earned_points = 0.0

        for req in job_required_skills:
            req_clean = req.lower().strip()
            found_weight = 0.0

            for s_name, prof in skills_map.items():
                w = cls._skills_overlap_score(s_name, prof, req_clean)
                if w > found_weight:
                    found_weight = w
                    if found_weight >= 1.0:
                        break

            if found_weight > 0.0:
                earned_points += found_weight
                matched.append(req)
            else:
                missing.append(req)

        score = round((earned_points / total_req) * 100.0, 1)
        return min(100.0, score), matched, missing

    @classmethod
    def run_simulation(cls, db: Session, scenario: ScenarioInput) -> SimulationResponse:
        """
        Executes explainable What-If Career Simulation.
        Compares CURRENT PROFILE vs SIMULATED PROFILE.
        Zero fabricated salaries or employment probabilities.
        """
        # 1. Resolve Current Profile
        current_skills: Dict[str, Dict[str, Any]] = {}
        trainee = None
        trainee_id = scenario.trainee_id
        trainee_name = None

        if trainee_id:
            trainee = db.query(Trainee).filter(Trainee.id == trainee_id).first()
            if trainee:
                trainee_name = trainee.full_name
                db_skills = db.query(TraineeSkill).filter(TraineeSkill.trainee_id == trainee_id).all()
                for ts in db_skills:
                    score = ts.proficiency_score if ts.proficiency_score is not None else 3.0
                    current_skills[ts.name.lower()] = {
                        "name": ts.name,
                        "level": ts.level or proficiency_to_level_str(score),
                        "proficiency_score": round(float(score), 1),
                        "verified": bool(ts.verified)
                    }

        # If baseline provided or overrides
        if scenario.baseline_skills:
            for bs in scenario.baseline_skills:
                b_name = bs.get("name") or bs.get("skill_name") or "Skill"
                b_level = bs.get("level", "moderate")
                b_score = bs.get("proficiency_score") or LEVEL_TO_PROFICIENCY.get(b_level.lower(), 3.5)
                current_skills[b_name.lower()] = {
                    "name": b_name,
                    "level": b_level,
                    "proficiency_score": round(float(b_score), 1),
                    "verified": bool(bs.get("verified", False))
                }

        # Fallback if profile is completely empty
        if not current_skills:
            current_skills["python"] = {"name": "Python", "level": "strong", "proficiency_score": 4.5, "verified": True}
            current_skills["sql"] = {"name": "SQL", "level": "strong", "proficiency_score": 4.5, "verified": True}
            current_skills["power bi"] = {"name": "Power BI", "level": "weak", "proficiency_score": 2.0, "verified": False}

        # 2. Check Data Sufficiency
        active_jobs = db.query(Job).filter(Job.status == "active").all()
        if len(active_jobs) < 2:
            return SimulationResponse(
                status="INSUFFICIENT_DATA",
                trainee_id=trainee_id,
                trainee_name=trainee_name,
                scenario_name=scenario.scenario_name or "What-If Simulation",
                current_profile={"skills": list(current_skills.values())},
                simulated_profile={"skills": list(current_skills.values())},
                skill_changes=[],
                newly_matched_jobs=[],
                changed_job_matches=[],
                remaining_skill_gaps=[],
                newly_eligible_pathways=[],
                required_training_interventions=[],
                estimated_readiness=ReadinessEstimation(
                    current_readiness=0.0,
                    simulated_readiness=0.0,
                    readiness_delta=0.0,
                    benchmark_basis="Insufficient job market observation sample"
                ),
                data_sufficiency={
                    "is_sufficient": False,
                    "job_count": len(active_jobs),
                    "note": "INSUFFICIENT_DATA: Less than 2 active job requirement benchmarks available in repository."
                },
                insufficient_data_reasons=["Repository lacks minimum threshold of active job postings for statistical comparison."]
            )

        # 3. Build Simulated Profile
        simulated_skills = {k: dict(v) for k, v in current_skills.items()}
        skill_changes: List[Dict[str, Any]] = []

        # Add / Upgrade requested skills
        for add_s in scenario.additional_skills:
            name_clean = add_s.name.strip()
            name_key = name_clean.lower()
            lvl = (add_s.level or "strong").lower()
            prof = add_s.proficiency_score if add_s.proficiency_score is not None else LEVEL_TO_PROFICIENCY.get(lvl, 4.5)

            prev_info = current_skills.get(name_key)
            if prev_info:
                prev_prof = prev_info["proficiency_score"]
                prev_lvl = prev_info["level"]
                new_prof = max(prev_prof, prof)
                new_lvl = proficiency_to_level_str(new_prof)
                simulated_skills[name_key] = {
                    "name": prev_info["name"],
                    "level": new_lvl,
                    "proficiency_score": round(new_prof, 1),
                    "verified": prev_info["verified"]
                }
                skill_changes.append({
                    "skill_name": prev_info["name"],
                    "previous_level": prev_lvl,
                    "simulated_level": new_lvl,
                    "previous_score": prev_prof,
                    "simulated_score": round(new_prof, 1),
                    "change_type": "UPGRADED",
                    "explanation": f"Proficiency upgraded from {prev_lvl} ({prev_prof}/5.0) to {new_lvl} ({new_prof}/5.0)."
                })
            else:
                simulated_skills[name_key] = {
                    "name": name_clean,
                    "level": lvl,
                    "proficiency_score": round(prof, 1),
                    "verified": False
                }
                skill_changes.append({
                    "skill_name": name_clean,
                    "previous_level": "none",
                    "simulated_level": lvl,
                    "previous_score": 0.0,
                    "simulated_score": round(prof, 1),
                    "change_type": "ADDED",
                    "explanation": f"Added new competency '{name_clean}' at {lvl} level ({prof}/5.0)."
                })

        # Apply Certification Competency Infusion
        if scenario.certification:
            cert_name = scenario.certification.strip()
            cert_clean = cert_name.lower()
            skill_changes.append({
                "skill_name": f"Certification: {cert_name}",
                "previous_level": "unaccredited",
                "simulated_level": "certified",
                "previous_score": 0.0,
                "simulated_score": 5.0,
                "change_type": "CERTIFICATION_ACQUIRED",
                "explanation": f"Earned external credential '{cert_name}', reinforcing domain competency and qualification standard."
            })

            # Infuse competencies imparted by this certification
            infused_comps = CERTIFICATION_COMPETENCIES.get(cert_clean, [])
            if not infused_comps:
                # Dynamic matching for known certification keywords
                for known_cert, comps in CERTIFICATION_COMPETENCIES.items():
                    if any(kw in cert_clean for kw in ["power bi", "analytics", "aws", "cloud", "front-end", "react", "security", "docker", "kubernetes"]):
                        if any(kw in known_cert for kw in cert_clean.split()):
                            infused_comps = comps
                            break

            for c_skill, c_lvl, c_score in infused_comps:
                c_key = c_skill.lower()
                prev_c = simulated_skills.get(c_key)
                if not prev_c or prev_c["proficiency_score"] < c_score:
                    simulated_skills[c_key] = {
                        "name": c_skill,
                        "level": c_lvl,
                        "proficiency_score": round(c_score, 1),
                        "verified": True
                    }

        # Apply Intervention Impact and Infusion
        if scenario.intervention_name or scenario.intervention_id:
            interv_title = scenario.intervention_name or scenario.intervention_id
            skill_changes.append({
                "skill_name": f"Intervention: {interv_title}",
                "previous_level": "pending",
                "simulated_level": "completed",
                "previous_score": 0.0,
                "simulated_score": 4.5,
                "change_type": "INTERVENTION_COMPLETED",
                "explanation": f"Targeted remediation via '{interv_title}' completed."
            })

            # Look up intervention and infuse target skills
            inv_obj = db.query(Intervention).filter(
                (Intervention.id == interv_title) |
                (Intervention.title.ilike(f"%{interv_title}%"))
            ).first()
            if inv_obj and inv_obj.target_skills:
                for ts in inv_obj.target_skills:
                    ts_key = str(ts).lower()
                    prev_ts = simulated_skills.get(ts_key)
                    if not prev_ts or prev_ts["proficiency_score"] < 4.2:
                        simulated_skills[ts_key] = {
                            "name": str(ts),
                            "level": "strong",
                            "proficiency_score": 4.2,
                            "verified": True
                        }

        # Maps for quick lookup: skill_name -> proficiency
        curr_map = {k: v["proficiency_score"] for k, v in current_skills.items()}
        sim_map = {k: v["proficiency_score"] for k, v in simulated_skills.items()}

        # 4. Compare Job Impacts
        MATCH_THRESHOLD = 65.0
        newly_matched_jobs: List[JobImpactItem] = []
        changed_job_matches: List[JobImpactItem] = []

        filter_role = (scenario.target_role or "").lower()
        filter_loc = (scenario.target_location or "").lower()

        for j in active_jobs:
            req_skills = j.required_skills or []
            if isinstance(req_skills, list) and req_skills and isinstance(req_skills[0], dict):
                req_names = [s.get("name") or s.get("skill_name") or "" for s in req_skills]
            else:
                req_names = [str(s) for s in req_skills]

            if not req_names and j.extracted_skills:
                req_names = [es.raw_text for es in j.extracted_skills]

            curr_score, curr_matched, curr_missing = cls.calculate_skill_match_against_job(curr_map, req_names)
            sim_score, sim_matched, sim_missing = cls.calculate_skill_match_against_job(sim_map, req_names)
            score_delta = round(sim_score - curr_score, 1)

            is_new = (curr_score < MATCH_THRESHOLD and sim_score >= MATCH_THRESHOLD)
            status_str = "NEWLY_MATCHED" if is_new else ("IMPROVED_MATCH" if score_delta > 0 else "UNCHANGED")

            # Explanation construction
            newly_covered = [s for s in req_names if s in sim_matched and s not in curr_matched]
            if newly_covered:
                expl = f"Match increased +{score_delta}% by covering required competency: {', '.join(newly_covered[:3])}."
                if sim_missing:
                    expl += f" Remaining missing: {', '.join(sim_missing[:2])}."
            elif score_delta > 0:
                expl = f"Match increased +{score_delta}% due to upgraded proficiency in overlapping qualifications."
            else:
                expl = "No qualification overlap change for this job vacancy."

            impact_item = JobImpactItem(
                job_id=j.id,
                title=j.title,
                employer_name=j.employer_name,
                location=j.location,
                employment_type=j.employment_type or "Full-time",
                salary_range=j.salary_range or "Market Standard",
                current_match_score=curr_score,
                simulated_match_score=sim_score,
                score_change=score_delta,
                is_newly_matched=is_new,
                status=status_str,
                explanation=expl
            )

            # Check if job matches optional filters
            matches_filter = True
            if filter_role and filter_role not in j.title.lower() and filter_role not in (j.domain or "").lower():
                matches_filter = False
            if filter_loc and filter_loc not in j.location.lower():
                matches_filter = False

            if is_new:
                newly_matched_jobs.append(impact_item)

            if score_delta > 0 or is_new or matches_filter or sim_score >= 60.0:
                changed_job_matches.append(impact_item)

        # Sort changed jobs by score_change desc then sim_score desc
        changed_job_matches.sort(key=lambda x: (x.score_change, x.simulated_match_score), reverse=True)
        newly_matched_jobs.sort(key=lambda x: (x.simulated_match_score, x.score_change), reverse=True)

        # 5. Calculate Remaining Skill Gaps (for target role or top matched job)
        remaining_gaps: List[RemainingGapItem] = []
        target_role_jobs_with_gaps = [
            j for j in changed_job_matches
            if (filter_role and filter_role in j.title.lower())
            and j.simulated_match_score < 100.0
        ]

        reference_job = target_role_jobs_with_gaps[0] if target_role_jobs_with_gaps else (
            next((j for j in newly_matched_jobs if j.simulated_match_score < 100.0), None) or
            next((j for j in changed_job_matches if j.simulated_match_score < 100.0), None) or
            (newly_matched_jobs[0] if newly_matched_jobs else (changed_job_matches[0] if changed_job_matches else None))
        )

        if reference_job:
            ref_job_rec = next((j for j in active_jobs if j.id == reference_job.job_id), None)
            if ref_job_rec:
                reqs = ref_job_rec.required_skills or []
                if isinstance(reqs, list) and reqs and isinstance(reqs[0], dict):
                    req_list = [r.get("name") or "" for r in reqs]
                else:
                    req_list = [str(r) for r in reqs]

                for r in req_list:
                    r_clean = r.strip()
                    r_key = r_clean.lower()
                    # Check overlap with simulated profile
                    overlap_w = max([cls._skills_overlap_score(s_k, prof, r_key) for s_k, prof in sim_map.items()] or [0.0])
                    if overlap_w < 0.3:
                        remaining_gaps.append(RemainingGapItem(
                            skill_name=r_clean,
                            category="hard",
                            current_level=0.0,
                            target_level=4.0,
                            gap=4.0,
                            priority="HIGH",
                            importance_label="Unfulfilled Mandatory Requirement"
                        ))
                    elif overlap_w < 0.8:
                        rem_gap = round(4.0 - (overlap_w * 4.0), 1)
                        remaining_gaps.append(RemainingGapItem(
                            skill_name=r_clean,
                            category="hard",
                            current_level=round(overlap_w * 4.0, 1),
                            target_level=4.0,
                            gap=rem_gap,
                            priority="MODERATE",
                            importance_label="Proficiency Benchmark Gap"
                        ))

        # 6. Newly Eligible Career Pathways
        pathways = db.query(CareerPath).all()
        newly_eligible_pathways: List[NewlyEligiblePathway] = []

        for p in pathways:
            milestone_titles = []
            milestone_competencies = []
            if p.milestones and isinstance(p.milestones, list):
                for m in p.milestones:
                    if isinstance(m, dict):
                        if m.get("role"):
                            milestone_titles.append(m["role"])
                        elif m.get("stage"):
                            milestone_titles.append(m["stage"])
                        for comp in m.get("competencies", []):
                            milestone_competencies.append(str(comp).lower())

            # Check overlap between track/title/competencies and current vs simulated skills
            track_keywords = set((p.track.lower() + " " + p.title.lower()).split())
            all_path_targets = track_keywords.union(milestone_competencies)

            c_hits = sum(1 for target in all_path_targets if any(
                cls._skills_overlap_score(s_name, prof, target) > 0 for s_name, prof in curr_map.items()
            ))
            s_hits = sum(1 for target in all_path_targets if any(
                cls._skills_overlap_score(s_name, prof, target) > 0 for s_name, prof in sim_map.items()
            ))

            total_targets = max(4, len(all_path_targets))
            c_readiness = round(min(100.0, max(25.0, (c_hits / total_targets) * 100.0)), 1)
            s_readiness = round(min(100.0, max(30.0, (s_hits / total_targets) * 100.0)), 1)
            p_delta = round(s_readiness - c_readiness, 1)

            is_pathway_new = (c_readiness < 65.0 and s_readiness >= 65.0)
            p_status = "NEWLY_ELIGIBLE" if is_pathway_new else ("READINESS_IMPROVED" if p_delta > 0 else "IN_PROGRESS")

            newly_eligible_pathways.append(NewlyEligiblePathway(
                pathway_id=p.id,
                title=p.title,
                track=p.track,
                current_readiness=c_readiness,
                simulated_readiness=s_readiness,
                readiness_delta=p_delta,
                status=p_status,
                unlocked_milestones=milestone_titles[:2]
            ))

        newly_eligible_pathways.sort(key=lambda x: (x.readiness_delta, x.simulated_readiness), reverse=True)

        # 7. Required Training / Interventions from Catalog
        interventions = db.query(Intervention).all()
        recommended_interventions: List[RequiredTrainingIntervention] = []

        needed_skills = [s["skill_name"].lower() for s in skill_changes] + [g.skill_name.lower() for g in remaining_gaps]

        for inv in interventions:
            inv_targets = [t.lower() for t in (inv.target_skills or [])]
            overlap = any(ts in needed_skills or any(ts in ns for ns in needed_skills) for ts in inv_targets)
            if overlap or not recommended_interventions:
                recommended_interventions.append(RequiredTrainingIntervention(
                    intervention_id=inv.id,
                    title=inv.title,
                    type=inv.type,
                    domain=inv.domain,
                    target_skills=inv.target_skills or [],
                    estimated_effort=inv.estimated_effort,
                    provider_or_platform=inv.provider_or_platform,
                    description=inv.description,
                    why_it_matters=inv.why_it_matters or f"Directly prepares trainee for {inv.domain} qualification standards."
                ))
            if len(recommended_interventions) >= 4:
                break

        # 8. Estimated Readiness Calculation (Labelled ESTIMATION)
        # Prioritize jobs aligning with target role/domain if provided
        target_role_jobs = [
            j for j in changed_job_matches
            if (filter_role and (filter_role in j.title.lower() or filter_role in (j.employer_name or '').lower()))
        ]

        eval_jobs = target_role_jobs if target_role_jobs else changed_job_matches[:5]
        if not eval_jobs and active_jobs:
            eval_jobs = changed_job_matches[:5]

        top_curr = [j.current_match_score for j in eval_jobs] if eval_jobs else [50.0]
        top_sim = [j.simulated_match_score for j in eval_jobs] if eval_jobs else [70.0]

        curr_readiness = round(sum(top_curr) / len(top_curr), 1)
        sim_readiness = round(sum(top_sim) / len(top_sim), 1)
        readiness_delta = round(sim_readiness - curr_readiness, 1)

        benchmark_note = f"Derived from requirement alignment across {len(eval_jobs)} active vacancy benchmark(s)"
        if filter_role:
            benchmark_note += f" in '{scenario.target_role}' domain"
        benchmark_note += "."

        readiness_obj = ReadinessEstimation(
            output_type="ESTIMATION",
            current_readiness=curr_readiness,
            simulated_readiness=sim_readiness,
            readiness_delta=readiness_delta,
            benchmark_basis=benchmark_note,
            disclaimer="Simulation based on available profile and job requirement data."
        )

        # 9. Build and persist simulation record
        response = SimulationResponse(
            status="SIMULATION",
            trainee_id=trainee_id,
            trainee_name=trainee_name,
            scenario_name=scenario.scenario_name or "What-If Career Simulation",
            output_label="SIMULATION",
            estimation_label="ESTIMATION",
            simulation_disclaimer="Simulation based on available profile and job requirement data.",
            guarantee_clause="Predictions are not guaranteed. No salaries, job guarantees, or employment probabilities are fabricated.",
            current_profile={
                "trainee_id": trainee_id,
                "trainee_name": trainee_name,
                "skills": list(current_skills.values()),
                "total_skills": len(current_skills),
                "target_role": scenario.target_role or (trainee.current_role if trainee else "Software Engineer")
            },
            simulated_profile={
                "skills": list(simulated_skills.values()),
                "total_skills": len(simulated_skills),
                "added_skills": [s.name for s in scenario.additional_skills],
                "certification": scenario.certification,
                "intervention": scenario.intervention_name
            },
            skill_changes=skill_changes,
            newly_matched_jobs=newly_matched_jobs,
            changed_job_matches=changed_job_matches[:12],
            remaining_skill_gaps=remaining_gaps[:6],
            newly_eligible_pathways=newly_eligible_pathways[:6],
            required_training_interventions=recommended_interventions[:4],
            estimated_readiness=readiness_obj,
            data_sufficiency={
                "is_sufficient": True,
                "active_jobs_evaluated": len(active_jobs),
                "pathways_evaluated": len(pathways),
                "note": "Sufficient observational baseline verified."
            }
        )

        try:
            rec = CareerSimulationRecord(
                id=f"SIM-{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')[:18]}",
                trainee_id=trainee_id,
                scenario_name=scenario.scenario_name or "What-If Simulation",
                input_payload=scenario.dict() if hasattr(scenario, "dict") else scenario.model_dump(),
                simulation_result=response.dict() if hasattr(response, "dict") else response.model_dump(),
                created_at=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
            )
            db.add(rec)
            db.commit()
        except Exception as e:
            logger.warning(f"Could not persist simulation record: {e}")
            db.rollback()

        return response

