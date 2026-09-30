"""
Structured Intervention Catalogue Dataset
Covers all 8 intervention types:
1. course_module
2. practice_task
3. project
4. certification
5. mentorship
6. apprenticeship
7. interview_prep
8. soft_skill_practice

Across software development, data analytics, cloud infrastructure, and workplace soft skills.
"""

from typing import List, Dict, Any

INTERVENTIONS_CATALOGUE_DATA: List[Dict[str, Any]] = [
    # ----------------------------------------------------
    # 1. COURSE / MODULE
    # ----------------------------------------------------
    {
        "id": "INT-MOD-PY01",
        "title": "Production Python & Asynchronous Microservices Architecture",
        "type": "course_module",
        "domain": "Software Development",
        "target_skills": ["Python", "Python / FastAPI", "REST APIs"],
        "target_occupations": ["Full-Stack Software Engineer", "Backend Systems Architect"],
        "difficulty_level": "intermediate",
        "min_proficiency": 1.5,
        "target_proficiency": 4.0,
        "estimated_effort": "16 Clock Hours",
        "provider_or_platform": "Bengaluru Institute of Technology & Advanced Skills",
        "description": "Comprehensive asynchronous Python engineering module covering typing with Pydantic v2, FastAPI dependency injection, asyncpg database pooling, and structured logging.",
        "why_it_matters": "Enterprise backend roles require autonomous proficiency in concurrent request handling and strict type contracts to prevent runtime data corruption.",
        "prerequisites": ["Basic Python Syntax", "HTTP Methods"],
        "learning_outcomes": [
            "Build async request pipelines with dependency injection",
            "Implement Pydantic schema validation and custom validators",
            "Write robust unit tests using pytest-asyncio and httpx"
        ],
        "reassessment_rubric": {
            "criteria": ["Async/await correctness", "Schema validation", "Unit test coverage >= 85%"],
            "max_score": 5.0
        },
        "market_demand_alignment": 96
    },
    {
        "id": "INT-MOD-DK01",
        "title": "Docker Container Internals & Enterprise Orchestration",
        "type": "course_module",
        "domain": "Software Development",
        "target_skills": ["Docker & Containerization", "Kubernetes Orchestration"],
        "target_occupations": ["Full-Stack Software Engineer", "Backend Systems Architect"],
        "difficulty_level": "intermediate",
        "min_proficiency": 1.0,
        "target_proficiency": 4.0,
        "estimated_effort": "14 Clock Hours",
        "provider_or_platform": "Cloud Native Architecture Academy",
        "description": "Deep-dive instructional module covering multi-stage Docker build minimization, non-root container security, volume persistence, and multi-service docker-compose networking.",
        "why_it_matters": "Containerization is required by 94% of enterprise software postings to ensure parity between local development, CI/CD testing, and cloud staging.",
        "prerequisites": ["Linux CLI Fundamentals", "Basic Git"],
        "learning_outcomes": [
            "Create lean, multi-stage production Dockerfiles",
            "Isolate internal service networks using compose bridging",
            "Enforce security best practices (drop capabilities, run as non-root)"
        ],
        "reassessment_rubric": {
            "criteria": ["Multi-stage image size < 150MB", "Compose network isolation", "Zero privilege escalation"],
            "max_score": 5.0
        },
        "market_demand_alignment": 94
    },
    {
        "id": "INT-MOD-PG01",
        "title": "PostgreSQL Query Optimization & Vector Embeddings with pgvector",
        "type": "course_module",
        "domain": "Data Analytics",
        "target_skills": ["PostgreSQL & pgvector", "SQL Querying & Data Modeling"],
        "target_occupations": ["Full-Stack Software Engineer", "Data Analytics Specialist", "Backend Systems Architect"],
        "difficulty_level": "advanced",
        "min_proficiency": 2.0,
        "target_proficiency": 4.2,
        "estimated_effort": "18 Clock Hours",
        "provider_or_platform": "Enterprise Database Engineering Guild",
        "description": "Hands-on syllabus on indexing JSONB columns with GIN, query execution planning with EXPLAIN ANALYZE, and HNSW vector indexing for generative AI semantic similarity search.",
        "why_it_matters": "Modern applications integrate semantic search directly inside relational databases; candidates must understand index maintenance and latency trade-offs.",
        "prerequisites": ["Relational Schema Normalization", "SQL Joins"],
        "learning_outcomes": [
            "Tune HNSW index parameters (m, ef_construction) for sub-10ms recall",
            "Diagnose sequential scan bottlenecks using EXPLAIN ANALYZE",
            "Implement transactional ACID boundaries with row-level locking"
        ],
        "reassessment_rubric": {
            "criteria": ["HNSW index optimization", "Sub-15ms p95 query latency", "Lock contention avoidance"],
            "max_score": 5.0
        },
        "market_demand_alignment": 92
    },

    # ----------------------------------------------------
    # 2. PRACTICE TASK
    # ----------------------------------------------------
    {
        "id": "INT-TSK-DK01",
        "title": "Hands-On Lab: Multi-Service Staging Compose & Network Isolation",
        "type": "practice_task",
        "domain": "Software Development",
        "target_skills": ["Docker & Containerization"],
        "target_occupations": ["Full-Stack Software Engineer", "Backend Systems Architect"],
        "difficulty_level": "intermediate",
        "min_proficiency": 2.0,
        "target_proficiency": 3.8,
        "estimated_effort": "4 Hours",
        "provider_or_platform": "DevOps Interactive Sandbox Lab",
        "description": "Simulated workplace incident lab: resolve permission denials, mount volume permissions, and configure bridge networks for a 3-tier web, API, and PostgreSQL stack.",
        "why_it_matters": "Directly remediates employer feedback citing container staging friction by practicing real-world debugging in a sandbox.",
        "prerequisites": ["Docker Desktop Installed", "Basic Compose syntax"],
        "learning_outcomes": [
            "Debug container exit code 137 and permission errors",
            "Configure healthcheck-dependent service startups",
            "Verify environment secret injection without baking into images"
        ],
        "reassessment_rubric": {
            "criteria": ["Clean zero-error docker-compose up", "Working healthchecks", "Persistent DB data volumes"],
            "max_score": 5.0
        },
        "market_demand_alignment": 90
    },
    {
        "id": "INT-TSK-PY01",
        "title": "FastAPI Dependency Injection & Unit Testing Sandbox",
        "type": "practice_task",
        "domain": "Software Development",
        "target_skills": ["Python / FastAPI", "Python"],
        "target_occupations": ["Full-Stack Software Engineer", "Backend Systems Architect"],
        "difficulty_level": "intermediate",
        "min_proficiency": 2.0,
        "target_proficiency": 4.0,
        "estimated_effort": "5 Hours",
        "provider_or_platform": "Applied Code Lab",
        "description": "Refactor a monolithic script into modular router layers with yield-based database session dependencies and override test dependencies with in-memory SQLite mocks.",
        "why_it_matters": "Enforces separation of concerns and robust test isolation, a mandatory quality benchmark during senior engineering code reviews.",
        "prerequisites": ["Python Function Decorators", "Context Managers"],
        "learning_outcomes": [
            "Architect yield dependencies for transactional session teardown",
            "Write pytest suites using app.dependency_overrides",
            "Handle custom HTTPException handlers and standardized error envelopes"
        ],
        "reassessment_rubric": {
            "criteria": ["Clean dependency overrides", "No leaked DB sessions", "100% test pass rate"],
            "max_score": 5.0
        },
        "market_demand_alignment": 92
    },

    # ----------------------------------------------------
    # 3. PROJECT
    # ----------------------------------------------------
    {
        "id": "INT-PRJ-FST01",
        "title": "Full-Stack Enterprise Microservice with Automated Staging Deployment",
        "type": "project",
        "domain": "Software Development",
        "target_skills": ["Python / FastAPI", "React.js", "Docker & Containerization", "PostgreSQL & pgvector"],
        "target_occupations": ["Full-Stack Software Engineer"],
        "difficulty_level": "advanced",
        "min_proficiency": 2.5,
        "target_proficiency": 4.5,
        "estimated_effort": "3 Weeks (30 Hours)",
        "provider_or_platform": "Workforce Capstone Studio",
        "description": "Build and deploy an enterprise-grade web application featuring asynchronous FastAPI REST endpoints, React TanStack Query frontend, PostgreSQL persistence, and Docker compose automation.",
        "why_it_matters": "Demonstrates holistic engineering execution across the entire software development lifecycle, serving as primary portfolio evidence for hiring managers.",
        "prerequisites": ["Frontend Component State", "Relational Database Design"],
        "learning_outcomes": [
            "Ship end-to-end full-stack feature with end-to-end type safety",
            "Implement production build caching and Docker staging environments",
            "Author Architecture Decision Records (ADRs) explaining system trade-offs"
        ],
        "reassessment_rubric": {
            "criteria": ["Clean commit history", "Zero TypeScript/lint warnings", "Working containerized staging demo", "ADR documentation"],
            "max_score": 5.0
        },
        "market_demand_alignment": 98
    },
    {
        "id": "INT-PRJ-VEC01",
        "title": "AI Semantic Retrieval Pipeline with pgvector & Hybrid Search",
        "type": "project",
        "domain": "Data Analytics",
        "target_skills": ["PostgreSQL & pgvector", "Python", "Critical Problem Solving"],
        "target_occupations": ["Data Analytics Specialist", "Full-Stack Software Engineer"],
        "difficulty_level": "advanced",
        "min_proficiency": 2.5,
        "target_proficiency": 4.5,
        "estimated_effort": "2 Weeks (20 Hours)",
        "provider_or_platform": "AI Engineering Laboratory",
        "description": "Implement a hybrid search retrieval pipeline combining PostgreSQL full-text search (tsvector) with dense embeddings (pgvector HNSW) using Reciprocal Rank Fusion (RRF).",
        "why_it_matters": "High-demand AI engineering capability that differentiates candidates seeking modern full-stack and data engineering positions.",
        "prerequisites": ["Vector Embeddings Concept", "SQL Aggregations"],
        "learning_outcomes": [
            "Index documents with 384-dimensional dense vectors",
            "Combine keyword and semantic search via RRF scoring algorithms",
            "Optimize query latency under simulated high-concurrency loads"
        ],
        "reassessment_rubric": {
            "criteria": ["Accurate RRF rank fusion", "HNSW index usage in EXPLAIN plan", "Comprehensive technical writeup"],
            "max_score": 5.0
        },
        "market_demand_alignment": 95
    },

    # ----------------------------------------------------
    # 4. CERTIFICATION
    # ----------------------------------------------------
    {
        "id": "INT-CRT-DCA01",
        "title": "Docker Certified Associate (DCA) Preparation Track",
        "type": "certification",
        "domain": "Software Development",
        "target_skills": ["Docker & Containerization"],
        "target_occupations": ["Full-Stack Software Engineer", "Backend Systems Architect"],
        "difficulty_level": "advanced",
        "min_proficiency": 2.5,
        "target_proficiency": 4.5,
        "estimated_effort": "25 Hours",
        "provider_or_platform": "Docker Official Credentialing Body",
        "description": "Rigorous preparation curriculum covering container creation, Swarm clustering, image registries, security scanning, and production troubleshooting.",
        "why_it_matters": "Third-party industry accreditation provides high-confidence objective verification that permanently resolves employer skepticism.",
        "prerequisites": ["Containerization Experience >= 3 months"],
        "learning_outcomes": [
            "Master Docker daemon configuration and logging drivers",
            "Pass timed technical scenario practice examinations",
            "Obtain verifiable credential badge for public outcome passport"
        ],
        "reassessment_rubric": {
            "criteria": ["Practice exam score >= 85%", "Official credential verification link"],
            "max_score": 5.0
        },
        "market_demand_alignment": 94
    },
    {
        "id": "INT-CRT-AWS01",
        "title": "AWS Certified Cloud Practitioner & Architecture Fundamentals",
        "type": "certification",
        "domain": "Software Development",
        "target_skills": ["Network & Cloud Security", "Docker & Containerization"],
        "target_occupations": ["Full-Stack Software Engineer", "Backend Systems Architect"],
        "difficulty_level": "intermediate",
        "min_proficiency": 1.5,
        "target_proficiency": 4.2,
        "estimated_effort": "20 Hours",
        "provider_or_platform": "Amazon Web Services Training & Certification",
        "description": "Structured curriculum covering AWS core compute (EC2, ECS), storage (S3, EBS), VPC networking, security groups, and shared responsibility compliance.",
        "why_it_matters": "Cloud literacy is the #1 requested prerequisite across Midwestern and national tech employers.",
        "prerequisites": ["Basic networking concepts (IP, DNS, ports)"],
        "learning_outcomes": [
            "Architect multi-AZ resilient cloud infrastructure",
            "Configure least-privilege IAM policies and security groups",
            "Understand cloud economics and cost optimization"
        ],
        "reassessment_rubric": {
            "criteria": ["Mock exam passing score", "Active credential ID"],
            "max_score": 5.0
        },
        "market_demand_alignment": 96
    },

    # ----------------------------------------------------
    # 5. MENTORSHIP
    # ----------------------------------------------------
    {
        "id": "INT-MNT-STG01",
        "title": "1-on-1 DevOps Pairing: Production Staging & Deployment Runbooks",
        "type": "mentorship",
        "domain": "Software Development",
        "target_skills": ["Docker & Containerization", "Workplace Adaptability & Learning Agility"],
        "target_occupations": ["Full-Stack Software Engineer"],
        "difficulty_level": "intermediate",
        "min_proficiency": 2.0,
        "target_proficiency": 4.0,
        "estimated_effort": "4 Sessions (6 Hours)",
        "provider_or_platform": "Apex Cloud Solutions Engineering Mentorship Guild",
        "description": "Four structured pairing sessions with a Principal SRE diagnosing staging environment breakages, writing incident runbooks, and configuring zero-downtime container updates.",
        "why_it_matters": "Directly targets workplace gaps by pairing the candidate with industry practitioners in real production environments.",
        "prerequisites": ["Enrolled in training program or active apprenticeship"],
        "learning_outcomes": [
            "Shadow senior engineer through live production deploy rituals",
            "Author clear, reproducible incident triage runbooks",
            "Receive direct workplace feedback on staging problem-solving"
        ],
        "reassessment_rubric": {
            "criteria": ["Mentor evaluation score >= 4.0", "Written staging runbook on file"],
            "max_score": 5.0
        },
        "market_demand_alignment": 91
    },
    {
        "id": "INT-MNT-ARCH01",
        "title": "Senior Architecture Guild Code Review & Design Shadowing",
        "type": "mentorship",
        "domain": "Software Development",
        "target_skills": ["Technical Communication", "Python / FastAPI", "Critical Problem Solving"],
        "target_occupations": ["Backend Systems Architect", "Full-Stack Software Engineer"],
        "difficulty_level": "advanced",
        "min_proficiency": 2.8,
        "target_proficiency": 4.5,
        "estimated_effort": "5 Sessions (8 Hours)",
        "provider_or_platform": "Staff Engineering Mentorship Network",
        "description": "Engage in deep-dive architectural code reviews, defending design decisions regarding database indexing, API schema backwards compatibility, and error recovery.",
        "why_it_matters": "Bridges the gap between writing functional code and defending scalable design choices to principal engineers.",
        "prerequisites": ["Completed capstone project"],
        "learning_outcomes": [
            "Present architecture proposals to a mock review committee",
            "Synthesize peer review critique constructively",
            "Refactor code according to enterprise design patterns"
        ],
        "reassessment_rubric": {
            "criteria": ["Staff reviewer endorsement", "Architecture defense evaluation >= 4.0"],
            "max_score": 5.0
        },
        "market_demand_alignment": 93
    },

    # ----------------------------------------------------
    # 6. APPRENTICESHIP
    # ----------------------------------------------------
    {
        "id": "INT-APP-DEV01",
        "title": "Registered Apprenticeship: Enterprise Staging Rotation",
        "type": "apprenticeship",
        "domain": "Software Development",
        "target_skills": ["Docker & Containerization", "Cross-Functional Collaboration", "Technical Communication"],
        "target_occupations": ["Full-Stack Software Engineer"],
        "difficulty_level": "intermediate",
        "min_proficiency": 2.0,
        "target_proficiency": 4.5,
        "estimated_effort": "8 Weeks (320 Hours)",
        "provider_or_platform": "NAPS / MSDE Registered Tech Apprenticeship Partner",
        "description": "Immersive on-the-job apprenticeship rotation embedded in an agile engineering squad. Focuses on shipping pull requests, participating in daily standups, and resolving staging deployment bottlenecks.",
        "why_it_matters": "The gold standard for workforce placement: provides verified on-the-job clock hours and supervisor appraisals that convert to full-time employment.",
        "prerequisites": ["Core coursework completion", "Signed apprenticeship agreement"],
        "learning_outcomes": [
            "Complete 320 clock hours of documented workplace engineering",
            "Ship 10+ merged production pull requests",
            "Earn positive supervisor 60-day retention evaluation"
        ],
        "reassessment_rubric": {
            "criteria": ["Employer retention confirmation", "NAPS milestone completion form"],
            "max_score": 5.0
        },
        "market_demand_alignment": 99
    },

    # ----------------------------------------------------
    # 7. INTERVIEW PREPARATION
    # ----------------------------------------------------
    {
        "id": "INT-INT-SYS01",
        "title": "Full-Stack System Design & Technical Interview Simulation",
        "type": "interview_prep",
        "domain": "Software Development",
        "target_skills": ["Technical Communication", "Critical Problem Solving", "Python / FastAPI"],
        "target_occupations": ["Full-Stack Software Engineer", "Backend Systems Architect"],
        "difficulty_level": "advanced",
        "min_proficiency": 3.0,
        "target_proficiency": 4.5,
        "estimated_effort": "8 Hours",
        "provider_or_platform": "Workforce Career Acceleration Studio",
        "description": "Simulated mock technical interview panels with former engineering hiring managers. Focuses on system architecture whiteboarding, algorithmic complexity analysis, and communicating technical trade-offs under time pressure.",
        "why_it_matters": "Many qualified candidates fail technical screenings because of interview anxiety or poor verbal articulation rather than technical deficits.",
        "prerequisites": ["Completed Capstone", "Familiarity with distributed systems"],
        "learning_outcomes": [
            "Structure system design answers using requirements, API, schema, and scale framework",
            "Demonstrate composed technical communication during ambiguity",
            "Receive timed evaluator rubric scoring and recorded playback"
        ],
        "reassessment_rubric": {
            "criteria": ["Mock interview panel score >= 4.0/5.0", "Clear whiteboard presentation"],
            "max_score": 5.0
        },
        "market_demand_alignment": 95
    },

    # ----------------------------------------------------
    # 8. SOFT-SKILL PRACTICE
    # ----------------------------------------------------
    {
        "id": "INT-SFT-COMM01",
        "title": "Cross-Functional Agile Alignment & Technical Documentation Clinic",
        "type": "soft_skill_practice",
        "domain": "General",
        "target_skills": ["Technical Communication"],
        "target_occupations": ["Full-Stack Software Engineer", "Business Intelligence Analyst", "Digital Marketing Strategist"],
        "difficulty_level": "intermediate",
        "min_proficiency": 2.0,
        "target_proficiency": 4.2,
        "estimated_effort": "6 Hours",
        "provider_or_platform": "Executive Communication Laboratory",
        "description": "Scenario-based communication lab practicing writing unambiguous Architecture Decision Records (ADRs), conducting blameless post-mortems, and translating technical blockers for non-technical stakeholders.",
        "why_it_matters": "Eliminates miscommunications that cause delayed sprint milestones and friction with product managers.",
        "prerequisites": ["Basic workplace communication"],
        "learning_outcomes": [
            "Write concise Architecture Decision Records",
            "Communicate blocker timelines without technical jargon",
            "Deliver structured 5-minute sprint demonstrations"
        ],
        "reassessment_rubric": {
            "criteria": ["Scenario-based communication rubric Level 4+", "Peer review score >= 85%"],
            "max_score": 5.0
        },
        "market_demand_alignment": 93
    },
    {
        "id": "INT-SFT-TIME01",
        "title": "Eisenhower Sprint Prioritization & Incident Triage Workshop",
        "type": "soft_skill_practice",
        "domain": "General",
        "target_skills": ["Time Management & Prioritization"],
        "target_occupations": ["Full-Stack Software Engineer", "Data Analytics Specialist", "Precision CNC Machinist"],
        "difficulty_level": "intermediate",
        "min_proficiency": 2.0,
        "target_proficiency": 4.2,
        "estimated_effort": "4 Hours",
        "provider_or_platform": "Workplace Effectiveness Institute",
        "description": "Interactive situational judgment simulations where trainees triage competing urgent vs important tasks under tight delivery constraints and unexpected production incidents.",
        "why_it_matters": "Engineers face constant context switching between sprint stories and bug escalations; prioritization protects critical path milestones.",
        "prerequisites": ["Active sprint participation"],
        "learning_outcomes": [
            "Apply Eisenhower decision matrices to competing deadlines",
            "Identify and communicate project blockers 48 hours before deadlines",
            "Calibrate accurate milestone hour estimates"
        ],
        "reassessment_rubric": {
            "criteria": ["Situational triage test score Level 4+", "On-time delivery tracking"],
            "max_score": 5.0
        },
        "market_demand_alignment": 90
    },
    {
        "id": "INT-SFT-TEAM01",
        "title": "Cross-Disciplinary Teamwork & Code Review Empathy Clinic",
        "type": "soft_skill_practice",
        "domain": "General",
        "target_skills": ["Cross-Functional Collaboration"],
        "target_occupations": ["Full-Stack Software Engineer", "Journeyman Electrician", "CCMA"],
        "difficulty_level": "intermediate",
        "min_proficiency": 2.0,
        "target_proficiency": 4.0,
        "estimated_effort": "5 Hours",
        "provider_or_platform": "Organizational Dynamics Studio",
        "description": "Simulation workshop focusing on giving constructive pull request feedback, pair programming etiquette, and resolving technical disagreements without interpersonal friction.",
        "why_it_matters": "High-performing engineering teams prioritize psychological safety; uncooperative behavior is the #1 cited reason for apprenticeship termination.",
        "prerequisites": ["Basic code review experience"],
        "learning_outcomes": [
            "Frame code review comments with empathy and objective rationale",
            "Navigate conflicting technical viewpoints using decision matrices",
            "Foster psychological safety during team retrospective meetings"
        ],
        "reassessment_rubric": {
            "criteria": ["Peer collaboration evaluation >= 4.0", "Situational conflict de-escalation test"],
            "max_score": 5.0
        },
        "market_demand_alignment": 92
    }
]
