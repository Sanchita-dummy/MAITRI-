import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.schemas.schemas import PilotOut, PilotCreate, PilotStatusUpdate, KPIOut, ScaleRecommendationOut
from app.services import llm_service
from app.services.scoring_service import average_achievement, deterministic_scale_decision

router = APIRouter(prefix="/api/pilots", tags=["Pilots & KPIs"])

SCALE_SYSTEM_PROMPT = """You are advising a government department on whether to scale a startup pilot.
You will be given the pilot's KPI results and a pre-computed decision (SCALE, ITERATE, or STOP).
Write a concise 2-3 sentence explanation justifying that decision, referencing the KPI performance.
Do not change the decision - only explain it. Return plain text, not JSON."""


@router.get("", response_model=list[PilotOut])
def list_pilots(status: str | None = None, db: Session = Depends(get_db)):
    q = db.query(models.Pilot)
    if status:
        q = q.filter(models.Pilot.status == status)
    return q.order_by(models.Pilot.start_date.desc()).all()


@router.get("/{pilot_id}", response_model=PilotOut)
def get_pilot(pilot_id: str, db: Session = Depends(get_db)):
    p = db.query(models.Pilot).filter(models.Pilot.pilot_id == pilot_id).first()
    if not p:
        raise HTTPException(404, "Pilot not found")
    return p


@router.post("", response_model=PilotOut)
def create_pilot(payload: PilotCreate, db: Session = Depends(get_db)):
    application = db.query(models.Application).filter(
        models.Application.application_id == payload.application_id
    ).first()
    if not application:
        raise HTTPException(404, "Application not found")
    if application.status != "APPROVED":
        raise HTTPException(400, "Only APPROVED applications can become pilots")

    challenge = application.challenge
    pilot = models.Pilot(
        pilot_id=f"PIL{uuid.uuid4().hex[:8].upper()}",
        application_id=application.application_id,
        startup_id=application.startup_id,
        challenge_id=application.challenge_id,
        department_id=challenge.department_id,
        location=payload.location,
        duration_months=payload.duration_months,
        milestones=[
            {"title": "Deployment & onboarding", "done": False},
            {"title": "Mid-pilot review", "done": False},
            {"title": "Final KPI assessment", "done": False},
        ],
        status="PLANNED",
        synthetic=False,
    )
    db.add(pilot)
    db.commit()
    db.refresh(pilot)
    return pilot


@router.patch("/{pilot_id}/status", response_model=PilotOut)
def update_pilot_status(pilot_id: str, payload: PilotStatusUpdate, db: Session = Depends(get_db)):
    pilot = db.query(models.Pilot).filter(models.Pilot.pilot_id == pilot_id).first()
    if not pilot:
        raise HTTPException(404, "Pilot not found")
    valid = {"PLANNED", "ACTIVE", "COMPLETED", "FAILED", "SCALED"}
    if payload.status not in valid:
        raise HTTPException(400, f"Invalid status. Must be one of {valid}")
    pilot.status = payload.status
    db.commit()
    db.refresh(pilot)
    return pilot


@router.get("/{pilot_id}/kpis", response_model=list[KPIOut])
def get_pilot_kpis(pilot_id: str, db: Session = Depends(get_db)):
    return db.query(models.KPI).filter(models.KPI.pilot_id == pilot_id).all()


@router.get("/{pilot_id}/scale-recommendation", response_model=ScaleRecommendationOut)
def get_scale_recommendation(pilot_id: str, db: Session = Depends(get_db)):
    pilot = db.query(models.Pilot).filter(models.Pilot.pilot_id == pilot_id).first()
    if not pilot:
        raise HTTPException(404, "Pilot not found")

    kpis = db.query(models.KPI).filter(models.KPI.pilot_id == pilot_id).all()
    if not kpis:
        raise HTTPException(400, "No KPIs recorded for this pilot yet")

    # Deterministic decision computed in Python (rule 8 / 16)
    avg = average_achievement(kpis)
    decision = deterministic_scale_decision(avg)

    kpi_summary = "\n".join(
        f"- {k.metric}: baseline={k.baseline}{k.unit}, target={k.target}{k.unit}, "
        f"actual={k.actual}{k.unit}, achievement={k.achievement_percentage}%"
        for k in kpis
    )
    user_prompt = (
        f"Pilot location: {pilot.location}\nDecision: {decision}\n"
        f"Average KPI achievement: {avg}%\n\nKPI details:\n{kpi_summary}"
    )

    try:
        reasoning = llm_service.chat(SCALE_SYSTEM_PROMPT, user_prompt, temperature=0.3, max_tokens=250)
    except Exception:
        reasoning = (
            f"Based on an average KPI achievement of {avg}%, the deterministic recommendation is {decision}."
        )

    pilot.scale_recommendation = decision
    pilot.scale_reasoning = reasoning
    db.commit()

    return ScaleRecommendationOut(
        pilot_id=pilot_id, recommendation=decision, reasoning=reasoning, average_achievement=avg
    )
