from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.schemas.schemas import MatchResponse, MatchResult
from app.services.matching_service import match_startups_for_challenge

router = APIRouter(prefix="/api/matching", tags=["Matching"])


@router.get("/challenge/{challenge_id}", response_model=MatchResponse)
def match_for_challenge(challenge_id: str, top_k: int = 5, db: Session = Depends(get_db)):
    challenge = db.query(models.Challenge).filter(models.Challenge.challenge_id == challenge_id).first()
    if not challenge:
        raise HTTPException(404, "Challenge not found")

    matches = match_startups_for_challenge(db, challenge, top_k=top_k)
    results = [
        MatchResult(
            startup=m["startup"],
            match_score=m["match_score"],
            matching_capabilities=m["matching_capabilities"],
            matching_technologies=m["matching_technologies"],
            relevant_experience=m["relevant_experience"],
            missing_requirements=m["missing_requirements"],
        )
        for m in matches
    ]
    return MatchResponse(challenge_id=challenge_id, results=results)
