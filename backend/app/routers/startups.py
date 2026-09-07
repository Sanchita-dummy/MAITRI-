from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.schemas.schemas import StartupOut

router = APIRouter(prefix="/api/startups", tags=["Startups"])


@router.get("", response_model=list[StartupOut])
def list_startups(sector: str | None = None, db: Session = Depends(get_db)):
    q = db.query(models.Startup)
    startups = q.all()
    if sector:
        startups = [s for s in startups if sector.lower() in [x.lower() for x in (s.sectors or [])]]
    return startups


@router.get("/{startup_id}", response_model=StartupOut)
def get_startup(startup_id: str, db: Session = Depends(get_db)):
    s = db.query(models.Startup).filter(models.Startup.startup_id == startup_id).first()
    if not s:
        raise HTTPException(404, "Startup not found")
    return s
