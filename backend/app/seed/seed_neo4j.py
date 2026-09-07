"""
Neo4j initialization/synchronization script.
Populates Neo4j from the existing SQLite data (no duplicate dataset).
Requires Neo4j to be running (see docker-compose.yml at the project root).

Run from backend/ (after seed_db.py):  python -m app.seed.seed_neo4j
"""
from app.database import SessionLocal
from app.services import neo4j_service


def seed_neo4j():
    if not neo4j_service.verify_connectivity():
        print(
            "Could not connect to Neo4j at the configured NEO4J_URI.\n"
            "Start it first with: docker compose up -d\n"
            "Then re-run this script."
        )
        return

    db = SessionLocal()
    try:
        counts = neo4j_service.sync_from_db(db)
        print(f"Neo4j sync complete: ~{counts['nodes']} node upserts, "
              f"~{counts['relationships']} relationship upserts.")
    finally:
        db.close()
        neo4j_service.close_driver()


if __name__ == "__main__":
    seed_neo4j()
