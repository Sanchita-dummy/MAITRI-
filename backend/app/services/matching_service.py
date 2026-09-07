"""
Startup <-> Challenge semantic matching.

Flow (per spec):
  Challenge -> create embedding -> search startup embeddings -> retrieve
  candidates -> calculate match score -> show top startups.

The match score is NOT purely random: it blends (a) semantic similarity
from ChromaDB with (b) a deterministic capability/technology overlap score
computed in Python, so results are explainable and reproducible.
"""
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models import Startup, Challenge
from app.services.chroma_client import get_startup_collection


def _startup_document_text(startup: Startup) -> str:
    return (
        f"{startup.company_name}. Sectors: {', '.join(startup.sectors or [])}. "
        f"Technologies: {', '.join(startup.technologies or [])}. "
        f"Capabilities: {', '.join(startup.capabilities or [])}. "
        f"Products: {', '.join(startup.products or [])}. "
        f"Description: {startup.description or ''}"
    )


def index_startup(startup: Startup) -> None:
    """Upsert a single startup's embedding into ChromaDB."""
    coll = get_startup_collection()
    coll.upsert(
        ids=[startup.startup_id],
        documents=[_startup_document_text(startup)],
        metadatas=[{
            "startup_id": startup.startup_id,
            "company_name": startup.company_name,
            "sectors": ", ".join(startup.sectors or []),
        }],
    )


def index_all_startups(db: Session) -> int:
    startups = db.query(Startup).all()
    if not startups:
        return 0
    coll = get_startup_collection()
    coll.upsert(
        ids=[s.startup_id for s in startups],
        documents=[_startup_document_text(s) for s in startups],
        metadatas=[{
            "startup_id": s.startup_id,
            "company_name": s.company_name,
            "sectors": ", ".join(s.sectors or []),
        } for s in startups],
    )
    return len(startups)


def _challenge_query_text(challenge: Challenge) -> str:
    return (
        f"{challenge.title}. Sector: {challenge.sector or ''}. "
        f"Required technologies: {', '.join(challenge.required_technologies or [])}. "
        f"Description: {challenge.description or ''}"
    )


def _overlap_score(challenge: Challenge, startup: Startup) -> float:
    """Deterministic 0-100 score from capability/technology/sector overlap."""
    req_techs = set(t.lower() for t in (challenge.required_technologies or []))
    stu_techs = set(t.lower() for t in (startup.technologies or []))
    tech_overlap = len(req_techs & stu_techs) / len(req_techs) if req_techs else 0.0

    sector_match = 1.0 if (challenge.sector or "").lower() in [
        s.lower() for s in (startup.sectors or [])
    ] else 0.0

    # capability keyword overlap against challenge title+description tokens
    text = f"{challenge.title} {challenge.description or ''}".lower()
    cap_hits = sum(1 for c in (startup.capabilities or []) if c.lower() in text)
    cap_score = min(cap_hits / 2.0, 1.0)  # cap contribution

    score = (0.45 * tech_overlap + 0.35 * sector_match + 0.20 * cap_score) * 100
    return round(score, 1)


def match_startups_for_challenge(db: Session, challenge: Challenge, top_k: int = 5) -> List[Dict[str, Any]]:
    coll = get_startup_collection()
    if coll.count() == 0:
        index_all_startups(db)

    query_text = _challenge_query_text(challenge)
    n_results = min(max(top_k * 3, top_k), max(coll.count(), 1))
    results = coll.query(query_texts=[query_text], n_results=n_results)

    candidate_ids = results["ids"][0] if results["ids"] else []
    distances = results["distances"][0] if results.get("distances") else [1.0] * len(candidate_ids)

    startups_by_id = {s.startup_id: s for s in db.query(Startup).filter(Startup.startup_id.in_(candidate_ids)).all()}

    scored = []
    for sid, dist in zip(candidate_ids, distances):
        startup = startups_by_id.get(sid)
        if not startup:
            continue
        # convert distance (lower=closer) to a 0-100 similarity score
        semantic_score = max(0.0, (1.0 - min(dist, 1.0))) * 100
        overlap_score = _overlap_score(challenge, startup)
        final_score = round(0.5 * semantic_score + 0.5 * overlap_score, 1)

        req_techs = set(t.lower() for t in (challenge.required_technologies or []))
        stu_techs_map = {t.lower(): t for t in (startup.technologies or [])}
        matching_technologies = [stu_techs_map[t] for t in req_techs if t in stu_techs_map]

        text = f"{challenge.title} {challenge.description or ''}".lower()
        matching_capabilities = [c for c in (startup.capabilities or []) if c.lower() in text]

        missing = [t for t in (challenge.required_technologies or []) if t.lower() not in stu_techs_map]

        relevant_experience = (
            f"{startup.previous_pilots} prior government pilot(s)"
            if startup.previous_pilots else "No prior government pilots on record"
        )

        scored.append({
            "startup": startup,
            "match_score": final_score,
            "matching_capabilities": matching_capabilities or ["General sector alignment"],
            "matching_technologies": matching_technologies,
            "relevant_experience": relevant_experience,
            "missing_requirements": missing,
        })

    scored.sort(key=lambda x: x["match_score"], reverse=True)
    return scored[:top_k]
