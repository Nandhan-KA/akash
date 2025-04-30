// Local Drowsiness Detection Module
// This module handles drowsiness detection directly in the browser using TensorFlow.js

// Import TensorFlow.js (needs to be loaded in the main HTML file)
// const tf = window.tf;

// Module state
let model = null;
let isInitialized = false;
let isProcessing = false;
let lastPrediction = null;
let frameCounter = 0;
let modelPath = null;
let drowsinessThreshold = 0.7;
let consecDrowsyFrames = 0;
let drowsinessState = false;

// Constants
const FRAME_SKIP = 2;           // Process every Nth frame
const MIN_DROWSY_FRAMES = 3;    // Number of consecutive drowsy frames to trigger alert
const IMG_SIZE = 224;           // Size of image for the model

/**
 * Initialize the drowsiness detection model
 * 
 * @param {Object} config Configuration options
 * @param {string} config.modelPath Path to the TensorFlow.js model
 * @param {number} config.threshold Drowsiness threshold (0-1)
 * @returns {Promise<boolean>} True if initialization was successful
 */
async function initialize(config = {}) {
  if (!window.tf) {
    console.error('TensorFlow.js not found. Make sure it is loaded in your HTML file.');
    return false;
  }
  
  try {
    if (config.modelPath) {
      modelPath = config.modelPath;
    }
    
    if (config.threshold && config.threshold > 0 && config.threshold < 1) {
      drowsinessThreshold = config.threshold;
    }
    
    console.log(`Loading drowsiness detection model from ${modelPath}...`);
    model = await window.tf.loadLayersModel(modelPath + '/model.json');
    console.log('Model loaded successfully');
    
    // Warm up the model
    const dummyInput = window.tf.zeros([1, IMG_SIZE, IMG_SIZE, 3]);
    const warmupResult = model.predict(dummyInput);
    warmupResult.dispose();
    dummyInput.dispose();
    
    isInitialized = true;
    console.log('Local drowsiness detection initialized');
    return true;
  } catch (error) {
    console.error('Failed to initialize local drowsiness detection:', error);
    return false;
  }
}

/**
 * Preprocess the frame for the model
 * 
 * @param {HTMLVideoElement|HTMLCanvasElement|HTMLImageElement} frame Frame to process
 * @returns {tf.Tensor3D|null} Preprocessed tensor or null if processing failed
 */
function preprocessFrame(frame) {
  try {
    // Convert frame to tensor
    const tensor = window.tf.browser.fromPixels(frame);
    
    // Resize to model input size
    const resized = window.tf.image.resizeBilinear(tensor, [IMG_SIZE, IMG_SIZE]);
    
    // Normalize pixel values to 0-1
    const normalized = resized.div(255.0);
    
    // Expand dimensions to match model input shape
    const batched = normalized.expandDims(0);
    
    // Clean up intermediate tensors
    tensor.dispose();
    resized.dispose();
    normalized.dispose();
    
    return batched;
  } catch (error) {
    console.error('Error preprocessing frame:', error);
    return null;
  }
}

/**
 * Process a video frame for drowsiness detection
 * 
 * @param {HTMLVideoElement} videoElement Video element to process
 * @param {Function} callback Function to call when drowsiness state changes
 * @returns {Promise<Object|null>} Prediction result or null if processing failed
 */
async function processFrame(videoElement, callback) {
  if (!isInitialized || !model || isProcessing) {
    return null;
  }
  
  // Skip frames to reduce processing load
  if (frameCounter++ % FRAME_SKIP !== 0) {
    return lastPrediction;
  }
  
  isProcessing = true;
  
  try {
    // Create an input tensor from the video frame
    const inputTensor = preprocessFrame(videoElement);
    
    if (!inputTensor) {
      isProcessing = false;
      return null;
    }
    
    // Run the model
    const predictions = model.predict(inputTensor);
    const drowsinessProbability = predictions.dataSync()[0];
    
    // Clean up tensors
    inputTensor.dispose();
    predictions.dispose();
    
    // Update prediction
    lastPrediction = {
      isDrowsy: drowsinessProbability > drowsinessThreshold,
      probability: drowsinessProbability,
      timestamp: Date.now()
    };
    
    // Track consecutive drowsy frames
    if (lastPrediction.isDrowsy) {
      consecDrowsyFrames++;
    } else {
      consecDrowsyFrames = 0;
    }
    
    // Update state if needed
    const newDrowsinessState = consecDrowsyFrames >= MIN_DROWSY_FRAMES;
    
    if (newDrowsinessState !== drowsinessState) {
      drowsinessState = newDrowsinessState;
      
      // Call the callback function if provided
      if (typeof callback === 'function') {
        callback({
          isDrowsy: drowsinessState,
          probability: drowsinessProbability,
          timestamp: Date.now()
        });
      }
    }
    
    return lastPrediction;
  } catch (error) {
    console.error('Error processing frame:', error);
    return null;
  } finally {
    isProcessing = false;
  }
}

/**
 * Reset the detector state
 */
function resetDetector() {
  frameCounter = 0;
  consecDrowsyFrames = 0;
  lastPrediction = null;
  drowsinessState = false;
}

/**
 * Check if the detector is ready
 * 
 * @returns {boolean} True if the detector is initialized
 */
function isReady() {
  return isInitialized && model !== null;
}

// Export the module
export default {
  initialize,
  processFrame,
  resetDetector,
  isReady
}; 