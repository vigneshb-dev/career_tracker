import os
import logging
from datetime import datetime, timedelta, date
from celery import Celery

logger = logging.getLogger("skilltrace.celery")

# Redis URL from environment or Docker default
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Check if Redis broker is reachable
is_redis_available = False
try:
    import redis
    r = redis.from_url(REDIS_URL, socket_timeout=1)
    r.ping()
    is_redis_available = True
    logger.info("Connected to Redis message broker.")
except Exception as e:
    logger.warning(f"Redis is not available on host ({e}). Operating Celery in eager mode for local development.")

celery_app = Celery("skilltrace_longitudinal_tasks")

if is_redis_available:
    celery_app.conf.broker_url = REDIS_URL
    celery_app.conf.result_backend = REDIS_URL
else:
    # In eager mode, Celery tasks execute immediately in-process without requiring a running Redis daemon
    celery_app.conf.broker_url = "memory://"
    celery_app.conf.result_backend = "cache+memory://"
    celery_app.conf.task_always_eager = True
    celery_app.conf.task_eager_propagates = True

celery_app.conf.timezone = "UTC"
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    enable_utc=True,
)


@celery_app.task(name="schedule_longitudinal_milestones_task")
def schedule_longitudinal_milestones_task(
    trainee_id: str,
    graduation_date_str: str,
    pathway: str = "employment",
    db_session: Optional[Any] = None
):
    """
    Automated follow-up scheduling at 30 / 90 / 180 / 365 days post-graduation/placement.
    """
    from app.core.database import SessionLocal
    from app.models.entities import Trainee, LongitudinalFollowUp

    owns_session = False
    if db_session is not None:
        db = db_session
    else:
        db = SessionLocal()
        owns_session = True

    try:
        trainee = db.query(Trainee).filter(Trainee.id == trainee_id).first()
        if not trainee:
            return {"status": "error", "message": f"Trainee '{trainee_id}' not found"}

        # Enforce consent compliance
        consent_dict = trainee.consent_status or {}
        consent_st = (consent_dict.get("status") or consent_dict.get("consent_status") or "ACTIVE").upper()
        if consent_st in ["WITHDRAWN", "REVOKED", "EXPIRED", "NOT_GRANTED", "DENIED"]:
            logger.info(f"Skipping longitudinal milestone scheduling for trainee '{trainee_id}' due to consent status '{consent_st}'.")
            return {
                "status": "blocked_by_consent",
                "trainee_id": trainee_id,
                "consent_status": consent_st,
                "message": f"Longitudinal tracking blocked: Trainee consent is '{consent_st}'."
            }

        try:
            base_date = datetime.strptime(graduation_date_str, "%Y-%m-%d").date()
        except Exception:
            base_date = date.today()

        milestones = [30, 90, 180, 365]
        scheduled_items = []
        today = date.today()

        for days in milestones:
            due_d = base_date + timedelta(days=days)
            follow_up_id = f"LFU-{trainee.id}-{days}D"

            existing = db.query(LongitudinalFollowUp).filter(LongitudinalFollowUp.id == follow_up_id).first()
            due_str = due_d.isoformat()

            initial_status = "scheduled"
            if due_d < today:
                initial_status = "overdue"
            elif due_d == today:
                initial_status = "due"

            if not existing:
                lfu = LongitudinalFollowUp(
                    id=follow_up_id,
                    trainee_id=trainee.id,
                    trainee_name=trainee.full_name,
                    milestone_days=days,
                    scheduled_date=base_date.isoformat(),
                    due_date=due_str,
                    status=initial_status,
                    pathway=pathway or trainee.primary_outcome_type or "employment",
                    survey_link=f"https://skilltrace.org/outcomes/survey/{trainee.id}?m={days}"
                )
                db.add(lfu)
                scheduled_items.append({"id": follow_up_id, "days": days, "due_date": due_str})
            else:
                if existing.status == "scheduled" and due_d < today:
                    existing.status = "overdue"

        db.commit()
        return {
            "status": "success",
            "trainee_id": trainee_id,
            "milestones_count": len(milestones),
            "new_scheduled": len(scheduled_items)
        }
    except Exception as e:
        logger.error(f"Error in schedule_longitudinal_milestones_task: {e}", exc_info=True)
        return {"status": "error", "detail": str(e)}
    finally:
        if owns_session:
            db.close()


@celery_app.task(name="automated_follow_up_sweep_task")
def automated_follow_up_sweep_task():
    """
    Automated periodic sweep inspecting all scheduled follow-ups.
    Flags due/overdue items and marks non-responsive trainees as 'Outcome Unknown'.
    """
    from app.core.database import SessionLocal
    from app.models.entities import LongitudinalFollowUp, Trainee

    db = SessionLocal()
    try:
        today = date.today()
        today_str = today.isoformat()

        all_pending = db.query(LongitudinalFollowUp).filter(
            LongitudinalFollowUp.status.in_(["scheduled", "due", "overdue"])
        ).all()

        updated_count = 0
        unreachable_flagged = 0

        for lfu in all_pending:
            try:
                due_d = datetime.strptime(lfu.due_date, "%Y-%m-%d").date()
            except Exception:
                continue

            days_diff = (today - due_d).days

            if days_diff > 60 and lfu.status == "overdue":
                lfu.status = "unreachable"
                unreachable_flagged += 1
                # If trainee has no active verified outcome, mark as Outcome Unknown
                trainee = db.query(Trainee).filter(Trainee.id == lfu.trainee_id).first()
                if trainee and trainee.primary_outcome_type not in ["employment", "apprenticeship", "entrepreneurship", "freelancing", "self_employment", "further_education"]:
                    trainee.primary_outcome_type = "unknown"
                    trainee.notes = f"{trainee.notes or ''} [Automated Audit: Unreachable after multiple follow-up attempts]"
            elif days_diff > 0 and lfu.status == "scheduled":
                lfu.status = "overdue"
                updated_count += 1
            elif days_diff == 0 and lfu.status == "scheduled":
                lfu.status = "due"
                updated_count += 1

        db.commit()
        return {
            "status": "success",
            "sweep_date": today_str,
            "updated_to_due_or_overdue": updated_count,
            "flagged_unreachable": unreachable_flagged
        }
    except Exception as e:
        logger.error(f"Error in automated_follow_up_sweep_task: {e}", exc_info=True)
        return {"status": "error", "detail": str(e)}
    finally:
        db.close()
