from flask import Flask, jsonify, Response, request
from flask_cors import CORS
import time
import random
import cv2
import numpy as np
import threading
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Global variables
is_detection_running = False
detection_thread = None
camera = None
last_frame = None
frame_lock = threading.Lock()

# Simulated drowsiness data
drowsiness_data = {
    "is_drowsy": False,
    "confidence": 0.0,
    "eye_aspect_ratio": 0.0,
    "yawn_count": 0,
    "blink_count": 0,
    "timestamp": 0
}

def generate_frames():
    """Generate video frames for streaming"""
    global camera, last_frame, frame_lock
    
    if camera is None:
        try:
            camera = cv2.VideoCapture(0)
            if not camera.isOpened():
                logger.error("Failed to open camera")
                return
        except Exception as e:
            logger.error(f"Error opening camera: {e}")
            return
    
    while True:
        with frame_lock:
            if last_frame is None:
                ret, frame = camera.read()
                if not ret:
                    logger.error("Failed to read from camera")
                    time.sleep(0.1)
                    continue
                last_frame = frame
            else:
                frame = last_frame.copy()
        
        # Add some visual indicators
        cv2.putText(frame, "Drowsiness Detection Active", (10, 30), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        
        # Convert to JPEG
        ret, buffer = cv2.imencode('.jpg', frame)
        if not ret:
            continue
        
        # Yield the frame
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
        
        # Small delay to control frame rate
        time.sleep(0.03)

def simulate_drowsiness_detection():
    """Simulate drowsiness detection in a separate thread"""
    global is_detection_running, drowsiness_data
    
    while is_detection_running:
        # Simulate drowsiness detection
        is_drowsy = random.random() < 0.2  # 20% chance of being drowsy
        confidence = random.uniform(0.7, 0.95)
        eye_aspect_ratio = random.uniform(0.2, 0.3)
        yawn_count = random.randint(0, 5)
        blink_count = random.randint(10, 30)
        
        # Update drowsiness data
        drowsiness_data.update({
            "is_drowsy": is_drowsy,
            "confidence": confidence,
            "eye_aspect_ratio": eye_aspect_ratio,
            "yawn_count": yawn_count,
            "blink_count": blink_count,
            "timestamp": int(time.time() * 1000)
        })
        
        # Sleep for a short time
        time.sleep(0.5)

@app.route('/status')
def status():
    """Check if the server is online"""
    return jsonify({"status": "online", "message": "Server is running"})

@app.route('/api/status')
def api_status():
    """Check if the API is online"""
    return jsonify({"status": "online", "message": "API is running"})

@app.route('/api/start-drowsiness-detection')
def start_detection():
    """Start drowsiness detection"""
    global is_detection_running, detection_thread
    
    if is_detection_running:
        return jsonify({"success": False, "message": "Detection already running"})
    
    try:
        is_detection_running = True
        detection_thread = threading.Thread(target=simulate_drowsiness_detection)
        detection_thread.daemon = True
        detection_thread.start()
        
        return jsonify({"success": True, "message": "Drowsiness detection started"})
    except Exception as e:
        logger.error(f"Error starting detection: {e}")
        return jsonify({"success": False, "message": str(e)})

@app.route('/api/stop-drowsiness-detection')
def stop_detection():
    """Stop drowsiness detection"""
    global is_detection_running, camera
    
    is_detection_running = False
    
    # Release camera if it's open
    if camera is not None:
        camera.release()
    
    return jsonify({"success": True, "message": "Drowsiness detection stopped"})

@app.route('/api/drowsiness-data')
def get_drowsiness_data():
    """Get current drowsiness data"""
    return jsonify(drowsiness_data)

@app.route('/video_feed')
def video_feed():
    """Stream video feed"""
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

if __name__ == '__main__':
    logger.info("Starting drowsiness detection server...")
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True) 