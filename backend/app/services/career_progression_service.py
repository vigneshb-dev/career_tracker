import logging
from datetime import datetime, timedelta, date
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.entities import (
    Trainee,
    CareerTimelineEvent,
    LongitudinalFollowUp,
    CareerPath,
    Employer
)
from app.core.celery_app import (
    schedule_longitudinal_milestones_task,
    automated_follow_up_sweep_task
)

logger = logging.getLogger("skilltrace.career_progression")

# Standardized Pathways (System does NOT assume success means only salaried employment)
VALID_PATHWAYS = [
    "employment",
    "self_employment",
    "freelancing",
    "apprenticeship",
    "entrepreneurship",
    "further_education",
    "unknown"
]

PATHWAY_LABELS = {
    "employment": "Salaried Employment",
    "self_employment": "Self-Employment & LLC",
    "freelancing": "Independent Freelancing",
    "apprenticeship": "Registered Apprenticeship",
    "entrepreneurship": "Venture Entrepreneurship",
    "further_education": "Further Education / Research",
    "unknown": "Outcome Unknown"
}


class CareerProgressionService:

    @classmethod
    def seed_career_data(cls, db: Session, force_reseed: bool = False):
        """Seeds initial career timeline events and longitudinal follow-ups for synthetic trainees."""
        existing_events_count = db.query(CareerTimelineEvent).count()
        if not force_reseed and existing_events_count >= 15:
            logger.info(f"Career progression data already seeded ({existing_events_count} events). Skipping.")
            return

        if force_reseed:
            db.query(CareerTimelineEvent).delete()
            db.query(LongitudinalFollowUp).delete()
            db.commit()

        logger.info("Seeding comprehensive Career Timelines and Longitudinal Milestones across all 6 pathways + Unknown...")

        # -------------------------------------------------------------
        # 1. TRN-2024-001 (Elena Rostova - Employment)
        # -------------------------------------------------------------
        events_trn1 = [
            CareerTimelineEvent(
                id="EVT-TRN1-01",
                trainee_id="TRN-2024-001",
                trainee_name="Elena Rostova",
                stage="training",
                pathway="employment",
                title="Enrolled in Full-Stack Enterprise React & Cloud Web Services",
                organization="Austin Tech Institute of Technology",
                event_date="2024-01-15",
                metrics={
                    "accreditation": "State Workforce Commission (TWC)",
                    "hours_completed": 720,
                    "attendance_rate": "98.4%",
                    "capstone_grade": "A+"
                },
                verification_status="verified",
                verification_notes="State training transcript and certificate of completion verified.",
                sequence_order=1
            ),
            CareerTimelineEvent(
                id="EVT-TRN1-02",
                trainee_id="TRN-2024-001",
                trainee_name="Elena Rostova",
                stage="first_outcome",
                pathway="employment",
                title="Hired as Software Engineering Apprentice",
                organization="Apex Cloud Solutions",
                event_date="2024-06-01",
                metrics={
                    "job_role": "Software Engineering Apprentice",
                    "employer": "Apex Cloud Solutions",
                    "salary_range": "$28.00 / hr ($58,240 annualized)",
                    "employment_type": "Full-Time Apprenticeship",
                    "retention": "Completed 10-Week Rotation"
                },
                verification_status="verified",
                verification_notes="Initial internship offer letter and payroll verification.",
                sequence_order=2
            ),
            CareerTimelineEvent(
                id="EVT-TRN1-03",
                trainee_id="TRN-2024-001",
                trainee_name="Elena Rostova",
                stage="current_status",
                pathway="employment",
                title="Converted to Salaried Junior Frontend Engineer",
                organization="Apex Cloud Solutions",
                event_date="2024-07-22",
                metrics={
                    "job_role": "Junior Frontend Engineer",
                    "employer": "Apex Cloud Solutions",
                    "salary_range": "$84,000 / yr + Medical/401(k)",
                    "retention": "6-Month Verified Retention",
                    "promotion": "Apprentice to Permanent Staff"
                },
                verification_status="verified",
                verification_notes="Full-time W-2 employment agreement verified by employer portal.",
                is_current=True,
                sequence_order=3
            ),
            CareerTimelineEvent(
                id="EVT-TRN1-04",
                trainee_id="TRN-2024-001",
                trainee_name="Elena Rostova",
                stage="career_event",
                pathway="employment",
                title="Shipped Enterprise Multi-Tenant Billing UI to Production",
                organization="Apex Cloud Solutions",
                event_date="2024-08-30",
                metrics={
                    "job_role": "Junior Frontend Engineer",
                    "employer": "Apex Cloud Solutions",
                    "impact": "Automated recurring invoicing for 1,400 business clients",
                    "mentor_evaluation": "5.0 / 5.0 Star Rating"
                },
                verification_status="verified",
                verification_notes="Supervisor quarterly performance appraisal.",
                sequence_order=4
            ),
            CareerTimelineEvent(
                id="EVT-TRN1-05",
                trainee_id="TRN-2024-001",
                trainee_name="Elena Rostova",
                stage="progression",
                pathway="employment",
                title="Promoted to Frontend Software Engineer II",
                organization="Apex Cloud Solutions",
                event_date="2024-12-15",
                metrics={
                    "job_role": "Frontend Software Engineer II",
                    "employer": "Apex Cloud Solutions",
                    "salary_range": "$96,000 / yr (+14.3% Wage Progression)",
                    "retention": "12-Month Projected Retention",
                    "promotion": "Early Promotion based on technical velocity"
                },
                verification_status="verified",
                verification_notes="Official promotion notice and wage adjustment amendment.",
                sequence_order=5
            ),
        ]

        # -------------------------------------------------------------
        # 2. TRN-2024-002 (Marcus Vance - Self-Employment)
        # -------------------------------------------------------------
        events_trn2 = [
            CareerTimelineEvent(
                id="EVT-TRN2-01",
                trainee_id="TRN-2024-002",
                trainee_name="Marcus Vance",
                stage="training",
                pathway="self_employment",
                title="Completed Enterprise Cloud Architecture & Distributed Systems",
                organization="Midwest Cloud Academy",
                event_date="2024-07-15",
                metrics={
                    "accreditation": "Illinois Board of Higher Education (IBHE)",
                    "hours_completed": 680,
                    "certification": "CKA Certified Kubernetes Administrator"
                },
                verification_status="verified",
                sequence_order=1
            ),
            CareerTimelineEvent(
                id="EVT-TRN2-02",
                trainee_id="TRN-2024-002",
                trainee_name="Marcus Vance",
                stage="first_outcome",
                pathway="self_employment",
                title="Formed & Registered Vance Cloud Architecture LLC",
                organization="Vance Cloud Architecture LLC",
                event_date="2024-08-01",
                metrics={
                    "trade_service": "Cloud DevOps & Kubernetes Consulting",
                    "business_name": "Vance Cloud Architecture LLC",
                    "client_base": "1 Initial Regional Logistics Client",
                    "monthly_earnings": "$4,500 / mo",
                    "operating_status": "Formed & In Good Standing"
                },
                verification_status="verified",
                verification_notes="Illinois Secretary of State LLC Certificate of Good Standing.",
                sequence_order=2
            ),
            CareerTimelineEvent(
                id="EVT-TRN2-03",
                trainee_id="TRN-2024-002",
                trainee_name="Marcus Vance",
                stage="current_status",
                pathway="self_employment",
                title="Principal Cloud Architect & Independent Business Owner",
                organization="Vance Cloud Architecture LLC",
                event_date="2024-09-01",
                metrics={
                    "trade_service": "Containerization, Cloud Failover & DevOps Retainers",
                    "business_name": "Vance Cloud Architecture LLC",
                    "client_base": "3 Recurring Enterprise Retainers",
                    "monthly_earnings": "$8,500 / mo ($102,000 / yr run rate)",
                    "operating_status": "Active & Self-Sustaining"
                },
                verification_status="verified",
                verification_notes="Bank statements and executed consulting retainers audited by workforce counselor.",
                is_current=True,
                sequence_order=3
            ),
            CareerTimelineEvent(
                id="EVT-TRN2-04",
                trainee_id="TRN-2024-002",
                trainee_name="Marcus Vance",
                stage="progression",
                pathway="self_employment",
                title="Expanded Practice to Multi-Cloud Migrations (5 Retainers)",
                organization="Vance Cloud Architecture LLC",
                event_date="2025-01-10",
                metrics={
                    "trade_service": "Enterprise Cloud Architecture",
                    "business_name": "Vance Cloud Architecture LLC",
                    "client_base": "5 Retainer Clients",
                    "monthly_earnings": "$11,200 / mo ($134,400 / yr)",
                    "operating_status": "Scaling towards subcontracting associate engineers"
                },
                verification_status="verified",
                sequence_order=4
            ),
        ]

        # -------------------------------------------------------------
        # 3. TRN-2024-003 (Sophia Martinez - Freelancing)
        # -------------------------------------------------------------
        events_trn3 = [
            CareerTimelineEvent(
                id="EVT-TRN3-01",
                trainee_id="TRN-2024-003",
                trainee_name="Sophia Martinez",
                stage="training",
                pathway="freelancing",
                title="Completed Agile Web Engineering & Freelance Practice",
                organization="Rocky Mountain Code Academy",
                event_date="2024-03-31",
                metrics={
                    "hours_completed": 700,
                    "specialization": "FastAPI + React SaaS Prototypes"
                },
                verification_status="verified",
                sequence_order=1
            ),
            CareerTimelineEvent(
                id="EVT-TRN3-02",
                trainee_id="TRN-2024-003",
                trainee_name="Sophia Martinez",
                stage="first_outcome",
                pathway="freelancing",
                title="Launched Independent Contracting Portfolio & Upwork Pro",
                organization="Independent Freelance Practice",
                event_date="2024-04-15",
                metrics={
                    "active_status": "Active Freelance Contractor",
                    "projects": "3 Initial Client Milestones",
                    "income_range": "$50.00 / hr ($3,800 first month)",
                    "client_satisfaction_rate": "100% 5-Star"
                },
                verification_status="verified",
                sequence_order=2
            ),
            CareerTimelineEvent(
                id="EVT-TRN3-03",
                trainee_id="TRN-2024-003",
                trainee_name="Sophia Martinez",
                stage="current_status",
                pathway="freelancing",
                title="Upwork Top Rated Plus Full-Stack Contractor",
                organization="Independent Freelance (Direct + Upwork)",
                event_date="2024-08-10",
                metrics={
                    "active_status": "Top Rated Plus (Top 3% of Global Talent)",
                    "projects": "18 Completed Client Projects",
                    "income_range": "$68.00 / hr ($7,200/mo avg net)",
                    "client_satisfaction_rate": "100% Job Success Score"
                },
                verification_status="verified",
                verification_notes="Audited platform ledger: $42,500 collected in first 5 months.",
                is_current=True,
                sequence_order=3
            ),
            CareerTimelineEvent(
                id="EVT-TRN3-04",
                trainee_id="TRN-2024-003",
                trainee_name="Sophia Martinez",
                stage="progression",
                pathway="freelancing",
                title="Elevated Hourly Rate to $85/hr & Transition to Agency",
                organization="Sophia Martinez Engineering Studio",
                event_date="2024-11-20",
                metrics={
                    "active_status": "Boutique Dev Studio Lead",
                    "projects": "24 Completed Projects",
                    "income_range": "$85.00 / hr ($9,500/mo net)",
                    "client_satisfaction_rate": "100% Repeat Client Ratio: 65%"
                },
                verification_status="verified",
                sequence_order=4
            ),
        ]

        # -------------------------------------------------------------
        # 4. TRN-2024-004 (Devon Harper - Apprenticeship)
        # -------------------------------------------------------------
        events_trn4 = [
            CareerTimelineEvent(
                id="EVT-TRN4-01",
                trainee_id="TRN-2024-004",
                trainee_name="Devon Harper",
                stage="training",
                pathway="apprenticeship",
                title="Completed Healthcare Cyber Defense & Threat Intelligence",
                organization="Commonwealth Cybersecurity Training Center",
                event_date="2024-07-15",
                metrics={"hours_completed": 750, "cert": "CompTIA Security+"},
                verification_status="verified",
                sequence_order=1
            ),
            CareerTimelineEvent(
                id="EVT-TRN4-02",
                trainee_id="TRN-2024-004",
                trainee_name="Devon Harper",
                stage="first_outcome",
                pathway="apprenticeship",
                title="Enrolled in USDOL Registered Healthcare Cybersecurity Apprenticeship",
                organization="Vanguard Health Systems",
                event_date="2024-08-01",
                metrics={
                    "organization": "Vanguard Health Systems (USDOL Registered Sponsor)",
                    "duration": "2-Year Registered Term (4,000 Hours Total)",
                    "conversion": "Contractual conversion upon passing milestone",
                    "starting_wage": "$32.50 / hr + Tuition Reimbursement"
                },
                verification_status="verified",
                verification_notes="USDOL RAPIDS Registration #81920 verified.",
                sequence_order=2
            ),
            CareerTimelineEvent(
                id="EVT-TRN4-03",
                trainee_id="TRN-2024-004",
                trainee_name="Devon Harper",
                stage="current_status",
                pathway="apprenticeship",
                title="Year 1 Cyber Operations Apprentice (Medical Device Defense)",
                organization="Vanguard Health Systems",
                event_date="2024-09-01",
                metrics={
                    "organization": "Vanguard Health Systems",
                    "duration": "1,200 of 2,000 Year 1 Hours Completed",
                    "conversion": "On Track for Full-Time Conversion (Target: Q3 2025)",
                    "current_wage": "$32.50 / hr ($67,600/yr)"
                },
                verification_status="verified",
                is_current=True,
                sequence_order=3
            ),
            CareerTimelineEvent(
                id="EVT-TRN4-04",
                trainee_id="TRN-2024-004",
                trainee_name="Devon Harper",
                stage="progression",
                pathway="apprenticeship",
                title="Passed Year 1 Gateway Review & Wage Step Increase (+10%)",
                organization="Vanguard Health Systems",
                event_date="2025-01-15",
                metrics={
                    "organization": "Vanguard Health Systems",
                    "duration": "1,600 Hours Completed",
                    "conversion": "Apprenticeship Committee Approved Wage Step",
                    "current_wage": "$35.75 / hr ($74,360/yr)"
                },
                verification_status="verified",
                sequence_order=4
            ),
        ]

        # -------------------------------------------------------------
        # 5. TRN-2024-005 (Tariq Al-Jamil - Entrepreneurship)
        # -------------------------------------------------------------
        events_trn5 = [
            CareerTimelineEvent(
                id="EVT-TRN5-01",
                trainee_id="TRN-2024-005",
                trainee_name="Tariq Al-Jamil",
                stage="training",
                pathway="entrepreneurship",
                title="Completed Applied AI Engineering & Venture Commercialization",
                organization="Silicon Valley Data Institute",
                event_date="2024-04-12",
                metrics={"hours_completed": 720, "capstone": "AI Oncology Diagnostic Tool"},
                verification_status="verified",
                sequence_order=1
            ),
            CareerTimelineEvent(
                id="EVT-TRN5-02",
                trainee_id="TRN-2024-005",
                trainee_name="Tariq Al-Jamil",
                stage="first_outcome",
                pathway="entrepreneurship",
                title="Incorporated Startup: OmniTrace Diagnostics Inc. (Delaware C-Corp)",
                organization="OmniTrace Diagnostics Inc.",
                event_date="2024-05-01",
                metrics={
                    "business_status": "Incorporated C-Corp / Pre-Seed",
                    "sector": "Healthcare AI / Clinical Workflow",
                    "revenue_range": "$250,000 State Technology Commercialization Grant",
                    "employees": "2 Co-Founders"
                },
                verification_status="verified",
                verification_notes="Delaware Certificate of Incorporation and Grant Agreement.",
                sequence_order=2
            ),
            CareerTimelineEvent(
                id="EVT-TRN5-03",
                trainee_id="TRN-2024-005",
                trainee_name="Tariq Al-Jamil",
                stage="current_status",
                pathway="entrepreneurship",
                title="Founder & Chief Executive Officer",
                organization="OmniTrace Diagnostics Inc.",
                event_date="2024-08-01",
                metrics={
                    "business_status": "Active / Accelerating in HealthTech Incubator",
                    "sector": "Oncology Imaging AI",
                    "revenue_range": "$250k Grant + $12,500 MRR from Pilot Clinics",
                    "employees": "4 Full-Time (including 2 workforce apprentice hires)"
                },
                verification_status="verified",
                is_current=True,
                sequence_order=3
            ),
            CareerTimelineEvent(
                id="EVT-TRN5-04",
                trainee_id="TRN-2024-005",
                trainee_name="Tariq Al-Jamil",
                stage="progression",
                pathway="entrepreneurship",
                title="Closed $1.2M Seed Round with Institutional Healthcare Syndicate",
                organization="OmniTrace Diagnostics Inc.",
                event_date="2025-02-01",
                metrics={
                    "business_status": "Venture Seed Funded",
                    "sector": "Healthcare AI",
                    "revenue_range": "$1.2M Seed Capital + $28,000 MRR",
                    "employees": "7 Full-Time Engineers & Regulatory Specialists"
                },
                verification_status="verified",
                sequence_order=4
            ),
        ]

        # -------------------------------------------------------------
        # 6. TRN-2024-006 (Aisha Al-Mansoor - Further Education / Research)
        # -------------------------------------------------------------
        events_trn6 = [
            CareerTimelineEvent(
                id="EVT-TRN6-01",
                trainee_id="TRN-2024-006",
                trainee_name="Aisha Al-Mansoor",
                stage="training",
                pathway="further_education",
                title="Graduated Applied Statistical Learning & Neural Network Topologies",
                organization="Northeast Data Academy",
                event_date="2024-04-12",
                metrics={"hours_completed": 720, "gpa_equivalent": "3.95"},
                verification_status="verified",
                sequence_order=1
            ),
            CareerTimelineEvent(
                id="EVT-TRN6-02",
                trainee_id="TRN-2024-006",
                trainee_name="Aisha Al-Mansoor",
                stage="first_outcome",
                pathway="further_education",
                title="Awarded Merit Fellowship for M.Sc. in Data Science",
                organization="Northeastern University Khoury College",
                event_date="2024-08-25",
                metrics={
                    "programme": "Master of Science in Data Science (BioNLP Track)",
                    "institution": "Northeastern University Khoury College of Computer Sciences",
                    "current_status": "Enrolled Full-Time Graduate Fellow",
                    "funding": "100% Tuition Waiver + $34,000 / yr Research Stipend"
                },
                verification_status="verified",
                verification_notes="University fellowship award letter and registrar enrollment certification.",
                sequence_order=2
            ),
            CareerTimelineEvent(
                id="EVT-TRN6-03",
                trainee_id="TRN-2024-006",
                trainee_name="Aisha Al-Mansoor",
                stage="current_status",
                pathway="further_education",
                title="Graduate Research Fellow & Clinical NLP Project Lead",
                organization="Northeastern University & Boston Children's Hospital",
                event_date="2024-09-15",
                metrics={
                    "programme": "M.Sc. in Data Science (2nd Semester)",
                    "institution": "Northeastern University",
                    "current_status": "Lead Author on Healthcare Vector Search Paper",
                    "expected_completion": "May 2026"
                },
                verification_status="verified",
                is_current=True,
                sequence_order=3
            ),
            CareerTimelineEvent(
                id="EVT-TRN6-04",
                trainee_id="TRN-2024-006",
                trainee_name="Aisha Al-Mansoor",
                stage="progression",
                pathway="further_education",
                title="Admitted to Ph.D. Fast-Track Program in Biomedical Informatics",
                organization="Harvard-MIT Health Sciences & Technology Affiliation",
                event_date="2025-01-20",
                metrics={
                    "programme": "Ph.D. Biomedical Informatics",
                    "institution": "Harvard-MIT / Northeastern Partnership",
                    "current_status": "Doctoral Research Fellow",
                    "funding": "Fully Funded 5-Year NIH Training Grant ($42,000/yr stipend)"
                },
                verification_status="verified",
                sequence_order=4
            ),
        ]

        # -------------------------------------------------------------
        # 7. TRN-2024-007 (Jordan Miller - OUTCOME UNKNOWN)
        # -------------------------------------------------------------
        # Ensure Trainee TRN-2024-007 exists in database
        trn7 = db.query(Trainee).filter(Trainee.id == "TRN-2024-007").first()
        if not trn7:
            trn7 = Trainee(
                id="TRN-2024-007",
                full_name="Jordan Miller",
                email="jordan.miller@example.com",
                phone="+1 (555) 601-2944",
                avatar_url="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
                location="Austin, TX",
                bio="Workforce candidate completed introductory web development coursework. Relocated out-of-district with contact details pending update.",
                program="Full-Stack Software Engineering",
                cohort="Cohort 2024-A",
                status="graduated",
                primary_outcome_type="unknown",
                enrollment_date="2023-10-15",
                graduation_date="2024-04-30",
                training_details={
                    "provider_name": "Austin Tech Institute",
                    "course_title": "Full-Stack Web Foundations",
                    "attendance_rate": "91.2%",
                    "hours_completed": 600
                },
                current_role="Outcome Pending Verification",
                current_employer="Unknown / Unreachable",
                overall_score=76,
                match_score=70,
                last_follow_up="2024-08-30",
                next_follow_up="2024-11-30",
                notes="Status marked as Outcome Unknown. 3 outreach attempts by counselor unreturned. Scheduled for cross-agency wage matching audit."
            )
            db.add(trn7)
            db.commit()

        events_trn7 = [
            CareerTimelineEvent(
                id="EVT-TRN7-01",
                trainee_id="TRN-2024-007",
                trainee_name="Jordan Miller",
                stage="training",
                pathway="unknown",
                title="Completed Full-Stack Web Foundations Coursework",
                organization="Austin Tech Institute",
                event_date="2024-04-30",
                metrics={"hours_completed": 600, "status": "Certificate Awarded"},
                verification_status="verified",
                sequence_order=1
            ),
            CareerTimelineEvent(
                id="EVT-TRN7-02",
                trainee_id="TRN-2024-007",
                trainee_name="Jordan Miller",
                stage="current_status",
                pathway="unknown",
                title="Outcome Unknown — Contact Audit in Progress",
                organization="Workforce Longitudinal Tracking Unit",
                event_date="2024-08-30",
                metrics={
                    "last_contact_attempt": "2024-08-30 (Phone & Certified Email)",
                    "unreachable_reason": "Unresponsive to 30-day and 90-day follow-up outreach",
                    "follow_up_priority": "High / Escalated to State Unemployment Insurance Wage Record Match",
                    "status_label": "Outcome Unknown"
                },
                verification_status="unknown",
                verification_notes="No active employment, business license, or higher education enrollment verified yet.",
                is_current=True,
                sequence_order=2
            ),
        ]

        all_events = events_trn1 + events_trn2 + events_trn3 + events_trn4 + events_trn5 + events_trn6 + events_trn7
        db.add_all(all_events)
        db.commit()

        # Seed automated longitudinal 30 / 90 / 180 / 365 day follow-ups for all trainees
        all_trainees = db.query(Trainee).all()
        for t in all_trainees:
            schedule_longitudinal_milestones_task(
                trainee_id=t.id,
                graduation_date_str=t.graduation_date or "2024-06-30",
                pathway=t.primary_outcome_type or "employment"
            )

        logger.info("Career timeline events and longitudinal follow-ups seeded successfully.")

    @classmethod
    def get_trainee_career_timeline(cls, db: Session, trainee_id: str) -> Dict[str, Any]:
        """
        Builds the 5-stage career timeline:
        Training -> First Outcome -> Current Status -> Career Events -> Progression
        with pathway-specific metrics.
        """
        trainee = db.query(Trainee).filter(Trainee.id == trainee_id).first()
        if not trainee:
            raise ValueError(f"Trainee '{trainee_id}' not found.")

        # Ensure events are populated
        events = db.query(CareerTimelineEvent).filter(
            CareerTimelineEvent.trainee_id == trainee.id
        ).order_by(CareerTimelineEvent.sequence_order.asc(), CareerTimelineEvent.event_date.asc()).all()

        if not events:
            cls.seed_career_data(db)
            events = db.query(CareerTimelineEvent).filter(
                CareerTimelineEvent.trainee_id == trainee.id
            ).order_by(CareerTimelineEvent.sequence_order.asc(), CareerTimelineEvent.event_date.asc()).all()

        # Group by the 5 chronological stages
        stages_data = {
            "training": None,
            "first_outcome": None,
            "current_status": None,
            "career_events": [],
            "progression": None
        }

        all_events_list = []
        for ev in events:
            item = {
                "id": ev.id,
                "stage": ev.stage,
                "pathway": ev.pathway,
                "pathway_label": PATHWAY_LABELS.get(ev.pathway, ev.pathway.title()),
                "title": ev.title,
                "organization": ev.organization,
                "event_date": ev.event_date,
                "metrics": ev.metrics or {},
                "verification_status": ev.verification_status,
                "verification_notes": ev.verification_notes,
                "is_current": ev.is_current,
                "sequence_order": ev.sequence_order
            }
            all_events_list.append(item)

            if ev.stage == "training" and not stages_data["training"]:
                stages_data["training"] = item
            elif ev.stage == "first_outcome" and not stages_data["first_outcome"]:
                stages_data["first_outcome"] = item
            elif ev.stage == "current_status" or ev.is_current:
                stages_data["current_status"] = item
            elif ev.stage == "progression" and not stages_data["progression"]:
                stages_data["progression"] = item
            elif ev.stage in ["career_event", "progression"]:
                stages_data["career_events"].append(item)

        # Fallback if specific stage is empty
        if not stages_data["current_status"] and all_events_list:
            stages_data["current_status"] = all_events_list[-1]

        # Fetch longitudinal follow-up milestones (30 / 90 / 180 / 365 days)
        follow_ups = db.query(LongitudinalFollowUp).filter(
            LongitudinalFollowUp.trainee_id == trainee.id
        ).order_by(LongitudinalFollowUp.milestone_days.asc()).all()

        milestones_list = []
        for fu in follow_ups:
            milestones_list.append({
                "id": fu.id,
                "milestone_days": fu.milestone_days,
                "milestone_label": f"{fu.milestone_days}-Day Audit",
                "scheduled_date": fu.scheduled_date,
                "due_date": fu.due_date,
                "completed_date": fu.completed_date,
                "status": fu.status,
                "pathway": fu.pathway,
                "retention_confirmed": fu.retention_confirmed,
                "metrics_recorded": fu.metrics_recorded or {},
                "notes": fu.notes,
                "survey_link": fu.survey_link
            })

        return {
            "trainee_id": trainee.id,
            "trainee_name": trainee.full_name,
            "program": trainee.program,
            "primary_outcome_type": trainee.primary_outcome_type,
            "pathway_label": PATHWAY_LABELS.get(trainee.primary_outcome_type, trainee.primary_outcome_type.title()),
            "current_role": trainee.current_role,
            "current_employer": trainee.current_employer,
            "placement_salary": trainee.placement_salary,
            "enrollment_date": trainee.enrollment_date,
            "graduation_date": trainee.graduation_date,
            "timeline_stages": stages_data,
            "all_events": all_events_list,
            "longitudinal_milestones": milestones_list
        }

    @classmethod
    def get_pathways_executive_summary(cls, db: Session) -> Dict[str, Any]:
        """
        Calculates workforce longitudinal metrics across all 7 pathways:
        Employment, Self-Employment, Freelancing, Apprenticeship, Entrepreneurship, Further Education, and Unknown.
        """
        trainees = db.query(Trainee).all()
        total_count = len(trainees)

        distribution: Dict[str, int] = {p: 0 for p in VALID_PATHWAYS}
        for t in trainees:
            p = t.primary_outcome_type or "unknown"
            if p in distribution:
                distribution[p] += 1
            else:
                distribution["unknown"] += 1

        # Calculate retention rates & outcomes
        follow_ups = db.query(LongitudinalFollowUp).all()
        completed_audits = [f for f in follow_ups if f.status == "completed"]
        retained_audits = [f for f in completed_audits if f.retention_confirmed]
        overall_retention_rate = round((len(retained_audits) / max(1, len(completed_audits))) * 100, 1)

        # Milestone completion status
        milestone_stats = {
            "day_30": {"total": 0, "completed": 0, "retained": 0},
            "day_90": {"total": 0, "completed": 0, "retained": 0},
            "day_180": {"total": 0, "completed": 0, "retained": 0},
            "day_365": {"total": 0, "completed": 0, "retained": 0},
        }

        for f in follow_ups:
            key = f"day_{f.milestone_days}"
            if key in milestone_stats:
                milestone_stats[key]["total"] += 1
                if f.status == "completed":
                    milestone_stats[key]["completed"] += 1
                    if f.retention_confirmed:
                        milestone_stats[key]["retained"] += 1

        # Format breakdown list for visual dashboard
        pathway_breakdown = []
        palette = {
            "employment": "#2563eb",
            "self_employment": "#0284c7",
            "freelancing": "#0d9488",
            "apprenticeship": "#7c3aed",
            "entrepreneurship": "#d97706",
            "further_education": "#059669",
            "unknown": "#e11d48"
        }

        for p in VALID_PATHWAYS:
            count = distribution[p]
            pct = round((count / max(1, total_count)) * 100, 1)
            pathway_breakdown.append({
                "pathway": p,
                "label": PATHWAY_LABELS.get(p, p.title()),
                "count": count,
                "percentage": pct,
                "color": palette.get(p, "#64748b")
            })

        return {
            "total_trainees": total_count,
            "overall_retention_rate": overall_retention_rate,
            "unknown_outcome_count": distribution.get("unknown", 0),
            "unknown_outcome_percent": round((distribution.get("unknown", 0) / max(1, total_count)) * 100, 1),
            "positive_outcomes_count": total_count - distribution.get("unknown", 0),
            "positive_outcomes_percent": round(((total_count - distribution.get("unknown", 0)) / max(1, total_count)) * 100, 1),
            "pathway_distribution": pathway_breakdown,
            "milestone_retention_funnel": milestone_stats
        }

    @classmethod
    def record_career_event(
        cls,
        db: Session,
        trainee_id: str,
        stage: str,
        pathway: str,
        title: str,
        organization: str,
        event_date: str,
        metrics: Dict[str, Any],
        verification_status: str = "verified",
        verification_notes: Optional[str] = None,
        is_current: bool = False
    ) -> CareerTimelineEvent:
        """Records a new career event and updates current trainee status if designated."""
        trainee = db.query(Trainee).filter(Trainee.id == trainee_id).first()
        if not trainee:
            raise ValueError(f"Trainee '{trainee_id}' not found.")

        # Determine next sequence order
        last_event = db.query(CareerTimelineEvent).filter(
            CareerTimelineEvent.trainee_id == trainee.id
        ).order_by(CareerTimelineEvent.sequence_order.desc()).first()
        next_seq = (last_event.sequence_order + 1) if last_event else 1

        if is_current:
            # Unset is_current on existing events
            db.query(CareerTimelineEvent).filter(
                CareerTimelineEvent.trainee_id == trainee.id
            ).update({"is_current": False})

            # Update trainee entity current role & primary pathway
            trainee.primary_outcome_type = pathway
            if pathway == "employment":
                trainee.current_role = metrics.get("job_role", title)
                trainee.current_employer = organization
                if "salary_range" in metrics:
                    trainee.placement_salary = metrics["salary_range"]
            elif pathway == "self_employment":
                trainee.current_role = "Principal Consultant / Owner"
                trainee.current_employer = organization
            elif pathway == "freelancing":
                trainee.current_role = "Independent Contractor"
                trainee.current_employer = "Freelance Portfolio"
            elif pathway == "apprenticeship":
                trainee.current_role = metrics.get("job_role", "Registered Apprentice")
                trainee.current_employer = organization
            elif pathway == "entrepreneurship":
                trainee.current_role = "Founder & CEO"
                trainee.current_employer = organization
            elif pathway == "further_education":
                trainee.current_role = metrics.get("programme", "Graduate Student / Fellow")
                trainee.current_employer = organization
            elif pathway == "unknown":
                trainee.current_role = "Outcome Unknown"
                trainee.current_employer = "Unverified"

        new_id = f"EVT-{trainee.id}-{next_seq:02d}"
        event = CareerTimelineEvent(
            id=new_id,
            trainee_id=trainee.id,
            trainee_name=trainee.full_name,
            stage=stage,
            pathway=pathway,
            title=title,
            organization=organization,
            event_date=event_date,
            metrics=metrics,
            verification_status=verification_status,
            verification_notes=verification_notes,
            is_current=is_current,
            sequence_order=next_seq
        )
        db.add(event)
        db.commit()
        db.refresh(event)
        return event

    @classmethod
    def complete_longitudinal_follow_up(
        cls,
        db: Session,
        follow_up_id: str,
        retention_confirmed: bool,
        pathway: str,
        metrics: Dict[str, Any],
        notes: str
    ) -> LongitudinalFollowUp:
        """Completes a longitudinal audit checkpoint and updates career timeline."""
        lfu = db.query(LongitudinalFollowUp).filter(LongitudinalFollowUp.id == follow_up_id).first()
        if not lfu:
            raise ValueError(f"Longitudinal follow-up '{follow_up_id}' not found.")

        today_str = date.today().isoformat()
        lfu.status = "completed"
        lfu.completed_date = today_str
        lfu.retention_confirmed = retention_confirmed
        lfu.pathway = pathway
        lfu.metrics_recorded = metrics
        lfu.notes = notes

        # Update trainee entity last follow-up timestamp
        trainee = db.query(Trainee).filter(Trainee.id == lfu.trainee_id).first()
        if trainee:
            trainee.last_follow_up = today_str
            if pathway:
                trainee.primary_outcome_type = pathway

        db.commit()
        db.refresh(lfu)
        return lfu
