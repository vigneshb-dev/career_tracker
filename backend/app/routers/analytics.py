from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.schemas import DashboardMetricsRead, ComprehensiveAnalyticsResponse
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/dashboard")
def get_dashboard_metrics(db: Session = Depends(get_db)):
    """Provides high-level dashboard metrics (backward-compatible)."""
    analytics = AnalyticsService.get_comprehensive_analytics(db)
    kpis = analytics["summary_kpis"]
    monthly_trend = analytics["employment_rate"]["monthly_trends"]

    return {
        "totalTrainees": kpis["total_enrolled"],
        "traineesPlaced": int(kpis["total_enrolled"] * (kpis["overall_placement_rate"] / 100)),
        "placementRate": kpis["overall_placement_rate"],
        "activeJobOpenings": 142,
        "avgMatchRate": 84.5,
        "overdueFollowUps": 4,
        "retentionRate": kpis["longitudinal_retention_90d"],
        "monthlyPlacementTrend": [
            {"month": m["month"], "placed": m["total_placed"], "target": int(m["target"] * 1.5)}
            for m in monthly_trend
        ],
        "skillsDemandSupply": [
            {"skill": "Python / FastAPI", "demand": 92, "supply": 68},
            {"skill": "React / TypeScript", "demand": 88, "supply": 84},
            {"skill": "Cloud & Docker", "demand": 82, "supply": 54},
            {"skill": "PostgreSQL / SQL", "demand": 78, "supply": 72},
            {"skill": "Data Pipelines", "demand": 75, "supply": 48},
            {"skill": "AI / Semantic Search", "demand": 85, "supply": 40},
        ],
        "statusDistribution": [
            {"status": "placed", "count": 1072, "label": "Successfully Placed"},
            {"status": "in_training", "count": 114, "label": "In Training"},
            {"status": "seeking_job", "count": 42, "label": "Actively Interviewing"},
            {"status": "graduated", "count": 12, "label": "Awaiting Matching"},
            {"status": "at_risk", "count": 8, "label": "Requires Follow-up"},
        ]
    }


@router.get("/comprehensive", response_model=ComprehensiveAnalyticsResponse)
def get_comprehensive_workforce_analytics(db: Session = Depends(get_db)):
    """
    Pandas-powered analytics engine delivering all 10 core workforce dimensions:
    1. Employment rate
    2. Retention (30/90/180/365d)
    3. Wage progression
    4. Skill improvement
    5. Skill gaps (Technical & Soft)
    6. Training-provider outcomes
    7. Course outcomes
    8. District geographic trends
    9. Occupation demand vs pipeline volume
    10. Non-placement reasons & actionable interventions
    """
    return AnalyticsService.get_comprehensive_analytics(db)


@router.get("/employment-rate")
def get_employment_rate_analytics(db: Session = Depends(get_db)):
    analytics = AnalyticsService.get_comprehensive_analytics(db)
    return analytics["employment_rate"]


@router.get("/retention")
def get_retention_analytics(db: Session = Depends(get_db)):
    analytics = AnalyticsService.get_comprehensive_analytics(db)
    return analytics["retention"]


@router.get("/wage-progression")
def get_wage_progression_analytics(db: Session = Depends(get_db)):
    analytics = AnalyticsService.get_comprehensive_analytics(db)
    return analytics["wage_progression"]


@router.get("/skill-improvement")
def get_skill_improvement_analytics(db: Session = Depends(get_db)):
    analytics = AnalyticsService.get_comprehensive_analytics(db)
    return analytics["skill_improvement"]


@router.get("/skill-gaps")
def get_skill_gaps_analytics(db: Session = Depends(get_db)):
    analytics = AnalyticsService.get_comprehensive_analytics(db)
    return analytics["skill_gaps"]


@router.get("/training-provider-outcomes")
def get_training_provider_outcomes(db: Session = Depends(get_db)):
    analytics = AnalyticsService.get_comprehensive_analytics(db)
    return analytics["training_provider_outcomes"]


@router.get("/course-outcomes")
def get_course_outcomes(db: Session = Depends(get_db)):
    analytics = AnalyticsService.get_comprehensive_analytics(db)
    return analytics["course_outcomes"]


@router.get("/district-trends")
def get_district_trends(db: Session = Depends(get_db)):
    analytics = AnalyticsService.get_comprehensive_analytics(db)
    return analytics["district_trends"]


@router.get("/occupation-demand")
def get_occupation_demand(db: Session = Depends(get_db)):
    analytics = AnalyticsService.get_comprehensive_analytics(db)
    return analytics["occupation_demand"]


@router.get("/non-placement-reasons")
def get_non_placement_reasons(db: Session = Depends(get_db)):
    analytics = AnalyticsService.get_comprehensive_analytics(db)
    return analytics["non_placement_reasons"]
