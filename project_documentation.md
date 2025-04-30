# Driver Drowsiness and Emotion Monitoring System Documentation

## Proposed System

The Driver Drowsiness and Emotion Monitoring System is an advanced safety solution that combines multiple technologies to monitor driver's state and prevent accidents. The system integrates:

1. **Drowsiness Detection System**
   - Real-time eye tracking using dlib
   - Eye Aspect Ratio (EAR) calculation
   - Blink detection and frequency analysis
   - Head pose estimation
   - Yawning detection using Mouth Aspect Ratio (MAR)

2. **Emotion Recognition System**
   - Deep learning-based emotion classification
   - Real-time facial expression analysis
   - Support for multiple emotions (happy, sad, angry, neutral)
   - Confidence-based emotion detection

3. **Phone Usage Detection System**
   - YOLOv5-based object detection
   - Real-time phone detection in driver's hand
   - Warning system for phone usage
   - Integration with drowsiness alerts

4. **Heart Rate Monitoring System**
   - Real-time heart rate estimation
   - Stress level detection
   - Abnormal heart rate alerts
   - Data logging and analysis

5. **SOS Alert System**
   - Emergency contact notification
   - GPS location sharing
   - Automated emergency services contact
   - Manual trigger option
   - Alert history tracking

6. **Music Player System**
   - Mood-based music selection
   - Integration with emotion detection
   - Volume control based on drowsiness
   - Playlist management
   - Emergency override capability

## Advantages of Proposed System

1. **Enhanced Safety Features**
   - Multi-modal driver state monitoring
   - Real-time alerts for dangerous conditions
   - Automated emergency response system
   - Comprehensive safety checks

2. **Intelligent Monitoring**
   - Continuous driver state assessment
   - Pattern recognition for drowsiness
   - Emotion-based intervention
   - Adaptive warning system

3. **User Experience**
   - Intuitive web-based interface
   - Real-time visual feedback
   - Customizable alert settings
   - Easy-to-understand warnings

4. **Data Management**
   - Secure data storage
   - Historical analysis capability
   - Performance metrics tracking
   - System improvement insights

5. **Integration Benefits**
   - Seamless component interaction
   - Unified alert system
   - Coordinated response actions
   - Efficient resource utilization

## Algorithms

### 1. Drowsiness Detection Algorithm
```pseudo
Algorithm: Drowsiness Detection
Input: Video frame
Output: Drowsiness status, alerts

1. Initialize:
   - Load face detector and landmark predictor
   - Set EAR threshold = 0.25
   - Set consecutive frames threshold = 30
   - Initialize blink cooldown = 1.0 seconds
   - Set MAR threshold for yawning

2. For each frame:
   a. Preprocess:
      - Convert to grayscale
      - Apply noise reduction
      - Enhance contrast
   
   b. Face Detection:
      - Detect face using dlib detector
      - If face detected:
         - Extract 68 facial landmarks
         - Calculate EAR for both eyes
         - Calculate MAR for mouth
         - Estimate head pose angles
      
   c. Drowsiness Analysis:
      - If EAR < threshold:
         - Increment drowsy frame counter
         - If counter >= threshold:
            - Trigger primary alert
            - Play warning sound
            - Log drowsiness event
      - If MAR > threshold:
         - Detect yawning
         - Update yawn counter
         - Trigger secondary alert
      
   d. Head Pose Analysis:
      - Calculate head rotation angles
      - If angles exceed threshold:
         - Trigger attention alert
         - Update pose history

3. Return:
   - Drowsiness status
   - Alert level
   - Event logs
```

### 2. Emotion Recognition Algorithm
```pseudo
Algorithm: Emotion Recognition
Input: Video frame
Output: Detected emotion, confidence score

1. Initialize:
   - Load pre-trained CNN model
   - Define emotion classes
   - Initialize face cascade classifier
   - Set confidence threshold

2. For each frame:
   a. Face Detection:
      - Detect face using Haar Cascade
      - If face detected:
         - Extract face region
         - Apply face alignment
   
   b. Preprocessing:
      - Resize to model input size
      - Normalize pixel values
      - Apply data augmentation
   
   c. Emotion Classification:
      - Pass through CNN model
      - Get emotion probabilities
      - Apply softmax activation
      - Select top emotion
   
   d. Confidence Check:
      - Calculate confidence score
      - If confidence < threshold:
         - Return "uncertain" status
      - Update emotion history

3. Return:
   - Detected emotion
   - Confidence score
   - Emotion history
```

### 3. SOS Alert Algorithm
```pseudo
Algorithm: SOS Alert System
Input: Trigger signal, GPS coordinates
Output: Alert status, notifications

1. Initialize:
   - Load emergency contacts
   - Initialize GPS module
   - Set up communication channels
   - Load alert templates

2. Alert Trigger:
   a. Manual Trigger:
      - Check trigger button state
      - Validate user authentication
      - Log trigger event
   
   b. Automatic Trigger:
      - Check drowsiness status
      - Verify heart rate anomalies
      - Confirm phone usage
      - Log trigger conditions

3. Emergency Response:
   a. Location Sharing:
      - Get current GPS coordinates
      - Format location data
      - Prepare location message
   
   b. Contact Notification:
      - Send SMS to emergency contacts
      - Make automated calls
      - Send email notifications
      - Log notification status

4. Status Update:
   - Monitor response status
   - Update alert history
   - Generate incident report

5. Return:
   - Alert status
   - Notification confirmations
   - Incident report
```

### 4. Music Player Algorithm
```pseudo
Algorithm: Music Player System
Input: Emotion state, drowsiness level
Output: Music selection, playback control

1. Initialize:
   - Load music library
   - Initialize audio player
   - Set up emotion-music mapping
   - Configure volume levels

2. Music Selection:
   a. Emotion-based Selection:
      - Get current emotion state
      - Match with emotion-music mapping
      - Select appropriate playlist
      - Apply mood filters
   
   b. Drowsiness Adjustment:
      - Check drowsiness level
      - Adjust tempo accordingly
      - Modify volume levels
      - Update playlist priority

3. Playback Control:
   a. Volume Management:
      - Set base volume
      - Apply drowsiness modifiers
      - Handle emergency overrides
      - Smooth volume transitions
   
   b. Playlist Management:
      - Queue next tracks
      - Handle interruptions
      - Manage transitions
      - Log playback history

4. Emergency Handling:
   - Check for emergency alerts
   - Pause playback if needed
   - Resume after alert
   - Log emergency events

5. Return:
   - Current playback status
   - Volume levels
   - Playlist information
```

### 5. Phone Detection Algorithm
```pseudo
Algorithm: Phone Usage Detection
Input: Video frame
Output: Phone detection status, alerts

1. Initialize:
   - Load YOLOv5 model
   - Set confidence threshold
   - Initialize tracking system
   - Configure alert parameters

2. Detection Process:
   a. Frame Processing:
      - Resize frame for model
      - Apply preprocessing
      - Run YOLOv5 detection
      - Get bounding boxes
   
   b. Phone Tracking:
      - Track detected phones
      - Calculate movement patterns
      - Update position history
      - Filter false positives

3. Alert System:
   a. Alert Generation:
      - Check phone position
      - Calculate usage duration
      - Generate alert level
      - Prepare warning message
   
   b. Alert Management:
      - Send visual alerts
      - Play audio warnings
      - Log detection events
      - Update statistics

4. Integration:
   - Sync with drowsiness system
   - Update risk assessment
   - Modify alert priorities
   - Generate combined alerts

5. Return:
   - Detection status
   - Alert information
   - Usage statistics
```

## System Requirements

### Hardware Requirements
- Webcam (minimum 720p resolution)
- Microphone
- Speakers
- Minimum 4GB RAM
- Processor: Intel Core i3 or equivalent

### Software Requirements
- Python 3.8 or higher
- OpenCV
- TensorFlow
- dlib
- Flask
- Other dependencies listed in requirements.txt

### Network Requirements
- Internet connection for:
  - SOS alerts
  - Model updates
  - Emergency notifications

## Future Works

1. **Enhanced Detection**
   - Integration of thermal imaging
   - Advanced head pose estimation
   - Improved emotion recognition accuracy

2. **Machine Learning Improvements**
   - Real-time model adaptation
   - Personalized thresholds
   - Better false positive reduction

3. **Additional Features**
   - Driver behavior analysis
   - Route safety scoring
   - Integration with vehicle systems

4. **Mobile Application**
   - iOS/Android companion app
   - Remote monitoring
   - Emergency response integration

5. **Cloud Integration**
   - Real-time data backup
   - Fleet management features
   - Analytics dashboard

## Instructions to Run

1. **Setup Environment**
   ```bash
   # Create virtual environment
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate

   # Install dependencies
   pip install -r requirements.txt
   ```

2. **Download Required Models**
   ```bash
   # Run the shape predictor download script
   python download_shape_predictor.py
   ```

3. **Configure Environment Variables**
   - Copy `.env.txt` to `.env`
   - Update the values in `.env` with your credentials

4. **Run the Application**
   ```bash
   # Start the main application
   python drowsiness_app.py
   ```

5. **Access the Interface**
   - Open web browser
   - Navigate to `http://localhost:5000`

## Training Instructions

1. **Emotion Recognition Model**
   - Collect labeled emotion dataset
   - Preprocess images
   - Train using TensorFlow/Keras
   - Save model to `models/emotion_model.h5`

2. **Drowsiness Detection**
   - No training required
   - Uses pre-trained dlib models
   - Adjust thresholds in `config.py`

3. **Phone Detection**
   - Uses pre-trained YOLOv5 model
   - No additional training needed
   - Model file: `yolov5su.pt` 