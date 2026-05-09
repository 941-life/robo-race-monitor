"""WebSocket client registry and thread-safe broadcasting helpers."""

import asyncio
import json
from typing import Any, Dict, List, Optional, Set

from fastapi import WebSocket


class WSManager:
    def __init__(self) -> None:
        self.text_clients: Set[WebSocket] = set()
        self.camera_clients: Set[WebSocket] = set()
        self.lock = asyncio.Lock()
        self.loop: Optional[asyncio.AbstractEventLoop] = None

    def set_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self.loop = loop

    async def connect_text(self, ws: WebSocket) -> None:
        await ws.accept()
        async with self.lock:
            self.text_clients.add(ws)

    async def disconnect_text(self, ws: WebSocket) -> None:
        async with self.lock:
            self.text_clients.discard(ws)

    async def connect_camera(self, ws: WebSocket) -> None:
        await ws.accept()
        async with self.lock:
            self.camera_clients.add(ws)

    async def disconnect_camera(self, ws: WebSocket) -> None:
        async with self.lock:
            self.camera_clients.discard(ws)

    def broadcast_text_threadsafe(self, payload: Dict[str, Any]) -> None:
        if self.loop is None:
            return

        message = json.dumps(
            payload,
            ensure_ascii=False,
            allow_nan=False,
            default=str,
        )
        asyncio.run_coroutine_threadsafe(self._send_text(message), self.loop)

    def broadcast_binary_threadsafe(self, data: bytes) -> None:
        if self.loop is None:
            return

        asyncio.run_coroutine_threadsafe(self._send_binary(data), self.loop)

    async def _send_text(self, message: str) -> None:
        dead: List[WebSocket] = []
        async with self.lock:
            clients = list(self.text_clients)

        for ws in clients:
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)

        if dead:
            async with self.lock:
                for ws in dead:
                    self.text_clients.discard(ws)

    async def _send_binary(self, data: bytes) -> None:
        dead: List[WebSocket] = []
        async with self.lock:
            clients = list(self.camera_clients)

        for ws in clients:
            try:
                await ws.send_bytes(data)
            except Exception:
                dead.append(ws)

        if dead:
            async with self.lock:
                for ws in dead:
                    self.camera_clients.discard(ws)
