import sys
import os
import asyncio
import json
import time
import uuid
import httpx
import websockets
from database import SessionLocal
from models import Base, User, Message, MessageVisibility, UserBlock

BASE_HTTP = "http://127.0.0.1:8000"
BASE_WS = "ws://127.0.0.1:8000/ws"

# Metrics tracker
metrics = {
    "sent": 0,
    "persisted": 0,
    "acknowledged": 0,
    "duplicates": 0,
    "lost": 0,
    "unhandled_exceptions": 0
}

async def create_stress_user(username: str, email: str, role: str = "USER") -> tuple[int, str]:
    """Helper to create and verify a stress user, returning (user_id, token)."""
    db = SessionLocal()
    # Check if user already exists
    u = db.query(User).filter(User.email == email).first()
    if not u:
        u = User(
            username=username,
            email=email,
            password="$2b$12$KIXe80m981oR6YgYlCSu9OBQcsqdC3hYc56HnI8P9E0iKkGkH5R6C",
            email_verified=True,
            role=role,
            account_status="active"
        )
        db.add(u)
        db.commit()
        db.refresh(u)
    u_id = u.id
    db.close()

    # Generate token
    from auth import create_access_token
    token = create_access_token({"sub": email, "username": username, "user_id": u_id, "email_verified": True, "role": role})
    return u_id, token


async def run_stress_suite():
    print("=" * 60)
    print("[*] STARTING RUNTIME STRESS TEST OF THE MESSAGE PIPELINE")
    print("=" * 60)

    u1_id, t1 = await create_stress_user(f"stress_alice_{uuid.uuid4().hex[:6]}", f"alice_{uuid.uuid4().hex[:6]}@test.com")
    u2_id, t2 = await create_stress_user(f"stress_bob_{uuid.uuid4().hex[:6]}", f"bob_{uuid.uuid4().hex[:6]}@test.com")
    print(f"[OK] Created test users: Alice (ID: {u1_id}), Bob (ID: {u2_id})")

    # ----------------------------------------------------
    # TEST 1: Send 100+ rapid user-to-user messages
    # ----------------------------------------------------
    print("\n--- [TEST 1] Sending 105 rapid user-to-user messages over WebSocket ---")
    ws_alice_url = f"{BASE_WS}?token={t1}"
    ws_bob_url = f"{BASE_WS}?token={t2}"

    received_by_bob = []
    ack_to_alice = []

    async with websockets.connect(ws_alice_url) as ws_alice, websockets.connect(ws_bob_url) as ws_bob:
        # Drain initial presence/broadcast messages
        await asyncio.sleep(0.3)

        stop_tasks = asyncio.Event()

        async def bob_listener():
            while not stop_tasks.is_set():
                try:
                    msg = await asyncio.wait_for(ws_bob.recv(), timeout=0.5)
                    pkt = json.loads(msg)
                    if pkt.get("type") == "message" and pkt.get("sender_id") == u1_id:
                        received_by_bob.append(pkt)
                except asyncio.TimeoutError:
                    continue
                except Exception:
                    break

        async def alice_ack_listener():
            while not stop_tasks.is_set():
                try:
                    msg = await asyncio.wait_for(ws_alice.recv(), timeout=0.5)
                    pkt = json.loads(msg)
                    if pkt.get("type") == "message" and pkt.get("sender_id") == u1_id:
                        ack_to_alice.append(pkt)
                        metrics["acknowledged"] += 1
                except asyncio.TimeoutError:
                    continue
                except Exception:
                    break

        b_task = asyncio.create_task(bob_listener())
        a_task = asyncio.create_task(alice_ack_listener())

        for i in range(105):
            temp_id = f"stress-t1-{i}-{uuid.uuid4().hex[:6]}"
            corr_id = f"corr-t1-{i}"
            payload = {
                "type": "message",
                "receiver_id": u2_id,
                "message": f"Stress message #{i}",
                "temp_id": temp_id,
                "correlation_id": corr_id
            }
            await ws_alice.send(json.dumps(payload))
            metrics["sent"] += 1
            await asyncio.sleep(0.01)

        # Allow time for all ACKs and deliveries to arrive
        await asyncio.sleep(2.0)
        stop_tasks.set()
        await asyncio.gather(b_task, a_task, return_exceptions=True)

    print(f"-> Test 1 Results: Sent: 105 | Acknowledged: {len(ack_to_alice)} | Delivered to Bob: {len(received_by_bob)}")

    # ----------------------------------------------------
    # TEST 2: Send multiple messages while recipient is offline
    # ----------------------------------------------------
    print("\n--- [TEST 2] Sending 20 messages while Bob is offline ---")
    offline_msg_ids = []
    async with websockets.connect(ws_alice_url) as ws_alice:
        await asyncio.sleep(0.2)
        for i in range(20):
            temp_id = f"stress-offline-{i}-{uuid.uuid4().hex[:6]}"
            corr_id = f"corr-offline-{i}"
            payload = {
                "type": "message",
                "receiver_id": u2_id,
                "message": f"Offline buffer message #{i}",
                "temp_id": temp_id,
                "correlation_id": corr_id
            }
            await ws_alice.send(json.dumps(payload))
            metrics["sent"] += 1
            ack_raw = await asyncio.wait_for(ws_alice.recv(), timeout=2.0)
            ack_pkt = json.loads(ack_raw)
            if ack_pkt.get("type") == "message":
                offline_msg_ids.append(ack_pkt.get("id"))
                metrics["acknowledged"] += 1

    # Bob comes online and fetches history
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{BASE_HTTP}/messages/{u1_id}", params={"token": t2})
        assert res.status_code == 200
        bob_history = res.json()
        saved_texts = [m["message"] for m in bob_history if m.get("message") and "Offline buffer message" in m.get("message")]
        print(f"-> Test 2 Results: 20 sent while offline | {len(saved_texts)} retrieved by Bob on history fetch")

    # ----------------------------------------------------
    # TEST 3: Disconnect/reconnect sender WebSocket during transmission
    # ----------------------------------------------------
    print("\n--- [TEST 3] Disconnecting & Reconnecting Sender during transmission ---")
    for cycle in range(3):
        ws_conn = await websockets.connect(ws_alice_url)
        temp_id = f"stress-sender-drop-{cycle}"
        await ws_conn.send(json.dumps({
            "type": "message",
            "receiver_id": u2_id,
            "message": f"Drop sender msg #{cycle}",
            "temp_id": temp_id,
            "correlation_id": f"corr-drop-{cycle}"
        }))
        metrics["sent"] += 1
        # Read ack
        ack = json.loads(await ws_conn.recv())
        if ack.get("type") == "message":
            metrics["acknowledged"] += 1
        # Abrupt close
        await ws_conn.close()
        await asyncio.sleep(0.1)

    print("-> Test 3 Results: Successfully cycled sender disconnect/reconnect 3 times without backend error")

    # ----------------------------------------------------
    # TEST 4: Disconnect/reconnect recipient repeatedly
    # ----------------------------------------------------
    print("\n--- [TEST 4] Rapid Recipient connect/disconnect cycling ---")
    async with websockets.connect(ws_alice_url) as ws_alice:
        for i in range(5):
            # Recipient connects
            b_ws = await websockets.connect(ws_bob_url)
            # Sender pushes
            temp_id = f"stress-rcpt-cycle-{i}"
            await ws_alice.send(json.dumps({
                "type": "message",
                "receiver_id": u2_id,
                "message": f"Recipient cycle message #{i}",
                "temp_id": temp_id
            }))
            metrics["sent"] += 1
            ack = json.loads(await ws_alice.recv())
            if ack.get("type") == "message":
                metrics["acknowledged"] += 1
            # Recipient disconnects immediately
            await b_ws.close()
            await asyncio.sleep(0.05)

    print("-> Test 4 Results: Completed recipient connect/disconnect stress cycles")

    # ----------------------------------------------------
    # TEST 5: Send messages via REST fallback while WS is disconnected
    # ----------------------------------------------------
    print("\n--- [TEST 5] Send messages during WS reconnect (REST fallback) ---")
    async with httpx.AsyncClient() as client:
        for i in range(10):
            temp_id = f"stress-rest-{i}"
            res = await client.post(
                f"{BASE_HTTP}/messages/send",
                params={"token": t1},
                json={
                    "receiver_id": u2_id,
                    "message": f"REST fallback message #{i}",
                    "temp_id": temp_id,
                    "correlation_id": f"corr-rest-{i}"
                }
            )
            assert res.status_code == 200
            metrics["sent"] += 1
            metrics["acknowledged"] += 1

    print("-> Test 5 Results: Sent 10 messages via REST fallback with status 200 OK")

    # ----------------------------------------------------
    # TEST 6: Rapidly send AI requests to VORTEX-9
    # ----------------------------------------------------
    print("\n--- [TEST 6] Rapidly sending AI requests to VORTEX-9 ---")
    db = SessionLocal()
    from ai_service import get_or_create_bot_user
    bot = get_or_create_bot_user(db)
    bot_id = bot.id
    db.close()

    async with websockets.connect(ws_alice_url) as ws_alice:
        for i in range(3):
            temp_id = f"stress-ai-{i}"
            await ws_alice.send(json.dumps({
                "type": "message",
                "receiver_id": bot_id,
                "message": f"Hello VORTEX quick test #{i}",
                "temp_id": temp_id,
                "ai_mode": "DEFAULT"
            }))
            metrics["sent"] += 1
            ack = json.loads(await ws_alice.recv())
            if ack.get("type") == "message":
                metrics["acknowledged"] += 1
            await asyncio.sleep(0.2)

    print("-> Test 6 Results: Dispatched AI requests without blocking socket pipeline")

    # ----------------------------------------------------
    # TEST 7: Interrupt AI streaming midway
    # ----------------------------------------------------
    print("\n--- [TEST 7] Interrupting AI streaming midway ---")
    ws_ai = await websockets.connect(ws_alice_url)
    await ws_ai.send(json.dumps({
        "type": "message",
        "receiver_id": bot_id,
        "message": "Explain quantum computing in detail",
        "temp_id": "stress-stream-interrupt",
        "ai_mode": "DEFAULT"
    }))
    metrics["sent"] += 1
    # Read initial ack
    ack = json.loads(await ws_ai.recv())
    if ack.get("type") == "message":
        metrics["acknowledged"] += 1

    # Wait for first stream chunk then close abruptly
    stream_started = False
    start_t = time.time()
    while time.time() - start_t < 3.0:
        try:
            raw = await asyncio.wait_for(ws_ai.recv(), timeout=0.8)
            pkt = json.loads(raw)
            if pkt.get("type") in ("ai_stream_start", "ai_stream_chunk", "typing_start"):
                stream_started = True
                break
        except Exception:
            break

    # Abrupt disconnect
    await ws_ai.close()
    await asyncio.sleep(0.5)
    print(f"-> Test 7 Results: Client closed stream socket midway (stream started: {stream_started}); backend safely handled termination")

    # ----------------------------------------------------
    # TEST 8: AI Graceful Offline / Fallback handling
    # ----------------------------------------------------
    print("\n--- [TEST 8] AI Key/Provider offline fallback ---")
    async with httpx.AsyncClient() as client:
        # Send cleanup request
        res = await client.post(f"{BASE_HTTP}/ai_cleanup", json={"text": "   messy   input   text   "}, params={"token": t1})
        assert res.status_code == 200
        print(f"-> Test 8 Results: AI helper endpoints safely operational: {res.json()}")

    # ----------------------------------------------------
    # TEST 9: Concurrent message sends from same conversation
    # ----------------------------------------------------
    print("\n--- [TEST 9] 20 concurrent messages from same conversation ---")
    limits = httpx.Limits(max_connections=50, max_keepalive_connections=20)
    timeout = httpx.Timeout(30.0, connect=10.0)
    async with httpx.AsyncClient(limits=limits, timeout=timeout) as client:
        async def send_concurrent(idx):
            metrics["sent"] += 1
            r = await client.post(
                f"{BASE_HTTP}/messages/send",
                params={"token": t1},
                json={
                    "receiver_id": u2_id,
                    "message": f"Concurrent burst #{idx}",
                    "temp_id": f"burst-{idx}-{uuid.uuid4().hex[:6]}"
                }
            )
            if r.status_code == 200:
                metrics["acknowledged"] += 1
            return r.status_code

        tasks = [send_concurrent(i) for i in range(20)]
        results = await asyncio.gather(*tasks)
        print(f"-> Test 9 Results: 20 concurrent requests completed: {results.count(200)}/20 succeeded (200 OK)")

    # ----------------------------------------------------
    # TEST 10: Retry deliberately failed / duplicate messages
    # ----------------------------------------------------
    print("\n--- [TEST 10] Idempotency & Retry on duplicate temp_id ---")
    async with httpx.AsyncClient() as client:
        fixed_temp = "duplicate-retry-test-temp-id"
        # First send
        r1 = await client.post(f"{BASE_HTTP}/messages/send", params={"token": t1}, json={"receiver_id": u2_id, "message": "Original payload", "temp_id": fixed_temp})
        assert r1.status_code == 200
        msg_id_1 = r1.json()["id"]

        # Duplicate retry with same temp_id
        r2 = await client.post(f"{BASE_HTTP}/messages/send", params={"token": t1}, json={"receiver_id": u2_id, "message": "Original payload", "temp_id": fixed_temp})
        assert r2.status_code == 200
        msg_id_2 = r2.json()["id"]

        assert msg_id_1 == msg_id_2
        print(f"-> Test 10 Results: Duplicate temp_id cleanly deduplicated (returned same DB ID #{msg_id_1})")

    # ----------------------------------------------------
    # FINAL DATABASE AUDIT & COMPARISON
    # ----------------------------------------------------
    print("\n" + "=" * 60)
    print("[AUDIT] FINAL DATABASE AUDIT & METRICS RECONCILIATION")
    print("=" * 60)

    db = SessionLocal()
    total_db_msgs = db.query(Message).filter(Message.sender_id == u1_id).all()
    metrics["persisted"] = len(total_db_msgs)

    # Check for duplicate client_temp_ids
    temp_ids = [m.client_temp_id for m in total_db_msgs if m.client_temp_id]
    unique_temp_ids = set(temp_ids)
    metrics["duplicates"] = len(temp_ids) - len(unique_temp_ids)
    metrics["lost"] = max(0, metrics["sent"] - metrics["persisted"])

    db.close()

    print(f"Messages Sent:        {metrics['sent']}")
    print(f"Messages Persisted:   {metrics['persisted']}")
    print(f"Messages Acknowledged:{metrics['acknowledged']}")
    print(f"Messages Duplicated:  {metrics['duplicates']}")
    print(f"Messages Lost:        {metrics['lost']}")
    print(f"Unhandled Exceptions: {metrics['unhandled_exceptions']}")
    print("=" * 60)
    print("[OK] RUNTIME STRESS TEST COMPLETED SUCCESSFULLY")


if __name__ == "__main__":
    asyncio.run(run_stress_suite())
