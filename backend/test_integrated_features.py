"""
Comprehensive Automated Test Suite for:
1. Conversation DNA (🧬)
2. Reality Forks (🔀)
3. Future Messages (🕰️)
4. Unified Synergy (🧬 + 🔀 + 🕰️)
"""

import pytest
import os
from datetime import datetime, timezone, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base
from models import User, Message, MessageVisibility, ConversationBranch, ConversationDNA, FutureMessage, Group, GroupMember
from dna_service import get_or_compute_dna, ConversationDNAAnalyzer
from branch_service import create_reality_fork, get_branch_messages, list_conversation_branches
from scheduler_service import create_future_message, deliver_future_message, process_scheduler_tick
from auth import hash_password, create_access_token


@pytest.fixture(scope="module")
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    db = TestingSessionLocal()

    # Seed test users
    u1 = User(username="alice", email="alice@test.com", password=hash_password("pw123"), email_verified=True, role="USER")
    u2 = User(username="bob", email="bob@test.com", password=hash_password("pw123"), email_verified=True, role="USER")
    u3 = User(username="charlie", email="charlie@test.com", password=hash_password("pw123"), email_verified=True, role="USER")
    db.add_all([u1, u2, u3])
    db.commit()
    db.refresh(u1)
    db.refresh(u2)
    db.refresh(u3)

    # Seed a group
    grp = Group(name="Project Alpha", created_by=u1.id, created_at=datetime.now(timezone.utc))
    db.add(grp)
    db.commit()
    db.refresh(grp)
    m1 = GroupMember(group_id=grp.id, user_id=u1.id, role="OWNER")
    m2 = GroupMember(group_id=grp.id, user_id=u2.id, role="MEMBER")
    db.add_all([m1, m2])
    db.commit()

    yield {
        "db": db,
        "u1": u1,
        "u2": u2,
        "u3": u3,
        "group": grp
    }
    db.close()


# ============================================================================
# 🧬 1. CONVERSATION DNA TESTS
# ============================================================================

def test_conversation_dna_empty_chat(test_db):
    db = test_db["db"]
    u1 = test_db["u1"]
    u2 = test_db["u2"]

    dna = get_or_compute_dna(db, u1.id, dm_user2_id=u2.id, force_refresh=True)
    assert dna is not None
    assert dna["activity_level"] == "LOW"
    assert dna["conversation_state"] == "STANDBY"
    assert dna["total_messages"] == 0
    assert dna["dominant_topics"] == []
    assert dna["unresolved_questions"] == []
    assert dna["decisions_emerged"] == []


def test_conversation_dna_structure_and_categories(test_db):
    db = test_db["db"]
    u1 = test_db["u1"]
    u2 = test_db["u2"]

    # Seed structured conversation messages
    msgs_data = [
        (u1.id, "Hey Bob, what is our timeline for the new API architecture?"),
        (u2.id, "We should deploy the API architecture next Tuesday. Can you review the schema?"),
        (u1.id, "Yes, the schema looks good! Agreed on Tuesday release."),
        (u2.id, "Let's do it! Locked in the deployment.")
    ]

    for sender, text in msgs_data:
        m = Message(
            sender_id=sender,
            receiver_id=u2.id if sender == u1.id else u1.id,
            message=text,
            created_at=datetime.now(timezone.utc) - timedelta(minutes=10)
        )
        db.add(m)
        db.commit()
        db.refresh(m)
        db.add_all([
            MessageVisibility(message_id=m.id, user_id=u1.id, visible=True),
            MessageVisibility(message_id=m.id, user_id=u2.id, visible=True)
        ])
        db.commit()

    dna = get_or_compute_dna(db, u1.id, dm_user2_id=u2.id, force_refresh=True)
    assert dna["total_messages"] >= 4
    assert len(dna["dominant_topics"]) > 0
    assert any("api" in t["topic"].lower() or "architecture" in t["topic"].lower() for t in dna["dominant_topics"])
    assert len(dna["decisions_emerged"]) >= 1
    assert dna["decisions_pct"] > 0
    assert dna["questions_pct"] > 0
    assert dna["category_message_ids"]["questions"]
    assert dna["category_message_ids"]["decisions"]
    assert dna["conversation_state"] in ("DECISION PHASE", "ACTIVE DISCUSSION")


def test_conversation_dna_privacy_guarantee(test_db):
    db = test_db["db"]
    u1 = test_db["u1"]
    u2 = test_db["u2"]
    dna = get_or_compute_dna(db, u1.id, dm_user2_id=u2.id)
    # Ensure zero psychological or sentiment profiling in output
    assert "psychological_profile" not in dna
    assert "personality" not in dna
    assert "sentiment_score" not in dna
    assert "explainability" in dna
    assert "Deterministic structural" in dna["explainability"]["formula"]


# ============================================================================
# 🔀 2. REALITY FORKS TESTS
# ============================================================================

def test_reality_fork_creation_and_ancestry(test_db):
    db = test_db["db"]
    u1 = test_db["u1"]
    u2 = test_db["u2"]

    # Pick the 2nd message as fork point
    first_msg = db.query(Message).filter(Message.sender_id == u1.id).first()
    assert first_msg is not None

    branch = create_reality_fork(
        db=db,
        user_id=u1.id,
        fork_message_id=first_msg.id,
        name="Reality A: Alternative Architecture",
        description="Exploring GraphQL instead of REST"
    )

    assert branch.id is not None
    assert branch.name == "Reality A: Alternative Architecture"
    assert branch.fork_message_id == first_msg.id
    assert branch.parent_branch_id is None

    # Fetch branch messages -> must contain ancestor messages up to first_msg.id
    branch_msgs = get_branch_messages(db, u1.id, branch.id)
    assert len(branch_msgs) >= 1
    assert branch_msgs[0]["id"] <= first_msg.id
    assert branch_msgs[0]["is_branch_ancestor"] is True

    # Send an independent divergent message on this branch
    divergent_msg = Message(
        sender_id=u1.id,
        receiver_id=u2.id,
        branch_id=branch.id,
        message="In this reality, let's build GraphQL instead of REST.",
        created_at=datetime.now(timezone.utc)
    )
    db.add(divergent_msg)
    db.commit()

    updated_branch_msgs = get_branch_messages(db, u1.id, branch.id)
    assert any(m["id"] == divergent_msg.id for m in updated_branch_msgs)
    divergent_item = next(m for m in updated_branch_msgs if m["id"] == divergent_msg.id)
    assert divergent_item["is_branch_ancestor"] is False


def test_reality_fork_permission_isolation(test_db):
    db = test_db["db"]
    u3 = test_db["u3"]  # Charlie is not in Alice & Bob's DM
    branch = db.query(ConversationBranch).first()
    assert branch is not None

    with pytest.raises(PermissionError):
        get_branch_messages(db, u3.id, branch.id)


def test_reality_fork_listing(test_db):
    db = test_db["db"]
    u1 = test_db["u1"]
    u2 = test_db["u2"]

    branches = list_conversation_branches(db, u1.id, dm_user2_id=u2.id)
    assert len(branches) >= 1
    assert branches[0]["name"] == "Reality A: Alternative Architecture"
    assert branches[0]["divergent_message_count"] >= 1


# ============================================================================
# 🕰️ 3. FUTURE MESSAGES TESTS
# ============================================================================

def test_future_message_time_scheduling_and_delivery(test_db):
    db = test_db["db"]
    u1 = test_db["u1"]
    u2 = test_db["u2"]

    # Schedule message 1 second in the future
    future_time = datetime.now(timezone.utc) + timedelta(seconds=1)
    fm = create_future_message(
        db=db,
        sender_id=u1.id,
        receiver_id=u2.id,
        message="Happy New Year 2027 from the past!",
        trigger_type="time",
        scheduled_at=future_time
    )

    assert fm.id is not None
    assert fm.status == "scheduled"

    # Simulate delivery
    import asyncio
    real_msg = asyncio.run(deliver_future_message(fm.id, db=db))
    assert real_msg is not None
    assert real_msg.is_future_message is True
    assert real_msg.message == "Happy New Year 2027 from the past!"

    db.refresh(fm)
    assert fm.status == "delivered"
    assert fm.delivered_message_id == real_msg.id


def test_future_message_condition_trigger(test_db):
    db = test_db["db"]
    u1 = test_db["u1"]
    u2 = test_db["u2"]

    # Condition: Trigger when DNA reaches "DECISION PHASE"
    fm = create_future_message(
        db=db,
        sender_id=u1.id,
        receiver_id=u2.id,
        message="Consensus reached! Auto-deploying staging environment.",
        trigger_type="condition",
        condition_config={"type": "dna_state", "state": "DECISION PHASE"}
    )

    assert fm.status == "waiting"

    # Process tick -> should evaluate condition and deliver
    import asyncio
    asyncio.run(process_scheduler_tick(db=db))

    db.refresh(fm)
    assert fm.status == "delivered"
    assert fm.delivered_message_id is not None


def test_future_message_duplicate_prevention(test_db):
    db = test_db["db"]
    u1 = test_db["u1"]
    u2 = test_db["u2"]

    fm = create_future_message(
        db=db,
        sender_id=u1.id,
        receiver_id=u2.id,
        message="Unique single delivery message",
        trigger_type="time",
        scheduled_at=datetime.now(timezone.utc) + timedelta(seconds=1)
    )

    import asyncio
    # First delivery
    res1 = asyncio.run(deliver_future_message(fm.id, db=db))
    assert res1 is not None
    # Second delivery attempt on already delivered message
    res2 = asyncio.run(deliver_future_message(fm.id, db=db))
    assert res2 is None  # Must NOT duplicate


# ============================================================================
# 🧠 4. UNIFIED TRI-SYSTEM SYNERGY TEST
# ============================================================================

def test_unified_tri_system_flow(test_db):
    """
    Synergy Workflow:
    1. Create a Reality Fork 'Sprint B'.
    2. Post messages in 'Sprint B' to evolve its Conversation DNA.
    3. Generate DNA specific to 'Sprint B'.
    4. Attach a Future Message trigger targeting 'Sprint B'.
    5. Trigger fires and message delivers directly into 'Sprint B'.
    """
    db = test_db["db"]
    u1 = test_db["u1"]
    u2 = test_db["u2"]

    # 1. Create Fork
    latest_msg = db.query(Message).order_by(Message.id.desc()).first()
    branch_b = create_reality_fork(
        db=db,
        user_id=u1.id,
        fork_message_id=latest_msg.id,
        name="Sprint B Reality",
        description="Exploring experimental microservices"
    )

    # 2. Post messages on Sprint B
    m_branch = Message(
        sender_id=u2.id,
        receiver_id=u1.id,
        branch_id=branch_b.id,
        message="Let's approve the microservice split for Sprint B.",
        created_at=datetime.now(timezone.utc)
    )
    db.add(m_branch)
    db.commit()

    # 3. Analyze Branch DNA
    dna_b = get_or_compute_dna(db, u1.id, dm_user2_id=u2.id, branch_id=branch_b.id, force_refresh=True)
    assert dna_b["total_messages"] > 0
    assert dna_b["decisions_pct"] > 0

    # 4. Create Future Message in Sprint B
    fm_b = create_future_message(
        db=db,
        sender_id=u1.id,
        receiver_id=u2.id,
        branch_id=branch_b.id,
        message="Sprint B microservice deployment initialized automatically.",
        trigger_type="time",
        scheduled_at=datetime.now(timezone.utc) + timedelta(seconds=1)
    )

    # 5. Deliver into Sprint B
    import asyncio
    delivered_b = asyncio.run(deliver_future_message(fm_b.id, db=db))
    assert delivered_b is not None
    assert delivered_b.branch_id == branch_b.id

    # Verify message is visible inside branch messages
    msgs_in_branch = get_branch_messages(db, u1.id, branch_b.id)
    assert any(m["id"] == delivered_b.id for m in msgs_in_branch)
