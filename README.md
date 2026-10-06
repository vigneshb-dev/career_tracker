# 🌟 SkillTrace – Longitudinal Skill, Career & Employment Outcome Intelligence Platform

[![Render App](https://img.shields.io/badge/Render-Live_App-46E3B7.svg?style=for-the-badge&logo=render&logoColor=white)](https://skilltracer-app.onrender.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.2+-61DAFB.svg?style=flat&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0+-3178C6.svg?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-8.3+-646CFF.svg?style=flat&logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4+-38B2AC.svg?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16_with_pgvector-4169E1.svg?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg?style=flat&logo=docker&logoColor=white)](https://www.docker.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=flat)](LICENSE)

> 🚀 **Live Production Deployment:** **[https://skilltracer-app.onrender.com/](https://skilltracer-app.onrender.com/)**  
> *Fully deployed and operational on Render with unified Docker container orchestration, PostgreSQL + pgvector capability, and real-time frontend-backend routing.*

---

**SkillTrace** is an enterprise-grade longitudinal workforce outcome intelligence platform. It tracks, audits, verifies, simulates, and analyzes candidate competencies, institutional training programs, and longitudinal post-program employment outcomes over 30, 90, 180, and 365-day horizons.

---

## 📑 Table of Contents

- [Live Deployment](#-live-deployment)
- [Vision & Core Product Principles](#-vision--core-product-principles)
- [Key Features & Core Modules](#-key-features--core-modules)
  - [1. Living Trainee Outcome Passport](#1-living-trainee-outcome-passport)
  - [2. What-If Career Simulator](#2-what-if-career-simulator)
  - [3. Skill Gap Diagnostic & Cause Intelligence](#3-skill-gap-diagnostic--cause-intelligence)
  - [4. Career Digital Twin & Uncertainty Modeling](#4-career-digital-twin--uncertainty-modeling)
  - [5. Outcome Risk Engine & Closed-Loop Intervention System](#5-outcome-risk-engine--closed-loop-intervention-system)
  - [6. AI Resume Analyzer & Competency Ontology](#6-ai-resume-analyzer--competency-ontology)
  - [7. Multi-Source Evidence Architecture & Immutability](#7-multi-source-evidence-architecture--immutability)
  - [8. Role-Based Access Control (RBAC)](#8-role-based-access-control-rbac)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Project Directory Structure](#-project-directory-structure)
- [Quick Start Guide](#-quick-start-guide)
  - [Option A: Running with Docker Compose (Recommended)](#option-a-running-with-docker-compose-recommended)
  - [Option B: Running Locally for Development](#option-b-running-locally-for-development)
- [Default Demo Credentials](#-default-demo-credentials)
- [API Reference](#-api-reference)
- [Automated Testing Suite](#-automated-testing-suite)
- [Production Deployment on Render](#-production-deployment-on-render)
- [Contributing & License](#-contributing--license)

---

## 🌐 Live Deployment

The SkillTrace application is deployed and hosted on Render:

| Service | URL | Notes |
|---|---|---|
| **Production Web App** | [https://skilltracer-app.onrender.com/](https://skilltracer-app.onrender.com/) | Live React SPA + FastAPI API backend |
| **API Health Endpoint** | [https://skilltracer-app.onrender.com/health](https://skilltracer-app.onrender.com/health) | System health & status check |
| **Interactive API Docs** | [https://skilltracer-app.onrender.com/docs](https://skilltracer-app.onrender.com/docs) | Swagger UI specifications |

---

## 🎯 Vision & Core Product Principles

SkillTrace shifts workforce and vocational training from static resume snapshots into a **Living, Evidence-Based Longitudinal Career Record**:

1. **Evidence-Backed Claims**: Skills are not merely self-declared; they corroborate multi-source proof points (Coursework Labs, Practical Projects, AI Resume Analysis, Coach Evaluations, and Employer Verifications).
2. **Non-Destructive History**: Verified records cannot be silently overwritten. Editing a verified record creates an audit event and resets verification status to `pending`, preserving previous verified values in the immutable audit ledger.
3. **Critical Triage Logic (`OUTCOME_UNKNOWN`)**: A candidate is **never** automatically marked as *Unemployed* simply because follow-up data or employer confirmation is pending. Insufficient evidence defaults to `OUTCOME_UNKNOWN` triage status.
4. **Permanent Cryptographic Audit Ledger**: Every modification records actor, role, timestamp, action, entity, previous value, new value, and verification status.

---

## 🚀 Key Features & Core Modules

### 1. Living Trainee Outcome Passport

The Trainee Passport provides a comprehensive, self-service career record equipped with real-time dynamic counters and cryptographic audit tracing:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TRAINEE OUTCOME PASSPORT                        │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Overview & Passport           Personal profile, career preferences, │
│                                  immutable Passport ID, match score   │
├────────────────────────────────────────────────────────────────────────┤
│ 2. Training Programme & Provider Dynamic coursework cards, clock hours,│
│    (Dynamic Count)               attendance rate, provider verification│
├────────────────────────────────────────────────────────────────────────┤
│ 3. Skills & Certifications       Skill Radar, accredited credentials,  │
│    (Dynamic Count)               multi-source evidence inventory       │
├────────────────────────────────────────────────────────────────────────┤
│ 4. Career Pathway & Goals        Trainee-owned goals, 6-stage pathway, │
│                                  automatic downstream skill gaps       │
├────────────────────────────────────────────────────────────────────────┤
│ 5. Outcome History               Direct hire, apprenticeship, venture, │
│    (Dynamic Count)               self-employment, employer confirmation│
├────────────────────────────────────────────────────────────────────────┤
│ 6. Follow-Ups & Audits           30/90/180/365-day retention surveys,  │
│    (Dynamic Count)               passport timeline, immutable ledger   │
└────────────────────────────────────────────────────────────────────────┘
```

* **ID Mismatch Self-Healing**: Resolves passport routing dynamically across `/trainees/me`, authentication tokens, and user/trainee foreign key associations.
* **Visual State Badges**:
  * `[Editable]` – Fields modifiable by candidate.
  * `[Verified ✓]` – Formally audited by coach, institution, or employer.
  * `[Pending Verification ◷]` – Submitted and awaiting review.
  * `[AI Extracted]` – Discovered via NLP parsing (does not auto-assume proficiency).
  * `[System Generated]` – Algorithmic match scores and progress indicators.
  * `[Locked 🔒]` – Immutable system identifiers (e.g. Outcome Passport ID).

### 2. What-If Career Simulator

Simulate future career trajectories and strategic upskilling decisions:
* **Baseline vs. Simulated Profile**: Compare current competencies and target role requirements against simulated credentials, interventions, and newly acquired skills.
* **Outcome Shift Calculation**: Computes newly matched positions, remaining gaps, changes in eligibility scores, and pathway transitions.
* **Honest Guardrails**: Labeled strictly with `SIMULATION` and `ESTIMATION` badges. Displays an explicit disclaimer: *"Simulation based on available profile and job requirement data."*
* **Data Safety Guard**: Triggers `INSUFFICIENT_DATA` warning if active industry benchmarks are fewer than 2. Zero hallucinated or fabricated wages.

### 3. Skill Gap Diagnostic & Cause Intelligence

An institutional diagnostic suite built with a **modern light theme** (`AdminSkillIntelligence.tsx` and `CourseSkillAnalysis.tsx`):
* **Longitudinal Cohort Analytics**: Diagnostic drill-down into curriculum misalignments, emerging employer skill demand, and historical placement trends.
* **Attrition & Non-Placement Drivers**: Identifies top causal factors behind attrition (compensation mismatch, commute hurdles, prerequisite skill deficit).
* **Self-Employment & Freelance Tracking**: Measures alternative economic outcomes alongside direct corporate placements.
* **Course Skill Alignment**: Real-time comparison between syllabus coverage and live employer job vacancy requirements.

### 4. Career Digital Twin & Uncertainty Modeling

* **Latent Competency Representations**: Models candidate skill depth and versatility using multi-dimensional embedding projections.
* **Career Trajectory Forecasting**: Projects career progression corridors with 30, 90, 180, and 365-day placement confidence bands.
* **Cohort Benchmarking**: Visualizes peer skill distributions, identifying velocity outliers and stagnation areas.

### 5. Outcome Risk Engine & Closed-Loop Intervention System

* **10 Automated Risk Signals**: Scans across 6 canonical risk types (skill deficit, attendance attrition, survey non-response, wage stagnation, certification lapse, placement delay).
* **Explainable Signals**: Every detected risk provides explainability breakdown: `Signal 1`, `Signal 2`, and `Signal 3` with underlying evidence metrics.
* **Full Intervention Lifecycle**:
  $$\text{Detect Risk} \longrightarrow \text{Suggest Remediation} \longrightarrow \text{Accept/Reject} \longrightarrow \text{In Progress} \longrightarrow \text{Complete} \longrightarrow \text{Reassess & Resolve}$$
* **Audit Trail Integration**: Every lifecycle transition writes an immutable event record into the timeline.

### 6. AI Resume Analyzer & Competency Ontology

* Parses PDF, DOCX, and TXT resumes using `spaCy` (`en_core_web_sm`) and semantic embeddings (`SentenceTransformers: all-MiniLM-L6-v2` or deterministic projection).
* Normalizes candidate skills against a canonical taxonomy (e.g., *"Python Dev"*, *"Python Programming"* $\to$ `Python`).
* Labels extracted skills as `Source: Resume Analyzer` without silently overwriting existing human-verified scores.

### 7. Multi-Source Evidence Architecture & Immutability

Skills support multi-source corroboration with source weights and confidence scores:

```
                       Python Programming
                                │
   ┌──────────────┬─────────────┼──────────────┬──────────────┐
   ▼              ▼             ▼              ▼              ▼
Resume         Coursework    Practical       Coach         Employer
Analyzer          Lab         Project      Assessment     Feedback
(86% conf)    (Attendance)  (Dashboard)     (4.5/5.0)    (Confirmed)
```

### 8. Role-Based Access Control (RBAC)

Strictly enforced at the backend API layer:

| Role | Permissions & Restrictions |
|---|---|
| **`TRAINEE`** | Can edit own profile, add training, upload credentials, declare skills/evidence, submit employment outcomes, and respond to surveys. **Cannot** alter audit history, change Passport ID, or self-verify records (`403 Forbidden`). |
| **`COACH`** | Can audit assigned trainees, review submitted coursework, score skills on 0–5 rubrics, assign interventions, and verify candidate claims. |
| **`EMPLOYER`** | Can verify candidate employment, confirm placement role, start date, retention period, and submit workplace skill ratings. **Cannot** alter trainee profile or audit trail (`403 Forbidden`). |
| **`ADMIN`** | Full governance over taxonomy mappings, institutes, compliance rules, and user roles. |

---

## 🛠 Architecture & Tech Stack

```
                          ┌───────────────────────────┐
                          │    Browser Client (Vite)  │
                          │   React 19 + TypeScript   │
                          │   Tailwind CSS + Recharts │
                          └─────────────┬─────────────┘
                                        │ HTTP / JSON
                                        ▼
                          ┌───────────────────────────┐
                          │    FastAPI Application    │
                          │    Uvicorn ASGI Server    │
                          └──────┬─────────────┬──────┘
                                 │             │
                ┌────────────────┴─┐         ┌─┴────────────────┐
                ▼                  ▼         ▼                  ▼
       ┌────────────────┐   ┌────────────┐ ┌──────────┐  ┌─────────────┐
       │ PostgreSQL 16  │   │   SQLite   │ │  Redis   │  │   spaCy &   │
       │  (pgvector)    │   │ (Fallback) │ │ (Cache)  │  │ Transformers│
       └────────────────┘   └────────────┘ └──────────┘  └─────────────┘
```

* **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Recharts, Lucide React.
* **Backend**: Python 3.11+, FastAPI, SQLAlchemy, Pydantic v2, PostgreSQL + pgvector (with automatic SQLite fallback for rapid local testing), Celery, Redis.
* **NLP & ML**: spaCy (`en_core_web_sm`), Sentence Transformers (`all-MiniLM-L6-v2`).
* **Containerization**: Docker, Docker Compose (`pgvector/pgvector:pg16`, `redis:7-alpine`, multi-stage frontend/backend builds).
* **Cloud Hosting**: Render Cloud Application with automated Docker builds, health checks, and managed database connectivity.

---

## 📂 Project Directory Structure

```text
skill_trace/
├── backend/
│   ├── app/
│   │   ├── models/            # SQLAlchemy database entities (Trainee, Skill, Events, Outcomes, Risks)
│   │   ├── routers/           # FastAPI routers (trainees, auth, skills, interventions, simulator, risks)
│   │   ├── schemas/           # Pydantic validation models & request/response contracts
│   │   ├── services/          # Business logic (trainee_service, career_simulator, outcome_risk, resume_analyzer)
│   │   └── uploads/           # Upload storage for resumes and certifications
│   ├── scripts/               # Migration and maintenance utilities (migrate_sqlite_schema.py)
│   ├── tests/                 # Pytest test suites (career_simulator, digital_twin, outcome_risks, etc.)
│   ├── Dockerfile             # Multi-stage container for FastAPI backend
│   ├── main.py                # FastAPI entry point, CORS, lifespan, and SQLite auto-migration
│   └── requirements.txt       # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable UI primitives (Card, Badge, Modal, Button, Sidebar)
│   │   ├── pages/             # Application views (TraineeDetail, CareerSimulator, SkillGaps, DigitalTwin, etc.)
│   │   ├── services/          # Axios API client with token management and /me endpoints
│   │   └── types/             # TypeScript type definitions and interfaces
│   ├── Dockerfile             # Production container for web application
│   ├── package.json           # Frontend dependencies & scripts
│   ├── tailwind.config.js     # Tailwind design system configuration
│   └── vite.config.ts         # Vite build configuration
├── docker-compose.yml         # Multi-service stack (Postgres+pgvector, Redis, Backend, Frontend)
├── render.yaml                # Render Cloud deployment infrastructure-as-code specification
├── test_e2e_passport.py       # Comprehensive 22-criteria E2E acceptance test suite
├── test_me_and_roles.py       # RBAC & self-service /me verification test suite
├── test_resume_analyzer.py    # AI resume parsing and semantic skill extraction test
└── README.md                  # Project documentation
```

---

## 🚦 Quick Start Guide

### Option A: Running with Docker Compose (Recommended)

Make sure [Docker Desktop](https://www.docker.com/products/docker-desktop/) is installed and running.

```bash
# 1. Clone the repository
git clone https://github.com/vigneshb-dev/skill_trace.git
cd skill_trace

# 2. Launch the entire containerized stack
docker compose up --build
```

Services will be available at:
* **Frontend Web App**: `http://localhost:3000`
* **FastAPI Backend & Interactive Swagger Docs**: `http://localhost:8000/docs`
* **PostgreSQL (pgvector)**: `localhost:5432`
* **Redis**: `localhost:6379`

---

### Option B: Running Locally for Development

#### 1. Backend Setup

```bash
cd backend

# Create and activate Python virtual environment
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Download spaCy English model
python -m spacy download en_core_web_sm

# Start FastAPI development server (defaults to local SQLite if Postgres is offline)
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

#### 2. Frontend Setup

In a new terminal:

```bash
cd frontend

# Install npm packages
npm install

# Start Vite dev server
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 👥 Default Demo Credentials

The platform seeds a realistic workforce cohort with pre-configured personas across multi-tenant organizations:

| Persona | Role | Organization / Scope | Email | Password |
|---|---|---|---|---|
| **Sarah Jenkins** | `COACH` | National Institute of Cloud & AI (`INST-01`) | `coach.sarah@skilltrace.org` | `Coach@123456` |
| **Arun Kumar** | `COACH` | Meridian Health & Life Sciences (`INST-02`) | `coach.arun@skilltrace.org` | `Coach@123456` |
| **Sunita Rao** | `EMPLOYER` | Apex Cloud Technologies (`CMP-01`) | `recruiter@apexcloud.io` | `Employer@123456` |
| **Vikram Reddy** | `EMPLOYER` | Meridian MedTech (`CMP-02`) | `recruiter@meridianmedtech.co.in` | `Employer@123456` |
| **Priya Sharma** | `TRAINEE` | Cloud & AI Cohort (`TRN-2024-001`) | `priya.sharma@example.com` | `Trainee@123456` |
| **Rajesh Kumar** | `TRAINEE` | Cloud & AI Cohort (`TRN-2024-002`) | `rajesh.kumar@example.com` | `Trainee@123456` |
| **System Admin** | `ADMIN` | Central Multi-Tenant Administration | `admin@skilltrace.org` | `Admin@123456` |
| **System Admin (Alt)** | `ADMIN` | Central Multi-Tenant Administration | `admin@skilltrace.gov` | `Admin@123456` |

> [!NOTE]
> For 2FA/OTP login screens in demo mode, the test verification code is **`123456`**.

---

## 🔌 API Reference

### Self-Service Trainee Endpoints (`/api/trainees/me/...`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/trainees/me/passport` | Retrieves authenticated candidate's full passport and dynamic counts |
| `PATCH` | `/api/trainees/me/profile` | Updates candidate personal and career preference details |
| `GET` / `POST` | `/api/trainees/me/training` | Lists or registers new training programs (defaults to `pending`) |
| `PATCH` | `/api/trainees/me/training/{id}` | Edits training record (resets to `pending` and audits change) |
| `POST` | `/api/trainees/me/training/{id}/verification-request` | Requests coach/provider verification |
| `GET` / `POST` | `/api/trainees/me/skills` | Lists or registers skills mapped to canonical ontology |
| `PATCH` | `/api/trainees/me/skills/{id}` | Updates candidate self-rating and project evidence notes |
| `POST` | `/api/trainees/me/certifications` | Uploads credential with automated OCR skill extraction |
| `POST` | `/api/trainees/me/resume/analyze` | AI resume parsing, skill extraction, and gap analysis |
| `GET` / `PATCH`| `/api/trainees/me/career-goals` | Reads or updates career ambition and syncs skill gaps |
| `GET` / `POST` | `/api/trainees/me/outcomes` | Lists or reports employment/venture outcomes |
| `PATCH` | `/api/trainees/me/outcomes/{id}` | Updates outcome record (resets to `pending`) |
| `GET` | `/api/trainees/me/followups` | Lists 30/90/180/365-day scheduled follow-ups |
| `POST` | `/api/trainees/me/followups/{id}/respond` | Submits retention survey response (creates timestamped event) |
| `GET` | `/api/trainees/me/passport/timeline` | Retrieves chronological passport events timeline |
| `GET` | `/api/trainees/me/audit-history` | Retrieves immutable audit trail ledger |

### What-If Career Simulator Endpoints (`/api/simulator/...`)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/simulator/run` | Simulates profile changes, new skills, and estimated readiness shifts |
| `GET` | `/api/simulator/trainee/{id}/baseline` | Fetches authentic baseline skills, target roles, and credentials |
| `GET` | `/api/simulator/options` | Returns taxonomy of available roles, skills, and interventions |

### Outcome Risk Engine & Closed-Loop Remediation (`/api/outcome-risks/...`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/outcome-risks` | Lists detected outcome risks with explainable 3-signal evidence |
| `GET` | `/api/outcome-risks/summary` | Executive summary grouped by severity, canonical type, and status |
| `GET` | `/api/outcome-risks/{id}` | Comprehensive risk diagnosis with structured evidence |
| `POST` | `/api/outcome-risks/scan` | Initiates workforce scan across 10 signals |
| `POST` | `/api/outcome-risks/{id}/accept` | Trainee/Coach accepts suggested remediation intervention |
| `POST` | `/api/outcome-risks/{id}/reject` | Declines suggested intervention with reason audit |
| `POST` | `/api/outcome-risks/{id}/start` | Commences active remediation tasks |
| `POST` | `/api/outcome-risks/{id}/complete` | Marks intervention ready for reassessment |
| `POST` | `/api/outcome-risks/{id}/reassess` | Submits verification score, updates risk level, and writes audit event |

### Partner & Staff Verification Endpoints

* `PATCH /api/trainees/{id}/training/{record_id}/verify` – Coach/Admin audit verification.
* `PATCH /api/trainees/{id}/skills/{skill_id}/verify` – Coach 0–5 skill rubric scoring.
* `PATCH /api/trainees/{id}/outcomes/{outcome_id}/verify` – Employer official placement confirmation.

Interactive Swagger documentation is available at `http://localhost:8000/docs` (or `/docs` on the live Render app).

---

## 🧪 Automated Testing Suite

SkillTrace provides comprehensive automated test coverage for backend APIs, security rules, and user interfaces:

### 1. Full Trainee Passport Lifecycle Test (22 Acceptance Criteria)

```bash
python test_e2e_passport.py
```
```text
==================================================
ALL 22 ACCEPTANCE CRITERIA PASSED SUCCESSFULLY!
==================================================
```

### 2. Role Permissions & Security RBAC Test

```bash
python test_me_and_roles.py
```
```text
============================================================
ALL ROLE-BASED ACCESS CONTROL & /ME TESTS PASSED PERFECTLY!
============================================================
```

### 3. AI Resume Analyzer Integration Test

```bash
python test_resume_analyzer.py
```

### 4. Pytest Core Intelligence Suites (40+ Test Cases)

```bash
python -m pytest backend/tests/test_career_simulator.py backend/tests/test_skill_gap_intelligence.py backend/tests/test_digital_twin.py backend/tests/test_outcome_risks.py backend/tests/test_outcome_verification_permissions.py backend/tests/test_outcome_cause_intelligence.py
```
```text
====================== 40 passed in 28.24s =======================
```

### 5. Frontend Production Build & Type Checking

```bash
cd frontend
npm run build
```

---

## ☁️ Production Deployment on Render

SkillTrace is configured for seamless deployment on Render using the included [`render.yaml`](render.yaml) blueprint:

1. **Link Repository**: Connect your GitHub repository on the [Render Dashboard](https://dashboard.render.com).
2. **Apply Blueprint**: Render will automatically detect `render.yaml` and configure:
   - Dockerized FastAPI application
   - Managed environment variables and secrets
   - Healthcheck monitoring at `/health`
   - Memory management and concurrency limits suitable for standard Render web services
3. **Connect Frontend**: Host the Vite React SPA alongside the backend container or as a static site pointing `VITE_API_URL` to `https://skilltracer-app.onrender.com/api`.

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
