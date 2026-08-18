"""Tiny in-memory WebSocket broadcast hub for live attendance events.

Single-process only (no pub/sub backend) - fine for this app's scale. If it's ever run with
multiple uvicorn workers, each worker would only broadcast to the connections it holds; that's a
known limitation, not a bug to chase down for an app this size.
"""

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self.active: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active.append(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active:
            self.active.remove(websocket)

    async def broadcast(self, message: dict) -> None:
        stale = []
        for websocket in self.active:
            try:
                await websocket.send_json(message)
            except Exception:
                stale.append(websocket)
        for websocket in stale:
            self.disconnect(websocket)


manager = ConnectionManager()
