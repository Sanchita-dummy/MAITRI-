"""
Local embedding function for ChromaDB.

Why not sentence-transformers / the ChromaDB default embedder?
Both download a model (e.g. all-MiniLM-L6-v2) from Hugging Face on first
use. That's fine on a normal laptop with internet access, and this module
is written so you can swap it in with zero other code changes (see
`USE_SENTENCE_TRANSFORMERS` below). But for hackathon environments where
outbound access to huggingface.co may be blocked, we ship a fully local,
deterministic, dependency-light embedding: a hashed TF-IDF-style bag of
words, L2-normalized. It is good enough for keyword/semantic-ish retrieval
over a small synthetic corpus and needs no network access at all.

To upgrade later (recommended for production):
    pip install sentence-transformers
    set USE_SENTENCE_TRANSFORMERS = True below
"""
import re
import math
import hashlib
from typing import List

USE_SENTENCE_TRANSFORMERS = False  # flip to True if you have internet + the package installed
EMBEDDING_DIM = 384  # matches MiniLM dimensionality so swapping later needs no schema change

_WORD_RE = re.compile(r"[a-z0-9]+")


def _tokenize(text: str) -> List[str]:
    return _WORD_RE.findall(text.lower())


def _hash_index(token: str, dim: int) -> int:
    h = hashlib.md5(token.encode("utf-8")).hexdigest()
    return int(h, 16) % dim


class LocalHashedEmbeddingFunction:
    """
    A ChromaDB-compatible embedding function (implements __call__).
    Produces a fixed-length dense vector per document using the hashing
    trick with log-scaled term frequency, then L2-normalizes.
    """

    def __init__(self, dim: int = EMBEDDING_DIM):
        self.dim = dim

    def _embed_one(self, text: str) -> List[float]:
        vec = [0.0] * self.dim
        tokens = _tokenize(text)
        if not tokens:
            return vec
        for tok in tokens:
            idx = _hash_index(tok, self.dim)
            vec[idx] += 1.0
        # log-scale term frequency to dampen very common tokens
        vec = [math.log1p(v) for v in vec]
        norm = math.sqrt(sum(v * v for v in vec)) or 1.0
        return [v / norm for v in vec]

    def __call__(self, input: List[str]) -> List[List[float]]:  # noqa: A002 - Chroma's expected signature
        return [self._embed_one(t) for t in input]

    # Chroma >=0.4 also looks for a `name` for embedding function registry purposes
    def name(self) -> str:
        return "maitri_local_hashed_embedding"


def get_embedding_function():
    if USE_SENTENCE_TRANSFORMERS:
        from chromadb.utils import embedding_functions
        return embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="all-MiniLM-L6-v2"
        )
    return LocalHashedEmbeddingFunction()
