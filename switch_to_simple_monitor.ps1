# PowerShell script to switch from complex to simple drowsiness monitor

Write-Host "Switching to simplified drowsiness monitor component..." -ForegroundColor Green

# Stop any running Next.js processes
$processes = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*next*" }
if ($processes) {
    Write-Host "Stopping existing Next.js processes..." -ForegroundColor Yellow
    $processes | ForEach-Object { Stop-Process $_ -Force }
}

# Backup existing drowsiness-monitor.tsx file
$monitorPath = ".\new_project\components\drowsiness-monitor.tsx"
$backupPath = ".\new_project\components\drowsiness-monitor.original.tsx"

if (Test-Path $monitorPath) {
    Write-Host "Backing up original drowsiness-monitor.tsx..." -ForegroundColor Yellow
    Copy-Item -Path $monitorPath -Destination $backupPath -Force
}

# Copy our simple monitor to replace the complex one
Write-Host "Installing simplified drowsiness monitor..." -ForegroundColor Yellow
Copy-Item -Path ".\new_project\components\drowsiness-monitor-simple.tsx" -Destination $monitorPath -Force

# Start the new app
Write-Host "Starting the application with simplified monitor..." -ForegroundColor Green
Write-Host "Please wait a moment for the app to start..." -ForegroundColor Yellow

# Navigate to the project directory and start the development server
Set-Location -Path ".\new_project"
npm run dev

Write-Host "Done! The app should now be using the simplified drowsiness monitor." -ForegroundColor Green
Write-Host "Access it at: http://localhost:3000" -ForegroundColor Cyan 