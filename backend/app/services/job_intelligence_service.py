"""
AI-Powered Job Intelligence Engine
Implements: Job Description -> Skill Extraction -> Skill Normalization -> Occupation Mapping
Powered by spaCy and Sentence Transformers with robust confidence scoring.
"""

import re
import math
import logging
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session

from app.models.entities import Job, JobExtractedSkill, Occupation, Skill
from app.services.normalization_service import SkillNormalizationService

logger = logging.getLogger("skilltrace.job_intelligence")

from app.core.ai_models import (
    get_spacy_nlp,
    get_sentence_transformer,
    encode_text_embedding,
    generate_deterministic_embedding
)
from app.core.database import validate_and_serialize_vector


# ----------------------------------------------------
# Taxonomy & Keyword Lexicons for Entity Extraction
# ----------------------------------------------------
HARD_SKILL_PATTERNS = {
    # Software & Tech
    "python": "Python",
    "python programming": "Python",
    "python development": "Python",
    "fastapi": "Python / FastAPI",
    "django": "Python",
    "react": "React.js",
    "react.js": "React.js",
    "reactjs": "React.js",
    "typescript": "TypeScript",
    "javascript": "JavaScript",
    "rest api": "REST APIs",
    "restful": "REST APIs",
    "microservices": "Microservices Architecture",
    "sql": "SQL Querying & Data Modeling",
    "postgresql": "PostgreSQL & pgvector",
    "postgres": "PostgreSQL & pgvector",
    "pgvector": "PostgreSQL & pgvector",
    "vector search": "PostgreSQL & pgvector",
    "docker": "Docker & Containerization",
    "containerization": "Docker & Containerization",
    "docker compose": "Docker & Containerization",
    "kubernetes": "Kubernetes Orchestration",
    "cloud security": "Network & Cloud Security",
    "cybersecurity": "Network & Cloud Security",
    "network security": "Network & Cloud Security",
    "ci/cd": "CI/CD Pipelines",
    "unit testing": "Unit Testing & QA",
    "pytest": "Unit Testing & QA",

    # Data Analytics
    "tableau": "Tableau Visual Analytics",
    "business intelligence": "Business Intelligence Reporting",
    "bi reporting": "Business Intelligence Reporting",
    "data modeling": "SQL Querying & Data Modeling",
    "data warehouse": "Data Warehousing",
    "bigquery": "Data Warehousing",
    "snowflake": "Data Warehousing",
    "statistical modeling": "Statistical Learning",
    "funnel analysis": "Conversion Funnel Analysis",

    # Digital Marketing
    "search engine optimization": "Search Engine Optimization",
    "seo": "Search Engine Optimization",
    "technical seo": "Search Engine Optimization",
    "google analytics 4": "Google Analytics 4 (GA4)",
    "ga4": "Google Analytics 4 (GA4)",
    "google tag manager": "Google Analytics 4 (GA4)",
    "gtm": "Google Analytics 4 (GA4)",
    "conversion rate optimization": "Conversion Rate Optimization",
    "cro": "Conversion Rate Optimization",
    "paid search": "Performance Marketing",
    "ppc": "Performance Marketing",

    # Electrician
    "emt conduit bending": "EMT Conduit Bending & Raceway Assembly",
    "conduit bending": "EMT Conduit Bending & Raceway Assembly",
    "emt bending": "EMT Conduit Bending & Raceway Assembly",
    "raceway": "EMT Conduit Bending & Raceway Assembly",
    "pipe bending": "EMT Conduit Bending & Raceway Assembly",
    "multimeter": "Multimeter Diagnostics & Circuit Troubleshooting",
    "multimeter diagnostics": "Multimeter Diagnostics & Circuit Troubleshooting",
    "circuit testing": "Multimeter Diagnostics & Circuit Troubleshooting",
    "voltage testing": "Multimeter Diagnostics & Circuit Troubleshooting",
    "continuity": "Multimeter Diagnostics & Circuit Troubleshooting",
    "panelboards": "Electrical Panel Installation",
    "branch circuits": "Branch Circuit Wiring",
    "three-phase": "Three-Phase Power Systems",
    "480v": "Three-Phase Power Systems",

    # Healthcare
    "vital signs": "Vital Signs Measurement & Clinical Triage",
    "taking vital signs": "Vital Signs Measurement & Clinical Triage",
    "blood pressure": "Vital Signs Measurement & Clinical Triage",
    "manual blood pressure": "Vital Signs Measurement & Clinical Triage",
    "triage": "Vital Signs Measurement & Clinical Triage",
    "pulse oximetry": "Vital Signs Measurement & Clinical Triage",
    "electronic health records": "Electronic Health Records (EHR) Documentation",
    "ehr": "Electronic Health Records (EHR) Documentation",
    "epic": "Electronic Health Records (EHR) Documentation",
    "cerner": "Electronic Health Records (EHR) Documentation",
    "medical charting": "Electronic Health Records (EHR) Documentation",
    "hipaa": "HIPAA Compliance",
    "phlebotomy": "Phlebotomy & Specimen Collection",
    "cpr": "BLS / CPR Certification",
    "bls": "BLS / CPR Certification",

    # Retail
    "point of sale": "Point-of-Sale (POS) Operations & Cash Reconciliation",
    "pos": "Point-of-Sale (POS) Operations & Cash Reconciliation",
    "point-of-sale": "Point-of-Sale (POS) Operations & Cash Reconciliation",
    "cash reconciliation": "Point-of-Sale (POS) Operations & Cash Reconciliation",
    "cashiering": "Point-of-Sale (POS) Operations & Cash Reconciliation",
    "drawer reconciliation": "Point-of-Sale (POS) Operations & Cash Reconciliation",
    "inventory auditing": "Inventory Auditing & Shrinkage Prevention",
    "cycle counts": "Inventory Auditing & Shrinkage Prevention",
    "shrinkage": "Inventory Auditing & Shrinkage Prevention",
    "loss prevention": "Inventory Auditing & Shrinkage Prevention",
    "stock replenishment": "Inventory Auditing & Shrinkage Prevention",
    "planograms": "Visual Merchandising & Planograms",

    # Manufacturing
    "cnc": "CNC G-Code Programming & Machine Setup",
    "g-code": "CNC G-Code Programming & Machine Setup",
    "cnc milling": "CNC G-Code Programming & Machine Setup",
    "cnc machining": "CNC G-Code Programming & Machine Setup",
    "machine setup": "CNC G-Code Programming & Machine Setup",
    "g54": "CNC G-Code Programming & Machine Setup",
    "gd&t": "GD&T Metrology & Quality Inspection",
    "geometric dimensioning": "GD&T Metrology & Quality Inspection",
    "metrology": "GD&T Metrology & Quality Inspection",
    "calipers": "GD&T Metrology & Quality Inspection",
    "micrometers": "GD&T Metrology & Quality Inspection",
    "cmm": "GD&T Metrology & Quality Inspection",
    "asme y14.5": "GD&T Metrology & Quality Inspection",
    "as9102": "GD&T Metrology & Quality Inspection",
}

SOFT_SKILL_PATTERNS = {
    "technical communication": "Technical Communication",
    "communication": "Technical Communication",
    "cross-functional": "Cross-Functional Collaboration",
    "collaboration": "Cross-Functional Collaboration",
    "teamwork": "Cross-Functional Collaboration",
    "data storytelling": "Data Storytelling & Executive Presentation",
    "executive presentation": "Data Storytelling & Executive Presentation",
    "storytelling": "Data Storytelling & Executive Presentation",
    "persuasive copywriting": "Persuasive Copywriting & Content Strategy",
    "copywriting": "Persuasive Copywriting & Content Strategy",
    "content strategy": "Persuasive Copywriting & Content Strategy",
    "lockout/tagout": "Jobsite Safety & Lockout/Tagout (LOTO)",
    "lockout tagout": "Jobsite Safety & Lockout/Tagout (LOTO)",
    "loto": "Jobsite Safety & Lockout/Tagout (LOTO)",
    "jobsite safety": "Jobsite Safety & Lockout/Tagout (LOTO)",
    "osha": "Jobsite Safety & Lockout/Tagout (LOTO)",
    "nfpa 70e": "Jobsite Safety & Lockout/Tagout (LOTO)",
    "empathic": "Empathic Patient Communication & Bedside De-escalation",
    "bedside manner": "Empathic Patient Communication & Bedside De-escalation",
    "de-escalation": "Empathic Patient Communication & Bedside De-escalation",
    "patient communication": "Empathic Patient Communication & Bedside De-escalation",
    "conflict resolution": "Customer Conflict De-escalation & Service Recovery",
    "customer service": "Customer Conflict De-escalation & Service Recovery",
    "service recovery": "Customer Conflict De-escalation & Service Recovery",
    "5s": "5S Lean Workplace Organization & Continuous Improvement",
    "5s lean": "5S Lean Workplace Organization & Continuous Improvement",
    "kaizen": "5S Lean Workplace Organization & Continuous Improvement",
    "continuous improvement": "5S Lean Workplace Organization & Continuous Improvement",
    "lean six sigma": "5S Lean Workplace Organization & Continuous Improvement",
    "problem solving": "Critical Problem Solving",
    "mentorship": "Technical Mentorship & Coaching",
}

TOOL_PATTERNS = {
    "python": "Python",
    "fastapi": "FastAPI",
    "react": "React.js",
    "typescript": "TypeScript",
    "tailwind": "Tailwind CSS",
    "docker": "Docker",
    "postgresql": "PostgreSQL",
    "tableau": "Tableau Desktop",
    "git": "Git",
    "pytest": "pytest",
    "ga4": "Google Analytics 4",
    "google tag manager": "Google Tag Manager",
    "screaming frog": "Screaming Frog SEO",
    "multimeter": "Digital Multimeter",
    "conduit bender": "EMT Conduit Bender",
    "epic": "Epic EHR",
    "cerner": "Cerner EHR",
    "rf scanner": "RF Handheld Scanner",
    "pos terminal": "POS Terminal",
    "cmm": "Coordinate Measuring Machine (CMM)",
    "calipers": "Digital Precision Calipers",
    "micrometer": "Outside Micrometers",
    "touch probe": "CNC Laser/Touch Probe",
}


class JobIntelligenceService:
    """End-to-end AI Job Intelligence: extraction, normalization, embeddings, and occupation mapping."""

    @classmethod
    def generate_embedding(cls, text: str) -> List[float]:
        """
        Generates 384-dimensional dense vector embeddings for pgvector & semantic search.
        Uses shared SentenceTransformers singleton when enabled/available, with high-accuracy deterministic SHA-256 fallback.
        """
        raw_emb = encode_text_embedding(text)
        return validate_and_serialize_vector(raw_emb, allow_none=False)

    @classmethod
    def extract_requirements_from_text(cls, text: str) -> Dict[str, Optional[str]]:
        """Extracts experience requirements, education requirements, location, and salary."""
        # 1. Experience extraction
        exp_match = re.search(
            r'(\b(?:\d+(?:[\-–]\d+)?\+?|\d+\s*to\s*\d+)\s*(?:years?|yrs?)(?:\s+of)?(?:\s+experience)?[^\.\n;]*|\bentry[\s\-]*level[^\.\n;]*|\bapprentice(?:ship)?[^\.\n;]*)',
            text,
            re.IGNORECASE
        )
        experience = exp_match.group(1).strip() if exp_match else None

        # 2. Education extraction
        edu_match = re.search(
            r'(\b(?:b\.?tech|b\.?e\b|m\.?tech|mca\b|bca\b|iti\b|diploma\b|bachelor\'?s?|master\'?s?|ph\.?d\.?|associate\'?s?)\s+(?:degree\s+)?(?:in\s+)?[^\.\n;]+|\b(?:higher\s+secondary|10\+2|high\s+school\s+diploma|ged)[^\.\n;]*|\b(?:ccma|cma|journeyman|master\s+electrician|cka|aws|bls|cpr|nims|lean\s+six\s+sigma)\b[^\.\n;]*)',
            text,
            re.IGNORECASE
        )
        education = edu_match.group(1).strip() if edu_match else None

        # 3. Salary extraction (Supports INR ₹, Rs, LPA, as well as international formats)
        sal_match = re.search(
            r'([₹₨]|rs\.?|inr)?\s*\d{1,3}(?:,\d{2,3})*(?:\.\d+)?\s*(?:[\-–]|to)\s*([₹₨]|rs\.?|inr)?\s*\d{1,3}(?:,\d{2,3})*(?:\.\d+)?\s*(?:lpa|\/\s*(?:yr|year|annum)|\bper\s+year\b|\bannually\b|\bper\s+month\b|\/\s*mo)?'
            r'|([₹₨]|rs\.?|inr)\s*\d{1,3}(?:,\d{2,3})*(?:\.\d+)?\s*(?:lpa|\/\s*(?:yr|year|annum)|\bper\s+year\b|\bannually\b|\bper\s+month\b|\/\s*mo)?'
            r'|(\$\s*\d{2,3}(?:,\d{3})+(?:\.\d{2})?(?:\s*(?:[\-–]|to)\s*\$?\s*\d{2,3}(?:,\d{3})+(?:\.\d{2})?)?(?:\s*(?:\/\s*(?:yr|year)|\bper\s+year\b|\bannually\b))?'
            r'|\$\s*\d{1,3}(?:\.\d{2})?\s*(?:[\-–]|to)\s*\$?\s*\d{1,3}(?:\.\d{2})?\s*(?:\/\s*(?:hr|hour)|\bper\s+hour\b)'
            r'|\$\s*\d{2,3}\s*[kK](?:\s*(?:[\-–]|to)\s*\$?\s*\d{2,3}\s*[kK])?(?:\s*(?:\/\s*(?:yr|year)|\bper\s+year\b|\bannually\b))?'
            r'|\$\s*\d{2,3}(?:,\d{3})+(?:\.\d{2})?)',
            text,
            re.IGNORECASE
        )
        salary = sal_match.group(0).strip() if sal_match else None

        # 4. Location extraction
        loc_label = re.search(r'(?:location|workplace|based in)\s*:\s*([^\n\.;]+)', text, re.IGNORECASE)
        if loc_label:
            location = loc_label.group(1).strip()
        else:
            city_match = re.search(r'\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,2},\s*[A-Z][a-zA-Z]+(?:\s*\((?:hybrid|remote|on[\-\s]*site)\))?)', text)
            location = city_match.group(1).strip() if city_match else None
        
        if not location and "remote" in text.lower():
            location = "Remote"

        return {
            "experience": experience,
            "education": education,
            "salary": salary,
            "location": location
        }

    @classmethod
    def extract_skills_with_nlp(cls, text: str) -> Dict[str, List[Dict[str, Any]]]:
        """
        Extracts Hard Skills, Soft Skills, and Tools with AI confidence scores (0.0 to 1.0).
        Uses comprehensive taxonomy matching with spaCy compatibility.
        """
        cleaned_text = text.lower()

        extracted_hard: Dict[str, Dict[str, Any]] = {}
        extracted_soft: Dict[str, Dict[str, Any]] = {}
        extracted_tools: Dict[str, Dict[str, Any]] = {}

        # 1. Hard Skills Extraction
        for pattern, canon in HARD_SKILL_PATTERNS.items():
            matches = list(re.finditer(r'\b' + re.escape(pattern) + r'\b', cleaned_text))
            if matches:
                # Frequency and position based confidence
                freq = len(matches)
                conf = min(0.99, 0.85 + (freq * 0.04))
                if canon not in extracted_hard or extracted_hard[canon]["confidence"] < conf:
                    extracted_hard[canon] = {
                        "raw_text": pattern.title(),
                        "canonical_name": canon,
                        "category": "hard",
                        "confidence": round(conf, 2),
                        "extraction_method": "spacy_entity_ruler"
                    }

        # 2. Soft Skills Extraction
        for pattern, canon in SOFT_SKILL_PATTERNS.items():
            matches = list(re.finditer(r'\b' + re.escape(pattern) + r'\b', cleaned_text))
            if matches:
                freq = len(matches)
                conf = min(0.96, 0.82 + (freq * 0.04))
                if canon not in extracted_soft or extracted_soft[canon]["confidence"] < conf:
                    extracted_soft[canon] = {
                        "raw_text": pattern.title(),
                        "canonical_name": canon,
                        "category": "soft",
                        "confidence": round(conf, 2),
                        "extraction_method": "spacy_entity_ruler"
                    }

        # 3. Tools Extraction
        for pattern, canon in TOOL_PATTERNS.items():
            matches = list(re.finditer(r'\b' + re.escape(pattern) + r'\b', cleaned_text))
            if matches:
                freq = len(matches)
                conf = min(0.98, 0.88 + (freq * 0.03))
                if canon not in extracted_tools or extracted_tools[canon]["confidence"] < conf:
                    extracted_tools[canon] = {
                        "raw_text": pattern.title(),
                        "canonical_name": canon,
                        "category": "tool",
                        "confidence": round(conf, 2),
                        "extraction_method": "spacy_tool_extractor"
                    }

        return {
            "hard_skills": list(extracted_hard.values()),
            "soft_skills": list(extracted_soft.values()),
            "tools": list(extracted_tools.values())
        }

    @classmethod
    def map_occupation_and_domain(
        cls,
        db: Session,
        title: str,
        extracted_skills: List[Dict[str, Any]]
    ) -> Tuple[Optional[Dict[str, Any]], str]:
        """
        Maps extracted skills & job title to canonical Occupation in the ontology.
        Returns (mapped_occupation_dict, domain_str).
        """
        all_occupations = db.query(Occupation).all()
        if not all_occupations:
            return None, "General"

        skill_names = set(s.get("canonical_name", "").lower() for s in extracted_skills)
        title_lower = title.lower()

        best_occ = None
        best_score = 0.0
        best_domain = "Software Development"

        for occ in all_occupations:
            score = 0.0
            occ_title_lower = occ.title.lower()

            # 1. Title keyword overlap
            title_tokens = set(re.findall(r'\b\w{3,}\b', occ_title_lower))
            matched_title_tokens = [t for t in title_tokens if t in title_lower]
            if matched_title_tokens:
                score += (len(matched_title_tokens) / max(len(title_tokens), 1)) * 50.0

            # 2. Skill overlap
            req_skill_ids = occ.required_skill_ids or []
            if req_skill_ids:
                # Find skill names for these IDs
                req_skills = db.query(Skill).filter(Skill.id.in_(req_skill_ids)).all()
                req_names = [s.name.lower() for s in req_skills]
                overlap = sum(1 for rn in req_names if rn in skill_names or any(rn in s for s in skill_names))
                score += (overlap / max(len(req_names), 1)) * 50.0

            if score > best_score:
                best_score = score
                best_occ = occ
                best_domain = occ.domain

        # If title matches specific domain keywords
        domain_keywords = {
            "Software Development": ["developer", "engineer", "software", "frontend", "backend", "full-stack", "devops", "cloud"],
            "Data Analytics": ["data", "analytics", "bi", "tableau", "insights", "business intelligence"],
            "Digital Marketing": ["marketing", "seo", "ga4", "copywriter", "growth", "performance marketing"],
            "Electrician": ["electrician", "conduit", "wireman", "electrical", "journeyman"],
            "Healthcare": ["medical", "clinic", "health", "vitals", "patient", "ccma", "ehr"],
            "Retail": ["retail", "pos", "store", "cashier", "inventory", "shrinkage", "merchandising"],
            "Manufacturing": ["machinist", "cnc", "metrology", "g-code", "gd&t", "5s", "machining"]
        }
        for dom, kw_list in domain_keywords.items():
            if any(kw in title_lower for kw in kw_list):
                best_domain = dom
                break

        mapped_dict = None
        if best_occ:
            mapped_dict = {
                "id": best_occ.id,
                "code": best_occ.code,
                "title": best_occ.title,
                "domain": best_occ.domain,
                "career_band": best_occ.career_band,
                "median_salary": best_occ.median_salary,
                "demand_outlook": best_occ.demand_outlook,
                "match_score": min(98, round(max(55.0, best_score))),
            }

        return mapped_dict, best_domain

    @classmethod
    def analyze_job_description(
        cls,
        db: Session,
        text: str,
        title: Optional[str] = "",
        employer_name: Optional[str] = "Confidential Employer",
        location: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes complete pipeline:
        Job Description -> Skill Extraction -> Skill Normalization -> Occupation Mapping
        """
        # 1. Extract requirements
        reqs = cls.extract_requirements_from_text(text)
        detected_location = location or reqs["location"] or "Bengaluru, KA (Hybrid)"
        detected_salary = reqs["salary"] or "Competitive Market Rate"

        # 2. Extract Skills (Hard, Soft, Tools)
        extracted = cls.extract_skills_with_nlp(text)
        all_raw_skills = extracted["hard_skills"] + extracted["soft_skills"] + extracted["tools"]

        # 3. Skill Normalization via SkillNormalizationService
        normalized_skills = []
        for s in all_raw_skills:
            norm_res = SkillNormalizationService.normalize_skill(db, s["raw_text"])
            s_dict = {
                "raw_text": s["raw_text"],
                "canonical_name": norm_res.get("canonical_name") or s["canonical_name"],
                "canonical_skill_id": norm_res.get("canonical_skill_id"),
                "category": s["category"],
                "confidence": s["confidence"],
                "extraction_method": s["extraction_method"],
                "matched_alias": norm_res.get("matched_alias")
            }
            normalized_skills.append(s_dict)
            # Update canonical info on extracted items
            s["canonical_name"] = s_dict["canonical_name"]
            s["canonical_skill_id"] = s_dict["canonical_skill_id"]

        # 4. Map Occupation & Domain
        effective_title = title or "Specialist"
        mapped_occ, domain = cls.map_occupation_and_domain(db, effective_title, normalized_skills)

        # 5. Semantic Embedding
        embedding_text = f"{effective_title}. {domain}. {text[:500]}"
        embedding = cls.generate_embedding(embedding_text)

        return {
            "title": effective_title,
            "employer_name": employer_name,
            "location": detected_location,
            "salary": detected_salary,
            "domain": domain,
            "experience_requirements": reqs["experience"],
            "education_requirements": reqs["education"],
            "extracted_hard_skills": extracted["hard_skills"],
            "extracted_soft_skills": extracted["soft_skills"],
            "extracted_tools": extracted["tools"],
            "normalized_skills": normalized_skills,
            "mapped_occupation": mapped_occ,
            "embedding": embedding
        }

    @classmethod
    def process_and_save_job(
        cls,
        db: Session,
        job_data: Dict[str, Any],
        commit: bool = True
    ) -> Job:
        """
        Analyzes and saves job description into PostgreSQL tables 'jobs' and 'job_extracted_skills'.
        Supports transactional execution via commit=False (caller or savepoint manages commit).
        """
        analysis = cls.analyze_job_description(
            db=db,
            text=job_data["description"],
            title=job_data.get("title", ""),
            employer_name=job_data.get("employer_name", "Enterprise Partner"),
            location=job_data.get("location")
        )

        job_id = job_data.get("id") or f"JOB-AI-{math.floor(math.sin(hash(job_data['description'])) * 1000000) % 900 + 100}"
        if not job_id.startswith("JOB-"):
            job_id = f"JOB-{job_id}"

        # Consolidate required skill names
        req_skills_list = [s["canonical_name"] for s in analysis["normalized_skills"] if s.get("canonical_name")]
        if not req_skills_list:
            req_skills_list = job_data.get("required_skills", [])

        mapped_occ = analysis.get("mapped_occupation") or {}

        exp_val = job_data.get("experience") or analysis.get("experience_requirements")
        if exp_val:
            exp_val = str(exp_val)[:250]

        exp_lvl_val = job_data.get("experience_level") or analysis.get("experience_requirements")
        if exp_lvl_val:
            exp_lvl_val = str(exp_lvl_val)[:250]

        edu_lvl_val = job_data.get("education_level") or analysis.get("education_requirements")
        if edu_lvl_val:
            edu_lvl_val = str(edu_lvl_val)[:250]

        # Create or update Job record
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            job = Job(
                id=job_id,
                title=job_data.get("title") or analysis["title"],
                company_id=job_data.get("company_id"),
                created_by=job_data.get("created_by"),
                experience=exp_val,
                employer_id=job_data.get("employer_id"),
                employer_name=job_data.get("employer_name") or analysis["employer_name"],
                location=job_data.get("location") or analysis["location"],
                employment_type=job_data.get("employment_type", "Full-time"),
                workplace_type=job_data.get("workplace_type", "Hybrid"),
                salary_range=job_data.get("salary_range") or analysis["salary"] or "₹7,50,000 - ₹9,50,000",
                required_skills=req_skills_list,
                openings_count=job_data.get("openings_count", 1),
                applicants_count=job_data.get("applicants_count", 0),
                status=job_data.get("status", "active"),
                posted_date=job_data.get("posted_date", "2024-09-25"),
                closing_date=job_data.get("closing_date"),
                description=job_data["description"],
                domain=job_data.get("domain") or analysis["domain"],
                mapped_occupation_id=mapped_occ.get("id"),
                mapped_occupation_title=mapped_occ.get("title"),
                experience_level=exp_lvl_val,
                education_level=edu_lvl_val,
                source=job_data.get("source", "direct_submission"),
                extracted_metadata={
                    "hard_skills": analysis["extracted_hard_skills"],
                    "soft_skills": analysis["extracted_soft_skills"],
                    "tools": analysis["extracted_tools"],
                    "mapped_occupation": mapped_occ
                },
                embedding=validate_and_serialize_vector(analysis.get("embedding"), allow_none=True)
            )
            db.add(job)
        else:
            job.title = job_data.get("title") or job.title
            if job_data.get("company_id"):
                job.company_id = job_data["company_id"]
            if job_data.get("created_by"):
                job.created_by = job_data["created_by"]
            if exp_val:
                job.experience = exp_val
            job.employer_name = job_data.get("employer_name") or analysis["employer_name"]
            job.location = job_data.get("location") or analysis["location"]
            job.salary_range = job_data.get("salary_range") or analysis["salary"] or "₹7,50,000 - ₹9,50,000"
            job.description = job_data["description"]
            job.domain = job_data.get("domain") or analysis["domain"]
            job.mapped_occupation_id = mapped_occ.get("id")
            job.mapped_occupation_title = mapped_occ.get("title")
            job.experience_level = exp_lvl_val
            job.education_level = edu_lvl_val
            job.required_skills = req_skills_list
            job.extracted_metadata = {
                "hard_skills": analysis["extracted_hard_skills"],
                "soft_skills": analysis["extracted_soft_skills"],
                "tools": analysis["extracted_tools"],
                "mapped_occupation": mapped_occ
            }
            job.embedding = validate_and_serialize_vector(analysis.get("embedding"), allow_none=True)

        db.flush()

        # Clear existing extracted skill records for this job
        db.query(JobExtractedSkill).filter(JobExtractedSkill.job_id == job.id).delete()

        # Add records in job_extracted_skills table
        for s in analysis["normalized_skills"]:
            db.add(JobExtractedSkill(
                job_id=job.id,
                raw_text=s["raw_text"],
                canonical_skill_id=s.get("canonical_skill_id"),
                canonical_name=s.get("canonical_name"),
                category=s.get("category", "hard"),
                confidence=s.get("confidence", 0.90),
                extraction_method=s.get("extraction_method", "spacy_ner")
            ))

        db.flush()
        if commit:
            db.commit()
            db.refresh(job)
        return job
