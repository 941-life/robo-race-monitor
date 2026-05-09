"""FastAPI entrypoint for the ROS monitoring gateway."""

import asyncio
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator, Dict, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .recorder import Recorder
from .ros_node import RosNode
from .ws_manager import WSManager

ws_manager = WSManager()
recorder = Recorder(base_dir="/data/recordings")
ros_node: Optional[RosNode] = None


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    global ros_node
    ws_manager.set_loop(asyncio.get_running_loop())
    ros_node = RosNode(ws_manager, recorder)
    ros_node.start()
    yield


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class StartReq(BaseModel):
    label: Optional[str] = None


@app.get("/api/session/status")
def session_status() -> Dict[str, Any]:
    return recorder.status()


@app.post("/api/session/start")
def session_start(req: StartReq) -> Dict[str, Any]:
    return recorder.start(label=req.label)


@app.post("/api/session/stop")
def session_stop() -> Dict[str, Any]:
    return recorder.stop()


@app.websocket("/ws")
async def ws_text(ws: WebSocket) -> None:
    await ws_manager.connect_text(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        await ws_manager.disconnect_text(ws)


@app.websocket("/ws/camera")
async def ws_camera(ws: WebSocket) -> None:
    await ws_manager.connect_camera(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        await ws_manager.disconnect_camera(ws)
