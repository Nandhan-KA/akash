"use client"

import React, { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Camera, Loader2 } from "lucide-react"
import * as tf from '@tensorflow/tfjs'
import '@tensorflow/tfjs-backend-webgl'
import * as cocoSsd from '@tensorflow-models/coco-ssd'

// Initialize TensorFlow.js backend
tf.setBackend('webgl').catch(err => {
  console.error('Failed to set WebGL backend:', err);
});

export function PhoneDetection() {
  const [isActive, setIsActive] = useState(false)
  const [phoneDetected, setPhoneDetected] = useState(false)
  const [detectionConfidence, setDetectionConfidence] = useState(0)
  const [detectionHistory, setDetectionHistory] = useState<{ detected: boolean; timestamp: number; confidence: number }[]>([])
  const [alertLevel, setAlertLevel] = useState<"none" | "medium" | "high">("none")
  const [isModelLoading, setIsModelLoading] = useState(false)
  const [modelLoadError, setModelLoadError] = useState<string | null>(null)
  const [phoneUsing, setPhoneUsing] = useState(false)
  const [phonePosition, setPhonePosition] = useState<{x: number, y: number, width: number, height: number}>({ 
    x: 0, y: 0, width: 0, height: 0 
  });

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const modelRef = useRef<any>(null)
  const animationRef = useRef<number | null>(null)

  // Classes that the COCO-SSD model can detect (we're interested in "cell phone" which is index 67)
  const PHONE_CLASS_ID = 67

  // Load TensorFlow model
  const loadModel = async () => {
    try {
      setIsModelLoading(true);
      setModelLoadError(null);

      // Set backend to WebGL for better performance
      await tf.setBackend("webgl");
      console.log("TensorFlow.js loaded with WebGL backend");

      // Simplified approach to load COCO-SSD model
      try {
        // Use a simple approach without custom paths
        const model = await cocoSsd.load();
        console.log("COCO-SSD model loaded successfully");
        modelRef.current = model;
      } catch (err) {
        console.error("Failed to load COCO-SSD model:", err);
        throw err;
      }

      setIsModelLoading(false);
      return true;
    } catch (error) {
      console.error("Failed to load model:", error);
      setModelLoadError("Failed to load phone detection model. Switching to simulation mode.");
      setIsModelLoading(false);
      
      // Create a mock model for simulation
      modelRef.current = {
        detect: async (img: HTMLVideoElement) => {
          // Return simulated results with 25% chance to detect a phone
          const shouldDetectPhone = Math.random() > 0.75;
          if (shouldDetectPhone) {
            return [{
              bbox: [100, 100, 200, 200],
              class: 'cell phone',
              score: 0.5 + (Math.random() * 0.3)
            }];
          }
          return [];
        }
      };
      
      return true; // Still return true so video processing continues with simulation
    }
  };

  // Setup webcam
  const setupWebcam = async () => {
    if (!videoRef.current) return false

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 640, height: 480 },
        audio: false,
      })

      videoRef.current.srcObject = stream

      return new Promise<boolean>((resolve) => {
        if (videoRef.current) {
          videoRef.current.onloadedmetadata = () => {
            resolve(true)
          }
        } else {
          resolve(false)
        }
      })
    } catch (error) {
      console.error("Error accessing webcam:", error)
      setModelLoadError("Could not access webcam. Please check permissions.")
      return false
    }
  }

  // Detect objects in video frame
  const detectObjects = async () => {
    try {
      if (!modelRef.current || !videoRef.current || !canvasRef.current) return;
      
      if (videoRef.current.readyState === 4) {
        // Get video properties
        const video = videoRef.current;
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        
        // Set canvas dimensions to match video
        const canvas = canvasRef.current;
        canvas.width = videoWidth;
        canvas.height = videoHeight;
        
        // Make predictions
        const predictions = await modelRef.current.detect(video);
        
        // Process predictions to find phones
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          // Draw video frame
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          let phoneDetected = false;
          let highestScore = 0;
          let localPhonePosition = { x: 0, y: 0, width: 0, height: 0 };
          
          // Draw bounding boxes for detected objects
          predictions.forEach((prediction: cocoSsd.DetectedObject) => {
            if (prediction.class === 'cell phone' && prediction.score > 0.50) {
              phoneDetected = true;
              
              // Update the highest confidence score
              if (prediction.score > highestScore) {
                highestScore = prediction.score;
                // Store the position of the highest confidence phone
                const newPosition = {
                  x: prediction.bbox[0],
                  y: prediction.bbox[1],
                  width: prediction.bbox[2],
                  height: prediction.bbox[3]
                };
                localPhonePosition = newPosition;
                // Update state with new position
                setPhonePosition(newPosition);
              }
              
              // Draw bounding box
              ctx.strokeStyle = '#FF0000';
              ctx.lineWidth = 4;
              ctx.strokeRect(
                prediction.bbox[0], prediction.bbox[1], 
                prediction.bbox[2], prediction.bbox[3]
              );
              
              // Calculate position in the frame to determine if phone is being used
              const centerX = prediction.bbox[0] + (prediction.bbox[2] / 2);
              const centerY = prediction.bbox[1] + (prediction.bbox[3] / 2);
              
              // Phone is likely being used if it's in the bottom half of the frame
              const isLikelyUsing = centerY > (canvas.height / 2);
              setPhoneUsing(isLikelyUsing);
              
              // Draw label with accurate percentage
              ctx.fillStyle = '#FF0000';
              ctx.font = '24px Arial';
              const confidenceText = `${prediction.class}: ${Math.round(prediction.score * 100)}%`;
              ctx.fillText(
                confidenceText,
                prediction.bbox[0], 
                prediction.bbox[1] > 20 ? prediction.bbox[1] - 5 : prediction.bbox[1] + 20
              );
              
              // Draw additional information about phone position
              ctx.fillStyle = '#FFFF00';
              ctx.font = '16px Arial';
              ctx.fillText(
                `Position: ${Math.round(centerX)},${Math.round(centerY)}`,
                prediction.bbox[0],
                prediction.bbox[1] > 40 ? prediction.bbox[1] - 30 : prediction.bbox[1] + 45
              );
            }
          });
          
          // Update phone detection status with accurate confidence
          setPhoneDetected(phoneDetected);
          setDetectionConfidence(phoneDetected ? Math.round(highestScore * 100) : 0);
          
          // Set alert level based on actual confidence
          if (phoneDetected && highestScore > 0.8) {
            setAlertLevel("high");
          } else if (phoneDetected) {
            setAlertLevel("medium");
          } else {
            setAlertLevel("none");
          }
          
          // Add to history if there's a change or every 3 seconds
          const shouldAddToHistory =
            detectionHistory.length === 0 ||
            detectionHistory[0].detected !== phoneDetected ||
            Date.now() - detectionHistory[0].timestamp > 3000;

          if (shouldAddToHistory) {
            setDetectionHistory((prev) => {
              const newHistory = [{ 
                detected: phoneDetected, 
                timestamp: Date.now(),
                confidence: phoneDetected ? Math.round(highestScore * 100) : 0
              }, ...prev];
              return newHistory.slice(0, 10); // Keep only last 10 entries
            });
          }
        }
      }
      
      // Continue detection loop
      animationRef.current = requestAnimationFrame(detectObjects);
    } catch (error) {
      console.error("Detection error:", error);
      // Continue detection loop even if there's an error
      animationRef.current = requestAnimationFrame(detectObjects);
    }
  };

  // Start/stop detection
  useEffect(() => {
    if (isActive) {
      const startDetection = async () => {
        // Load model if not already loaded
        if (!modelRef.current) {
          const modelLoaded = await loadModel()
          if (!modelLoaded) return
        }

        // Setup webcam
        const webcamReady = await setupWebcam()
        if (!webcamReady) return

        // Start detection loop
        if (videoRef.current) {
          videoRef.current.play()
          detectObjects()
        }
      }

      startDetection()
    } else {
      // Stop detection loop
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }

      // Stop webcam
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach((track) => track.stop())
        videoRef.current.srcObject = null
      }
    }

    return () => {
      // Cleanup on component unmount
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }

      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [isActive])

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <button
          className={`px-4 py-2 rounded-md ${
            isActive
              ? "bg-gradient-to-r from-red-500 to-red-600 text-white"
              : "bg-gradient-to-r from-green-500 to-green-600 text-white"
          } shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed`}
          onClick={() => setIsActive(!isActive)}
          disabled={isModelLoading}
        >
          {isModelLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 inline animate-spin" />
              Loading Model...
            </>
          ) : isActive ? (
            "Stop Detection"
          ) : (
            "Start Detection"
          )}
        </button>

        {isActive && (
          <Badge
            variant="outline"
            className={`
              ${alertLevel === "none" ? "border-green-500 text-green-500" : ""}
              ${alertLevel === "medium" ? "border-yellow-500 text-yellow-500" : ""}
              ${alertLevel === "high" ? "border-red-500 text-red-500" : ""}
            `}
          >
            {alertLevel === "high" && <AlertTriangle className="mr-1 h-3 w-3" />}
            {alertLevel === "none" ? "No Phone" : alertLevel === "medium" ? "Warning" : "Alert"}
          </Badge>
        )}
      </div>

      {modelLoadError && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md text-sm">
          {modelLoadError}
        </div>
      )}

      <div className="aspect-video bg-gradient-to-br from-gray-100 to-red-50 dark:from-gray-800 dark:to-red-900/30 rounded-md flex items-center justify-center relative shadow-md overflow-hidden">
        {isActive ? (
          <>
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              muted
              style={{ display: "none" }}
            />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />

            {/* Overlay for detection info */}
            <div className="absolute bottom-2 left-2 right-2 bg-black/70 backdrop-blur-sm text-white p-3 rounded-md text-xs">
              <div className="flex justify-between items-center mb-1">
                <span>Phone Detection:</span>
                <span className={`font-medium ${phoneDetected ? "text-red-400" : "text-green-400"}`}>
                  {phoneDetected ? `Detected (${detectionConfidence}%)` : "Not Detected"}
                </span>
              </div>
              {phoneDetected && (
                <>
                  <div className="flex justify-between items-center mb-1">
                    <span>Position:</span>
                    <span className="font-medium text-yellow-400">
                      X: {Math.round(phonePosition.x + phonePosition.width/2)}, 
                      Y: {Math.round(phonePosition.y + phonePosition.height/2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Phone Usage:</span>
                    <span className={`font-medium ${phoneUsing ? "text-red-400" : "text-amber-400"}`}>
                      {phoneUsing ? "Likely Being Used" : "Detected But Not In Use"}
                    </span>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center">
            <Camera className="h-12 w-12 text-red-400 mb-2" />
            <p className="text-gray-600 dark:text-gray-300">Phone detection is turned off</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Click "Start Detection" to begin monitoring</p>
          </div>
        )}
      </div>

      <Card className="border-none shadow-md bg-white dark:bg-gray-800">
        <CardContent className="p-4">
          <h3 className="text-sm font-medium mb-2 text-red-600 dark:text-red-400">Detection History</h3>
          {detectionHistory.length > 0 ? (
            <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
              {detectionHistory.map((entry, index) => (
                <div key={index} className="flex justify-between text-xs p-1.5 rounded-md bg-gray-50 dark:bg-gray-700">
                  <span className={`font-medium ${entry.detected ? "text-red-500" : "text-green-500"}`}>
                    {entry.detected ? `Phone (${entry.confidence}%)` : "No Phone"}
                  </span>
                  <span className="text-gray-500">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500">No detection history yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
