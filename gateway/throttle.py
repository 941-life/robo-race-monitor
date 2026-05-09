"""Per-topic max-Hz throttle for UI/WebSocket publishing."""

import time
from typing import Dict


class HzThrottle:
    def __init__(self) -> None:
        self._last_sent: Dict[str, float] = {}

    def allow(self, topic: str, max_hz: float) -> bool:
        if max_hz <= 0:
            return True

        now = time.monotonic()
        min_interval = 1.0 / max_hz
        last = self._last_sent.get(topic, 0.0)

        if now - last >= min_interval:
            self._last_sent[topic] = now
            return True
        return False
