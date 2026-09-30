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
            if clean_al:
                db.add(SkillAlias(
                    alias=clean_al,
                    canonical_skill_id=canonical_id,
                    canonical_name=canonical_name
                ))
    db.commit()
    logger.info("Competency Intelligence ontology successfully seeded.")

def seed_jobs_dataset(db: Session, force_reseed: bool = False):
    """Seeds 35 synthetic job postings with AI skill extraction, normalization, and occupation mappings."""
    if force_reseed:
        logger.info("Force reseed enabled for jobs dataset. Clearing existing jobs...")
        db.query(JobExtractedSkill).delete()
        db.query(Job).delete()
        db.commit()
    else:
        current_job_count = db.query(Job).count()
        if current_job_count >= 30:
            logger.info(f"Jobs dataset already seeded ({current_job_count} jobs). Skipping.")
            return

    logger.info("Seeding 35 AI-analyzed synthetic job descriptions across 7 domains...")
    for j_data in SYNTHETIC_JOBS_DATA:
        try:
            JobIntelligenceService.process_and_save_job(db, j_data)
        except Exception as e:
            logger.error(f"Error analyzing and saving job {j_data.get('id')}: {e}")
    logger.info("Successfully seeded synthetic job descriptions and extracted skills.")

def seed_database(db: Session, force_reseed: bool = False):
    # 1. Always ensure ontology is seeded
    seed_competency_ontology(db, force_reseed)

    # 2. Always ensure synthetic jobs dataset is seeded & analyzed
    seed_jobs_dataset(db, force_reseed)

    if force_reseed:
        logger.info("Force reseed enabled. Clearing old seed records...")
        db.query(TraineeSkillEvidence).delete()
        db.query(TraineeSkill).delete()
        db.query(Trainee).delete()
        db.query(Employer).delete()
        db.query(FollowUp).delete()
        db.query(SkillGap).delete()
        db.query(CareerPath).delete()
        db.commit()
    elif db.query(Trainee).first():
        logger.info("Trainee records already exist. Verifying skill evidence and users...")
        seed_trainee_skill_evidence(db)
        seed_users(db, force_reseed)
        return


    logger.info("Seeding complete Trainee Outcome Passport workforce dataset...")


    # 2. Employers
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
    db.add_all(employers_data)
    db.commit()

    # 4. Comprehensive Synthetic Trainees Representing All 6 Outcome Pathways:
    # 1) Employment, 2) Self-Employment, 3) Freelancing, 4) Apprenticeship, 5) Entrepreneurship, 6) Further Education
    trainees_data = [
        # --- 1. EMPLOYMENT ---
        Trainee(
            id="TRN-2024-001",
            full_name="Priya Sharma",
            email="priya.sharma@example.in",
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

    db.add_all(trainees_data)
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
    db.add_all(skills_map)
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
    db.add_all(followups_data)
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
    db.add_all(gaps_data)
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
    ]
    db.add_all(paths_data)
    db.commit()

    logger.info("Complete Trainee Outcome Passport database seeding successfully completed.")
    seed_trainee_skill_evidence(db, force_reseed=force_reseed)
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
    elif db.query(User).first():
        logger.info("Users already seeded. Skipping.")
        return

    logger.info("Seeding protected multi-role users (Admin, Coach, Employer, Trainee)...")

    # 1. Platform Admin (Provisioned account)
    admin_user = User(
        id="USR-ADMIN-001",
        email="admin@skilltrace.gov",
        hashed_password=get_password_hash("Admin@123456"),
        role="ADMIN",
        full_name="Director Rajeshwar Rao",
        phone="+91 80 2345 6789",
        is_active=True,
        is_verified=True,
        created_at="2024-01-01T09:00:00"
    )
    db.add(admin_user)

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
    db.add(coach_1)
    db.flush()
    db.add(CoachProfile(
        id="CP-001",
        user_id=coach_1.id,
        full_name="Sarah Jenkins",
        title="Lead Cloud & AI Workforce Coach",
        organization="National Skill Development Ecosystem",
        specialization="Cloud Infrastructure, Python Microservices & Full-Stack",
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
    db.add(coach_2)
    db.flush()
    db.add(CoachProfile(
        id="CP-002",
        user_id=coach_2.id,
        full_name="Arun Kumar",
        title="Healthcare & Data Systems Coach",
        organization="National Skill Development Ecosystem",
        specialization="Healthcare Informatics & Analytics",
        phone="+91 98450 44556",
        assigned_trainee_ids=["TRN-2024-004", "TRN-2024-005", "TRN-2024-006"]
    ))

    # 3. Employer
    employer_user = User(
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
    db.add(employer_user)
    db.flush()
    db.add(EmployerProfile(
        id="EP-001",
        user_id=employer_user.id,
        employer_id="EMP-01",
        company_name="Apex Cloud Technologies India Pvt. Ltd.",
        designation="VP of Talent & Apprenticeship Programs",
        contact_phone="+91 80 4123 0144",
        authorized_candidate_ids=["TRN-2024-001", "TRN-2024-004"]
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
    db.add(t1_user)
    db.flush()
    db.add(TraineeProfile(
        id="TP-001",
        user_id=t1_user.id,
        trainee_id="TRN-2024-001",
        headline="Full Stack Cloud & AI Engineer Trainee",
        bio="Passionate developer specializing in React, Python, and cloud microservices.",
        education="B.Tech in Computer Science & Engineering",
        experience_years=0.5,
        assigned_coach_id="USR-COACH-001",
        resume_filename="Priya_Sharma_Resume.pdf",
        resume_url="/uploads/resumes/Priya_Sharma_Resume.pdf",
        resume_parsed_skills=["React.js", "Python", "TypeScript", "PostgreSQL", "Docker"]
    ))

    # Link trainee record to user_id
    t1_record = db.query(Trainee).filter(Trainee.id == "TRN-2024-001").first()
    if t1_record:
        t1_record.user_id = t1_user.id

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
    db.add(t2_user)
    db.flush()
    db.add(TraineeProfile(
        id="TP-002",
        user_id=t2_user.id,
        trainee_id="TRN-2024-002",
        headline="Cloud Solutions Architecture Apprentice",
        bio="Designing scalable multi-cloud infrastructure and DevOps delivery pipelines.",
        education="B.Tech in Information Technology",
        experience_years=1.0,
        assigned_coach_id="USR-COACH-001",
        resume_filename="Rajesh_Kumar_Resume.pdf",
        resume_url="/uploads/resumes/Rajesh_Kumar_Resume.pdf",
        resume_parsed_skills=["AWS Architecture", "Docker", "Kubernetes", "Terraform", "CI/CD"]
    ))
    t2_record = db.query(Trainee).filter(Trainee.id == "TRN-2024-002").first()
    if t2_record:
        t2_record.user_id = t2_user.id

    db.commit()
    logger.info("Successfully seeded multi-role users and role profiles.")


