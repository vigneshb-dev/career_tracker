import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.database import SessionLocal
from app.models.entities import EmployerFeedbackVerification, Trainee, Employer
from sqlalchemy.orm.attributes import flag_modified

def cleanup_duplicates():
    db = SessionLocal()
    try:
        print("=== Step 1: Cleaning up duplicate EmployerFeedbackVerification rows ===")
        all_verifications = db.query(EmployerFeedbackVerification).order_by(
            EmployerFeedbackVerification.submission_date.desc(),
            EmployerFeedbackVerification.id.desc()
        ).all()
        
        seen_keys = set()
        to_delete = []
        to_keep = []

        for v in all_verifications:
            emp_key = (v.employer_id or v.employer_name or "").strip().lower()
            key = (v.trainee_id, emp_key)
            if key in seen_keys:
                to_delete.append(v)
            else:
                seen_keys.add(key)
                to_keep.append(v)
                
        print(f"Total verifications found: {len(all_verifications)}")
        print(f"Unique verifications to keep: {len(to_keep)}")
        print(f"Duplicates to delete: {len(to_delete)}")

        for d in to_delete:
            print(f"Deleting duplicate verification ID: {d.id}, Trainee: {d.trainee_id}, Employer: {d.employer_name}")
            db.delete(d)
        
        db.commit()

        print("\n=== Step 2: Cleaning up Trainee outcome_history duplicates ===")
        trainees = db.query(Trainee).all()
        for t in trainees:
            history = t.outcome_history or []
            if not history:
                continue
            
            seen_outcomes = set()
            deduped_history = []
            modified = False

            for item in history:
                role = (item.get("role_or_course") or "").strip().lower()
                org = (item.get("organization_or_venture") or "").strip().lower()
                start_date = (item.get("start_date") or "").strip().lower()
                
                # Check if this item matches a verified employer
                is_employer_verified = any(
                    k[0] == t.id and k[1] == org
                    for k in seen_keys
                )
                if is_employer_verified and item.get("verification_status") != "verified":
                    item["verification_status"] = "verified"
                    item["verified_by"] = "Employer Feedback"
                    modified = True

                key = (role, org, start_date)
                if key in seen_outcomes:
                    print(f"Removing duplicate outcome for Trainee {t.id}: {item.get('id')} - {item.get('role_or_course')} at {item.get('organization_or_venture')}")
                    modified = True
                    continue
                seen_outcomes.add(key)
                deduped_history.append(item)

            if modified or len(deduped_history) != len(history):
                t.outcome_history = deduped_history
                flag_modified(t, "outcome_history")
                print(f"Updated Trainee {t.id} outcome_history from {len(history)} to {len(deduped_history)} items.")

        db.commit()

        print("\n=== Step 3: Recalculating Employer hired_trainees_count ===")
        employers = db.query(Employer).all()
        for emp in employers:
            # Count distinct verified trainees for this employer
            count = db.query(EmployerFeedbackVerification).filter(
                (EmployerFeedbackVerification.employer_id == emp.id) |
                (EmployerFeedbackVerification.employer_name.ilike(emp.name))
            ).count()
            emp.hired_trainees_count = count
            print(f"Employer {emp.name} ({emp.id}): hired_trainees_count set to {count}")

        db.commit()
        print("\n=== Cleanup completed successfully! ===")

    except Exception as e:
        db.rollback()
        print(f"Error during cleanup: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_duplicates()
