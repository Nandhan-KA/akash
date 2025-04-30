# Driver Drowsiness System Setup Instructions

This document provides step-by-step instructions for setting up and running the Driver Drowsiness and Emotion Monitoring System with its new enhanced UI.

## System Overview

The system consists of two main parts:
1. **Python Backend**: Handles drowsiness detection, emotion recognition, and other core functionality
2. **Next.js Frontend**: Provides a modern, responsive user interface

## 1. Setting Up the Python Backend

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)
- Virtual environment (recommended)

### Step 1: Clone the repository (if not already done)
```bash
git clone <repository-url>
cd driver_drowsiness_emotion_monitoring_system
```

### Step 2: Create and activate a virtual environment
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python -m venv venv
source venv/bin/activate
```

### Step 3: Install the required Python packages
```bash
# Install the main project dependencies
pip install -r requirements.txt

# Install the API server dependencies
pip install -r api_requirements.txt
```

### Step 4: Download the required model files
```bash
# Download the shape predictor model
python download_shape_predictor.py
```

### Step 5: Set up environment variables
```bash
# Copy the example .env file
cp .env.txt .env

# Edit the .env file with your credentials
# Especially for Twilio if you want to use the SOS alert feature
```

### Step 6: Start the API server
```bash
python api_server.py
```

The API server will start on http://localhost:5000

## 2. Setting Up the Next.js Frontend

### Prerequisites
- Node.js 18.0 or higher
- npm or pnpm (recommended)

### Step 1: Navigate to the frontend directory
```bash
cd new_project
```

### Step 2: Install dependencies using pnpm (recommended)
```bash
# Install pnpm if you don't have it
npm install -g pnpm

# Install dependencies
pnpm install
```

If you encounter issues with pnpm, try using npm:
```bash
npm install
```

### Step 3: Create a `.env.local` file
Create a file named `.env.local` in the new_project directory with the following content:

```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### Step 4: Start the development server
```bash
pnpm dev
```

Or if using npm:
```bash
npm run dev
```

The frontend will start on http://localhost:3000

## 3. Troubleshooting npm Installation Issues

If you encounter issues with npm install:

### Solution 1: Clear npm cache
```bash
npm cache clean --force
```

### Solution 2: Delete node_modules and package-lock.json
```bash
rm -rf node_modules
rm package-lock.json
npm install
```

### Solution 3: Use a specific Node.js version
The project is tested with Node.js 18.x. Try installing this version:
```bash
# Using nvm (Node Version Manager)
nvm install 18
nvm use 18
```

### Solution 4: Check for conflicting dependencies
```bash
# Install the npm-check tool
npm install -g npm-check

# Check for outdated, incorrect or unused dependencies
npm-check
```

## 4. Using the System

1. Access the UI at http://localhost:3000
2. Make sure your webcam is connected and permissions are granted
3. Use the "Start Camera" button to begin monitoring
4. Navigate between tabs to access different features:
   - Live Monitor: Shows real-time drowsiness, emotion, phone detection and heart rate
   - Statistics: Shows system metrics
   - Alert History: Shows past alerts
   - Music Player: Control mood-based music

## 5. API Endpoints Reference

The following API endpoints are available:

- `GET /api/status` - System status
- `POST /api/frame` - Process a video frame
- `GET /api/results` - Get all detection results
- `GET /api/drowsiness` - Get drowsiness detection results
- `GET /api/emotion` - Get emotion recognition results
- `GET /api/phone` - Get phone detection results
- `GET /api/heart-rate` - Get heart rate monitoring results
- `GET /api/alert-history` - Get alert history
- `POST /api/trigger-sos` - Trigger SOS alert
- `GET /api/music/current` - Get current music information
- `POST /api/music/play` - Play music based on mood
- `POST /api/music/stop` - Stop music

## 6. Frontend Structure

- `app/` - Next.js pages and layouts
- `components/` - React components for the UI
- `styles/` - CSS and Tailwind styles
- `public/` - Static assets
- `lib/` - Utility functions and API clients 