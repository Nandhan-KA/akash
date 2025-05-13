@echo off
rem Batch file to swap drowsiness monitor implementations

echo Switching to simplified drowsiness monitor...

rem Look for both potential locations
if exist "new_project\components\drowsiness-monitor.tsx" (
    echo Found in components directory
    set MONITOR_PATH=new_project\components\drowsiness-monitor.tsx
    set SIMPLE_PATH=new_project\components\drowsiness-monitor-simple.tsx
) else if exist "new_project\app\dashboard\drowsiness-monitor.tsx" (
    echo Found in dashboard directory
    set MONITOR_PATH=new_project\app\dashboard\drowsiness-monitor.tsx
    set SIMPLE_PATH=new_project\app\dashboard\drowsiness-monitor-simple.tsx
) else (
    echo Could not find drowsiness-monitor.tsx in expected locations
    goto :EOF
)

rem Backup the original file
echo Backing up original file...
copy "%MONITOR_PATH%" "%MONITOR_PATH%.backup"

rem Copy the simple version over the original
echo Copying simplified implementation...
copy "%SIMPLE_PATH%" "%MONITOR_PATH%"

echo.
echo Done! Please restart the Next.js application to apply changes.
echo To revert: copy "%MONITOR_PATH%.backup" "%MONITOR_PATH%"
echo.

pause 