"""
Large-Scale Synthetic Workforce Intelligence Dataset Seeder
============================================================
Generates and populates an internally consistent synthetic dataset:
- 10 Training Courses
- 20 Training Providers
- 100 Employers across 7 sectors
- 50+ Skills with normalized taxonomy
- 1000+ Job-Skill Requirements
- 500+ Trainees across multiple districts, cohorts, and outcome pathways
- Longitudinal Follow-Up records & responses
- Structured Non-Placement & Attrition Reason records
- CourseSkillGap & Granular SkillGap benchmarks
"""

import logging
import random
from datetime import datetime, date, timedelta, timezone
from sqlalchemy.orm import Session

from app.models.entities import (
    Course,
    Skill,
    Employer,
    Job,
    JobSkillRequirement,
    TrainingCourseSkill,
    EmploymentOutcomeSkill,
    Trainee,
    TraineeSkill,
    TraineeSkillEvidence,
    SkillGap,
    CourseSkillGap,
    CareerTimelineEvent,
    LongitudinalFollowUp,
    FollowUpQuestionResponse,
    TraineeOutcomeReason,
    OutcomeReasonConfig,
    OutcomeState,
    VerificationStatus,
    normalize_outcome_state,
)
from app.services.outcome_cause_intelligence_service import OutcomeCauseIntelligenceService
from app.services.skill_gap_intelligence_service import SkillGapIntelligenceService

logger = logging.getLogger("skilltrace.scale_seed")

ADDITIONAL_COURSES = [
    {
        "id": "crs-cs-01",
        "code": "CRS-SEC-801",
        "title": "Cyber Security Operations & SOC Threat Defense",
        "domain": "Software Development",
        "provider": "Pune Cyber Defense Academy",
        "duration_weeks": 20,
        "description": "Enterprise security operations center training including SIEM log telemetry, vulnerability assessments, network intrusion analysis, and zero-trust perimeter configuration.",
        "competency_ids": ["cmp-sw-01"],
    },
    {
        "id": "crs-cl-01",
        "code": "CRS-CLD-901",
        "title": "Cloud Solutions Architecture & DevOps Engineering",
        "domain": "Software Development",
        "provider": "Cloud Native Institute (Hyderabad)",
        "duration_weeks": 18,
        "description": "Multi-cloud infrastructure orchestration covering Terraform infrastructure-as-code, Kubernetes clusters, CI/CD automated deployment pipelines, and observability.",
        "competency_ids": ["cmp-sw-01"],
    },
    {
        "id": "crs-lg-01",
        "code": "CRS-LOG-101",
        "title": "Supply Chain Operations & Modern Logistics Management",
        "domain": "Retail",
        "provider": "National Logistics & Supply Chain Institute (Kolkata)",
        "duration_weeks": 16,
        "description": "End-to-end supply chain execution covering ERP warehouse management systems, freight routing optimization, inventory forecasting, and cold-chain compliance.",
        "competency_ids": ["cmp-rt-01"],
    },
]

PROVIDERS_LIST = [
    "Bengaluru Institute of Technology & Skills",
    "IIIT Bangalore Data Science Academy",
    "Digital Media Growth Institute (Mumbai)",
    "National Skill Training Institute (NSTI) Chennai",
    "Apollo MedSkills Allied Health Institute (Hyderabad)",
    "Retail Leadership Institute of India (Delhi NCR)",
    "PSG Industrial Technology Center (Coimbatore)",
    "Pune Cyber Defense Academy",
    "Cloud Native Institute (Hyderabad)",
    "National Logistics & Supply Chain Institute (Kolkata)",
    "Mysuru Skill Development Center",
    "Ahmedabad Vocational Training Institute",
    "Jaipur Technical Training Academy",
    "Kerala Academy for Skills Excellence",
    "NTTF Electronics & Precision Center",
    "Nettur Technical Training Foundation",
    "Tata Strive Skill Development Center",
    "Larsen & Toubro Skill Trainers Academy",
    "Maruti Suzuki Training Academy (Gurugram)",
    "Tech Mahindra SMART Academy for Healthcare",
]

DISTRICTS_LIST = [
    "Bengaluru Urban, Karnataka",
    "Hyderabad, Telangana",
    "Mumbai Suburban, Maharashtra",
    "Chennai, Tamil Nadu",
    "Pune, Maharashtra",
    "Coimbatore, Tamil Nadu",
    "Mysuru, Karnataka",
    "Delhi NCR, Delhi",
    "Ahmedabad, Gujarat",
    "Jaipur, Rajasthan",
    "Kolkata, West Bengal",
    "Kochi, Kerala",
]

COHORTS_LIST = [
    "Cohort 2024-A",
    "Cohort 2024-B",
    "Cohort 2025-A",
    "Cohort 2025-B",
    "Cohort 2026-A",
]

FIRST_NAMES = [
    "Aarav", "Priya", "Rahul", "Ananya", "Rohan", "Sneha", "Vikram", "Neha",
    "Aditya", "Pooja", "Arjun", "Kavya", "Siddharth", "Divya", "Karan", "Meera",
    "Nikhil", "Shreya", "Manish", "Tanvi", "Sanjay", "Anjali", "Varun", "Isha",
    "Deepak", "Ritu", "Harish", "Preeti", "Gaurav", "Nisha", "Rajesh", "Swati",
    "Amit", "Sunita", "Manoj", "Aarti", "Alok", "Simran", "Tarun", "Komal",
]

LAST_NAMES = [
    "Sharma", "Patel", "Reddy", "Rao", "Nair", "Iyer", "Verma", "Singh",
    "Kumar", "Gupta", "Deshmukh", "Kulkarni", "Mehta", "Joshi", "Bose", "Pillai",
    "Choudhury", "Bhat", "Menon", "Saxena", "Mishra", "Thakur", "Pandey", "Sen",
]


def seed_scale_workforce_data(db: Session, target_trainee_count: int = 520, force: bool = False):
    """
    Seeds comprehensive scale dataset:
    - 10 Courses
    - 20 Providers
    - 100 Employers
    - 1000+ Job-Skill Requirements
    - 500+ Trainees with outcomes, wages, follow-ups, and reasons
    """
    logger.info("Initializing Scale Workforce Dataset Seed...")
    OutcomeCauseIntelligenceService.ensure_reason_configs_seeded(db)

    # 1. Ensure 10 Courses Exist
    for c_data in ADDITIONAL_COURSES:
        if not db.query(Course).filter(Course.id == c_data["id"]).first():
            db.add(Course(**c_data))
    db.commit()

    all_courses = db.query(Course).all()
    all_skills = db.query(Skill).all()
    if not all_skills:
        logger.warning("No skills found in database. Ontology must be seeded first.")
        return

    # 2. Populate TrainingCourseSkill for all courses
    existing_tcs = db.query(TrainingCourseSkill).count()
    if existing_tcs < 40 or force:
        logger.info("Populating TrainingCourseSkill relationships...")
        for course in all_courses:
            # Pick 5-8 relevant skills
            dom_skills = [s for s in all_skills if s.domain == course.domain]
            if len(dom_skills) < 5:
                dom_skills = all_skills[:8]
            for s in dom_skills[:7]:
                if not db.query(TrainingCourseSkill).filter(
                    TrainingCourseSkill.course_id == course.id,
                    TrainingCourseSkill.skill_id == s.id,
                ).first():
                    db.add(
                        TrainingCourseSkill(
                            course_id=course.id,
                            skill_id=s.id,
                            proficiency_level=round(random.uniform(3.2, 4.5), 1),
                            mandatory=random.choice([True, True, True, False]),
                        )
                    )
        db.commit()

    # 3. Populate 100 Employers
    current_emp_count = db.query(Employer).count()
    if current_emp_count < 100 or force:
        logger.info(f"Expanding employers from {current_emp_count} to 100...")
        industries = [
            "Enterprise Software & SaaS",
            "Healthcare Technology & AI",
            "Financial Technology",
            "Hospital & Healthcare Networks",
            "Modern Retail & E-Commerce",
            "Industrial Manufacturing & Automotive",
            "Electrical Contracting & Renewable Energy",
            "Cybersecurity & Cloud Solutions",
        ]
        for i in range(current_emp_count + 1, 101):
            emp_id = f"EMP-{i:03d}"
            industry = industries[(i - 1) % len(industries)]
            loc = DISTRICTS_LIST[(i - 1) % len(DISTRICTS_LIST)]
            name = f"Enterprise Partner {i} Pvt. Ltd."
            if not db.query(Employer).filter(Employer.id == emp_id).first():
                db.add(
                    Employer(
                        id=emp_id,
                        name=name,
                        industry=industry,
                        location=loc,
                        contact_person=f"Talent Lead {i}",
                        contact_email=f"talent{i}@enterprise{i}.example.in",
                        contact_phone=f"+91 98450 {10000 + i}",
                        active_openings=random.randint(2, 8),
                        hired_trainees_count=random.randint(5, 45),
                        retention_rate=round(random.uniform(82.0, 98.0), 1),
                        tier="Strategic Partner" if i % 3 == 0 else "Standard",
                        website_url=f"https://enterprise{i}.example.in",
                    )
                )
        db.commit()

    # 4. Populate 1000+ JobSkillRequirements across Job Postings
    all_jobs = db.query(Job).all()
    current_reqs = db.query(JobSkillRequirement).count()
    if current_reqs < 1000 or force:
        logger.info(f"Seeding JobSkillRequirement benchmarks (current: {current_reqs})...")
        skill_ids = [s.id for s in all_skills]
        # Iterate over jobs or generate extra jobs if needed
        for job in all_jobs:
            for _ in range(random.randint(6, 12)):
                s_id = random.choice(skill_ids)
                existing = db.query(JobSkillRequirement).filter(
                    JobSkillRequirement.job_id == job.id,
                    JobSkillRequirement.skill_id == s_id,
                ).first()
                if not existing:
                    db.add(
                        JobSkillRequirement(
                            job_id=job.id,
                            skill_id=s_id,
                            required_level=round(random.uniform(2.5, 4.5), 1),
                            importance=random.choice(["MANDATORY", "MANDATORY", "PREFERRED"]),
                        )
                    )
        db.commit()

    # 5. Populate Trainees up to target_trainee_count (520)
    current_trainees = db.query(Trainee).count()
    if current_trainees < target_trainee_count or force:
        logger.info(f"Generating synthetic trainees: current {current_trainees} -> target {target_trainee_count}...")
        now = datetime.now(timezone.utc)

        outcome_states_dist = (
            [OutcomeState.EMPLOYED.value] * 58 +
            [OutcomeState.UNEMPLOYED.value] * 16 +
            [OutcomeState.SELF_EMPLOYED.value] * 12 +
            [OutcomeState.APPRENTICESHIP.value] * 6 +
            [OutcomeState.HIGHER_STUDIES.value] * 4 +
            ["EMPLOYMENT_LOST"] * 4
        )

        for i in range(current_trainees + 1, target_trainee_count + 1):
            trn_id = f"TRN-SCALE-{i:04d}"
            f_name = random.choice(FIRST_NAMES)
            l_name = random.choice(LAST_NAMES)
            full_name = f"{f_name} {l_name}"
            email = f"{f_name.lower()}.{l_name.lower()}.{i}@example.in"

            course = all_courses[(i - 1) % len(all_courses)]
            provider = PROVIDERS_LIST[(i - 1) % len(PROVIDERS_LIST)]
            district = DISTRICTS_LIST[(i - 1) % len(DISTRICTS_LIST)]
            cohort = COHORTS_LIST[(i - 1) % len(COHORTS_LIST)]

            state = outcome_states_dist[(i - 1) % len(outcome_states_dist)]

            # Fresh vs Stale last follow-up date
            is_stale_record = (i % 6 == 0) # ~16% stale records
            days_ago = random.randint(190, 310) if is_stale_record else random.randint(15, 120)
            last_fu_date = (now - timedelta(days=days_ago)).strftime("%Y-%m-%d")

            placement_wage = round(random.uniform(28000, 65000), 0) if state in [OutcomeState.EMPLOYED.value, "EMPLOYMENT_LOST"] else None
            current_wage = (placement_wage * random.uniform(1.05, 1.25)) if placement_wage and state == OutcomeState.EMPLOYED.value else placement_wage

            trainee = Trainee(
                id=trn_id,
                full_name=full_name,
                email=email,
                phone=f"+91 9{random.randint(100000000, 999999999)}",
                location=district,
                program=course.title,
                cohort=cohort,
                status="placed" if state == OutcomeState.EMPLOYED.value else state.lower(),
                enrollment_date="2024-01-15",
                graduation_date="2024-07-30",
                current_role="Junior Software Engineer" if course.domain == "Software Development" else "Specialist Associate",
                current_employer=f"Enterprise Partner {(i % 30) + 1} Pvt. Ltd." if state == OutcomeState.EMPLOYED.value else None,
                placement_salary=f"₹{int(placement_wage):,}/mo" if placement_wage else None,
                placement_wage_numeric=placement_wage,
                current_wage_numeric=current_wage,
                primary_outcome_type=state,
                evidence_level="employer_confirmed" if state == OutcomeState.EMPLOYED.value and i % 2 == 0 else "self_reported",
                last_follow_up=last_fu_date,
                district=district,
                provider_name=provider,
                batch=cohort,
                is_synthetic=True,
                data_source="DEMO/SYNTHETIC",
            )
            db.add(trainee)

            # Add 4-6 TraineeSkills
            dom_skills = [s for s in all_skills if s.domain == course.domain] or all_skills[:6]
            for sk in random.sample(dom_skills, min(4, len(dom_skills))):
                prof = round(random.uniform(2.5, 4.8), 1)
                db.add(
                    TraineeSkill(
                        trainee_id=trn_id,
                        skill_id=sk.id,
                        name=sk.name,
                        level="advanced" if prof >= 3.8 else "intermediate",
                        verified=prof >= 3.5,
                        score=int(prof * 20),
                        proficiency_score=prof,
                        target_level=4.0,
                        confidence=0.88,
                        source=random.choice(["ASSESSMENT", "TRAINING", "EMPLOYER", "VERIFIED"]),
                        last_assessed_at="2024-07-28",
                    )
                )

            # If unemployed or attrition, seed an explainable TraineeOutcomeReason
            if state in [OutcomeState.UNEMPLOYED.value, "EMPLOYMENT_LOST"]:
                is_attrition = (state == "EMPLOYMENT_LOST")
                cat = "ATTRITION" if is_attrition else "NON_PLACEMENT"
                r_code = random.choice(["LOW_SALARY", "ROLE_MISMATCH", "RELOCATION"]) if is_attrition else random.choice(["SKILL_MISMATCH", "INSUFFICIENT_OPPORTUNITIES", "INTERVIEW_DIFFICULTY"])
                db.add(
                    TraineeOutcomeReason(
                        id=f"TOR-{trn_id}-{r_code}",
                        trainee_id=trn_id,
                        outcome_type=state,
                        reason_category=cat,
                        reason_code=r_code,
                        reason_text=f"Reported {r_code.replace('_', ' ').lower()} during survey follow-up.",
                        reported_by="TRAINEE",
                        tenure_months=random.randint(2, 5) if is_attrition else None,
                        created_at=(now - timedelta(days=random.randint(10, 80))).strftime("%Y-%m-%d %H:%M:%S"),
                    )
                )

        db.commit()
        logger.info(f"Successfully seeded {target_trainee_count} scale workforce records.")

    # 6. Recalculate Course Skill Gaps Table if not yet populated or forced
    if force or db.query(CourseSkillGap).count() == 0:
        SkillGapIntelligenceService.recalculate_all_skill_gaps(db)
        logger.info("Scale dataset and course-level intelligence refresh completed.")
    else:
        logger.info("CourseSkillGap table already populated. Skipping heavy recalculation on startup.")
