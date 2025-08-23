@echo off
echo Starting Neberku Frontend...
echo.
echo Make sure you have Node.js installed and your Django backend is running on http://localhost:8000
echo.
echo The frontend will be available at: http://localhost:3000
echo.
pause

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Start the development server
echo Starting development server...
npm run dev 