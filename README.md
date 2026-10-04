# 🌟 SkillTrace – Longitudinal Skill, Career & Employment Outcome Intelligence Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.2+-61DAFB.svg?style=flat&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0+-3178C6.svg?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-8.3+-646CFF.svg?style=flat&logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4+-38B2AC.svg?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16_with_pgvector-4169E1.svg?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg?style=flat&logo=docker&logoColor=white)](https://www.docker.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=flat)](LICENSE)

**SkillTrace** is an enterprise-grade longitudinal workforce outcome intelligence platform. It tracks, audits, verifies, and analyzes candidate skills, institutional training programs, and longitudinal post-program employment outcomes over 30, 90, 180, and 365-day horizons.

---

## 📑 Table of Contents

- [Vision & Core Product Principles](#-vision--core-product-principles)
- [Key Features](#-key-features)
  - [1. Living Trainee Outcome Passport](#1-living-trainee-outcome-passport)
  - [2. Multi-Source Evidence Architecture](#2-multi-source-evidence-architecture)
  - [3. Role-Based Access Control (RBAC)](#3-role-based-access-control-rbac)
  - [4. AI Resume Analyzer & Competency Ontology](#4-ai-resume-analyzer--competency-ontology)
  - [5. Career Progression & Gap Analysis](#5-career-progression--gap-analysis)
  - [6. Longitudinal Retention Audits & Triage Logic](#6-longitudinal-retention-audits--triage-logic)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Project Directory Structure](#-project-directory-structure)
- [Quick Start Guide](#-quick-start-guide)
  - [Option A: Running with Docker Compose (Recommended)](#option-a-running-with-docker-compose-recommended)
  - [Option B: Running Locally for Development](#option-b-running-locally-for-development)
- [Default Demo Credentials](#-default-demo-credentials)
- [API Reference](#-api-reference)
- [End-to-End Testing](#-end-to-end-testing)
- [Deployment](#-deployment)
- [Contributing & License](#-contributing--license)

---

## 🎯 Vision & Core Product Principles

SkillTrace shifts career and workforce tracking from static resume snapshots into a **Living, Evidence-Based Longitudinal Career Record**:

1. **Evidence-Backed Claims**: Skills are not merely self-declared; they corroborate multi-source proof points (Coursework Labs, Practical Projects, AI Resume Analysis, Coach Evaluations, and Employer Verifications).
2. **Non-Destructive History**: Verified records cannot be silently overwritten. Editing a verified record creates an audit event and resets verification status to `pending`, preserving previous verified values in the immutable audit ledger.
3. **Critical Triage Logic (`OUTCOME_UNKNOWN`)**: A candidate is **never** automatically marked as *Unemployed* simply because follow-up data or employer confirmation is pending. Insufficient evidence defaults to `OUTCOME_UNKNOWN` triage status.
4. **Permanent Cryptographic Audit Ledger**: Every modification records actor, role, timestamp, action, entity, previous value, new value, and verification status.

---

## 🚀 Key Features

### 1. Living Trainee Outcome Passport

The Trainee Passport provides six core sections equipped with dynamic real-time record counters:

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

Visual state badges clearly signal trust levels across all records:
* `[Editable]` – Fields modifiable by candidate.
* `[Verified ✓]` – Formally audited by coach, institution, or employer.
* `[Pending Verification ◷]` – Submitted and awaiting review.
* `[AI Extracted]` – Discovered via NLP parsing (does not auto-assume proficiency).
* `[System Generated]` – Algorithmic match scores and progress indicators.
* `[Locked 🔒]` – Immutable system identifiers (e.g. Outcome Passport ID).

### 2. Multi-Source Evidence Architecture

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

### 3. Role-Based Access Control (RBAC)

Strictly enforced at the backend API layer:

| Role | Permissions & Restrictions |
|---|---|
| **`TRAINEE`** | Can edit own profile, add training, upload credentials, declare skills/evidence, submit employment outcomes, and respond to surveys. **Cannot** alter audit history, change Passport ID, or self-verify records (`403 Forbidden`). |
| **`COACH`** | Can audit assigned trainees, review submitted coursework, score skills on 0–5 rubrics, assign interventions, and verify candidate claims. |
| **`EMPLOYER`** | Can verify candidate employment, confirm placement role, start date, retention period, and submit workplace skill ratings. **Cannot** alter trainee profile or audit trail (`403 Forbidden`). |
| **`ADMIN`** | Full governance over taxonomy mappings, institutes, compliance rules, and user roles. |

### 4. AI Resume Analyzer & Competency Ontology

* Parses PDF, DOCX, and TXT resumes via `spaCy` (`en_core_web_sm`) and semantic embeddings (`SentenceTransformers: all-MiniLM-L6-v2`).
* Normalizes candidate skills against a canonical taxonomy (e.g., *"Python Dev"*, *"Python Programming"* $\to$ `Python`).
* Labels extracted skills as `Source: Resume Analyzer` without silently overwriting existing human-verified scores.

### 5. Career Progression & Gap Analysis

Implements a 6-stage Career Progression Architecture:
$$\text{Current Profile} \longrightarrow \text{Verified Skills} \longrightarrow \text{Required Role Skills} \longrightarrow \text{Skill Gap Recalculation} \longrightarrow \text{Recommended Learning} \longrightarrow \text{Target Placement}$$
When a trainee changes their target role (e.g. to *Data Analyst*), downstream skill gaps and recommended interventions are automatically synchronized.

### 6. Longitudinal Retention Audits & Triage Logic

* Tracks post-completion retention at **30, 90, 180, and 365 days**.
* Incorporates the **7 standard retention survey questions** (employment status, role, employer, compensation, skill utilization, occupation shift, and additional learning needs).
* Distinguishes non-responses from unemployment using `OUTCOME_UNKNOWN`.

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
* **Cloud Deployment**: Configured for Vercel Serverless (`vercel.json`) or standalone containerized deployments.

---

## 📂 Project Directory Structure

```text
skill_trace/
├── backend/
│   ├── app/
│   │   ├── models/            # SQLAlchemy database entities (Trainee, Skill, Events, Outcomes)
│   │   ├── routers/           # FastAPI routers (trainees, auth, skills, interventions, analytics)
│   │   ├── schemas/           # Pydantic validation models & request/response contracts
│   │   ├── services/          # Business logic (trainee_service, resume_analyzer, scoring_engine)
│   │   └── uploads/           # Upload storage for resumes and certifications
│   ├── Dockerfile             # Multi-stage container for FastAPI backend
│   ├── main.py                # FastAPI entry point & lifespan configuration
│   └── requirements.txt       # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable UI primitives (Card, Badge, Modal, Button)
│   │   ├── pages/             # Application views (TraineeDetail, Trainees, Dashboard, Login)
│   │   ├── services/          # API client with token management and /me endpoints
│   │   └── types/             # TypeScript type definitions and interfaces
│   ├── Dockerfile             # Nginx-based production frontend build
│   ├── package.json           # Frontend dependencies & scripts
│   ├── tailwind.config.js     # Tailwind design system configuration
│   └── vite.config.ts         # Vite build configuration
├── docker-compose.yml         # Multi-service stack (Postgres+pgvector, Redis, Backend, Frontend)
├── vercel.json                # Vercel deployment specification
├── test_e2e_passport.py       # Comprehensive 22-criteria E2E acceptance test suite
├── test_me_and_roles.py       # RBAC & self-service /me verification test suite
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

The platform seeds a realistic workforce cohort with pre-configured personas:

| Persona | Role | Email | Password |
|---|---|---|---|
| **Priya Sharma** | `TRAINEE` | `priya.sharma@example.com` | `Trainee@123456` |
| **Sarah Jenkins** | `COACH` | `coach.sarah@skilltrace.org` | `Coach@123456` |
| **Sunita Rao (Apex Cloud)** | `EMPLOYER` | `recruiter@apexcloud.io` | `Employer@123456` |
| **System Admin** | `ADMIN` | `admin@skilltrace.org` | `Admin@123456` |

*Note: For 2FA/OTP login screens in demo mode, the test verification code is `123456`.*

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

### Staff & Partner Verification Endpoints

* `PATCH /api/trainees/{id}/training/{record_id}/verify` – Coach/Admin audit verification.
* `PATCH /api/trainees/{id}/skills/{skill_id}/verify` – Coach 0–5 skill rubric scoring.
* `PATCH /api/trainees/{id}/outcomes/{outcome_id}/verify` – Employer official placement confirmation.

### What-If Career Simulator Endpoints (`/api/simulator/...`)

* `POST /api/simulator/run` – Compares Current Profile vs. Simulated Profile (additional skills, certifications, target roles, locations, interventions). Calculates newly matched jobs, remaining gaps, changed match scores, newly eligible pathways, required training, and estimated readiness change.
* `GET /api/simulator/trainee/{id}/baseline` – Retrieves actual trainee baseline skills, target roles, and certifications.
* `GET /api/simulator/options` – Provides available skills, roles, certifications, and catalog interventions.
* *Output Labels*: `SIMULATION`, `ESTIMATION`.
* *Mandatory Disclaimer*: *"Simulation based on available profile and job requirement data."*
* *Data Safety Guard*: Automatically flags `INSUFFICIENT_DATA` if active job benchmarks < 2. Zero fabricated salaries or employment probabilities.

### Outcome Risk Engine & Intervention Loop Endpoints (`/api/outcome-risks/...`)

* `GET /api/outcome-risks` – Lists detected outcome risks with explainable signals (Signal 1, Signal 2, Signal 3) and structured evidence. Filterable by type, severity, and status.
* `GET /api/outcome-risks/summary` – Executive summary of risks by severity (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), canonical type, and active remediation count.
* `GET /api/outcome-risks/{id}` – Full detail of specific risk with complete evidence diagnostic.
* `POST /api/outcome-risks/scan` – Automated multi-signal workforce scan detecting 10 risk signals across 6 canonical types.
* `POST /api/outcome-risks/{id}/accept` – Intervention Loop: Trainee/Coach accepts suggested remediation intervention.
* `POST /api/outcome-risks/{id}/reject` – Intervention Loop: Trainee declines intervention with reason audit.
* `POST /api/outcome-risks/{id}/start` – Intervention Loop: Commences remediation tasks.
* `POST /api/outcome-risks/{id}/complete` – Intervention Loop: Marks intervention completed, ready for reassessment.
* `POST /api/outcome-risks/{id}/reassess` – Intervention Loop: Submits verified reassessment score, recalculates risk severity (&ge;80% resolves to `LOW`/`RESOLVED`), and records permanent audit entry.
* *Output Label*: `RISK SIGNAL`.

Interactive Swagger documentation is available at `http://localhost:8000/docs`.

---

## 🧪 End-to-End Testing

SkillTrace includes automated test suites covering the entire user journey and security constraints:

### 1. Full Trainee Passport Lifecycle Test (22 Acceptance Criteria)

Validates the full lifecycle: login, profile updates, training entry, certificate OCR, skill taxonomy mapping, resume analysis, career goal updates, outcome reporting, follow-up submissions, coach verification, employer outcome verification, timeline generation, and audit trail immutability.

```bash
python test_e2e_passport.py
```
```text
==================================================
ALL 22 ACCEPTANCE CRITERIA PASSED SUCCESSFULLY!
==================================================
```

### 2. Role Permissions & Security Test

Validates RBAC enforcement (e.g. Trainees cannot self-verify credentials; Employers cannot alter personal profiles or training history).

```bash
python test_me_and_roles.py
```
```text
============================================================
ALL ROLE-BASED ACCESS CONTROL & /ME TESTS PASSED PERFECTLY!
============================================================
```

### 3. Frontend Type Check & Build Validation

```bash
cd frontend
npm run build
```

---

## ☁️ Deployment

### Vercel Deployment
The repository includes a ready-to-deploy [`vercel.json`](vercel.json) orchestrating FastAPI serverless functions and Vite static hosting with appropriate route rewrites.

### Production Docker Deployment
Use the included [`docker-compose.yml`](docker-compose.yml) configured with production restarts, environment variables, and healthchecks.

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
