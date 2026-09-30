import re
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from app.models.entities import Skill, SkillAlias

class SkillNormalizationService:
    @staticmethod
    def clean_term(text: str) -> str:
        """Lowercases, strips, and cleans extra whitespace & punctuation."""
        return re.sub(r'[\s\-_]+', ' ', text.strip().lower())

    @classmethod
    def normalize_skill(cls, db: Session, query_text: str) -> Dict[str, Any]:
        raw_query = query_text.strip()
        cleaned_query = cls.clean_term(raw_query)

        if not cleaned_query:
            return {
                "query": raw_query,
                "canonical_skill_id": None,
                "canonical_name": None,
                "matched_alias": None,
                "confidence": 0.0,
                "category": None,
                "domain": None,
                "skill_details": None
            }

        # 1. Exact alias table lookup
        alias_record = db.query(SkillAlias).filter(SkillAlias.alias == cleaned_query).first()
        if alias_record:
            skill = db.query(Skill).filter(Skill.id == alias_record.canonical_skill_id).first()
            if skill:
                return {
                    "query": raw_query,
                    "canonical_skill_id": skill.id,
                    "canonical_name": skill.name,
                    "matched_alias": alias_record.alias,
                    "confidence": 1.0,
                    "category": skill.category,
                    "domain": skill.domain,
                    "skill_details": {
                        "id": skill.id,
                        "code": skill.code,
                        "name": skill.name,
                        "category": skill.category,
                        "domain": skill.domain,
                        "description": skill.description,
                        "proficiency_levels": skill.proficiency_levels or {},
                        "aliases": skill.aliases or [],
                        "demand_score": skill.demand_score
                    }
                }

        # 2. Check canonical skill names
        all_skills = db.query(Skill).all()
        for skill in all_skills:
            if cls.clean_term(skill.name) == cleaned_query or (skill.canonical_name and cls.clean_term(skill.canonical_name) == cleaned_query):
                return {
                    "query": raw_query,
                    "canonical_skill_id": skill.id,
                    "canonical_name": skill.name,
                    "matched_alias": skill.name,
                    "confidence": 1.0,
                    "category": skill.category,
                    "domain": skill.domain,
                    "skill_details": {
                        "id": skill.id,
                        "code": skill.code,
                        "name": skill.name,
                        "category": skill.category,
                        "domain": skill.domain,
                        "description": skill.description,
                        "proficiency_levels": skill.proficiency_levels or {},
                        "aliases": skill.aliases or [],
                        "demand_score": skill.demand_score
                    }
                }

        # 3. Check JSON aliases list on skills
        for skill in all_skills:
            for al in (skill.aliases or []):
                if cls.clean_term(al) == cleaned_query:
                    return {
                        "query": raw_query,
                        "canonical_skill_id": skill.id,
                        "canonical_name": skill.name,
                        "matched_alias": al,
                        "confidence": 0.95,
                        "category": skill.category,
                        "domain": skill.domain,
                        "skill_details": {
                            "id": skill.id,
                            "code": skill.code,
                            "name": skill.name,
                            "category": skill.category,
                            "domain": skill.domain,
                            "description": skill.description,
                            "proficiency_levels": skill.proficiency_levels or {},
                            "aliases": skill.aliases or [],
                            "demand_score": skill.demand_score
                        }
                    }

        # 4. Normalized fuzzy substring matching
        # Strip common noise words: programming, development, framework, tool, specialist, skills, engineer
        noise_pattern = r'\b(programming|development|framework|tools?|specialist|skills?|engineer|tech|3|js)\b'
        core_query = re.sub(noise_pattern, '', cleaned_query).strip()

        best_match: Optional[Skill] = None
        best_alias: Optional[str] = None
        highest_score = 0.0

        for skill in all_skills:
            clean_canonical = cls.clean_term(skill.name)
            core_canonical = re.sub(noise_pattern, '', clean_canonical).strip()

            # Exact core match
            if core_query and core_canonical and (core_query == core_canonical):
                return {
                    "query": raw_query,
                    "canonical_skill_id": skill.id,
                    "canonical_name": skill.name,
                    "matched_alias": skill.name,
                    "confidence": 0.90,
                    "category": skill.category,
                    "domain": skill.domain,
                    "skill_details": {
                        "id": skill.id,
                        "code": skill.code,
                        "name": skill.name,
                        "category": skill.category,
                        "domain": skill.domain,
                        "description": skill.description,
                        "proficiency_levels": skill.proficiency_levels or {},
                        "aliases": skill.aliases or [],
                        "demand_score": skill.demand_score
                    }
                }

            # Substring containment
            if core_query and len(core_query) >= 3:
                if core_query in clean_canonical or clean_canonical in core_query:
                    score = len(core_query) / max(len(clean_canonical), len(core_query))
                    if score > highest_score:
                        highest_score = score
                        best_match = skill
                        best_alias = skill.name

            # Substring check on aliases
            for al in (skill.aliases or []):
                clean_al = cls.clean_term(al)
                core_al = re.sub(noise_pattern, '', clean_al).strip()
                if core_query and (core_query == core_al or (len(core_query) >= 3 and (core_query in clean_al or clean_al in core_query))):
                    score = len(core_query) / max(len(clean_al), len(core_query))
                    if score > highest_score:
                        highest_score = score
                        best_match = skill
                        best_alias = al

        if best_match and highest_score >= 0.5:
            return {
                "query": raw_query,
                "canonical_skill_id": best_match.id,
                "canonical_name": best_match.name,
                "matched_alias": best_alias,
                "confidence": round(0.70 + (highest_score * 0.25), 2),
                "category": best_match.category,
                "domain": best_match.domain,
                "skill_details": {
                    "id": best_match.id,
                    "code": best_match.code,
                    "name": best_match.name,
                    "category": best_match.category,
                    "domain": best_match.domain,
                    "description": best_match.description,
                    "proficiency_levels": best_match.proficiency_levels or {},
                    "aliases": best_match.aliases or [],
                    "demand_score": best_match.demand_score
                }
            }

        # Fallback: No confident match
        return {
            "query": raw_query,
            "canonical_skill_id": None,
            "canonical_name": None,
            "matched_alias": None,
            "confidence": 0.0,
            "category": None,
            "domain": None,
            "skill_details": None
        }
