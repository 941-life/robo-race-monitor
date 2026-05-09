FROM ros:noetic-ros-base

RUN apt-get update && apt-get install -y \
    python3-pip \
    python3-cv-bridge \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

COPY gateway/ gateway/

EXPOSE 8000

CMD ["bash", "-c", "source /opt/ros/noetic/setup.bash && uvicorn gateway.main:app --host 0.0.0.0 --port 8000 --ws-ping-interval 20"]

