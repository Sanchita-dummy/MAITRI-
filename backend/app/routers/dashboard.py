from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.schemas.schemas import DashboardSummary

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def get_summary(db: Session = Depends(get_db)):
    active_challenges = db.query(models.Challenge).filter(models.Challenge.status == "PUBLISHED").count()
    submitted_problems = db.query(models.Problem).count()
    startup_applications = db.query(models.Application).count()
    pilots_active = db.query(models.Pilot).filter(models.Pilot.status == "ACTIVE").count()
    pilots_completed = db.query(models.Pilot).filter(
        models.Pilot.status.in_(["COMPLETED", "SCALED"])
    ).count()

    kpis = db.query(models.KPI).all()
    overall_impact = round(sum(k.achievement_percentage for k in kpis) / len(kpis), 1) if kpis else 0.0

    return DashboardSummary(
        active_challenges=active_challenges,
        submitted_problems=submitted_problems,
        startup_applications=startup_applications,
        pilots_active=pilots_active,
        pilots_completed=pilots_completed,
        overall_impact_avg_achievement=overall_impact,
    )
