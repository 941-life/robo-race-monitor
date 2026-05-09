/**
 * Mock WebSocket + REST server — replaces the Gateway for local UI development.
 *
 * Usage:
 *   node tools/mock-ws-server.mjs
 *
 * Endpoints:
 *   ws://localhost:8000/ws          ← text topic envelopes (JSON)
 *   ws://localhost:8000/ws/camera   ← JPEG binary frames
 *   POST /api/session/start         ← { label? }
 *   POST /api/session/stop
 *   GET  /api/session/status
 *
 * Dependencies (devDependencies):
 *   ws       — WebSocket server
 *   jpeg-js  — pure-JS JPEG encoder (no native bindings needed)
 */

import { WebSocketServer, WebSocket } from "ws";
import http from "node:http";
import jpeg from "jpeg-js";

const PORT = 8000;
const t0 = Date.now();
const elapsed = () => (Date.now() - t0) / 1000;

// UTM ellipse track (same as dummy.py)
const CX = 363000, CY = 4143000, RX = 50, RY = 30;

// ── Session state ──────────────────────────────────────────────────────────
let session = { recording: false, label: null, startedAt: null };

function sessionStatusPayload() {
  if (!session.recording) return { recording: false };
  return {
    recording: true,
    label: session.label,
    elapsed_sec: (Date.now() - session.startedAt) / 1000,
    session_dir: `/data/recordings/mock_${session.label ?? "session"}`,
  };
}

// ── HTTP + WebSocket server ────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const json = (obj) => {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(obj));
  };

  if (req.url === "/api/session/status") {
    json(sessionStatusPayload());
    return;
  }

  if (req.url === "/api/session/start" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const { label } = JSON.parse(body || "{}");
      session = { recording: true, label: label ?? null, startedAt: Date.now() };
      json(sessionStatusPayload());
    });
    return;
  }

  if (req.url === "/api/session/stop" && req.method === "POST") {
    session = { recording: false, label: null, startedAt: null };
    json({ recording: false });
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

const wssText = new WebSocketServer({ noServer: true });
const wssCam = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, sock, head) => {
  if (req.url === "/ws") {
    wssText.handleUpgrade(req, sock, head, (ws) => wssText.emit("connection", ws));
  } else if (req.url === "/ws/camera") {
    wssCam.handleUpgrade(req, sock, head, (ws) => wssCam.emit("connection", ws));
  } else {
    sock.destroy();
  }
});

const textClients = new Set();
const camClients = new Set();

wssText.on("connection", (ws) => {
  textClients.add(ws);
  // Latched topics: send immediately on connect
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(makeEnv("/global_path1", "paths", globalPath1)));
    ws.send(JSON.stringify(makeEnv("/global_path2", "paths", globalPath2)));
    // Static config topics (published once at node start in real system)
    ws.send(JSON.stringify(makeEnv("/monitoring/gpp/path1_file", "config", { data: "univ_right" })));
    ws.send(JSON.stringify(makeEnv("/monitoring/gpp/path2_file", "config", { data: "univ_left"  })));
    ws.send(JSON.stringify(makeEnv("/monitoring/gpp/region_id",  "config", { data: "final"      })));
    ws.send(JSON.stringify(makeEnv("/monitoring/gpp/frame_id",   "config", { data: "map"        })));
  }
  ws.on("close", () => textClients.delete(ws));
});

wssCam.on("connection", (ws) => {
  camClients.add(ws);
  ws.on("close", () => camClients.delete(ws));
});

// ── Helpers ────────────────────────────────────────────────────────────────
function makeEnv(topic, category, data) {
  return { topic, category, stamp: Date.now() / 1000, data };
}

function broadcast(topic, category, data) {
  const msg = JSON.stringify(makeEnv(topic, category, data));
  for (const ws of textClients) {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  }
}

// ── Scenario (60s cycle) ───────────────────────────────────────────────────
function scenario(t) {
  const cycle = t % 60;
  if (cycle < 15) return { region: "go",      decision: "fast",       estop: "fast",         front_obs: false, lane_change: false, warning: false, curve: false };
  if (cycle < 25) return { region: "warning",  decision: "slow_down",  estop: "slowdown",     front_obs: true,  lane_change: false, warning: true,  curve: false };
  if (cycle < 35) return { region: "overtake", decision: "change",     estop: "start_change", front_obs: true,  lane_change: true,  warning: false, curve: false };
  if (cycle < 45) return { region: "go",       decision: "fast_lc",    estop: "fast",         front_obs: false, lane_change: false, warning: false, curve: false };
  if (cycle < 55) return { region: "curve",    decision: "fast",       estop: "fast",         front_obs: false, lane_change: false, warning: false, curve: true  };
  return             { region: "slow",      decision: "slow_down",  estop: "slowdown",     front_obs: false, lane_change: false, warning: false, curve: false };
}

// ── Static data ────────────────────────────────────────────────────────────
const globalPath1 = {
  frame_id: "map", n: 200,
  poses: Array.from({ length: 200 }, (_, i) => {
    const th = (2 * Math.PI * i) / 200;
    return { x: CX + RX * Math.cos(th), y: CY + RY * Math.sin(th) };
  }),
};
const globalPath2 = {
  frame_id: "map", n: 200,
  poses: globalPath1.poses.map((p) => ({ x: p.x, y: p.y + 3.5 })),
};

function makeLocalPath(vx, vy, n = 50) {
  return {
    frame_id: "map", n,
    poses: Array.from({ length: n }, (_, i) => ({ x: vx + i * 0.5, y: vy })),
  };
}

// ── 30 Hz: control + pose ─────────────────────────────────────────────────
setInterval(() => {
  const t = elapsed();
  const s = scenario(t);
  const theta = (t * 0.05) % (2 * Math.PI);
  const vx = CX + RX * Math.cos(theta);
  const vy = CY + RY * Math.sin(theta);
  const yaw = theta + Math.PI / 2;

  const tv = s.region === "go" ? 15 : s.region === "slow" ? 8 : 10;
  const noise = () => (Math.random() - 0.5) * 0.06;

  broadcast("/cross_track_error",   "control", { data: 0.1 * Math.sin(t * 1.3) + noise() });
  broadcast("/steer_deg",           "control", { data: 5 * Math.sin(t * 0.8) + (Math.random() - 0.5) });
  broadcast("/target_vel",          "control", { data: tv });
  broadcast("/current_vel_print",   "control", { data: tv + (Math.random() - 0.5) * 0.6 });
  broadcast("/curvature",           "control", { data: 0.05 * Math.sin(t * 0.5) });
  broadcast("/heading_error",       "control", { data: 0.02 * Math.sin(t * 0.9) });
  broadcast("/gps_utm_odom",        "pose",    { x: vx, y: vy, yaw, frame_id: "map" });
}, 33);

// ── 10 Hz: decision + flags + obstacles ───────────────────────────────────
setInterval(() => {
  const t = elapsed();
  const s = scenario(t);
  const camStop = Math.floor(t) % 30 < 2 && Math.floor(t) % 30 > 0;
  const curPath = s.lane_change ? 2 : 1;

  broadcast("/region",   "decision", { data: s.region });
  broadcast("/decision", "decision", { data: s.decision });
  broadcast("/monitoring/gpp/region",         "decision", { data: s.region });
  broadcast("/monitoring/gpp/decision",        "decision", { data: s.decision });
  broadcast("/monitoring/gpp/estop_decision",  "decision", { data: s.estop });
  broadcast("/monitoring/gpp/current_path",    "decision", { data: curPath });
  broadcast("/monitoring/gpp/selected_path",   "decision", { data: curPath });

  broadcast("/monitoring/gpp/front_obstacle",          "flags", { data: s.front_obs });
  broadcast("/monitoring/gpp/side_obstacle",           "flags", { data: false });
  broadcast("/monitoring/gpp/camera_stop_active",      "flags", { data: camStop });
  broadcast("/monitoring/gpp/lane_change_active",      "flags", { data: s.lane_change });
  broadcast("/monitoring/gpp/curve_transition_active", "flags", { data: s.curve });
  broadcast("/monitoring/gpp/warning_hold_active",     "flags", { data: s.warning });

  const nanPt = { x: null, y: null, z: 0 };
  if (s.front_obs) {
    const obsPt = { x: 8.0, y: 0.2, z: 0 };
    broadcast("/monitoring/gpp/obstacle_one_role",                    "obstacles", { data: "front" });
    broadcast("/monitoring/gpp/obstacle_one_position",                "obstacles", obsPt);
    broadcast("/monitoring/gpp/representative_obstacle_position",     "obstacles", obsPt);
  } else {
    broadcast("/monitoring/gpp/obstacle_one_role",                    "obstacles", { data: "none" });
    broadcast("/monitoring/gpp/obstacle_one_position",                "obstacles", nanPt);
    broadcast("/monitoring/gpp/representative_obstacle_position",     "obstacles", nanPt);
  }
  broadcast("/monitoring/gpp/obstacle_two_role",     "obstacles", { data: "none" });
  broadcast("/monitoring/gpp/obstacle_two_position", "obstacles", nanPt);
}, 100);

// ── 5 Hz: path status + local paths ───────────────────────────────────────
setInterval(() => {
  const t = elapsed();
  const theta = (t * 0.05) % (2 * Math.PI);
  const vx = CX + RX * Math.cos(theta);
  const vy = CY + RY * Math.sin(theta);

  broadcast("/monitoring/gpp/path1_valid",           "path_status", { data: true });
  broadcast("/monitoring/gpp/path2_valid",           "path_status", { data: true });
  broadcast("/monitoring/gpp/local_path1_points",    "path_status", { data: 50 });
  broadcast("/monitoring/gpp/local_path2_points",    "path_status", { data: 50 });
  broadcast("/monitoring/gpp/global_path1_points",   "path_status", { data: 200 });
  broadcast("/monitoring/gpp/global_path2_points",   "path_status", { data: 200 });
  broadcast("/monitoring/gpp/path1_nearest_distance","path_status", { data: 1.2 + 0.1 * Math.sin(t) });
  broadcast("/monitoring/gpp/path2_nearest_distance","path_status", { data: 2.5 + 0.1 * Math.cos(t) });
  broadcast("/monitoring/gpp/overlap_lock",          "path_status", { data: false });
  broadcast("/monitoring/gpp/overlap_separation",    "path_status", { data: 3.5 });

  const lp = makeLocalPath(vx, vy);
  broadcast("/local_path1",   "paths", lp);
  broadcast("/local_path2",   "paths", lp);
  broadcast("/selected_path", "paths", lp);
}, 200);

// ── Global paths — re-broadcast every 5s (latched simulation) ─────────────
setInterval(() => {
  broadcast("/global_path1", "paths", globalPath1);
  broadcast("/global_path2", "paths", globalPath2);
}, 5000);

// ── 10 Hz: RMSE + penalty ─────────────────────────────────────────────────
setInterval(() => {
  const t = elapsed();
  const cte = 0.1 * Math.sin(t * 1.3);
  broadcast("/rmse",    "control", { data: Math.abs(cte) * 1.5 });
  broadcast("/penalty", "control", { data: 0.0 });
}, 100);

// ── 15 Hz: camera (JPEG binary via jpeg-js) ───────────────────────────────
setInterval(() => {
  if (camClients.size === 0) return;

  const t = elapsed();
  const W = 640, H = 480;
  const frameData = Buffer.alloc(W * H * 4);

  const r = Math.floor(128 + 127 * Math.sin(t));
  const g = Math.floor(128 + 127 * Math.cos(t * 0.7));
  const b = 50;

  for (let i = 0; i < W * H; i++) {
    frameData[i * 4 + 0] = r;
    frameData[i * 4 + 1] = g;
    frameData[i * 4 + 2] = b;
    frameData[i * 4 + 3] = 255;
  }

  try {
    const { data: jpegBuf } = jpeg.encode({ data: frameData, width: W, height: H }, 70);
    for (const ws of camClients) {
      if (ws.readyState === WebSocket.OPEN) ws.send(jpegBuf);
    }
  } catch {
    // jpeg-js not installed — camera mock disabled silently
  }
}, 66);

// ── Start ──────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`\nMock WS server running on port ${PORT}`);
  console.log(`  text WS  : ws://localhost:${PORT}/ws`);
  console.log(`  camera WS: ws://localhost:${PORT}/ws/camera`);
  console.log(`  REST     : http://localhost:${PORT}/api/session/status\n`);
});
