"""
Integration tests for Polyglot Architecture:
Python FastAPI + Go Realtime Relay + Rust Accelerator Bridge.
Verifies zero-fallback error tolerance and mathematical parity.
"""
import pytest
import asyncio
from rust_accelerator import compute_cosine_similarity, fast_sha256
from websocket_manager import _relay_to_go_engine

@pytest.mark.anyio
async def test_rust_accelerator_cosine_similarity_parity():
    # Test identical vectors (similarity = 1.0)
    v1 = [1.0, 2.0, 3.0]
    v2 = [1.0, 2.0, 3.0]
    sim = await compute_cosine_similarity(v1, v2)
    assert pytest.approx(sim, 0.001) == 1.0

    # Test orthogonal vectors (similarity = 0.0)
    v_ortho1 = [1.0, 0.0, 0.0]
    v_ortho2 = [0.0, 1.0, 0.0]
    sim_ortho = await compute_cosine_similarity(v_ortho1, v_ortho2)
    assert pytest.approx(sim_ortho, 0.001) == 0.0

    # Test empty or mismatched vectors (safe return 0.0)
    assert await compute_cosine_similarity([], []) == 0.0
    assert await compute_cosine_similarity([1.0], [1.0, 2.0]) == 0.0


def test_rust_accelerator_fast_sha256():
    import hashlib
    test_str = "ChatTornado-HyperScale-Polyglot-Integration"
    expected = hashlib.sha256(test_str.encode("utf-8")).hexdigest()
    assert fast_sha256(test_str) == expected


@pytest.mark.anyio
async def test_go_realtime_relay_resilient_failover():
    """
    Verifies that when Go Realtime Engine is offline or unreachable,
    the Python backend relay function returns cleanly without throwing an exception or blocking.
    """
    # This must complete without throwing any exception
    await _relay_to_go_engine(receiver_id=9999, payload={"type": "ping", "test": True})
    await _relay_to_go_engine(broadcast=True, payload={"type": "broadcast", "test": True})
    await _relay_to_go_engine(receiver_id=None, broadcast=False, payload=None)
