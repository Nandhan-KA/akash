@echo off
SETLOCAL EnableDelayedExpansion

echo ===================================================
echo Driver Drowsiness and Emotion Monitoring System
echo ===================================================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js 18.x or later from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if Python is installed
where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Python is not installed or not in PATH
    echo The backend API server requires Python 3.8 or later
    echo You can still use the frontend with browser-based detection
    set PYTHON_AVAILABLE=false
) else (
    python -c "import sys; print(sys.version_info >= (3, 8))" | findstr "True" >nul
    if %ERRORLEVEL% NEQ 0 (
        echo WARNING: Python version is less than 3.8
        echo The backend API server requires Python 3.8 or later
        echo You can still use the frontend with browser-based detection
        set PYTHON_AVAILABLE=false
    ) else (
        set PYTHON_AVAILABLE=true
    )
)

REM Check if pnpm is installed, if not use npm
where pnpm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo pnpm not found, using npm instead...
    set PACKAGE_MANAGER=npm
) else (
    set PACKAGE_MANAGER=pnpm
)

echo Using %PACKAGE_MANAGER% as package manager
echo.

REM Navigate to the project directory
cd /d "%~dp0"

REM Create .env.local file if it doesn't exist
if not exist "new_project\.env.local" (
    echo Creating .env.local file...
    echo NEXT_PUBLIC_API_URL=/api> "new_project\.env.local"
    echo Created .env.local with API URL configuration
)

REM Check if node_modules exists, if not, install dependencies
if not exist "new_project\node_modules" (
    echo Node modules not found. Installing dependencies...
    cd new_project
    %PACKAGE_MANAGER% install
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo ERROR: Failed to install dependencies
        echo.
        echo Trying to fix common issues...
        echo.
        
        REM Try to fix npm issues
        if "%PACKAGE_MANAGER%"=="npm" (
            echo Clearing npm cache...
            npm cache clean --force
            
            echo Attempting to install dependencies again...
            npm install
            
            if %ERRORLEVEL% NEQ 0 (
                echo.
                echo ERROR: Installation failed again. Please try manually:
                echo 1. cd new_project
                echo 2. npm cache clean --force
                echo 3. del package-lock.json
                echo 4. npm install
                pause
                exit /b 1
            )
        ) else (
            echo Clearing pnpm store...
            pnpm store prune
            
            echo Attempting to install dependencies again...
            pnpm install
            
            if %ERRORLEVEL% NEQ 0 (
                echo.
                echo ERROR: Installation failed again. Please try manually:
                echo 1. cd new_project
                echo 2. pnpm store prune
                echo 3. del pnpm-lock.yaml
                echo 4. pnpm install
                pause
                exit /b 1
            )
        )
    )
    cd ..
    echo Dependencies installed successfully
    echo.
)

REM Check if Python backend dependencies need to be installed
if "%PYTHON_AVAILABLE%"=="true" (
    echo Checking Python backend dependencies...
    
    REM Check if Python virtual environment exists
    if not exist "venv\" (
        echo Creating Python virtual environment...
        python -m venv venv
        if %ERRORLEVEL% NEQ 0 (
            echo WARNING: Failed to create virtual environment
            echo Will attempt to install dependencies globally
            set USE_VENV=false
        ) else (
            set USE_VENV=true
        )
    ) else (
        set USE_VENV=true
    )
    
    REM Activate virtual environment or proceed without it
    if "%USE_VENV%"=="true" (
        echo Activating virtual environment...
        call venv\Scripts\activate
        
        REM Install dlib in the virtual environment
        call :download_dlib
    ) else (
        REM Install dlib globally if not using venv
        call :download_dlib
    )
    
    REM Install Python dependencies
    echo Installing Python dependencies...
    pip install -r requirements.txt
    if %ERRORLEVEL% NEQ 0 (
        echo WARNING: Failed to install Python requirements
        echo You can still use the frontend with browser-based detection
    ) else (
        echo Python dependencies installed successfully
    )
    
    REM Install API-specific requirements if they exist
    if exist "api_requirements.txt" (
        pip install flask-cors
        echo Installing API requirements (except dlib which was installed separately)...
        pip install -r api_requirements.txt --exclude dlib
        if %ERRORLEVEL% NEQ 0 (
            echo WARNING: Failed to install some API-specific requirements
            echo Backend functionality may be limited
        )
    )
    
    REM Download required model files if needed
    if exist "download_shape_predictor.py" (
        echo Checking for required model files...
        if not exist "shape_predictor_68_face_landmarks.dat" (
            echo Downloading shape predictor model...
            python download_shape_predictor.py
        ) else (
            echo Shape predictor model already exists
        )
    )
    
    REM Deactivate virtual environment if used
    if "%USE_VENV%"=="true" (
        call venv\Scripts\deactivate
    )
    
    echo.
    echo Python backend setup completed
    echo.
)

echo ===================================================
echo Starting Driver Drowsiness Monitoring System
echo ===================================================
echo.
echo The application will be starting shortly...
echo.

REM Start the Python API server if available
if "%PYTHON_AVAILABLE%"=="true" (
    echo Starting Python API server...
    
    if "%USE_VENV%"=="true" (
        start "Driver Drowsiness API Server" cmd /c "call venv\Scripts\activate && python api_server.py && pause"
    ) else (
        start "Driver Drowsiness API Server" cmd /c "python api_server.py && pause"
    )
    
    REM Wait a bit for the API server to start
    echo Waiting for API server to initialize...
    timeout /t 5 /nobreak > nul
    
    echo Python API server started
) else (
    echo Skipping Python API server (not available)
    echo Using browser-based detection only
)

echo.
echo Starting Next.js frontend...
echo Once started, you can access the application at: http://localhost:3000
echo.
echo Press Ctrl+C to stop the frontend when finished
echo If the Python backend is running, close its window manually
echo ===================================================
echo.

REM Start the Next.js application with the correct command
cd new_project
if "%PACKAGE_MANAGER%"=="npm" (
    npm run dev
) else (
    pnpm dev
)

goto :eof

REM =================== FUNCTIONS ====================

:download_dlib
echo Downloading pre-built dlib wheel...
python -m pip install --upgrade pip

REM Fixed URL to download dlib directly from GitHub
set DLIB_WHEEL=https://github.com/Murtaza-Saeed/Dlib-Precompiled-Wheels-for-Python-on-Windows-x64-Easy-Installation/raw/master/dlib-19.19.0-cp38-cp38-win_amd64.whl

echo Installing dlib from %DLIB_WHEEL%...
python -m pip install %DLIB_WHEEL%
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Failed to install pre-built dlib. Using alternative method...
    echo Trying with pip install dlib...
    python -m pip install dlib==19.19.0
    if %ERRORLEVEL% NEQ 0 (
        echo WARNING: Failed to install dlib. Some features may not work properly.
    ) else (
        echo Successfully installed dlib 19.19.0
    )
) else (
    echo Successfully installed pre-built dlib
)
exit /b 0 