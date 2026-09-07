from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.schemas import GraphQueryResponse
from app.services import neo4j_service

router = APIRouter(prefix="/api/graph", tags=["Graph (Neo4j)"])


@router.get("/status")
def graph_status():
    return {"connected": neo4j_service.verify_connectivity()}


@router.post("/sync")
def sync_graph(db: Session = Depends(get_db)):
    counts = neo4j_service.sync_from_db(db)
    return {"status": "ok", **counts}


@router.get("/department/{department_id}/startups-and-pilots", response_model=GraphQueryResponse)
def department_startups_and_pilots(department_id: str):
    """
    The spec's example useful graph query:
    "Show startups connected to challenges in a particular department/sector
    and their previous pilot/KPI relationships."
    """
    results = neo4j_service.startups_by_department_with_pilots(department_id)
    return GraphQueryResponse(
        query_description=(
            "Startups connected to challenges in this department, with their pilot/KPI relationships"
        ),
        results=results,
    )


@router.get("/related/{label}/{id_field}/{id_value}", response_model=GraphQueryResponse)
def related_entities(label: str, id_field: str, id_value: str, hops: int = 1):
    results = neo4j_service.query_related(label, id_field, id_value, hops=hops)
    return GraphQueryResponse(
        query_description=f"Entities related to {label}({id_field}={id_value}) within {hops} hop(s)",
        results=results,
    )
