import logging
from sqlalchemy.orm import Session
from app.models.entities import (
    User,
    TraineeProfile,
    CoachProfile,
    EmployerProfile,
    Trainee,
    Skill,
    TraineeSkill,
    Employer,
    Job,
    FollowUp,
    SkillGap,
    CareerPath,
    Course,
    Competency,
    Occupation,
    SkillAlias,
    JobExtractedSkill,
    TraineeSkillEvidence,
    CareerTimelineEvent,
    LongitudinalFollowUp,
    Company,
    TrainingInstitute,
    Enrollment,
    JobApplication,
    OrganizationAuditLog,
    EmployerFeedbackVerification,
    DigitalTwinState,
    OutcomeState,
    VerificationStatus,
    TimelineStage,
    calculate_trainee_data_quality,
    calculate_outcome_confidence,
    normalize_outcome_state,
    normalize_verification_status
)
from app.core.security import get_password_hash
from app.core.ontology_data import (
    COURSES_DATA,
    COMPETENCIES_DATA,
    SKILLS_DATA,
    OCCUPATIONS_DATA,
)
from app.core.job_dataset import SYNTHETIC_JOBS_DATA
from app.services.job_intelligence_service import JobIntelligenceService
from app.services.skill_scoring_service import SkillScoringEngine

logger = logging.getLogger("skilltrace.seed")


def seed_competency_ontology(db: Session, force_reseed: bool = False):
    """Seeds Course -> Competency -> Skill -> Occupation ontology across 7 domains."""
    # Always ensure soft skills are present in the skills table
    from app.core.soft_skill_rubrics import SOFT_SKILL_SCENARIOS
    for cat_name, sc_data in SOFT_SKILL_SCENARIOS.items():
        s_id = sc_data["skill_id"]
        existing = db.query(Skill).filter(Skill.id == s_id).first()
        if not existing:
            s_name = sc_data["name"]
            if s_id == "sk-comm-01":
                s_name = "Workplace Technical Communication"
            elif db.query(Skill).filter(Skill.name == s_name).first():
                s_name = f"{s_name} (Cross-Functional)"
            db.add(Skill(
                id=s_id,
                code=s_id.upper(),
                name=s_name,
                canonical_name=sc_data.get("canonical_name", sc_data["name"]),
                category="soft",
                domain="Cross-Functional Workplace Competencies",
                description=sc_data.get("description", ""),
                status="ACTIVE",
                demand_score=85,
                growth_trend="+15% YoY",
                aliases=[sc_data["name"].lower(), cat_name.lower()]
            ))
    db.commit()

    if not force_reseed and db.query(Course).first():
        logger.info("Competency ontology already seeded. Skipping.")
        return

    logger.info("Seeding Competency Intelligence ontology (Courses, Competencies, Skills, Occupations, Aliases)...")

    # 1. Seed Courses
    for c_data in COURSES_DATA:
        existing = db.query(Course).filter(Course.id == c_data["id"]).first()
        if existing:
            for k, v in c_data.items():
                setattr(existing, k, v)
        else:
            db.add(Course(**c_data))
    db.commit()

    # 2. Seed Competencies
    for comp_data in COMPETENCIES_DATA:
        existing = db.query(Competency).filter(Competency.id == comp_data["id"]).first()
        if existing:
            for k, v in comp_data.items():
                setattr(existing, k, v)
        else:
            db.add(Competency(**comp_data))
    db.commit()

    # 3. Seed Skills (with 0-5 levels, category, aliases)
    for s_data in SKILLS_DATA:
        existing = db.query(Skill).filter(Skill.id == s_data["id"]).first()
        if existing:
            for k, v in s_data.items():
                setattr(existing, k, v)
        else:
            db.add(Skill(**s_data))
    db.commit()

    # 4. Seed Occupations
    for occ_data in OCCUPATIONS_DATA:
        existing = db.query(Occupation).filter(Occupation.id == occ_data["id"]).first()
        if existing:
            for k, v in occ_data.items():
                setattr(existing, k, v)
        else:
            db.add(Occupation(**occ_data))
    db.commit()

    # 5. Seed Skill Aliases for rapid canonical normalization
    db.query(SkillAlias).delete()
    seen_aliases = set()
    for s_data in SKILLS_DATA:
        canonical_id = s_data["id"]
        canonical_name = s_data["name"]
        alias_set = set()
        alias_set.add(s_data["name"].strip().lower())
        if s_data.get("canonical_name"):
            alias_set.add(s_data["canonical_name"].strip().lower())
        for al in s_data.get("aliases", []):
            alias_set.add(al.strip().lower())

        if s_data["name"] == "Python":
            alias_set.update(["python programming", "python development", "python", "py", "python 3", "cpython", "python scripting"])

        for clean_al in alias_set:
            if clean_al and clean_al not in seen_aliases:
                seen_aliases.add(clean_al)
                db.add(SkillAlias(
                    alias=clean_al,
                    canonical_skill_id=canonical_id,
                    canonical_name=canonical_name
                ))
    db.commit()
    logger.info("Competency Intelligence ontology successfully seeded.")

def seed_employers_dataset(db: Session, force_reseed: bool = False):
    """Seeds primary workforce partner employers (EMP-01 through EMP-04) if not already present."""
    if force_reseed:
        db.query(Employer).delete()
        db.commit()
    elif db.query(Employer).first():
        return

    employers_data = [
        Employer(
            id="EMP-01",
            name="Apex Cloud Technologies India Pvt. Ltd.",
            industry="Enterprise Software & SaaS",
            location="Bengaluru, KA",
            contact_person="Sunita Rao (VP of Talent)",
            contact_email="sunita.rao@apexcloud.co.in",
            contact_phone="+91 80 4123 0144",
            active_openings=5,
            hired_trainees_count=38,
            retention_rate=94.7,
            tier="Strategic Partner",
            website_url="https://apexcloud.example.in",
        ),
        Employer(
            id="EMP-02",
            name="Meridian MedTech India Pvt. Ltd.",
            industry="Healthcare Technology & AI",
            location="Hyderabad, TS",
            contact_person="Vikram Reddy (Engineering Manager)",
            contact_email="v.reddy@meridianmedtech.co.in",
            contact_phone="+91 40 4567 0189",
            active_openings=4,
            hired_trainees_count=22,
            retention_rate=90.9,
            tier="Strategic Partner",
            website_url="https://meridianmedtech.example.in",
        ),
        Employer(
            id="EMP-03",
            name="OmniTrade FinTech Solutions India",
            industry="Financial Technology",
            location="Mumbai, MH",
            contact_person="Pooja Singhania (Head of Recruiting)",
            contact_email="p.singhania@omnitrade.co.in",
            contact_phone="+91 22 2890 0177",
            active_openings=2,
            hired_trainees_count=17,
            retention_rate=88.2,
            tier="Standard",
            website_url="https://omnitrade.example.in",
        ),
        Employer(
            id="EMP-04",
            name="Vanguard Healthcare Networks India",
            industry="Hospital & Healthcare Networks",
            location="Chennai, TN",
            contact_person="Dr. Mohanarangam Pillai (Operations Director)",
            contact_email="mpillai@vanguardhealth.co.in",
            contact_phone="+91 44 2450 0129",
            active_openings=6,
            hired_trainees_count=45,
            retention_rate=96.0,
            tier="Strategic Partner",
            website_url="https://vanguardhealth.example.in",
        ),
    ]
    for emp in employers_data:
        if not db.query(Employer).filter(Employer.id == emp.id).first():
            db.add(emp)
    db.commit()
    logger.info("Employers dataset successfully seeded.")

def seed_jobs_dataset(db: Session, force_reseed: bool = False):
    """Seeds 35 synthetic job postings with AI skill extraction, normalization, and occupation mappings."""
    # Ensure employers exist first to prevent foreign key violations
    seed_employers_dataset(db, force_reseed)

    if force_reseed:
        logger.info("Force reseed enabled for jobs dataset. Clearing existing jobs...")
        db.query(JobExtractedSkill).delete()
        db.query(Job).delete()
        db.commit()
    else:
        current_job_count = db.query(Job).count()
        if current_job_count >= 30:
            logger.info(f"Jobs dataset already seeded ({current_job_count} jobs). Skipping.")
            return {"inserted": 0, "updated": 0, "failed": 0, "skipped": current_job_count}

    logger.info("Seeding 35 AI-analyzed synthetic job descriptions across 7 domains...")
    inserted_count = 0
    updated_count = 0
    failed_count = 0
    for j_data in SYNTHETIC_JOBS_DATA:
        try:
            with db.begin_nested():
                job_id = j_data.get("id")
                is_update = bool(job_id and db.query(Job).filter(Job.id == job_id).first())
                JobIntelligenceService.process_and_save_job(db, j_data, commit=False)
                if is_update:
                    updated_count += 1
                else:
                    inserted_count += 1
        except Exception as e:
            failed_count += 1
            logger.error(f"Error analyzing and saving job {j_data.get('id')}: {e}")

    db.commit()
    if failed_count > 0:
        logger.warning(
            f"Jobs dataset seed completed with issues: "
            f"{inserted_count} inserted, {updated_count} updated, {failed_count} failed."
        )
    else:
        logger.info(
            f"Successfully seeded synthetic job descriptions: "
            f"{inserted_count} inserted, {updated_count} updated."
        )
    return {"inserted": inserted_count, "updated": updated_count, "failed": failed_count}

def seed_organizations_base(db: Session, force_reseed: bool = False):
    """
    Seeds multi-tenant Company and TrainingInstitute records,
    and maps existing courses to training institutes.
    """
    if force_reseed:
        db.query(TrainingInstitute).delete()
        db.query(Company).delete()
        db.commit()

    # 1. Seed Companies
    if not db.query(Company).first():
        companies = [
            Company(
                id="CMP-01",
                legal_name="Apex Cloud Technologies India Pvt. Ltd.",
                display_name="Apex Cloud Technologies",
                industry="Enterprise Software & SaaS",
                description="Global cloud infrastructure, SaaS engineering, and enterprise platform development.",
                location="Bengaluru, KA",
                website="https://apexcloud.example.in",
                contact_email="recruiter@apexcloud.io",
                status="active",
                created_at="2024-01-01T09:00:00"
            ),
            Company(
                id="CMP-02",
                legal_name="Meridian MedTech India Pvt. Ltd.",
                display_name="Meridian MedTech",
                industry="Healthcare Technology & AI",
                description="Healthcare devices, clinical intelligence software, and healthcare analytics.",
                location="Hyderabad, TS",
                website="https://meridianmedtech.example.in",
                contact_email="recruiter@meridianmedtech.co.in",
                status="active",
                created_at="2024-01-01T09:00:00"
            ),
            Company(
                id="CMP-03",
                legal_name="OmniTrade FinTech Solutions India",
                display_name="OmniTrade FinTech",
                industry="Financial Technology",
                description="Digital payments, ledger security, and financial transaction processing.",
                location="Mumbai, MH",
                website="https://omnitrade.example.in",
                contact_email="careers@omnitrade.co.in",
                status="active",
                created_at="2024-01-01T09:00:00"
            ),
            Company(
                id="CMP-04",
                legal_name="Vanguard Healthcare Networks India",
                display_name="Vanguard Healthcare",
                industry="Hospital & Healthcare Networks",
                description="Integrated hospital networks, clinical operations, and health worker deployment.",
                location="Chennai, TN",
                website="https://vanguardhealth.example.in",
                contact_email="careers@vanguardhealth.co.in",
                status="active",
                created_at="2024-01-01T09:00:00"
            )
        ]
        db.add_all(companies)
        db.commit()
        logger.info("Successfully seeded companies dataset.")

    # 2. Seed Training Institutes
    if not db.query(TrainingInstitute).first():
        institutes = [
            TrainingInstitute(
                id="INST-01",
                name="National Institute of Cloud & AI",
                description="Premier government and ecosystem training center for cloud, data & artificial intelligence.",
                location="Bengaluru, KA",
                website="https://nica.skilltrace.gov.in",
                contact_email="director@nica.skilltrace.gov.in",
                status="active",
                created_at="2024-01-01T09:00:00"
            ),
            TrainingInstitute(
                id="INST-02",
                name="Meridian Health & Life Sciences Institute",
                description="Accredited workforce institute for digital healthcare systems, informatics & clinical data.",
                location="Hyderabad, TS",
                website="https://mhls.skilltrace.org",
                contact_email="admissions@mhls.skilltrace.org",
                status="active",
                created_at="2024-01-01T09:00:00"
            )
        ]
        db.add_all(institutes)
        db.commit()
        logger.info("Successfully seeded training institutes dataset.")

    # 3. Associate Courses with Training Institutes
    courses = db.query(Course).all()
    for c in courses:
        if not c.training_institute_id:
            if "Health" in (c.domain or "") or "Health" in (c.title or ""):
                c.training_institute_id = "INST-02"
            else:
                c.training_institute_id = "INST-01"
            c.status = "active"
            c.mode = "Hybrid"
            c.capacity = 35
    db.commit()

def associate_jobs_with_companies(db: Session):
    """Associates existing jobs with their parent company organizations."""
    jobs = db.query(Job).all()
    updated = 0
    for j in jobs:
        if not j.company_id:
            if j.employer_id == "EMP-01" or (j.employer_name and "Apex" in j.employer_name):
                j.company_id = "CMP-01"
            elif j.employer_id == "EMP-02" or (j.employer_name and "Meridian" in j.employer_name):
                j.company_id = "CMP-02"
            elif j.employer_id == "EMP-03" or (j.employer_name and "OmniTrade" in j.employer_name):
                j.company_id = "CMP-03"
            elif j.employer_id == "EMP-04" or (j.employer_name and "Vanguard" in j.employer_name):
                j.company_id = "CMP-04"
            else:
                j.company_id = "CMP-01"
            updated += 1
    if updated:
        db.commit()
        logger.info(f"Associated {updated} jobs with company organizations.")

def seed_enrollments_and_applications(db: Session, force_reseed: bool = False):
    """
    Seeds Enrollments and JobApplications with pre-seeding validation.
    Verifies that parent Trainee, Course, TrainingInstitute, Job, and Company records exist
    before insertion, preventing foreign-key violations.
    """
    if force_reseed:
        db.query(JobApplication).delete()
        db.query(Enrollment).delete()
        db.commit()

    # 1. Seed Enrollments
    target_enrollments = [
        {
            "id": "ENR-001",
            "training_institute_id": "INST-01",
            "course_id": "crs-sw-01",
            "trainee_id": "TRN-2024-001",
            "status": "enrolled",
            "enrolled_at": "2024-01-10T10:00:00",
            "progress_percent": 85
        },
        {
            "id": "ENR-002",
            "training_institute_id": "INST-01",
            "course_id": "crs-sw-01",
            "trainee_id": "TRN-2024-002",
            "status": "enrolled",
            "enrolled_at": "2024-01-12T10:00:00",
            "progress_percent": 70
        },
        {
            "id": "ENR-003",
            "training_institute_id": "INST-02",
            "course_id": "crs-hc-01",
            "trainee_id": "TRN-2024-004",
            "status": "enrolled",
            "enrolled_at": "2024-01-15T10:00:00",
            "progress_percent": 60
        }
    ]

    enr_inserted = 0
    enr_updated = 0
    enr_skipped = 0
    enr_failed = 0

    for enr_data in target_enrollments:
        missing_parents = []
        if not db.query(Trainee).filter(Trainee.id == enr_data["trainee_id"]).first():
            missing_parents.append(f"Trainee({enr_data['trainee_id']})")
        if not db.query(Course).filter(Course.id == enr_data["course_id"]).first():
            missing_parents.append(f"Course({enr_data['course_id']})")
        if not db.query(TrainingInstitute).filter(TrainingInstitute.id == enr_data["training_institute_id"]).first():
            missing_parents.append(f"TrainingInstitute({enr_data['training_institute_id']})")

        if missing_parents:
            logger.error(
                f"Pre-seeding validation failed for Enrollment '{enr_data['id']}': "
                f"Missing parent records: {', '.join(missing_parents)}. Skipping insertion."
            )
            enr_skipped += 1
            continue

        try:
            with db.begin_nested():
                existing = db.query(Enrollment).filter(Enrollment.id == enr_data["id"]).first()
                if existing:
                    for k, v in enr_data.items():
                        setattr(existing, k, v)
                    enr_updated += 1
                else:
                    db.add(Enrollment(**enr_data))
                    enr_inserted += 1
        except Exception as e:
            enr_failed += 1
            logger.error(f"Error persisting enrollment {enr_data['id']}: {e}")

    db.commit()
    logger.info(
        f"Enrollment seeding completed: {enr_inserted} inserted, {enr_updated} updated, "
        f"{enr_skipped} skipped, {enr_failed} failed."
    )

    # 2. Seed Job Applications
    target_apps = [
        {
            "id": "APP-001",
            "job_id": None,
            "company_id": "CMP-01",
            "trainee_id": "TRN-2024-001",
            "status": "interviewing",
            "applied_at": "2024-03-01T11:00:00",
            "cover_note": "High alignment with cloud data engineering stack.",
            "match_score": 0.92
        }
    ]

    app_inserted = 0
    app_updated = 0
    app_skipped = 0
    app_failed = 0

    first_job = db.query(Job).filter(Job.company_id == "CMP-01").first() or db.query(Job).first()

    for app_data in target_apps:
        job_id = app_data["job_id"] or (first_job.id if first_job else None)
        if not job_id:
            logger.warning(f"No job found for JobApplication '{app_data['id']}'. Skipping.")
            app_skipped += 1
            continue

        missing_parents = []
        if not db.query(Trainee).filter(Trainee.id == app_data["trainee_id"]).first():
            missing_parents.append(f"Trainee({app_data['trainee_id']})")
        if not db.query(Job).filter(Job.id == job_id).first():
            missing_parents.append(f"Job({job_id})")
        if not db.query(Company).filter(Company.id == app_data["company_id"]).first():
            missing_parents.append(f"Company({app_data['company_id']})")

        if missing_parents:
            logger.error(
                f"Pre-seeding validation failed for JobApplication '{app_data['id']}': "
                f"Missing parent records: {', '.join(missing_parents)}. Skipping insertion."
            )
            app_skipped += 1
            continue

        try:
            with db.begin_nested():
                existing = db.query(JobApplication).filter(JobApplication.id == app_data["id"]).first()
                if existing:
                    existing.job_id = job_id
                    existing.company_id = app_data["company_id"]
                    existing.trainee_id = app_data["trainee_id"]
                    existing.status = app_data["status"]
                    existing.applied_at = app_data["applied_at"]
                    existing.cover_note = app_data["cover_note"]
                    existing.match_score = app_data["match_score"]
                    app_updated += 1
                else:
                    db.add(JobApplication(
                        id=app_data["id"],
                        job_id=job_id,
                        company_id=app_data["company_id"],
                        trainee_id=app_data["trainee_id"],
                        status=app_data["status"],
                        applied_at=app_data["applied_at"],
                        cover_note=app_data["cover_note"],
                        match_score=app_data["match_score"]
                    ))
                    app_inserted += 1
        except Exception as e:
            app_failed += 1
            logger.error(f"Error persisting job application {app_data['id']}: {e}")

    db.commit()
    logger.info(
        f"Job application seeding completed: {app_inserted} inserted, {app_updated} updated, "
        f"{app_skipped} skipped, {app_failed} failed."
    )
    return {
        "enrollments": {"inserted": enr_inserted, "updated": enr_updated, "skipped": enr_skipped, "failed": enr_failed},
        "applications": {"inserted": app_inserted, "updated": app_updated, "skipped": app_skipped, "failed": app_failed}
    }

def seed_organizations_dataset(db: Session, force_reseed: bool = False):
    """
    Seeds multi-tenant Company, TrainingInstitute, Enrollment, and JobApplication records.
    Ensures courses are mapped to training institutes and jobs are mapped to companies.
    """
    seed_organizations_base(db, force_reseed)
    associate_jobs_with_companies(db)
    seed_enrollments_and_applications(db, force_reseed)

def seed_database(db: Session, force_reseed: bool = False):
    # 1. Always ensure ontology is seeded
    seed_competency_ontology(db, force_reseed)

    # 2. Always ensure employers are seeded
    seed_employers_dataset(db, force_reseed)

    # 3. Always ensure multi-tenant organizations base (Companies & Institutes) are seeded
    seed_organizations_base(db, force_reseed)

    if force_reseed:
        logger.info("Force reseed enabled. Clearing old seed records in dependency order...")
        db.query(JobApplication).delete()
        db.query(Enrollment).delete()
        db.query(DigitalTwinState).delete()
        db.query(CareerTimelineEvent).delete()
        db.query(LongitudinalFollowUp).delete()
        db.query(EmployerFeedbackVerification).delete()
        db.query(TraineeSkillEvidence).delete()
        db.query(TraineeSkill).delete()
        db.query(FollowUp).delete()
        db.query(SkillGap).delete()
        db.query(CareerPath).delete()
        db.query(Trainee).delete()
        db.query(JobExtractedSkill).delete()
        db.query(Job).delete()
    logger.info("Verifying and seeding Trainee Outcome Passport workforce dataset...")

    # 4. Comprehensive Synthetic Trainees Representing All 6 Outcome Pathways:
    # 1) Employment, 2) Self-Employment, 3) Freelancing, 4) Apprenticeship, 5) Entrepreneurship, 6) Further Education
    trainees_data = [
        # --- 1. EMPLOYMENT ---
        Trainee(
            id="TRN-2024-001",
            full_name="Priya Sharma",
            email="priya.sharma@example.com",
            phone="+91 98450 23489",
            avatar_url="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
            location="Bengaluru, KA",
            bio="Passionate software engineer transitioning from hospitality management to front-end enterprise engineering. Strong advocate for accessible design systems, responsive micro-frontends, and type-safe architectures.",
            program="Full-Stack Software Engineering",
            cohort="Cohort 2024-B",
            status="placed",
            primary_outcome_type="employment",
            enrollment_date="2024-01-15",
            graduation_date="2024-06-30",
            training_details={
                "provider_name": "Bengaluru Institute of Technology & Advanced Skills",
                "course_title": "Full-Stack Enterprise React & Cloud Web Services",
                "accreditation": "Accredited by National Skill Development Corporation (NSDC)",
                "instructor_name": "K. R. Narayanan, Lead Technical Instructor",
                "modality": "Hybrid (Bengaluru Electronic City Campus + Online Synchronous)",
                "attendance_rate": "98.4%",
                "hours_completed": 720,
            },
            current_role="Junior Frontend Engineer",
            current_employer="Apex Cloud Technologies India Pvt. Ltd.",
            placement_date="2024-07-22",
            placement_salary="₹8,40,000 / yr",
            overall_score=94,
            match_score=96,
            last_follow_up="2024-08-25",
            next_follow_up="2024-11-20",
            notes="Exemplary performance during 90-day probationary internship. Transitioned to permanent salaried position with full medical & EPF benefits.",
            certifications=[
                {
                    "id": "CRT-001",
                    "title": "AWS Certified Cloud Practitioner",
                    "issuing_organization": "Amazon Web Services",
                    "issue_date": "2024-05-10",
                    "expiry_date": "2027-05-10",
                    "credential_id": "AWS-CCP-98231",
                    "verification_url": "https://aws.amazon.com/verification",
                    "status": "Active"
                },
                {
                    "id": "CRT-002",
                    "title": "Meta Front-End Developer Professional Certificate",
                    "issuing_organization": "Meta & Coursera",
                    "issue_date": "2024-06-15",
                    "credential_id": "META-FED-4410",
                    "status": "Active"
                }
            ],
            assessments=[
                {
                    "id": "ASM-001",
                    "assessment_name": "Full-Stack Capstone Defense: Enterprise Billing Dashboard",
                    "date": "2024-06-25",
                    "score": 96,
                    "max_score": 100,
                    "grade": "A+",
                    "evaluator": "K. R. Narayanan",
                    "feedback": "Outstanding component architecture and test coverage (92% unit test branches). React query caching implemented cleanly."
                },
                {
                    "id": "ASM-002",
                    "assessment_name": "TypeScript Algorithmic & Data Structure Audit",
                    "date": "2024-04-18",
                    "score": 92,
                    "max_score": 100,
                    "grade": "A",
                    "evaluator": "Dr. S. Meenakshi",
                    "feedback": "Deep grasp of generics, union discrimination, and asynchronous promise pipelines."
                }
            ],
            career_preference={
                "target_roles": ["Frontend Engineer", "UI Systems Engineer", "Full-Stack Web Architect"],
                "preferred_workplace": "Hybrid",
                "target_salary_min": "₹8,00,000",
                "target_salary_max": "₹12,00,000",
                "preferred_locations": ["Bengaluru, KA", "Hyderabad, TS", "Chennai, TN", "Remote India"],
                "target_industries": ["Enterprise SaaS", "FinTech", "HealthTech"]
            },
            current_pathway={
                "pathway_id": "CP-01",
                "title": "Modern Full-Stack Web Architecture",
                "current_stage": "Entry / Apprentice",
                "progress_percent": 35,
                "next_milestone": "Software Engineer II (Target: Q1 2026)"
            },
            outcome_history=[
                {
                    "id": "OUT-001",
                    "outcome_type": "employment",
                    "organization_or_venture": "Apex Cloud Technologies India Pvt. Ltd.",
                    "role_or_course": "Junior Frontend Engineer",
                    "compensation_or_funding": "₹8,40,000 / yr",
                    "start_date": "2024-07-22",
                    "is_current": True,
                    "verification_status": "verified",
                    "verification_notes": "Official appointment letter and EPFO electronic challan wage confirmation on file."
                },
                {
                    "id": "OUT-002",
                    "outcome_type": "employment",
                    "organization_or_venture": "Apex Cloud Technologies India Pvt. Ltd.",
                    "role_or_course": "Engineering Apprentice / Trainee",
                    "compensation_or_funding": "₹25,000 / mo",
                    "start_date": "2024-06-01",
                    "end_date": "2024-07-20",
                    "is_current": False,
                    "verification_status": "verified",
                    "verification_notes": "10-week summer tech internship & NAPS apprenticeship successfully completed."
                }
            ],
            follow_up_history=[
                {
                    "id": "AUD-001",
                    "checkpoint_type": "30-Day Post-Placement Audit",
                    "date": "2024-08-25",
                    "counselor_name": "Raghavan Nair",
                    "status": "completed",
                    "retention_confirmed": True,
                    "wage_progressed": False,
                    "counselor_notes": "Met with Priya and VP of Talent Sunita Rao. Candidate has shipped 4 production UI PRs. Highly satisfied."
                },
                {
                    "id": "AUD-002",
                    "checkpoint_type": "60-Day Check-in",
                    "date": "2024-09-28",
                    "counselor_name": "Raghavan Nair",
                    "status": "completed",
                    "retention_confirmed": True,
                    "wage_progressed": False,
                    "counselor_notes": "All indicators positive. Priya is mentoring incoming interns."
                },
                {
                    "id": "AUD-003",
                    "checkpoint_type": "90-Day Retention Audit",
                    "date": "2024-11-20",
                    "counselor_name": "Raghavan Nair",
                    "status": "scheduled",
                    "retention_confirmed": False,
                    "wage_progressed": False,
                    "counselor_notes": "Scheduled 90-day retention and performance benchmark audit."
                }
            ],
            consent_status={
                "consent_status": "granted",
                "share_with_employers": True,
                "share_with_funding_bodies": True,
                "share_anonymized_research": True,
                "share_public_portfolio": True,
                "consent_date": "2024-01-15",
                "expiry_date": "2026-01-15",
                "version": "v2.1",
                "notes": "Full consent granted to publish certified portfolio and verification badges."
            }
        ),

        # --- 2. SELF-EMPLOYMENT ---
        Trainee(
            id="TRN-2024-002",
            full_name="Rajesh Kumar",
            email="rajesh.kumar@example.in",
            phone="+91 98201 87211",
            avatar_url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
            location="Hyderabad, TS",
            bio="Self-employed cloud infrastructure architect & DevOps consultant. Specializing in Docker containerization, PostgreSQL pgvector deployments, and CI/CD pipelines for high-growth tech firms across HITEC City.",
            program="Backend & Cloud DevOps",
            cohort="Cohort 2024-B",
            status="placed",
            primary_outcome_type="self_employment",
            enrollment_date="2024-02-01",
            graduation_date="2024-07-15",
            training_details={
                "provider_name": "IIIT Bangalore Data Academy",
                "course_title": "Enterprise Cloud Architecture & Distributed Systems",
                "accreditation": "Telangana State Council of Higher Education (TSCHE) Endorsed",
                "instructor_name": "Venkatesh Prasad, Principal Cloud Architect",
                "modality": "Online Synchronous & Virtual Labs",
                "attendance_rate": "97.1%",
                "hours_completed": 680,
            },
            current_role="Principal Consultant & Owner",
            current_employer="Kumar Cloud Architecture LLP",
            placement_date="2024-08-01",
            placement_salary="₹14,50,000 / yr (Projected Retainers)",
            overall_score=88,
            match_score=82,
            last_follow_up="2024-09-12",
            next_follow_up="2024-11-01",
            notes="Formed registered LLP with MCA India. Secured 3 recurring retainer agreements with regional logistics & SaaS firms.",
            certifications=[
                {
                    "id": "CRT-003",
                    "title": "Certified Kubernetes Administrator (CKA)",
                    "issuing_organization": "Cloud Native Computing Foundation (CNCF)",
                    "issue_date": "2024-07-02",
                    "expiry_date": "2027-07-02",
                    "credential_id": "CKA-77821-IN",
                    "status": "Active"
                }
            ],
            assessments=[
                {
                    "id": "ASM-003",
                    "assessment_name": "Multi-Region Cloud Kubernetes Failover Simulation",
                    "date": "2024-07-10",
                    "score": 90,
                    "max_score": 100,
                    "grade": "A",
                    "evaluator": "Venkatesh Prasad",
                    "feedback": "Demonstrated master-level disaster recovery scripts and zero downtime migrations."
                }
            ],
            career_preference={
                "target_roles": ["Cloud Consultant", "DevOps Engineer", "Site Reliability Architect"],
                "preferred_workplace": "Remote",
                "target_salary_min": "₹12,00,000",
                "target_salary_max": "₹18,00,000",
                "preferred_locations": ["Hyderabad, TS", "Bengaluru, KA", "Remote India"],
                "target_industries": ["Logistics", "Cloud Infrastructure", "FinTech"]
            },
            current_pathway={
                "pathway_id": "CP-02",
                "title": "Cloud Data & AI Systems Engineer",
                "current_stage": "Mid-Level Practice",
                "progress_percent": 55,
                "next_milestone": "Senior Cloud Consultancy Expansion (Target: Q2 2026)"
            },
            outcome_history=[
                {
                    "id": "OUT-003",
                    "outcome_type": "self_employment",
                    "organization_or_venture": "Kumar Cloud Architecture LLP",
                    "role_or_course": "Principal Cloud Infrastructure Consultant",
                    "compensation_or_funding": "₹14,50,000 / yr (Retainers)",
                    "start_date": "2024-08-01",
                    "is_current": True,
                    "verification_status": "verified",
                    "verification_notes": "Ministry of Corporate Affairs (MCA) Certificate of Incorporation and client GST invoices verified."
                }
            ],
            follow_up_history=[
                {
                    "id": "AUD-004",
                    "checkpoint_type": "30-Day Self-Employment Audit",
                    "date": "2024-09-12",
                    "counselor_name": "Meera Iyer",
                    "status": "completed",
                    "retention_confirmed": True,
                    "wage_progressed": True,
                    "counselor_notes": "Audited business current account bank statements and GST filings. Trainee billing exceeds ₹1,20,000 monthly."
                }
            ],
            consent_status={
                "consent_status": "granted",
                "share_with_employers": True,
                "share_with_funding_bodies": True,
                "share_anonymized_research": True,
                "share_public_portfolio": True,
                "consent_date": "2024-02-01",
                "expiry_date": "2026-02-01",
                "version": "v2.1",
                "notes": "Consented to sharing business case study for workforce self-employment outcomes."
            }
        ),

        # --- 3. FREELANCING ---
        Trainee(
            id="TRN-2024-003",
            full_name="Sneha Patel",
            email="sneha.patel@example.in",
            phone="+91 97123 31987",
            avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
            location="Pune, MH",
            bio="Full-stack freelance developer and digital contractor. Delivering rapid MVP builds, API integrations, and frontend dashboards for high-growth tech startups across India and international clients.",
            program="Full-Stack Software Engineering",
            cohort="Cohort 2024-A",
            status="placed",
            primary_outcome_type="freelancing",
            enrollment_date="2023-10-01",
            graduation_date="2024-03-31",
            training_details={
                "provider_name": "Western India Tech Academy, Pune",
                "course_title": "Agile Web Engineering & Freelance Professional Practice",
                "accreditation": "Endorsed by Maharashtra State Skill Development Society (MSSDS)",
                "instructor_name": "Anand Deshmukh",
                "modality": "Hybrid",
                "attendance_rate": "99.1%",
                "hours_completed": 700,
            },
            current_role="Senior Full-Stack Freelance Contractor",
            current_employer="Independent Freelance Contractor (Upwork Top Rated / Direct Clients)",
            placement_date="2024-04-15",
            placement_salary="₹1,800 / hr (₹12,50,000+ annualized)",
            overall_score=95,
            match_score=93,
            last_follow_up="2024-08-10",
            next_follow_up="2024-11-10",
            notes="Top Rated badge on Upwork Pro. Completed 14 high-value contract deliverables with 100% 5-star client ratings.",
            certifications=[
                {
                    "id": "CRT-004",
                    "title": "Professional Scrum Master I (PSM I)",
                    "issuing_organization": "Scrum.org",
                    "issue_date": "2024-03-12",
                    "credential_id": "PSM-882190",
                    "status": "Active"
                }
            ],
            assessments=[
                {
                    "id": "ASM-004",
                    "assessment_name": "Real-time Chat & WebSockets Implementation",
                    "date": "2024-03-20",
                    "score": 97,
                    "max_score": 100,
                    "grade": "A+",
                    "evaluator": "Anand Deshmukh",
                    "feedback": "Flawless bidirectional event handling with Redis Pub/Sub backend."
                }
            ],
            career_preference={
                "target_roles": ["Freelance Web Engineer", "Contract Frontend Developer", "Technical MVP Builder"],
                "preferred_workplace": "Remote",
                "target_salary_min": "₹1,500/hr",
                "target_salary_max": "₹2,500/hr",
                "preferred_locations": ["Pune, MH", "Mumbai, MH", "Remote India"],
                "target_industries": ["Tech Startups", "E-Commerce", "Digital Media"]
            },
            current_pathway={
                "pathway_id": "CP-01",
                "title": "Modern Full-Stack Web Architecture",
                "current_stage": "Freelance Contractor Specialist",
                "progress_percent": 60,
                "next_milestone": "Freelance Agency Transition (Target: 2026)"
            },
            outcome_history=[
                {
                    "id": "OUT-004",
                    "outcome_type": "freelancing",
                    "organization_or_venture": "Independent Contractor / Upwork Pro Platform",
                    "role_or_course": "Full-Stack React/FastAPI Specialist",
                    "compensation_or_funding": "₹1,800 / hr average billable",
                    "start_date": "2024-04-15",
                    "is_current": True,
                    "verification_status": "verified",
                    "verification_notes": "Audited platform earnings ledger: ₹6,50,000 collected in first 5 months."
                }
            ],
            follow_up_history=[
                {
                    "id": "AUD-005",
                    "checkpoint_type": "90-Day Freelance Revenue Verification",
                    "date": "2024-08-10",
                    "counselor_name": "Raghavan Nair",
                    "status": "completed",
                    "retention_confirmed": True,
                    "wage_progressed": True,
                    "counselor_notes": "Candidate average monthly net billings exceed ₹1,10,000. Fully self-sustaining freelancing career."
                }
            ],
            consent_status={
                "consent_status": "granted",
                "share_with_employers": True,
                "share_with_funding_bodies": True,
                "share_anonymized_research": True,
                "share_public_portfolio": True,
                "consent_date": "2023-10-01",
                "expiry_date": "2025-10-01",
                "version": "v2.1"
            }
        ),

        # --- 4. APPRENTICESHIP ---
        Trainee(
            id="TRN-2024-004",
            full_name="Karthik Venkataraman",
            email="karthik.v@example.in",
            phone="+91 94441 91234",
            avatar_url="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
            location="Chennai, TN",
            bio="Registered apprentice in hospital infrastructure cybersecurity. Transitioned from IT support to defending mission-critical clinical IoT and electronic hospital information management systems.",
            program="Cybersecurity & Infrastructure",
            cohort="Cohort 2024-B",
            status="placed",
            primary_outcome_type="apprenticeship",
            enrollment_date="2024-02-01",
            graduation_date="2024-07-15",
            training_details={
                "provider_name": "National Skill Training Institute (NSTI) Chennai",
                "course_title": "Healthcare Cyber Defense & Threat Intelligence",
                "accreditation": "National Apprenticeship Promotion Scheme (NAPS) / MSDE",
                "instructor_name": "Cdr. R. Krishnan (Retd.)",
                "modality": "On-site Lab & Hospital Clinical Rotation",
                "attendance_rate": "96.5%",
                "hours_completed": 750,
            },
            current_role="Healthcare Cybersecurity Systems Apprentice",
            current_employer="Vanguard Healthcare Networks India",
            placement_date="2024-08-01",
            placement_salary="₹4,80,000 / yr + Skill Allowance",
            overall_score=84,
            match_score=87,
            last_follow_up="2024-09-01",
            next_follow_up="2024-11-01",
            notes="Formal 2-year NAPS / MSDE registered apprenticeship contract signed. Progression schedule includes 3 wage step increases.",
            certifications=[
                {
                    "id": "CRT-005",
                    "title": "CompTIA Security+",
                    "issuing_organization": "CompTIA",
                    "issue_date": "2024-06-20",
                    "expiry_date": "2027-06-20",
                    "credential_id": "COMP-SEC-99214",
                    "status": "Active"
                }
            ],
            assessments=[
                {
                    "id": "ASM-005",
                    "assessment_name": "Incident Response & Medical Device Triage Lab",
                    "date": "2024-07-05",
                    "score": 86,
                    "max_score": 100,
                    "grade": "B+",
                    "evaluator": "Cdr. R. Krishnan",
                    "feedback": "Strong packet analysis skills. Remediated simulated ransomware exploit within 14 minutes."
                }
            ],
            career_preference={
                "target_roles": ["Cybersecurity Analyst", "SOC Analyst", "Healthcare Privacy Systems Officer"],
                "preferred_workplace": "On-site",
                "target_salary_min": "₹4,50,000",
                "target_salary_max": "₹7,50,000",
                "preferred_locations": ["Chennai, TN", "Coimbatore, TN", "Bengaluru, KA"],
                "target_industries": ["Healthcare", "Government", "Defense Infrastructure"]
            },
            current_pathway={
                "pathway_id": "CP-02",
                "title": "Cloud Data & AI Systems Engineer",
                "current_stage": "Year 1 Registered Apprentice",
                "progress_percent": 30,
                "next_milestone": "Senior SOC Analyst Promotion (Target: August 2025)"
            },
            outcome_history=[
                {
                    "id": "OUT-005",
                    "outcome_type": "apprenticeship",
                    "organization_or_venture": "Vanguard Healthcare Networks India",
                    "role_or_course": "Cybersecurity Operations Apprentice",
                    "compensation_or_funding": "₹40,000 / mo",
                    "start_date": "2024-08-01",
                    "is_current": True,
                    "verification_status": "verified",
                    "verification_notes": "NAPS / MSDE Apprenticeship Registration Contract Portal ID #NAPS-81920 on file."
                }
            ],
            follow_up_history=[
                {
                    "id": "AUD-006",
                    "checkpoint_type": "30-Day NAPS Apprenticeship Audit",
                    "date": "2024-09-01",
                    "counselor_name": "Raghavan Nair",
                    "status": "completed",
                    "retention_confirmed": True,
                    "wage_progressed": False,
                    "counselor_notes": "Apprenticeship mentor confirmed completion of first 160 hours on-the-job training."
                }
            ],
            consent_status={
                "consent_status": "granted",
                "share_with_employers": True,
                "share_with_funding_bodies": True,
                "share_anonymized_research": True,
                "share_public_portfolio": False,
                "consent_date": "2024-02-01",
                "expiry_date": "2026-02-01",
                "version": "v2.1",
                "notes": "Consented to NAPS portal and state apprentice wage reporting."
            }
        ),

        # --- 5. ENTREPRENEURSHIP ---
        Trainee(
            id="TRN-2024-005",
            full_name="Aditya Verma",
            email="aditya.verma@example.in",
            phone="+91 98102 78244",
            avatar_url="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
            location="Mumbai, MH",
            bio="Technology entrepreneur and founder of OmniTrace Diagnostics, an AI-assisted oncology workflow tool. Formed startup team out of workforce accelerator capstone.",
            program="Data Intelligence & AI Integration",
            cohort="Cohort 2024-A",
            status="placed",
            primary_outcome_type="entrepreneurship",
            enrollment_date="2023-10-10",
            graduation_date="2024-04-12",
            training_details={
                "provider_name": "Mumbai Institute of Artificial Intelligence & Data Science",
                "course_title": "Applied AI Engineering & Venture Commercialization",
                "accreditation": "Skill India / NSDC Approved Curriculum",
                "instructor_name": "Dr. Arvind Swaminathan",
                "modality": "Hybrid",
                "attendance_rate": "98.9%",
                "hours_completed": 720,
            },
            current_role="Founder & Chief Executive Officer",
            current_employer="OmniTrace Diagnostics Pvt. Ltd. (DPIIT Recognized Startup)",
            placement_date="2024-05-01",
            placement_salary="₹50 Lakhs Seed Grant + ₹10 Lakhs Founder Draw",
            overall_score=97,
            match_score=95,
            last_follow_up="2024-08-01",
            next_follow_up="2024-11-01",
            notes="Incorporated Private Limited Company under MCA. DPIIT Recognized Startup with ₹50 Lakhs grant funding and angel syndicate backing.",
            certifications=[
                {
                    "id": "CRT-006",
                    "title": "TensorFlow Developer Certificate",
                    "issuing_organization": "Google",
                    "issue_date": "2024-03-30",
                    "credential_id": "TF-DEV-10294",
                    "status": "Active"
                }
            ],
            assessments=[
                {
                    "id": "ASM-006",
                    "assessment_name": "Computer Vision & Medical Imaging Pipeline Defense",
                    "date": "2024-04-05",
                    "score": 99,
                    "max_score": 100,
                    "grade": "A+",
                    "evaluator": "Dr. Arvind Swaminathan",
                    "feedback": "Venture-grade clinical prototype. Exceeded accuracy benchmarks of published commercial models."
                }
            ],
            career_preference={
                "target_roles": ["Venture Founder", "Chief Technology Officer", "AI Research Scientist"],
                "preferred_workplace": "Flexible",
                "target_salary_min": "₹10,00,000",
                "target_salary_max": "₹25,00,000",
                "preferred_locations": ["Mumbai, MH", "Pune, MH", "Bengaluru, KA"],
                "target_industries": ["AI / Machine Learning", "Healthcare Tech", "Venture Capital"]
            },
            current_pathway={
                "pathway_id": "CP-02",
                "title": "Cloud Data & AI Systems Engineer",
                "current_stage": "Venture Founder & Commercialization",
                "progress_percent": 75,
                "next_milestone": "Seed Equity Round & 5 New Tech Hires (Target: Q1 2026)"
            },
            outcome_history=[
                {
                    "id": "OUT-006",
                    "outcome_type": "entrepreneurship",
                    "organization_or_venture": "OmniTrace Diagnostics Pvt. Ltd.",
                    "role_or_course": "Founder & CEO",
                    "compensation_or_funding": "₹50 Lakhs Seed Grant Funding",
                    "start_date": "2024-05-01",
                    "is_current": True,
                    "verification_status": "verified",
                    "verification_notes": "MCA Certificate of Incorporation (CIN), PAN/TAN card, DPIIT Startup Certificate, and incubator grant agreement on file."
                }
            ],
            follow_up_history=[
                {
                    "id": "AUD-007",
                    "checkpoint_type": "90-Day Entrepreneurship Audit",
                    "date": "2024-08-01",
                    "counselor_name": "Meera Iyer",
                    "status": "completed",
                    "retention_confirmed": True,
                    "wage_progressed": True,
                    "counselor_notes": "OmniTrace has onboarded 2 workforce trainees as beta engineers. High economic multiplier outcome."
                }
            ],
            consent_status={
                "consent_status": "granted",
                "share_with_employers": True,
                "share_with_funding_bodies": True,
                "share_anonymized_research": True,
                "share_public_portfolio": True,
                "consent_date": "2023-10-10",
                "expiry_date": "2025-10-10",
                "version": "v2.1",
                "notes": "Full public consent granted to showcase company in workforce annual report."
            }
        ),

        # --- 6. FURTHER EDUCATION ---
        Trainee(
            id="TRN-2024-006",
            full_name="Ananya Iyer",
            email="ananya.iyer@example.in",
            phone="+91 98403 43901",
            avatar_url="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
            location="New Delhi, DL",
            bio="Data intelligence graduate continuing into advanced graduate research. Awarded fully-funded fellowship to pursue Master of Technology (M.Tech) in AI & Data Science with healthcare predictive analytics concentration.",
            program="Data Intelligence & AI Integration",
            cohort="Cohort 2024-A",
            status="placed",
            primary_outcome_type="further_education",
            enrollment_date="2023-10-10",
            graduation_date="2024-04-12",
            training_details={
                "provider_name": "Delhi AI & Deep Learning Academy",
                "course_title": "Applied Statistical Learning & Neural Network Topologies",
                "accreditation": "Endorsed by AICTE & Delhi Skill and Entrepreneurship University (DSEU)",
                "instructor_name": "Prof. Rajesh Sengupta",
                "modality": "On-Campus & Computer Science Labs",
                "attendance_rate": "99.4%",
                "hours_completed": 720,
            },
            current_role="Graduate Research Fellow (M.Tech Candidate)",
            current_employer="IIT Delhi School of Artificial Intelligence",
            placement_date="2024-08-25",
            placement_salary="100% Tuition Waiver + ₹50,000 / mo MoE Research Fellowship",
            overall_score=98,
            match_score=97,
            last_follow_up="2024-09-15",
            next_follow_up="2024-12-01",
            notes="Secured competitive merit research fellowship in clinical NLP. Articulated workforce bootcamp credits into postgraduate research curriculum.",
            certifications=[
                {
                    "id": "CRT-007",
                    "title": "DeepLearning.AI Machine Learning Specialization",
                    "issuing_organization": "DeepLearning.AI & Stanford Online",
                    "issue_date": "2024-04-01",
                    "credential_id": "DLAI-ML-44129",
                    "status": "Active"
                }
            ],
            assessments=[
                {
                    "id": "ASM-007",
                    "assessment_name": "Biomedical Text Vectorization Capstone",
                    "date": "2024-04-08",
                    "score": 98,
                    "max_score": 100,
                    "grade": "A+",
                    "evaluator": "Prof. Rajesh Sengupta",
                    "feedback": "Exemplary semantic vector search architecture utilizing pgvector for PubMed medical abstract classification."
                }
            ],
            career_preference={
                "target_roles": ["Data Scientist", "Biomedical AI Researcher", "Machine Learning Systems Scientist"],
                "preferred_workplace": "Hybrid",
                "target_salary_min": "₹12,00,000",
                "target_salary_max": "₹20,00,000",
                "preferred_locations": ["New Delhi, DL", "Bengaluru, KA", "Hyderabad, TS"],
                "target_industries": ["Academic Research", "Pharmaceuticals", "Healthcare AI"]
            },
            current_pathway={
                "pathway_id": "CP-02",
                "title": "Cloud Data & AI Systems Engineer",
                "current_stage": "Graduate Research & Advanced Specialization",
                "progress_percent": 65,
                "next_milestone": "Master of Technology Graduation & Industry Placement (Target: 2026)"
            },
            outcome_history=[
                {
                    "id": "OUT-007",
                    "outcome_type": "further_education",
                    "organization_or_venture": "IIT Delhi",
                    "role_or_course": "M.Tech in Artificial Intelligence & Data Science",
                    "compensation_or_funding": "Full Tuition Fellowship + ₹50,000 / mo Fellowship Stipend",
                    "start_date": "2024-08-25",
                    "is_current": True,
                    "verification_status": "verified",
                    "verification_notes": "Official university letter of admission, fee waiver certificate, and Ministry of Education JRF fellowship award letter verified."
                }
            ],
            follow_up_history=[
                {
                    "id": "AUD-008",
                    "checkpoint_type": "Fall Semester Higher Education Audit",
                    "date": "2024-09-15",
                    "counselor_name": "Meera Iyer",
                    "status": "completed",
                    "retention_confirmed": True,
                    "wage_progressed": True,
                    "counselor_notes": "Enrolled in postgraduate research course. Fellowship stipend active and credited monthly."
                }
            ],
            consent_status={
                "consent_status": "granted",
                "share_with_employers": True,
                "share_with_funding_bodies": True,
                "share_anonymized_research": True,
                "share_public_portfolio": True,
                "consent_date": "2023-10-10",
                "expiry_date": "2025-10-10",
                "version": "v2.1",
                "notes": "Consented to higher education articulation reporting."
            }
        ),
    ]

    for trn in trainees_data:
        if not db.query(Trainee).filter(Trainee.id == trn.id).first():
            db.add(trn)
    db.commit()

    # Trainee Skills relationships
    skills_map = [
        # Priya
        TraineeSkill(trainee_id="TRN-2024-001", skill_id="sk-1", name="React.js", level="expert", verified=True, score=96),
        TraineeSkill(trainee_id="TRN-2024-001", skill_id="sk-2", name="TypeScript", level="advanced", verified=True, score=92),
        TraineeSkill(trainee_id="TRN-2024-001", skill_id="sk-17", name="Technical Communication", level="advanced", verified=True, score=94),
        
        # Rajesh
        TraineeSkill(trainee_id="TRN-2024-002", skill_id="sk-6", name="Python / FastAPI", level="expert", verified=True, score=95),
        TraineeSkill(trainee_id="TRN-2024-002", skill_id="sk-8", name="PostgreSQL & pgvector", level="advanced", verified=True, score=88),
        TraineeSkill(trainee_id="TRN-2024-002", skill_id="sk-9", name="Docker & Containerization", level="expert", verified=True, score=94),

        # Sneha
        TraineeSkill(trainee_id="TRN-2024-003", skill_id="sk-1", name="React.js", level="expert", verified=True, score=98),
        TraineeSkill(trainee_id="TRN-2024-003", skill_id="sk-2", name="TypeScript", level="advanced", verified=True, score=94),
        TraineeSkill(trainee_id="TRN-2024-003", skill_id="sk-6", name="Python / FastAPI", level="advanced", verified=True, score=90),

        # Karthik
        TraineeSkill(trainee_id="TRN-2024-004", skill_id="sk-14", name="Network & Cloud Security", level="advanced", verified=True, score=88),
        TraineeSkill(trainee_id="TRN-2024-004", skill_id="sk-9", name="Docker & Containerization", level="intermediate", verified=True, score=78),

        # Aditya
        TraineeSkill(trainee_id="TRN-2024-005", skill_id="sk-6", name="Python / FastAPI", level="expert", verified=True, score=98),
        TraineeSkill(trainee_id="TRN-2024-005", skill_id="sk-8", name="PostgreSQL & pgvector", level="expert", verified=True, score=96),

        # Ananya
        TraineeSkill(trainee_id="TRN-2024-006", skill_id="sk-6", name="Python / FastAPI", level="expert", verified=True, score=99),
        TraineeSkill(trainee_id="TRN-2024-006", skill_id="sk-8", name="PostgreSQL & pgvector", level="expert", verified=True, score=97),
    ]
    for sk in skills_map:
        if not db.query(TraineeSkill).filter(
            TraineeSkill.trainee_id == sk.trainee_id,
            TraineeSkill.skill_id == sk.skill_id
        ).first():
            db.add(sk)
    db.commit()

    # 5. Follow-ups Table
    followups_data = [
        FollowUp(
            id="FLW-001",
            trainee_id="TRN-2024-001",
            trainee_name="Priya Sharma",
            trainee_role="Junior Frontend Engineer @ Apex Cloud",
            type="90-Day Retention Audit",
            due_date="2024-11-20",
            status="pending",
            priority="Medium",
            assigned_counselor="Raghavan Nair",
            notes="Assess 90-day retention and manager feedback on technical ramp-up.",
        ),
        FollowUp(
            id="FLW-002",
            trainee_id="TRN-2024-004",
            trainee_name="Karthik Venkataraman",
            trainee_role="Cybersecurity Systems Apprentice @ Vanguard",
            type="60-Day NAPS Apprenticeship Audit",
            due_date="2024-11-01",
            status="pending",
            priority="High",
            assigned_counselor="Raghavan Nair",
            notes="NAPS milestone verification check with Hospital SOC supervisor.",
        ),
    ]
    for flw in followups_data:
        if not db.query(FollowUp).filter(FollowUp.id == flw.id).first():
            db.add(flw)
    db.commit()

    # 6. Skill Gaps Table
    gaps_data = [
        SkillGap(
            id="GAP-001",
            trainee_id="TRN-2024-002",
            trainee_name="Rajesh Kumar",
            target_job_title="Backend API Specialist",
            target_employer="Meridian MedTech India Pvt. Ltd.",
            gap_score=18,
            match_score=82,
            missing_skills=[
                {"skill": "PostgreSQL & pgvector indexing", "importance": "Critical", "suggestedModule": "Advanced SQL & Embedding Search"},
                {"skill": "DISHA / DPDP Compliance", "importance": "Recommended", "suggestedModule": "Healthcare Data Privacy & DISHA Fundamentals"},
            ],
            acquired_skills=["Python / FastAPI", "Docker & Containerization", "REST APIs"],
            recommendation="Complete a 1-week micro-credential in vector indexing and relational schema isolation.",
        ),
    ]
    for gap in gaps_data:
        if not db.query(SkillGap).filter(SkillGap.id == gap.id).first():
            db.add(gap)
    db.commit()

    # 7. Career Paths Table
    paths_data = [
        CareerPath(
            id="CP-01",
            title="Modern Full-Stack Web Architecture",
            track="Engineering",
            description="Progression from junior frontend/backend foundations to lead software systems architect.",
            projected_growth="+22% Demand across next 5 years",
            target_industries=["SaaS", "FinTech", "E-Commerce", "Enterprise Software"],
            milestones=[
                {
                    "stage": "Entry / Apprentice",
                    "role": "Junior Software Engineer",
                    "typicalTimeframe": "0 - 18 months",
                    "expectedSalary": "₹4,50,000 - ₹8,00,000",
                    "competencies": ["React & TypeScript components", "FastAPI CRUD endpoints", "Unit testing & Git branching"]
                },
                {
                    "stage": "Mid-Level",
                    "role": "Software Engineer II",
                    "typicalTimeframe": "18 - 36 months",
                    "expectedSalary": "₹10,00,000 - ₹18,00,000",
                    "competencies": ["Microservice architecture", "Database query optimization", "CI/CD pipeline management"]
                },
            ],
        ),
        CareerPath(
            id="CP-02",
            title="Business Intelligence & Data Analytics",
            track="Analytics",
            description="Progression from junior data reporting specialist to lead enterprise analytics architect.",
            projected_growth="+28% Demand across next 5 years",
            target_industries=["FinTech", "E-Commerce", "Healthcare", "Consulting"],
            milestones=[
                {
                    "stage": "Entry / Junior Analyst",
                    "role": "Associate BI & SQL Analyst",
                    "typicalTimeframe": "0 - 18 months",
                    "expectedSalary": "₹5,00,000 - ₹8,50,000",
                    "competencies": ["SQL Querying & Data Modeling", "Power BI / Tableau Dashboards", "Data Cleansing & ETL"]
                },
                {
                    "stage": "Mid-Level / Senior Analyst",
                    "role": "Lead Analytics Consultant",
                    "typicalTimeframe": "18 - 36 months",
                    "expectedSalary": "₹11,00,000 - ₹19,00,000",
                    "competencies": ["Data Storytelling & Executive Presentation", "Predictive Modeling", "Data Warehouse Governance"]
                }
            ],
        ),
        CareerPath(
            id="CP-03",
            title="Cloud Infrastructure & DevOps Engineering",
            track="Cloud & Infrastructure",
            description="Evolution from infrastructure apprentice to principal cloud reliability engineer.",
            projected_growth="+25% Demand across next 5 years",
            target_industries=["Cloud Computing", "Telecom", "Financial Services", "SaaS"],
            milestones=[
                {
                    "stage": "Junior DevOps Engineer",
                    "role": "Junior Cloud Operations Engineer",
                    "typicalTimeframe": "0 - 18 months",
                    "expectedSalary": "₹6,00,000 - ₹9,50,000",
                    "competencies": ["Docker & Containerization", "CI/CD Pipelines", "Linux Administration"]
                },
                {
                    "stage": "Cloud Architect",
                    "role": "Senior Site Reliability Engineer (SRE)",
                    "typicalTimeframe": "18 - 42 months",
                    "expectedSalary": "₹14,00,000 - ₹24,00,000",
                    "competencies": ["Kubernetes Cluster Orchestration", "Multi-Cloud Security", "Infrastructure-as-Code (Terraform)"]
                }
            ],
        ),
        CareerPath(
            id="CP-04",
            title="AI Solutions & Applied Data Science",
            track="Artificial Intelligence",
            description="Career trajectory from ML model assistant to enterprise AI architect.",
            projected_growth="+34% Demand across next 5 years",
            target_industries=["Artificial Intelligence", "HealthTech", "Automotive", "Cybersecurity"],
            milestones=[
                {
                    "stage": "Associate ML Engineer",
                    "role": "Junior Data Scientist",
                    "typicalTimeframe": "0 - 18 months",
                    "expectedSalary": "₹7,00,000 - ₹11,00,000",
                    "competencies": ["Python Data Science Stack", "Supervised / Unsupervised ML", "Model Evaluation & Metrics"]
                },
                {
                    "stage": "AI Systems Lead",
                    "role": "Staff AI Solutions Architect",
                    "typicalTimeframe": "24 - 48 months",
                    "expectedSalary": "₹18,00,000 - ₹32,00,000",
                    "competencies": ["LLM Finetuning & RAG Architecture", "Vector Search & Embeddings", "High-Throughput ML Serving"]
                }
            ],
        ),
        CareerPath(
            id="CP-05",
            title="Cybersecurity Operations & Defense",
            track="Cybersecurity",
            description="Progression from SOC tier-1 analyst to security operations manager.",
            projected_growth="+31% Demand across next 5 years",
            target_industries=["Defense", "Banking & Finance", "Critical Infrastructure", "Healthcare"],
            milestones=[
                {
                    "stage": "Junior Security Analyst",
                    "role": "SOC Analyst Tier 1",
                    "typicalTimeframe": "0 - 18 months",
                    "expectedSalary": "₹5,50,000 - ₹9,00,000",
                    "competencies": ["Network & Cloud Security", "SIEM Log Monitoring", "Incident Triage & Response"]
                },
                {
                    "stage": "Senior Security Consultant",
                    "role": "Information Security Lead",
                    "typicalTimeframe": "24 - 48 months",
                    "expectedSalary": "₹15,00,000 - ₹26,00,000",
                    "competencies": ["Penetration Testing", "Cloud Compliance & Audits", "Threat Hunting & Cryptography"]
                }
            ],
        ),
        CareerPath(
            id="CP-06",
            title="Digital Healthcare Informatics",
            track="Healthcare Technology",
            description="Advancement from clinical data assistant to healthcare technology director.",
            projected_growth="+20% Demand across next 5 years",
            target_industries=["Hospitals & Health Systems", "MedTech", "Pharmaceuticals", "Health Insurance"],
            milestones=[
                {
                    "stage": "Clinical Informatics Assistant",
                    "role": "Healthcare Data Specialist",
                    "typicalTimeframe": "0 - 18 months",
                    "expectedSalary": "₹4,80,000 - ₹7,80,000",
                    "competencies": ["Electronic Health Records (EHR)", "Clinical Triage Standards", "HIPAA / Data Privacy"]
                },
                {
                    "stage": "Healthcare Informatics Lead",
                    "role": "Director of Health Information Systems",
                    "typicalTimeframe": "24 - 48 months",
                    "expectedSalary": "₹12,00,000 - ₹22,00,000",
                    "competencies": ["Healthcare Analytics & Outcomes", "Telehealth Systems Integration", "Regulatory Compliance"]
                }
            ],
        ),
    ]
    for p in paths_data:
        if not db.query(CareerPath).filter(CareerPath.id == p.id).first():
            db.add(p)
    db.commit()

    logger.info("Complete Trainee Outcome Passport database seeding successfully completed.")
    seed_jobs_dataset(db, force_reseed=force_reseed)
    associate_jobs_with_companies(db)
    seed_enrollments_and_applications(db, force_reseed=force_reseed)
    seed_longitudinal_outcome_intelligence(db, force_reseed=force_reseed)
    seed_trainee_skill_evidence(db, force_reseed=force_reseed)
    seed_digital_twins(db, force_reseed=force_reseed)
    seed_users(db, force_reseed=force_reseed)


def seed_trainee_skill_evidence(db: Session, force_reseed: bool = False):
    """
    Seeds multi-source evidence records for all synthetic trainees across both hard and soft skills:
    - Assessment
    - Practical project
    - Certification
    - Trainer evaluation
    - Employer feedback
    Then calculates and synchronizes the 0-5 proficiency score, confidence, and transparent explanation.
    """
    existing_count = db.query(TraineeSkillEvidence).count()
    if not force_reseed and existing_count >= 30:
        logger.info(f"Trainee skill evidence already populated ({existing_count} records). Skipping.")
        return

    if force_reseed:
        db.query(TraineeSkillEvidence).delete()
        db.commit()

    logger.info("Populating multi-source Trainee Skill Evidence and running 0-5 scoring formula...")

    # Ensure all trainees have the 5 standard soft skills in TraineeSkill
    soft_skills_defs = [
        {"id": "sk-comm-01", "name": "Technical Communication", "target": 4.0},
        {"id": "sk-team-01", "name": "Cross-Functional Collaboration", "target": 4.0},
        {"id": "sk-prob-01", "name": "Critical Problem Solving", "target": 4.5},
        {"id": "sk-adapt-01", "name": "Workplace Adaptability & Learning Agility", "target": 4.0},
        {"id": "sk-time-01", "name": "Time Management & Prioritization", "target": 4.0},
    ]

    all_trainees = db.query(Trainee).all()
    for trn in all_trainees:
        existing_ts_ids = {ts.skill_id for ts in db.query(TraineeSkill).filter(TraineeSkill.trainee_id == trn.id).all()}
        for ss in soft_skills_defs:
            if ss["id"] not in existing_ts_ids:
                db.add(TraineeSkill(
                    trainee_id=trn.id,
                    skill_id=ss["id"],
                    name=ss["name"],
                    level="intermediate",
                    proficiency_score=3.0,
                    target_level=ss["target"],
                    confidence=0.85
                ))
    db.commit()

    # Pre-defined realistic evidence items
    evidence_fixtures = [
        # Priya Sharma (TRN-2024-001) - React & Web Architecture
        {
            "trainee_id": "TRN-2024-001",
            "skill_id": "sk-1",
            "skill_name": "React.js",
            "evidence_source": "practical_project",
            "score": 4.8,
            "confidence": 0.95,
            "assessment_date": "2024-08-10",
            "reviewer_source": "Senior Tech Assessor Deepak Sharma",
            "notes": "Built production-ready healthcare patient portal with custom hooks, memoization, and responsive CSS grid.",
            "artifact_url": "github.com/priyasharma/healthcare-portal-react"
        },
        {
            "trainee_id": "TRN-2024-001",
            "skill_id": "sk-1",
            "skill_name": "React.js",
            "evidence_source": "assessment",
            "score": 4.6,
            "confidence": 0.92,
            "assessment_date": "2024-07-28",
            "reviewer_source": "Automated Proctor Exam",
            "notes": "Scored 94% on Advanced React Architecture, state machines, and reconciliation lifecycle."
        },
        {
            "trainee_id": "TRN-2024-001",
            "skill_id": "sk-1",
            "skill_name": "React.js",
            "evidence_source": "trainer_evaluation",
            "score": 4.9,
            "confidence": 0.90,
            "assessment_date": "2024-08-15",
            "reviewer_source": "Lead Instructor Ananya Mukherjee",
            "notes": "Exemplary code structure, component reusability, and mentoring peers in state management."
        },
        {
            "trainee_id": "TRN-2024-001",
            "skill_id": "sk-1",
            "skill_name": "React.js",
            "evidence_source": "certification",
            "score": 4.7,
            "confidence": 0.96,
            "assessment_date": "2024-06-20",
            "reviewer_source": "Meta Front-End Developer Professional Credential",
            "notes": "Completed verified Meta React Specialization capstone."
        },
        {
            "trainee_id": "TRN-2024-001",
            "skill_id": "sk-1",
            "skill_name": "React.js",
            "evidence_source": "employer_feedback",
            "score": 4.8,
            "confidence": 0.93,
            "assessment_date": "2024-09-12",
            "reviewer_source": "Engineering Manager Arun Kumar (Apex Cloud Technologies India)",
            "notes": "Priya independently delivered 4 responsive dashboard widgets ahead of sprint schedule."
        },

        # Priya - TypeScript
        {
            "trainee_id": "TRN-2024-001",
            "skill_id": "sk-2",
            "skill_name": "TypeScript",
            "evidence_source": "practical_project",
            "score": 4.5,
            "confidence": 0.94,
            "assessment_date": "2024-08-05",
            "reviewer_source": "Senior Tech Assessor Deepak Sharma",
            "notes": "Enforced strict type guards, Discriminated Unions, and generic API response mappers."
        },
        {
            "trainee_id": "TRN-2024-001",
            "skill_id": "sk-2",
            "skill_name": "TypeScript",
            "evidence_source": "assessment",
            "score": 4.3,
            "confidence": 0.90,
            "assessment_date": "2024-07-25",
            "reviewer_source": "TypeScript Standardized Exam",
            "notes": "Passed with 91% score on generics, conditional types, and utility types."
        },
        {
            "trainee_id": "TRN-2024-001",
            "skill_id": "sk-2",
            "skill_name": "TypeScript",
            "evidence_source": "trainer_evaluation",
            "score": 4.6,
            "confidence": 0.88,
            "assessment_date": "2024-08-12",
            "reviewer_source": "Lead Instructor Ananya Mukherjee",
            "notes": "Eliminated all implicit any types and structured clean interfaces across team repo."
        },

        # Priya - Technical Communication
        {
            "trainee_id": "TRN-2024-001",
            "skill_id": "sk-comm-01",
            "skill_name": "Technical Communication",
            "evidence_source": "assessment",
            "score": 4.5,
            "confidence": 0.92,
            "assessment_date": "2024-09-01",
            "reviewer_source": "Workforce Behavioral Situational Judgement Engine",
            "notes": "Level 5 response on technical incident briefing to non-technical executive VP.",
            "rubric_scores": {"proficiency_level": 5, "rubric_title": "Expert Stakeholder Framing"}
        },
        {
            "trainee_id": "TRN-2024-001",
            "skill_id": "sk-comm-01",
            "skill_name": "Technical Communication",
            "evidence_source": "trainer_evaluation",
            "score": 4.7,
            "confidence": 0.90,
            "assessment_date": "2024-08-20",
            "reviewer_source": "Lead Instructor Ananya Mukherjee",
            "notes": "Delivered high-clarity technical architecture presentation during Demo Day."
        },
        {
            "trainee_id": "TRN-2024-001",
            "skill_id": "sk-comm-01",
            "skill_name": "Technical Communication",
            "evidence_source": "employer_feedback",
            "score": 4.6,
            "confidence": 0.91,
            "assessment_date": "2024-09-15",
            "reviewer_source": "Engineering Manager Arun Kumar",
            "notes": "Seamless collaboration and concise documentation during product sprint planning."
        },

        # Priya - Teamwork
        {
            "trainee_id": "TRN-2024-001",
            "skill_id": "sk-team-01",
            "skill_name": "Cross-Functional Collaboration",
            "evidence_source": "assessment",
            "score": 4.4,
            "confidence": 0.91,
            "assessment_date": "2024-09-01",
            "reviewer_source": "Workforce Behavioral Assessment Engine",
            "notes": "Level 4 response on proactive sprint task rebalancing during teammate absence."
        },
        {
            "trainee_id": "TRN-2024-001",
            "skill_id": "sk-team-01",
            "skill_name": "Cross-Functional Collaboration",
            "evidence_source": "trainer_evaluation",
            "score": 4.6,
            "confidence": 0.89,
            "assessment_date": "2024-08-18",
            "reviewer_source": "Lead Instructor Ananya Mukherjee",
            "notes": "Natural team mediator; fostered supportive pairing environment."
        },

        # Priya - Problem Solving
        {
            "trainee_id": "TRN-2024-001",
            "skill_id": "sk-prob-01",
            "skill_name": "Critical Problem Solving",
            "evidence_source": "assessment",
            "score": 4.5,
            "confidence": 0.92,
            "assessment_date": "2024-09-01",
            "reviewer_source": "Workforce Behavioral Assessment Engine",
            "notes": "Level 5 response on systematic memory leak profiling and root-cause isolation."
        },
        {
            "trainee_id": "TRN-2024-001",
            "skill_id": "sk-prob-01",
            "skill_name": "Critical Problem Solving",
            "evidence_source": "practical_project",
            "score": 4.7,
            "confidence": 0.94,
            "assessment_date": "2024-08-10",
            "reviewer_source": "Senior Assessor Deepak Sharma",
            "notes": "Designed resilient error boundaries and client-side offline retry fallbacks."
        },

        # Priya - Adaptability
        {
            "trainee_id": "TRN-2024-001",
            "skill_id": "sk-adapt-01",
            "skill_name": "Workplace Adaptability & Learning Agility",
            "evidence_source": "assessment",
            "score": 4.3,
            "confidence": 0.90,
            "assessment_date": "2024-09-01",
            "reviewer_source": "Workforce Behavioral Assessment Engine",
            "notes": "Level 4 response on rapid framework migration."
        },
        {
            "trainee_id": "TRN-2024-001",
            "skill_id": "sk-adapt-01",
            "skill_name": "Workplace Adaptability & Learning Agility",
            "evidence_source": "employer_feedback",
            "score": 4.5,
            "confidence": 0.92,
            "assessment_date": "2024-09-15",
            "reviewer_source": "Engineering Manager Arun Kumar",
            "notes": "Quickly learned Apex proprietary component design system without friction."
        },

        # Priya - Time Management
        {
            "trainee_id": "TRN-2024-001",
            "skill_id": "sk-time-01",
            "skill_name": "Time Management & Prioritization",
            "evidence_source": "assessment",
            "score": 4.4,
            "confidence": 0.91,
            "assessment_date": "2024-09-01",
            "reviewer_source": "Workforce Behavioral Assessment Engine",
            "notes": "Level 5 response on Eisenhower triage under 3 competing deadlines."
        },
        {
            "trainee_id": "TRN-2024-001",
            "skill_id": "sk-time-01",
            "skill_name": "Time Management & Prioritization",
            "evidence_source": "trainer_evaluation",
            "score": 4.5,
            "confidence": 0.88,
            "assessment_date": "2024-08-20",
            "reviewer_source": "Instructor Ananya Mukherjee",
            "notes": "100% on-time milestone delivery across entire 16-week cohort."
        },
        {
            "trainee_id": "TRN-2024-001",
            "skill_id": "sk-9",
            "skill_name": "Docker & Containerization",
            "evidence_source": "employer_feedback",
            "score": 2.4,
            "confidence": 0.90,
            "assessment_date": "2024-08-25",
            "reviewer_source": "Engineering Manager Arun Kumar (Apex Cloud Technologies India)",
            "notes": "Encountered persistent friction with multi-container compose networking and volume permissions in staging deployment."
        },

        # Rajesh Kumar (TRN-2024-002) - Python / FastAPI Backend
        {
            "trainee_id": "TRN-2024-002",
            "skill_id": "sk-6",
            "skill_name": "Python / FastAPI",
            "evidence_source": "practical_project",
            "score": 4.8,
            "confidence": 0.96,
            "assessment_date": "2024-08-15",
            "reviewer_source": "Principal Engineer Suresh Balaji",
            "notes": "Designed asynchronous microservice with dependency injection, JWT auth, and pydantic v2 schemas.",
            "artifact_url": "github.com/rkumar/fastapi-microservice-core"
        },
        {
            "trainee_id": "TRN-2024-002",
            "skill_id": "sk-6",
            "skill_name": "Python / FastAPI",
            "evidence_source": "assessment",
            "score": 4.7,
            "confidence": 0.93,
            "assessment_date": "2024-07-30",
            "reviewer_source": "Python Institute PCAP Exam Proctor",
            "notes": "Scored 96% on Python Object Oriented Architecture & concurrency."
        },
        {
            "trainee_id": "TRN-2024-002",
            "skill_id": "sk-6",
            "skill_name": "Python / FastAPI",
            "evidence_source": "trainer_evaluation",
            "score": 4.9,
            "confidence": 0.91,
            "assessment_date": "2024-08-18",
            "reviewer_source": "Lead Instructor Ananya Mukherjee",
            "notes": "Exceptional backend craftsmanship; authored reference boilerplate for cohort."
        },
        {
            "trainee_id": "TRN-2024-002",
            "skill_id": "sk-8",
            "skill_name": "PostgreSQL & pgvector",
            "evidence_source": "practical_project",
            "score": 4.5,
            "confidence": 0.94,
            "assessment_date": "2024-08-14",
            "reviewer_source": "Principal Engineer Suresh Balaji",
            "notes": "Implemented HNSW vector indexing and relational schema normalization."
        },
        {
            "trainee_id": "TRN-2024-002",
            "skill_id": "sk-8",
            "skill_name": "PostgreSQL & pgvector",
            "evidence_source": "assessment",
            "score": 4.2,
            "confidence": 0.90,
            "assessment_date": "2024-08-01",
            "reviewer_source": "Database Query Optimization Exam",
            "notes": "Strong performance on EXPLAIN ANALYZE and B-tree vs HNSW query planning."
        },
        {
            "trainee_id": "TRN-2024-002",
            "skill_id": "sk-9",
            "skill_name": "Docker & Containerization",
            "evidence_source": "certification",
            "score": 4.6,
            "confidence": 0.95,
            "assessment_date": "2024-06-15",
            "reviewer_source": "Docker Certified Associate (DCA)",
            "notes": "Verified multi-stage Docker build optimizations and docker-compose orchestration."
        },
        {
            "trainee_id": "TRN-2024-002",
            "skill_id": "sk-prob-01",
            "skill_name": "Critical Problem Solving",
            "evidence_source": "assessment",
            "score": 4.6,
            "confidence": 0.92,
            "assessment_date": "2024-09-02",
            "reviewer_source": "Workforce Behavioral Assessment Engine",
            "notes": "Level 5 response on database connection pool saturation diagnostic."
        },
        {
            "trainee_id": "TRN-2024-002",
            "skill_id": "sk-comm-01",
            "skill_name": "Technical Communication",
            "evidence_source": "trainer_evaluation",
            "score": 4.2,
            "confidence": 0.88,
            "assessment_date": "2024-08-16",
            "reviewer_source": "Lead Instructor Ananya Mukherjee",
            "notes": "Wrote comprehensive OpenAPI / Swagger documentation and README guides."
        },
        {
            "trainee_id": "TRN-2024-002",
            "skill_id": "sk-team-01",
            "skill_name": "Cross-Functional Collaboration",
            "evidence_source": "assessment",
            "score": 4.3,
            "confidence": 0.90,
            "assessment_date": "2024-09-02",
            "reviewer_source": "Workforce Behavioral Assessment Engine",
            "notes": "Level 4 response on technical decision matrix consensus building."
        },

        # Sneha Patel (TRN-2024-003) - Frontend Design Systems
        {
            "trainee_id": "TRN-2024-003",
            "skill_id": "sk-1",
            "skill_name": "React.js",
            "evidence_source": "practical_project",
            "score": 4.9,
            "confidence": 0.97,
            "assessment_date": "2024-08-12",
            "reviewer_source": "Design Systems Lead Raghavan Nair",
            "notes": "Engineered accessible headless UI component library with WCAG AAA conformance."
        },
        {
            "trainee_id": "TRN-2024-003",
            "skill_id": "sk-1",
            "skill_name": "React.js",
            "evidence_source": "trainer_evaluation",
            "score": 4.8,
            "confidence": 0.92,
            "assessment_date": "2024-08-19",
            "reviewer_source": "Lead Instructor Ananya Mukherjee",
            "notes": "Top visual designer in cohort; exceptional attention to layout craft."
        },
        {
            "trainee_id": "TRN-2024-003",
            "skill_id": "sk-comm-01",
            "skill_name": "Technical Communication",
            "evidence_source": "assessment",
            "score": 4.6,
            "confidence": 0.93,
            "assessment_date": "2024-09-01",
            "reviewer_source": "Workforce Behavioral Assessment Engine",
            "notes": "Demonstrated expert communication bridging UI/UX wireframes and frontend code."
        },

        # Karthik Venkataraman (TRN-2024-004) - Cloud & Cybersecurity
        {
            "trainee_id": "TRN-2024-004",
            "skill_id": "sk-14",
            "skill_name": "Network & Cloud Security",
            "evidence_source": "certification",
            "score": 4.7,
            "confidence": 0.97,
            "assessment_date": "2024-05-18",
            "reviewer_source": "CompTIA Security+ SY0-701",
            "notes": "Scored 840/900 on threat analysis, network hardening, and identity management."
        },
        {
            "trainee_id": "TRN-2024-004",
            "skill_id": "sk-14",
            "skill_name": "Network & Cloud Security",
            "evidence_source": "practical_project",
            "score": 4.4,
            "confidence": 0.92,
            "assessment_date": "2024-08-10",
            "reviewer_source": "Security Analyst Farhan Qureshi",
            "notes": "Deployed zero-trust network perimeter with automated audit logging."
        },
        {
            "trainee_id": "TRN-2024-004",
            "skill_id": "sk-prob-01",
            "skill_name": "Critical Problem Solving",
            "evidence_source": "assessment",
            "score": 4.5,
            "confidence": 0.93,
            "assessment_date": "2024-09-02",
            "reviewer_source": "Workforce Behavioral Assessment Engine",
            "notes": "Level 5 response on triage and isolation of critical CVE vulnerability."
        }
    ]

    for item in evidence_fixtures:
        ev = TraineeSkillEvidence(
            trainee_id=item["trainee_id"],
            skill_id=item["skill_id"],
            skill_name=item["skill_name"],
            evidence_source=item["evidence_source"],
            score=item["score"],
            max_score=5.0,
            confidence=item["confidence"],
            assessment_date=item["assessment_date"],
            reviewer_source=item["reviewer_source"],
            notes=item.get("notes"),
            rubric_scores=item.get("rubric_scores", {}),
            artifact_url=item.get("artifact_url")
        )
        db.add(ev)
    db.commit()

    # Now calculate and sync scores for all trainees
    for trn in all_trainees:
        SkillScoringEngine.sync_trainee_skill_scores(db, trn.id)

    logger.info("Successfully seeded trainee skill evidence records and synced 0-5 proficiency profiles.")


def seed_users(db: Session, force_reseed: bool = False):
    """
    Seeds protected multi-role accounts with secure bcrypt password hashing:
    - ADMIN: admin@skilltrace.gov / Admin@123456
    - COACH: coach.sarah@skilltrace.org / Coach@123456 (Sarah Jenkins)
    - COACH: coach.arun@skilltrace.org / Coach@123456 (Arun Kumar)
    - EMPLOYER: recruiter@apexcloud.io / Employer@123456 (Sunita Rao, Apex Cloud Technologies)
    - TRAINEE: priya.sharma@example.com / Trainee@123456 (Priya Sharma, TRN-2024-001)
    - TRAINEE: rajesh.kumar@example.com / Trainee@123456 (Rajesh Kumar, TRN-2024-002)
    """
    if force_reseed:
        db.query(TraineeProfile).delete()
        db.query(CoachProfile).delete()
        db.query(EmployerProfile).delete()
        db.query(User).delete()
        db.commit()
    else:
        required_demo_emails = [
            "admin@skilltrace.org",
            "admin@skilltrace.gov",
            "coach.sarah@skilltrace.org",
            "coach.arun@skilltrace.org",
            "recruiter@apexcloud.io",
            "recruiter@meridianmedtech.co.in",
            "priya.sharma@example.com",
            "rajesh.kumar@example.com"
        ]
        all_exist = all(db.query(User).filter(User.email == e).first() is not None for e in required_demo_emails)
        if all_exist:
            logger.info("All default demo accounts verified. Skipping.")
            return

    logger.info("Seeding protected multi-role users (Admin, Coach, Employer, Trainee)...")

    def upsert_user(user_obj, profile_obj=None, trainee_id_to_link=None):
        try:
            with db.begin_nested():
                existing = db.query(User).filter(
                    (User.id == user_obj.id) | (User.email == user_obj.email)
                ).first()
                target_user = existing
                if not existing:
                    db.add(user_obj)
                    db.flush()
                    target_user = user_obj
                else:
                    target_user.hashed_password = user_obj.hashed_password
                    target_user.is_active = True
                    target_user.is_verified = True
                    target_user.role = user_obj.role
                    target_user.full_name = user_obj.full_name
                    db.flush()

                if profile_obj:
                    profile_cls = type(profile_obj)
                    existing_prof = db.query(profile_cls).filter(
                        (profile_cls.id == profile_obj.id) | (profile_cls.user_id == target_user.id)
                    ).first()
                    if not existing_prof:
                        profile_obj.user_id = target_user.id
                        db.add(profile_obj)
                        db.flush()
                    else:
                        if trainee_id_to_link and hasattr(existing_prof, "trainee_id"):
                            existing_prof.trainee_id = trainee_id_to_link
                            db.flush()

                if trainee_id_to_link:
                    t_record = db.query(Trainee).filter(Trainee.id == trainee_id_to_link).first()
                    if t_record:
                        t_record.user_id = target_user.id
                        t_record.email = target_user.email
                        db.flush()
        except Exception as e:
            logger.warning(f"Notice during user upsert for {user_obj.email}: {e}")

    # 1. Platform Admin (Provisioned account)
    upsert_user(User(
        id="USR-ADMIN-001",
        email="admin@skilltrace.gov",
        hashed_password=get_password_hash("Admin@123456"),
        role="ADMIN",
        full_name="Director Rajeshwar Rao",
        phone="+91 80 2345 6789",
        is_active=True,
        is_verified=True,
        created_at="2024-01-01T09:00:00"
    ))

    upsert_user(User(
        id="USR-ADMIN-002",
        email="admin@skilltrace.org",
        hashed_password=get_password_hash("Admin@123456"),
        role="ADMIN",
        full_name="Director Rajeshwar Rao",
        phone="+91 80 2345 6789",
        is_active=True,
        is_verified=True,
        created_at="2024-01-01T09:00:00"
    ))

    # 2. Coaches
    coach_1 = User(
        id="USR-COACH-001",
        email="coach.sarah@skilltrace.org",
        hashed_password=get_password_hash("Coach@123456"),
        role="COACH",
        full_name="Sarah Jenkins",
        phone="+91 98450 11223",
        is_active=True,
        is_verified=True,
        created_at="2024-01-15T10:00:00"
    )
    upsert_user(coach_1, CoachProfile(
        id="CP-001",
        user_id="USR-COACH-001",
        training_institute_id="INST-01",
        full_name="Sarah Jenkins",
        title="Lead Cloud & AI Workforce Coach",
        designation="Lead Cloud & AI Workforce Coach",
        organization="National Institute of Cloud & AI",
        specialization="Cloud Infrastructure, Python Microservices & Full-Stack",
        verification_status="VERIFIED",
        phone="+91 98450 11223",
        assigned_trainee_ids=["TRN-2024-001", "TRN-2024-002", "TRN-2024-003"]
    ))

    coach_2 = User(
        id="USR-COACH-002",
        email="coach.arun@skilltrace.org",
        hashed_password=get_password_hash("Coach@123456"),
        role="COACH",
        full_name="Arun Kumar",
        phone="+91 98450 44556",
        is_active=True,
        is_verified=True,
        created_at="2024-01-20T10:00:00"
    )
    upsert_user(coach_2, CoachProfile(
        id="CP-002",
        user_id="USR-COACH-002",
        training_institute_id="INST-02",
        full_name="Arun Kumar",
        title="Healthcare & Data Systems Coach",
        designation="Healthcare & Data Systems Coach",
        organization="Meridian Health & Life Sciences Institute",
        specialization="Healthcare Informatics & Analytics",
        verification_status="VERIFIED",
        phone="+91 98450 44556",
        assigned_trainee_ids=["TRN-2024-004", "TRN-2024-005", "TRN-2024-006"]
    ))

    # 3. Employers (Multi-Tenant Companies)
    employer_user_1 = User(
        id="USR-EMP-001",
        email="recruiter@apexcloud.io",
        hashed_password=get_password_hash("Employer@123456"),
        role="EMPLOYER",
        full_name="Sunita Rao",
        phone="+91 80 4123 0144",
        is_active=True,
        is_verified=True,
        created_at="2024-02-01T08:30:00"
    )
    upsert_user(employer_user_1, EmployerProfile(
        id="EP-001",
        user_id="USR-EMP-001",
        company_id="CMP-01",
        employer_id="EMP-01",
        company_name="Apex Cloud Technologies India Pvt. Ltd.",
        designation="VP of Talent & Apprenticeship Programs",
        department="Talent Acquisition & HR",
        verification_status="VERIFIED",
        contact_phone="+91 80 4123 0144",
        authorized_candidate_ids=["TRN-2024-001", "TRN-2024-004"]
    ))

    employer_user_2 = User(
        id="USR-EMP-002",
        email="recruiter@meridianmedtech.co.in",
        hashed_password=get_password_hash("Employer@123456"),
        role="EMPLOYER",
        full_name="Vikram Reddy",
        phone="+91 40 4567 0189",
        is_active=True,
        is_verified=True,
        created_at="2024-02-05T09:00:00"
    )
    upsert_user(employer_user_2, EmployerProfile(
        id="EP-002",
        user_id="USR-EMP-002",
        company_id="CMP-02",
        employer_id="EMP-02",
        company_name="Meridian MedTech India Pvt. Ltd.",
        designation="Engineering Manager & Hiring Lead",
        department="Engineering",
        verification_status="VERIFIED",
        contact_phone="+91 40 4567 0189",
        authorized_candidate_ids=["TRN-2024-004", "TRN-2024-005"]
    ))

    # 3b. Verification Authority & Auditor
    upsert_user(User(
        id="USR-VA-001",
        email="verifier@skilltrace.gov",
        hashed_password=get_password_hash("Verifier@123456"),
        role="VERIFICATION_AUTHORITY",
        full_name="Dr. Kavitha Ramanathan",
        phone="+91 80 4912 3344",
        is_active=True,
        is_verified=True,
        created_at="2024-01-10T09:00:00"
    ))

    upsert_user(User(
        id="USR-AUD-001",
        email="auditor@skilltrace.org",
        hashed_password=get_password_hash("Auditor@123456"),
        role="AUDITOR",
        full_name="Vikramaditya Sen",
        phone="+91 80 4912 5566",
        is_active=True,
        is_verified=True,
        created_at="2024-01-12T09:00:00"
    ))

    # 4. Trainees
    t1_user = User(
        id="USR-TRN-001",
        email="priya.sharma@example.com",
        hashed_password=get_password_hash("Trainee@123456"),
        role="TRAINEE",
        full_name="Priya Sharma",
        phone="+91 98450 23489",
        is_active=True,
        is_verified=True,
        created_at="2024-01-15T09:00:00"
    )
    upsert_user(
        t1_user,
        TraineeProfile(
            id="TP-001",
            user_id="USR-TRN-001",
            trainee_id="TRN-2024-001",
            headline="Full Stack Cloud & AI Engineer Trainee",
            bio="Passionate developer specializing in React, Python, and cloud microservices.",
            education="B.Tech in Computer Science & Engineering",
            experience_years=0.5,
            assigned_coach_id="USR-COACH-001",
            resume_filename="Priya_Sharma_Resume.pdf",
            resume_url="/uploads/resumes/Priya_Sharma_Resume.pdf",
            resume_parsed_skills=["React.js", "Python", "TypeScript", "PostgreSQL", "Docker"]
        ),
        trainee_id_to_link="TRN-2024-001"
    )

    t2_user = User(
        id="USR-TRN-002",
        email="rajesh.kumar@example.com",
        hashed_password=get_password_hash("Trainee@123456"),
        role="TRAINEE",
        full_name="Rajesh Kumar",
        phone="+91 98201 87211",
        is_active=True,
        is_verified=True,
        created_at="2024-02-01T09:00:00"
    )
    upsert_user(
        t2_user,
        TraineeProfile(
            id="TP-002",
            user_id="USR-TRN-002",
            trainee_id="TRN-2024-002",
            headline="Cloud Solutions Architecture Apprentice",
            bio="Designing scalable multi-cloud infrastructure and DevOps delivery pipelines.",
            education="B.Tech in Information Technology",
            experience_years=1.0,
            assigned_coach_id="USR-COACH-001",
            resume_filename="Rajesh_Kumar_Resume.pdf",
            resume_url="/uploads/resumes/Rajesh_Kumar_Resume.pdf",
            resume_parsed_skills=["AWS Architecture", "Docker", "Kubernetes", "Terraform", "CI/CD"]
        ),
        trainee_id_to_link="TRN-2024-002"
    )

    # Reconcile and synchronize canonical trainee records across User, Coach, Employer
    trainee_reconciliations = [
        ("priya.sharma@example.com", "Priya Sharma", "TRN-2024-001"),
        ("rajesh.kumar@example.com", "Rajesh Kumar", "TRN-2024-002"),
    ]
    for email, full_name, canonical_id in trainee_reconciliations:
        u = db.query(User).filter(
            (User.email.ilike(email)) | (User.full_name.ilike(full_name))
        ).first()
        canonical_trn = db.query(Trainee).filter(Trainee.id == canonical_id).first()
        if u and canonical_trn:
            canonical_trn.user_id = u.id
            canonical_trn.email = email
            if u.trainee_profile:
                if u.trainee_profile.trainee_id != canonical_id:
                    old_id = u.trainee_profile.trainee_id
                    u.trainee_profile.trainee_id = canonical_id
                    if old_id and old_id.startswith("TRN-2026"):
                        ghost_trn = db.query(Trainee).filter(Trainee.id == old_id).first()
                        if ghost_trn and ghost_trn.id != canonical_id:
                            try:
                                db.delete(ghost_trn)
                            except Exception:
                                pass
            else:
                tp = TraineeProfile(
                    id=f"TP-CANONICAL-{canonical_id}",
                    user_id=u.id,
                    trainee_id=canonical_id,
                    headline=f"Workforce Candidate ({canonical_trn.program})",
                    bio=canonical_trn.bio
                )
                db.add(tp)
            db.flush()

    # Synchronize Coach Sarah Jenkins (CP-001) assigned trainee IDs
    cp1 = db.query(CoachProfile).filter(CoachProfile.id == "CP-001").first()
    if cp1:
        assigned = list(cp1.assigned_trainee_ids or [])
        for cid in ["TRN-2024-001", "TRN-2024-002", "TRN-2024-003"]:
            if cid not in assigned:
                assigned.append(cid)
        cp1.assigned_trainee_ids = assigned

    # Synchronize Employer Sunita Rao (EP-001) authorized candidates
    ep1 = db.query(EmployerProfile).filter(EmployerProfile.id == "EP-001").first()
    if ep1:
        auth_cands = list(ep1.authorized_candidate_ids or [])
        for cid in ["TRN-2024-001", "TRN-2024-004"]:
            if cid not in auth_cands:
                auth_cands.append(cid)
        ep1.authorized_candidate_ids = auth_cands

    db.commit()
    logger.info("Successfully seeded multi-role users and role profiles with canonical trainee synchronization.")


def seed_longitudinal_outcome_intelligence(db: Session, force_reseed: bool = False):
    """
    Seeds comprehensive Longitudinal Outcome Intelligence records:
    1. Canonical Outcome States across all 11 standardized categories:
       EMPLOYED, SELF_EMPLOYED, APPRENTICESHIP, FREELANCING, ENTREPRENEURSHIP,
       HIGHER_STUDIES, UNEMPLOYED, SEEKING_EMPLOYMENT, UNKNOWN, UNREACHABLE, WITHDRAWN_CONSENT.
    2. Real chronological append-only career timelines:
       TRAINING -> COMPLETION -> PLACEMENT -> EMPLOYMENT -> JOB_CHANGE -> SALARY_CHANGE -> RETENTION -> SKILL_DEVELOPMENT.
    3. Longitudinal milestone follow-ups (30d, 90d, 180d, 365d) with retention confirmations and overdue tracking.
    4. Multi-source EmployerFeedbackVerification with ratings, relevance, and skill gaps.
    5. Calculates and persists objective confidence and data quality scores (completeness, freshness, verification, consistency).
    All demo records are strictly tagged with is_synthetic=True and data_source="DEMO/SYNTHETIC".
    """
    logger.info("Seeding Longitudinal Outcome Intelligence records & audit trail...")

    # 1. Trainee Metadata & 11 Canonical States Mapping
    trainee_updates = {
        "TRN-2024-001": {
            "outcome_state": OutcomeState.EMPLOYED.value,
            "outcome_verification_level": VerificationStatus.EMPLOYER_VERIFIED.value,
            "outcome_last_verified_at": "2024-09-12",
            "outcome_source": "Apex Cloud Technologies India Pvt. Ltd. (EPFO & Offer Letter)",
            "district": "Bengaluru",
            "provider_name": "Bengaluru Institute of Technology & Advanced Skills",
            "batch": "Cohort 2024-B",
            "placement_wage_numeric": 840000.0,
            "current_wage_numeric": 920000.0,
        },
        "TRN-2024-002": {
            "outcome_state": OutcomeState.SELF_EMPLOYED.value,
            "outcome_verification_level": VerificationStatus.DOCUMENT_VERIFIED.value,
            "outcome_last_verified_at": "2024-09-12",
            "outcome_source": "Ministry of Corporate Affairs (MCA) Incorporation & GST Invoices",
            "district": "Hyderabad",
            "provider_name": "IIIT Bangalore Data Academy",
            "batch": "Cohort 2024-B",
            "placement_wage_numeric": 1450000.0,
            "current_wage_numeric": 1600000.0,
        },
        "TRN-2024-003": {
            "outcome_state": OutcomeState.FREELANCING.value,
            "outcome_verification_level": VerificationStatus.EMPLOYER_VERIFIED.value,
            "outcome_last_verified_at": "2024-08-10",
            "outcome_source": "Upwork Enterprise Escrow & Client Statements",
            "district": "Pune",
            "provider_name": "Western India Tech Academy, Pune",
            "batch": "Cohort 2024-A",
            "placement_wage_numeric": 1250000.0,
            "current_wage_numeric": 1400000.0,
        },
        "TRN-2024-004": {
            "outcome_state": OutcomeState.APPRENTICESHIP.value,
            "outcome_verification_level": VerificationStatus.EMPLOYER_VERIFIED.value,
            "outcome_last_verified_at": "2024-09-01",
            "outcome_source": "Vanguard Healthcare Networks & NAPS Portal",
            "district": "Chennai",
            "provider_name": "National Skill Training Institute (NSTI) Chennai",
            "batch": "Cohort 2024-B",
            "placement_wage_numeric": 480000.0,
            "current_wage_numeric": 540000.0,
        },
        "TRN-2024-005": {
            "outcome_state": OutcomeState.ENTREPRENEURSHIP.value,
            "outcome_verification_level": VerificationStatus.DOCUMENT_VERIFIED.value,
            "outcome_last_verified_at": "2024-08-01",
            "outcome_source": "DPIIT Startup Recognition & Seed Grant Agreement",
            "district": "Mumbai",
            "provider_name": "Mumbai Institute of Artificial Intelligence & Data Science",
            "batch": "Cohort 2024-A",
            "placement_wage_numeric": 1000000.0,
            "current_wage_numeric": 1200000.0,
        },
        "TRN-2024-006": {
            "outcome_state": OutcomeState.HIGHER_STUDIES.value,
            "outcome_verification_level": VerificationStatus.DOCUMENT_VERIFIED.value,
            "outcome_last_verified_at": "2024-09-15",
            "outcome_source": "IIT Delhi Fellowship & Admission Letter",
            "district": "New Delhi",
            "provider_name": "Delhi AI & Deep Learning Academy",
            "batch": "Cohort 2024-A",
            "placement_wage_numeric": 600000.0,
            "current_wage_numeric": 600000.0,
        }
    }

    # Apply updates to existing 6 trainees
    for t_id, data in trainee_updates.items():
        trn = db.query(Trainee).filter(Trainee.id == t_id).first()
        if trn:
            for k, v in data.items():
                setattr(trn, k, v)
            trn.is_synthetic = True
            trn.data_source = "DEMO/SYNTHETIC"

    db.commit()

    # 2. Add Additional Trainees for Canonical States: UNEMPLOYED, SEEKING_EMPLOYMENT, UNKNOWN, UNREACHABLE, WITHDRAWN_CONSENT
    additional_trainees = [
        # --- 7. UNEMPLOYED ---
        Trainee(
            id="TRN-2024-007",
            full_name="Deepa Menon",
            email="deepa.menon@example.in",
            phone="+91 98450 77112",
            avatar_url="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
            location="Mysuru, KA",
            district="Mysuru",
            bio="Data intelligence graduate seeking entry-level analyst position. Completed capstone on exploratory data analysis.",
            program="Data Intelligence & AI Integration",
            cohort="Cohort 2024-A",
            batch="Cohort 2024-A",
            provider_name="Western India Tech Academy, Pune",
            status="graduated",
            primary_outcome_type="unemployed",
            outcome_state=OutcomeState.UNEMPLOYED.value,
            outcome_verification_level=VerificationStatus.SELF_REPORTED.value,
            outcome_last_verified_at="2024-08-15",
            outcome_source="Graduate Longitudinal Self-Reported Survey",
            enrollment_date="2023-10-10",
            graduation_date="2024-04-12",
            training_details={
                "provider_name": "Western India Tech Academy, Pune",
                "course_title": "Data Intelligence & Analytics",
                "attendance_rate": "92.0%",
                "hours_completed": 640
            },
            overall_score=78,
            match_score=68,
            last_follow_up="2024-08-15",
            next_follow_up="2024-11-15",
            is_synthetic=True,
            data_source="DEMO/SYNTHETIC",
            consent_status={"status": "ACTIVE", "consent_status": "granted"}
        ),
        # --- 8. SEEKING EMPLOYMENT ---
        Trainee(
            id="TRN-2024-008",
            full_name="Rohan Joshi",
            email="rohan.joshi@example.in",
            phone="+91 97230 44551",
            avatar_url="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80",
            location="Coimbatore, TN",
            district="Coimbatore",
            bio="Full-stack engineer actively attending technical interviews with enterprise SaaS startups in Bengaluru and Chennai.",
            program="Full-Stack Software Engineering",
            cohort="Cohort 2024-B",
            batch="Cohort 2024-B",
            provider_name="Bengaluru Institute of Technology & Advanced Skills",
            status="seeking_job",
            primary_outcome_type="seeking_employment",
            outcome_state=OutcomeState.SEEKING_EMPLOYMENT.value,
            outcome_verification_level=VerificationStatus.SELF_REPORTED.value,
            outcome_last_verified_at="2024-09-01",
            outcome_source="Placement Assistance Log",
            enrollment_date="2024-01-15",
            graduation_date="2024-06-30",
            training_details={
                "provider_name": "Bengaluru Institute of Technology & Advanced Skills",
                "course_title": "Full-Stack Enterprise React & Cloud Web Services",
                "attendance_rate": "94.5%",
                "hours_completed": 700
            },
            overall_score=85,
            match_score=79,
            last_follow_up="2024-09-01",
            next_follow_up="2024-10-15",
            is_synthetic=True,
            data_source="DEMO/SYNTHETIC",
            consent_status={"status": "ACTIVE", "consent_status": "granted"}
        ),
        # --- 9. UNKNOWN (Not assumed unemployed!) ---
        Trainee(
            id="TRN-2024-009",
            full_name="Amit Sengupta",
            email="amit.sengupta@example.in",
            phone="+91 98301 22883",
            avatar_url="https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80",
            location="Ahmedabad, GJ",
            district="Ahmedabad",
            bio="DevOps graduate from Cohort 2024-B. Recent status survey pending response.",
            program="Backend & Cloud DevOps",
            cohort="Cohort 2024-B",
            batch="Cohort 2024-B",
            provider_name="IIIT Bangalore Data Academy",
            status="unknown",
            primary_outcome_type="unknown",
            outcome_state=OutcomeState.UNKNOWN.value,
            outcome_verification_level=VerificationStatus.UNVERIFIED.value,
            outcome_last_verified_at=None,
            outcome_source="Pending Longitudinal Response",
            enrollment_date="2024-02-01",
            graduation_date="2024-07-15",
            training_details={
                "provider_name": "IIIT Bangalore Data Academy",
                "course_title": "Enterprise Cloud Architecture",
                "attendance_rate": "89.0%",
                "hours_completed": 620
            },
            overall_score=80,
            match_score=70,
            is_synthetic=True,
            data_source="DEMO/SYNTHETIC",
            consent_status={"status": "ACTIVE", "consent_status": "granted"}
        ),
        # --- 10. UNREACHABLE ---
        Trainee(
            id="TRN-2024-010",
            full_name="Farzana Parveen",
            email="farzana.p@example.in",
            phone="+91 98311 00992",
            avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
            location="Kolkata, WB",
            district="Kolkata",
            bio="Cybersecurity graduate. Contact details unverified; phone disconnected and email notifications undelivered.",
            program="Cybersecurity & Infrastructure",
            cohort="Cohort 2024-A",
            batch="Cohort 2024-A",
            provider_name="National Skill Training Institute (NSTI) Chennai",
            status="at_risk",
            primary_outcome_type="unreachable",
            outcome_state=OutcomeState.UNREACHABLE.value,
            outcome_verification_level=VerificationStatus.UNVERIFIED.value,
            outcome_last_verified_at=None,
            outcome_source="Unreachable (3 Failed Contact Attempts)",
            enrollment_date="2023-10-15",
            graduation_date="2024-03-30",
            training_details={
                "provider_name": "National Skill Training Institute (NSTI) Chennai",
                "course_title": "Healthcare Cyber Defense",
                "attendance_rate": "85.0%",
                "hours_completed": 600
            },
            overall_score=72,
            match_score=60,
            is_synthetic=True,
            data_source="DEMO/SYNTHETIC",
            consent_status={"status": "ACTIVE", "consent_status": "granted"}
        ),
        # --- 11. WITHDRAWN CONSENT ---
        Trainee(
            id="TRN-2024-011",
            full_name="Vikram Malhotra",
            email="vikram.m@example.in",
            phone="+91 94140 12398",
            avatar_url="https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150&auto=format&fit=crop&q=80",
            location="Jaipur, RJ",
            district="Jaipur",
            bio="Data Intelligence graduate. Exercised DPDP Act Section 6(4) right to withdraw consent.",
            program="Data Intelligence & AI Integration",
            cohort="Cohort 2024-A",
            batch="Cohort 2024-A",
            provider_name="Mumbai Institute of Artificial Intelligence & Data Science",
            status="unknown",
            primary_outcome_type="withdrawn_consent",
            outcome_state=OutcomeState.WITHDRAWN_CONSENT.value,
            outcome_verification_level=VerificationStatus.UNVERIFIED.value,
            outcome_last_verified_at="2024-05-10",
            outcome_source="DPDP Section 6(4) Consent Revocation Notice",
            enrollment_date="2023-10-10",
            graduation_date="2024-04-12",
            training_details={
                "provider_name": "Mumbai Institute of Artificial Intelligence & Data Science",
                "course_title": "Applied AI Engineering",
                "attendance_rate": "95.0%",
                "hours_completed": 700
            },
            overall_score=86,
            match_score=80,
            is_synthetic=True,
            data_source="DEMO/SYNTHETIC",
            consent_status={"status": "WITHDRAWN", "consent_status": "withdrawn", "revoked_at": "2024-05-10"}
        )
    ]

    for at in additional_trainees:
        if not db.query(Trainee).filter(Trainee.id == at.id).first():
            db.add(at)
    db.commit()

    # 3. Real Append-Only Career Timeline Events (Never overwrite historical events)
    # TRAINING -> COMPLETION -> PLACEMENT -> EMPLOYMENT -> JOB_CHANGE -> SALARY_CHANGE -> RETENTION -> SKILL_DEVELOPMENT
    timeline_events = [
        # Priya Sharma (TRN-2024-001) Complete 8-Stage Canonical Progression
        CareerTimelineEvent(
            id="CTE-001-1",
            trainee_id="TRN-2024-001",
            trainee_name="Priya Sharma",
            stage=TimelineStage.TRAINING.value,
            pathway="employment",
            title="Enrolled in Full-Stack Enterprise React & Cloud Web Services",
            organization="Bengaluru Institute of Technology & Advanced Skills",
            event_date="2024-01-15",
            metrics={"modality": "Hybrid", "hours_target": 720},
            verification_status="verified",
            verification_notes="Enrolled under NSDC sponsored scholarship program.",
            is_current=False,
            sequence_order=1
        ),
        CareerTimelineEvent(
            id="CTE-001-2",
            trainee_id="TRN-2024-001",
            trainee_name="Priya Sharma",
            stage=TimelineStage.COMPLETION.value,
            pathway="employment",
            title="Graduated Full-Stack Software Engineering Bootcamp (A+ Capstone)",
            organization="Bengaluru Institute of Technology & Advanced Skills",
            event_date="2024-06-30",
            metrics={"capstone_score": 96, "attendance_rate": "98.4%"},
            verification_status="verified",
            verification_notes="Passed formal Capstone Technical Defense.",
            is_current=False,
            sequence_order=2
        ),
        CareerTimelineEvent(
            id="CTE-001-3",
            trainee_id="TRN-2024-001",
            trainee_name="Priya Sharma",
            stage=TimelineStage.PLACEMENT.value,
            pathway="employment",
            title="Accepted Offer as Junior Frontend Engineer",
            organization="Apex Cloud Technologies India Pvt. Ltd.",
            event_date="2024-07-22",
            metrics={"placement_salary": 840000.0, "currency": "INR"},
            verification_status="verified",
            verification_notes="Offer letter and joining declaration countersigned.",
            is_current=False,
            sequence_order=3
        ),
        CareerTimelineEvent(
            id="CTE-001-4",
            trainee_id="TRN-2024-001",
            trainee_name="Priya Sharma",
            stage=TimelineStage.EMPLOYMENT.value,
            pathway="employment",
            title="Completed Probation & Joined Core Web Platform Team",
            organization="Apex Cloud Technologies India Pvt. Ltd.",
            event_date="2024-08-01",
            metrics={"employment_type": "Full-Time Salaried"},
            verification_status="verified",
            verification_notes="Confirmed permanent employee status with EPF & medical cover.",
            is_current=False,
            sequence_order=4
        ),
        CareerTimelineEvent(
            id="CTE-001-5",
            trainee_id="TRN-2024-001",
            trainee_name="Priya Sharma",
            stage=TimelineStage.JOB_CHANGE.value,
            pathway="employment",
            title="Transitioned from Apprentice to Junior Frontend Engineer II",
            organization="Apex Cloud Technologies India Pvt. Ltd.",
            event_date="2024-08-15",
            metrics={"role_level": "L2 Software Engineer"},
            verification_status="verified",
            verification_notes="Promotion memo approved by VP of Talent Sunita Rao.",
            is_current=False,
            sequence_order=5
        ),
        CareerTimelineEvent(
            id="CTE-001-6",
            trainee_id="TRN-2024-001",
            trainee_name="Priya Sharma",
            stage=TimelineStage.SALARY_CHANGE.value,
            pathway="employment",
            title="Annualized Wage Revision (+9.5% Merit Progression)",
            organization="Apex Cloud Technologies India Pvt. Ltd.",
            event_date="2024-08-25",
            metrics={"previous_wage": 840000.0, "new_wage": 920000.0, "wage_growth_pct": 9.5},
            verification_status="verified",
            verification_notes="Audited against EPFO electronic monthly challan wage slip.",
            is_current=False,
            sequence_order=6
        ),
        CareerTimelineEvent(
            id="CTE-001-7",
            trainee_id="TRN-2024-001",
            trainee_name="Priya Sharma",
            stage=TimelineStage.RETENTION.value,
            pathway="employment",
            title="90-Day & 180-Day Continuous Retention Verified",
            organization="Apex Cloud Technologies India Pvt. Ltd.",
            event_date="2024-09-12",
            metrics={"retention_days": 180, "is_retained": True},
            verification_status="verified",
            verification_notes="Active employment verified directly via employer portal review.",
            is_current=False,
            sequence_order=7
        ),
        CareerTimelineEvent(
            id="CTE-001-8",
            trainee_id="TRN-2024-001",
            trainee_name="Priya Sharma",
            stage=TimelineStage.SKILL_DEVELOPMENT.value,
            pathway="employment",
            title="Attained AWS Certified Cloud Practitioner & Advanced State Management",
            organization="Amazon Web Services & Apex Internal Tech Academy",
            event_date="2024-09-20",
            metrics={"credential_id": "AWS-CCP-98231", "score": 94},
            verification_status="verified",
            verification_notes="Digital credential verified through AWS verification portal.",
            is_current=True,
            sequence_order=8
        ),

        # Rajesh Kumar (TRN-2024-002) Self-Employment Timeline
        CareerTimelineEvent(
            id="CTE-002-1",
            trainee_id="TRN-2024-002",
            trainee_name="Rajesh Kumar",
            stage=TimelineStage.TRAINING.value,
            pathway="self_employment",
            title="Enrolled in Enterprise Cloud Architecture & Distributed Systems",
            organization="IIIT Bangalore Data Academy",
            event_date="2024-02-01",
            metrics={"attendance_rate": "97.1%"},
            verification_status="verified",
            verification_notes="Endorsed by TSCHE.",
            is_current=False,
            sequence_order=1
        ),
        CareerTimelineEvent(
            id="CTE-002-2",
            trainee_id="TRN-2024-002",
            trainee_name="Rajesh Kumar",
            stage=TimelineStage.COMPLETION.value,
            pathway="self_employment",
            title="Completed Distributed Cloud Architecture Diploma",
            organization="IIIT Bangalore Data Academy",
            event_date="2024-07-15",
            metrics={"capstone_grade": "A"},
            verification_status="verified",
            verification_notes="Certified Kubernetes Administrator exam cleared.",
            is_current=False,
            sequence_order=2
        ),
        CareerTimelineEvent(
            id="CTE-002-3",
            trainee_id="TRN-2024-002",
            trainee_name="Rajesh Kumar",
            stage=TimelineStage.PLACEMENT.value,
            pathway="self_employment",
            title="Registered Kumar Cloud Architecture LLP with MCA India",
            organization="Ministry of Corporate Affairs / Self-Venture",
            event_date="2024-08-01",
            metrics={"projected_retainers": 1450000.0},
            verification_status="verified",
            verification_notes="Certificate of Incorporation & GST portal verified.",
            is_current=False,
            sequence_order=3
        ),
        CareerTimelineEvent(
            id="CTE-002-4",
            trainee_id="TRN-2024-002",
            trainee_name="Rajesh Kumar",
            stage=TimelineStage.RETENTION.value,
            pathway="self_employment",
            title="Retained 3 Enterprise Retainers Beyond 90 Days",
            organization="Kumar Cloud Architecture LLP",
            event_date="2024-09-12",
            metrics={"monthly_retainer_net": 135000.0, "retention_confirmed": True},
            verification_status="verified",
            verification_notes="Current account bank statements and GST filings audited.",
            is_current=True,
            sequence_order=4
        )
    ]

    for ev in timeline_events:
        if not db.query(Trainee).filter(Trainee.id == ev.trainee_id).first():
            continue
        if not db.query(CareerTimelineEvent).filter(CareerTimelineEvent.id == ev.id).first():
            db.add(ev)
    db.commit()

    # 4. Longitudinal Milestone Follow-ups (30d, 90d, 180d, 365d)
    longitudinal_fus = [
        # Priya Sharma (TRN-2024-001)
        LongitudinalFollowUp(
            id="LFU-001-30",
            trainee_id="TRN-2024-001",
            trainee_name="Priya Sharma",
            milestone_days=30,
            scheduled_date="2024-08-22",
            due_date="2024-08-25",
            completed_date="2024-08-25",
            status="completed",
            pathway="employment",
            retention_confirmed=True,
            metrics_recorded={"retention": True, "wage": 840000.0, "employer": "Apex Cloud Technologies India Pvt. Ltd."},
            notes="30-day onboarding audit completed. Candidate thriving in sprint workflow."
        ),
        LongitudinalFollowUp(
            id="LFU-001-90",
            trainee_id="TRN-2024-001",
            trainee_name="Priya Sharma",
            milestone_days=90,
            scheduled_date="2024-10-20",
            due_date="2024-10-25",
            completed_date="2024-10-22",
            status="completed",
            pathway="employment",
            retention_confirmed=True,
            metrics_recorded={"retention": True, "wage": 920000.0, "employer": "Apex Cloud Technologies India Pvt. Ltd."},
            notes="90-day retention verified with employer VP of Talent. Merit salary revision active."
        ),
        LongitudinalFollowUp(
            id="LFU-001-180",
            trainee_id="TRN-2024-001",
            trainee_name="Priya Sharma",
            milestone_days=180,
            scheduled_date="2025-01-20",
            due_date="2025-01-25",
            completed_date="2025-01-22",
            status="completed",
            pathway="employment",
            retention_confirmed=True,
            metrics_recorded={"retention": True, "wage": 920000.0},
            notes="180-day retention confirmed."
        ),
        LongitudinalFollowUp(
            id="LFU-001-365",
            trainee_id="TRN-2024-001",
            trainee_name="Priya Sharma",
            milestone_days=365,
            scheduled_date="2025-07-20",
            due_date="2025-07-25",
            status="scheduled",
            pathway="employment",
            retention_confirmed=False,
            notes="Scheduled 1-year annual retention benchmark."
        ),

        # Karthik Venkataraman (TRN-2024-004) - Includes overdue follow-up
        LongitudinalFollowUp(
            id="LFU-004-30",
            trainee_id="TRN-2024-004",
            trainee_name="Karthik Venkataraman",
            milestone_days=30,
            scheduled_date="2024-09-01",
            due_date="2024-09-05",
            completed_date="2024-09-02",
            status="completed",
            pathway="apprenticeship",
            retention_confirmed=True,
            metrics_recorded={"retention": True, "wage": 480000.0},
            notes="Apprentice active in Vanguard Healthcare SOC."
        ),
        LongitudinalFollowUp(
            id="LFU-004-90",
            trainee_id="TRN-2024-004",
            trainee_name="Karthik Venkataraman",
            milestone_days=90,
            scheduled_date="2024-11-01",
            due_date="2024-11-05",
            completed_date="2024-11-02",
            status="completed",
            pathway="apprenticeship",
            retention_confirmed=True,
            metrics_recorded={"retention": True, "wage": 540000.0},
            notes="90-day apprenticeship milestone verified with clinical mentor."
        ),
        LongitudinalFollowUp(
            id="LFU-004-180",
            trainee_id="TRN-2024-004",
            trainee_name="Karthik Venkataraman",
            milestone_days=180,
            scheduled_date="2025-02-01",
            due_date="2025-02-05",
            status="overdue",
            pathway="apprenticeship",
            retention_confirmed=False,
            notes="Overdue follow-up check with clinical apprentice supervisor."
        ),

        # Deepa Menon (TRN-2024-007) - Unemployed
        LongitudinalFollowUp(
            id="LFU-007-30",
            trainee_id="TRN-2024-007",
            trainee_name="Deepa Menon",
            milestone_days=30,
            scheduled_date="2024-05-15",
            due_date="2024-05-20",
            completed_date="2024-05-18",
            status="completed",
            pathway="unemployed",
            retention_confirmed=False,
            metrics_recorded={"seeking_job": True, "interviews_attended": 2},
            notes="Graduate actively looking for data analyst openings. Needs interview practice intervention."
        ),

        # Farzana Parveen (TRN-2024-010) - Unreachable
        LongitudinalFollowUp(
            id="LFU-010-30",
            trainee_id="TRN-2024-010",
            trainee_name="Farzana Parveen",
            milestone_days=30,
            scheduled_date="2024-04-30",
            due_date="2024-05-05",
            status="unreachable",
            pathway="unreachable",
            retention_confirmed=False,
            notes="Phone disconnected, email returned 550 bounce. Contact attempts logged."
        )
    ]

    for fu in longitudinal_fus:
        if not db.query(Trainee).filter(Trainee.id == fu.trainee_id).first():
            continue
        if not db.query(LongitudinalFollowUp).filter(LongitudinalFollowUp.id == fu.id).first():
            db.add(fu)
    db.commit()

    # 5. Employer Feedback Verification Records
    employer_verifs = [
        EmployerFeedbackVerification(
            id="EFV-001",
            employer_id="EMP-01",
            employer_name="Apex Cloud Technologies India Pvt. Ltd.",
            reviewer_name="Sunita Rao",
            reviewer_role="VP of Talent & Apprenticeship Programs",
            reviewer_email="sunita.rao@apexcloud.co.in",
            trainee_id="TRN-2024-001",
            trainee_name="Priya Sharma",
            verification_status="confirmed",
            confirmed_role="Junior Frontend Engineer",
            confirmed_department="Core UI Platform",
            employment_type="Full-time",
            confirmed_start_date="2024-07-22",
            salary_range="₹8,40,000 - ₹9,50,000 / yr",
            is_still_employed=True,
            retention_months=9,
            skill_ratings={"React.js": 4.8, "TypeScript": 4.5, "Git": 4.6},
            average_skill_score=4.63,
            missing_technical_skills=["Docker containerization", "CI/CD automated testing"],
            missing_soft_skills=["Executive Stakeholder Communication"],
            training_relevance_rating=4.8,
            training_relevance_notes="Trainee arrived day-1 productive in React component architecture.",
            curriculum_recommendations="Add 1 week of containerization and GitHub Actions workflow modules.",
            would_hire_from_provider_again=True,
            evidence_level="multi_source_verified",
            verified_artifacts=["appointment_letter_signed.pdf", "epfo_electronic_challan_receipt.pdf"],
            submission_date="2024-09-12"
        ),
        EmployerFeedbackVerification(
            id="EFV-002",
            employer_id="EMP-04",
            employer_name="Vanguard Healthcare Networks India",
            reviewer_name="Dr. Mohanarangam Pillai",
            reviewer_role="Operations Director",
            reviewer_email="mpillai@vanguardhealth.co.in",
            trainee_id="TRN-2024-004",
            trainee_name="Karthik Venkataraman",
            verification_status="confirmed",
            confirmed_role="Healthcare Cybersecurity Systems Apprentice",
            confirmed_department="Clinical Informatics SOC",
            employment_type="Apprenticeship",
            confirmed_start_date="2024-08-01",
            salary_range="₹4,80,000 / yr",
            is_still_employed=True,
            retention_months=6,
            skill_ratings={"Network Security": 4.6, "CompTIA Protocols": 4.4},
            average_skill_score=4.5,
            missing_technical_skills=["Forensic Packet Analysis", "HL7/FHIR Security"],
            missing_soft_skills=["Emergency Clinical Escalation Protocol"],
            training_relevance_rating=4.6,
            training_relevance_notes="Very strong fundamentals in network hardening and access control.",
            would_hire_from_provider_again=True,
            evidence_level="employer_confirmed",
            verified_artifacts=["naps_contract_signed.pdf"],
            submission_date="2024-09-01"
        )
    ]

    for ev in employer_verifs:
        if not db.query(Trainee).filter(Trainee.id == ev.trainee_id).first():
            continue
        if not db.query(EmployerFeedbackVerification).filter(EmployerFeedbackVerification.id == ev.id).first():
            db.add(ev)
    db.commit()

    # 6. Synchronize Objective Confidence and Transparent Data Quality Scores for ALL Trainees
    all_trainees = db.query(Trainee).all()
    all_fus = db.query(LongitudinalFollowUp).all()
    all_vers = db.query(EmployerFeedbackVerification).all()
    all_evts = db.query(CareerTimelineEvent).all()

    fu_map: Dict[str, List[LongitudinalFollowUp]] = {}
    for f in all_fus:
        fu_map.setdefault(f.trainee_id, []).append(f)

    ver_map: Dict[str, List[EmployerFeedbackVerification]] = {}
    for v in all_vers:
        ver_map.setdefault(v.trainee_id, []).append(v)

    evt_map: Dict[str, List[CareerTimelineEvent]] = {}
    for e in all_evts:
        evt_map.setdefault(e.trainee_id, []).append(e)

    for trn in all_trainees:
        v_lvl = getattr(trn, "outcome_verification_level", None) or "UNVERIFIED"
        v_date = trn.outcome_last_verified_at or trn.placement_date
        src = trn.outcome_source or trn.current_employer or "Trainee Submission"
        conf = calculate_outcome_confidence(v_lvl, source=src, verified_at=v_date)
        trn.outcome_confidence = conf

        t_fus = fu_map.get(trn.id, [])
        t_vers = ver_map.get(trn.id, [])
        t_evts = evt_map.get(trn.id, [])

        dq = calculate_trainee_data_quality(trn, t_fus, t_vers, t_evts)
        trn.data_quality_score = dq["score"]
        trn.data_quality_breakdown = dq

    db.commit()
    logger.info("Successfully synchronized Longitudinal Outcome Intelligence & Data Quality audit layer.")


def seed_digital_twins(db: Session, force_reseed: bool = False):
    """Generates persistent Career Outcome Digital Twin representations for all seeded trainees."""
    from app.services.digital_twin_service import DigitalTwinService
    import gc
    trainees = db.query(Trainee).all()
    if not force_reseed:
        existing_twins_count = db.query(DigitalTwinState).count()
        if existing_twins_count >= len(trainees):
            logger.info(f"Career Outcome Digital Twin states already populated ({existing_twins_count} twins). Skipping.")
            return

    logger.info(f"Computing Career Outcome Digital Twin states for {len(trainees)} trainees...")
    for idx, t in enumerate(trainees):
        try:
            if not force_reseed and db.query(DigitalTwinState).filter(DigitalTwinState.trainee_id == t.id).first():
                continue
            DigitalTwinService.get_or_compute_twin(db, t.id, force_refresh=force_reseed)
            if idx % 50 == 0:
                db.commit()
        except Exception as e:
            logger.warning(f"Error computing digital twin for trainee {t.id}: {e}")
    db.commit()
    gc.collect()
    logger.info("Successfully seeded all Career Outcome Digital Twin representations.")



