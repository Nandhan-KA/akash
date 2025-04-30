// Drowsiness Detection Controller
// This module manages switching between local (browser-based) and backend (Python) detection

import localDetector from './localDrowsinessDetection.js';
import backendDetector from './backendDrowsinessDetection.js';

// Detection modes
const DETECTION_MODES = {
  LOCAL: 'local',
  BACKEND: 'backend'
};

// Controller state
let currentMode = DETECTION_MODES.LOCAL;
let isInitialized = false;
let activeDetector = null;
let videoElement = null;
let onDrowsinessChangeCallback = null;
let detectionInterval = null;
let options = {
  backendUrl: 'http://localhost:5000/api',
  detectionFrequency: 500,  // ms between detection attempts
  modelPath: '/models/drowsiness_model'
};

/**
 * Initialize the drowsiness detection system
 * 
 * @param {Object} config Configuration options
 * @param {string} config.mode Detection mode ('local' or 'backend')
 * @param {string} config.backendUrl URL for the backend API (required for backend mode)
 * @param {string} config.modelPath Path to the local TensorFlow.js model (required for local mode)
 * @param {number} config.detectionFrequency Frequency of detection in milliseconds
 * @returns {Promise<boolean>} True if initialization was successful
 */
async function initialize(config = {}) {
  try {
    // Reset state
    isInitialized = false;
    currentMode = config.mode || 'local';
    
    // Validate required parameters based on mode
    if (currentMode === 'backend' && !config.backendUrl) {
      console.error('Backend URL is required for backend mode');
      throw new Error('Backend URL is required for backend mode');
    }
    
    if (currentMode === 'local' && !config.modelPath) {
      console.warn('Model path not provided for local mode, using default path');
      config.modelPath = '/models/drowsiness-detection';
    }
    
    // Initialize the appropriate detector
    if (currentMode === 'local') {
      try {
        activeDetector = localDetector;
        isInitialized = await localDetector.initialize({
          modelPath: config.modelPath 
        });
      } catch (localError) {
        console.error('Failed to initialize local detector:', localError);
        // Try to fall back to backend mode if possible
        if (config.backendUrl) {
          console.log('Falling back to backend mode');
          currentMode = 'backend';
          activeDetector = backendDetector;
          isInitialized = await backendDetector.initialize(config.backendUrl);
        } else {
          throw localError;
        }
      }
    } else {
      try {
        activeDetector = backendDetector;
        isInitialized = await backendDetector.initialize(config.backendUrl);
      } catch (backendError) {
        console.error('Failed to initialize backend detector:', backendError);
        // Try to fall back to local mode if possible
        if (config.modelPath) {
          console.log('Falling back to local mode');
          currentMode = 'local';
          activeDetector = localDetector;
          isInitialized = await localDetector.initialize({
            modelPath: config.modelPath 
          });
        } else {
          throw backendError;
        }
      }
    }
    
    console.log(`Drowsiness detection initialized in ${currentMode} mode`);
    return isInitialized;
  } catch (error) {
    console.error('Failed to initialize drowsiness detection:', error);
    isInitialized = false;
    throw error; // Re-throw to allow caller to handle
  }
}

/**
 * Start continuous drowsiness detection
 * 
 * @param {HTMLVideoElement} video Video element to process
 * @param {Function} callback Function to call when drowsiness state changes
 * @returns {boolean} True if detection started successfully
 */
function startDetection(video, callback) {
  if (!isInitialized || !activeDetector) {
    console.error('Drowsiness detection not initialized');
    return false;
  }
  
  if (!video || !(video instanceof HTMLVideoElement)) {
    console.error('Invalid video element');
    return false;
  }
  
  // Stop any existing detection
  stopDetection();
  
  // Store references
  videoElement = video;
  onDrowsinessChangeCallback = callback;
  
  // Start detection loop with requestAnimationFrame for smoother performance
  let lastProcessTime = 0;
  const detectionLoop = async (timestamp) => {
    // Only process frames at the specified frequency
    if (timestamp - lastProcessTime >= options.detectionFrequency) {
      if (videoElement && videoElement.readyState === 4) {  // HAVE_ENOUGH_DATA
        try {
          await activeDetector.processFrame(videoElement, onDrowsinessChangeCallback);
        } catch (error) {
          console.error('Error processing frame:', error);
        }
        lastProcessTime = timestamp;
      }
    }
    
    // Continue the loop
    if (detectionInterval) {
      detectionInterval = requestAnimationFrame(detectionLoop);
    }
  };
  
  // Start the detection loop
  detectionInterval = requestAnimationFrame(detectionLoop);
  
  console.log(`Drowsiness detection started in ${currentMode} mode`);
  return true;
}

/**
 * Stop drowsiness detection
 */
function stopDetection() {
  if (detectionInterval) {
    cancelAnimationFrame(detectionInterval);
    detectionInterval = null;
  }
  
  if (activeDetector) {
    activeDetector.resetDetector();
  }
  
  videoElement = null;
  console.log('Drowsiness detection stopped');
}

/**
 * Switch between local and backend detection modes
 * 
 * @param {string} mode The mode to switch to ('local' or 'backend')
 * @returns {Promise<boolean>} True if switch was successful
 */
async function switchMode(mode) {
  if (!Object.values(DETECTION_MODES).includes(mode)) {
    console.error(`Invalid mode: ${mode}`);
    return false;
  }
  
  if (mode === currentMode) {
    console.log(`Already in ${mode} mode`);
    return true;
  }
  
  // Remember current state
  const wasRunning = !!detectionInterval;
  const tempVideo = videoElement;
  const tempCallback = onDrowsinessChangeCallback;
  
  // Stop current detection
  stopDetection();
  
  // Switch mode
  currentMode = mode;
  
  try {
    // Initialize the new detector
    if (currentMode === DETECTION_MODES.LOCAL) {
      activeDetector = localDetector;
      isInitialized = await localDetector.initialize({ 
        modelPath: options.modelPath 
      });
    } else {
      activeDetector = backendDetector;
      isInitialized = await backendDetector.initialize(options.backendUrl);
    }
    
    // Restart detection if it was running
    if (wasRunning && isInitialized && tempVideo) {
      startDetection(tempVideo, tempCallback);
    }
    
    console.log(`Switched to ${currentMode} detection mode`);
    return true;
  } catch (error) {
    console.error(`Failed to switch to ${mode} mode:`, error);
    
    // Try to revert to previous mode
    if (wasRunning) {
      console.log('Attempting to revert to previous mode');
      currentMode = currentMode === DETECTION_MODES.LOCAL ? DETECTION_MODES.BACKEND : DETECTION_MODES.LOCAL;
      
      try {
        if (currentMode === DETECTION_MODES.LOCAL) {
          activeDetector = localDetector;
          isInitialized = await localDetector.initialize({ modelPath: options.modelPath });
        } else {
          activeDetector = backendDetector;
          isInitialized = await backendDetector.initialize(options.backendUrl);
        }
        
        if (isInitialized && tempVideo) {
          startDetection(tempVideo, tempCallback);
        }
      } catch (e) {
        console.error('Failed to revert to previous mode:', e);
      }
    }
    
    return false;
  }
}

/**
 * Get the current detection mode
 * 
 * @returns {string} Current detection mode
 */
function getCurrentMode() {
  return currentMode;
}

/**
 * Check if drowsiness detection is ready
 * 
 * @returns {boolean} True if detector is ready
 */
function isReady() {
  return isInitialized && activeDetector && activeDetector.isReady();
}

// Export the module
export default {
  DETECTION_MODES,
  initialize,
  startDetection,
  stopDetection,
  switchMode,
  getCurrentMode,
  isReady
}; 