#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [[ -f /opt/ros/noetic/setup.bash ]]; then
  # shellcheck disable=SC1091
  source /opt/ros/noetic/setup.bash
else
  echo "ROS Noetic setup not found at /opt/ros/noetic/setup.bash" >&2
  exit 1
fi

if [[ -n "${ROS_WORKSPACE_SETUP:-}" ]]; then
  # shellcheck disable=SC1090
  source "$ROS_WORKSPACE_SETUP"
fi

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

export GATEWAY_HOST="${GATEWAY_HOST:-0.0.0.0}"
export GATEWAY_PORT="${GATEWAY_PORT:-8000}"
export RECORDINGS_DIR="${RECORDINGS_DIR:-./recordings}"

mkdir -p "$RECORDINGS_DIR"

echo "ROS_MASTER_URI=${ROS_MASTER_URI:-}"
echo "ROS_IP=${ROS_IP:-}"
echo "Gateway listening on ${GATEWAY_HOST}:${GATEWAY_PORT}"
echo "Recordings: ${RECORDINGS_DIR}"

exec python3 -m uvicorn gateway.main:app \
  --host "$GATEWAY_HOST" \
  --port "$GATEWAY_PORT" \
  --ws-ping-interval 20
