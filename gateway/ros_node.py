"""ROS subscriber node running in a background thread."""

import threading
import time
from typing import Any, Callable, List, Optional

import cv2
import rospy
from cv_bridge import CvBridge

from .encoders import encode
from .throttle import HzThrottle
from .topics import TOPIC_CATALOG


class RosNode:
    def __init__(self, ws_manager: Any, recorder: Any) -> None:
        self.ws = ws_manager
        self.recorder = recorder
        self.throttle = HzThrottle()
        self.bridge = CvBridge()
        self.subscribers: List[Any] = []
        self.thread: Optional[threading.Thread] = None

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
            if not self.throttle.allow(topic, hz):
                return

            try:
                cv_image = self.bridge.imgmsg_to_cv2(msg, "bgr8")
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
