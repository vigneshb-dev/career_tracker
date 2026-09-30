"""
Structured Soft-Skill Assessment Rubrics and Scenario Situational Judgement Tests.

Note: In accordance with workforce psychometrics best practices, this module evaluates
observable workplace behaviors against standardized rubrics, avoiding subjective
unverified personality claims.
"""

from typing import Dict, List, Any

# Standard 0-5 Proficiency Scale Definitions
PROFICIENCY_LEVEL_RUBRICS = {
    0: {
        "title": "Unobserved",
        "description": "No documented evidence or performance records available.",
        "behavioral_indicator": "Insufficient data to determine competency level."
    },
    1: {
        "title": "Novice / Ineffective",
        "description": "Demonstrates rudimentary awareness but requires continuous direction; may react defensively or fail to align.",
        "behavioral_indicator": "Struggles with basic execution, avoids accountability, or reacts impulsively under stress."
    },
    2: {
        "title": "Developing",
        "description": "Applies fundamental principles under regular supervision; handles straightforward scenarios with occasional assistance.",
        "behavioral_indicator": "Performs standard procedures adequately; requires coaching when facing unexpected variations."
    },
    3: {
        "title": "Competent",
        "description": "Consistently autonomous; reliably applies industry standards and best practices to resolve typical workplace challenges.",
        "behavioral_indicator": "Communicates clearly, collaborates productively, diagnoses common problems, and delivers on commitments independently."
    },
    4: {
        "title": "Advanced",
        "description": "Proactively anticipates obstacles, navigates ambiguous edge cases, and mentors teammates to elevate team outcomes.",
        "behavioral_indicator": "Facilitates alignment across stakeholders, decomposes complex problems, and adapts dynamically to organizational pivots."
    },
    5: {
        "title": "Expert / Role Model",
        "description": "Serves as an institutional exemplar; architects systemic frameworks, resolves high-stakes crises, and drives continuous organizational excellence.",
        "behavioral_indicator": "Champions best practices, synthesizes divergent perspectives into strategic consensus, and maintains composure under extreme pressure."
    }
}

SOFT_SKILL_SCENARIOS: Dict[str, Dict[str, Any]] = {
    "Communication": {
        "skill_id": "sk-comm-01",
        "name": "Technical Communication",
        "canonical_name": "Technical Communication",
        "category": "soft",
        "description": "Effectively conveys complex technical or operational concepts to diverse audiences, actively listens, and ensures cross-functional alignment.",
        "questions": [
            {
                "id": "comm-q1",
                "scenario": (
                    "A critical production deploy has caused an intermittent service outage affecting enterprise clients. "
                    "You need to brief both the technical incident team and the non-technical VP of Customer Relations simultaneously. "
                    "What is your immediate communication approach?"
                ),
                "options": [
                    {
                        "id": "opt-1",
                        "level": 5,
                        "score": 5.0,
                        "text": (
                            "Provide a two-tiered executive brief: a 3-bullet plain-language summary for the VP covering client impact, "
                            "mitigation ETA, and public messaging, paired with a structured technical telemetry status log for engineers."
                        ),
                        "rubric_rationale": "Expert framing tailored simultaneously to strategic executive and operational engineering needs."
                    },
                    {
                        "id": "opt-2",
                        "level": 4,
                        "score": 4.0,
                        "text": (
                            "Summarize the technical root cause in clear, jargon-free language first, followed by clear next steps and an agreed check-in cadence."
                        ),
                        "rubric_rationale": "Advanced clarity and cadence management with proactive stakeholder empathy."
                    },
                    {
                        "id": "opt-3",
                        "level": 3,
                        "score": 3.0,
                        "text": (
                            "Share the ongoing debugging log directly with everyone and answer questions as they arise."
                        ),
                        "rubric_rationale": "Competent transparency, though technical details may overwhelm non-technical stakeholders."
                    },
                    {
                        "id": "opt-4",
                        "level": 2,
                        "score": 2.0,
                        "text": (
                            "Wait until the technical team identifies the exact bug before sending any updates to the VP."
                        ),
                        "rubric_rationale": "Developing execution; delays vital stakeholder notification creating operational communication vacuum."
                    },
                    {
                        "id": "opt-5",
                        "level": 1,
                        "score": 1.0,
                        "text": (
                            "Forward technical stack traces to the VP and state that infrastructure instability was unexpected."
                        ),
                        "rubric_rationale": "Ineffective communication; abdicates contextual translation and creates panic."
                    }
                ]
            },
            {
                "id": "comm-q2",
                "scenario": (
                    "During a peer code or clinical procedure review, a senior reviewer leaves abrupt, highly critical feedback "
                    "on your submission that you believe is factually incorrect regarding the design specification. How do you respond?"
                ),
                "options": [
                    {
                        "id": "opt-1",
                        "level": 5,
                        "score": 5.0,
                        "text": (
                            "Request a 10-minute 1-on-1 walkthrough; acknowledge their perspective, present the architectural spec benchmarks, "
                            "and collaboratively determine whether the spec needs updating or the implementation should be adjusted."
                        ),
                        "rubric_rationale": "Expert de-escalation; converts conflict into collaborative systemic improvement."
                    },
                    {
                        "id": "opt-2",
                        "level": 4,
                        "score": 4.0,
                        "text": (
                            "Politely reply in the review thread citing the exact specification document sections, thanking them for the scrutiny, "
                            "and asking if they see an edge case you may have missed."
                        ),
                        "rubric_rationale": "Advanced professional dialogue grounded in objective evidence and intellectual humility."
                    },
                    {
                        "id": "opt-3",
                        "level": 3,
                        "score": 3.0,
                        "text": (
                            "Reply concisely in the review with links to the spec, asking them to re-verify the requirements."
                        ),
                        "rubric_rationale": "Competent and direct, but lacks collaborative relationship building."
                    },
                    {
                        "id": "opt-4",
                        "level": 2,
                        "score": 2.0,
                        "text": (
                            "Make the requested changes anyway to avoid friction, even if it contradicts the spec."
                        ),
                        "rubric_rationale": "Developing; avoids difficult conversations at the expense of correct specification conformance."
                    },
                    {
                        "id": "opt-5",
                        "level": 1,
                        "score": 1.0,
                        "text": (
                            "Publicly reject the review comments and complain to the engineering manager that the reviewer is biased."
                        ),
                        "rubric_rationale": "Ineffective emotional defensiveness damaging team trust."
                    }
                ]
            }
        ]
    },

    "Teamwork": {
        "skill_id": "sk-team-01",
        "name": "Cross-Functional Collaboration",
        "canonical_name": "Cross-Functional Collaboration",
        "category": "soft",
        "description": "Collaborates productively across interdisciplinary roles, shares accountability, supports peers, and resolves cross-functional friction.",
        "questions": [
            {
                "id": "team-q1",
                "scenario": (
                    "Your cohort project team is 48 hours away from a milestone demo. A teammate responsible for the API data pipeline "
                    "falls ill and cannot complete their module. What action do you take?"
                ),
                "options": [
                    {
                        "id": "opt-1",
                        "level": 5,
                        "score": 5.0,
                        "text": (
                            "Convene a quick 15-minute team huddle, review their Git branch/docs, triage non-critical features, and "
                            "reassign specific pipeline tasks across remaining members while establishing fallback mock data for the demo."
                        ),
                        "rubric_rationale": "Expert agile leadership; balances empathy for teammate with proactive risk mitigation."
                    },
                    {
                        "id": "opt-2",
                        "level": 4,
                        "score": 4.0,
                        "text": (
                            "Volunteer to take over their remaining tasks while coordinating with the instructor/lead to reprioritize scope."
                        ),
                        "rubric_rationale": "Advanced accountability and willingness to step into mission-critical gaps."
                    },
                    {
                        "id": "opt-3",
                        "level": 3,
                        "score": 3.0,
                        "text": (
                            "Work exclusively on your assigned component to make sure it is 100% bug-free, and alert the instructor about the gap."
                        ),
                        "rubric_rationale": "Competent individual delivery, but lacks proactive cross-functional team rescue."
                    },
                    {
                        "id": "opt-4",
                        "level": 2,
                        "score": 2.0,
                        "text": (
                            "Wait for the instructor or project manager to notice the missing module and assign someone."
                        ),
                        "rubric_rationale": "Developing; passive posture towards collective team commitments."
                    },
                    {
                        "id": "opt-5",
                        "level": 1,
                        "score": 1.0,
                        "text": (
                            "Present only your own portion during the demo and explicitly state the missing work was someone else's fault."
                        ),
                        "rubric_rationale": "Ineffective; undermines team cohesion and demonstrates toxic finger-pointing."
                    }
                ]
            },
            {
                "id": "team-q2",
                "scenario": (
                    "Two team members strongly disagree on whether to use a relational PostgreSQL schema or a document store for an analytics feature, "
                    "causing the design discussion to stall for two days. How do you facilitate progress?"
                ),
                "options": [
                    {
                        "id": "opt-1",
                        "level": 5,
                        "score": 5.0,
                        "text": (
                            "Create an objective decision matrix scoring both options against query patterns, latency constraints, and delivery deadlines, "
                            "then guide the team through a timeboxed consensus vote with an agreed escalation fallback."
                        ),
                        "rubric_rationale": "Expert facilitation; grounds debate in objective criteria and breaks deadlocks smoothly."
                    },
                    {
                        "id": "opt-2",
                        "level": 4,
                        "score": 4.0,
                        "text": (
                            "Propose building a 2-hour prototype benchmark test of both tools to let empirical performance data make the decision."
                        ),
                        "rubric_rationale": "Advanced pragmatic problem solving through empirical evidence."
                    },
                    {
                        "id": "opt-3",
                        "level": 3,
                        "score": 3.0,
                        "text": (
                            "Encourage them to compromise by picking whichever tool the majority of the team has existing experience in."
                        ),
                        "rubric_rationale": "Competent pragmatic compromise, though may not optimize for technical fit."
                    },
                    {
                        "id": "opt-4",
                        "level": 2,
                        "score": 2.0,
                        "text": (
                            "Vote for whichever colleague is your closer personal friend to end the meeting."
                        ),
                        "rubric_rationale": "Developing; introduces social bias into technical decisions."
                    },
                    {
                        "id": "opt-5",
                        "level": 1,
                        "score": 1.0,
                        "text": (
                            "Disengage from the discussion and state that you do not care as long as you do not have to write the database code."
                        ),
                        "rubric_rationale": "Ineffective apathy; abdicates shared responsibility for team success."
                    }
                ]
            }
        ]
    },

    "Problem Solving": {
        "skill_id": "sk-prob-01",
        "name": "Critical Problem Solving",
        "canonical_name": "Critical Problem Solving",
        "category": "soft",
        "description": "Deconstructs complex issues into fundamental root causes, evaluates trade-offs, and formulates durable, data-driven solutions.",
        "questions": [
            {
                "id": "prob-q1",
                "scenario": (
                    "An automated data import job that has run smoothly for months suddenly fails with an ambiguous 'Memory Limit Exceeded' error. "
                    "Restarting the container temporarily fixes it, but it fails again 4 hours later. How do you investigate?"
                ),
                "options": [
                    {
                        "id": "opt-1",
                        "level": 5,
                        "score": 5.0,
                        "text": (
                            "Profile heap allocations under load to isolate memory leaks (e.g. unclosed database connections or unbounded batch caching), "
                            "examine input dataset growth trends over the last 90 days, and implement streaming chunk pagination with automated alerting."
                        ),
                        "rubric_rationale": "Expert root-cause analysis addressing both immediate code defects and long-term architectural scaling."
                    },
                    {
                        "id": "opt-2",
                        "level": 4,
                        "score": 4.0,
                        "text": (
                            "Inspect memory consumption metrics over time, reproduce the crash locally with production-sized payloads, and fix unclosed resources."
                        ),
                        "rubric_rationale": "Advanced diagnostic methodology using systematic reproduction."
                    },
                    {
                        "id": "opt-3",
                        "level": 3,
                        "score": 3.0,
                        "text": (
                            "Double the container memory allocation limit and monitor if the crash occurs again."
                        ),
                        "rubric_rationale": "Competent temporary workaround, but treats symptoms rather than addressing underlying root cause."
                    },
                    {
                        "id": "opt-4",
                        "level": 2,
                        "score": 2.0,
                        "text": (
                            "Setup a cron job to automatically restart the container every 3 hours."
                        ),
                        "rubric_rationale": "Developing; relies on brittle band-aids without investigating the failure."
                    },
                    {
                        "id": "opt-5",
                        "level": 1,
                        "score": 1.0,
                        "text": (
                            "Manually restart the service each time it crashes and hope the problem resolves itself."
                        ),
                        "rubric_rationale": "Ineffective reactive stance with zero problem investigation."
                    }
                ]
            },
            {
                "id": "prob-q2",
                "scenario": (
                    "You discover a security vulnerability in a third-party dependency used throughout your application. "
                    "Updating the package fixes the security flaw but introduces breaking API changes that will require modifying 15 modules. What is your strategy?"
                ),
                "options": [
                    {
                        "id": "opt-1",
                        "level": 5,
                        "score": 5.0,
                        "text": (
                            "Implement an adapter facade layer that wraps the new dependency while preserving the legacy internal interface, "
                            "allowing security patching immediately while decoupling modules for incremental refactoring."
                        ),
                        "rubric_rationale": "Expert architectural design pattern decoupling urgent security needs from downstream dependencies."
                    },
                    {
                        "id": "opt-2",
                        "level": 4,
                        "score": 4.0,
                        "text": (
                            "Triage the vulnerability severity (CVSS); create an isolated branch to upgrade the library and update all 15 modules with comprehensive test coverage."
                        ),
                        "rubric_rationale": "Advanced systematic remediation with rigorous quality validation."
                    },
                    {
                        "id": "opt-3",
                        "level": 3,
                        "score": 3.0,
                        "text": (
                            "Log a high-priority tech debt ticket, apply temporary network firewall guards, and schedule the upgrade for the next sprint."
                        ),
                        "rubric_rationale": "Competent risk mitigation, balancing urgency with sprint planning."
                    },
                    {
                        "id": "opt-4",
                        "level": 2,
                        "score": 2.0,
                        "text": (
                            "Suppress the vulnerability scanner warning to allow CI/CD builds to continue passing."
                        ),
                        "rubric_rationale": "Developing; dangerous avoidance of security compliance requirements."
                    },
                    {
                        "id": "opt-5",
                        "level": 1,
                        "score": 1.0,
                        "text": (
                            "Ignore the notification because everything is currently functioning in production."
                        ),
                        "rubric_rationale": "Ineffective neglect of enterprise security standards."
                    }
                ]
            }
        ]
    },

    "Adaptability": {
        "skill_id": "sk-adapt-01",
        "name": "Workplace Adaptability & Learning Agility",
        "canonical_name": "Workplace Adaptability & Learning Agility",
        "category": "soft",
        "description": "Adjusts effectively to unexpected shifts in technology, workflow requirements, or team structure while maintaining high performance.",
        "questions": [
            {
                "id": "adapt-q1",
                "scenario": (
                    "Three weeks into a customer analytics project, the employer partner informs the team that their internal systems "
                    "are migrating from Python/Pandas to TypeScript/Node.js, and all deliverables must use the new stack. How do you respond?"
                ),
                "options": [
                    {
                        "id": "opt-1",
                        "level": 5,
                        "score": 5.0,
                        "text": (
                            "Embrace the pivot constructively; identify conceptual parallels between Pandas and TypeScript data libraries, "
                            "build a rapid proof-of-concept pipeline, and create a shared cheatsheet to accelerate team-wide onboarding."
                        ),
                        "rubric_rationale": "Expert learning agility; turns organizational disruption into collaborative upskilling."
                    },
                    {
                        "id": "opt-2",
                        "level": 4,
                        "score": 4.0,
                        "text": (
                            "Immediately enroll in documentation tutorials, adapt existing data models into TypeScript interfaces, and proactively seek feedback."
                        ),
                        "rubric_rationale": "Advanced adaptability with self-directed learning initiative."
                    },
                    {
                        "id": "opt-3",
                        "level": 3,
                        "score": 3.0,
                        "text": (
                            "Accept the change without complaint and follow the instructions and boilerplates provided by the lead instructor."
                        ),
                        "rubric_rationale": "Competent compliance, though reliant on external scaffolding."
                    },
                    {
                        "id": "opt-4",
                        "level": 2,
                        "score": 2.0,
                        "text": (
                            "Express vocal frustration in team meetings and request an extension because the curriculum was supposed to be Python."
                        ),
                        "rubric_rationale": "Developing; struggles emotionally with requirement uncertainty."
                    },
                    {
                        "id": "opt-5",
                        "level": 1,
                        "score": 1.0,
                        "text": (
                            "Refuse to work with TypeScript and continue submitting Python scripts."
                        ),
                        "rubric_rationale": "Ineffective rigidity; failure to adapt to client operational realities."
                    }
                ]
            }
        ]
    },

    "Time Management": {
        "skill_id": "sk-time-01",
        "name": "Time Management & Prioritization",
        "canonical_name": "Time Management & Prioritization",
        "category": "soft",
        "description": "Systematically organizes workload, manages competing deadlines, anticipates bottlenecks, and delivers outcomes on schedule.",
        "questions": [
            {
                "id": "time-q1",
                "scenario": (
                    "You have three simultaneous deadlines due in 36 hours: an assessment exam (30% of grade), a capstone client deliverable "
                    "(high visibility), and a peer code review. You realize you have 18 hours of available working time. What is your execution plan?"
                ),
                "options": [
                    {
                        "id": "opt-1",
                        "level": 5,
                        "score": 5.0,
                        "text": (
                            "Apply Eisenhower triage: timebox 8 hours to core client deliverable essentials (MVP), 6 hours to high-yield exam preparation, "
                            "and 2 hours to peer review, while proactively communicating ETA expectations to the client lead and peer."
                        ),
                        "rubric_rationale": "Expert prioritization; preserves high-impact outcomes through structured timeboxing and transparent stakeholder communication."
                    },
                    {
                        "id": "opt-2",
                        "level": 4,
                        "score": 4.0,
                        "text": (
                            "Rank tasks by severity and grading weight; focus on the client deliverable and exam first, and ask peer for permission to review right after the exam."
                        ),
                        "rubric_rationale": "Advanced trade-off management with proactive peer courtesy."
                    },
                    {
                        "id": "opt-3",
                        "level": 3,
                        "score": 3.0,
                        "text": (
                            "Attempt to work through the night with caffeine to complete all three items without adjustments."
                        ),
                        "rubric_rationale": "Competent determination, but unsustainably trades sleep for quality, risking error propagation."
                    },
                    {
                        "id": "opt-4",
                        "level": 2,
                        "score": 2.0,
                        "text": (
                            "Work on the easiest task (peer review) first because it is quick, leaving insufficient time for the exam and client work."
                        ),
                        "rubric_rationale": "Developing; exhibits priority inversion (doing easy tasks over critical tasks)."
                    },
                    {
                        "id": "opt-5",
                        "level": 1,
                        "score": 1.0,
                        "text": (
                            "Miss the deadlines without warning and tell evaluators you were overloaded."
                        ),
                        "rubric_rationale": "Ineffective; lacks basic time discipline and accountability."
                    }
                ]
            }
        ]
    }
}


class SoftSkillAssessmentService:
    """Evaluates scenario-based situational judgement assessments against objective behavioral rubrics."""

    @classmethod
    def get_all_scenarios(cls) -> Dict[str, Any]:
        """Returns all soft skill scenarios, questions, and structured rubric options."""
        return {
            "categories": list(SOFT_SKILL_SCENARIOS.keys()),
            "scenarios": SOFT_SKILL_SCENARIOS,
            "rubrics": PROFICIENCY_LEVEL_RUBRICS
        }

    @classmethod
    def evaluate_scenario_answers(
        cls,
        answers: List[Dict[str, str]], # [{"question_id": "comm-q1", "selected_option_id": "opt-1"}]
        reviewer: str = "Workforce Behavioral Assessment Engine"
    ) -> List[Dict[str, Any]]:
        """
        Calculates 0-5 scores per soft skill based on submitted options and rubric anchors.
        Returns evidence objects ready to be persisted.
        """
        # Map question id to its skill and option
        q_lookup = {}
        for skill_name, data in SOFT_SKILL_SCENARIOS.items():
            for q in data["questions"]:
                q_lookup[q["id"]] = {
                    "skill_name": skill_name,
                    "canonical_name": data["canonical_name"],
                    "skill_id": data["skill_id"],
                    "question": q,
                    "options": {opt["id"]: opt for opt in q["options"]}
                }

        # Aggregate scores per skill
        skill_scores: Dict[str, List[Dict[str, Any]]] = {}

        for ans in answers:
            qid = ans.get("question_id")
            opt_id = ans.get("selected_option_id")
            if qid in q_lookup and opt_id in q_lookup[qid]["options"]:
                entry = q_lookup[qid]
                chosen = entry["options"][opt_id]
                s_name = entry["skill_name"]
                if s_name not in skill_scores:
                    skill_scores[s_name] = []
                skill_scores[s_name].append({
                    "skill_id": entry["skill_id"],
                    "canonical_name": entry["canonical_name"],
                    "question_id": qid,
                    "level": chosen["level"],
                    "score": chosen["score"],
                    "rationale": chosen["rubric_rationale"]
                })

        # Produce evidence records
        from datetime import datetime
        today_str = datetime.now().strftime("%Y-%m-%d")

        evidence_records = []
        for s_name, records in skill_scores.items():
            avg_score = round(sum(r["score"] for r in records) / len(records), 2)
            rounded_level = round(avg_score)
            rubric_def = PROFICIENCY_LEVEL_RUBRICS.get(rounded_level, PROFICIENCY_LEVEL_RUBRICS[3])

            notes = (
                f"Evaluated via {len(records)} behavioral scenario situational questions. "
                f"Demonstrated level {avg_score}/5.0 ({rubric_def['title']}). "
                f"Rubric: {rubric_def['behavioral_indicator']}"
            )

            evidence_records.append({
                "skill_name": s_name,
                "canonical_name": records[0]["canonical_name"],
                "skill_id": records[0]["skill_id"],
                "evidence_source": "assessment",
                "score": avg_score,
                "max_score": 5.0,
                "confidence": 0.92,
                "assessment_date": today_str,
                "reviewer_source": reviewer,
                "rubric_scores": {
                    "proficiency_level": rounded_level,
                    "rubric_title": rubric_def["title"],
                    "criteria_breakdown": records
                },
                "notes": notes
            })

        return evidence_records
