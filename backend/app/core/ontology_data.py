"""
Ontology Dataset for Competency Intelligence Module
Connecting: Course -> Competency -> Skill -> Occupation
Domains covered:
1. Software Development
2. Data Analytics
3. Digital Marketing
4. Electrician
5. Healthcare
6. Retail
7. Manufacturing
"""

COURSES_DATA = [
    # 1. Software Development
    {
        "id": "crs-sw-01",
        "code": "CRS-SWE-101",
        "title": "Full-Stack Enterprise Cloud & Web Architecture",
        "domain": "Software Development",
        "provider": "Bengaluru Institute of Technology & Skills",
        "duration_weeks": 24,
        "description": "Comprehensive immersive engineering curriculum covering asynchronous backend microservices, modern reactive component frontends, SQL database persistence, and cloud orchestration.",
        "competency_ids": ["cmp-sw-01", "cmp-sw-02"],
    },
    # 2. Data Analytics
    {
        "id": "crs-da-01",
        "code": "CRS-DAT-201",
        "title": "Applied Business Intelligence & Data Analytics",
        "domain": "Data Analytics",
        "provider": "IIIT Bangalore Data Science Academy",
        "duration_weeks": 16,
        "description": "End-to-end analytical pipeline engineering focusing on relational data extraction, SQL querying, interactive executive dashboards in Tableau, and predictive decision support.",
        "competency_ids": ["cmp-da-01", "cmp-da-02"],
    },
    # 3. Digital Marketing
    {
        "id": "crs-dm-01",
        "code": "CRS-MKT-301",
        "title": "Omnichannel Growth & Performance Marketing",
        "domain": "Digital Marketing",
        "provider": "Digital Media Growth Institute (Mumbai)",
        "duration_weeks": 14,
        "description": "Cross-channel digital marketing mastery emphasizing organic search engine ranking, GA4 event instrumentation, paid acquisition telemetry, and high-conversion copywriting.",
        "competency_ids": ["cmp-dm-01", "cmp-dm-02"],
    },
    # 4. Electrician
    {
        "id": "crs-el-01",
        "code": "CRS-ELE-401",
        "title": "Commercial & Industrial Electrical Trades Program",
        "domain": "Electrician",
        "provider": "National Skill Training Institute (NSTI) Chennai",
        "duration_weeks": 30,
        "description": "Rigorous hands-on vocational curriculum preparing apprentices for electrical contractor licensing through conduit bending, diagnostic multimeter troubleshooting, and BIS/CEA safety protocols.",
        "competency_ids": ["cmp-el-01", "cmp-el-02"],
    },
    # 5. Healthcare
    {
        "id": "crs-hc-01",
        "code": "CRS-HEA-501",
        "title": "Certified Clinical Medical Assisting & Patient Care",
        "domain": "Healthcare",
        "provider": "Apollo MedSkills Allied Health Institute (Hyderabad)",
        "duration_weeks": 20,
        "description": "Accredited clinical program developing front-line healthcare competencies including patient vitals triage, Electronic Health Record documentation, and empathic patient bedside de-escalation.",
        "competency_ids": ["cmp-hc-01", "cmp-hc-02"],
    },
    # 6. Retail
    {
        "id": "crs-rt-01",
        "code": "CRS-RET-601",
        "title": "Modern Retail Operations & Storefront Leadership",
        "domain": "Retail",
        "provider": "Retail Leadership Institute of India (Delhi NCR)",
        "duration_weeks": 12,
        "description": "Practical retail management certification developing point-of-sale transactional accuracy, inventory replenishment, shrinkage mitigation, and conflict de-escalation.",
        "competency_ids": ["cmp-rt-01", "cmp-rt-02"],
    },
    # 7. Manufacturing
    {
        "id": "crs-mf-01",
        "code": "CRS-MFG-701",
        "title": "Advanced Precision CNC Machining & Quality Control",
        "domain": "Manufacturing",
        "provider": "PSG Industrial Technology Center (Coimbatore)",
        "duration_weeks": 22,
        "description": "Industry 4.0 machining academy providing hands-on setup of multi-axis CNC mills, ISO G-code programming, GD&T precision metrology, and 5S workplace organization.",
        "competency_ids": ["cmp-mf-01", "cmp-mf-02"],
    },
]

COMPETENCIES_DATA = [
    # Software Development
    {
        "id": "cmp-sw-01",
        "code": "CMP-SWE-BACKEND",
        "title": "Cloud-Native API Architecture & Microservices",
        "domain": "Software Development",
        "description": "Architecting resilient asynchronous REST endpoints, data persistence schemas, authentication layers, and containerized deployment workflows.",
        "course_ids": ["crs-sw-01"],
        "skill_ids": ["sk-6", "sk-8", "sk-17"],
    },
    {
        "id": "cmp-sw-02",
        "code": "CMP-SWE-FRONTEND",
        "title": "Declarative Component Systems & Client State",
        "domain": "Software Development",
        "description": "Engineering interactive responsive web interfaces using modern component lifecycles, typed properties, and client-side caching.",
        "course_ids": ["crs-sw-01"],
        "skill_ids": ["sk-1", "sk-2", "sk-17"],
    },
    # Data Analytics
    {
        "id": "cmp-da-01",
        "code": "CMP-DAT-WAREHOUSE",
        "title": "Relational Data Modeling & Analytical Querying",
        "domain": "Data Analytics",
        "description": "Transforming unstructured and normalized transactional records into performant analytical data models and automated reporting feeds.",
        "course_ids": ["crs-da-01"],
        "skill_ids": ["sk-sql", "sk-storytelling"],
    },
    {
        "id": "cmp-da-02",
        "code": "CMP-DAT-VISUAL",
        "title": "Executive Business Intelligence & Dashboards",
        "domain": "Data Analytics",
        "description": "Translating multi-dimensional business performance metrics into intuitive interactive visualization dashboards that drive strategic operations.",
        "course_ids": ["crs-da-01"],
        "skill_ids": ["sk-tableau", "sk-storytelling"],
    },
    # Digital Marketing
    {
        "id": "cmp-dm-01",
        "code": "CMP-MKT-SEO",
        "title": "Search Engine Optimization & Organic Growth",
        "domain": "Digital Marketing",
        "description": "Executing technical on-page SEO, semantic keyword clustering, site crawl optimization, and inbound backlink acquisition strategies.",
        "course_ids": ["crs-dm-01"],
        "skill_ids": ["sk-seo", "sk-copywriting"],
    },
    {
        "id": "cmp-dm-02",
        "code": "CMP-MKT-ANALYTICS",
        "title": "Web Analytics & Conversion Telemetry",
        "domain": "Digital Marketing",
        "description": "Configuring event tracking parameters, funnel analysis, attribution modeling, and user journey optimization via Google Analytics 4.",
        "course_ids": ["crs-dm-01"],
        "skill_ids": ["sk-ga4", "sk-copywriting"],
    },
    # Electrician
    {
        "id": "cmp-el-01",
        "code": "CMP-ELE-CONDUIT",
        "title": "Conduit Bending & Electrical Raceway Fabrication",
        "domain": "Electrician",
        "description": "Calculating stub-ups, offsets, saddle bends, and mounting EMT and rigid conduit in commercial facilities adhering to National Electrical Code specs.",
        "course_ids": ["crs-el-01"],
        "skill_ids": ["sk-conduit", "sk-loto"],
    },
    {
        "id": "cmp-el-02",
        "code": "CMP-ELE-TESTING",
        "title": "Diagnostic Circuit Testing & Electrical Safety",
        "domain": "Electrician",
        "description": "Diagnosing voltage drops, ground faults, and phase imbalances with digital multimeters under strict Lockout/Tagout workplace safety constraints.",
        "course_ids": ["crs-el-01"],
        "skill_ids": ["sk-multimeter", "sk-loto"],
    },
    # Healthcare
    {
        "id": "cmp-hc-01",
        "code": "CMP-HEA-VITALS",
        "title": "Clinical Patient Vitals & Health Triage",
        "domain": "Healthcare",
        "description": "Accurately measuring, evaluating, and triaging patient vital indicators including blood pressure, pulse, SpO2, and respiratory rate in acute settings.",
        "course_ids": ["crs-hc-01"],
        "skill_ids": ["sk-vitals", "sk-empathy"],
    },
    {
        "id": "cmp-hc-02",
        "code": "CMP-HEA-EHR",
        "title": "Electronic Health Records (EHR) Administration",
        "domain": "Healthcare",
        "description": "Documenting clinical encounters, lab requisitions, medication administration records, and patient histories in compliance with HIPAA privacy standards.",
        "course_ids": ["crs-hc-01"],
        "skill_ids": ["sk-ehr", "sk-empathy"],
    },
    # Retail
    {
        "id": "cmp-rt-01",
        "code": "CMP-RET-POS",
        "title": "Point-of-Sale (POS) & Cash Operations",
        "domain": "Retail",
        "description": "Processing high-volume omnichannel transactions, returns, warranty registrations, and reconciling daily cash drawers with zero variance.",
        "course_ids": ["crs-rt-01"],
        "skill_ids": ["sk-pos", "sk-conflict"],
    },
    {
        "id": "cmp-rt-02",
        "code": "CMP-RET-INVENTORY",
        "title": "Merchandising & Inventory Control",
        "domain": "Retail",
        "description": "Conducting periodic cycle counts, stock replenishment forecasting, planogram execution, and store shrinkage mitigation audits.",
        "course_ids": ["crs-rt-01"],
        "skill_ids": ["sk-inventory", "sk-conflict"],
    },
    # Manufacturing
    {
        "id": "cmp-mf-01",
        "code": "CMP-MFG-CNC",
        "title": "Computer Numerical Control (CNC) Milling & G-Code",
        "domain": "Manufacturing",
        "description": "Setting up multi-axis milling centers, configuring work coordinate systems, tool offsets, and executing ISO G-code programs for precision metal components.",
        "course_ids": ["crs-mf-01"],
        "skill_ids": ["sk-cnc", "sk-lean5s"],
    },
    {
        "id": "cmp-mf-02",
        "code": "CMP-MFG-GDT",
        "title": "Geometric Dimensioning & Tolerancing (GD&T) Metrology",
        "domain": "Manufacturing",
        "description": "Verifying aerospace and automotive tolerance features using calipers, micrometers, height gauges, and optical comparators according to ASME Y14.5.",
        "course_ids": ["crs-mf-01"],
        "skill_ids": ["sk-gdt", "sk-lean5s"],
    },
]

SKILLS_DATA = [
    # ----------------------------------------------------
    # 1. SOFTWARE DEVELOPMENT
    # ----------------------------------------------------
    {
        "id": "sk-6",
        "code": "SK-SW-PY",
        "name": "Python",
        "canonical_name": "Python",
        "category": "hard",
        "domain": "Software Development",
        "description": "High-level interpreted programming language renowned for clear syntax, asynchronous microservices, data processing, and enterprise backend engineering.",
        "demand_score": 96,
        "trainees_proficient": 188,
        "open_job_demands": 72,
        "growth_trend": "+35% YoY",
        "aliases": ["Python Programming", "Python Development", "Py", "Python 3", "CPython", "Python Scripting"],
        "proficiency_levels": {
            "0": {
                "level": 0,
                "title": "Novice / Unfamiliar",
                "description": "No prior experience with Python; unable to read or write basic scripts without continuous guidance.",
                "rubric": ["Cannot define variables or control flow", "Unfamiliar with terminal or virtual environments"]
            },
            "1": {
                "level": 1,
                "title": "Fundamental / Basic",
                "description": "Understands core syntax, standard library collections (lists, dicts, sets), basic loops, and function declarations.",
                "rubric": ["Writes scripts under 100 lines", "Parses simple JSON/CSV files", "Installs packages via pip"]
            },
            "2": {
                "level": 2,
                "title": "Competent / Working Knowledge",
                "description": "Writes modular object-oriented code, uses virtualenv/poetry, handles exceptions, and connects to SQL databases using ORMs.",
                "rubric": ["Structures multi-module packages", "Uses list comprehensions & generators", "Interacts with REST endpoints"]
            },
            "3": {
                "level": 3,
                "title": "Proficient / Autonomous",
                "description": "Develops production asynchronous web services (FastAPI/Django), writes unit and integration tests (pytest), and manages schema migrations.",
                "rubric": ["Builds async route handlers with Pydantic", "Implements 80%+ test branch coverage", "Uses type annotations rigorously"]
            },
            "4": {
                "level": 4,
                "title": "Advanced / Specialist",
                "description": "Optimizes CPU/memory bottlenecks, leverages asyncio concurrency, configures background workers (Celery/RQ), and structures complex domain models.",
                "rubric": ["Profiles memory leaks using tracemalloc", "Designs clean hexagonal/clean architecture", "Tunes SQLAlchemy connection pools"]
            },
            "5": {
                "level": 5,
                "title": "Expert / Mastery",
                "description": "Authors shared open-source libraries, defines enterprise language standards, debugs C-extension internals, and mentors senior developers.",
                "rubric": ["Contributes to core ecosystem packages", "Authors architectural guidelines across organization", "Benchmarks bytecode and interpreter internals"]
            }
        },
        "related_competency_ids": ["cmp-sw-01"],
        "related_occupation_ids": ["occ-sw-01", "occ-sw-02"]
    },
    {
        "id": "sk-1",
        "code": "SK-SW-REACT",
        "name": "React.js",
        "canonical_name": "React.js",
        "category": "hard",
        "domain": "Software Development",
        "description": "Component-based declarative JavaScript UI library for building responsive, high-performance web applications and stateful client dashboards.",
        "demand_score": 92,
        "trainees_proficient": 245,
        "open_job_demands": 58,
        "growth_trend": "+14% YoY",
        "aliases": ["React", "ReactJS", "React framework", "React.js Development", "React Frontend", "React Web"],
        "proficiency_levels": {
            "0": {
                "level": 0,
                "title": "Novice / Unfamiliar",
                "description": "Unfamiliar with React virtual DOM or component lifecycle.",
                "rubric": ["Cannot differentiate props from state", "Unable to create functional components"]
            },
            "1": {
                "level": 1,
                "title": "Fundamental / Basic",
                "description": "Builds basic components, handles click events, and passes simple props.",
                "rubric": ["Renders static JSX elements", "Uses useState for simple boolean toggles"]
            },
            "2": {
                "level": 2,
                "title": "Competent / Working Knowledge",
                "description": "Manages component side-effects with useEffect, consumes REST APIs, and binds controlled form inputs.",
                "rubric": ["Handles API data fetching & loading states", "Implements client routing via React Router"]
            },
            "3": {
                "level": 3,
                "title": "Proficient / Autonomous",
                "description": "Engineers custom hooks, implements TanStack Query caching, and crafts accessible UI component libraries.",
                "rubric": ["Implements optimistic UI updates", "Avoids unnecessary re-renders using memo & callback", "Ensures WCAG accessibility"]
            },
            "4": {
                "level": 4,
                "title": "Advanced / Specialist",
                "description": "Architects micro-frontends, server components (RSC), code splitting, and enterprise design tokens.",
                "rubric": ["Reduces bundle size via dynamic imports", "Authors reusable enterprise design systems", "Configures complex client-side caching"]
            },
            "5": {
                "level": 5,
                "title": "Expert / Mastery",
                "description": "Drives company-wide web rendering strategy, authors foundational framework utilities, and optimizes core web vitals at scale.",
                "rubric": ["Mentors staff engineers on rendering engine quirks", "Authors high-performance headless component libraries", "Audits hydration waterfalls"]
            }
        },
        "related_competency_ids": ["cmp-sw-02"],
        "related_occupation_ids": ["occ-sw-01"]
    },
    {
        "id": "sk-17",
        "code": "SK-SW-COMM",
        "name": "Technical Communication",
        "canonical_name": "Technical Communication",
        "category": "soft",
        "domain": "Software Development",
        "description": "Synthesizing complex technical trade-offs, writing unambiguous architecture documentation, and aligning engineering with executive stakeholders.",
        "demand_score": 98,
        "trainees_proficient": 310,
        "open_job_demands": 110,
        "growth_trend": "+12% YoY",
        "aliases": ["Engineering Communication", "Technical Documentation", "Cross-Functional Collaboration", "Tech Writing", "Architecture Proposals"],
        "proficiency_levels": {
            "0": {
                "level": 0,
                "title": "Novice / Unfamiliar",
                "description": "Struggles to articulate technical ideas clearly; documentation is incomplete or confusing.",
                "rubric": ["Does not document code changes", "Hesitant to ask clarifying questions"]
            },
            "1": {
                "level": 1,
                "title": "Fundamental / Basic",
                "description": "Writes standard pull request descriptions and provides constructive feedback in team standups.",
                "rubric": ["Documents reproduction steps for bugs", "Communicates blocker status during daily agile rituals"]
            },
            "2": {
                "level": 2,
                "title": "Competent / Working Knowledge",
                "description": "Authors clear README files, API parameter schemas, and delivers concise technical sprint demonstrations.",
                "rubric": ["Writes markdown API usage guides", "Explains implementation choices in code review comments"]
            },
            "3": {
                "level": 3,
                "title": "Proficient / Autonomous",
                "description": "Authors Architecture Decision Records (ADRs), conducts cross-team reviews, and facilitates design workshops.",
                "rubric": ["Drafts RFCs with alternatives considered", "Presents system designs to mixed technical audiences"]
            },
            "4": {
                "level": 4,
                "title": "Advanced / Specialist",
                "description": "Bridges corporate business drivers with engineering constraints; negotiates project scope with non-technical clients.",
                "rubric": ["Translates business OKRs into engineering epics", "Facilitates incident post-mortems with blameless empathy"]
            },
            "5": {
                "level": 5,
                "title": "Expert / Mastery",
                "description": "Orchestrates organizational alignment on multi-year technical vision; keynote speaker and industry thought leader.",
                "rubric": ["Authors published technical whitepapers", "Mentors executive leadership on technology strategy"]
            }
        },
        "related_competency_ids": ["cmp-sw-01", "cmp-sw-02"],
        "related_occupation_ids": ["occ-sw-01", "occ-sw-02"]
    },
    {
        "id": "sk-2",
        "code": "SK-SW-TS",
        "name": "TypeScript",
        "canonical_name": "TypeScript",
        "category": "hard",
        "domain": "Software Development",
        "description": "Typed superset of JavaScript that compiles to plain JavaScript, providing compile-time type safety, interfaces, and refactoring confidence.",
        "demand_score": 95,
        "trainees_proficient": 210,
        "open_job_demands": 64,
        "growth_trend": "+28% YoY",
        "aliases": ["TypeScript", "TS", "Type Script", "TypeScript Programming"],
        "proficiency_levels": {
            "0": {"level": 0, "title": "Novice / Unfamiliar", "description": "Unfamiliar with static type systems in JavaScript.", "rubric": ["Cannot define basic types", "Confuses any with unknown"]},
            "1": {"level": 1, "title": "Fundamental / Basic", "description": "Annotates primitive function parameters and return types.", "rubric": ["Uses string, number, boolean types", "Writes simple interfaces"]},
            "2": {"level": 2, "title": "Competent / Working Knowledge", "description": "Defines union types, optional properties, and type aliases.", "rubric": ["Applies type narrowing with typeof and instanceof", "Configures tsconfig.json options"]},
            "3": {"level": 3, "title": "Proficient / Autonomous", "description": "Implements generic functions, discriminated unions, and utility types.", "rubric": ["Uses Partial, Omit, Pick, Record", "Builds strict type guards"]},
            "4": {"level": 4, "title": "Advanced / Specialist", "description": "Authors conditional types, mapped types, and template literal types.", "rubric": ["Creates complex type-level assertions", "Publishes library typings (d.ts)"]},
            "5": {"level": 5, "title": "Expert / Mastery", "description": "Architects enterprise typed API contracts and monorepo build pipelines.", "rubric": ["Authors compiler plugins", "Tunes type-checking performance across 100k+ LOC projects"]}
        },
        "related_competency_ids": ["cmp-sw-02"],
        "related_occupation_ids": ["occ-sw-01"]
    },
    {
        "id": "sk-8",
        "code": "SK-SW-PG",
        "name": "PostgreSQL & pgvector",
        "canonical_name": "PostgreSQL & pgvector",
        "category": "hard",
        "domain": "Software Development",
        "description": "Advanced relational database management system with ACID transactions, JSONB indexing, and pgvector semantic similarity embeddings.",
        "demand_score": 89,
        "trainees_proficient": 165,
        "open_job_demands": 53,
        "growth_trend": "+42% YoY",
        "aliases": ["PostgreSQL", "Postgres", "pgvector", "PostgreSQL & pgvector", "Postgres Database"],
        "proficiency_levels": {
            "0": {"level": 0, "title": "Novice / Unfamiliar", "description": "Unfamiliar with relational SQL engines or vectors.", "rubric": ["Cannot connect to database", "Unaware of table constraints"]},
            "1": {"level": 1, "title": "Fundamental / Basic", "description": "Creates tables, sets primary keys, and runs basic inserts/updates.", "rubric": ["Runs schema DDL scripts", "Creates foreign key constraints"]},
            "2": {"level": 2, "title": "Competent / Working Knowledge", "description": "Configures connection pooling and indexes JSONB columns using GIN.", "rubric": ["Queries nested JSONB attributes", "Applies transaction isolation levels"]},
            "3": {"level": 3, "title": "Proficient / Autonomous", "description": "Implements pgvector cosine and L2 distance similarity queries (HNSW/IVFFlat).", "rubric": ["Creates HNSW vector indexes", "Optimizes semantic search recall with index parameters"]},
            "4": {"level": 4, "title": "Advanced / Specialist", "description": "Tunes vacuum thresholds, shared_buffers, and WAL checkpoints for heavy writes.", "rubric": ["Analyzes pg_stat_statements", "Resolves lock contention and bloat"]},
            "5": {"level": 5, "title": "Expert / Mastery", "description": "Designs multi-node read replica topologies and zero-downtime database sharding.", "rubric": ["Architects petabyte-scale database clusters", "Authors custom pg extension routines"]}
        },
        "related_competency_ids": ["cmp-sw-01"],
        "related_occupation_ids": ["occ-sw-01", "occ-sw-02"]
    },
    {
        "id": "sk-9",
        "code": "SK-SW-DOCK",
        "name": "Docker & Containerization",
        "canonical_name": "Docker & Containerization",
        "category": "hard",
        "domain": "Software Development",
        "description": "Packaging services into isolated containers, writing multi-stage Dockerfiles, and orchestrating local environments with Docker Compose.",
        "demand_score": 84,
        "trainees_proficient": 140,
        "open_job_demands": 49,
        "growth_trend": "+19% YoY",
        "aliases": ["Docker", "Containerization", "Docker Compose", "Containers", "Docker & Containerization"],
        "proficiency_levels": {
            "0": {"level": 0, "title": "Novice / Unfamiliar", "description": "Unfamiliar with virtualization or container images.", "rubric": ["Cannot run docker container", "Confuses VMs with containers"]},
            "1": {"level": 1, "title": "Fundamental / Basic", "description": "Pulls images from registries and runs containers with port mappings.", "rubric": ["Uses docker run and docker ps", "Inspects container logs"]},
            "2": {"level": 2, "title": "Competent / Working Knowledge", "description": "Writes standard Dockerfiles, mounts persistent volumes, and defines bridge networks.", "rubric": ["Defines WORKDIR and COPY steps", "Mounts host volumes for hot reload"]},
            "3": {"level": 3, "title": "Proficient / Autonomous", "description": "Authors multi-stage Dockerfiles to minimize production image footprint.", "rubric": ["Reduces image sizes by > 70%", "Configures docker-compose multi-service stacks"]},
            "4": {"level": 4, "title": "Advanced / Specialist", "description": "Implements rootless containers, security scanning (Trivy), and BuildKit caching.", "rubric": ["Scans images for CVE vulnerabilities", "Optimizes build layer caching in CI/CD"]},
            "5": {"level": 5, "title": "Expert / Mastery", "description": "Architects enterprise container runtime security and custom OCI registries.", "rubric": ["Authors company-wide base image security standards", "Orchestrates multi-arch ARM/x86 builds"]}
        },
        "related_competency_ids": ["cmp-sw-01"],
        "related_occupation_ids": ["occ-sw-01", "occ-sw-02"]
    },
    {
        "id": "sk-14",
        "code": "SK-SW-SEC",
        "name": "Network & Cloud Security",
        "canonical_name": "Network & Cloud Security",
        "category": "hard",
        "domain": "Software Development",
        "description": "Securing cloud endpoints, implementing TLS encryption, enforcing Zero-Trust access, and conducting vulnerability scans.",
        "demand_score": 91,
        "trainees_proficient": 120,
        "open_job_demands": 45,
        "growth_trend": "+31% YoY",
        "aliases": ["Network Security", "Cloud Security", "Cybersecurity", "Network & Cloud Security", "InfoSec"],
        "proficiency_levels": {
            "0": {"level": 0, "title": "Novice / Unfamiliar", "description": "Unfamiliar with web security vulnerabilities or HTTPS.", "rubric": ["Stores credentials in plain text", "Unaware of OWASP Top 10"]},
            "1": {"level": 1, "title": "Fundamental / Basic", "description": "Understands password hashing, HTTPS encryption, and basic firewall rules.", "rubric": ["Uses bcrypt/argon2 hashing", "Configures basic CORS origins"]},
            "2": {"level": 2, "title": "Competent / Working Knowledge", "description": "Implements JWT token authentication, role-based access control (RBAC), and sanitizes inputs.", "rubric": ["Prevents SQL injection with parameterized queries", "Sets Secure/HttpOnly cookie attributes"]},
            "3": {"level": 3, "title": "Proficient / Autonomous", "description": "Configures OAuth2/OIDC flows, VPC security groups, and automated SAST/DAST pipelines.", "rubric": ["Configures mTLS between microservices", "Remediates OWASP vulnerabilities"]},
            "4": {"level": 4, "title": "Advanced / Specialist", "description": "Implements Zero-Trust architecture, secret rotation (Vault), and incident threat containment.", "rubric": ["Automates secrets rotation without downtime", "Conducts internal penetration testing"]},
            "5": {"level": 5, "title": "Expert / Mastery", "description": "Chief Information Security Officer; certifies enterprise compliance (SOC 2, ISO 27001, HIPAA).", "rubric": ["Achieves SOC 2 Type II compliance audits", "Directs global CSIRT emergency responses"]}
        },
        "related_competency_ids": ["cmp-sw-01"],
        "related_occupation_ids": ["occ-sw-02"]
    },


    # ----------------------------------------------------
    # 2. DATA ANALYTICS
    # ----------------------------------------------------
    {
        "id": "sk-sql",
        "code": "SK-DA-SQL",
        "name": "SQL Querying & Data Modeling",
        "canonical_name": "SQL Querying & Data Modeling",
        "category": "hard",
        "domain": "Data Analytics",
        "description": "Relational data extraction, multi-table joins, subqueries, window functions, CTEs, and schema indexing for high-volume database analytics.",
        "demand_score": 95,
        "trainees_proficient": 220,
        "open_job_demands": 85,
        "growth_trend": "+24% YoY",
        "aliases": ["SQL", "Structured Query Language", "SQL Querying", "PostgreSQL Querying", "SQL Database", "SQL Analytics", "T-SQL"],
        "proficiency_levels": {
            "0": {
                "level": 0,
                "title": "Novice / Unfamiliar",
                "description": "No knowledge of relational databases or querying concepts.",
                "rubric": ["Cannot write SELECT statements", "Unfamiliar with tables and rows"]
            },
            "1": {
                "level": 1,
                "title": "Fundamental / Basic",
                "description": "Executes SELECT, WHERE, ORDER BY, and simple aggregate operations (COUNT, SUM, AVG).",
                "rubric": ["Queries single tables with filters", "Performs basic column aliases and arithmetic"]
            },
            "2": {
                "level": 2,
                "title": "Competent / Working Knowledge",
                "description": "Constructs INNER and LEFT JOINs across multiple tables, GROUP BY with HAVING, and handles NULL values.",
                "rubric": ["Joins 3+ tables accurately", "Avoids Cartesian product traps", "Uses CASE WHEN statements"]
            },
            "3": {
                "level": 3,
                "title": "Proficient / Autonomous",
                "description": "Writes Common Table Expressions (CTEs), window analytical functions (ROW_NUMBER, LAG, LEAD), and subqueries.",
                "rubric": ["Calculates rolling 30-day metrics", "Segments cohort retention matrices", "Interprets EXPLAIN query execution plans"]
            },
            "4": {
                "level": 4,
                "title": "Advanced / Specialist",
                "description": "Tunes complex query plans, designs star schemas / snowflake schemas, and constructs materialized views.",
                "rubric": ["Designs composite B-tree indexes", "Partitions large multi-gigabyte tables", "Refactors bottleneck queries"]
            },
            "5": {
                "level": 5,
                "title": "Expert / Mastery",
                "description": "Architects enterprise data warehouse layers (Snowflake/BigQuery), sets up database replication, and defines query governance.",
                "rubric": ["Sets enterprise query standards", "Optimizes cost and memory footprints in cloud warehouses", "Authors data access layer abstraction"]
            }
        },
        "related_competency_ids": ["cmp-da-01"],
        "related_occupation_ids": ["occ-da-01", "occ-da-02"]
    },
    {
        "id": "sk-tableau",
        "code": "SK-DA-TAB",
        "name": "Tableau Visual Analytics",
        "canonical_name": "Tableau Visual Analytics",
        "category": "hard",
        "domain": "Data Analytics",
        "description": "Building interactive enterprise business intelligence dashboards, calculated fields, LOD expressions, and visual data stories.",
        "demand_score": 88,
        "trainees_proficient": 160,
        "open_job_demands": 48,
        "growth_trend": "+18% YoY",
        "aliases": ["Tableau", "Tableau BI", "Tableau Reporting", "Tableau Dashboards", "Tableau Desktop", "Tableau Server"],
        "proficiency_levels": {
            "0": {
                "level": 0,
                "title": "Novice / Unfamiliar",
                "description": "Unfamiliar with Tableau Desktop or data visualization tools.",
                "rubric": ["Cannot connect to data sources", "Unfamiliar with dimensions vs measures"]
            },
            "1": {
                "level": 1,
                "title": "Fundamental / Basic",
                "description": "Builds basic bar charts, line graphs, and applies simple date filters.",
                "rubric": ["Creates 2-3 standard chart sheets", "Exports basic visual PDF exports"]
            },
            "2": {
                "level": 2,
                "title": "Competent / Working Knowledge",
                "description": "Builds multi-sheet interactive dashboards with quick filters, custom tooltips, and calculated fields.",
                "rubric": ["Uses basic IF/THEN calculated fields", "Constructs clean visual layouts adhering to color contrast"]
            },
            "3": {
                "level": 3,
                "title": "Proficient / Autonomous",
                "description": "Creates Level of Detail (LOD) expressions (FIXED, INCLUDE, EXCLUDE), dashboard actions, and parameter controls.",
                "rubric": ["Calculates cohort retention with FIXED LOD", "Connects live database feeds with extracts", "Builds drill-down hierarchies"]
            },
            "4": {
                "level": 4,
                "title": "Advanced / Specialist",
                "description": "Optimizes dashboard workbook performance, manages row-level security permissions, and implements advanced chart extensions.",
                "rubric": ["Audits performance recording to eliminate slow rendering", "Configures Tableau Server / Cloud site permissions", "Designs executive KPI command centers"]
            },
            "5": {
                "level": 5,
                "title": "Expert / Mastery",
                "description": "Directs organization-wide BI dashboard governance, establishes company visual style guide, and mentors enterprise analysts.",
                "rubric": ["Publishes certified enterprise data sources", "Establishes institutional analytics design systems", "Mentors department leads on data adoption"]
            }
        },
        "related_competency_ids": ["cmp-da-02"],
        "related_occupation_ids": ["occ-da-01", "occ-da-02"]
    },
    {
        "id": "sk-storytelling",
        "code": "SK-DA-STORY",
        "name": "Data Storytelling & Executive Presentation",
        "canonical_name": "Data Storytelling & Executive Presentation",
        "category": "soft",
        "domain": "Data Analytics",
        "description": "Synthesizing complex empirical data into persuasive executive narratives that clarify business context and inspire decisive operational action.",
        "demand_score": 91,
        "trainees_proficient": 195,
        "open_job_demands": 62,
        "growth_trend": "+20% YoY",
        "aliases": ["Data Storytelling", "Executive Presentation", "Data Presentation", "Insights Delivery", "Communicating Data"],
        "proficiency_levels": {
            "0": {
                "level": 0,
                "title": "Novice / Unfamiliar",
                "description": "Presents raw tables without identifying actionable insights or business context.",
                "rubric": ["Dumps raw metrics without takeaways", "Struggles to answer why numbers matter"]
            },
            "1": {
                "level": 1,
                "title": "Fundamental / Basic",
                "description": "Identifies high-level trends and summarizes positive/negative percentage changes.",
                "rubric": ["Highlights top performing categories", "Prepares basic slide decks with bulleted points"]
            },
            "2": {
                "level": 2,
                "title": "Competent / Working Knowledge",
                "description": "Frames data around business questions, highlights anomalies, and structures presentations logically.",
                "rubric": ["Frames insights with clear 'What, So What, Now What' structure", "Answers ad-hoc stakeholder questions calmly"]
            },
            "3": {
                "level": 3,
                "title": "Proficient / Autonomous",
                "description": "Tailors depth of empirical evidence to executive vs technical audiences and proposes cost-benefit recommendations.",
                "rubric": ["Quantifies expected revenue impact of recommendations", "Anticipates counterarguments and prepares backup slides"]
            },
            "4": {
                "level": 4,
                "title": "Advanced / Specialist",
                "description": "Guides C-suite decision-making through strategic trade-off scenarios and builds consensus across competing departments.",
                "rubric": ["Leads quarterly strategic business reviews", "Influences multi-million dollar resource allocations"]
            },
            "5": {
                "level": 5,
                "title": "Expert / Mastery",
                "description": "Transforms organizational decision-making culture through narrative data literacy programs.",
                "rubric": ["Trains executive leadership on analytical decision frameworks", "Delivers keynote presentations on industry trends"]
            }
        },
        "related_competency_ids": ["cmp-da-01", "cmp-da-02"],
        "related_occupation_ids": ["occ-da-01", "occ-da-02"]
    },

    # ----------------------------------------------------
    # 3. DIGITAL MARKETING
    # ----------------------------------------------------
    {
        "id": "sk-seo",
        "code": "SK-DM-SEO",
        "name": "Search Engine Optimization",
        "canonical_name": "Search Engine Optimization",
        "category": "hard",
        "domain": "Digital Marketing",
        "description": "Increasing high-intent organic web traffic through technical website architecture audits, on-page content optimization, and backlink authority building.",
        "demand_score": 89,
        "trainees_proficient": 140,
        "open_job_demands": 44,
        "growth_trend": "+15% YoY",
        "aliases": ["SEO", "SEO Marketing", "Search Engine Optimization (SEO)", "Organic Search Optimization", "Technical SEO", "On-Page SEO"],
        "proficiency_levels": {
            "0": {
                "level": 0,
                "title": "Novice / Unfamiliar",
                "description": "Unfamiliar with search engine crawler behavior or keyword intent.",
                "rubric": ["Does not understand meta title tags or headings", "Unfamiliar with Google Search Console"]
            },
            "1": {
                "level": 1,
                "title": "Fundamental / Basic",
                "description": "Conducts basic keyword research and writes descriptive title tags and meta descriptions.",
                "rubric": ["Identifies search volumes using keyword tools", "Populates image alt tags and header tags"]
            },
            "2": {
                "level": 2,
                "title": "Competent / Working Knowledge",
                "description": "Executes on-page content audits, maps intent keywords to landing pages, and diagnoses broken 404 links.",
                "rubric": ["Fixes canonical tag conflicts", "Implements 301 redirect maps", "Uses Google Search Console to monitor rankings"]
            },
            "3": {
                "level": 3,
                "title": "Proficient / Autonomous",
                "description": "Conducts full technical crawls (Screaming Frog), optimizes crawl budget, resolves Core Web Vitals issues, and implements Schema.org structured data.",
                "rubric": ["Instruments JSON-LD schema markup", "Optimizes internal link anchor equity", "Audits JavaScript rendering issues for bots"]
            },
            "4": {
                "level": 4,
                "title": "Advanced / Specialist",
                "description": "Manages international SEO (hreflang), executes complex domain migrations, and builds programmatic SEO content templates.",
                "rubric": ["Executes zero-traffic-loss website migrations", "Builds automated programmatic page generation workflows"]
            },
            "5": {
                "level": 5,
                "title": "Expert / Mastery",
                "description": "Pioneers generative engine optimization (GEO), adapts to core algorithm updates, and drives tens of millions in enterprise organic revenue.",
                "rubric": ["Advises enterprise brands on search algorithm shifts", "Defines global multi-language search architecture"]
            }
        },
        "related_competency_ids": ["cmp-dm-01"],
        "related_occupation_ids": ["occ-dm-01", "occ-dm-02"]
    },
    {
        "id": "sk-ga4",
        "code": "SK-DM-GA4",
        "name": "Google Analytics 4 (GA4)",
        "canonical_name": "Google Analytics 4 (GA4)",
        "category": "hard",
        "domain": "Digital Marketing",
        "description": "Measuring digital user behavior using event-based data streams, custom dimensions, funnel exploration, and conversion attribution.",
        "demand_score": 90,
        "trainees_proficient": 155,
        "open_job_demands": 52,
        "growth_trend": "+29% YoY",
        "aliases": ["GA4", "Google Analytics", "Google Analytics 4", "GA4 Event Tracking", "Web Analytics GA4", "Google Tag Manager GA4"],
        "proficiency_levels": {
            "0": {
                "level": 0,
                "title": "Novice / Unfamiliar",
                "description": "Unfamiliar with GA4 interface or event tracking concept.",
                "rubric": ["Cannot locate standard traffic reports", "Unclear on session vs event paradigm"]
            },
            "1": {
                "level": 1,
                "title": "Fundamental / Basic",
                "description": "Navigates standard reports (Acquisition, Engagement, Monetization) and interprets active user counts.",
                "rubric": ["Filters traffic by source and medium", "Checks daily visitor trends"]
            },
            "2": {
                "level": 2,
                "title": "Competent / Working Knowledge",
                "description": "Configures conversion events, creates custom audiences, and builds basic exploration reports.",
                "rubric": ["Marks custom events as conversions", "Constructs standard free-form exploration tables"]
            },
            "3": {
                "level": 3,
                "title": "Proficient / Autonomous",
                "description": "Instruments custom event parameters via Google Tag Manager (GTM), designs checkout funnel explorations, and sets up User ID tracking.",
                "rubric": ["Builds multi-step open/closed checkout funnels", "Troubleshoots GTM trigger variables in preview mode", "Configures cross-domain tracking"]
            },
            "4": {
                "level": 4,
                "title": "Advanced / Specialist",
                "description": "Exports GA4 raw event data to BigQuery, builds custom attribution models, and integrates server-side GTM tagging.",
                "rubric": ["Queries raw GA4 BigQuery events with SQL", "Deploys server-side GTM container on Cloud Run", "Audits consent mode v2 compliance"]
            },
            "5": {
                "level": 5,
                "title": "Expert / Mastery",
                "description": "Architects enterprise measurement frameworks across web and mobile apps; sets global data privacy compliance and governance.",
                "rubric": ["Designs enterprise CDPs and telemetry stacks", "Audits multinational consent and regulatory compliance"]
            }
        },
        "related_competency_ids": ["cmp-dm-02"],
        "related_occupation_ids": ["occ-dm-01", "occ-dm-02"]
    },
    {
        "id": "sk-copywriting",
        "code": "SK-DM-COPY",
        "name": "Persuasive Copywriting & Content Strategy",
        "canonical_name": "Persuasive Copywriting & Content Strategy",
        "category": "soft",
        "domain": "Digital Marketing",
        "description": "Crafting compelling value propositions, email sequences, and ad copy tailored to buyer psychology and brand persona.",
        "demand_score": 87,
        "trainees_proficient": 175,
        "open_job_demands": 40,
        "growth_trend": "+11% YoY",
        "aliases": ["Copywriting", "Persuasive Copywriting", "Content Strategy", "Marketing Copywriting", "Brand Messaging", "Direct Response Copy"],
        "proficiency_levels": {
            "0": {
                "level": 0,
                "title": "Novice / Unfamiliar",
                "description": "Writes generic prose without clear calls to action or customer focus.",
                "rubric": ["Lacks awareness of target customer persona", "Neglects call-to-action in messaging"]
            },
            "1": {
                "level": 1,
                "title": "Fundamental / Basic",
                "description": "Drafts basic social media captions, newsletter summaries, and simple product descriptions.",
                "rubric": ["Follows standard grammar and brand guidelines", "Writes clear subject lines"]
            },
            "2": {
                "level": 2,
                "title": "Competent / Working Knowledge",
                "description": "Applies copywriting frameworks (AIDA, PAS) to produce landing page headlines, benefit bullets, and email sequences.",
                "rubric": ["Distinguishes product features from emotional benefits", "Writes high-CTR email nurture copy"]
            },
            "3": {
                "level": 3,
                "title": "Proficient / Autonomous",
                "description": "Runs A/B copy tests on high-converting landing pages, adjusts tone for B2B vs D2C audiences, and writes long-form sales copy.",
                "rubric": ["Improves landing page conversion rates through copy tests", "Maintains consistent brand voice across 5+ customer touchpoints"]
            },
            "4": {
                "level": 4,
                "title": "Advanced / Specialist",
                "description": "Conducts qualitative customer voice-of-customer interviews to extract resonant messaging hooks; leads creative campaign positioning.",
                "rubric": ["Synthesizes customer interviews into messaging hierarchy", "Directs multi-channel creative storytelling campaigns"]
            },
            "5": {
                "level": 5,
                "title": "Expert / Mastery",
                "description": "Defines iconic brand platforms that redefine market categories and inspire customer loyalty.",
                "rubric": ["Authors industry-defining brand playbooks", "Mentors creative teams and copywriters globally"]
            }
        },
        "related_competency_ids": ["cmp-dm-01", "cmp-dm-02"],
        "related_occupation_ids": ["occ-dm-01", "occ-dm-02"]
    },

    # ----------------------------------------------------
    # 4. ELECTRICIAN
    # ----------------------------------------------------
    {
        "id": "sk-conduit",
        "code": "SK-EL-COND",
        "name": "EMT Conduit Bending & Raceway Assembly",
        "canonical_name": "EMT Conduit Bending & Raceway Assembly",
        "category": "hard",
        "domain": "Electrician",
        "description": "Fabricating accurate bends in Electrical Metallic Tubing (EMT) and rigid conduit using hand and mechanical benders according to NEC fill rules.",
        "demand_score": 93,
        "trainees_proficient": 110,
        "open_job_demands": 48,
        "growth_trend": "+12% YoY",
        "aliases": ["Conduit Bending", "EMT Bending", "Pipe Bending", "Conduit Installation", "Raceway Fabrication", "EMT Conduit"],
        "proficiency_levels": {
            "0": {
                "level": 0,
                "title": "Novice / Unfamiliar",
                "description": "No experience using conduit benders; unfamiliar with conduit types.",
                "rubric": ["Does not know bender benchmark arrows", "Cannot measure pipe take-up"]
            },
            "1": {
                "level": 1,
                "title": "Fundamental / Basic",
                "description": "Bends standard 90-degree stubs in 1/2\" and 3/4\" EMT with instructor supervision.",
                "rubric": ["Applies proper foot pressure on bender shoe", "Calculates deduct amounts for standard 90-degree bends"]
            },
            "2": {
                "level": 2,
                "title": "Competent / Working Knowledge",
                "description": "Calculates and executes back-to-back 90s, simple box offsets, and reams conduit edges to prevent insulation damage.",
                "rubric": ["Bends consistent 30-degree offsets using multipliers", "Deburrs conduit interior thoroughly"]
            },
            "3": {
                "level": 3,
                "title": "Proficient / Autonomous",
                "description": "Fabricates precise 3-bend and 4-bend saddles around obstructions; mounts conduit straps conforming to NEC support intervals.",
                "rubric": ["Passes raceway inspection with tight tolerances (< 1/8\")", "Fastens one-hole and two-hole straps at code compliant spacing", "Calculates conduit fill limits"]
            },
            "4": {
                "level": 4,
                "title": "Advanced / Specialist",
                "description": "Operates hydraulic and electric benders on 2\"+ rigid steel conduit; designs multi-pipe parallel raceway racks.",
                "rubric": ["Calculates concentric bends on multi-tier commercial trapeze racks", "Sets up electric power bender parameters accurately"]
            },
            "5": {
                "level": 5,
                "title": "Expert / Mastery",
                "description": "Lead layout journeyman on multi-million dollar industrial builds; mentors electrical apprentices and blueprints complex plant raceways.",
                "rubric": ["Inspects and certifies industrial raceway installations", "Plans large scale substation conduit banks"]
            }
        },
        "related_competency_ids": ["cmp-el-01"],
        "related_occupation_ids": ["occ-el-01", "occ-el-02"]
    },
    {
        "id": "sk-multimeter",
        "code": "SK-EL-METER",
        "name": "Multimeter Diagnostics & Circuit Troubleshooting",
        "canonical_name": "Multimeter Diagnostics & Circuit Troubleshooting",
        "category": "hard",
        "domain": "Electrician",
        "description": "Utilizing digital multimeters and clamp meters to safely verify de-energization, measure voltage, current draw, resistance, and diagnose faults.",
        "demand_score": 95,
        "trainees_proficient": 130,
        "open_job_demands": 55,
        "growth_trend": "+15% YoY",
        "aliases": ["Multimeter Diagnostics", "Multimeter Testing", "Digital Multimeter", "Circuit Testing", "Voltage Testing", "Electrical Troubleshooting"],
        "proficiency_levels": {
            "0": {
                "level": 0,
                "title": "Novice / Unfamiliar",
                "description": "Unfamiliar with multimeter lead placement or electrical shock hazards.",
                "rubric": ["Does not verify meter functionality prior to testing", "Unfamiliar with AC vs DC settings"]
            },
            "1": {
                "level": 1,
                "title": "Fundamental / Basic",
                "description": "Conducts basic AC voltage measurements on 120V receptacles using test leads safely.",
                "rubric": ["Checks for presence of line voltage", "Selects correct measurement scale"]
            },
            "2": {
                "level": 2,
                "title": "Competent / Working Knowledge",
                "description": "Measures circuit continuity, checks resistance on heating elements, and tests low-voltage control transformers.",
                "rubric": ["Performs 3-point live-dead-live testing", "Checks de-energized circuits for continuity to ground"]
            },
            "3": {
                "level": 3,
                "title": "Proficient / Autonomous",
                "description": "Measures motor inrush current with clamp meter, diagnoses open neutrals, and identifies harmonic distortion or voltage drop.",
                "rubric": ["Diagnoses ground faults on branch circuits", "Measures true RMS current on non-linear loads", "Traces faulty relay coils"]
            },
            "4": {
                "level": 4,
                "title": "Advanced / Specialist",
                "description": "Performs insulation resistance testing (megohmmeter) on 480V three-phase motors and troubleshoots Variable Frequency Drives (VFDs).",
                "rubric": ["Tests motor winding dielectric strength with 1000V Megger", "Diagnoses VFD DC bus ripple and fault codes"]
            },
            "5": {
                "level": 5,
                "title": "Expert / Mastery",
                "description": "Diagnoses complex industrial power distribution anomalies, harmonics, and oversees plant electrical reliability programs.",
                "rubric": ["Conducts power quality harmonic analysis with oscilloscopes", "Authors plant diagnostic SOPs and safe work protocols"]
            }
        },
        "related_competency_ids": ["cmp-el-02"],
        "related_occupation_ids": ["occ-el-01", "occ-el-02"]
    },
    {
        "id": "sk-loto",
        "code": "SK-EL-LOTO",
        "name": "Jobsite Safety & Lockout/Tagout (LOTO)",
        "canonical_name": "Jobsite Safety & Lockout/Tagout (LOTO)",
        "category": "soft",
        "domain": "Electrician",
        "description": "Disciplined adherence to OSHA electrical safety standards, NFPA 70E arc flash boundaries, and rigorous physical Lockout/Tagout procedures.",
        "demand_score": 97,
        "trainees_proficient": 190,
        "open_job_demands": 75,
        "growth_trend": "+10% YoY",
        "aliases": ["Lockout Tagout", "LOTO", "OSHA Safety", "Electrical Safety", "Lockout/Tagout Procedures", "NFPA 70E Safety"],
        "proficiency_levels": {
            "0": {
                "level": 0,
                "title": "Novice / Unfamiliar",
                "description": "Unaware of personal protective equipment (PPE) requirements or electrical danger zones.",
                "rubric": ["Attempts work without inspecting PPE", "Unfamiliar with energy isolation devices"]
            },
            "1": {
                "level": 1,
                "title": "Fundamental / Basic",
                "description": "Wears required safety glasses, hard hat, and EH-rated work boots; recognizes high-voltage warning labels.",
                "rubric": ["Identifies breaker panel isolation points", "Reports frayed cords and damaged equipment immediately"]
            },
            "2": {
                "level": 2,
                "title": "Competent / Working Knowledge",
                "description": "Applies personal lock and tag on disconnect switches; verifies zero energy state prior to touching conductors.",
                "rubric": ["Follows 6-step LOTO sequence faithfully", "Maintains sole possession of lock key"]
            },
            "3": {
                "level": 3,
                "title": "Proficient / Autonomous",
                "description": "Coordinates group lockout hasps, establishes NFPA 70E arc flash approach boundaries, and wears rated arc face shields.",
                "rubric": ["Selects appropriate arc flash PPE category (1-4)", "Conducts energized electrical work permits review"]
            },
            "4": {
                "level": 4,
                "title": "Advanced / Specialist",
                "description": "Authors complex multi-source energy isolation procedures for industrial substations, generators, and pneumatic systems.",
                "rubric": ["Writes detailed facility-specific LOTO procedures", "Leads safety toolbox talks on job hazard analysis"]
            },
            "5": {
                "level": 5,
                "title": "Expert / Mastery",
                "description": "Corporate safety director or compliance auditor; certifies plant adherence to OSHA 1910.147 and NFPA 70E.",
                "rubric": ["Conducts comprehensive OSHA safety compliance audits", "Directs root-cause investigations of near-miss events"]
            }
        },
        "related_competency_ids": ["cmp-el-01", "cmp-el-02"],
        "related_occupation_ids": ["occ-el-01", "occ-el-02"]
    },

    # ----------------------------------------------------
    # 5. HEALTHCARE
    # ----------------------------------------------------
    {
        "id": "sk-vitals",
        "code": "SK-HC-VIT",
        "name": "Vital Signs Measurement & Clinical Triage",
        "canonical_name": "Vital Signs Measurement & Clinical Triage",
        "category": "hard",
        "domain": "Healthcare",
        "description": "Accurate clinical acquisition of human vital signs including manual blood pressure auscultation, pulse, respiration rate, SpO2, and temperature.",
        "demand_score": 96,
        "trainees_proficient": 210,
        "open_job_demands": 82,
        "growth_trend": "+18% YoY",
        "aliases": ["Vital Signs", "Taking Vital Signs", "Vital Signs Assessment", "Patient Vitals", "Blood Pressure Measurement", "Clinical Vitals Triage"],
        "proficiency_levels": {
            "0": {
                "level": 0,
                "title": "Novice / Unfamiliar",
                "description": "Cannot operate standard sphygmomanometer or identify normal physiological vital ranges.",
                "rubric": ["Cannot locate radial pulse reliably", "Unfamiliar with normal adult blood pressure range"]
            },
            "1": {
                "level": 1,
                "title": "Fundamental / Basic",
                "description": "Measures vitals using automated digital monitors and records readings accurately.",
                "rubric": ["Places automated BP cuff in correct brachial position", "Records pulse oximeter readings and pulse"]
            },
            "2": {
                "level": 2,
                "title": "Competent / Working Knowledge",
                "description": "Accurately auscultates manual blood pressure (Korotkoff sounds), counts unannounced respirations, and detects irregularities.",
                "rubric": ["Auscultates systolic and diastolic pressures manually within ±4 mmHg", "Flags hypertensive emergency thresholds to nursing staff"]
            },
            "3": {
                "level": 3,
                "title": "Proficient / Autonomous",
                "description": "Adapts vital techniques for pediatric, geriatric, and bariatric patients; recognizes early signs of clinical decompensation.",
                "rubric": ["Selects appropriate cuff sizes to prevent measurement skew", "Calculates mean arterial pressure (MAP)", "Recognizes orthostatic hypotension changes"]
            },
            "4": {
                "level": 4,
                "title": "Advanced / Specialist",
                "description": "Triages multi-patient arrivals during emergency surges; trains incoming medical assistants on high-precision vital protocols.",
                "rubric": ["Triages patients rapidly according to acuity scales (ESI)", "Mentors clinical externs on manual auscultation"]
            },
            "5": {
                "level": 5,
                "title": "Expert / Mastery",
                "description": "Supervises outpatient clinic clinical skills lab; certifies allied health competency programs and hospital vital quality benchmarks.",
                "rubric": ["Audits clinic-wide measurement accuracy variances", "Directs clinical simulation training for health systems"]
            }
        },
        "related_competency_ids": ["cmp-hc-01"],
        "related_occupation_ids": ["occ-hc-01", "occ-hc-02"]
    },
    {
        "id": "sk-ehr",
        "code": "SK-HC-EHR",
        "name": "Electronic Health Records (EHR) Documentation",
        "canonical_name": "Electronic Health Records (EHR) Documentation",
        "category": "hard",
        "domain": "Healthcare",
        "description": "Entering structured clinical notes, chief complaints, medication reconciliation, and diagnostic billing codes into systems such as Epic and Cerner.",
        "demand_score": 94,
        "trainees_proficient": 230,
        "open_job_demands": 88,
        "growth_trend": "+22% YoY",
        "aliases": ["EHR Documentation", "Electronic Health Records", "EHR Systems", "Epic EHR", "Cerner EHR", "Medical Charting", "Clinical Documentation"],
        "proficiency_levels": {
            "0": {
                "level": 0,
                "title": "Novice / Unfamiliar",
                "description": "Unfamiliar with EHR interfaces or clinical chart organization.",
                "rubric": ["Cannot locate patient chart by MRN", "Unfamiliar with SOAP note structure"]
            },
            "1": {
                "level": 1,
                "title": "Fundamental / Basic",
                "description": "Opens patient charts, enters chief complaint and verified vital signs into standard template fields.",
                "rubric": ["Navigates patient encounter navigator", "Enters basic allergy and immunization updates"]
            },
            "2": {
                "level": 2,
                "title": "Competent / Working Knowledge",
                "description": "Completes medication reconciliation lists, attaches outside lab documents, and routes physician orders.",
                "rubric": ["Verifies current dosages against pharmacy records", "Queues standard preventative lab orders for clinician review"]
            },
            "3": {
                "level": 3,
                "title": "Proficient / Autonomous",
                "description": "Drafts structured SOAP notes, selects ICD-10 diagnostic codes, and handles patient portal inquiries securely.",
                "rubric": ["Documents complex medical histories without transcription errors", "Complies with HIPAA minimum necessary disclosure rules"]
            },
            "4": {
                "level": 4,
                "title": "Advanced / Specialist",
                "description": "Configures department SmartPhrases and order sets; trains clinic staff on new EHR system version releases.",
                "rubric": ["Builds reusable clinic-wide documentation macros", "Resolves billing claim chart discrepancies with coding department"]
            },
            "5": {
                "level": 5,
                "title": "Expert / Mastery",
                "description": "Clinical informaticist leading health system EHR optimizations, clinical decision support alerts, and regulatory reporting.",
                "rubric": ["Designs clinical decision support algorithms to reduce alert fatigue", "Leads multi-hospital EHR migration projects"]
            }
        },
        "related_competency_ids": ["cmp-hc-02"],
        "related_occupation_ids": ["occ-hc-01", "occ-hc-02"]
    },
    {
        "id": "sk-empathy",
        "code": "SK-HC-EMP",
        "name": "Empathic Patient Communication & Bedside De-escalation",
        "canonical_name": "Empathic Patient Communication & Bedside De-escalation",
        "category": "soft",
        "domain": "Healthcare",
        "description": "Active compassionate listening, calming anxious patients, providing culturally competent bedside reassurance, and defusing tense clinical interactions.",
        "demand_score": 98,
        "trainees_proficient": 280,
        "open_job_demands": 95,
        "growth_trend": "+14% YoY",
        "aliases": ["Patient Communication", "Bedside Manner", "Empathic Listening", "Healthcare De-escalation", "Clinical Empathy", "Patient Care Communication"],
        "proficiency_levels": {
            "0": {
                "level": 0,
                "title": "Novice / Unfamiliar",
                "description": "Appears dismissive or rushed; dismisses patient distress or speaks with insensitive medical jargon.",
                "rubric": ["Interrupts patients repeatedly", "Fails to notice obvious signs of severe patient anxiety"]
            },
            "1": {
                "level": 1,
                "title": "Fundamental / Basic",
                "description": "Introduces self, explains procedures clearly before touching patients, and listens respectfully.",
                "rubric": ["Follows AIDET communication framework (Acknowledge, Introduce, Duration, Explanation, Thank)", "Maintains eye contact"]
            },
            "2": {
                "level": 2,
                "title": "Competent / Working Knowledge",
                "description": "Demonstrates empathetic validation of patient concerns; explains clinical steps using accessible lay terminology.",
                "rubric": ["Validates patient fears without offering false reassurances", "Uses the 'teach-back' method to verify comprehension"]
            },
            "3": {
                "level": 3,
                "title": "Proficient / Autonomous",
                "description": "De-escalates agitated or frightened patients using verbal calming techniques, body posture, and cultural sensitivity.",
                "rubric": ["Lowers vocal pitch and uses open posture during escalations", "Respects diverse cultural health beliefs and religious practices"]
            },
            "4": {
                "level": 4,
                "title": "Advanced / Specialist",
                "description": "Manages complex behavioral health crises and grief counseling; coaches clinical colleagues on burnout resilience and bedside grace.",
                "rubric": ["Facilitates difficult conversations with grieving families", "Leads debriefs after emotionally traumatic clinical events"]
            },
            "5": {
                "level": 5,
                "title": "Expert / Mastery",
                "description": "Hospital patient experience director; shapes institutional patient-centered care culture and patient satisfaction initiatives.",
                "rubric": ["Drives hospital HCAHPS patient satisfaction scores into top decile", "Authors health network empathetic care training programs"]
            }
        },
        "related_competency_ids": ["cmp-hc-01", "cmp-hc-02"],
        "related_occupation_ids": ["occ-hc-01", "occ-hc-02"]
    },

    # ----------------------------------------------------
    # 6. RETAIL
    # ----------------------------------------------------
    {
        "id": "sk-pos",
        "code": "SK-RT-POS",
        "name": "Point-of-Sale (POS) Operations & Cash Reconciliation",
        "canonical_name": "Point-of-Sale (POS) Operations & Cash Reconciliation",
        "category": "hard",
        "domain": "Retail",
        "description": "Speedy transaction scanning, tender processing, gift card / promotional redemption, split payments, and end-of-shift drawer reconciliation.",
        "demand_score": 86,
        "trainees_proficient": 190,
        "open_job_demands": 60,
        "growth_trend": "+8% YoY",
        "aliases": ["POS Operations", "Point of Sale", "POS System", "Cashiering", "POS Cash Balancing", "Register Operations", "Retail POS"],
        "proficiency_levels": {
            "0": {
                "level": 0,
                "title": "Novice / Unfamiliar",
                "description": "Unfamiliar with POS terminal buttons, barcode scanner, or cash drawer operations.",
                "rubric": ["Cannot ring up standard items", "Needs step-by-step assistance for credit card processing"]
            },
            "1": {
                "level": 1,
                "title": "Fundamental / Basic",
                "description": "Scans items, bags purchases, processes cash/credit payments, and provides receipts accurately.",
                "rubric": ["Counts back cash change accurately", "Scans items at acceptable baseline items-per-minute"]
            },
            "2": {
                "level": 2,
                "title": "Competent / Working Knowledge",
                "description": "Handles returns with or without receipt, applies store credit, processes tax-exempt purchases, and voids errors correctly.",
                "rubric": ["Follows return policy verification steps", "Reconciles drawer at end-of-shift with < ₹100 variance"]
            },
            "3": {
                "level": 3,
                "title": "Proficient / Autonomous",
                "description": "Performs manager overrides, audits drawer cash drops, troubleshoots scanner connectivity, and trains new cashiers.",
                "rubric": ["Executes mid-shift safe drops to minimize counter cash", "Maintains top 10% scanning speed while retaining zero cash discrepancy"]
            },
            "4": {
                "level": 4,
                "title": "Advanced / Specialist",
                "description": "Conducts full store open/close register audits, investigates drawer discrepancy patterns, and configures new terminal hardware.",
                "rubric": ["Audits daily store reconciliation ledger", "Configures barcode peripherals and contactless payment terminals"]
            },
            "5": {
                "level": 5,
                "title": "Expert / Mastery",
                "description": "Multi-store retail operations specialist; tests and rolls out omnichannel cloud POS software across regional chains.",
                "rubric": ["Leads POS software migration across 20+ retail storefronts", "Optimizes transaction latency and checkout queue efficiency"]
            }
        },
        "related_competency_ids": ["cmp-rt-01"],
        "related_occupation_ids": ["occ-rt-01", "occ-rt-02"]
    },
    {
        "id": "sk-inventory",
        "code": "SK-RT-INV",
        "name": "Inventory Auditing & Shrinkage Prevention",
        "canonical_name": "Inventory Auditing & Shrinkage Prevention",
        "category": "hard",
        "domain": "Retail",
        "description": "Executing cycle counts, managing stockroom organization, receiving freight bills of lading, and enforcing loss prevention protocols to curb shrinkage.",
        "demand_score": 88,
        "trainees_proficient": 165,
        "open_job_demands": 50,
        "growth_trend": "+10% YoY",
        "aliases": ["Inventory Auditing", "Inventory Management", "Stock Auditing", "Retail Replenishment", "Shrinkage Prevention", "Cycle Counting", "Loss Prevention Retail"],
        "proficiency_levels": {
            "0": {
                "level": 0,
                "title": "Novice / Unfamiliar",
                "description": "Unfamiliar with SKU/UPC barcodes or stockroom safety procedures.",
                "rubric": ["Cannot locate items via stock locator", "Mishandles fragile inventory"]
            },
            "1": {
                "level": 1,
                "title": "Fundamental / Basic",
                "description": "Scans shelf tags, restocks sales floor shelves according to FIFO principles, and identifies damaged goods.",
                "rubric": ["Faces and rotates stock on store shelves", "Unpacks freight boxes and compares item counts to packing slips"]
            },
            "2": {
                "level": 2,
                "title": "Competent / Working Knowledge",
                "description": "Performs weekly cycle counts on handheld RF scanners, flags discrepancy gaps, and secures high-value merchandise.",
                "rubric": ["Identifies stock discrepancies between physical count and system inventory", "Applies electronic article surveillance (EAS) security tags"]
            },
            "3": {
                "level": 3,
                "title": "Proficient / Autonomous",
                "description": "Investigates root cause of inventory shrinkage, manages vendor direct-store-delivery receiving, and adjusts min/max order points.",
                "rubric": ["Reconciles vendor freight discrepancies with carriers", "Executes store-wide physical inventory counts with 99%+ accuracy"]
            },
            "4": {
                "level": 4,
                "title": "Advanced / Specialist",
                "description": "Implements loss prevention auditing programs that measurably reduce store shrinkage; analyzes weekly velocity reports.",
                "rubric": ["Reduces store shrinkage below industry benchmark (< 1.2%)", "Optimizes backroom inventory footprint to maximize sales floor space"]
            },
            "5": {
                "level": 5,
                "title": "Expert / Mastery",
                "description": "Regional supply chain & loss prevention director; develops replenishment forecasting models for entire retail network.",
                "rubric": ["Directs regional inventory auditing strategy across 50+ stores", "Architects automated RFID inventory tracking systems"]
            }
        },
        "related_competency_ids": ["cmp-rt-02"],
        "related_occupation_ids": ["occ-rt-01", "occ-rt-02"]
    },
    {
        "id": "sk-conflict",
        "code": "SK-RT-CONF",
        "name": "Customer Conflict De-escalation & Service Recovery",
        "canonical_name": "Customer Conflict De-escalation & Service Recovery",
        "category": "soft",
        "domain": "Retail",
        "description": "Transforming dissatisfied or frustrated shoppers into loyal brand advocates through active listening, non-defensive communication, and fair problem solving.",
        "demand_score": 92,
        "trainees_proficient": 250,
        "open_job_demands": 80,
        "growth_trend": "+12% YoY",
        "aliases": ["Customer Conflict Resolution", "De-escalation Retail", "Customer Service Recovery", "Customer Conflict De-escalation", "Handling Difficult Customers"],
        "proficiency_levels": {
            "0": {
                "level": 0,
                "title": "Novice / Unfamiliar",
                "description": "Becomes defensive or visibly frustrated when confronted by angry shoppers.",
                "rubric": ["Argues with customers", "Escalates minor issues immediately without trying to listen"]
            },
            "1": {
                "level": 1,
                "title": "Fundamental / Basic",
                "description": "Listens patiently to complaints without interrupting and notifies a supervisor when appropriate.",
                "rubric": ["Maintains polite professional tone", "Apologizes for customer inconvenience"]
            },
            "2": {
                "level": 2,
                "title": "Competent / Working Knowledge",
                "description": "Employs the LAST framework (Listen, Apologize, Solve, Thank) to resolve common pricing and return disputes within company policy.",
                "rubric": ["Restates the customer issue to confirm mutual understanding", "Offers authorized compensation options (refund, replacement, discount coupon)"]
            },
            "3": {
                "level": 3,
                "title": "Proficient / Autonomous",
                "description": "Defuses high-intensity confrontations calmly, protects front-line staff from harassment, and turns dissatisfied shoppers into brand advocates.",
                "rubric": ["Negotiates mutually agreeable resolutions in 95%+ of escalations", "Documents incident reports objectively"]
            },
            "4": {
                "level": 4,
                "title": "Advanced / Specialist",
                "description": "Trains store department teams on de-escalation psychology and crafts store customer recovery empowerment policies.",
                "rubric": ["Conducts customer service recovery workshops for team", "Analyzes complaint trends to rectify systemic product or service flaws"]
            },
            "5": {
                "level": 5,
                "title": "Expert / Mastery",
                "description": "Chief Customer Experience Officer; designs national customer care charters and omnichannel customer retention frameworks.",
                "rubric": ["Authors national customer satisfaction playbooks", "Establishes company-wide Net Promoter Score (NPS) improvement programs"]
            }
        },
        "related_competency_ids": ["cmp-rt-01", "cmp-rt-02"],
        "related_occupation_ids": ["occ-rt-01", "occ-rt-02"]
    },

    # ----------------------------------------------------
    # 7. MANUFACTURING
    # ----------------------------------------------------
    {
        "id": "sk-cnc",
        "code": "SK-MF-CNC",
        "name": "CNC G-Code Programming & Machine Setup",
        "canonical_name": "CNC G-Code Programming & Machine Setup",
        "category": "hard",
        "domain": "Manufacturing",
        "description": "Writing and editing ISO G-code programs, setting work coordinate offsets (G54-G59), tool length offsets, and operating multi-axis CNC mills and lathes.",
        "demand_score": 94,
        "trainees_proficient": 95,
        "open_job_demands": 46,
        "growth_trend": "+16% YoY",
        "aliases": ["CNC Programming", "G-Code Programming", "CNC Setup", "CNC Milling", "G-Code", "CNC Machining", "CNC Operations"],
        "proficiency_levels": {
            "0": {
                "level": 0,
                "title": "Novice / Unfamiliar",
                "description": "No experience with CNC machinery or G-code syntax.",
                "rubric": ["Cannot differentiate G-codes from M-codes", "Unaware of machine crash hazards"]
            },
            "1": {
                "level": 1,
                "title": "Fundamental / Basic",
                "description": "Loads raw material stock, cycles start pre-programmed jobs, and monitors coolant levels under supervision.",
                "rubric": ["Executes basic emergency stops correctly", "Monitors tool wear visually"]
            },
            "2": {
                "level": 2,
                "title": "Competent / Working Knowledge",
                "description": "Sets tool length offsets with touch probes, edges finds work zero (G54), and performs manual edits for speeds and feeds.",
                "rubric": ["Sets work coordinate zeros using edge finders", "Calculates spindle RPM and feed rate using chip load formulas"]
            },
            "3": {
                "level": 3,
                "title": "Proficient / Autonomous",
                "description": "Writes 3-axis G-code programs from scratch (canned cycles G81, G83, G84), selects tooling, and proves out first article components.",
                "rubric": ["Runs dry runs with single-block execution to prevent crashes", "Machines parts within ±0.0005\" blueprint tolerances"]
            },
            "4": {
                "level": 4,
                "title": "Advanced / Specialist",
                "description": "Programs complex 4-axis and 5-axis simultaneous toolpaths using CAM software (Mastercam/Fusion 360); designs custom vacuum workholding fixtures.",
                "rubric": ["Optimizes high-efficiency trochoidal milling paths to halve cycle times", "Designs and machines bespoke modular fixtures"]
            },
            "5": {
                "level": 5,
                "title": "Expert / Mastery",
                "description": "Manufacturing engineering leader; develops post-processors for multi-axis machinery, specifies capital machining equipment, and oversees plant automation.",
                "rubric": ["Authors custom machine post-processors", "Directs robotic palletization and lights-out automated machining cells"]
            }
        },
        "related_competency_ids": ["cmp-mf-01"],
        "related_occupation_ids": ["occ-mf-01", "occ-mf-02"]
    },
    {
        "id": "sk-gdt",
        "code": "SK-MF-GDT",
        "name": "GD&T Metrology & Quality Inspection",
        "canonical_name": "GD&T Metrology & Quality Inspection",
        "category": "hard",
        "domain": "Manufacturing",
        "description": "Interpreting ASME Y14.5 geometric dimensioning and tolerancing symbols (true position, flatness, runout), utilizing precision micrometers, bore gauges, and CMMs.",
        "demand_score": 91,
        "trainees_proficient": 115,
        "open_job_demands": 42,
        "growth_trend": "+13% YoY",
        "aliases": ["GD&T", "Geometric Dimensioning and Tolerancing", "GD&T Inspection", "Precision Metrology", "Quality Inspection Metrology", "CMM Inspection", "Micrometer & Caliper Inspection"],
        "proficiency_levels": {
            "0": {
                "level": 0,
                "title": "Novice / Unfamiliar",
                "description": "Unable to read engineering drawings or read vernier scales.",
                "rubric": ["Cannot read vernier caliper graduations", "Unfamiliar with feature control frames"]
            },
            "1": {
                "level": 1,
                "title": "Fundamental / Basic",
                "description": "Measures linear dimensions using digital calipers and outside micrometers with proper ratchet thimble feel.",
                "rubric": ["Zeros micrometer against gauge blocks", "Records dimensions accurately to three decimal places"]
            },
            "2": {
                "level": 2,
                "title": "Competent / Working Knowledge",
                "description": "Deciphers datum reference frames, interprets basic form tolerances (flatness, straightness), and uses gauge pins and thread gauges.",
                "rubric": ["Verifies datum planes A, B, C alignment", "Measures internal bore diameters with dial bore gauges"]
            },
            "3": {
                "level": 3,
                "title": "Proficient / Autonomous",
                "description": "Calculates Maximum Material Condition (MMC) bonus tolerances for true position; performs first-article inspection reports (FAIR/AS9102).",
                "rubric": ["Calculates bonus tolerance available from hole size variance", "Executes optical comparator profile overlay checks", "Authors complete AS9102 first-article inspection packages"]
            },
            "4": {
                "level": 4,
                "title": "Advanced / Specialist",
                "description": "Programs Coordinate Measuring Machines (CMM) using PC-DMIS; conducts gauge repeatability and reproducibility (Gauge R&R) statistical studies.",
                "rubric": ["Programs multi-point CMM inspection routines", "Conducts Measurement System Analysis (MSA) and Gauge R&R studies"]
            },
            "5": {
                "level": 5,
                "title": "Expert / Mastery",
                "description": "ASQ Certified Quality Engineer / ASME GD&T Senior Professional; acts as final arbiter on part conformance for defense and aerospace programs.",
                "rubric": ["Holds ASME Y14.5 Senior Metrology Certification", "Architects enterprise quality management systems (ISO 9001 / AS9100)"]
            }
        },
        "related_competency_ids": ["cmp-mf-02"],
        "related_occupation_ids": ["occ-mf-01", "occ-mf-02"]
    },
    {
        "id": "sk-lean5s",
        "code": "SK-MF-5S",
        "name": "5S Lean Workplace Organization & Continuous Improvement",
        "canonical_name": "5S Lean Workplace Organization & Continuous Improvement",
        "category": "soft",
        "domain": "Manufacturing",
        "description": "Disciplined application of 5S methodologies (Sort, Set in order, Shine, Standardize, Sustain), identifying muda waste, and participating in Kaizen improvement events.",
        "demand_score": 88,
        "trainees_proficient": 180,
        "open_job_demands": 52,
        "growth_trend": "+9% YoY",
        "aliases": ["5S", "5S Methodology", "Lean 5S", "Kaizen Continuous Improvement", "5S Workplace Organization", "Lean Manufacturing 5S"],
        "proficiency_levels": {
            "0": {
                "level": 0,
                "title": "Novice / Unfamiliar",
                "description": "Leaves tools scattered and work area cluttered; unconcerned with shop floor hazards.",
                "rubric": ["Fails to return tooling to assigned shadowboards", "Ignores fluid spills on walkways"]
            },
            "1": {
                "level": 1,
                "title": "Fundamental / Basic",
                "description": "Maintains a clean workstation, sweeps shavings, and wipes down machinery at shift conclusion.",
                "rubric": ["Participates in end-of-shift 10-minute cleanup", "Keeps machine safety guards clear"]
            },
            "2": {
                "level": 2,
                "title": "Competent / Working Knowledge",
                "description": "Applies red-tag sorting protocols to eliminate unused materials; maintains shadow boards and visual floor markings.",
                "rubric": ["Sorts non-essential tooling out of primary work envelope", "Labels tool holding fixtures clearly"]
            },
            "3": {
                "level": 3,
                "title": "Proficient / Autonomous",
                "description": "Identifies 8 types of Lean waste (muda), participates actively in rapid improvement Kaizen events, and standardizes standard work instructions.",
                "rubric": ["Drafts Visual Work Instructions (VWI) for workstation changeovers", "Identifies motion waste and reorganizes cell workflow"]
            },
            "4": {
                "level": 4,
                "title": "Advanced / Specialist",
                "description": "Facilitates plant-wide Kaizen blitzes, maps value streams (VSM), and conducts weekly 5S audit scoring with department managers.",
                "rubric": ["Facilitates cross-functional SMED (Single-Minute Exchange of Die) projects", "Conducts impartial 5S audit scoring across departments"]
            },
            "5": {
                "level": 5,
                "title": "Expert / Mastery",
                "description": "Lean Six Sigma Master Black Belt; directs operational excellence strategy across multiple manufacturing plants.",
                "rubric": ["Drives enterprise Lean transformation resulting in multi-million dollar waste reduction", "Mentors plant managers on Toyota Production System principles"]
            }
        },
        "related_competency_ids": ["cmp-mf-01", "cmp-mf-02"],
        "related_occupation_ids": ["occ-mf-01", "occ-mf-02"]
    }
]

OCCUPATIONS_DATA = [
    # 1. Software Development
    {
        "id": "occ-sw-01",
        "code": "15-1252.00",
        "title": "Full-Stack Software Engineer",
        "domain": "Software Development",
        "description": "Designs, writes, and maintains resilient user-facing interfaces and backend business logic services for enterprise software applications.",
        "career_band": "Mid-Level Professional",
        "median_salary": "₹12,50,000 / yr",
        "demand_outlook": "+25% (Much faster than average)",
        "required_skill_ids": ["sk-6", "sk-1", "sk-17"],
        "competency_ids": ["cmp-sw-01", "cmp-sw-02"]
    },
    {
        "id": "occ-sw-02",
        "code": "15-1254.00",
        "title": "Backend Systems Architect",
        "domain": "Software Development",
        "description": "Specializes in high-throughput distributed microservices, scalable database clustering, asynchronous messaging, and cloud reliability.",
        "career_band": "Senior / Specialist",
        "median_salary": "₹18,00,000 / yr",
        "demand_outlook": "+21% (Faster than average)",
        "required_skill_ids": ["sk-6", "sk-17"],
        "competency_ids": ["cmp-sw-01"]
    },

    # 2. Data Analytics
    {
        "id": "occ-da-01",
        "code": "15-2051.01",
        "title": "Business Intelligence Analyst",
        "domain": "Data Analytics",
        "description": "Transforms structured organizational data into executive Tableau dashboards, KPI scorecards, and operational performance reports.",
        "career_band": "Mid-Level Professional",
        "median_salary": "₹9,50,000 / yr",
        "demand_outlook": "+23% (Much faster than average)",
        "required_skill_ids": ["sk-sql", "sk-tableau", "sk-storytelling"],
        "competency_ids": ["cmp-da-01", "cmp-da-02"]
    },
    {
        "id": "occ-da-02",
        "code": "15-2051.00",
        "title": "Data Analytics Specialist",
        "domain": "Data Analytics",
        "description": "Extracts insights from large data lakes through SQL queries, statistical tests, cohort analysis, and executive storytelling presentations.",
        "career_band": "Mid-Level Professional",
        "median_salary": "₹11,00,000 / yr",
        "demand_outlook": "+28% (Much faster than average)",
        "required_skill_ids": ["sk-sql", "sk-storytelling"],
        "competency_ids": ["cmp-da-01"]
    },

    # 3. Digital Marketing
    {
        "id": "occ-dm-01",
        "code": "13-1161.00",
        "title": "Digital Marketing Strategist",
        "domain": "Digital Marketing",
        "description": "Orchestrates organic search engine visibility, paid conversion funnels, and compelling brand storytelling across omnichannel customer touchpoints.",
        "career_band": "Mid-Level Professional",
        "median_salary": "₹7,20,000 / yr",
        "demand_outlook": "+19% (Faster than average)",
        "required_skill_ids": ["sk-seo", "sk-ga4", "sk-copywriting"],
        "competency_ids": ["cmp-dm-01", "cmp-dm-02"]
    },
    {
        "id": "occ-dm-02",
        "code": "11-2021.00",
        "title": "Growth & Performance Marketing Manager",
        "domain": "Digital Marketing",
        "description": "Leads acquisition experiments, optimizes customer acquisition cost (CAC), instruments conversion telemetry, and manages multi-channel ad spend.",
        "career_band": "Senior / Management",
        "median_salary": "₹12,00,000 / yr",
        "demand_outlook": "+16% (Faster than average)",
        "required_skill_ids": ["sk-ga4", "sk-seo", "sk-copywriting"],
        "competency_ids": ["cmp-dm-01", "cmp-dm-02"]
    },

    # 4. Electrician
    {
        "id": "occ-el-01",
        "code": "47-2111.00",
        "title": "Journeyman Electrician",
        "domain": "Electrician",
        "description": "Installs, tests, and repairs commercial and residential electrical conduit, wiring, lighting, switchgear, and branch circuit panels.",
        "career_band": "Licensed Tradesperson",
        "median_salary": "₹4,80,000 / yr",
        "demand_outlook": "+11% (Faster than average)",
        "required_skill_ids": ["sk-conduit", "sk-multimeter", "sk-loto"],
        "competency_ids": ["cmp-el-01", "cmp-el-02"]
    },
    {
        "id": "occ-el-02",
        "code": "49-2095.00",
        "title": "Industrial Electrical Maintenance Technician",
        "domain": "Electrician",
        "description": "Troubleshoots 480V 3-phase machinery, control panels, transformers, and electrical raceways in industrial manufacturing environments.",
        "career_band": "Mid-Level Technical",
        "median_salary": "₹6,50,000 / yr",
        "demand_outlook": "+14% (Faster than average)",
        "required_skill_ids": ["sk-multimeter", "sk-loto"],
        "competency_ids": ["cmp-el-02"]
    },

    # 5. Healthcare
    {
        "id": "occ-hc-01",
        "code": "31-9092.00",
        "title": "Certified Clinical Medical Assistant (CCMA)",
        "domain": "Healthcare",
        "description": "Conducts patient rooming, measures vital signs, documents clinical histories in EHR systems, and provides empathic patient care.",
        "career_band": "Certified Healthcare Specialist",
        "median_salary": "₹4,20,000 / yr",
        "demand_outlook": "+16% (Much faster than average)",
        "required_skill_ids": ["sk-vitals", "sk-ehr", "sk-empathy"],
        "competency_ids": ["cmp-hc-01", "cmp-hc-02"]
    },
    {
        "id": "occ-hc-02",
        "code": "29-2072.00",
        "title": "Patient Care Coordinator & Health Informatics Lead",
        "domain": "Healthcare",
        "description": "Manages patient transitions of care, ensures complete medical record compliance, triages clinic appointments, and navigates patient services.",
        "career_band": "Mid-Level Professional",
        "median_salary": "₹6,00,000 / yr",
        "demand_outlook": "+18% (Much faster than average)",
        "required_skill_ids": ["sk-ehr", "sk-empathy", "sk-vitals"],
        "competency_ids": ["cmp-hc-01", "cmp-hc-02"]
    },

    # 6. Retail
    {
        "id": "occ-rt-01",
        "code": "41-1011.00",
        "title": "Retail Department Supervisor",
        "domain": "Retail",
        "description": "Oversees floor sales operations, enforces POS cashiering policies, coordinates inventory merchandising, and handles customer conflict de-escalation.",
        "career_band": "First-Line Supervisor",
        "median_salary": "₹4,50,000 / yr",
        "demand_outlook": "+9% (Average)",
        "required_skill_ids": ["sk-pos", "sk-inventory", "sk-conflict"],
        "competency_ids": ["cmp-rt-01", "cmp-rt-02"]
    },
    {
        "id": "occ-rt-02",
        "code": "11-1021.00",
        "title": "Retail Store Operations Manager",
        "domain": "Retail",
        "description": "Leads store profitability, shrinkage mitigation, staff scheduling, customer experience standards, and inventory supply chain replenishment.",
        "career_band": "Management",
        "median_salary": "₹7,50,000 / yr",
        "demand_outlook": "+10% (Average)",
        "required_skill_ids": ["sk-inventory", "sk-conflict", "sk-pos"],
        "competency_ids": ["cmp-rt-01", "cmp-rt-02"]
    },

    # 7. Manufacturing
    {
        "id": "occ-mf-01",
        "code": "51-4041.00",
        "title": "Precision CNC Machinist",
        "domain": "Manufacturing",
        "description": "Sets up and operates CNC mills and lathes to produce high-precision metal parts conforming strictly to GD&T blueprint specifications.",
        "career_band": "Skilled Tradesperson",
        "median_salary": "₹5,40,000 / yr",
        "demand_outlook": "+12% (Faster than average)",
        "required_skill_ids": ["sk-cnc", "sk-gdt", "sk-lean5s"],
        "competency_ids": ["cmp-mf-01", "cmp-mf-02"]
    },
    {
        "id": "occ-mf-02",
        "code": "51-9061.00",
        "title": "Quality Assurance Metrology Inspector",
        "domain": "Manufacturing",
        "description": "Verifies manufactured parts against aerospace/automotive GD&T tolerances using CMMs, calipers, micrometers, and statistical quality audits.",
        "career_band": "Mid-Level Technical",
        "median_salary": "₹5,20,000 / yr",
        "demand_outlook": "+10% (Average)",
        "required_skill_ids": ["sk-gdt", "sk-lean5s"],
        "competency_ids": ["cmp-mf-02"]
    },
]
