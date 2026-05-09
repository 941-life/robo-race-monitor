"""ROS topic catalog and recording file mapping."""

from geometry_msgs.msg import Point
from nav_msgs.msg import Odometry, Path
from sensor_msgs.msg import Image
from std_msgs.msg import Bool, Float32, Float64, Int32, String

# (topic_name, msg_class, category, throttle_hz)
# throttle_hz limits UI/WebSocket publishing only. CSV recording stores every
# callback received while a session is active.
TOPIC_CATALOG = [
    # Control
    ("/cross_track_error", Float64, "control", 30),
    ("/steer_deg", Float64, "control", 30),
    ("/target_vel", Float64, "control", 30),
    ("/current_vel_print", Float64, "control", 30),
    ("/curvature", Float64, "control", 30),
    ("/heading_error", Float64, "control", 30),
    ("/rmse", Float64, "control", 10),
    ("/penalty", Float64, "control", 10),
    # Decision
    ("/region", String, "decision", 10),
    ("/decision", String, "decision", 10),
    ("/monitoring/gpp/region", String, "decision", 10),
    ("/monitoring/gpp/decision", String, "decision", 10),
    ("/monitoring/gpp/estop_decision", String, "decision", 10),
    ("/monitoring/gpp/current_path", Int32, "decision", 10),
    ("/monitoring/gpp/selected_path", Int32, "decision", 10),
    # Flags
    ("/monitoring/gpp/front_obstacle", Bool, "flags", 10),
    ("/monitoring/gpp/side_obstacle", Bool, "flags", 10),
    ("/monitoring/gpp/camera_stop_active", Bool, "flags", 10),
    ("/monitoring/gpp/lane_change_active", Bool, "flags", 10),
    ("/monitoring/gpp/curve_transition_active", Bool, "flags", 10),
    ("/monitoring/gpp/warning_hold_active", Bool, "flags", 10),
    # Obstacles
    ("/monitoring/gpp/obstacle_one_role", String, "obstacles", 10),
    ("/monitoring/gpp/obstacle_two_role", String, "obstacles", 10),
    ("/monitoring/gpp/obstacle_one_position", Point, "obstacles", 10),
    ("/monitoring/gpp/obstacle_two_position", Point, "obstacles", 10),
    ("/monitoring/gpp/representative_obstacle_position", Point, "obstacles", 10),
    # Path status
    ("/monitoring/gpp/path1_valid", Bool, "path_status", 5),
    ("/monitoring/gpp/path2_valid", Bool, "path_status", 5),
    ("/monitoring/gpp/local_path1_points", Int32, "path_status", 5),
    ("/monitoring/gpp/local_path2_points", Int32, "path_status", 5),
    ("/monitoring/gpp/global_path1_points", Int32, "path_status", 5),
    ("/monitoring/gpp/global_path2_points", Int32, "path_status", 5),
    ("/monitoring/gpp/path1_nearest_distance", Float32, "path_status", 5),
    ("/monitoring/gpp/path2_nearest_distance", Float32, "path_status", 5),
    ("/monitoring/gpp/overlap_lock", Bool, "path_status", 5),
    ("/monitoring/gpp/overlap_separation", Float32, "path_status", 5),
    # Pose and paths
    ("/gps_utm_odom", Odometry, "pose", 20),
    ("/global_path1", Path, "paths", 1),
    ("/global_path2", Path, "paths", 1),
    ("/local_path1", Path, "paths", 5),
    ("/local_path2", Path, "paths", 5),
    ("/selected_path", Path, "paths", 5),
    # Camera
    ("/traffic_cam/image_raw", Image, "camera", 15),
]

CSV_FILES = {
    "control": "control.csv",
    "decision": "decision.csv",
    "flags": "flags.csv",
    "obstacles": "obstacles.csv",
    "path_status": "path_status.csv",
    "pose": "pose.csv",
}

