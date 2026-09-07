from fastapi import APIRouter, HTTPException
from app.schemas.schemas import RAGQueryRequest, RAGQueryResponse
from app.services.rag_service import answer_query

router = APIRouter(prefix="/api/rag", tags=["RAG / Knowledge Base"])


@router.post("/query", response_model=RAGQueryResponse)
def query(payload: RAGQueryRequest):
    try:
        result = answer_query(payload.query, top_k=payload.top_k)
    except Exception as e:
        raise HTTPException(502, f"RAG query failed: {e}")
    return RAGQueryResponse(**result)
