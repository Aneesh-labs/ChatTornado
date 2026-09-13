from fastapi import WebSocket
from starlette.websockets import WebSocketDisconnect


class ConnectionManager:

    def __init__(self):
        self.active_connections: dict[int, WebSocket] = {}
        self.online_users: set[int] = set()

    async def connect(
        self,
        user_id: int,
        websocket: WebSocket
    ) -> None:
        await websocket.accept()

        self.active_connections[user_id] = websocket
        self.online_users.add(user_id)


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

        websocket = self.active_connections.get(receiver_id)

        if websocket is None:
            return False

        try:
            await websocket.send_json(message)
            return True

        except (WebSocketDisconnect, RuntimeError):
            self.disconnect(receiver_id)
            return False

        except Exception as e:
            
            self.disconnect(receiver_id)
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