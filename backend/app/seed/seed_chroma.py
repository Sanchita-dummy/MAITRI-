"""
ChromaDB initialization/embedding script.
Indexes all startups (for semantic matching) and all knowledge documents
(for RAG) into the local persistent Chroma store at /data/chroma.

Run from backend/ (after seed_db.py):  python -m app.seed.seed_chroma
"""
from app.database import SessionLocal
from app.services.matching_service import index_all_startups
from app.services.rag_service import index_all_documents


def seed_chroma():
    db = SessionLocal()
    try:
        n_startups = index_all_startups(db)
        print(f"Indexed {n_startups} startups into ChromaDB collection 'startups'.")
        n_docs = index_all_documents(db)
        print(f"Indexed {n_docs} knowledge documents into ChromaDB collection 'knowledge_base'.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_chroma()
