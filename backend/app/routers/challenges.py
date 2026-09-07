import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.schemas.schemas import ChallengeOut, ChallengeGenerateRequest, ChallengeUpdate
from app.services import llm_service

router = APIRouter(prefix="/api/challenges", tags=["Challenges"])

CHALLENGE_GEN_SYSTEM_PROMPT = """You are an assistant helping Indian government departments turn a raw
problem statement into a well-scoped Innovation Challenge that startups can respond to.
Return ONLY a JSON object with these exact keys:
{
  "title": "short challenge title",
  "description": "2-4 sentence challenge description, clear and actionable",
  "required_technologies": ["tech1", "tech2", "tech3"],
  "budget_range_inr": "e.g. ₹50L - ₹1Cr",
  "timeline_months": 6
}
Keep required_technologies to 2-5 realistic technology categories (e.g. AI/ML, IoT, Satellite Imagery,
Mobile App, Blockchain, GIS Mapping, Computer Vision, Cloud Analytics, Edge Computing, NLP)."""


@router.get("", response_model=list[ChallengeOut])
def list_challenges(status: str | None = None, db: Session = Depends(get_db)):
    q = db.query(models.Challenge)
    if status:
        q = q.filter(models.Challenge.status == status)
    return q.order_by(models.Challenge.created_at.desc()).all()


@router.get("/{challenge_id}", response_model=ChallengeOut)
def get_challenge(challenge_id: str, db: Session = Depends(get_db)):
    c = db.query(models.Challenge).filter(models.Challenge.challenge_id == challenge_id).first()
    if not c:
        raise HTTPException(404, "Challenge not found")
    return c


@router.post("/generate", response_model=ChallengeOut)
def generate_challenge(payload: ChallengeGenerateRequest, db: Session = Depends(get_db)):
    problem = db.query(models.Problem).filter(
        models.Problem.problem_id == payload.problem_id
    ).first()
    if not problem:
        raise HTTPException(404, "Problem not found")

    user_prompt = (
        f"Department: {problem.department.name if problem.department else problem.department_id}\n"
        f"Problem title: {problem.title}\n"
        f"Problem description: {problem.description}\n"
        f"Sector: {problem.sector}"
    )

    try:
        result = llm_service.chat_json(CHALLENGE_GEN_SYSTEM_PROMPT, user_prompt)
    except Exception as e:
        raise HTTPException(502, f"Groq generation failed: {e}")

    challenge = models.Challenge(
        challenge_id=f"CHAL{uuid.uuid4().hex[:8].upper()}",
        problem_id=problem.problem_id,
        department_id=problem.department_id,
        title=result.get("title", f"Challenge for {problem.title}"),
        description=result.get("description", ""),
        sector=problem.sector,
        required_technologies=result.get("required_technologies", []),
        budget_range_inr=result.get("budget_range_inr", "₹50L - ₹1Cr"),
        timeline_months=int(result.get("timeline_months", 6)),
        status="DRAFT",
        ai_generated=True,
        synthetic=False,
    )
    db.add(challenge)
    problem.status = "CHALLENGE_GENERATED"
    db.commit()
    db.refresh(challenge)
    return challenge


@router.patch("/{challenge_id}", response_model=ChallengeOut)
def update_challenge(challenge_id: str, payload: ChallengeUpdate, db: Session = Depends(get_db)):
    challenge = db.query(models.Challenge).filter(models.Challenge.challenge_id == challenge_id).first()
    if not challenge:
        raise HTTPException(404, "Challenge not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(challenge, field, value)

    db.commit()
    db.refresh(challenge)
    return challenge


@router.post("/{challenge_id}/publish", response_model=ChallengeOut)
def publish_challenge(challenge_id: str, db: Session = Depends(get_db)):
    challenge = db.query(models.Challenge).filter(models.Challenge.challenge_id == challenge_id).first()
    if not challenge:
        raise HTTPException(404, "Challenge not found")
    challenge.status = "PUBLISHED"
    db.commit()
    db.refresh(challenge)
    return challenge
