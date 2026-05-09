"""Encode ROS messages into JSON-friendly and CSV-friendly dictionaries."""

import math
from typing import Any, Dict


def _nan_to_none(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    return value


def _quat_to_yaw(x: float, y: float, z: float, w: float) -> float:
    siny_cosp = 2 * (w * z + x * y)
    cosy_cosp = 1 - 2 * (y * y + z * z)
    return math.atan2(siny_cosp, cosy_cosp)


def encode(msg: Any, type_name: str) -> Dict[str, Any]:
    """Convert a ROS message to a JSON-friendly payload."""
    if type_name in ("std_msgs/Float64", "std_msgs/Float32"):
        return {"data": _nan_to_none(float(msg.data))}
    if type_name == "std_msgs/String":
        return {"data": msg.data}
    if type_name == "std_msgs/Bool":
        return {"data": bool(msg.data)}
    if type_name == "std_msgs/Int32":
        return {"data": int(msg.data)}
    if type_name == "geometry_msgs/Point":
        return {
            "x": _nan_to_none(msg.x),
            "y": _nan_to_none(msg.y),
            "z": _nan_to_none(msg.z),
        }
    if type_name == "nav_msgs/Path":
        return {
            "frame_id": msg.header.frame_id,
            "n": len(msg.poses),
            "poses": [
                {"x": pose.pose.position.x, "y": pose.pose.position.y}
                for pose in msg.poses
            ],
        }
    if type_name == "nav_msgs/Odometry":
        position = msg.pose.pose.position
        orientation = msg.pose.pose.orientation
        return {
            "x": position.x,
            "y": position.y,
            "yaw": _quat_to_yaw(
                orientation.x,
                orientation.y,
                orientation.z,
                orientation.w,
            ),
            "frame_id": msg.header.frame_id,
        }
    raise ValueError(f"Unknown ROS type: {type_name}")


def encode_csv_row(msg: Any, type_name: str) -> Dict[str, Any]:
    """Convert a ROS message to a compact CSV row payload."""
    if type_name == "nav_msgs/Path":
        return {"n_poses": len(msg.poses), "frame_id": msg.header.frame_id}
    if type_name == "nav_msgs/Odometry":
        data = encode(msg, type_name)
        return {"x": data["x"], "y": data["y"], "yaw": data["yaw"]}
    if type_name == "geometry_msgs/Point":
        return {"x": _nan_to_none(msg.x), "y": _nan_to_none(msg.y)}
    if type_name in ("std_msgs/Float64", "std_msgs/Float32"):
        return {"data": _nan_to_none(float(msg.data))}
    if type_name == "std_msgs/Int32":
        return {"data": int(msg.data)}
    if type_name == "std_msgs/String":
        return {"data": msg.data}
    if type_name == "std_msgs/Bool":
        return {"data": bool(msg.data)}
    return {}
