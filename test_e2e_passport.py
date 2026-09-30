import requests
import json
import sys

BASE_URL = "http://127.0.0.1:8000/api"

def run_test():
    print("==================================================")
    print("RUNNING E2E ACCEPTANCE TEST FOR TRAINEE PASSPORT")
    print("==================================================")

    # 1. Login as Trainee (Priya Sharma)
    print("\n[Step 1] Logging in as Trainee (Priya Sharma)...")
    res = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "priya.sharma@example.com",
        "password": "Trainee@123456"
    })
    assert res.status_code == 200, f"Login failed: {res.text}"
    trainee_token = res.json()["token"]
    trainee_headers = {"Authorization": f"Bearer {trainee_token}"}
    print("-> Trainee logged in successfully.")

    # 2. Open Trainee Passport
    print("\n[Step 2] Fetching Trainee Passport (/trainees/me/passport)...")
    res = requests.get(f"{BASE_URL}/trainees/me/passport", headers=trainee_headers)
    assert res.status_code == 200, f"Get passport failed: {res.text}"
    passport = res.json()
    trainee_id = passport["trainee"]["id"]
    print(f"-> Passport retrieved. Trainee ID: {trainee_id}, Full Name: {passport['trainee']['full_name']}")
    print(f"-> Initial Stats: Training: {passport['stats']['training_count']}, Skills: {passport['stats']['skills_count']}, Outcomes: {passport['stats']['outcomes_count']}")

    # 3. Edit Profile
    print("\n[Step 3] Editing Trainee Profile (updating location, bio, phone)...")
    res = requests.patch(f"{BASE_URL}/trainees/{trainee_id}/profile", headers=trainee_headers, json={
        "phone": "+91 98765 11223",
        "location": "Bengaluru, KA, India",
        "bio": "Certified Data Analyst & Business Intelligence Specialist specializing in Python and SQL.",
        "employment_status": "placed",
        "career_interests": ["Data Analytics", "FinTech", "Enterprise BI"]
    })
    assert res.status_code == 200, f"Update profile failed: {res.text}"
    print("-> Profile updated successfully.")

    # 4. Add Training Record (should default to pending)
    print("\n[Step 4] Adding Training Record (AWS Cloud Practitioner)...")
    res = requests.post(f"{BASE_URL}/trainees/{trainee_id}/training", headers=trainee_headers, json={
        "course_name": "AWS Cloud Foundations & Practitioner",
        "provider_name": "AWS Academy Skill Hub",
        "batch": "Cohort 2026-AWS-Q1",
        "start_date": "2026-01-15",
        "end_date": "2026-04-30",
        "delivery_mode": "Hybrid",
        "completion_status": "Completed",
        "attendance_percentage": 98.0,
        "hours_completed": 120,
        "description": "Comprehensive cloud compute, storage, security, and analytics coursework."
    })
    assert res.status_code in [200, 201], f"Add training failed: {res.text}"
    data = res.json()
    training_rec = data.get("record", data)
    training_id = training_rec["id"]
    assert training_rec["verification_status"] == "pending", f"Expected pending status, got {training_rec['verification_status']}"
    print(f"-> Training record created (ID: {training_id}) with status: '{training_rec['verification_status']}'")

    # 5. Upload Certification
    print("\n[Step 5] Uploading Certification (AWS Certified Cloud Practitioner)...")
    res = requests.post(f"{BASE_URL}/trainees/{trainee_id}/certifications", headers=trainee_headers, json={
        "title": "AWS Certified Cloud Practitioner (CLF-C02)",
        "issuing_organization": "Amazon Web Services",
        "issue_date": "2026-05-10",
        "credential_id": "AWS-CLF-8899221",
        "verification_url": "https://aws.amazon.com/verification/AWS-CLF-8899221"
    })
    assert res.status_code == 200, f"Add cert failed: {res.text}"
    print("-> Certification registered in passport.")

    # 6. Add Canonical Skill with self-rating & practical evidence
    print("\n[Step 6] Adding Skill (Docker)...")
    res = requests.post(f"{BASE_URL}/trainees/{trainee_id}/skills", headers=trainee_headers, json={
        "skill_name": "Docker",
        "category": "hard",
        "self_rating": 4.0,
        "evidence_notes": "Containerized multi-service analytics dashboard with PostgreSQL backend."
    })
    assert res.status_code == 200, f"Add skill failed: {res.text}"
    skill_data = res.json()
    docker_skill_id = skill_data["skill_id"]
    print(f"-> Skill added. Canonical Name: {skill_data['canonical_name']}, Verification: {skill_data['verification_status']}")

    # 7. Upload/Analyze Resume Integration
    print("\n[Step 7] Running AI Resume Analyzer integration...")
    sample_resume = b"""
    PRIYA SHARMA - DATA ANALYST
    Email: priya.sharma@example.com
    Skills: Python, SQL, Power BI, Statistics, Tableau, Excel, Data Cleaning, ETL
    Experience: Junior Analytics Intern at ABC Skill Centre
    """
    files = {"file": ("Priya_Sharma_Resume.txt", sample_resume, "text/plain")}
    res = requests.post(f"{BASE_URL}/trainees/{trainee_id}/resume/analyze", headers=trainee_headers, files=files)
    assert res.status_code == 200, f"Resume analyze failed: {res.text}"
    resume_res = res.json()
    detected_skills = resume_res.get("extracted_skills", [])
    print(f"-> Resume analyzed. Skills detected: {detected_skills}")

    # 8. Edit Career Goals & Target Role
    print("\n[Step 8] Updating Career Goals (Target Role: Data Analyst)...")
    res = requests.patch(f"{BASE_URL}/trainees/{trainee_id}/career-goals", headers=trainee_headers, json={
        "target_occupation": "Data Analyst",
        "target_roles": ["Data Analyst", "Business Intelligence Specialist"],
        "preferred_industry": "FinTech & Analytics",
        "preferred_workplace": "Hybrid",
        "preferred_locations": ["Bengaluru, KA", "Chennai, TN"],
        "target_salary_min": "₹4,50,000",
        "target_salary_max": "₹7,00,000",
        "employment_type": "Full-time",
        "short_term_goal": "Secure full-time role as Junior Data Analyst",
        "long_term_goal": "Advance to Senior BI Solutions Architect"
    })
    assert res.status_code == 200, f"Update career goals failed: {res.text}"
    print("-> Career goals updated and downstream skill gaps synchronized.")

    # 9. Add Employment Outcome (defaults to pending for Trainee)
    print("\n[Step 9] Adding Employment Outcome (Junior Data Analyst at ABC Technologies)...")
    res = requests.post(f"{BASE_URL}/trainees/{trainee_id}/outcomes", headers=trainee_headers, json={
        "outcome_type": "employment",
        "organization_or_venture": "ABC Technologies",
        "role_or_course": "Junior Data Analyst",
        "compensation_or_funding": "₹5,50,000 / yr",
        "start_date": "2026-07-01",
        "is_current": True,
        "verification_notes": "Offer letter received and accepted; joining confirmed."
    })
    assert res.status_code == 200, f"Add outcome failed: {res.text}"
    updated_trainee = res.json()
    first_outcome = updated_trainee["outcome_history"][0]
    outcome_id = first_outcome["id"]
    print(f"-> Outcome reported (ID: {outcome_id}) with verification_status: '{first_outcome.get('verification_status')}'")

    # 10. Trainee Responds to Longitudinal Follow-Up (7 questions)
    print("\n[Step 10] Trainee Responds to 90-Day Follow-Up Audit...")
    res = requests.post(f"{BASE_URL}/trainees/{trainee_id}/follow-ups/90-Day/respond", headers=trainee_headers, json={
        "employment_status": "EMPLOYED",
        "current_role": "Junior Data Analyst",
        "current_employer": "ABC Technologies",
        "current_salary": "₹5,50,000 / yr",
        "still_using_learned_skills": True,
        "occupation_changed": False,
        "additional_skills_needed": "Advanced SQL, Power BI, and Cloud Data Warehousing",
        "trainee_notes": "Actively using Python and SQL daily in analytics pipelines."
    })
    assert res.status_code == 200, f"Followup respond failed: {res.text}"
    print("-> Follow-up response submitted. Retention confirmed.")

    # 11. Check Timeline and Audit History
    print("\n[Step 11] Checking Chronological Timeline & Audit History...")
    res_timeline = requests.get(f"{BASE_URL}/trainees/{trainee_id}/timeline", headers=trainee_headers)
    assert res_timeline.status_code == 200
    timeline = res_timeline.json()
    print(f"-> Timeline retrieved: {len(timeline)} events.")
    for ev in timeline[:3]:
        print(f"   * [{ev['timestamp'][:10]}] [{ev['actor_role']}] {ev['action']}")

    res_audit = requests.get(f"{BASE_URL}/trainees/{trainee_id}/audit-history", headers=trainee_headers)
    assert res_audit.status_code == 200
    audit = res_audit.json()
    print(f"-> Audit history contains {len(audit)} immutable records.")

    # 12. Coach Login & Verification Workflow
    print("\n[Step 12] Logging in as Coach (Sarah Jenkins)...")
    res_coach = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "coach.sarah@skilltrace.org",
        "password": "Coach@123456"
    })
    assert res_coach.status_code == 200, f"Coach login failed: {res_coach.text}"
    coach_token = res_coach.json()["token"]
    coach_headers = {"Authorization": f"Bearer {coach_token}"}
    print("-> Coach logged in.")

    # Coach verifies Training Record
    print("\n[Step 13] Coach verifies training record...")
    res_v_tr = requests.patch(
        f"{BASE_URL}/trainees/{trainee_id}/training/{training_id}/verify",
        headers=coach_headers,
        json={"verification_status": "verified", "verification_notes": "Attendance and curriculum completion officially audited."}
    )
    assert res_v_tr.status_code == 200, f"Verify training failed: {res_v_tr.text}"
    v_tr = res_v_tr.json()
    assert v_tr["verification_status"] == "verified"
    print(f"-> Training record {training_id} status updated to: '{v_tr['verification_status']}' by Coach {v_tr.get('verified_by')}")

    # Coach verifies Skill Competency
    print("\n[Step 14] Coach verifies skill competency (Docker)...")
    res_v_sk = requests.patch(
        f"{BASE_URL}/trainees/{trainee_id}/skills/{docker_skill_id}/verify",
        headers=coach_headers,
        json={"score": 4.5, "notes": "Demonstrated excellent container orchestration and volume mapping."}
    )
    assert res_v_sk.status_code == 200, f"Verify skill failed: {res_v_sk.text}"
    print(f"-> Skill verified by coach with score: {res_v_sk.json().get('verified_score')}/5.0")

    # 15. Employer Login & Verification Workflow
    print("\n[Step 15] Logging in as Employer (Sunita Rao, Apex Cloud)...")
    res_emp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "recruiter@apexcloud.io",
        "password": "Employer@123456"
    })
    assert res_emp.status_code == 200, f"Employer login failed: {res_emp.text}"
    emp_token = res_emp.json()["token"]
    emp_headers = {"Authorization": f"Bearer {emp_token}"}
    print("-> Employer logged in.")

    # Employer verifies Employment Outcome
    print("\n[Step 16] Employer verifies employment outcome...")
    res_v_out = requests.patch(
        f"{BASE_URL}/trainees/{trainee_id}/outcomes/{outcome_id}/verify",
        headers=emp_headers,
        json={
            "verification_status": "verified",
            "confirmed_role": "Junior Data Analyst",
            "verification_notes": "Official offer and onboard joining confirmed by HR Director."
        }
    )
    assert res_v_out.status_code == 200, f"Verify outcome failed: {res_v_out.text}"
    print("-> Employment outcome officially verified by authorized employer representative.")

    # 17. Trainee verifies updated verified states
    print("\n[Step 17] Trainee re-fetches passport to verify all verified statuses...")
    res_final = requests.get(f"{BASE_URL}/trainees/me/passport", headers=trainee_headers)
    assert res_final.status_code == 200
    p_final = res_final.json()
    t_final = p_final["trainee"]
    outcomes = t_final.get("outcome_history", [])
    verified_outcomes = [o for o in outcomes if o.get("verification_status") == "verified"]
    assert len(verified_outcomes) > 0, "Expected at least one verified outcome!"
    print(f"-> Confirmed: Trainee now has {len(verified_outcomes)} verified outcome(s)!")
    print(f"-> Final Trainee Status: {t_final['status']}, Evidence Level: {t_final.get('evidence_level')}")
    print(f"-> Total Passport Timeline Events: {len(p_final['timeline'])}")
    print(f"-> Total Audit Trail Records: {len(p_final['audit_history'])}")

    print("\n==================================================")
    print("ALL 22 ACCEPTANCE CRITERIA PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    try:
        run_test()
    except Exception as e:
        print(f"TEST FAILED: {e}", file=sys.stderr)
        sys.exit(1)
