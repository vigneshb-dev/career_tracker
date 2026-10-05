import sys
import logging
sys.path.insert(0, '.')

from sqlalchemy import text
from app.core.database import engine, SessionLocal
from app.core.security import get_password_hash, verify_password
from app.models.entities import User, CoachProfile, EmployerProfile, Company, TrainingInstitute, Course, Job

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migration")

def migrate_database_schema():
    logger.info("Starting schema migration for PostgreSQL database...")
    with engine.connect() as conn:
        # 1. coach_profiles missing columns
        conn.execute(text("""
            ALTER TABLE coach_profiles 
            ADD COLUMN IF NOT EXISTS training_institute_id VARCHAR(50) REFERENCES training_institutes(id) ON DELETE SET NULL,
            ADD COLUMN IF NOT EXISTS designation VARCHAR(100),
            ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'VERIFIED';
        """))
        conn.commit()
        logger.info("Migrated coach_profiles columns.")

        # 2. employer_profiles missing columns
        conn.execute(text("""
            ALTER TABLE employer_profiles 
            ADD COLUMN IF NOT EXISTS company_id VARCHAR(50) REFERENCES companies(id) ON DELETE SET NULL,
            ADD COLUMN IF NOT EXISTS department VARCHAR(100),
            ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'VERIFIED';
        """))
        conn.commit()
        logger.info("Migrated employer_profiles columns.")

        # 3. courses missing columns
        conn.execute(text("""
            ALTER TABLE courses 
            ADD COLUMN IF NOT EXISTS training_institute_id VARCHAR(50) REFERENCES training_institutes(id) ON DELETE CASCADE,
            ADD COLUMN IF NOT EXISTS category VARCHAR(100),
            ADD COLUMN IF NOT EXISTS duration VARCHAR(50),
            ADD COLUMN IF NOT EXISTS mode VARCHAR(50) DEFAULT 'Hybrid',
            ADD COLUMN IF NOT EXISTS eligibility VARCHAR(255),
            ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 30,
            ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active',
            ADD COLUMN IF NOT EXISTS created_by VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL;
        """))
        conn.commit()
        logger.info("Migrated courses columns.")

        # 4. jobs missing columns
        conn.execute(text("""
            ALTER TABLE jobs 
            ADD COLUMN IF NOT EXISTS company_id VARCHAR(50) REFERENCES companies(id) ON DELETE SET NULL,
            ADD COLUMN IF NOT EXISTS experience VARCHAR(100),
            ADD COLUMN IF NOT EXISTS created_by VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL;
        """))
        conn.commit()
        logger.info("Migrated jobs columns.")

def seed_missing_data():
    db = SessionLocal()
    try:
        # 1. Ensure Companies exist
        cmp1 = db.query(Company).filter_by(id="CMP-01").first()
        if not cmp1:
            cmp1 = Company(
                id="CMP-01",
                legal_name="Apex Cloud Technologies India Pvt. Ltd.",
                display_name="Apex Cloud Technologies",
                industry="Cloud Infrastructure & DevOps",
                description="Global enterprise cloud consulting and hyperscale platform partner.",
                location="Bengaluru, Karnataka, India",
                website="https://apexcloud.io",
                contact_email="recruiter@apexcloud.io",
                status="active",
                created_at="2024-01-01T00:00:00"
            )
            db.add(cmp1)

        cmp2 = db.query(Company).filter_by(id="CMP-02").first()
        if not cmp2:
            cmp2 = Company(
                id="CMP-02",
                legal_name="Meridian MedTech India Pvt. Ltd.",
                display_name="Meridian MedTech",
                industry="Healthcare & HealthTech Informatics",
                description="Clinical software engineering and biomedical IoT telemetry platforms.",
                location="Hyderabad, Telangana, India",
                website="https://meridianmedtech.co.in",
                contact_email="recruiter@meridianmedtech.co.in",
                status="active",
                created_at="2024-01-01T00:00:00"
            )
            db.add(cmp2)
        db.commit()

        # 2. Ensure Training Institutes exist
        inst1 = db.query(TrainingInstitute).filter_by(id="INST-01").first()
        if not inst1:
            inst1 = TrainingInstitute(
                id="INST-01",
                name="National Institute of Cloud & AI",
                description="Premier government-accredited digital workforce institute specialized in cloud systems.",
                location="Bengaluru, Karnataka, India",
                website="https://cloudai-institute.edu.in",
                contact_email="admissions@cloudai-institute.edu.in",
                status="active",
                created_at="2024-01-01T00:00:00"
            )
            db.add(inst1)

        inst2 = db.query(TrainingInstitute).filter_by(id="INST-02").first()
        if not inst2:
            inst2 = TrainingInstitute(
                id="INST-02",
                name="Meridian Health & Life Sciences Institute",
                description="Accredited medical computing, allied health technology, and bio-analytics academy.",
                location="Hyderabad, Telangana, India",
                website="https://meridianhealth-academy.edu.in",
                contact_email="info@meridianhealth-academy.edu.in",
                status="active",
                created_at="2024-01-01T00:00:00"
            )
            db.add(inst2)
        db.commit()

        # 3. Update Coach Profiles
        cp1 = db.query(CoachProfile).filter_by(id="CP-001").first()
        if cp1:
            cp1.training_institute_id = "INST-01"
            cp1.designation = cp1.title or "Lead Cloud & AI Workforce Coach"
            cp1.verification_status = "VERIFIED"

        cp2 = db.query(CoachProfile).filter_by(id="CP-002").first()
        if cp2:
            cp2.training_institute_id = "INST-02"
            cp2.designation = cp2.title or "Healthcare & Data Systems Coach"
            cp2.verification_status = "VERIFIED"
        db.commit()

        # 4. Update Employer Profiles
        ep1 = db.query(EmployerProfile).filter_by(id="EP-001").first()
        if ep1:
            ep1.company_id = "CMP-01"
            ep1.department = "Talent Acquisition & HR"
            ep1.verification_status = "VERIFIED"

        # Ensure Employer 2 User & Profile exist
        emp2_user = db.query(User).filter_by(email="recruiter@meridianmedtech.co.in").first()
        if not emp2_user:
            emp2_user = User(
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
            db.add(emp2_user)
            db.flush()
        else:
            emp2_user.hashed_password = get_password_hash("Employer@123456")
            emp2_user.is_active = True
            emp2_user.is_verified = True

        ep2 = db.query(EmployerProfile).filter_by(id="EP-002").first()
        if not ep2:
            ep2 = EmployerProfile(
                id="EP-002",
                user_id=emp2_user.id,
                company_id="CMP-02",
                employer_id="EMP-02",
                company_name="Meridian MedTech India Pvt. Ltd.",
                designation="Engineering Manager & Hiring Lead",
                department="Engineering",
                verification_status="VERIFIED",
                contact_phone="+91 40 4567 0189",
                authorized_candidate_ids=["TRN-2024-004", "TRN-2024-005"]
            )
            db.add(ep2)
        else:
            ep2.company_id = "CMP-02"
            ep2.department = "Engineering"
            ep2.verification_status = "VERIFIED"
        db.commit()

        # 5. Ensure admin@skilltrace.org exists alongside admin@skilltrace.gov
        admin_org = db.query(User).filter_by(email="admin@skilltrace.org").first()
        if not admin_org:
            admin_org = User(
                id="USR-ADMIN-002",
                email="admin@skilltrace.org",
                hashed_password=get_password_hash("Admin@123456"),
                role="ADMIN",
                full_name="Director Rajeshwar Rao",
                phone="+91 80 2345 6789",
                is_active=True,
                is_verified=True,
                created_at="2024-01-01T09:00:00"
            )
            db.add(admin_org)
        else:
            admin_org.hashed_password = get_password_hash("Admin@123456")
            admin_org.is_active = True
            admin_org.is_verified = True

        admin_gov = db.query(User).filter_by(email="admin@skilltrace.gov").first()
        if admin_gov:
            admin_gov.hashed_password = get_password_hash("Admin@123456")
            admin_gov.is_active = True
            admin_gov.is_verified = True

        # Refresh Coach Sarah & Coach Arun passwords
        c1 = db.query(User).filter_by(email="coach.sarah@skilltrace.org").first()
        if c1:
            c1.hashed_password = get_password_hash("Coach@123456")
            c1.is_active = True
            c1.is_verified = True

        c2 = db.query(User).filter_by(email="coach.arun@skilltrace.org").first()
        if c2:
            c2.hashed_password = get_password_hash("Coach@123456")
            c2.is_active = True
            c2.is_verified = True

        # Refresh Employer Sunita password
        e1 = db.query(User).filter_by(email="recruiter@apexcloud.io").first()
        if e1:
            e1.hashed_password = get_password_hash("Employer@123456")
            e1.is_active = True
            e1.is_verified = True

        # Refresh Trainee Priya password
        t1 = db.query(User).filter_by(email="priya.sharma@example.com").first()
        if t1:
            t1.hashed_password = get_password_hash("Trainee@123456")
            t1.is_active = True
            t1.is_verified = True

        # 6. Populate courses and jobs associations
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

        jobs = db.query(Job).all()
        for j in jobs:
            if not j.company_id:
                if j.employer_id == "EMP-01" or (j.employer_name and "Apex" in j.employer_name):
                    j.company_id = "CMP-01"
                elif j.employer_id == "EMP-02" or (j.employer_name and "Meridian" in j.employer_name):
                    j.company_id = "CMP-02"
                else:
                    j.company_id = "CMP-01"

        db.commit()
        logger.info("Successfully populated all organizations, users, profiles, courses, and jobs.")

    finally:
        db.close()

if __name__ == "__main__":
    migrate_database_schema()
    seed_missing_data()
    print("MIGRATION_AND_SEED_SUCCESS")
