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

    async def connect(
        self,
        user_id: int,
        websocket: WebSocket
    ) -> None:
        await websocket.accept()

        self.active_connections[user_id] = websocket
        self.online_users.add(user_id)
        
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


    def disconnect(
        self,
        user_id: int
    ) -> None:
        self.active_connections.pop(user_id, None)
        self.online_users.discard(user_id)


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

        for user_id, websocket in list(self.active_connections.items()):

            try:

                await websocket.send_json(
                    {
                        "type": "online_users",
                        "users": online_users
                    }
                )

            except (WebSocketDisconnect, RuntimeError):
                dead_connections.append(user_id)

            except Exception:
                dead_connections.append(user_id)

        for user_id in dead_connections:
            self.disconnect(user_id)

        if dead_connections:
            online_users = await self.get_online_users()

            for user_id in list(self.active_connections.keys()):
                await self.send_personal_message(
                    user_id,
                    {
                        "type": "online_users",
                        "users": online_users
                    }
                )

                


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