#!/bin/bash
set -euo pipefail

docker compose up -d --build
echo "Gateway running on https://$(hostname -I | awk '{print $1}'):8443"

