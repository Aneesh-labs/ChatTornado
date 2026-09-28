from fastapi import WebSocket
from starlette.websockets import WebSocketDisconnect
import asyncio
from database import SessionLocal
from models import Message

class ConnectionManager:

    def __init__(self):
        self.active_connections: dict[int, WebSocket] = {}
        self.online_users: set[int] = set()
        self.broadcasted_capsules: set[int] = set()
        self.user_statuses: dict[int, dict] = {}

    async def connect(
        self,
        user_id: int,
        websocket: WebSocket
    ) -> None:
        await websocket.accept()

        try:
            uid = int(user_id)
        except (ValueError, TypeError):
            uid = user_id

        self.active_connections[uid] = websocket
        self.online_users.add(uid)
        
        # Start broadcaster if not already running (simplified for 1 worker)
        if not hasattr(self, "_broadcaster_task"):
            self._broadcaster_task = asyncio.create_task(self.capsule_unlock_broadcaster())

    async def capsule_unlock_broadcaster(self):
        while True:
            await asyncio.sleep(5)
            if not self.online_users:
                continue
            
            db = None
            try:
                db = SessionLocal()
                from datetime import datetime, timezone
                now = datetime.now(timezone.utc)
                
                # Fetch pending timelocked messages
                messages = db.query(Message).filter(
                    Message.is_shielded == True,
                    Message.shield_mode == "timelock",
                    Message.unlock_at != None
                ).all()
                
                for msg in messages:
                    if msg.id in self.broadcasted_capsules:
                        continue
                        
                    unlock_time = msg.unlock_at
                    if unlock_time.tzinfo is None:
                        unlock_time = unlock_time.replace(tzinfo=timezone.utc)
                        
                    if unlock_time <= now:
                        self.broadcasted_capsules.add(msg.id)
                        packet = {
                            "type": "capsule_unlocked",
                            "message_id": msg.id,
                            "message": msg.message
                        }
                        await self.send_personal_message(msg.receiver_id, packet)
                        await self.send_personal_message(msg.sender_id, packet)
            except Exception as e:
                print("Broadcaster error:", e)
            finally:
                if db:
                    db.close()

    def set_user_status(self, user_id: int, status: str, custom_status: str = None):
        self.user_statuses[int(user_id)] = {
            "status": status,
            "custom_status": custom_status
        }

    def disconnect(
        self,
        user_id: int
    ) -> None:
        try:
            uid = int(user_id)
        except (ValueError, TypeError):
            uid = user_id
        self.active_connections.pop(uid, None)
        self.active_connections.pop(str(uid), None)
        self.online_users.discard(uid)
        self.online_users.discard(str(uid))
        self.user_statuses.pop(uid, None)

        # Update offline in DB so user doesn't remain falsely marked online
        db = None
        try:
            from datetime import datetime
            from models import User
            db = SessionLocal()
            u = db.query(User).filter(User.id == uid).first()
            if u:
                u.status = "offline"
                u.last_seen = datetime.utcnow()
                db.commit()
        except Exception:
            pass
        finally:
            if db:
                db.close()


    async def get_online_users(self) -> list[int]:
        return list(self.online_users)

    async def send_personal_message(
        self,
        receiver_id: int,
        message: dict
    ) -> bool:
        try:
            rid = int(receiver_id)
        except (ValueError, TypeError):
            rid = receiver_id

        websocket = self.active_connections.get(rid)
        if websocket is None and isinstance(rid, int):
            websocket = self.active_connections.get(str(rid))

        if websocket is None:
            return False

        try:
            await websocket.send_json(message)
            return True

        except (WebSocketDisconnect, RuntimeError):
            self.disconnect(rid)
            return False

        except Exception as e:
            self.disconnect(rid)
            return False

    async def broadcast_online_users(self) -> None:
        online_users = await self.get_online_users()
        dead_connections = []

        db = None
        blocked_pairs = set()
        admin_ids = set()
        try:
            from models import UserBlock, User
            db = SessionLocal()
            blocks = db.query(UserBlock).all()
            for b in blocks:
                blocked_pairs.add((b.blocker_id, b.blocked_id))
                blocked_pairs.add((b.blocked_id, b.blocker_id))
            admins = db.query(User.id).filter(
                (User.role == "SUPER_ADMIN") | (User.username == "BlackShadow-ChatTornado")
            ).all()
            admin_ids = {a[0] for a in admins}
        except Exception:
            pass
        finally:
            if db:
                db.close()

        for user_id, websocket in list(self.active_connections.items()):
            try:
                uid = int(user_id)
            except (ValueError, TypeError):
                continue

            is_recipient_admin = uid in admin_ids

            # Filter out blocked users and invisible admins for this recipient
            recipient_online_list = []
            for other_id in online_users:
                if other_id == uid:
                    recipient_online_list.append(other_id)
                    continue
                # Hide admin from normal users
                if other_id in admin_ids and not is_recipient_admin:
                    continue
                # Hide if blocked
                if (uid, other_id) in blocked_pairs:
                    continue
                recipient_online_list.append(other_id)

            try:
                await websocket.send_json(
                    {
                        "type": "online_users",
                        "users": recipient_online_list,
                        "statuses": self.user_statuses
                    }
                )
            except (WebSocketDisconnect, RuntimeError):
                dead_connections.append(user_id)
            except Exception:
                dead_connections.append(user_id)

        for user_id in dead_connections:
            self.disconnect(user_id)

    async def broadcast_user_status(self, user_id: int, status: str, custom_status: str = None, db=None) -> None:
        self.set_user_status(user_id, status, custom_status)
        
        # Check blocks and admin role
        blocked_users = set()
        is_admin_user = False
        close_db_here = False
        if db is None:
            db = SessionLocal()
            close_db_here = True
        try:
            from models import UserBlock, User
            blocks = db.query(UserBlock).filter(
                (UserBlock.blocker_id == user_id) | (UserBlock.blocked_id == user_id)
            ).all()
            for b in blocks:
                blocked_users.add(b.blocker_id if b.blocked_id == user_id else b.blocked_id)
            
            u = db.query(User).filter(User.id == user_id).first()
            if u and (u.role == "SUPER_ADMIN" or u.username == "BlackShadow-ChatTornado"):
                is_admin_user = True
        except Exception:
            pass
        finally:
            if close_db_here and db:
                db.close()

        packet = {
            "type": "user_status_update",
            "user_id": user_id,
            "status": status,
            "custom_status": custom_status
        }

        for target_id, ws in list(self.active_connections.items()):
            try:
                tid = int(target_id)
            except (ValueError, TypeError):
                continue

            if tid == user_id:
                await self.send_personal_message(tid, packet)
                continue

            # If user is admin and target is not, do not broadcast presence
            if is_admin_user:
                continue

            # If target blocked user or vice versa, do not send presence update
            if tid in blocked_users:
                continue

            await self.send_personal_message(tid, packet)


                


class GhostSessionManager:
    def __init__(self):
        self.sessions = {}

    def room_key(self, user1: int, user2: int):
        return tuple(sorted((user1, user2)))

    def create(self, user1: int, user2: int):
        self.sessions[self.room_key(user1, user2)] = {
            "users": {user1, user2}
        }

    def exists(self, user1: int, user2: int):
        return self.room_key(user1, user2) in self.sessions

    def remove(self, user1: int, user2: int):
        self.sessions.pop(self.room_key(user1, user2), None)

    def disconnect(self, user_id: int):
        dead = []

        for key, room in self.sessions.items():
            if user_id in room["users"]:
                dead.append(key)

        for key in dead:
            del self.sessions[key]


manager = ConnectionManager()            
ghost_manager = GhostSessionManager()