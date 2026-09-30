import io
import json
import requests

BASE_URL = "http://127.0.0.1:8000/api"

# Sample realistic tech resume text
SAMPLE_RESUME_TEXT = """
VIGNESH BALAJI
Chennai, Tamil Nadu, India | vignesh@example.com | +91 98401 23456
LinkedIn: linkedin.com/in/vigneshbalaji | GitHub: github.com/vignesh-balaji

PROFESSIONAL SUMMARY
Dynamic and results-driven Full Stack Software Developer with 2.5 years of experience architecting high-throughput web applications, microservices, and AI-enabled workflows. Proficient in Python Programming, React Development, TypeScript, PostgreSQL database design, and cloud deployments. Strong problem solving and team collaboration skills.

TECHNICAL SKILLS
- Programming Languages: Python, Python Development, JavaScript (ES6+), TypeScript, SQL
- Web Frameworks & Libraries: React.js, FastAPI, Node.js, Next.js, Express, Tailwind CSS
- Databases & Vectors: PostgreSQL, SQLite, Redis, pgvector
- Cloud & DevOps: Docker, Git, GitHub Actions, AWS EC2, S3, RESTful APIs
- Core Competencies: Software Architecture, Data Structures, Problem Solving, Agile Scrum, System Design

EDUCATION
Bachelor of Engineering (B.E.) in Computer Science and Engineering
Anna University, Chennai | Graduated: 2023 | CGPA: 8.7/10.0

CERTIFICATIONS
- AWS Certified Cloud Practitioner (Amazon Web Services)
- Meta Certified Front-End Developer Specialization (Coursera)
- Postman API Fundamentals Student Expert

WORK EXPERIENCE
Software Developer | Zoho Corporation, Chennai | July 2023 – Present
- Architected and deployed scalable REST APIs using FastAPI and Python, decreasing response latency by 32% for over 500,000 monthly active users.
- Designed responsive user interfaces in React.js and TypeScript with Tailwind CSS, increasing user session engagement by 24%.
- Integrated PostgreSQL databases with optimized indexing and complex relational schemas, eliminating query bottlenecks.
- Collaborated in cross-functional agile teams of 8 engineers and conducted regular code reviews.

Junior Full Stack Intern | Freshworks, Chennai | Jan 2023 – June 2023
- Implemented real-time notification engine with Redis pub/sub and WebSockets.
- Built reusable UI component library in React and authored comprehensive unit test suites.

FEATURED PROJECTS
- Career AI Intelligence Platform: Built automated competency parsing and recommendation system using PyTorch, Sentence Transformers, and FastAPI.
- E-Commerce Scalable Platform: Engineered distributed microservices application handling 10,000 concurrent orders with PostgreSQL and Docker.
"""

def test_ai_resume_analyzer():
    print("[1] Authenticating as Trainee...")
    login_res = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": "priya.sharma@example.com", "password": "Trainee@123456"}
    )
    if login_res.status_code != 200:
        print("Login failed:", login_res.text)
        return
    token = login_res.json()["token"]
    user = login_res.json()["user"]
    trainee_id = user.get("trainee_id") or "TRN-2024-001"
    print(f"Authenticated as {user['full_name']} (Trainee ID: {trainee_id})")

    headers = {"Authorization": f"Bearer {token}"}

    print("\n[2] Uploading sample resume to /api/trainees/{trainee_id}/resume...")
    files = {
        "file": ("Vignesh_Balaji_Resume.txt", SAMPLE_RESUME_TEXT.encode("utf-8"), "text/plain")
    }
    upload_res = requests.post(
        f"{BASE_URL}/trainees/{trainee_id}/resume",
        headers=headers,
        files=files
    )
    print(f"Upload Status: {upload_res.status_code}")
    if upload_res.status_code != 200:
        print("Upload Error:", upload_res.text)
        return

    data = upload_res.json()
    print("\n================ AI RESUME ANALYSIS RESULTS ================")
    print(f"Analysis ID: {data.get('analysis_id')}")
    print(f"Filename: {data.get('filename')}")
    print(f"Completeness Score: {data.get('completeness_score')}%")
    print(f"Completeness Label: {data.get('completeness_label')}")
    
    print("\n--- Extracted Metadata ---")
    meta = data.get("extracted_metadata", {})
    print(f"Detected Job Titles: {meta.get('job_titles')}")
    print(f"Estimated Experience: {meta.get('years_of_experience')} years")
    print(f"Education: {meta.get('education')}")
    print(f"Certifications: {meta.get('certifications')}")
    print(f"Domains / Industries: {meta.get('domains_industries')}")

    print("\n--- Detected Skills Profile ---")
    skills = data.get("skills_profile", [])
    print(f"Total Detected Canonical Skills: {len(skills)}")
    for s in skills[:8]:
        print(f"  • {s['canonical_name']} (Category: {s['category']}, "
              f"Proficiency: {s['estimated_proficiency']}/5.0, "
              f"Confidence: {int(s['confidence']*100)}%, "
              f"Source: '{s.get('source_term', '')}')")
        if s.get("evidence_snippet"):
            print(f"    Evidence: \"{s['evidence_snippet'][:80]}...\"")

    print("\n--- Job Matching & Skill Gaps ---")
    jobs = data.get("job_matches", [])
    print(f"Top Job Matches Found: {len(jobs)}")
    for j in jobs[:3]:
        print(f"  * {j['title']} @ {j['company']} ({j['location']}) - Match: {j['match_percentage']}%")
        print(f"    Missing: {j.get('missing_skills', [])}")

    print("\n--- Recommendations ---")
    recs = data.get("recommendations", [])
    for r in recs[:2]:
        print(f"  [Course] {r['title']} ({r['provider']}, {r['duration_weeks']} wks)")

    print("\n[3] Testing GET /api/trainees/{trainee_id}/latest-resume-analysis...")
    latest_res = requests.get(f"{BASE_URL}/trainees/{trainee_id}/latest-resume-analysis", headers=headers)
    print(f"GET Latest Status: {latest_res.status_code}")
    print(f"Has Analysis: {latest_res.json().get('has_analysis')}")

    print("\n[4] Testing POST /api/trainees/{trainee_id}/reanalyze-resume...")
    reanalyze_res = requests.post(f"{BASE_URL}/trainees/{trainee_id}/reanalyze-resume", headers=headers)
    print(f"Re-analyze Status: {reanalyze_res.status_code}")
    if reanalyze_res.status_code == 200:
        print("Re-analysis successfully executed!")

if __name__ == "__main__":
    test_ai_resume_analyzer()
