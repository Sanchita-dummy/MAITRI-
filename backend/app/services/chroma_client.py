"""
Shared ChromaDB persistent client. Two collections are used:
  - "startups": one embedding per startup (capabilities + technologies + description)
  - "knowledge_base": one embedding per knowledge document (for RAG)
Both are persisted locally under settings.chroma_persist_dir (/data/chroma).
"""
import chromadb
from app.config import settings
from app.services.embedding_service import get_embedding_function

_client = None
_embedding_fn = None


def get_chroma_client():
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
    return _client


def get_embedding_fn():
    global _embedding_fn
    if _embedding_fn is None:
        _embedding_fn = get_embedding_function()
    return _embedding_fn


def get_startup_collection():
    client = get_chroma_client()
    return client.get_or_create_collection(
        name="startups", embedding_function=get_embedding_fn()
    )


def get_knowledge_collection():
    client = get_chroma_client()
    return client.get_or_create_collection(
        name="knowledge_base", embedding_function=get_embedding_fn()
    )
