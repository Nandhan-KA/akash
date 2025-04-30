# Driver Drowsiness and Emotion Monitoring System Setup and Run Script
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "Driver Drowsiness and Emotion Monitoring System" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# Set working directory to script location
Set-Location -Path $PSScriptRoot

# Function to check if a command exists
function Test-CommandExists {
    param ($command)
    
    $exists = $null -ne (Get-Command $command -ErrorAction SilentlyContinue)
    return $exists
}

# Function to install dlib
function Install-Dlib {
    Write-Host "Downloading and installing pre-built dlib wheel..." -ForegroundColor Yellow
    
    # Upgrade pip first
    python -m pip install --upgrade pip
    
    # Direct link to pre-built dlib wheel
    $dlibWheel = "https://github.com/Murtaza-Saeed/Dlib-Precompiled-Wheels-for-Python-on-Windows-x64-Easy-Installation/raw/master/dlib-19.19.0-cp38-cp38-win_amd64.whl"
    
    Write-Host "Installing dlib from $dlibWheel"
    python -m pip install $dlibWheel
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "WARNING: Failed to install pre-built dlib. Trying alternative method..." -ForegroundColor Yellow
        python -m pip install dlib==19.19.0
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "WARNING: Failed to install dlib. Some features may not work properly." -ForegroundColor Red
            return $false
        } else {
            Write-Host "Successfully installed dlib 19.19.0" -ForegroundColor Green
            return $true
        }
    } else {
        Write-Host "Successfully installed pre-built dlib" -ForegroundColor Green
        return $true
    }
}

# Function to download JavaScript models
function Download-JavaScriptModels {
    Write-Host "Checking for JavaScript detection models..." -ForegroundColor Yellow
    
    # Directory for models
    $modelsDir = "new_project\public\models"
    
    if (-not (Test-Path $modelsDir)) {
        Write-Host "Creating models directory..." -ForegroundColor Yellow
        New-Item -Path $modelsDir -ItemType Directory -Force | Out-Null
    }
    
    # Face API models for emotion recognition
    $faceApiModelsDir = "$modelsDir\face-api"
    if (-not (Test-Path $faceApiModelsDir)) {
        Write-Host "Downloading face-api.js models for emotion recognition..." -ForegroundColor Yellow
        New-Item -Path $faceApiModelsDir -ItemType Directory -Force | Out-Null
        
        # Define model URLs to download
        $faceApiModels = @(
            "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-weights_manifest.json",
            "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-shard1",
            "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_expression_model-weights_manifest.json",
            "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_expression_model-shard1",
            "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-weights_manifest.json",
            "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-shard1"
        )
        
        foreach ($model in $faceApiModels) {
            $modelFile = Split-Path $model -Leaf
            $output = "$faceApiModelsDir\$modelFile"
            Write-Host "  Downloading $modelFile..." -ForegroundColor Yellow
            try {
                Invoke-WebRequest -Uri $model -OutFile $output
                Write-Host "  Successfully downloaded $modelFile" -ForegroundColor Green
            } catch {
                Write-Host "  Failed to download $modelFile - $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "Face-api.js models already exist" -ForegroundColor Green
    }
    
    # TensorFlow.js models for phone detection
    $tfModelsDir = "$modelsDir\tfjs"
    if (-not (Test-Path $tfModelsDir)) {
        Write-Host "Downloading TensorFlow.js models for phone detection..." -ForegroundColor Yellow
        New-Item -Path $tfModelsDir -ItemType Directory -Force | Out-Null
        
        # COCO-SSD model for object detection (including phones)
        $cocoSsdDir = "$tfModelsDir\coco-ssd"
        New-Item -Path $cocoSsdDir -ItemType Directory -Force | Out-Null
        
        $cocoSsdModels = @(
            "https://storage.googleapis.com/tfjs-models/savedmodel/ssdlite_mobilenet_v2/model.json",
            "https://storage.googleapis.com/tfjs-models/savedmodel/ssdlite_mobilenet_v2/group1-shard1of5",
            "https://storage.googleapis.com/tfjs-models/savedmodel/ssdlite_mobilenet_v2/group1-shard2of5",
            "https://storage.googleapis.com/tfjs-models/savedmodel/ssdlite_mobilenet_v2/group1-shard3of5",
            "https://storage.googleapis.com/tfjs-models/savedmodel/ssdlite_mobilenet_v2/group1-shard4of5",
            "https://storage.googleapis.com/tfjs-models/savedmodel/ssdlite_mobilenet_v2/group1-shard5of5"
        )
        
        foreach ($model in $cocoSsdModels) {
            $modelFile = Split-Path $model -Leaf
            $output = "$cocoSsdDir\$modelFile"
            Write-Host "  Downloading $modelFile..." -ForegroundColor Yellow
            try {
                Invoke-WebRequest -Uri $model -OutFile $output
                Write-Host "  Successfully downloaded $modelFile" -ForegroundColor Green
            } catch {
                Write-Host "  Failed to download $modelFile - $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "TensorFlow.js models already exist" -ForegroundColor Green
    }
    
    Write-Host "JavaScript model download completed" -ForegroundColor Green
}

# Check for Node.js
if (-not (Test-CommandExists "node")) {
    Write-Host "ERROR: Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js 18.x or later from https://nodejs.org/" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check Node.js version
$nodeVersion = (node -v).Substring(1)
Write-Host "Node.js version $nodeVersion detected" -ForegroundColor Green

# Check for Python
$pythonAvailable = $false
if (Test-CommandExists "python") {
    $pythonVersionOutput = python -c "import sys; print('Python ' + '.'.join(map(str, sys.version_info[:3])))"
    Write-Host "$pythonVersionOutput detected" -ForegroundColor Green
    
    $pythonVersionCheck = python -c "import sys; print(sys.version_info >= (3, 8))"
    if ($pythonVersionCheck -eq "True") {
        $pythonAvailable = $true
    } else {
        Write-Host "WARNING: Python version is less than 3.8" -ForegroundColor Yellow
        Write-Host "The backend API server requires Python 3.8 or later" -ForegroundColor Yellow
        Write-Host "You can still use the frontend with browser-based detection" -ForegroundColor Yellow
    }
} else {
    Write-Host "WARNING: Python is not installed or not in PATH" -ForegroundColor Yellow
    Write-Host "The backend API server requires Python 3.8 or later" -ForegroundColor Yellow
    Write-Host "You can still use the frontend with browser-based detection" -ForegroundColor Yellow
}

# Check for package manager (pnpm or npm)
if (Test-CommandExists "pnpm") {
    $packageManager = "pnpm"
} else {
    Write-Host "pnpm not found, using npm instead..." -ForegroundColor Yellow
    $packageManager = "npm"
}

Write-Host "Using $packageManager as package manager" -ForegroundColor Cyan
Write-Host ""

# Create .env.local file if it doesn't exist
if (-not (Test-Path "new_project\.env.local")) {
    Write-Host "Creating .env.local file..." -ForegroundColor Yellow
    Set-Content -Path "new_project\.env.local" -Value "NEXT_PUBLIC_API_URL=/api"
    Write-Host "Created .env.local with API URL configuration" -ForegroundColor Green
}

# Download JavaScript browser-based detection models
Download-JavaScriptModels

# Install frontend dependencies if needed
if (-not (Test-Path "new_project\node_modules")) {
    Write-Host "Node modules not found. Installing dependencies..." -ForegroundColor Yellow
    
    Set-Location -Path "new_project"
    
    & $packageManager install
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "ERROR: Failed to install dependencies" -ForegroundColor Red
        Write-Host ""
        Write-Host "Trying to fix common issues..." -ForegroundColor Yellow
        Write-Host ""
        
        if ($packageManager -eq "npm") {
            Write-Host "Clearing npm cache..." -ForegroundColor Yellow
            npm cache clean --force
            
            Write-Host "Attempting to install dependencies again..." -ForegroundColor Yellow
            npm install
            
            if ($LASTEXITCODE -ne 0) {
                Write-Host ""
                Write-Host "ERROR: Installation failed again. Please try manually:" -ForegroundColor Red
                Write-Host "1. cd new_project" -ForegroundColor Cyan
                Write-Host "2. npm cache clean --force" -ForegroundColor Cyan
                Write-Host "3. Remove package-lock.json" -ForegroundColor Cyan
                Write-Host "4. npm install" -ForegroundColor Cyan
                Read-Host "Press Enter to exit"
                exit 1
            }
        } else {
            Write-Host "Clearing pnpm store..." -ForegroundColor Yellow
            pnpm store prune
            
            Write-Host "Attempting to install dependencies again..." -ForegroundColor Yellow
            pnpm install
            
            if ($LASTEXITCODE -ne 0) {
                Write-Host ""
                Write-Host "ERROR: Installation failed again. Please try manually:" -ForegroundColor Red
                Write-Host "1. cd new_project" -ForegroundColor Cyan
                Write-Host "2. pnpm store prune" -ForegroundColor Cyan
                Write-Host "3. Remove pnpm-lock.yaml" -ForegroundColor Cyan
                Write-Host "4. pnpm install" -ForegroundColor Cyan
                Read-Host "Press Enter to exit"
                exit 1
            }
        }
    }
    
    Set-Location -Path $PSScriptRoot
    Write-Host "Dependencies installed successfully" -ForegroundColor Green
    Write-Host ""
}

# Set up Python environment if Python is available
if ($pythonAvailable) {
    Write-Host "Checking Python backend dependencies..." -ForegroundColor Yellow
    
    # Check if Python virtual environment exists
    $useVenv = $false
    if (-not (Test-Path "venv")) {
        Write-Host "Creating Python virtual environment..." -ForegroundColor Yellow
        python -m venv venv
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "WARNING: Failed to create virtual environment" -ForegroundColor Yellow
            Write-Host "Will attempt to install dependencies globally" -ForegroundColor Yellow
        } else {
            $useVenv = $true
        }
    } else {
        $useVenv = $true
    }
    
    # Activate virtual environment if available
    if ($useVenv) {
        Write-Host "Activating virtual environment..." -ForegroundColor Yellow
        & ".\venv\Scripts\Activate.ps1"
        
        # Install dlib in the virtual environment
        Install-Dlib
    } else {
        # Install dlib globally
        Install-Dlib
    }
    
    # Install Python dependencies
    Write-Host "Installing Python dependencies..." -ForegroundColor Yellow
    pip install -r requirements.txt
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "WARNING: Failed to install Python requirements" -ForegroundColor Yellow
        Write-Host "You can still use the frontend with browser-based detection" -ForegroundColor Yellow
    } else {
        Write-Host "Python dependencies installed successfully" -ForegroundColor Green
    }
    
    # Install API-specific requirements
    if (Test-Path "api_requirements.txt") {
        Write-Host "Installing flask-cors..." -ForegroundColor Yellow
        pip install flask-cors
        
        Write-Host "Installing API requirements (except dlib which was installed separately)..." -ForegroundColor Yellow
        # Using pip freeze to get installed packages and exclude dlib from requirements
        Get-Content "api_requirements.txt" | Where-Object { $_ -notmatch "dlib" } | ForEach-Object { pip install $_ }
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "WARNING: Failed to install some API-specific requirements" -ForegroundColor Yellow
            Write-Host "Backend functionality may be limited" -ForegroundColor Yellow
        }
    }
    
    # Download required model files if needed
    if (Test-Path "download_shape_predictor.py") {
        Write-Host "Checking for required model files..." -ForegroundColor Yellow
        if (-not (Test-Path "shape_predictor_68_face_landmarks.dat")) {
            Write-Host "Downloading shape predictor model..." -ForegroundColor Yellow
            python download_shape_predictor.py
        } else {
            Write-Host "Shape predictor model already exists" -ForegroundColor Green
        }
    }
    
    # Deactivate virtual environment if used
    if ($useVenv) {
        deactivate
    }
    
    Write-Host ""
    Write-Host "Python backend setup completed" -ForegroundColor Green
    Write-Host ""
}

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "Starting Driver Drowsiness Monitoring System" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "The application will be starting shortly..." -ForegroundColor Cyan
Write-Host ""

# Start Python API server if available
if ($pythonAvailable) {
    Write-Host "Starting Python API server..." -ForegroundColor Yellow
    
    $apiServerProcess = $null
    if ($useVenv) {
        $apiServerProcess = Start-Process -FilePath "powershell" -ArgumentList "-Command `"& { cd '$PSScriptRoot'; & '.\venv\Scripts\Activate.ps1'; python api_server.py; Read-Host 'Press Enter to exit' }`"" -PassThru -WindowStyle Normal
    } else {
        $apiServerProcess = Start-Process -FilePath "powershell" -ArgumentList "-Command `"& { cd '$PSScriptRoot'; python api_server.py; Read-Host 'Press Enter to exit' }`"" -PassThru -WindowStyle Normal
    }
    
    # Wait a bit for the API server to start
    Write-Host "Waiting for API server to initialize..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    
    Write-Host "Python API server started" -ForegroundColor Green
} else {
    Write-Host "Skipping Python API server (not available)" -ForegroundColor Yellow
    Write-Host "Using browser-based detection only" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Starting Next.js frontend..." -ForegroundColor Yellow
Write-Host "Once started, you can access the application at: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the frontend when finished" -ForegroundColor Cyan
if ($pythonAvailable) {
    Write-Host "If the Python backend is running, close its window manually" -ForegroundColor Cyan
}
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# Start Next.js application
Set-Location -Path "new_project"
if ($packageManager -eq "npm") {
    npm run dev
} else {
    pnpm dev
} 