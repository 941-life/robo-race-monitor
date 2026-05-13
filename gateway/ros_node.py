"""ROS subscriber node running in a background thread."""

import threading
import time
from typing import Any, Callable, Dict, List, Optional

import cv2
import numpy as np
import rospy
import rosgraph

from .encoders import encode
from .throttle import HzThrottle
from .topics import TOPIC_CATALOG


class RosNode:
    def __init__(self, ws_manager: Any, recorder: Any) -> None:
        self.ws = ws_manager
        self.recorder = recorder
        self.throttle = HzThrottle()
        self.subscribers: List[Any] = []
        self.thread: Optional[threading.Thread] = None
        self.stats_lock = threading.Lock()
        self.topic_stats: Dict[str, Dict[str, Any]] = {
            topic: {
                "topic": topic,
                "type": msg_cls._type,
                "category": category,
                "count": 0,
                "last_seen": None,
            }
            for topic, msg_cls, category, _hz in TOPIC_CATALOG
        }

    def start(self) -> None:
        if self.thread and self.thread.is_alive():
            return

        self.thread = threading.Thread(target=self._run, daemon=True)
        self.thread.start()

    def _run(self) -> None:
        rospy.init_node("robo_monitor_gateway", anonymous=True, disable_signals=True)

        for topic, msg_cls, category, hz in TOPIC_CATALOG:
            type_name = msg_cls._type
            callback = self._make_callback(topic, type_name, category, hz)
            subscriber = rospy.Subscriber(topic, msg_cls, callback, queue_size=2)
            self.subscribers.append(subscriber)

        rospy.loginfo("robo_monitor_gateway subscribed to %d topics", len(self.subscribers))
        rospy.spin()

    def snapshot(self) -> Dict[str, Any]:
        published_topics = get_published_topics()
        with self.stats_lock:
            topics = [
                {
                    **stat,
                    "published": stat["topic"] in published_topics,
                    "age_sec": None
                    if stat["last_seen"] is None
                    else max(0.0, time.time() - stat["last_seen"]),
                }
                for stat in self.topic_stats.values()
            ]

        return {
            "subscribed": len(self.subscribers),
            "topics": topics,
        }

    def _mark_seen(self, topic: str) -> None:
        with self.stats_lock:
            stat = self.topic_stats.get(topic)
            if stat is None:
                return
            stat["count"] += 1
            stat["last_seen"] = time.time()

    def _make_callback(
        self,
        topic: str,
        type_name: str,
        category: str,
        hz: float,
    ) -> Callable[[Any], None]:
        if category == "camera":
            return self._make_camera_callback(topic, hz)

        def callback(msg: Any) -> None:
            self._mark_seen(topic)

            try:
                self.recorder.write(topic, type_name, category, msg)
            except Exception as exc:
                rospy.logwarn_throttle(5.0, "recorder write failed for %s: %s", topic, exc)

            if not self.throttle.allow(topic, hz):
                return

            try:
                payload = encode(msg, type_name)
            except Exception as exc:
                rospy.logwarn_throttle(5.0, "encode failed for %s: %s", topic, exc)
                return

            envelope = {
                "topic": topic,
                "category": category,
                "stamp": time.time(),
                "data": payload,
            }
            self.ws.broadcast_text_threadsafe(envelope)

        return callback

    def _make_camera_callback(self, topic: str, hz: float) -> Callable[[Any], None]:
        def callback(msg: Any) -> None:
            self._mark_seen(topic)

            if not self.throttle.allow(topic, hz):
                return

            try:
                cv_image = image_msg_to_bgr(msg)
                ok, buffer = cv2.imencode(
                    ".jpg",
                    cv_image,
                    [int(cv2.IMWRITE_JPEG_QUALITY), 70],
                )
                if not ok:
                    return
                self.ws.broadcast_binary_threadsafe(buffer.tobytes())
            except Exception as exc:
                rospy.logwarn_throttle(5.0, "camera callback failed for %s: %s", topic, exc)

        return callback


def image_msg_to_bgr(msg: Any) -> Any:
    """Convert common sensor_msgs/Image encodings to an OpenCV BGR image."""
    encoding = msg.encoding.lower()
    height = int(msg.height)
    width = int(msg.width)
    step = int(msg.step)
    raw = np.frombuffer(msg.data, dtype=np.uint8)

    if encoding in ("bgr8", "rgb8"):
        image = raw.reshape((height, step // 3, 3))[:, :width, :]
        if encoding == "rgb8":
            return cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
        return image

    if encoding in ("bgra8", "rgba8"):
        image = raw.reshape((height, step // 4, 4))[:, :width, :]
        code = cv2.COLOR_RGBA2BGR if encoding == "rgba8" else cv2.COLOR_BGRA2BGR
        return cv2.cvtColor(image, code)

    if encoding in ("mono8", "8uc1"):
        image = raw.reshape((height, step))[:, :width]
        return cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)

    if encoding == "8uc3":
        return raw.reshape((height, step // 3, 3))[:, :width, :]

    raise ValueError(f"Unsupported camera encoding: {msg.encoding}")


def get_published_topics() -> set:
    try:
        master = rosgraph.Master("/robo_monitor_gateway")
        return {topic for topic, _type_name in master.getPublishedTopics("")}
    except Exception:
        return set()
