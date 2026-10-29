"""
ChatTornado Rust Accelerator Bridge.
Delegates heavy vector embeddings math and security audits to the Rust engine
when available, with transparent zero-fallback native Python execution.
"""
import os
import math
import hashlib
import logging
from typing import List, Optional, Dict, Any
import httpx

logger = logging.getLogger("chattornado.rust_accelerator")

RUST_ACCELERATOR_URL = os.getenv("RUST_ACCELERATOR_URL", "http://127.0.0.1:8085")

async def compute_cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """
    Computes cosine similarity between two high-dimensional vectors.
    Attempts delegation to Rust Accelerator; falls back seamlessly to Python.
    """
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0

    # 1. Try Rust Accelerator
    try:
        async with httpx.AsyncClient(timeout=0.05) as client:
            resp = await client.post(
                f"{RUST_ACCELERATOR_URL}/api/embeddings/cosine-similarity",
                json={"vector_a": vec_a, "vector_b": vec_b}
            )
            if resp.status_code == 200:
                data = resp.json()
                return float(data.get("similarity", 0.0))
    except Exception:
        pass

    # 2. Pure Python fallback
    dot = sum(x * y for x, y in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(x * x for x in vec_a))
    norm_b = math.sqrt(sum(y * y for y in vec_b))
    if norm_a <= 0.0 or norm_b <= 0.0:
        return 0.0
    return dot / (norm_a * norm_b)


def fast_sha256(data: str) -> str:
    """Computes SHA-256 hexadecimal string."""
    return hashlib.sha256(data.encode("utf-8")).hexdigest()
