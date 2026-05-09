#!/usr/bin/env python3
"""모든 모니터링 토픽을 가짜로 publish.
60초 주기 시나리오: go → warning → overtake → go(lc) → curve → slow"""
import math
import time
import rospy
import numpy as np
from std_msgs.msg import Float64, String, Bool, Int32, Float32
from geometry_msgs.msg import Point, PoseStamped
from nav_msgs.msg import Path, Odometry

# UTM 기준 타원 트랙 (cx/cy는 대회장 근처 가정)
CX, CY = 363000.0, 4143000.0
RX, RY = 50.0, 30.0


def quat_from_yaw(yaw):
    return math.sin(yaw / 2), math.cos(yaw / 2)


def scenario(t):
    cycle = t % 60
    if cycle < 15:
        return dict(region="go", decision="fast", estop="fast",
                    front_obs=False, lane_change=False, warning=False, curve=False)
    if cycle < 25:
        return dict(region="warning", decision="slow_down", estop="slowdown",
                    front_obs=True, lane_change=False, warning=True, curve=False)
    if cycle < 35:
        return dict(region="overtake", decision="change", estop="start_change",
                    front_obs=True, lane_change=True, warning=False, curve=False)
    if cycle < 45:
        return dict(region="go", decision="fast_lc", estop="fast",
                    front_obs=False, lane_change=False, warning=False, curve=False)
    if cycle < 55:
        return dict(region="curve", decision="fast", estop="fast",
                    front_obs=False, lane_change=False, warning=False, curve=True)
    return dict(region="slow", decision="slow_down", estop="slowdown",
                front_obs=False, lane_change=False, warning=False, curve=False)


def make_path(offset_y=0.0, n=200):
    path = Path()
    path.header.frame_id = "map"
    path.header.stamp = rospy.Time.now()
    for i in range(n):
        theta = 2 * math.pi * i / n
        ps = PoseStamped()
        ps.header.frame_id = "map"
        ps.pose.position.x = CX + RX * math.cos(theta)
        ps.pose.position.y = CY + RY * math.sin(theta) + offset_y
        ps.pose.orientation.w = 1.0
        path.poses.append(ps)
    return path


def make_local_path(vx, vy, n=50):
    path = Path()
    path.header.frame_id = "map"
    path.header.stamp = rospy.Time.now()
    for i in range(n):
        ps = PoseStamped()
        ps.header.frame_id = "map"
        ps.pose.position.x = vx + i * 0.5
        ps.pose.position.y = vy
        ps.pose.orientation.w = 1.0
        path.poses.append(ps)
    return path


def main():
    rospy.init_node("dummy_publisher", anonymous=True, disable_signals=True)

    # --- Publishers ---
    pubs = {
        "cte":      rospy.Publisher("/cross_track_error", Float64, queue_size=10),
        "steer":    rospy.Publisher("/steer_deg", Float64, queue_size=10),
        "t_vel":    rospy.Publisher("/target_vel", Float64, queue_size=10),
        "c_vel":    rospy.Publisher("/current_vel_print", Float64, queue_size=10),
        "curv":     rospy.Publisher("/curvature", Float64, queue_size=10),
        "hde":      rospy.Publisher("/heading_error", Float64, queue_size=10),
        "rmse":     rospy.Publisher("/rmse", Float64, queue_size=10),
        "penalty":  rospy.Publisher("/penalty", Float64, queue_size=10),

        "region":   rospy.Publisher("/region", String, queue_size=10),
        "decision": rospy.Publisher("/decision", String, queue_size=10),
        "m_region": rospy.Publisher("/monitoring/gpp/region", String, queue_size=10),
        "m_dec":    rospy.Publisher("/monitoring/gpp/decision", String, queue_size=10),
        "estop":    rospy.Publisher("/monitoring/gpp/estop_decision", String, queue_size=10),
        "cur_p":    rospy.Publisher("/monitoring/gpp/current_path", Int32, queue_size=10),
        "sel_p":    rospy.Publisher("/monitoring/gpp/selected_path", Int32, queue_size=10),

        "front":    rospy.Publisher("/monitoring/gpp/front_obstacle", Bool, queue_size=10),
        "side":     rospy.Publisher("/monitoring/gpp/side_obstacle", Bool, queue_size=10),
        "cam_stp":  rospy.Publisher("/monitoring/gpp/camera_stop_active", Bool, queue_size=10),
        "lc":       rospy.Publisher("/monitoring/gpp/lane_change_active", Bool, queue_size=10),
        "curve_t":  rospy.Publisher("/monitoring/gpp/curve_transition_active", Bool, queue_size=10),
        "warn":     rospy.Publisher("/monitoring/gpp/warning_hold_active", Bool, queue_size=10),

        "obs1_r":   rospy.Publisher("/monitoring/gpp/obstacle_one_role", String, queue_size=10),
        "obs2_r":   rospy.Publisher("/monitoring/gpp/obstacle_two_role", String, queue_size=10),
        "obs1_p":   rospy.Publisher("/monitoring/gpp/obstacle_one_position", Point, queue_size=10),
        "obs2_p":   rospy.Publisher("/monitoring/gpp/obstacle_two_position", Point, queue_size=10),
        "rep_p":    rospy.Publisher("/monitoring/gpp/representative_obstacle_position", Point, queue_size=10),

        "p1v":      rospy.Publisher("/monitoring/gpp/path1_valid", Bool, queue_size=10),
        "p2v":      rospy.Publisher("/monitoring/gpp/path2_valid", Bool, queue_size=10),
        "lp1n":     rospy.Publisher("/monitoring/gpp/local_path1_points", Int32, queue_size=10),
        "lp2n":     rospy.Publisher("/monitoring/gpp/local_path2_points", Int32, queue_size=10),
        "gp1n":     rospy.Publisher("/monitoring/gpp/global_path1_points", Int32, queue_size=10),
        "gp2n":     rospy.Publisher("/monitoring/gpp/global_path2_points", Int32, queue_size=10),
        "p1d":      rospy.Publisher("/monitoring/gpp/path1_nearest_distance", Float32, queue_size=10),
        "p2d":      rospy.Publisher("/monitoring/gpp/path2_nearest_distance", Float32, queue_size=10),
        "overlap":  rospy.Publisher("/monitoring/gpp/overlap_lock", Bool, queue_size=10),
        "ov_sep":   rospy.Publisher("/monitoring/gpp/overlap_separation", Float32, queue_size=10),

        "odom":     rospy.Publisher("/gps_utm_odom", Odometry, queue_size=10),
        "gp1":      rospy.Publisher("/global_path1", Path, queue_size=2, latch=True),
        "gp2":      rospy.Publisher("/global_path2", Path, queue_size=2, latch=True),
        "lp1":      rospy.Publisher("/local_path1", Path, queue_size=10),
        "lp2":      rospy.Publisher("/local_path2", Path, queue_size=10),
        "sel":      rospy.Publisher("/selected_path", Path, queue_size=10),
    }

    # camera (optional)
    try:
        from cv_bridge import CvBridge
        import cv2
        bridge = CvBridge()
        cam_pub = rospy.Publisher("/traffic_cam/image_raw", __import__("sensor_msgs.msg", fromlist=["Image"]).Image, queue_size=2)
        cam_enabled = True
    except Exception as e:
        rospy.logwarn(f"Camera disabled: {e}")
        cam_enabled = False
        bridge = cam_pub = None

    # Publish latched global paths once
    rospy.sleep(0.5)
    pubs["gp1"].publish(make_path(0.0))
    pubs["gp2"].publish(make_path(3.5))
    rospy.loginfo("dummy_publisher started (60s scenario cycle)")

    rate = rospy.Rate(30)
    t0 = time.time()
    tick = 0

    while not rospy.is_shutdown():
        t = time.time() - t0
        s = scenario(t)

        # Vehicle position on ellipse
        theta = (t * 0.05) % (2 * math.pi)
        vx = CX + RX * math.cos(theta)
        vy = CY + RY * math.sin(theta)
        yaw = theta + math.pi / 2

        # Control metrics (30 Hz)
        cte = 0.1 * math.sin(t * 1.3) + np.random.normal(0, 0.02)
        steer = 5.0 * math.sin(t * 0.8) + np.random.normal(0, 0.5)
        tv = 15.0 if s["region"] == "go" else (8.0 if s["region"] == "slow" else 10.0)
        cv = tv + np.random.normal(0, 0.3)
        curv = 0.05 * math.sin(t * 0.5)
        hde = 0.02 * math.sin(t * 0.9)

        pubs["cte"].publish(cte)
        pubs["steer"].publish(steer)
        pubs["t_vel"].publish(tv)
        pubs["c_vel"].publish(cv)
        pubs["curv"].publish(curv)
        pubs["hde"].publish(hde)
        pubs["rmse"].publish(abs(cte) * 1.5)
        pubs["penalty"].publish(0.0)

        # Odometry
        odom = Odometry()
        odom.header.stamp = rospy.Time.now()
        odom.header.frame_id = "map"
        odom.pose.pose.position.x = vx
        odom.pose.pose.position.y = vy
        qz, qw = quat_from_yaw(yaw)
        odom.pose.pose.orientation.z = qz
        odom.pose.pose.orientation.w = qw
        pubs["odom"].publish(odom)

        # 10 Hz: decision, flags, obstacles
        if tick % 3 == 0:
            pubs["region"].publish(s["region"])
            pubs["decision"].publish(s["decision"])
            pubs["m_region"].publish(s["region"])
            pubs["m_dec"].publish(s["decision"])
            pubs["estop"].publish(s["estop"])
            cur_path = 2 if s["lane_change"] else 1
            pubs["cur_p"].publish(cur_path)
            pubs["sel_p"].publish(cur_path)

            cam_stop = (int(t) % 30) < 2
            pubs["front"].publish(s["front_obs"])
            pubs["side"].publish(False)
            pubs["cam_stp"].publish(cam_stop)
            pubs["lc"].publish(s["lane_change"])
            pubs["curve_t"].publish(s["curve"])
            pubs["warn"].publish(s["warning"])

            nan_pt = Point(x=float("nan"), y=float("nan"), z=0.0)
            if s["front_obs"]:
                obs_pt = Point(x=8.0, y=0.2, z=0.0)
                pubs["obs1_r"].publish("front")
                pubs["obs1_p"].publish(obs_pt)
                pubs["rep_p"].publish(obs_pt)
            else:
                pubs["obs1_r"].publish("none")
                pubs["obs1_p"].publish(nan_pt)
                pubs["rep_p"].publish(nan_pt)
            pubs["obs2_r"].publish("none")
            pubs["obs2_p"].publish(nan_pt)

        # 5 Hz: path status
        if tick % 6 == 0:
            pubs["p1v"].publish(True)
            pubs["p2v"].publish(True)
            pubs["lp1n"].publish(50)
            pubs["lp2n"].publish(50)
            pubs["gp1n"].publish(200)
            pubs["gp2n"].publish(200)
            pubs["p1d"].publish(1.2 + 0.1 * math.sin(t))
            pubs["p2d"].publish(2.5 + 0.1 * math.cos(t))
            pubs["overlap"].publish(False)
            pubs["ov_sep"].publish(3.5)

            lp = make_local_path(vx, vy)
            pubs["lp1"].publish(lp)
            pubs["lp2"].publish(lp)
            pubs["sel"].publish(lp)

        # 15 Hz: camera
        if cam_enabled and tick % 2 == 0:
            try:
                import cv2
                img = np.zeros((480, 640, 3), dtype=np.uint8)
                img[:, :, 0] = int(128 + 127 * math.sin(t))
                img[:, :, 1] = int(128 + 127 * math.cos(t * 0.7))
                img[:, :, 2] = 50
                cv2.putText(img, f"DUMMY t={t:.1f}", (20, 50),
                            cv2.FONT_HERSHEY_SIMPLEX, 1.2, (255, 255, 255), 2)
                cam_pub.publish(bridge.cv2_to_imgmsg(img, "bgr8"))
            except Exception as e:
                rospy.logwarn_throttle(10.0, f"camera frame failed: {e}")

        tick += 1
        rate.sleep()


if __name__ == "__main__":
    try:
        main()
    except rospy.ROSInterruptException:
        pass
