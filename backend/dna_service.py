"""
Conversation DNA Analysis Engine
Provides explainable, privacy-safe, structural and heuristic analysis of conversation dynamics.
Zero psychological profiling; strictly structural patterns, topics, density, and lifecycle state.
"""

from datetime import datetime, timezone, timedelta
import re
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from models import Message, MessageVisibility, ConversationDNA, ConversationBranch


STOP_WORDS = {
    "the", "be", "to", "of", "and", "a", "in", "that", "have", "i", "it", "for", "not", "on", "with",
    "he", "as", "you", "do", "at", "this", "but", "his", "by", "from", "they", "we", "say", "her",
    "she", "or", "an", "will", "my", "one", "all", "would", "there", "their", "what", "so", "up",
    "out", "if", "about", "who", "get", "which", "go", "me", "when", "make", "can", "like", "time",
    "no", "just", "him", "know", "take", "people", "into", "year", "your", "good", "some", "could",
    "them", "see", "other", "than", "then", "now", "look", "only", "come", "its", "over", "think",
    "also", "back", "after", "use", "two", "how", "our", "work", "first", "well", "way", "even",
    "new", "want", "because", "any", "these", "give", "day", "most", "us", "is", "are", "was", "were",
    "am", "been", "has", "had", "did", "does", "doing", "okay", "yeah", "yes", "hey", "hello", "hi"
}

QUESTION_TRIGGERS = [
    "?", "who ", "what ", "when ", "where ", "why ", "how ", "can we", "can you",
    "could we", "could you", "should we", "is it", "is there", "are we", "does it",
    "does anyone", "what if", "which one", "do you think", "how about"
]

DECISION_TRIGGERS = [
    "let's ", "lets ", "agreed", "approved", "confirmed", "decided", "i will do",
    "we will do", "we should go with", "sounds good", "looks good", "ship it",
    "done with", "final plan", "let's do", "lets do", "locked in", "verdict",
    "agreed on", "consensus", "resolving to", "will implement"
]


def get_conversation_key(dm_user1: Optional[int], dm_user2: Optional[int], group_id: Optional[int], branch_id: Optional[int] = None) -> str:
    """Generate consistent unique conversation key."""
    if branch_id:
        return f"branch:{branch_id}"
    if group_id:
        return f"group:{group_id}"
    if dm_user1 and dm_user2:
        u1, u2 = sorted([int(dm_user1), int(dm_user2)])
        return f"dm:{u1}:{u2}"
    return "unknown"


def is_question_message(text: str) -> bool:
    if not text:
        return False
    t = text.strip().lower()
    if "?" in t:
        return True
    return any(t.startswith(q) or f" {q}" in t for q in QUESTION_TRIGGERS if q != "?")


def is_decision_message(text: str) -> bool:
    if not text:
        return False
    t = text.strip().lower()
    return any(d in t for d in DECISION_TRIGGERS)


class ConversationDNAAnalyzer:
    """Modular, extensible DNA analyzer engine."""

    def __init__(self, messages: List[Message]):
        self.messages = [m for m in messages if m.message and not m.message.startswith("⚡ P2P_MEDIA")]

    def analyze_topics(self) -> Tuple[List[Dict[str, Any]], Dict[str, List[int]]]:
        """Extract dominant topics & keyword references with mapping to message IDs."""
        word_freq: Dict[str, int] = {}
        topic_msg_map: Dict[str, List[int]] = {}

        for msg in self.messages:
            text = msg.message or ""
            # Strip code blocks and urls
            clean = re.sub(r"```[\s\S]*?```", "", text)
            clean = re.sub(r"https?://\S+", "", clean)
            words = re.findall(r"\b[a-zA-Z]{3,20}\b", clean.lower())

            seen_in_msg = set()
            for w in words:
                if w not in STOP_WORDS and len(w) > 2:
                    word_freq[w] = word_freq.get(w, 0) + 1
                    if w not in seen_in_msg:
                        if w not in topic_msg_map:
                            topic_msg_map[w] = []
                        topic_msg_map[w].append(msg.id)
                        seen_in_msg.add(w)

        # Sort top topics
        sorted_topics = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        top_topics = []
        total_word_hits = sum(count for _, count in sorted_topics[:10]) or 1

        for word, count in sorted_topics[:8]:
            top_topics.append({
                "topic": word.capitalize(),
                "count": count,
                "percentage": round((count / total_word_hits) * 100),
                "message_ids": topic_msg_map.get(word, [])[:20]
            })

        return top_topics, topic_msg_map

    def analyze_densities(self) -> Dict[str, Any]:
        """Calculate Question vs Decision vs Discussion density."""
        total = len(self.messages)
        if total == 0:
            return {
                "topics_pct": 25,
                "questions_pct": 25,
                "discussion_pct": 25,
                "decisions_pct": 25,
                "question_count": 0,
                "decision_count": 0,
                "discussion_count": 0,
                "question_msg_ids": [],
                "decision_msg_ids": [],
                "discussion_msg_ids": []
            }

        q_ids = []
        d_ids = []
        disc_ids = []

        for m in self.messages:
            txt = m.message or ""
            is_q = is_question_message(txt)
            is_d = is_decision_message(txt)

            if is_d:
                d_ids.append(m.id)
            elif is_q:
                q_ids.append(m.id)
            else:
                disc_ids.append(m.id)

        q_cnt = len(q_ids)
        d_cnt = len(d_ids)
        disc_cnt = len(disc_ids)

        # Baseline ratios
        q_pct = round((q_cnt / total) * 100)
        d_pct = round((d_cnt / total) * 100)
        disc_pct = round((disc_cnt / total) * 100)

        # Topics represent the thematic richness factor
        topics_pct = max(10, min(50, 100 - (q_pct + d_pct + (disc_pct // 2))))
        # Normalize to sum to 100%
        rem = 100 - topics_pct
        sub_total = (q_cnt + d_cnt + disc_cnt) or 1
        q_norm = round((q_cnt / sub_total) * rem)
        d_norm = round((d_cnt / sub_total) * rem)
        disc_norm = rem - (q_norm + d_norm)

        return {
            "topics_pct": topics_pct,
            "questions_pct": q_norm,
            "discussion_pct": disc_norm,
            "decisions_pct": d_norm,
            "question_count": q_cnt,
            "decision_count": d_cnt,
            "discussion_count": disc_cnt,
            "question_msg_ids": q_ids,
            "decision_msg_ids": d_ids,
            "discussion_msg_ids": disc_ids
        }

    def analyze_activity_and_state(self, densities: Dict[str, Any]) -> Tuple[str, str]:
        """Compute Activity Intensity and Lifecycle State."""
        if not self.messages:
            return "LOW", "STANDBY"

        now = datetime.now(timezone.utc)
        recent_count = 0
        for m in reversed(self.messages):
            created_at = m.created_at
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
            if now - created_at < timedelta(hours=2):
                recent_count += 1
            else:
                break

        if recent_count >= 15:
            activity = "SURGE"
        elif recent_count >= 6:
            activity = "HIGH"
        elif recent_count >= 2:
            activity = "MEDIUM"
        else:
            activity = "LOW"

        # State determination
        q_pct = densities.get("questions_pct", 0)
        d_pct = densities.get("decisions_pct", 0)
        total = len(self.messages)

        if d_pct >= 25 or (densities.get("decision_count", 0) >= 3 and d_pct >= 15):
            state = "DECISION PHASE"
        elif q_pct >= 35:
            state = "Q&A SESSION"
        elif total >= 10 and densities.get("topics_pct", 0) >= 30 and activity in ("HIGH", "SURGE"):
            state = "BRAINSTORMING"
        elif activity in ("HIGH", "SURGE", "MEDIUM"):
            state = "ACTIVE DISCUSSION"
        else:
            state = "STANDBY"

        return activity, state

    def extract_unresolved_and_decisions(self) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Extract open questions & emerged consensus."""
        unresolved = []
        decisions = []

        for i, m in enumerate(self.messages):
            txt = m.message or ""
            if is_decision_message(txt):
                decisions.append({
                    "message_id": m.id,
                    "text": txt[:140] + ("..." if len(txt) > 140 else ""),
                    "author_id": m.sender_id,
                    "created_at": m.created_at.isoformat() if m.created_at else None
                })
            elif is_question_message(txt):
                # Check if resolved by examining subsequent messages
                resolved = False
                for next_m in self.messages[i+1:i+4]:
                    if next_m.sender_id != m.sender_id:
                        resolved = True
                        break
                if not resolved:
                    unresolved.append({
                        "message_id": m.id,
                        "text": txt[:140] + ("..." if len(txt) > 140 else ""),
                        "author_id": m.sender_id,
                        "created_at": m.created_at.isoformat() if m.created_at else None
                    })

        return unresolved[:6], decisions[:6]

    def build_timeline(self) -> List[Dict[str, Any]]:
        """Construct evolution timeline of message volume over segments."""
        if not self.messages:
            return []

        # Divide messages into up to 5 timeline segments
        chunk_size = max(1, len(self.messages) // 5)
        timeline = []
        for idx in range(0, len(self.messages), chunk_size):
            chunk = self.messages[idx:idx+chunk_size]
            if not chunk:
                continue
            q_cnt = sum(1 for m in chunk if is_question_message(m.message or ""))
            d_cnt = sum(1 for m in chunk if is_decision_message(m.message or ""))
            disc_cnt = len(chunk) - (q_cnt + d_cnt)
            timeline.append({
                "segment": f"Phase {len(timeline) + 1}",
                "total": len(chunk),
                "questions": q_cnt,
                "decisions": d_cnt,
                "discussion": max(0, disc_cnt),
                "start_time": chunk[0].created_at.isoformat() if chunk[0].created_at else None,
                "end_time": chunk[-1].created_at.isoformat() if chunk[-1].created_at else None,
            })
        return timeline

    def execute(self) -> Dict[str, Any]:
        """Runs full modular DNA analysis."""
        topics, topic_msg_map = self.analyze_topics()
        densities = self.analyze_densities()
        activity, state = self.analyze_activity_and_state(densities)
        unresolved, decisions = self.extract_unresolved_and_decisions()
        timeline = self.build_timeline()

        return {
            "metrics": {
                "topics_pct": densities["topics_pct"],
                "questions_pct": densities["questions_pct"],
                "discussion_pct": densities["discussion_pct"],
                "decisions_pct": densities["decisions_pct"],
                "activity_level": activity,
                "conversation_state": state,
                "total_messages": len(self.messages),
                "dominant_topics": topics,
                "unresolved_questions": unresolved,
                "decisions_emerged": decisions,
                "timeline": timeline,
                "category_message_ids": {
                    "questions": densities["question_msg_ids"],
                    "decisions": densities["decision_msg_ids"],
                    "discussion": densities["discussion_msg_ids"],
                    "topics": topic_msg_map
                },
                "explainability": {
                    "formula": "Deterministic structural token & pattern heuristics; 0% inferred psychological profiling.",
                    "user_control": "Users can view matched messages per category or trigger fresh re-computation.",
                    "last_analyzed": datetime.now(timezone.utc).isoformat()
                }
            },
            "message_count": len(self.messages),
            "last_message_id": self.messages[-1].id if self.messages else None
        }


def get_or_compute_dna(
    db: Session,
    user_id: int,
    dm_user2_id: Optional[int] = None,
    group_id: Optional[int] = None,
    branch_id: Optional[int] = None,
    force_refresh: bool = False
) -> Dict[str, Any]:
    """Retrieve cached Conversation DNA or compute freshly."""
    conv_key = get_conversation_key(user_id, dm_user2_id, group_id, branch_id)

    cached = db.query(ConversationDNA).filter(ConversationDNA.conversation_key == conv_key).first()

    # If branch_id is specified, fetch branch ancestry + divergent messages
    if branch_id:
        branch = db.query(ConversationBranch).filter(ConversationBranch.id == branch_id).first()
        if not branch:
            raise ValueError("Branch not found")
        # Ancestry up to fork + branch messages
        ancestor_msgs = (
            db.query(Message)
            .filter(
                Message.id <= branch.fork_message_id,
                or_(
                    Message.branch_id == branch.parent_branch_id,
                    Message.branch_id == None
                )
            )
            .order_by(Message.created_at)
            .all()
        )
        branch_msgs = (
            db.query(Message)
            .filter(Message.branch_id == branch.id)
            .order_by(Message.created_at)
            .all()
        )
        messages = ancestor_msgs + branch_msgs
    elif group_id:
        messages = (
            db.query(Message)
            .filter(Message.group_id == group_id, Message.branch_id == None)
            .order_by(Message.created_at)
            .all()
        )
    else:
        # DM
        u1, u2 = sorted([int(user_id), int(dm_user2_id)])
        messages = (
            db.query(Message)
            .filter(
                Message.branch_id == None,
                or_(
                    and_(Message.sender_id == u1, Message.receiver_id == u2),
                    and_(Message.sender_id == u2, Message.receiver_id == u1)
                )
            )
            .order_by(Message.created_at)
            .all()
        )

    last_msg_id = messages[-1].id if messages else None
    msg_count = len(messages)

    if not force_refresh and cached and cached.last_message_id == last_msg_id and cached.metrics:
        return cached.metrics

    # Compute freshly
    analyzer = ConversationDNAAnalyzer(messages)
    analysis_result = analyzer.execute()

    if not cached:
        cached = ConversationDNA(
            conversation_key=conv_key,
            group_id=group_id,
            dm_user1_id=min(user_id, dm_user2_id) if dm_user2_id else None,
            dm_user2_id=max(user_id, dm_user2_id) if dm_user2_id else None,
            branch_id=branch_id,
            metrics=analysis_result["metrics"],
            message_count_analyzed=msg_count,
            last_message_id=last_msg_id,
            updated_at=datetime.now(timezone.utc)
        )
        db.add(cached)
    else:
        cached.metrics = analysis_result["metrics"]
        cached.message_count_analyzed = msg_count
        cached.last_message_id = last_msg_id
        cached.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(cached)
    return cached.metrics
