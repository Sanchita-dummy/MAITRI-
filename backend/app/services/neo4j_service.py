"""
Neo4j integration layer. Kept as a small, self-contained wrapper (rule:
"Create a small Neo4j integration layer rather than tightly coupling the
entire application to Neo4j") so the rest of the app never imports the
neo4j driver directly.

If Neo4j is unreachable, all functions fail soft (log + return empty)
so the rest of the app keeps working - the graph is a value-add layer,
not the source of truth (SQLite is, per rule 12).
"""
import logging
from typing import List, Dict, Any, Optional
from neo4j import GraphDatabase
from app.config import settings

logger = logging.getLogger("maitri.neo4j")

_driver = None


def get_driver():
    global _driver
    if _driver is None:
        _driver = GraphDatabase.driver(
            settings.neo4j_uri, auth=(settings.neo4j_user, settings.neo4j_password)
        )
    return _driver


def close_driver():
    global _driver
    if _driver is not None:
        _driver.close()
        _driver = None


def _run(query: str, params: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    try:
        driver = get_driver()
        with driver.session() as session:
            result = session.run(query, params or {})
            return [record.data() for record in result]
    except Exception as e:  # noqa: BLE001 - graph layer must fail soft
        logger.warning(f"Neo4j query failed (is Neo4j running? see docker-compose.yml): {e}")
        return []


def verify_connectivity() -> bool:
    try:
        get_driver().verify_connectivity()
        return True
    except Exception as e:  # noqa: BLE001
        logger.warning(f"Neo4j not reachable: {e}")
        return False


# ---------------------------------------------------------------------------
# Node / relationship primitives
# ---------------------------------------------------------------------------
def upsert_node(label: str, id_field: str, properties: Dict[str, Any]) -> None:
    query = f"""
    MERGE (n:{label} {{{id_field}: $id_value}})
    SET n += $properties
    """
    _run(query, {"id_value": properties[id_field], "properties": properties})


def create_relationship(from_label: str, from_id_field: str, from_id: str,
                         rel_type: str,
                         to_label: str, to_id_field: str, to_id: str) -> None:
    query = f"""
    MATCH (a:{from_label} {{{from_id_field}: $from_id}})
    MATCH (b:{to_label} {{{to_id_field}: $to_id}})
    MERGE (a)-[:{rel_type}]->(b)
    """
    _run(query, {"from_id": from_id, "to_id": to_id})


def query_related(label: str, id_field: str, id_value: str, hops: int = 1) -> List[Dict[str, Any]]:
    query = f"""
    MATCH (n:{label} {{{id_field}: $id_value}})-[r*1..{hops}]-(related)
    RETURN DISTINCT labels(related) AS labels, related AS node
    LIMIT 50
    """
    return _run(query, {"id_value": id_value})


# ---------------------------------------------------------------------------
# Full sync from SQLite (source of truth) -> Neo4j
# ---------------------------------------------------------------------------
def sync_from_db(db) -> Dict[str, int]:
    """
    Populate Neo4j nodes/relationships from the application's existing
    SQLite data. No duplicate dataset is created for Neo4j (rule).
    """
    from app.models import (
        Department, Problem, Challenge, Startup, Policy,
        Application, Evaluation, Pilot, KPI,
    )

    counts = {"nodes": 0, "relationships": 0}

    for d in db.query(Department).all():
        upsert_node("Department", "department_id", {
            "department_id": d.department_id, "name": d.name, "sector": d.sector or "",
        })
        counts["nodes"] += 1

    for p in db.query(Problem).all():
        upsert_node("Problem", "problem_id", {
            "problem_id": p.problem_id, "title": p.title, "sector": p.sector or "",
        })
        create_relationship("Department", "department_id", p.department_id,
                             "OWNS", "Problem", "problem_id", p.problem_id)
        counts["nodes"] += 1
        counts["relationships"] += 1

    for c in db.query(Challenge).all():
        upsert_node("Challenge", "challenge_id", {
            "challenge_id": c.challenge_id, "title": c.title, "sector": c.sector or "",
            "status": c.status,
        })
        if c.problem_id:
            create_relationship("Problem", "problem_id", c.problem_id,
                                 "BECOMES", "Challenge", "challenge_id", c.challenge_id)
            counts["relationships"] += 1
        counts["nodes"] += 1

    for s in db.query(Startup).all():
        upsert_node("Startup", "startup_id", {
            "startup_id": s.startup_id, "company_name": s.company_name,
            "sectors": ", ".join(s.sectors or []), "trl_level": s.trl_level or 0,
        })
        counts["nodes"] += 1

    for pol in db.query(Policy).all():
        upsert_node("Policy", "policy_id", {
            "policy_id": pol.policy_id, "title": pol.title, "category": pol.category or "",
        })
        counts["nodes"] += 1
        # link policies to challenges sharing a sector
        for c in db.query(Challenge).filter(Challenge.sector.in_(pol.applies_to_sectors or [])).all():
            create_relationship("Challenge", "challenge_id", c.challenge_id,
                                 "RELATED_TO", "Policy", "policy_id", pol.policy_id)
            counts["relationships"] += 1

    for app in db.query(Application).all():
        upsert_node("Application", "application_id", {
            "application_id": app.application_id, "status": app.status,
            "match_score": app.match_score or 0.0,
        })
        create_relationship("Startup", "startup_id", app.startup_id,
                             "SUBMITTED", "Application", "application_id", app.application_id)
        create_relationship("Challenge", "challenge_id", app.challenge_id,
                             "MATCHED_WITH", "Startup", "startup_id", app.startup_id)
        counts["nodes"] += 1
        counts["relationships"] += 2

    for ev in db.query(Evaluation).all():
        upsert_node("Evaluation", "evaluation_id", {
            "evaluation_id": ev.evaluation_id, "total_score": ev.total_score or 0.0,
            "recommendation": ev.recommendation or "",
        })
        create_relationship("Application", "application_id", ev.application_id,
                             "RECEIVED", "Evaluation", "evaluation_id", ev.evaluation_id)
        counts["nodes"] += 1
        counts["relationships"] += 1

    for pilot in db.query(Pilot).all():
        upsert_node("Pilot", "pilot_id", {
            "pilot_id": pilot.pilot_id, "status": pilot.status, "location": pilot.location or "",
        })
        create_relationship("Application", "application_id", pilot.application_id,
                             "BECAME", "Pilot", "pilot_id", pilot.pilot_id)
        counts["nodes"] += 1
        counts["relationships"] += 1

    for kpi in db.query(KPI).all():
        upsert_node("KPI", "kpi_id", {
            "kpi_id": kpi.kpi_id, "metric": kpi.metric,
            "achievement_percentage": kpi.achievement_percentage or 0.0,
        })
        create_relationship("Pilot", "pilot_id", kpi.pilot_id,
                             "MEASURED_BY", "KPI", "kpi_id", kpi.kpi_id)
        counts["nodes"] += 1
        counts["relationships"] += 1

    return counts


# ---------------------------------------------------------------------------
# Example "useful graph query" from the spec:
# "Show startups connected to challenges in a particular department/sector
#  and their previous pilot/KPI relationships."
# ---------------------------------------------------------------------------
def startups_by_department_with_pilots(department_id: str) -> List[Dict[str, Any]]:
    query = """
    MATCH (d:Department {department_id: $department_id})-[:OWNS]->(:Problem)-[:BECOMES]->(c:Challenge)
    MATCH (c)-[:MATCHED_WITH]->(s:Startup)
    OPTIONAL MATCH (s)-[:SUBMITTED]->(a:Application)-[:BECAME]->(p:Pilot)
    OPTIONAL MATCH (p)-[:MEASURED_BY]->(k:KPI)
    RETURN d.name AS department, c.title AS challenge, s.company_name AS startup,
           p.pilot_id AS pilot_id, p.status AS pilot_status,
           collect(DISTINCT {metric: k.metric, achievement: k.achievement_percentage}) AS kpis
    LIMIT 50
    """
    return _run(query, {"department_id": department_id})
