@echo off
echo ===================================================
echo Driver Drowsiness and Emotion Monitoring System
echo ===================================================
echo.

REM Check if Python is installed
python --version 2>NUL
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Python not found. Please install Python 3.8 or later.
    goto :EOF
)

REM Run the fix script first
echo Running environment fix script...
python fix_python_setup.py

REM Check if fix completed successfully
if %ERRORLEVEL% NEQ 0 (
    echo Fix script failed. Please check the error messages above.
    goto :EOF
)

REM Option to run the project
echo.
echo Environment setup complete. Would you like to run the project now? (Y/N)
set /p choice=
if /i "%choice%"=="Y" (
    echo.
    echo Starting the project...
    python run_project.py
) else (
    echo.
    echo You can run the project later using: python run_project.py
)

echo.
echo Done. 