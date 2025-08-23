@echo off
echo ========================================
echo    Starting Neberku Django Backend
echo ========================================
echo.

echo Checking if Python is installed...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ and try again
    pause
    exit /b 1
)

echo Python found! Checking Django project...
if not exist "manage.py" (
    echo ERROR: manage.py not found!
    echo Please run this script from the neberku directory
    pause
    exit /b 1
)

echo Installing dependencies...
pip install -r requirements.txt

echo Running database migrations...
python manage.py migrate

echo Creating test data...
python create_test_event.py

echo.
echo ========================================
echo    Starting Django Development Server
echo ========================================
echo.
echo The server will start on: http://localhost:8000
echo.
echo Press Ctrl+C to stop the server
echo.
echo ========================================
echo.

python manage.py runserver

pause 