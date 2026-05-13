"""FastAPI entrypoint for the ROS monitoring gateway."""

import asyncio
import os
import secrets
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator, Dict, Optional

from fastapi import Depends, FastAPI, Header, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .recorder import Recorder
from .ros_node import RosNode
from .ws_manager import WSManager

ws_manager = WSManager()
recorder = Recorder(base_dir="/data/recordings")
ros_node: Optional[RosNode] = None
gateway_token = os.getenv("GATEWAY_TOKEN", "").strip()


def require_gateway_token(
    authorization: Optional[str] = Header(default=None),
    x_gateway_token: Optional[str] = Header(default=None),
    token: Optional[str] = Query(default=None),
) -> None:
    if not gateway_token:
        return

    supplied = token or x_gateway_token
    if not supplied and authorization:
        scheme, _, value = authorization.partition(" ")
        if scheme.lower() == "bearer":
            supplied = value

    if not supplied or not secrets.compare_digest(supplied, gateway_token):
        raise HTTPException(status_code=401, detail="Unauthorized")


async def require_ws_token(ws: WebSocket) -> bool:
    if not gateway_token:
        return True
    supplied = ws.query_params.get("token")
    if supplied and secrets.compare_digest(supplied, gateway_token):
        return True
    await ws.close(code=1008)
    return False


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


@app.get("/api/health", dependencies=[Depends(require_gateway_token)])
def health() -> Dict[str, Any]:
    ros = ros_node.snapshot() if ros_node is not None else {"subscribed": 0, "topics": []}
    active_topics = sum(1 for topic in ros["topics"] if topic["last_seen"] is not None)
    return {
        "ok": True,
        "gateway": "running",
        "ros": {
            **ros,
            "active_topics": active_topics,
        },
    }


@app.get("/api/session/status", dependencies=[Depends(require_gateway_token)])
def session_status() -> Dict[str, Any]:
    return recorder.status()


@app.post("/api/session/start", dependencies=[Depends(require_gateway_token)])
def session_start(req: StartReq) -> Dict[str, Any]:
    return recorder.start(label=req.label)


@app.post("/api/session/stop", dependencies=[Depends(require_gateway_token)])
def session_stop() -> Dict[str, Any]:
    return recorder.stop()


@app.websocket("/ws")
async def ws_text(ws: WebSocket) -> None:
    if not await require_ws_token(ws):
        return
    await ws_manager.connect_text(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        await ws_manager.disconnect_text(ws)


@app.websocket("/ws/camera")
async def ws_camera(ws: WebSocket) -> None:
    if not await require_ws_token(ws):
        return
    await ws_manager.connect_camera(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        await ws_manager.disconnect_camera(ws)
