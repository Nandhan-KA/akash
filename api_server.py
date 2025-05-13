"""
API Server for Driver Drowsiness and Emotion Monitoring System
Provides REST API endpoints for the frontend UI
"""

from flask import Flask, request, jsonify, Response, send_from_directory
from flask_cors import CORS
import cv2
import base64
import threading
import time
import json
import logging
import os
from datetime import datetime
import numpy as np
import pathlib

# Import the system modules
from drowsiness_detection import DrowsinessDetector
from emotion_recognition import EmotionRecognizer
from phone_detection import PhoneDetector
from heart_rate_monitor import HeartRateMonitor
from music_player import MusicPlayer
from sos_alert import SOSAlert
from database import db

# Configure logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder='new_project/build', static_url_path='')
CORS(app)  # Enable CORS for all routes

# Thread lock for thread safety
thread_lock = threading.Lock()

# Initialize the components
try:
    drowsiness_detector = DrowsinessDetector()
    emotion_recognizer = EmotionRecognizer()
    phone_detector = PhoneDetector()
    heart_rate_monitor = HeartRateMonitor()
    music_player = MusicPlayer()
    sos_alert = SOSAlert()
    logger.info("All components initialized successfully")
except Exception as e:
    logger.error(f"Error initializing components: {str(e)}")
    # Continue execution with None to allow the server to start
    # Individual component failures will be handled during runtime

# Camera capture object
camera = None

# Global variables to store the latest frame and results
latest_frame = None
latest_results = {
    "drowsiness": {
        "ear_value": 0.0,
        "is_drowsy": False,
        "blink_count": 0,
        "yawn_count": 0,
        "head_pose": {"x": 0, "y": 0, "z": 0},
        "drowsiness_level": 0,
        "alert_status": "normal",
        "face_detected": False
    },
    "emotion": {
        "current_emotion": "neutral",
        "confidence": 0.0,
        "emotion_history": []
    },
    "phone": {
        "is_detected": False,
        "confidence": 0.0,
        "last_detected": None
    },
    "heart_rate": {
        "bpm": 0,
        "status": "normal",
        "history": []
    }
}

# Make sure the static folder exists
static_folder = pathlib.Path('static')
if not static_folder.exists():
    static_folder.mkdir(parents=True)
    # Create a default placeholder image if it doesn't exist
    placeholder_path = static_folder / 'placeholder.jpg'
    if not placeholder_path.exists():
        # Create a simple black image
        black_img = np.zeros((480, 640, 3), dtype=np.uint8)
        cv2.putText(black_img, "No video feed available", (120, 240), 
                   cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        cv2.imwrite(str(placeholder_path), black_img)

# Thread to process frames
def process_frames():
    global latest_frame, latest_results
    logger.info("Frame processing thread started")
    
    while True:
        with thread_lock:
            frame = latest_frame
        
        if frame is not None:
            # Create a copy to avoid modifying the original frame
            frame_copy = frame.copy()
            
            try:
                # Process with drowsiness detector
                if hasattr(drowsiness_detector, 'process_frame'):
                    drowsy_result = drowsiness_detector.process_frame(frame_copy)
                elif hasattr(drowsiness_detector, 'detect_drowsiness'):
                    # Backward compatibility
                    processed_frame, is_drowsy, ear = drowsiness_detector.detect_drowsiness(frame_copy)
                    drowsy_result = {
                        "ear": ear,
                        "is_drowsy": is_drowsy,
                        "blink_count": latest_results["drowsiness"]["blink_count"] + (1 if ear < 0.25 else 0),
                        "yawn_count": latest_results["drowsiness"]["yawn_count"],
                        "head_pose": latest_results["drowsiness"]["head_pose"],
                        "face_detected": True
                    }
                else:
                    logger.warning("Drowsiness detector doesn't have process_frame or detect_drowsiness method")
                    drowsy_result = None
                
                if drowsy_result:
                    with thread_lock:
                        latest_results["drowsiness"]["ear_value"] = drowsy_result.get("ear", 0.0)
                        latest_results["drowsiness"]["is_drowsy"] = drowsy_result.get("is_drowsy", False)
                        latest_results["drowsiness"]["blink_count"] = drowsy_result.get("blink_count", latest_results["drowsiness"]["blink_count"])
                        latest_results["drowsiness"]["yawn_count"] = drowsy_result.get("yawn_count", latest_results["drowsiness"]["yawn_count"])
                        latest_results["drowsiness"]["face_detected"] = drowsy_result.get("face_detected", True)
                        latest_results["drowsiness"]["head_pose"] = drowsy_result.get("head_pose", latest_results["drowsiness"]["head_pose"])
                        
                        # Calculate drowsiness level (0-100)
                        if drowsy_result.get("is_drowsy", False):
                            latest_results["drowsiness"]["drowsiness_level"] = min(100, latest_results["drowsiness"]["drowsiness_level"] + 5)
                        else:
                            latest_results["drowsiness"]["drowsiness_level"] = max(0, latest_results["drowsiness"]["drowsiness_level"] - 2)
                        
                        # Update alert status
                        if latest_results["drowsiness"]["drowsiness_level"] > 70:
                            latest_results["drowsiness"]["alert_status"] = "high"
                        elif latest_results["drowsiness"]["drowsiness_level"] > 40:
                            latest_results["drowsiness"]["alert_status"] = "medium"
                        else:
                            latest_results["drowsiness"]["alert_status"] = "normal"
            except Exception as e:
                logger.error(f"Error in drowsiness detection: {str(e)}")
            
            try:
                # Process with emotion recognizer
                if hasattr(emotion_recognizer, 'process_frame'):
                    emotion_result = emotion_recognizer.process_frame(frame_copy)
                    
                    if emotion_result:
                        with thread_lock:
                            latest_results["emotion"]["current_emotion"] = emotion_result.get("emotion", "neutral")
                            latest_results["emotion"]["confidence"] = emotion_result.get("confidence", 0.0)
                            
                            # Add to emotion history
                            latest_results["emotion"]["emotion_history"].append({
                                "emotion": latest_results["emotion"]["current_emotion"],
                                "confidence": latest_results["emotion"]["confidence"],
                                "timestamp": datetime.now().isoformat()
                            })
                            
                            # Keep only last 20 entries
                            if len(latest_results["emotion"]["emotion_history"]) > 20:
                                latest_results["emotion"]["emotion_history"] = latest_results["emotion"]["emotion_history"][-20:]
            except Exception as e:
                logger.error(f"Error in emotion recognition: {str(e)}")
            
            try:
                # Process with phone detector
                if hasattr(phone_detector, 'process_frame'):
                    phone_result = phone_detector.process_frame(frame_copy)
                    
                    if phone_result:
                        with thread_lock:
                            latest_results["phone"]["is_detected"] = phone_result.get("is_detected", False)
                            latest_results["phone"]["confidence"] = phone_result.get("confidence", 0.0)
                            
                            if latest_results["phone"]["is_detected"]:
                                latest_results["phone"]["last_detected"] = datetime.now().isoformat()
            except Exception as e:
                logger.error(f"Error in phone detection: {str(e)}")
            
            try:
                # Process with heart rate monitor
                if hasattr(heart_rate_monitor, 'process_frame'):
                    heart_result = heart_rate_monitor.process_frame(frame_copy)
                    
                    if heart_result:
                        with thread_lock:
                            latest_results["heart_rate"]["bpm"] = heart_result.get("bpm", 0)
                            latest_results["heart_rate"]["status"] = heart_result.get("status", "normal")
                            
                            # Add to heart rate history
                            latest_results["heart_rate"]["history"].append({
                                "bpm": latest_results["heart_rate"]["bpm"],
                                "status": latest_results["heart_rate"]["status"],
                                "timestamp": datetime.now().isoformat()
                            })
                            
                            # Keep only last 20 entries
                            if len(latest_results["heart_rate"]["history"]) > 20:
                                latest_results["heart_rate"]["history"] = latest_results["heart_rate"]["history"][-20:]
            except Exception as e:
                logger.error(f"Error in heart rate monitoring: {str(e)}")
        
        time.sleep(0.1)  # Sleep to avoid high CPU usage

# Variable to track the processing thread
processing_thread = None

@app.route('/api/status', methods=['GET'])
def get_status():
    """Get the status of all components"""
    global processing_thread
    
    is_processing = False
    if processing_thread and processing_thread.is_alive():
        is_processing = True
    
    return jsonify({
        "status": "online",
        "timestamp": datetime.now().isoformat(),
        "is_processing": is_processing,
        "components": {
            "drowsiness_detector": "active" if drowsiness_detector else "inactive",
            "emotion_recognizer": "active" if emotion_recognizer else "inactive",
            "phone_detector": "active" if phone_detector else "inactive",
            "heart_rate_monitor": "active" if heart_rate_monitor else "inactive",
            "music_player": "active" if music_player else "inactive",
            "sos_alert": "active" if sos_alert else "inactive"
        }
    })

@app.route('/api/frame', methods=['POST'])
def process_frame():
    """Process a frame from the webcam"""
    global latest_frame
    
    if not request.is_json:
        return jsonify({"error": "Expected JSON request"}), 400
        
    if 'frame' not in request.json:
        return jsonify({"error": "No frame data provided"}), 400
    
    # Decode the base64 frame
    try:
        frame_data = request.json['frame']
        frame_data = frame_data.split(',')[1] if ',' in frame_data else frame_data
        frame_bytes = base64.b64decode(frame_data)
        np_arr = np.frombuffer(frame_bytes, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        
        if frame is None:
            return jsonify({"error": "Failed to decode image"}), 400
            
        with thread_lock:
            latest_frame = frame
        
        return jsonify({"status": "success", "message": "Frame received"})
    except Exception as e:
        logger.error(f"Error processing frame: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/results', methods=['GET'])
def get_results():
    """Get the latest processing results"""
    with thread_lock:
        results = latest_results.copy()
    return jsonify(results)

@app.route('/api/drowsiness', methods=['GET'])
def get_drowsiness():
    """Get drowsiness detection results"""
    with thread_lock:
        drowsiness = latest_results["drowsiness"].copy()
    return jsonify(drowsiness)

@app.route('/api/emotion', methods=['GET'])
def get_emotion():
    """Get emotion recognition results"""
    with thread_lock:
        emotion = latest_results["emotion"].copy()
    return jsonify(emotion)

@app.route('/api/phone', methods=['GET'])
def get_phone():
    """Get phone detection results"""
    with thread_lock:
        phone = latest_results["phone"].copy()
    return jsonify(phone)

@app.route('/api/heart-rate', methods=['GET'])
def get_heart_rate():
    """Get heart rate monitoring results"""
    with thread_lock:
        heart_rate = latest_results["heart_rate"].copy()
    return jsonify(heart_rate)

@app.route('/api/alert-history', methods=['GET'])
def get_alert_history():
    """Get alert history from the database"""
    try:
        alerts = db.get_all_alerts()
        return jsonify(alerts)
    except Exception as e:
        logger.error(f"Error getting alert history: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/trigger-sos', methods=['POST'])
def trigger_sos():
    """Trigger the SOS alert"""
    if not request.is_json:
        return jsonify({"error": "Expected JSON request"}), 400
        
    reason = request.json.get('reason', 'Manual trigger')
    
    try:
        sos_alert.trigger_alert(reason)
        db.log_alert("sos", f"SOS Alert triggered: {reason}")
        
        return jsonify({"status": "success", "message": "SOS Alert triggered"})
    except Exception as e:
        logger.error(f"Error triggering SOS alert: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/music/current', methods=['GET'])
def get_current_music():
    """Get the current music playing information"""
    try:
        music_info = music_player.get_current_music()
        return jsonify(music_info)
    except Exception as e:
        logger.error(f"Error getting current music: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/music/play', methods=['POST'])
def play_music():
    """Play music based on mood"""
    if not request.is_json:
        return jsonify({"error": "Expected JSON request"}), 400
        
    mood = request.json.get('mood', None)
    
    if not mood:
        return jsonify({"error": "No mood specified"}), 400
    
    try:
        music_player.play_for_mood(mood)
        return jsonify({"status": "success", "message": f"Playing music for mood: {mood}"})
    except Exception as e:
        logger.error(f"Error playing music: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/music/stop', methods=['POST'])
def stop_music():
    """Stop the music player"""
    try:
        music_player.stop()
        return jsonify({"status": "success", "message": "Music stopped"})
    except Exception as e:
        logger.error(f"Error stopping music: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/drowsiness-data', methods=['GET'])
def get_drowsiness_data():
    """Get drowsiness detection data formatted for the frontend"""
    with thread_lock:
        data = {
            "ear": latest_results["drowsiness"]["ear_value"],
            "blink_count": latest_results["drowsiness"]["blink_count"],
            "yawn_count": latest_results["drowsiness"]["yawn_count"],
            "drowsiness_level": latest_results["drowsiness"]["drowsiness_level"],
            "face_detected": latest_results["drowsiness"]["face_detected"],
            "head_pose": {
                "x": latest_results["drowsiness"]["head_pose"]["x"],
                "y": latest_results["drowsiness"]["head_pose"]["y"],
                "z": latest_results["drowsiness"]["head_pose"]["z"]
            }
        }
    return jsonify(data)

def initialize_camera():
    """Initialize the camera if not already initialized"""
    global camera
    
    try:
        if camera is None:
            camera = cv2.VideoCapture(0)
            if not camera.isOpened():
                raise Exception("Failed to open camera")
        return True
    except Exception as e:
        logger.error(f"Error initializing camera: {str(e)}")
        return False

def release_camera():
    """Release the camera resources"""
    global camera
    
    try:
        if camera is not None:
            camera.release()
            camera = None
    except Exception as e:
        logger.error(f"Error releasing camera: {str(e)}")

@app.route('/api/start-drowsiness-detection', methods=['GET'])
def start_drowsiness_detection():
    """Start the drowsiness detection system"""
    global latest_frame, processing_thread, camera
    
    try:
        # Initialize camera
        if not initialize_camera():
            return jsonify({"success": False, "message": "Failed to initialize camera"})
        
        # Read a frame from the camera
        ret, frame = camera.read()
        if not ret:
            return jsonify({"success": False, "message": "Failed to read from camera"})
        
        # Update latest frame
        with thread_lock:
            latest_frame = frame
        
        # Start processing thread if not running
        if processing_thread is None or not processing_thread.is_alive():
            processing_thread = threading.Thread(target=process_frames)
            processing_thread.daemon = True
            processing_thread.start()
            logger.info("Started drowsiness detection processing thread")
        
        return jsonify({"success": True, "message": "Drowsiness detection started"})
    except Exception as e:
        logger.error(f"Error starting drowsiness detection: {str(e)}")
        return jsonify({"success": False, "message": f"Error: {str(e)}"})

@app.route('/api/stop-drowsiness-detection', methods=['GET'])
def stop_drowsiness_detection():
    """Stop the drowsiness detection system"""
    global latest_frame
    
    try:
        # Clear latest frame to stop processing but keep thread running
        with thread_lock:
            latest_frame = None
        
        # Release camera
        release_camera()
        
        return jsonify({"success": True, "message": "Drowsiness detection stopped"})
    except Exception as e:
        logger.error(f"Error stopping drowsiness detection: {str(e)}")
        return jsonify({"success": False, "message": f"Error: {str(e)}"})

@app.route('/video_feed')
def video_feed():
    """Return a video feed with drowsiness detection"""
    def generate():
        placeholder_path = os.path.join('static', 'placeholder.jpg')
        
        # Make sure placeholder image exists
        if not os.path.exists(placeholder_path):
            # Create a simple black image as placeholder
            black_img = np.zeros((480, 640, 3), dtype=np.uint8)
            cv2.putText(black_img, "No video feed available", (120, 240), 
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
            cv2.imwrite(placeholder_path, black_img)
        
        while True:
            with thread_lock:
                frame_copy = latest_frame.copy() if latest_frame is not None else None
            
            if frame_copy is not None:
                try:
                    # Add drowsiness detection visualizations
                    with thread_lock:
                        drowsy = latest_results["drowsiness"]["is_drowsy"]
                        ear = latest_results["drowsiness"]["ear_value"]
                        blink_count = latest_results["drowsiness"]["blink_count"]
                        yawn_count = latest_results["drowsiness"]["yawn_count"]
                    
                    # Draw status
                    status = "Drowsy" if drowsy else "Alert"
                    color = (0, 0, 255) if drowsy else (0, 255, 0)
                    cv2.putText(frame_copy, f"Status: {status}", (10, 30), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
                    cv2.putText(frame_copy, f"EAR: {ear:.2f}", (10, 60),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                    cv2.putText(frame_copy, f"Blinks: {blink_count}", (10, 90),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                    cv2.putText(frame_copy, f"Yawns: {yawn_count}", (10, 120),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                    
                    # Encode the frame as JPEG
                    ret, jpeg = cv2.imencode('.jpg', frame_copy)
                    if not ret:
                        raise Exception("Failed to encode frame")
                    
                    frame_bytes = jpeg.tobytes()
                except Exception as e:
                    logger.error(f"Error processing video frame: {str(e)}")
                    # Use placeholder on error
                    with open(placeholder_path, 'rb') as f:
                        frame_bytes = f.read()
            else:
                # Return a placeholder image
                try:
                    with open(placeholder_path, 'rb') as f:
                        frame_bytes = f.read()
                except Exception as e:
                    logger.error(f"Error reading placeholder image: {str(e)}")
                    # Create an emergency placeholder
                    black_img = np.zeros((480, 640, 3), dtype=np.uint8)
                    cv2.putText(black_img, "No video feed available", (120, 240), 
                               cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
                    ret, jpeg = cv2.imencode('.jpg', black_img)
                    frame_bytes = jpeg.tobytes()
            
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
                
            time.sleep(0.033)  # ~30 FPS
    
    return Response(generate(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

def cleanup():
    """Clean up resources before shutting down"""
    logger.info("Cleaning up resources...")
    release_camera()
    
    # Clean up components
    if hasattr(drowsiness_detector, 'cleanup'):
        try:
            drowsiness_detector.cleanup()
        except Exception as e:
            logger.error(f"Error cleaning up drowsiness detector: {str(e)}")
    
    logger.info("Cleanup complete")

# Register cleanup function to run at exit
import atexit
atexit.register(cleanup)

@app.route('/detect/status', methods=['GET', 'OPTIONS'])
def detect_status():
    """Status endpoint for the frontend detector"""
    # Handle OPTIONS requests for CORS preflight
    if request.method == 'OPTIONS':
        response = app.make_default_options_response()
        response.headers.add('Access-Control-Allow-Methods', 'GET')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response
        
    return jsonify({
        "status": "online",
        "timestamp": datetime.now().isoformat()
    })

@app.route('/detect', methods=['POST', 'OPTIONS'])
def detect_frame():
    """Compatibility endpoint that forwards to /api/frame"""
    # Handle OPTIONS requests for CORS preflight
    if request.method == 'OPTIONS':
        response = app.make_default_options_response()
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response
        
    # Forward to the process_frame function
    return process_frame()

if __name__ == '__main__':
    logger.info("Starting API server on port 5000")
    try:
        app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
    except Exception as e:
        logger.error(f"Error starting server: {str(e)}")
        cleanup() 