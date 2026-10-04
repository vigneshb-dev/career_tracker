# SkillTrace Platform: Comprehensive Architecture Audit

## 1. Executive Summary & System Overview

SkillTrace is an enterprise-grade longitudinal career outcome tracking and skills intelligence platform. The platform bridges vocational and technology education with labor market outcomes by establishing a tamper-resistant **Trainee Outcome Passport**, tracking verified skills, employment retention, and career progression across standardized milestones (30, 90, 180, and 365 days).

This architecture audit documents the stabilized system topology following the comprehensive security and architecture hardening pass. All endpoints have been inventoried, classified into strict Role-Based Access Control (RBAC) tiers, protected against Insecure Direct Object References (IDOR), and verified to derive analytics strictly from database records without synthetic constants or artificial minimums.

---

## 2. System Topology & Technology Stack

```
                                      +-----------------------------+
                                      |   React 19 / Vite Frontend  |
                                      | (Tailwind CSS, Lucide, Recharts)
                                      +--------------+--------------+
                                                     |
                                            HTTPS / JSON REST
                                                     |
                                      +--------------v--------------+
                                      |      FastAPI Gateway        |
                                      |  (Python 3.12+ / Pydantic)  |
                                      +-------+--------------+------+
                                              |              |
                    +-------------------------+              +-------------------------+
                    |                                                                  |
         +----------v----------+                                            +----------v----------+
         |  PostgreSQL 16 DB   |                                            |    Redis 7 Broker   |
         | + pgvector (1536dim)|                                            |  + Token Blacklist  |
         +---------------------+                                            +----------+----------+
                                                                                       |
                                                                            +----------v----------+
                                                                            |    Celery Worker    |
                                                                            | (Scheduled Follow-up|
                                                                            |    & Status Sweeps) |
                                                                            +---------------------+
```

### Core Components:
1. **Frontend Application**: React 19 SPA built with Vite, TypeScript, Tailwind CSS, Lucide icons, and Recharts visualization. Interacts with the backend via typed Axios clients.
2. **Backend API Gateway**: FastAPI high-performance asynchronous application enforcing OAuth2 Bearer token authentication, unified RBAC, and granular resource ownership checks.
3. **Primary Relational & Vector Storage**:
   - **PostgreSQL 16** with native `pgvector` extension for storing 1536-dimensional embeddings (job descriptions, skill profiles, resume vectors).
   - Seamless **SQLite & JSON-vector fallback** when running in resource-constrained or local headless development environments without PostgreSQL.
4. **Asynchronous Processing & Caching**:
   - **Redis 7**: Distributed session management, token revocation blacklisting, OTP generation, and Celery task broker.
   - **Celery Worker**: Automated background scheduling of longitudinal milestones (30/90/180/365 days) and non-response sweeps. Graceful in-process eager mode fallback when Redis is absent.
5. **Machine Learning & NLP Services**:
   - **spaCy** (`en_core_web_sm`) tokenization and named entity recognition for job description skill extraction.
   - **Sentence Transformers** (`all-MiniLM-L6-v2`) and TF-IDF cosine similarity engines for competency and job matching.

---

## 3. Backend Endpoint Inventory & Classification

Every endpoint in the SkillTrace backend has been inventoried and classified into one of the canonical security tiers:

| Tier | Role Alias / Scope | Description |
| :--- | :--- | :--- |
| **PUBLIC** | Unauthenticated | Accessible without credentials (login, signup, public job/employer views, public ontology) |
| **AUTHENTICATED TRAINEE** | `TRAINEE` | Trainees restricted strictly to their own profile, passport, timeline, and consent settings |
| **EMPLOYER** | `EMPLOYER` | Partner employers authorized only to manage their organization and verify assigned candidates |
| **TRAINING_PROVIDER** | `COACH`, `TRAINING_PROVIDER`, `PROVIDER` | Coaches and providers managing their assigned trainees, cohorts, and training records |
| **ADMIN** | `ADMIN` | Platform administrators with full system supervision, seed triggers, and configuration access |
| **ANALYST/GOVERNMENT** | `ANALYST`, `GOVERNMENT`, `ADMIN` | Policy analysts and government monitors with read-only access to aggregate data and reporting |

### Detailed Endpoint Inventory

#### 1. Authentication Router (`/api/auth`)
| HTTP Method | Route | Security Tier | Ownership / Access Control |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/signup` | **PUBLIC** | Open signup for trainees; prohibits self-assigned ADMIN roles |
| `POST` | `/api/auth/login` | **PUBLIC** | Generates signed JWT access tokens with user claims |
| `POST` | `/api/auth/logout` | **AUTHENTICATED** | Revokes JWT token by writing signature to Redis blacklist |
| `GET` | `/api/auth/me` | **AUTHENTICATED** | Returns current user record, permissions, and profile linkages |
| `POST` | `/api/auth/request-otp` | **PUBLIC** | Rate-limited OTP dispatch for password recovery |
| `POST` | `/api/auth/verify-otp` | **PUBLIC** | Validates OTP and issues temporary reset token |
| `POST` | `/api/auth/reset-password`| **PUBLIC** | Consumes one-time reset token to update credentials |

#### 2. Trainees Router (`/api/trainees`)
| HTTP Method | Route | Security Tier | Ownership / Access Control |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/trainees` | **TRAINING_PROVIDER** / **ADMIN** / **ANALYST** | Lists trainees; filtered by coach assignment for providers |
| `POST` | `/api/trainees` | **TRAINING_PROVIDER** / **ADMIN** | Enrolls new trainee record into cohort |
| `GET` | `/api/trainees/me/passport`| **AUTHENTICATED TRAINEE** | Retrieves authenticated caller's own outcome passport |
| `PATCH`| `/api/trainees/me/profile` | **AUTHENTICATED TRAINEE** | Modifies authenticated caller's own profile |
| `GET` | `/api/trainees/{id}` | **AUTHENTICATED TRAINEE** / **PROVIDER** / **ADMIN** | Trainee may only access own record; Providers/Admins authorized |
| `PUT` | `/api/trainees/{id}` | **AUTHENTICATED TRAINEE** / **PROVIDER** / **ADMIN** | Trainee may only update own record; write locked for analysts |
| `DELETE`| `/api/trainees/{id}` | **ADMIN** | Destructive deletion restricted to platform administrators |
| `GET` | `/api/trainees/{id}/passport` | **AUTHENTICATED TRAINEE** / **PROVIDER** / **ADMIN** | IDOR-protected outcome passport viewing |
| `GET` | `/api/trainees/{id}/training` | **AUTHENTICATED TRAINEE** / **PROVIDER** / **ADMIN** | IDOR-protected accredited training history |
| `POST`| `/api/trainees/{id}/training` | **TRAINING_PROVIDER** / **ADMIN** | Add accredited training record; trainees forbidden from self-issuing |
| `PUT` | `/api/trainees/{id}/consent` | **AUTHENTICATED TRAINEE** / **ADMIN** | Trainee controls own consent (`ACTIVE`, `WITHDRAWN`, `EXPIRED`, `NOT_GRANTED`) |
| `POST`| `/api/trainees/analyze-resume` | **AUTHENTICATED TRAINEE** / **ADMIN** | Upload and parse resume; validates file extension & magic bytes |

#### 3. Employers & Verification Router (`/api/employers`)
| HTTP Method | Route | Security Tier | Ownership / Access Control |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/employers` | **PUBLIC** | Public catalog of verified hiring partners |
| `POST`| `/api/employers` | **ADMIN** | Create new employer organization partner |
| `GET` | `/api/employers/{id}` | **PUBLIC** | Details of specific employer organization |
| `GET` | `/api/employers/{id}/pending-candidates` | **EMPLOYER** / **ADMIN** | Restricted to authorized employer organization representative |
| `POST`| `/api/employers/verify` | **EMPLOYER** / **ADMIN** | Submits employer verification; strictly checks candidate association |
| `GET` | `/api/employers/hierarchy/summary` | **ANALYST/GOVERNMENT** / **ADMIN** | Evidence distribution calculated 100% from database |

#### 4. Longitudinal Follow-Ups Router (`/api/follow-ups`)
| HTTP Method | Route | Security Tier | Ownership / Access Control |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/follow-ups` | **TRAINING_PROVIDER** / **ADMIN** / **ANALYST** | General cohort milestone tracking |
| `POST`| `/api/follow-ups` | **TRAINING_PROVIDER** / **ADMIN** | Record ad-hoc milestone contact attempt |
| `GET` | `/api/follow-ups/longitudinal` | **TRAINING_PROVIDER** / **ADMIN** / **ANALYST** | Longitudinal audit queries across 30/90/180/365 days |
| `POST`| `/api/follow-ups/longitudinal/{id}/complete` | **AUTHENTICATED TRAINEE** / **PROVIDER** / **ADMIN** | Completes milestone; strictly verifies actor ownership & trainee consent |
| `POST`| `/api/follow-ups/schedule-milestones/{id}` | **TRAINING_PROVIDER** / **ADMIN** | Triggers Celery task; blocked if trainee consent is not ACTIVE |
| `POST`| `/api/follow-ups/run-automated-sweep` | **ADMIN** | Triggers automated overdue milestone sweep task |

#### 5. Career Progression & Timelines Router (`/api/career-path`)
| HTTP Method | Route | Security Tier | Ownership / Access Control |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/career-path/trainee/{id}/timeline` | **AUTHENTICATED TRAINEE** / **PROVIDER** / **ADMIN** | IDOR-protected comprehensive career timeline |
| `POST`| `/api/career-path/events` | **AUTHENTICATED TRAINEE** / **PROVIDER** / **ADMIN** | Create event; trainee submissions forced to SELF_REPORTED |
| `PUT` | `/api/career-path/events/{id}/verify` | **TRAINING_PROVIDER** / **EMPLOYER** / **ADMIN** | Elevates verification status; trainees prohibited from self-verifying |
| `GET` | `/api/career-path/retention-metrics` | **ANALYST/GOVERNMENT** / **ADMIN** | Milestone retention curves computed strictly from DB |
| `POST`| `/api/career-path/seed-career-data` | **ADMIN** | Re-seeds synthetic workforce career history; Admin only |

#### 6. Analytics Router (`/api/analytics`)
| HTTP Method | Route | Security Tier | Ownership / Access Control |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/analytics/dashboard` | **AUTHENTICATED** | Real DB counts for placement, status distribution, match rates |
| `GET` | `/api/analytics/comprehensive` | **ANALYST/GOVERNMENT** / **ADMIN** | 10 dimensions of workforce analytics, zero fake minimums |
| `GET` | `/api/analytics/transparency-report` | **PUBLIC** | Public aggregate transparency metrics without PII |

#### 7. Competency, Skills & Jobs Routers (`/api/competencies`, `/api/skills`, `/api/jobs`, `/api/skill-gaps`, `/api/interventions`)
| HTTP Method | Route | Security Tier | Ownership / Access Control |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/competencies/ontology` | **PUBLIC** | Course -> Competency -> Skill -> Occupation tree |
| `GET` | `/api/skills` | **PUBLIC** | Canonical skill catalog |
| `GET` | `/api/jobs` | **PUBLIC** | Job listings with extracted skill requirements |
| `POST`| `/api/jobs` | **EMPLOYER** / **ADMIN** | Employer posts new job vacancy; AI NLP skill extraction |
| `GET` | `/api/skill-gaps/{trainee_id}` | **AUTHENTICATED TRAINEE** / **PROVIDER** / **ADMIN** | IDOR-protected skill gap analysis against target role |
| `GET` | `/api/interventions` | **TRAINING_PROVIDER** / **ADMIN** | Catalog of support interventions |
| `POST`| `/api/interventions/assign` | **TRAINING_PROVIDER** / **ADMIN** | Assign targeted intervention to at-risk trainee |

---

## 4. Evidence Hierarchy & Integrity Architecture

SkillTrace enforces an explicit, non-coercive evidence verification hierarchy. Evidence levels are never assumed or fabricated, and missing data is never converted to negative outcomes (such as "unemployed").

### Canonical Verification States:
1. `SELF_REPORTED`: Event or skill asserted directly by the trainee without external third-party confirmation.
2. `PARTIALLY_VERIFIED`: Asserted by trainee with partial corroboration (e.g., self-uploaded certificate pending institution audit).
3. `EMPLOYER_VERIFIED`: Corroborated directly by an authenticated employer representative via the Employer Verification workflow.
4. `DOCUMENT_VERIFIED`: Corroborated with cryptographically signed or institutionally verified official certificates/transcripts.
5. `SYSTEM_VERIFIED`: Automated verification via integration APIs (e.g., automated payroll or government portal synchronization).
6. `UNVERIFIED`: Information recorded prior to verification or pending review.
7. `UNKNOWN`: Outcome status unknown due to unreachable candidate post-graduation. Never recorded as unemployed.
8. `REJECTED`: Claim reviewed and explicitly invalidated by an authorized employer or institution.

---

## 5. Longitudinal Follow-Up & Consent Architecture

### Non-Coercive Multi-Pathway Modeling
Traditional workforce portals assume binary employment (employed vs. unemployed). SkillTrace explicitly supports 6 progressive outcome pathways plus Unknown:
- `employment`: Salaried full-time/part-time employment
- `self_employment`: Independent business or LLC operation
- `freelancing`: Contract and gig professional services
- `apprenticeship`: Registered formal apprenticeships and internships
- `entrepreneurship`: Venture-backed or seed-stage company creation
- `further_education`: Advanced degree or vocational research programs
- `unknown`: Outcome Unknown (strictly isolated from negative attribution)

### Consent State Machine:
All longitudinal follow-ups respect trainee consent:
- `ACTIVE`: Longitudinal tracking authorized; automated milestones scheduled at 30, 90, 180, and 365 days.
- `WITHDRAWN`: Trainee explicitly revoked consent. Celery tasks and API endpoints immediately reject any new milestone audits.
- `EXPIRED`: Time-bounded consent exceeded retention window.
- `NOT_GRANTED`: Initial consent declined.
Every consent state transition creates an append-only audit trail with timestamp, user agent, and rationale.

---

## 6. Celery, Redis & Docker Environment Architecture

The platform is designed for zero-drift deployment across Docker containers or clean local developer machines:
- **`docker-compose.yml`** orchestrates 5 containerized services:
  1. `db`: PostgreSQL 16 with pgvector extension enabled.
  2. `redis`: Redis 7 alpine message broker and cache.
  3. `backend`: FastAPI backend running Uvicorn.
  4. `celery_worker`: Background task worker for longitudinal follow-up sweeps.
  5. `frontend`: Vite React production bundle served via Nginx.
- Environment variables configure all database connections (`DATABASE_URL`), Redis endpoints (`REDIS_URL`), and security secrets (`JWT_SECRET_KEY`) with graceful fallback behavior if external services are initializing.
