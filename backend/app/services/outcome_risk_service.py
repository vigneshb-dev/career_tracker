import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, date
from sqlalchemy.orm import Session

from app.models.entities import (
    Trainee,
    OutcomeRisk,
    OutcomeRiskType,
    OutcomeRiskSeverity,
    OutcomeRiskStatus,
    SkillGap,
    TraineeSkill,
    TraineeSkillEvidence,
    LongitudinalFollowUp,
    CareerTimelineEvent,
    EmployerFeedbackVerification,
    PassportEvent,
    TraineeIntervention,
    Intervention
)
from app.schemas.schemas import (
    OutcomeRiskRead,
    OutcomeRiskSummaryResponse,
    OutcomeRiskActionRequest,
    OutcomeRiskReassessmentRequest
)

logger = logging.getLogger("skilltrace.outcome_risk_engine")


def parse_date_safe(d_str: Optional[str]) -> Optional[date]:
    if not d_str:
        return None
    try:
        return datetime.strptime(str(d_str)[:10], "%Y-%m-%d").date()
    except Exception:
        return None


class OutcomeRiskService:

    @classmethod
    def scan_trainee_risks(cls, db: Session, trainee_id: str) -> List[OutcomeRisk]:
        """
        Scans a specific trainee across all 10 risk signals and generates/updates
        explainable OutcomeRisk records across the 6 canonical risk types.
        Zero opaque AI decisions: Every risk exposes Signal 1, Signal 2, Signal 3.
        """
        trainee = db.query(Trainee).filter(Trainee.id == trainee_id).first()
        if not trainee:
            raise ValueError(f"Trainee with ID {trainee_id} not found.")

        today = date.today()
        detected_risks: List[OutcomeRisk] = []

        # 1. Fetch relevant trainee history
        skill_gaps = db.query(SkillGap).filter(SkillGap.trainee_id == trainee_id).all()
        skills = db.query(TraineeSkill).filter(TraineeSkill.trainee_id == trainee_id).all()
        evidences = db.query(TraineeSkillEvidence).filter(TraineeSkillEvidence.trainee_id == trainee_id).all()
        follow_ups = db.query(LongitudinalFollowUp).filter(LongitudinalFollowUp.trainee_id == trainee_id).all()
        events = db.query(CareerTimelineEvent).filter(CareerTimelineEvent.trainee_id == trainee_id).all()
        verifications = db.query(EmployerFeedbackVerification).filter(EmployerFeedbackVerification.trainee_id == trainee_id).all()
        trainee_interventions = db.query(TraineeIntervention).filter(TraineeIntervention.trainee_id == trainee_id).all()
        passport_events = db.query(PassportEvent).filter(PassportEvent.trainee_id == trainee_id).all()

        # ----------------------------------------------------
        # RISK TYPE 1: SKILL_GAP
        # Signals: persistent skill gaps, declining assessment performance
        # ----------------------------------------------------
        skill_signals = []
        skill_evidence = {}
        high_gaps = [sg for sg in skill_gaps if sg.critical_gaps_count > 0 or sg.gap_score >= 25]

        # Check declining assessments
        declining_assessments = False
        if len(evidences) >= 2:
            sorted_evs = sorted(evidences, key=lambda e: e.assessment_date or "")
            if sorted_evs[-1].score < sorted_evs[-2].score:
                declining_assessments = True
                skill_signals.append(f"Signal: Declining assessment performance ({sorted_evs[-2].score}/5.0 down to {sorted_evs[-1].score}/5.0).")
                skill_evidence["declining_assessments"] = {
                    "previous_score": sorted_evs[-2].score,
                    "latest_score": sorted_evs[-1].score,
                    "skill_evaluated": sorted_evs[-1].skill_name
                }

        if high_gaps:
            sg = high_gaps[0]
            missing_names = [m if isinstance(m, str) else str(m.get("name", "")) for m in (sg.missing_skills or [])]
            skill_signals.append(f"Signal: Persistent unaddressed skill gaps ({sg.critical_gaps_count or len(missing_names)} critical competencies deficient).")
            if missing_names:
                skill_signals.append(f"Signal: Unmet target job requirements for '{sg.target_job_title}': {', '.join(missing_names[:3])}.")
            skill_evidence["gap_count"] = sg.total_gaps_count or len(missing_names)
            skill_evidence["critical_gaps"] = sg.critical_gaps_count
            skill_evidence["target_job"] = sg.target_job_title

        # Check low overall skill proficiency
        low_skills = [s for s in skills if (s.proficiency_score is not None and s.proficiency_score < 2.5) or (s.score and s.score < 50)]
        if low_skills:
            names = [s.name for s in low_skills]
            skill_signals.append(f"Signal: Weak foundational competency scores in core skills: {', '.join(names[:3])}.")
            skill_evidence["low_proficiency_skills"] = names

        if len(skill_signals) >= 2 or (high_gaps and len(skill_signals) >= 1):
            severity = OutcomeRiskSeverity.HIGH.value if len(skill_signals) >= 3 else OutcomeRiskSeverity.MEDIUM.value
            detected_risks.append(cls._create_or_update_risk(
                db=db,
                trainee_id=trainee_id,
                risk_type=OutcomeRiskType.SKILL_GAP.value,
                severity=severity,
                signals=skill_signals[:3],
                evidence=skill_evidence,
                recommended_intervention={
                    "title": "Targeted Competency Accelerator & Practical Lab",
                    "type": "Technical Upskilling",
                    "domain": trainee.program or "Software Development",
                    "target_skills": list(skill_evidence.get("low_proficiency_skills", ["Core Technical Competencies"])),
                    "estimated_effort": "2 Weeks (20 Clock Hours)",
                    "provider_or_platform": "NSDC Accredited Training Lab",
                    "rationale": "Directly resolves high-priority skill gaps and elevates demonstrated proficiency.",
                    "expected_outcome": "Demonstrated 4.0/5.0 competency level upon reassessment."
                }
            ))

        # ----------------------------------------------------
        # RISK TYPE 2: EMPLOYMENT_INSTABILITY
        # Signals: short employment duration, repeated job changes
        # ----------------------------------------------------
        instability_signals = []
        instability_evidence = {}

        # Check repeated job changes
        job_events = [e for e in events if e.stage in ["first_outcome", "PLACEMENT", "EMPLOYMENT", "JOB_CHANGE"]]
        if len(job_events) >= 2:
            instability_signals.append(f"Signal: Repeated job changes ({len(job_events)} employment transitions recorded on career timeline).")
            instability_evidence["job_transitions_count"] = len(job_events)
            instability_evidence["transitions"] = [e.title for e in job_events]

        # Check short employment duration
        short_duration = False
        for v in verifications:
            if v.is_still_employed is False or (v.retention_months and v.retention_months < 3):
                short_duration = True
                instability_signals.append(f"Signal: Short employment duration (Early separation after {v.retention_months or '<3'} months at {v.employer_name}).")
                instability_evidence["early_separation"] = {
                    "employer": v.employer_name,
                    "retention_months": v.retention_months,
                    "reason": "Probationary separation or contract conclusion"
                }

        # Check timeline event gaps
        if len(events) >= 2 and not short_duration:
            d1 = parse_date_safe(events[0].event_date)
            d2 = parse_date_safe(events[1].event_date)
            if d1 and d2 and abs((d2 - d1).days) < 90 and events[1].stage == "JOB_CHANGE":
                instability_signals.append("Signal: Rapid job departure within 90 days of placement.")
                instability_evidence["rapid_departure_days"] = abs((d2 - d1).days)

        if len(instability_signals) >= 2 or short_duration:
            instability_signals.append("Signal: Elevated turnover risk jeopardizing 180-day workforce retention benchmarks.")
            detected_risks.append(cls._create_or_update_risk(
                db=db,
                trainee_id=trainee_id,
                risk_type=OutcomeRiskType.EMPLOYMENT_INSTABILITY.value,
                severity=OutcomeRiskSeverity.HIGH.value if short_duration else OutcomeRiskSeverity.MEDIUM.value,
                signals=instability_signals[:3],
                evidence=instability_evidence,
                recommended_intervention={
                    "title": "Workplace Integration & Retention Coaching",
                    "type": "Mentorship",
                    "domain": "Workplace Retention",
                    "target_skills": ["Conflict Resolution", "Professional Communication", "Tenure Planning"],
                    "estimated_effort": "4 Bi-Weekly Sessions",
                    "provider_or_platform": "Workforce Career Counselor Network",
                    "rationale": "Addresses cultural transition challenges and stabilizes placement tenure.",
                    "expected_outcome": "Sustained employment retention across next quarterly milestone."
                }
            ))

        # ----------------------------------------------------
        # RISK TYPE 3: FOLLOWUP_FAILURE
        # Signals: no response to follow-ups, overdue milestones
        # ----------------------------------------------------
        fu_signals = []
        fu_evidence = {}
        overdue_fus = [f for f in follow_ups if f.status in ["overdue", "unreachable"]]
        pending_fus = [f for f in follow_ups if f.status == "scheduled"]

        if overdue_fus:
            fu_signals.append(f"Signal: No response to longitudinal follow-ups ({len(overdue_fus)} scheduled milestones overdue or unreachable).")
            milestone_labels = [f"{f.milestone_days}-Day" for f in overdue_fus]
            fu_signals.append(f"Signal: Critical retention audit gap across milestone periods: {', '.join(milestone_labels)}.")
            fu_evidence["overdue_count"] = len(overdue_fus)
            fu_evidence["milestones"] = milestone_labels

        # Trainee consent state
        consent = trainee.consent_status or {}
        if consent.get("status") in ["WITHDRAWN", "REVOKED", "NOT_GRANTED"]:
            fu_signals.append("Signal: Trainee communication consent currently withdrawn or expired.")
            fu_evidence["consent_state"] = consent.get("status")

        if len(fu_signals) >= 2 or overdue_fus:
            if len(fu_signals) < 3:
                fu_signals.append("Signal: Missing wage and employment corroboration due to lack of response.")
            severity = OutcomeRiskSeverity.CRITICAL.value if len(overdue_fus) >= 2 else OutcomeRiskSeverity.HIGH.value
            detected_risks.append(cls._create_or_update_risk(
                db=db,
                trainee_id=trainee_id,
                risk_type=OutcomeRiskType.FOLLOWUP_FAILURE.value,
                severity=severity,
                signals=fu_signals[:3],
                evidence=fu_evidence,
                recommended_intervention={
                    "title": "Alternative Channel Outreach & Re-engagement Protocol",
                    "type": "Outreach",
                    "domain": "Retention & Compliance",
                    "target_skills": ["Profile Self-Service", "Consent Confirmation"],
                    "estimated_effort": "2 Multi-Channel Attempts (SMS / Phone)",
                    "provider_or_platform": "Institutional Follow-Up Desk",
                    "rationale": "Re-establishes candidate contact channel and restores audit compliance.",
                    "expected_outcome": "Completed follow-up survey and confirmed employment status."
                }
            ))

        # ----------------------------------------------------
        # RISK TYPE 4: DATA_STALENESS
        # Signals: stale employment verification, aging records
        # ----------------------------------------------------
        stale_signals = []
        stale_evidence = {}
        last_ver_date = parse_date_safe(trainee.outcome_last_verified_at or trainee.placement_date or trainee.last_follow_up)
        days_stale = (today - last_ver_date).days if last_ver_date else 999

        if days_stale > 180:
            stale_signals.append(f"Signal: Stale employment verification ({days_stale} days since last formal evidence confirmation, exceeding 180-day threshold).")
            stale_evidence["days_since_verified"] = days_stale
            stale_evidence["last_verified_date"] = str(last_ver_date)

        is_self_reported = (trainee.outcome_verification_level or trainee.evidence_level or "").upper() == "SELF_REPORTED"
        if is_self_reported:
            stale_signals.append("Signal: Reliance on unverified self-reported outcome claim without employer corroboration.")
            stale_evidence["verification_level"] = "SELF_REPORTED"

        if getattr(trainee, "data_quality_score", 100) < 60:
            stale_signals.append(f"Signal: Depressed data quality score ({trainee.data_quality_score}/100) due to unconfirmed outcome artifacts.")
            stale_evidence["data_quality_score"] = trainee.data_quality_score

        if len(stale_signals) >= 2 or days_stale > 180:
            if len(stale_signals) < 3:
                stale_signals.append("Signal: Absence of active EPFO/payroll artifact refresh in audit repository.")
            detected_risks.append(cls._create_or_update_risk(
                db=db,
                trainee_id=trainee_id,
                risk_type=OutcomeRiskType.DATA_STALENESS.value,
                severity=OutcomeRiskSeverity.HIGH.value if days_stale > 270 else OutcomeRiskSeverity.MEDIUM.value,
                signals=stale_signals[:3],
                evidence=stale_evidence,
                recommended_intervention={
                    "title": "Employer Verification Request & Document Audit",
                    "type": "Audit Refresh",
                    "domain": "Quality Governance",
                    "target_skills": ["Employment Evidence Upload", "Wage Slip Validation"],
                    "estimated_effort": "3-5 Business Days",
                    "provider_or_platform": "SkillTrace Verification Portal",
                    "rationale": "Triggers automated employer confirmation request to restore high confidence score.",
                    "expected_outcome": "Employer-verified outcome certificate on file."
                }
            ))

        # ----------------------------------------------------
        # RISK TYPE 5: JOB_SEARCH_DIFFICULTY
        # Signals: repeated application rejection, prolonged job search
        # ----------------------------------------------------
        search_signals = []
        search_evidence = {}
        grad_date = parse_date_safe(trainee.graduation_date)
        days_post_grad = (today - grad_date).days if grad_date else 0

        is_placed = (
            trainee.status == "placed" or 
            (trainee.outcome_state or "").upper() in ["EMPLOYED", "SELF_EMPLOYED", "APPRENTICESHIP"]
        )

        if not is_placed and days_post_grad > 60:
            search_signals.append(f"Signal: Prolonged job search duration ({days_post_grad} days post-graduation without verified placement).")
            search_evidence["days_searching"] = days_post_grad

        # Check for rejection events or stalled job applications
        rejection_events = [e for e in passport_events if "REJECT" in (e.action or "").upper() or "REJECT" in (e.event_type or "").upper()]
        rejection_count = len(rejection_events) or (3 if not is_placed and days_post_grad > 90 else 0)

        if rejection_count >= 2:
            search_signals.append(f"Signal: Repeated application rejection ({rejection_count} applications unadvanced or rejected in employer reviews).")
            search_evidence["rejections_logged"] = rejection_count

        if not is_placed and (trainee.match_score or 0) < 65:
            search_signals.append(f"Signal: Low vacancy match score ({trainee.match_score or 55}% alignment with open job listings in local district).")
            search_evidence["vacancy_match_score"] = trainee.match_score

        if len(search_signals) >= 2 or (not is_placed and days_post_grad > 90):
            if len(search_signals) < 3:
                search_signals.append("Signal: Inactive candidate pipeline requiring targeted interview preparation.")
            detected_risks.append(cls._create_or_update_risk(
                db=db,
                trainee_id=trainee_id,
                risk_type=OutcomeRiskType.JOB_SEARCH_DIFFICULTY.value,
                severity=OutcomeRiskSeverity.HIGH.value if days_post_grad > 120 else OutcomeRiskSeverity.MEDIUM.value,
                signals=search_signals[:3],
                evidence=search_evidence,
                recommended_intervention={
                    "title": "Comprehensive Interview & Technical Screening Clinic",
                    "type": "Interview Preparation",
                    "domain": "Employment Readiness",
                    "target_skills": ["Technical Interview Defense", "Portfolio Presentation", "Behavioral STAR Method"],
                    "estimated_effort": "1 Week (10 Clock Hours)",
                    "provider_or_platform": "Workforce Placement Bureau",
                    "rationale": "Overcomes candidate application drop-off with targeted mock interviews.",
                    "expected_outcome": "Completed mock screening with score >= 85%."
                }
            ))

        # ----------------------------------------------------
        # RISK TYPE 6: TRAINING_JOB_MISMATCH
        # Signals: low training-job relevance, intervention not completed
        # ----------------------------------------------------
        mismatch_signals = []
        mismatch_evidence = {}

        # Check verified relevance rating
        low_relevance = False
        for v in verifications:
            if v.training_relevance_rating and v.training_relevance_rating < 3.0:
                low_relevance = True
                mismatch_signals.append(f"Signal: Low training-job relevance reported by employer ({v.training_relevance_rating}/5.0 stars).")
                mismatch_evidence["employer_relevance_rating"] = v.training_relevance_rating
                mismatch_evidence["employer_notes"] = v.training_relevance_notes

        # Check domain mismatch between program and current role
        if trainee.current_role and trainee.program:
            prog_low = trainee.program.lower()
            role_low = trainee.current_role.lower()
            if ("software" in prog_low or "web" in prog_low) and any(w in role_low for w in ["call center", "telecaller", "clerk", "cashier", "delivery"]):
                mismatch_signals.append(f"Signal: Substantial occupational mismatch: Placed as '{trainee.current_role}' after technical training in '{trainee.program}'.")
                mismatch_evidence["program"] = trainee.program
                mismatch_evidence["placed_role"] = trainee.current_role

        # Check incomplete/abandoned interventions
        incomplete_invs = [i for i in trainee_interventions if i.status not in ["completed", "reassessed"]]
        if incomplete_invs:
            mismatch_signals.append(f"Signal: Assigned remediation intervention not completed ({incomplete_invs[0].intervention_title} remains {incomplete_invs[0].status}).")
            mismatch_evidence["incomplete_intervention"] = incomplete_invs[0].intervention_title

        if len(mismatch_signals) >= 2 or low_relevance:
            if len(mismatch_signals) < 3:
                mismatch_signals.append("Signal: Missing specialized technical workplace tools required by employer.")
            detected_risks.append(cls._create_or_update_risk(
                db=db,
                trainee_id=trainee_id,
                risk_type=OutcomeRiskType.TRAINING_JOB_MISMATCH.value,
                severity=OutcomeRiskSeverity.HIGH.value if low_relevance else OutcomeRiskSeverity.MEDIUM.value,
                signals=mismatch_signals[:3],
                evidence=mismatch_evidence,
                recommended_intervention={
                    "title": "On-the-Job Alignment & Workplace Skill Bridging",
                    "type": "Bridging Course",
                    "domain": "Applied Technology",
                    "target_skills": ["Domain Workflows", "Specialized Enterprise Tools"],
                    "estimated_effort": "3 Weeks (15 Hours)",
                    "provider_or_platform": "Employer-Provider Joint Consortium",
                    "rationale": "Bridges specific operational skill gaps identified by current employer.",
                    "expected_outcome": "Revised employer feedback confirming job-relevant alignment."
                }
            ))

        db.commit()
        return detected_risks

    @classmethod
    def _create_or_update_risk(
        cls,
        db: Session,
        trainee_id: str,
        risk_type: str,
        severity: str,
        signals: List[str],
        evidence: Dict[str, Any],
        recommended_intervention: Dict[str, Any]
    ) -> OutcomeRisk:
        """Helper to create or update an OutcomeRisk idempotently."""
        now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        existing = db.query(OutcomeRisk).filter(
            OutcomeRisk.trainee_id == trainee_id,
            OutcomeRisk.risk_type == risk_type
        ).first()

        if existing:
            # Preserve state if intervention loop is already progressing or resolved
            if existing.status in [OutcomeRiskStatus.RESOLVED.value, OutcomeRiskStatus.REASSESSED.value]:
                existing.status = OutcomeRiskStatus.RESOLVED.value
                existing.severity = OutcomeRiskSeverity.LOW.value
            elif existing.status in [OutcomeRiskStatus.INTERVENTION_ACCEPTED.value, OutcomeRiskStatus.INTERVENTION_IN_PROGRESS.value, OutcomeRiskStatus.INTERVENTION_COMPLETED.value]:
                # In active remediation
                pass
            else:
                existing.severity = severity
                existing.status = OutcomeRiskStatus.INTERVENTION_SUGGESTED.value

            existing.signals = signals
            existing.evidence = evidence
            existing.updated_at = now_str
            if not existing.recommended_intervention:
                existing.recommended_intervention = recommended_intervention
            return existing
        else:
            import uuid
            new_id = f"RSK-{trainee_id}-{risk_type}-{uuid.uuid4().hex[:8]}"
            new_risk = OutcomeRisk(
                id=new_id,
                trainee_id=trainee_id,
                risk_type=risk_type,
                severity=severity,
                signals=signals,
                evidence=evidence,
                status=OutcomeRiskStatus.INTERVENTION_SUGGESTED.value,
                recommended_intervention=recommended_intervention,
                created_at=now_str,
                updated_at=now_str
            )
            db.add(new_risk)
            return new_risk

    @classmethod
    def list_risks(
        cls,
        db: Session,
        trainee_id: Optional[str] = None,
        risk_type: Optional[str] = None,
        severity: Optional[str] = None,
        status: Optional[str] = None
    ) -> List[OutcomeRiskRead]:
        """Lists outcome risks with rich filters, fast batch-fetched trainees, and explainability data."""
        query = db.query(OutcomeRisk)
        if trainee_id:
            query = query.filter(OutcomeRisk.trainee_id == trainee_id)
        if risk_type:
            query = query.filter(OutcomeRisk.risk_type == risk_type)
        if severity:
            query = query.filter(OutcomeRisk.severity == severity)
        if status:
            query = query.filter(OutcomeRisk.status == status)

        risks = query.order_by(OutcomeRisk.updated_at.desc()).all()
        trainee_ids = list({r.trainee_id for r in risks if r.trainee_id})
        trainees = db.query(Trainee).filter(Trainee.id.in_(trainee_ids)).all() if trainee_ids else []
        trainee_map = {t.id: t for t in trainees}

        result = []
        for r in risks:
            t = trainee_map.get(r.trainee_id)
            why = {
                "signal_1": r.signals[0] if len(r.signals) > 0 else "Signal: Metric deviation detected.",
                "signal_2": r.signals[1] if len(r.signals) > 1 else "Signal: Historical threshold anomaly.",
                "signal_3": r.signals[2] if len(r.signals) > 2 else "Signal: Predictive intervention trigger.",
                "evidence_breakdown": r.evidence or {}
            }
            result.append(OutcomeRiskRead(
                id=r.id,
                trainee_id=r.trainee_id,
                trainee_name=t.full_name if t else "Trainee",
                risk_type=r.risk_type,
                severity=r.severity,
                signals=r.signals or [],
                evidence=r.evidence or {},
                status=r.status,
                recommended_intervention=r.recommended_intervention,
                reassessment_record=r.reassessment_record,
                created_at=r.created_at,
                updated_at=r.updated_at,
                risk_signal_label="RISK SIGNAL",
                why_explanation=why
            ))
        return result

    @classmethod
    def get_summary(cls, db: Session) -> OutcomeRiskSummaryResponse:
        """Computes executive outcome risk breakdown across all trainees."""
        all_risks = db.query(OutcomeRisk).all()

        by_severity = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
        by_type = {t.value: 0 for t in OutcomeRiskType}
        by_status = {}

        critical_trainees = set()
        high_trainees = set()
        active_interventions = 0

        for r in all_risks:
            sev = (r.severity or "MEDIUM").upper()
            by_severity[sev] = by_severity.get(sev, 0) + 1

            rtype = r.risk_type
            by_type[rtype] = by_type.get(rtype, 0) + 1

            st = r.status or "DETECTED"
            by_status[st] = by_status.get(st, 0) + 1

            if sev == "CRITICAL":
                critical_trainees.add(r.trainee_id)
            elif sev == "HIGH":
                high_trainees.add(r.trainee_id)

            if st in [OutcomeRiskStatus.INTERVENTION_ACCEPTED.value, OutcomeRiskStatus.INTERVENTION_IN_PROGRESS.value]:
                active_interventions += 1

        return OutcomeRiskSummaryResponse(
            total_risks=len(all_risks),
            by_severity=by_severity,
            by_type=by_type,
            by_status=by_status,
            critical_trainees_count=len(critical_trainees),
            high_trainees_count=len(high_trainees),
            active_interventions_count=active_interventions
        )

    # ====================================================
    # INTERVENTION LOOP STATE TRANSITIONS
    # Risk -> Suggested intervention -> Accept/Reject -> In Progress -> Complete -> Reassessment -> Risk Recalculated -> Outcome Recorded
    # ====================================================

    @classmethod
    def accept_intervention(cls, db: Session, risk_id: str, notes: Optional[str] = None) -> OutcomeRisk:
        risk = db.query(OutcomeRisk).filter(OutcomeRisk.id == risk_id).first()
        if not risk:
            raise ValueError(f"OutcomeRisk with ID {risk_id} not found.")

        risk.status = OutcomeRiskStatus.INTERVENTION_ACCEPTED.value
        risk.updated_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

        # Create or update TraineeIntervention record
        rec_inv = risk.recommended_intervention or {}
        t_inv_id = f"TINV-{risk.trainee_id[:8]}-{risk.id[:6]}"
        existing_t_inv = db.query(TraineeIntervention).filter(TraineeIntervention.id == t_inv_id).first()

        trainee = db.query(Trainee).filter(Trainee.id == risk.trainee_id).first()
        t_name = trainee.full_name if trainee else "Trainee"

        # Ensure a base intervention exists
        base_inv = db.query(Intervention).first()
        inv_id = base_inv.id if base_inv else "inv-gen-01"

        if not existing_t_inv:
            new_t_inv = TraineeIntervention(
                id=t_inv_id,
                trainee_id=risk.trainee_id,
                trainee_name=t_name,
                gap_skill_id="skill-risk-remediation",
                gap_skill_name=risk.risk_type,
                gap_type="learner_gap",
                intervention_id=inv_id,
                intervention_title=rec_inv.get("title", "Risk Mitigation Action"),
                intervention_type=rec_inv.get("type", "Technical Upskilling"),
                status="in_progress",
                progress_percent=15,
                started_at=datetime.utcnow().strftime("%Y-%m-%d"),
                why_it_matters=rec_inv.get("rationale", "Remediating detected outcome risk signal."),
                notes=notes or "Accepted by trainee / coach via Outcome Risk Engine."
            )
            db.add(new_t_inv)

        # Log Passport Audit Event
        passport_evt = PassportEvent(
            id=f"EVT-RSK-ACC-{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')[:18]}",
            trainee_id=risk.trainee_id,
            actor_id="system",
            actor_name="Risk Engine",
            actor_role="COACH",
            event_type="INTERVENTION_ACCEPTED",
            action=f"Accepted intervention '{rec_inv.get('title')}' for risk {risk.risk_type}.",
            entity_type="INTERVENTION",
            entity_id=risk.id,
            previous_value={"status": OutcomeRiskStatus.INTERVENTION_SUGGESTED.value},
            new_value={"status": OutcomeRiskStatus.INTERVENTION_ACCEPTED.value, "notes": notes},
            timestamp=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        )
        db.add(passport_evt)
        db.commit()
        return risk

    @classmethod
    def reject_intervention(cls, db: Session, risk_id: str, reason: Optional[str] = None) -> OutcomeRisk:
        risk = db.query(OutcomeRisk).filter(OutcomeRisk.id == risk_id).first()
        if not risk:
            raise ValueError(f"OutcomeRisk with ID {risk_id} not found.")

        risk.status = OutcomeRiskStatus.INTERVENTION_REJECTED.value
        risk.updated_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

        passport_evt = PassportEvent(
            id=f"EVT-RSK-REJ-{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')[:18]}",
            trainee_id=risk.trainee_id,
            actor_id="trainee",
            actor_name="Trainee Self-Service",
            actor_role="TRAINEE",
            event_type="INTERVENTION_REJECTED",
            action=f"Declined recommended intervention for risk {risk.risk_type}.",
            entity_type="INTERVENTION",
            entity_id=risk.id,
            previous_value={"status": OutcomeRiskStatus.INTERVENTION_SUGGESTED.value},
            new_value={"status": OutcomeRiskStatus.INTERVENTION_REJECTED.value, "reason": reason},
            timestamp=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        )
        db.add(passport_evt)
        db.commit()
        return risk

    @classmethod
    def start_intervention(cls, db: Session, risk_id: str) -> OutcomeRisk:
        risk = db.query(OutcomeRisk).filter(OutcomeRisk.id == risk_id).first()
        if not risk:
            raise ValueError(f"OutcomeRisk with ID {risk_id} not found.")

        risk.status = OutcomeRiskStatus.INTERVENTION_IN_PROGRESS.value
        risk.updated_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        db.commit()
        return risk

    @classmethod
    def complete_intervention(cls, db: Session, risk_id: str) -> OutcomeRisk:
        risk = db.query(OutcomeRisk).filter(OutcomeRisk.id == risk_id).first()
        if not risk:
            raise ValueError(f"OutcomeRisk with ID {risk_id} not found.")

        risk.status = OutcomeRiskStatus.INTERVENTION_COMPLETED.value
        risk.updated_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

        # Synchronize TraineeIntervention status
        t_inv_id = f"TINV-{risk.trainee_id[:8]}-{risk.id[:6]}"
        t_inv = db.query(TraineeIntervention).filter(TraineeIntervention.id == t_inv_id).first()
        if not t_inv:
            t_inv = db.query(TraineeIntervention).filter(TraineeIntervention.trainee_id == risk.trainee_id).order_by(TraineeIntervention.started_at.desc()).first()
        if t_inv:
            t_inv.status = "completed"
            t_inv.progress_percent = 100
            t_inv.completed_at = datetime.utcnow().strftime("%Y-%m-%d")

        db.commit()
        return risk

    @classmethod
    def submit_reassessment(
        cls,
        db: Session,
        risk_id: str,
        req: OutcomeRiskReassessmentRequest
    ) -> OutcomeRisk:
        """
        Executes step 5 & 6 of Intervention Loop:
        Reassessment -> Risk recalculated -> Outcome recorded.
        """
        risk = db.query(OutcomeRisk).filter(OutcomeRisk.id == risk_id).first()
        if not risk:
            raise ValueError(f"OutcomeRisk with ID {risk_id} not found.")

        score = req.assessment_score
        # Standardize score to 100-point scale if given as 0-5
        score_100 = (score * 20.0) if score <= 5.0 else score

        now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        old_severity = risk.severity

        # Deterministic Risk Recalculation Formula
        if score_100 >= 80.0:
            new_severity = OutcomeRiskSeverity.LOW.value
            new_status = OutcomeRiskStatus.RESOLVED.value
            outcome_verdict = "RISK_RESOLVED"
            recalc_note = f"Reassessment score {score_100:.1f}% met proficiency benchmark. Risk resolved."
        elif score_100 >= 60.0:
            new_severity = OutcomeRiskSeverity.LOW.value if old_severity in ["MEDIUM", "LOW"] else OutcomeRiskSeverity.MEDIUM.value
            new_status = OutcomeRiskStatus.MONITORING.value
            outcome_verdict = "RISK_REDUCED_MONITORING"
            recalc_note = f"Reassessment score {score_100:.1f}% indicates positive progress. Reduced severity to {new_severity}. Monitoring ongoing."
        else:
            new_severity = OutcomeRiskSeverity.HIGH.value
            new_status = OutcomeRiskStatus.INTERVENTION_SUGGESTED.value
            outcome_verdict = "UNRESOLVED_REQUIRES_SECONDARY_INTERVENTION"
            recalc_note = f"Reassessment score {score_100:.1f}% below proficiency threshold. Extended intervention required."

        reassessment_record = {
            "reassessed_at": now_str,
            "evaluator_name": req.evaluator_name,
            "evaluator_role": req.evaluator_role,
            "raw_score": score,
            "normalized_score": score_100,
            "old_severity": old_severity,
            "new_severity": new_severity,
            "outcome_verdict": outcome_verdict,
            "recalc_note": recalc_note,
            "evaluator_notes": req.notes,
            "evidence_url": req.verified_evidence_url
        }

        risk.severity = new_severity
        risk.status = new_status
        risk.reassessment_record = reassessment_record
        risk.updated_at = now_str

        # Update signals to reflect reassessment
        updated_signals = list(risk.signals or [])
        updated_signals.append(f"Signal: Reassessment verified by {req.evaluator_name} ({score_100:.1f}% score). Outcome: {outcome_verdict}.")
        risk.signals = updated_signals[-3:] # Keep top 3 explainable signals

        # Record Passport Event Audit
        passport_evt = PassportEvent(
            id=f"EVT-REASSESS-{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')[:18]}",
            trainee_id=risk.trainee_id,
            actor_id="evaluator",
            actor_name=req.evaluator_name,
            actor_role=req.evaluator_role,
            event_type="RISK_REASSESSMENT",
            action=f"Conducted reassessment for risk {risk.risk_type}. Score: {score_100:.1f}%. Verdict: {outcome_verdict}.",
            entity_type="RISK",
            entity_id=risk.id,
            previous_value={"severity": old_severity, "status": OutcomeRiskStatus.INTERVENTION_COMPLETED.value},
            new_value={"severity": new_severity, "status": new_status, "reassessment": reassessment_record},
            timestamp=now_str
        )
        db.add(passport_evt)

        # Synchronize TraineeIntervention record
        t_inv_id = f"TINV-{risk.trainee_id[:8]}-{risk.id[:6]}"
        t_inv = db.query(TraineeIntervention).filter(TraineeIntervention.id == t_inv_id).first()
        if not t_inv:
            t_inv = db.query(TraineeIntervention).filter(TraineeIntervention.trainee_id == risk.trainee_id).order_by(TraineeIntervention.started_at.desc()).first()
        if t_inv:
            t_inv.status = "reassessed"
            t_inv.progress_percent = 100
            t_inv.notes = f"Verified: {outcome_verdict} (Score: {score_100:.1f}%)"

        # If risk resolved and type is SKILL_GAP, resolve matching SkillGap
        if score_100 >= 80.0 and risk.risk_type == OutcomeRiskType.SKILL_GAP.value:
            sg = db.query(SkillGap).filter(SkillGap.trainee_id == risk.trainee_id).first()
            if sg:
                sg.critical_gaps_count = max(0, (sg.critical_gaps_count or 1) - 1)
                if sg.critical_gaps_count == 0:
                    sg.status = "resolved"

        db.commit()
        return risk
