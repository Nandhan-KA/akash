"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Eye, EyeOff, AlertTriangle, Loader2, PlayCircle, Server, Smartphone } from "lucide-react"
import axios from 'axios'
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
// @ts-ignore
import { Button, Stack, Typography, CircularProgress, Alert, Box, Snackbar } from '@mui/material'
// @ts-ignore
import WarningIcon from '@mui/icons-material/Warning'
// @ts-ignore
import VideocamIcon from '@mui/icons-material/Videocam'
// @ts-ignore
import VideocamOffIcon from '@mui/icons-material/VideocamOff'
// @ts-ignore
import PsychologyIcon from '@mui/icons-material/Psychology'
// @ts-ignore
import SettingsIcon from '@mui/icons-material/Settings'
// @ts-ignore
import ScienceIcon from '@mui/icons-material/Science'
import DrowsinessDetectionController from '../utils/drowsinessDetectionController'

export function DrowsinessMonitor() {
  const [isWebcamActive, setIsWebcamActive] = useState(false)
  const [drowsinessLevel, setDrowsinessLevel] = useState(10)
  const [earValue, setEarValue] = useState(0.32)
  const [blinkCount, setBlinkCount] = useState(0)
  const [yawnCount, setYawnCount] = useState(0)
  const [headPose, setHeadPose] = useState({ x: 0, y: 0, z: 0 })
  const [alertStatus, setAlertStatus] = useState("normal")
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [faceDetected, setFaceDetected] = useState(false)
  const [apiStatus, setApiStatus] = useState<"idle" | "connecting" | "connected" | "failed">("idle")
  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [isLocalMode, setIsLocalMode] = useState(false)
  const [preferLocalMode, setPreferLocalMode] = useState(false)
  const [detectionMode, setDetectionMode] = useState('local')
  const [switchingMode, setSwitchingMode] = useState(false)
  const [isPythonMode, setIsPythonMode] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [isDetecting, setIsDetecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  
  const imageRef = useRef<HTMLImageElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const animationRef = useRef<number | null>(null)
  const errorCountRef = useRef<number>(0)

  // API base URL
  const API_BASE_URL = 'http://localhost:5000';

  // Clean up resources to prevent memory leaks and stuck camera
  const cleanupResources = () => {
    // Clear intervals and animation frames
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    // Stop webcam stream if active
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => {
        track.stop();
      });
      videoRef.current.srcObject = null;
    }
    
    // Reset image source to prevent frozen frames
    if (imageRef.current) {
      imageRef.current.src = '';
    }
  };

  // Connect to Python backend
  const connectToPythonBackend = async () => {
    try {
      // Check if the API server is online
      let isServerOnline = false;
      try {
        const response = await axios.get(`${API_BASE_URL}/api/status`, {
          timeout: 5000, // 5 second timeout
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        isServerOnline = response.data && response.data.status === 'online';
      } catch (error) {
        console.warn("API server is not online or not responding:", error);
        // Don't throw here, we'll handle it below
      }
      
      if (isServerOnline) {
        // Try to start the drowsiness detection
        try {
          const startResponse = await axios.get(`${API_BASE_URL}/api/start-drowsiness-detection`, {
            timeout: 5000,
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });
          
          if (startResponse.data && startResponse.data.success) {
            setIsLocalMode(false);
            errorCountRef.current = 0;
            
            // Set the video stream URL with a timestamp to prevent caching
            setStreamUrl(`${API_BASE_URL}/video_feed?timestamp=${Date.now()}`);
            
            // Setup polling for drowsiness data
            startDataPolling();
            return true;
          } else {
            console.warn("Failed to start detection:", startResponse.data.message);
            throw new Error(startResponse.data.message || 'Failed to start drowsiness detection');
          }
        } catch (startError) {
          console.error("Error starting drowsiness detection:", startError);
          throw new Error('Failed to start drowsiness detection on the server');
        }
      } else {
        console.warn("API server is not online, falling back to local mode");
        // Fall back to local mode
        setIsLocalMode(true);
        return await startLocalDetection();
      }
    } catch (error: any) {
      console.error("Error connecting to Python backend:", error);
      
      // More descriptive error message for user
      const errorMessage = error.message || 'Failed to connect to drowsiness detection service';
      setError(errorMessage);
      
      // Fall back to local mode if possible
      console.log("Falling back to local mode due to connection error");
      setIsLocalMode(true);
      return await startLocalDetection();
    }
  };
  
  // Disconnect from Python backend
  const disconnectFromPythonBackend = async () => {
    try {
      // Stop polling for data
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      
      // Only call the API if we're connected to it
      if (apiStatus === "connected") {
        try {
          // Stop the drowsiness detection service
          await axios.get(`${API_BASE_URL}/api/stop-drowsiness-detection`, { timeout: 3000 });
        } catch (error: any) {
          console.warn("Error stopping remote detection, but continuing cleanup:", error);
        }
      }
      
      // Stop local detection if active
      if (isLocalMode) {
        stopLocalDetection();
      }
      
      // Full cleanup to prevent stuck cameras
      cleanupResources();
      
      // Reset state
      setStreamUrl(null);
      setApiStatus("idle");
      setIsLocalMode(false);
      setError(null);
    } catch (error: any) {
      console.error("Error disconnecting:", error);
    }
  };
  
  // Poll for drowsiness data from Python backend
  const startDataPolling = () => {
    // Clear any existing interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    
    // Set up polling interval (every 500ms)
    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/drowsiness-data`, { timeout: 2000 });
        const data = response.data;
        
        if (data) {
          // Reset error counter on successful request
          errorCountRef.current = 0;
          
          // Update state with new data
          setEarValue(data.ear || earValue);
          setBlinkCount(data.blink_count || blinkCount);
          setYawnCount(data.yawn_count || yawnCount);
          setDrowsinessLevel(data.drowsiness_level || drowsinessLevel);
          setFaceDetected(data.face_detected || false);
          
          // Set head pose if available
          if (data.head_pose) {
      setHeadPose({
              x: data.head_pose.x || 0,
              y: data.head_pose.y || 0,
              z: data.head_pose.z || 0
            });
          }
          
          // Update alert status based on drowsiness level
          if (data.drowsiness_level > 70) {
            setAlertStatus("high");
          } else if (data.drowsiness_level > 40) {
            setAlertStatus("medium");
          } else {
            setAlertStatus("normal");
          }
        }
      } catch (error: any) {
        console.error("Error fetching drowsiness data:", error);
        
        // Increment error counter
        errorCountRef.current += 1;
        
        // If we've failed to connect to the API several times, switch to local mode
        if (apiStatus === "connected" && errorCountRef.current > 5) {
          setApiStatus("failed");
          setError("Lost connection to Python backend. Switching to browser-based detection.");
          setIsLocalMode(true);
          
          // Stop polling and start local detection
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          
          // Clean up the stuck video feed
          if (imageRef.current) {
            imageRef.current.src = '';
          }
          setStreamUrl(null);
          
          startLocalDetection();
        }
      }
    }, 500);
  };

  // Start browser-based local detection
  const startLocalDetection = async () => {
    try {
      // Wait for a short delay to ensure React has rendered the video element
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // If videoRef is not available, try to handle it gracefully
      if (!videoRef.current) {
        console.warn("Video element ref not found, attempting to create a fallback video element");
        
        // Create a new video element to work with
        const fallbackVideo = document.createElement("video");
        fallbackVideo.autoplay = true;
        fallbackVideo.muted = true;
        fallbackVideo.playsInline = true;
        
        // Attempt to add it to the DOM temporarily to ensure it works
        const container = document.querySelector(".aspect-video");
        if (container) {
          fallbackVideo.style.display = "none";
          container.appendChild(fallbackVideo);
          videoRef.current = fallbackVideo;
        } else {
          console.error("Video element not found and no suitable container for fallback");
          setError("Video element not found. Please reload the page and try again.");
          return;
        }
      }
      
      // Stop any existing streams
      if (videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      
      const constraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
      };
      
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoRef.current.srcObject = stream;
      
      // Add event listener for when video is ready
      videoRef.current.onloadedmetadata = () => {
        if (videoRef.current) {
          videoRef.current.play()
            .then(() => {
              console.log("Video playback started successfully");
              // When video is ready, try to initialize the detection controller
              if (isLocalMode) {
                // Start simulation
                simulateDetection();
              } else {
                // Initialize the detection controller now that video is ready
                initializeDetectionController();
              }
            })
            .catch((error: Error) => {
              console.error("Error starting video playback:", error);
              setError("Error starting video: " + error.message);
            });
        }
      };
      
      // Handle errors
      videoRef.current.onerror = (event) => {
        console.error("Video element error:", event);
        setError("Video error: Please check camera permissions");
      };
    } catch (error: any) {
      console.error("Error starting video:", error);
      setError("Could not access webcam. Please check permissions. Error: " + error.message);
    }
  };
  
  // Initialize the detection controller after video is ready
  const initializeDetectionController = async () => {
    try {
      setIsInitializing(true);
      setError(null);
      
      if (!videoRef.current || !videoRef.current.readyState) {
        throw new Error('Video element not ready');
      }
      
      // For local mode, check if TensorFlow.js is available
      if (isLocalMode && !isTensorFlowAvailable()) {
        throw new Error('TensorFlow.js not found. Required for browser-based detection.');
      }
      
      await DrowsinessDetectionController.initialize({
        mode: isLocalMode ? 'local' : 'backend',
        backendUrl: 'http://localhost:5000/detect',
        modelPath: '/models/drowsiness',
        detectionFrequency: 100 // 10 times per second
      });
      
      const success = await DrowsinessDetectionController.startDetection(
        videoRef.current,
        (data: any) => {
          // Update UI with drowsiness data
          if (data) {
            setEarValue(data.ear || earValue);
            setBlinkCount(data.blink_count || blinkCount);
            setYawnCount(data.yawn_count || yawnCount);
            setDrowsinessLevel(data.drowsiness_level || drowsinessLevel);
            setFaceDetected(data.face_detected || false);

      // Update alert status based on drowsiness level
            if (data.drowsiness_level > 70) {
              setAlertStatus("high");
            } else if (data.drowsiness_level > 40) {
              setAlertStatus("medium");
            } else {
              setAlertStatus("normal");
            }
          }
        }
      );
      
      if (!success) {
        throw new Error('Failed to start drowsiness detection');
      }
      
      setIsDetecting(true);
      setIsConnected(true);
    } catch (error: any) {
      console.error('Error initializing drowsiness detection:', error);
      setError(`Failed to initialize detection: ${error.message || 'Unknown error'}`);
    } finally {
      setIsInitializing(false);
    }
  };
  
  // Stop local detection
  const stopLocalDetection = () => {
    // Stop animation frame
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    // Stop webcam
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };
  
  // Simulate drowsiness detection with random values
  const simulateDetection = () => {
    // Create a simple simulation that updates values
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Draw video on canvas
    const context = canvas.getContext('2d');
    if (!context) return;
    
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    const drawVideoFrame = () => {
      try {
        // Draw video frame
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Simulated values based on time
        const time = Date.now() / 1000;
        const simulatedEAR = 0.25 + 0.1 * Math.sin(time);
        
        // Simulate blinks
        if (Math.random() > 0.95) {
          setBlinkCount(prev => prev + 1);
        }
        
        // Simulate yawns less frequently
        if (Math.random() > 0.99) {
          setYawnCount(prev => prev + 1);
        }
        
        // Update EAR value
        setEarValue(Number(simulatedEAR.toFixed(2)));
        
        // Calculate drowsiness level based on EAR
        let newDrowsinessLevel = drowsinessLevel;
        
        if (simulatedEAR < 0.25) {
          newDrowsinessLevel = Math.min(100, newDrowsinessLevel + 5);
        } else {
          newDrowsinessLevel = Math.max(0, newDrowsinessLevel - 1);
        }
        
        setDrowsinessLevel(newDrowsinessLevel);
        
        // Update alert status
      if (newDrowsinessLevel > 70) {
          setAlertStatus("high");
      } else if (newDrowsinessLevel > 40) {
          setAlertStatus("medium");
        } else {
          setAlertStatus("normal");
        }
        
        // Face is detected in simulation
        setFaceDetected(true);
        
        // Draw status text
        context.font = '16px Arial';
        context.fillStyle = 'white';
        context.fillText(`EAR: ${simulatedEAR.toFixed(2)}`, 10, 30);
        context.fillText(`Blinks: ${blinkCount}`, 10, 60);
        context.fillText(`Yawns: ${yawnCount}`, 10, 90);
        context.fillText(`Mode: Browser Simulation`, 10, 120);
        
        // Continue detection loop
        animationRef.current = requestAnimationFrame(drawVideoFrame);
      } catch (error: any) {
        console.error("Error in animation frame:", error);
        // Try to recover by restarting after a brief delay
        setTimeout(() => {
          animationRef.current = requestAnimationFrame(drawVideoFrame);
        }, 1000);
      }
    };
    
    drawVideoFrame();
  };

  // Toggle Python/JS mode
  const handleModeToggle = async () => {
    if (isWebcamActive) {
      const newMode = isLocalMode ? 'backend' : 'local';
      setSwitchingMode(true);
      setError(null);
      
      try {
        const success = await DrowsinessDetectionController.switchMode(newMode);
        if (success) {
          setIsLocalMode(!isLocalMode);
          setDetectionMode(newMode);
          console.log(`Switched to ${newMode} mode`);
        } else {
          throw new Error(`Failed to switch to ${newMode} mode`);
        }
      } catch (error: any) {
        console.error('Error switching modes:', error);
        setError(`Failed to switch modes: ${error.message || 'Unknown error'}`);
      } finally {
        setSwitchingMode(false);
      }
    } else {
      // Just toggle the mode setting if webcam is not active yet
      setIsLocalMode(!isLocalMode);
      setDetectionMode(!isLocalMode ? 'backend' : 'local');
    }
  };
  
  // Toggle between local and Python modes
  const toggleDetectionMode = () => {
    setPreferLocalMode(!preferLocalMode);
    
    // If webcam is active, restart with new mode
    if (isWebcamActive) {
      handleStopMonitoring()
        .then(() => {
          // Short delay before restarting
          setTimeout(() => {
            handleStartMonitoring();
          }, 1000);
        });
    }
  };

  // Handle starting monitoring
  const handleStartMonitoring = async () => {
    // Reset states
    setBlinkCount(0);
    setYawnCount(0);
    setDrowsinessLevel(10);
    setError(null);
    
    // Clean up any existing resources first
    await cleanupResources();
    
    // Start monitoring
    setIsWebcamActive(true);
  };

  // Handle stopping monitoring
  const handleStopMonitoring = async () => {
    setIsWebcamActive(false);
    // Full cleanup is handled in the useEffect
    await disconnectFromPythonBackend();
  };

  // Start/stop monitoring
  useEffect(() => {
    if (isWebcamActive) {
      let attemptCount = 0;
      const maxAttempts = 5;
      
      const initializeMonitoring = () => {
        // Ensure the DOM has been properly updated
        setTimeout(() => {
          if (!videoRef.current && attemptCount < maxAttempts) {
            console.log(`Video element not ready, retrying... (${attemptCount + 1}/${maxAttempts})`);
            attemptCount++;
            initializeMonitoring(); // Retry
            return;
          }
          
          if (!videoRef.current) {
            console.error("Video element not available after maximum retry attempts");
            setError("Could not initialize video element. Please refresh the page and try again.");
            return;
          }
          
          if (preferLocalMode) {
            // Start directly with local detection
            setIsLocalMode(true);
            startLocalDetection();
          } else {
            // Try to connect to Python backend first
            connectToPythonBackend();
          }
        }, 500); // Wait 500ms between attempts
      };
      
      initializeMonitoring();
    } else {
      disconnectFromPythonBackend();
    }
    
    // Cleanup on component unmount
    return () => {
      cleanupResources();
      DrowsinessDetectionController.stopDetection();
      setIsDetecting(false);
      setIsConnected(false);
    };
  }, [isWebcamActive, preferLocalMode]);

  // Handle errors from the controller
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      // Only handle errors from our controller
      if (event.message && event.message.includes('TensorFlow.js not found') && isLocalMode) {
        setError('TensorFlow.js not found. Please load it in your application for browser-based detection.');
      }
    };
    
    // Add global error listener
    window.addEventListener('error', handleError);
    
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, [isLocalMode]);

  // Add a helper method to check if TensorFlow.js is available
  const isTensorFlowAvailable = (): boolean => {
    return typeof window !== 'undefined' && 'tf' in window;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <button
          className={`px-4 py-2 rounded-md ${
            isWebcamActive
              ? "bg-gradient-to-r from-red-500 to-red-600 text-white"
              : "bg-gradient-to-r from-green-500 to-green-600 text-white"
          } shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed`}
          onClick={isWebcamActive ? handleStopMonitoring : handleStartMonitoring}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 inline animate-spin" />
              Connecting...
            </>
          ) : isWebcamActive ? (
            "Stop Monitoring"
          ) : (
            "Start Monitoring"
          )}
        </button>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Server className={`h-4 w-4 ${preferLocalMode ? 'text-gray-400' : 'text-blue-500'}`} />
            <Switch 
              id="detection-mode" 
              checked={preferLocalMode}
              onCheckedChange={toggleDetectionMode}
            />
            <Smartphone className={`h-4 w-4 ${preferLocalMode ? 'text-blue-500' : 'text-gray-400'}`} />
            <Label htmlFor="detection-mode" className="text-xs text-gray-600">
              {preferLocalMode ? "Browser Mode" : "Python Mode"}
            </Label>
          </div>

        <Badge
          variant="outline"
          className={`
            ${alertStatus === "normal" ? "border-green-500 text-green-500" : ""}
            ${alertStatus === "medium" ? "border-yellow-500 text-yellow-500" : ""}
            ${alertStatus === "high" ? "border-red-500 text-red-500" : ""}
          `}
        >
          {alertStatus === "high" && <AlertTriangle className="mr-1 h-3 w-3" />}
          {alertStatus === "normal" ? "Normal" : alertStatus === "medium" ? "Warning" : "Alert"}
        </Badge>
      </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {isLocalMode && isWebcamActive && !preferLocalMode && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 p-3 rounded-md text-sm">
          <p>Running in browser-based simulation mode. For best results with Python backend:</p>
          <ol className="list-decimal ml-5 mt-1">
            <li>Run the Python backend (run_project.py)</li>
            <li>Restart monitoring</li>
          </ol>
        </div>
      )}

      {isWebcamActive ? (
        <div className="aspect-video bg-gradient-to-br from-gray-900 to-blue-900 rounded-md flex items-center justify-center relative shadow-lg overflow-hidden">
          {/* Python backend stream */}
          {!isLocalMode && streamUrl && (
            <img 
              ref={imageRef}
              src={streamUrl}
              className="absolute inset-0 w-full h-full object-cover"
              alt="Drowsiness detection feed"
              onError={(e) => {
                console.error("Image load error, falling back to local mode");
                e.currentTarget.style.display = 'none';
                if (apiStatus === "connected") {
                  setApiStatus("failed");
                  setError("Video stream error. Switching to browser-based detection.");
                  setIsLocalMode(true);
                  startLocalDetection();
                }
              }}
            />
          )}
          
          {/* Video element for both modes */}
          <video
            ref={videoRef}
            className={`absolute inset-0 w-full h-full object-cover ${!isLocalMode ? 'hidden' : ''}`}
            playsInline
            muted
            style={{ transform: "scaleX(-1)" }}
            onError={(e) => {
              console.error("Video error:", e);
              setError("Camera error: " + (e.currentTarget.error?.message || "Unknown error"));
            }}
          />
          
          {/* Canvas for local detection */}
          {isLocalMode && (
            <canvas 
              ref={canvasRef}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
          )}

          {!faceDetected && isWebcamActive && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="text-white text-center p-4">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                <p>No face detected</p>
                <p className="text-xs mt-1">Please position your face in the camera view</p>
              </div>
            </div>
          )}

          {/* Overlay for drowsiness indicators */}
          <div className="absolute bottom-2 left-2 right-2 bg-black/70 backdrop-blur-sm text-white p-3 rounded-md text-xs">
            <div className="flex justify-between mb-1">
              <span>Drowsiness Level:</span>
              <span>{drowsinessLevel}%</span>
            </div>
            <Progress value={drowsinessLevel} className="h-1.5 mb-2">
              <div
                className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-full"
                style={{ width: `${drowsinessLevel}%` }}
              />
            </Progress>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <div className="flex justify-between">
                <span>EAR Value:</span>
                <span className="font-medium">{earValue}</span>
              </div>
              <div className="flex justify-between">
                <span>Blinks:</span>
                <span className="font-medium">{blinkCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Yawns:</span>
                <span className="font-medium">{yawnCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Mode:</span>
                <span className="truncate font-medium">
                  {isLocalMode ? "Browser" : "Python"}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="aspect-video bg-gradient-to-br from-gray-100 to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-md flex flex-col items-center justify-center shadow-md">
          {apiStatus === "connecting" ? (
            <>
              <Loader2 className="h-12 w-12 text-blue-400 mb-2 animate-spin" />
              <p className="text-gray-600 dark:text-gray-300">Connecting to drowsiness detection...</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Starting {preferLocalMode ? "browser" : "Python"} mode</p>
            </>
          ) : (
            <>
              <PlayCircle className="h-12 w-12 text-blue-400 mb-2" />
          <p className="text-gray-600 dark:text-gray-300">Camera is turned off</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Click "Start Monitoring" to begin</p>
              <p className="text-xs text-blue-500 dark:text-blue-400 mt-2">Using {preferLocalMode ? "browser-based" : "Python backend"} detection</p>
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Card className="border-none shadow-md bg-white dark:bg-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Eye className="h-4 w-4 mr-2 text-blue-500" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Blink Rate</span>
              </div>
              <span className="text-sm bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full text-blue-700 dark:text-blue-300">
                {isWebcamActive ? `${blinkCount} blinks` : "N/A"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white dark:bg-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2 text-yellow-500" />
                <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Yawn Count</span>
              </div>
              <span className="text-sm bg-yellow-50 dark:bg-yellow-900/30 px-2 py-0.5 rounded-full text-yellow-700 dark:text-yellow-300">
                {isWebcamActive ? `${yawnCount} yawns` : "N/A"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
