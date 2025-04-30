# Driver Drowsiness and Emotion Monitoring System - Fixed Setup Script

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "Driver Drowsiness and Emotion Monitoring System" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Python is installed
try {
    $pythonVersion = (python --version 2>&1).ToString()
    Write-Host "$pythonVersion detected" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Python not found. Please install Python 3.8 or later." -ForegroundColor Red
    exit 1
}

# Check if fix_python_setup.py exists
if (-not (Test-Path "fix_python_setup.py")) {
    Write-Host "ERROR: fix_python_setup.py not found. Please make sure it's in the same directory." -ForegroundColor Red
    exit 1
}

# Run the fix script first
Write-Host "Running environment fix script..." -ForegroundColor Yellow
python fix_python_setup.py

# Check if fix completed successfully
if ($LASTEXITCODE -ne 0) {
    Write-Host "Fix script failed. Please check the error messages above." -ForegroundColor Red
    exit 1
}

# Option to run the project
Write-Host ""
$choice = Read-Host "Environment setup complete. Would you like to run the project now? (Y/N)"
if ($choice -eq "Y" -or $choice -eq "y") {
    Write-Host ""
    Write-Host "Starting the project..." -ForegroundColor Yellow
    python run_project.py
} else {
    Write-Host ""
    Write-Host "You can run the project later using: python run_project.py" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Done." -ForegroundColor Green 