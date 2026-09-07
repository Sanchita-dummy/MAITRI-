"""
Simple RAG pipeline:
  query -> retrieve relevant chunks from ChromaDB -> send context to Groq
  -> generate answer -> return answer + source document titles.
"""
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models import KnowledgeDocument
from app.services.chroma_client import get_knowledge_collection
from app.services import llm_service

RAG_SYSTEM_PROMPT = """You are MAITRI's policy assistant for a government innovation platform.
Answer ONLY using the provided context documents. If the context does not contain
the answer, say so clearly rather than guessing. Keep answers concise (3-6 sentences).
Always remind the reader that referenced documents are synthetic/illustrative and not
official government policy, when relevant."""


def index_all_documents(db: Session) -> int:
    docs = db.query(KnowledgeDocument).all()
    if not docs:
        return 0
    coll = get_knowledge_collection()
    coll.upsert(
        ids=[d.doc_id for d in docs],
        documents=[d.content for d in docs],
        metadatas=[{"title": d.title, "category": d.category or ""} for d in docs],
    )
    return len(docs)


def retrieve(query: str, top_k: int = 4) -> List[Dict[str, Any]]:
    coll = get_knowledge_collection()
    if coll.count() == 0:
        return []
    results = coll.query(query_texts=[query], n_results=min(top_k, coll.count()))
    docs = results["documents"][0] if results["documents"] else []
    metas = results["metadatas"][0] if results["metadatas"] else []
    return [{"content": d, "title": m.get("title", "Untitled")} for d, m in zip(docs, metas)]


def answer_query(query: str, top_k: int = 4) -> Dict[str, Any]:
    chunks = retrieve(query, top_k=top_k)
    if not chunks:
        return {
            "query": query,
            "answer": "No knowledge base documents are indexed yet. Run the ChromaDB seed script first.",
            "sources": [],
        }

    context = "\n\n".join(f"[{c['title']}]\n{c['content']}" for c in chunks)
    user_prompt = f"Context documents:\n{context}\n\nQuestion: {query}"

    answer = llm_service.chat(RAG_SYSTEM_PROMPT, user_prompt, temperature=0.3, max_tokens=500)
    sources = list(dict.fromkeys(c["title"] for c in chunks))  # dedupe, preserve order

    return {"query": query, "answer": answer, "sources": sources}
