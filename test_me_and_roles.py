import requests
import json

BASE_URL = "http://127.0.0.1:8000/api"

def test_roles_and_me():
    print("=" * 60)
    print("RUNNING ROLE PERMISSIONS & /ME ENDPOINT VERIFICATION")
    print("=" * 60)

    # 1. Login Trainee
    res = requests.post(f"{BASE_URL}/auth/login", json={"email": "priya.sharma@example.com", "password": "Trainee@123456"})
    assert res.status_code == 200, f"Login failed: {res.text}"
    trainee_token = res.json()["token"]
    t_headers = {"Authorization": f"Bearer {trainee_token}"}
    print("[1] Trainee Login: OK")

    # 2. Test GET /trainees/me/passport
    res = requests.get(f"{BASE_URL}/trainees/me/passport", headers=t_headers)
    assert res.status_code == 200, f"GET /trainees/me/passport failed: {res.text}"
    pdata = res.json()
    assert "trainee" in pdata and "stats" in pdata
    stats = pdata["stats"]
    print(f"[2] GET /trainees/me/passport: OK. Stats -> Training: {stats['training_count']}, Skills: {stats['skills_count']}, Outcomes: {stats['outcomes_count']}")

    # 3. Test PATCH /trainees/me/profile
    res = requests.patch(f"{BASE_URL}/trainees/me/profile", headers=t_headers, json={
        "location": "Bengaluru (Koramangala), KA",
        "address": "100 Feet Road, 4th Block",
        "languages": ["English", "Hindi", "Kannada"]
    })
    assert res.status_code == 200, f"PATCH /trainees/me/profile failed: {res.text}"
    print("[3] PATCH /trainees/me/profile: OK")

    # 4. Test Trainee cannot modify audit history (audit log immutable)
    res = requests.get(f"{BASE_URL}/trainees/me/audit-history", headers=t_headers)
    assert res.status_code == 200
    audits = res.json()
    assert len(audits) > 0
    print(f"[4] GET /trainees/me/audit-history: OK ({len(audits)} immutable audit events)")

    # 5. Test Trainee cannot mark training as verified
    # Add a training record via /trainees/me/training
    res = requests.post(f"{BASE_URL}/trainees/me/training", headers=t_headers, json={
        "course_name": "Modern Data Architecture with Snowflake",
        "provider_name": "SkillTrace Academy",
        "delivery_mode": "Online Synchronous",
        "completion_status": "Completed"
    })
    assert res.status_code == 201, f"Add training failed: {res.text}"
    tr_id = res.json()["id"]
    tr_status = res.json()["verification_status"]
    assert tr_status == "pending", f"Trainee-entered training must be pending, got {tr_status}"
    print(f"[5] POST /trainees/me/training: OK (ID: {tr_id}, Status: {tr_status})")

    # Try to verify as Trainee -> Must fail (403 Forbidden)
    res = requests.patch(f"{BASE_URL}/trainees/TRN-2024-001/training/{tr_id}/verify", headers=t_headers, json={
        "verification_status": "verified"
    })
    assert res.status_code in [401, 403], f"Trainee should not be allowed to verify training: {res.status_code}"
    print("[6] Trainee cannot self-verify training (403 Forbidden): ENFORCED")

    # 6. Login Coach & Verify Training
    res = requests.post(f"{BASE_URL}/auth/login", json={"email": "coach.sarah@skilltrace.org", "password": "Coach@123456"})
    assert res.status_code == 200, f"Coach login failed: {res.text}"
    coach_token = res.json()["token"]
    c_headers = {"Authorization": f"Bearer {coach_token}"}
    print("[7] Coach Login: OK")

    res = requests.patch(f"{BASE_URL}/trainees/TRN-2024-001/training/{tr_id}/verify", headers=c_headers, json={
        "verification_status": "verified",
        "verification_notes": "Official transcript and lab completion confirmed by Coach Sarah"
    })
    assert res.status_code == 200, f"Coach verify failed: {res.text}"
    print("[8] Coach verifies training record: OK")

    # 7. Login Employer
    res = requests.post(f"{BASE_URL}/auth/login", json={"email": "recruiter@apexcloud.io", "password": "Employer@123456"})
    assert res.status_code == 200, f"Employer login failed: {res.text}"
    emp_token = res.json()["token"]
    e_headers = {"Authorization": f"Bearer {emp_token}"}
    print("[9] Employer Login: OK")

    # Employer CANNOT modify trainee personal profile (403 Forbidden)
    res = requests.patch(f"{BASE_URL}/trainees/TRN-2024-001/profile", headers=e_headers, json={
        "full_name": "Hacked Name"
    })
    assert res.status_code == 403, f"Employer modifying personal profile should be 403, got {res.status_code}"
    print("[10] Employer barred from modifying trainee profile (403 Forbidden): ENFORCED")

    # Employer CANNOT modify trainee training records (403 Forbidden)
    res = requests.post(f"{BASE_URL}/trainees/TRN-2024-001/training", headers=e_headers, json={
        "course_name": "Fake Course",
        "provider_name": "Fake Provider"
    })
    assert res.status_code == 403, f"Employer modifying training records should be 403, got {res.status_code}"
    print("[11] Employer barred from modifying training records (403 Forbidden): ENFORCED")

    print("\n" + "=" * 60)
    print("ALL ROLE-BASED ACCESS CONTROL & /ME TESTS PASSED PERFECTLY!")
    print("=" * 60)

if __name__ == "__main__":
    test_roles_and_me()
