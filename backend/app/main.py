from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import Base, SessionLocal, engine
from app import models
from app.routers import (
    dashboard, problems, challenges, startups,
    matching, eligibility, evaluations, pilots, rag, graph,
)

# Ensure tables exist even if seed script hasn't been run yet.
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="MAITRI - Government Innovation & Startup Enablement Platform",
    description=(
        "Prototype API for the MAITRI workflow: Government Department -> Problem -> "
        "AI Challenge Generation -> Startup Discovery -> Semantic Matching -> Eligibility -> "
        "AI Evaluation -> Pilot -> KPI/Impact -> Scale Recommendation."
    ),
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard.router)
app.include_router(problems.router)
app.include_router(challenges.router)
app.include_router(startups.router)
app.include_router(matching.router)
app.include_router(eligibility.router)
app.include_router(evaluations.router)
app.include_router(pilots.router)
app.include_router(rag.router)
app.include_router(graph.router)


@app.get("/")
def root():
    return {
        "name": "MAITRI API",
        "docs": "/docs",
        "status": "ok",
    }


@app.get("/api/health")
def health():
    return {"status": "healthy"}


@app.get("/api/health/data")
def data_health():
    """Return live row counts from the database used by this API process."""
    entities = {
        "departments": models.Department,
        "problems": models.Problem,
        "policies": models.Policy,
        "challenges": models.Challenge,
        "startups": models.Startup,
        "eligibility_rules": models.EligibilityRule,
        "applications": models.Application,
        "evaluations": models.Evaluation,
        "pilots": models.Pilot,
        "kpis": models.KPI,
        "knowledge_documents": models.KnowledgeDocument,
    }
    with SessionLocal() as db:
        return {name: db.query(model).count() for name, model in entities.items()}
