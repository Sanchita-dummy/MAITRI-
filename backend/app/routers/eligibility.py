from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.schemas.schemas import EligibilityCheckRequest, EligibilityResult
from app.services.eligibility_service import check_eligibility

router = APIRouter(prefix="/api/eligibility", tags=["Eligibility"])


@router.post("/check", response_model=EligibilityResult)
def check(payload: EligibilityCheckRequest, db: Session = Depends(get_db)):
    challenge = db.query(models.Challenge).filter(
        models.Challenge.challenge_id == payload.challenge_id
    ).first()
    startup = db.query(models.Startup).filter(
        models.Startup.startup_id == payload.startup_id
    ).first()
    if not challenge or not startup:
        raise HTTPException(404, "Challenge or Startup not found")

    rules = db.query(models.EligibilityRule).filter(
        models.EligibilityRule.challenge_id == payload.challenge_id
    ).all()

    result = check_eligibility(challenge, startup, rules)
    return EligibilityResult(**result)
