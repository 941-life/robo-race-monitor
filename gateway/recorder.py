"""Session-based CSV recorder for ROS monitoring topics."""

import csv
import json
import re
import time
from datetime import datetime
from pathlib import Path
from threading import Lock
from typing import Any, Dict, List, Optional

from .encoders import encode_csv_row
from .topics import CSV_FILES


class Recorder:
    def __init__(self, base_dir: str = "/data/recordings") -> None:
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)
        self.session_dir: Optional[Path] = None
        self.writers: Dict[str, csv.DictWriter] = {}
        self.files: Dict[str, Any] = {}
        self.fieldnames: Dict[str, List[str]] = {}
        self.lock = Lock()
        self.label: Optional[str] = None
        self.start_time: Optional[float] = None

    @property
    def is_recording(self) -> bool:
        return self.session_dir is not None

    def start(self, label: Optional[str] = None) -> Dict[str, Any]:
        with self.lock:
            if self.is_recording:
                return self.status()

            clean_label = _sanitize_label(label)
            started_at = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
            dirname = f"{started_at}_{clean_label}" if clean_label else started_at

            self.session_dir = self.base_dir / dirname
            self.session_dir.mkdir(parents=True, exist_ok=True)
            self.label = label
            self.start_time = time.time()

            meta = {
                "started_at": started_at,
                "label": label,
            }
            (self.session_dir / "meta.json").write_text(
                json.dumps(meta, indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
            return self.status()

    def stop(self) -> Dict[str, Any]:
        with self.lock:
            if not self.is_recording:
                return self.status()

            for file_handle in self.files.values():
                file_handle.close()

            ended = self.session_dir
            self.files.clear()
            self.writers.clear()
            self.fieldnames.clear()
            self.session_dir = None
            self.label = None
            self.start_time = None

            return {"recording": False, "last_session": str(ended)}

    def write(self, topic: str, type_name: str, category: str, msg: Any) -> None:
        if not self.is_recording:
            return

        csv_name = CSV_FILES.get(category)
        if csv_name is None:
            return

        row = encode_csv_row(msg, type_name)
        if not row:
            return

        record = {
            "wall_time": f"{time.time():.6f}",
            "topic": topic,
            **{f"v_{key}": value for key, value in row.items()},
        }

        with self.lock:
            if not self.is_recording or self.session_dir is None:
                return

            writer = self._ensure_writer(csv_name, record)
            writer.writerow(record)
            self.files[csv_name].flush()

    def status(self) -> Dict[str, Any]:
        if not self.is_recording or self.start_time is None:
            return {"recording": False}

        return {
            "recording": True,
            "label": self.label,
            "session_dir": str(self.session_dir),
            "elapsed_sec": time.time() - self.start_time,
        }

    def _ensure_writer(
        self,
        csv_name: str,
        record: Dict[str, Any],
    ) -> csv.DictWriter:
        if csv_name in self.writers:
            return self.writers[csv_name]

        if self.session_dir is None:
            raise RuntimeError("recording session is not active")

        path = self.session_dir / csv_name
        file_handle = open(path, "w", newline="", encoding="utf-8")
        fieldnames = list(record.keys())
        writer = csv.DictWriter(
            file_handle,
            fieldnames=fieldnames,
            extrasaction="ignore",
        )
        writer.writeheader()

        self.files[csv_name] = file_handle
        self.fieldnames[csv_name] = fieldnames
        self.writers[csv_name] = writer
        return writer


def _sanitize_label(label: Optional[str]) -> Optional[str]:
    if not label:
        return None
    cleaned = re.sub(r"[^A-Za-z0-9_.-]+", "_", label.strip())
    return cleaned.strip("._-") or None
