# Backend Setup Guide for Neberku Frontend

## The Problem
You're getting "Unable to connect to the server" errors because the Django backend isn't running. The frontend is trying to connect to `http://localhost:8000` but nothing is responding there.

## Solution: Start the Django Backend

### Step 1: Open a New Terminal/Command Prompt
Keep your frontend running in one terminal, and open a new one for the backend.

### Step 2: Navigate to the Django Project
```bash
cd neberku
```

### Step 3: Activate Virtual Environment (if you have one)
```bash
# If you're using a virtual environment:
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate
```

### Step 4: Install Dependencies (if not already done)
```bash
pip install -r requirements.txt
```

### Step 5: Run Database Migrations
```bash
python manage.py migrate
```

### Step 6: Create a Superuser (Optional but Recommended)
```bash
python manage.py createsuperuser
```

### Step 7: Create Test Data
```bash
python create_test_event.py
```

### Step 8: Start the Django Server
```bash
python manage.py runserver
```

You should see output like:
```
Watching for file changes with StatReloader
Performing system checks...

System check identified no issues (0 silenced).
December 19, 2024 - 15:30:00
Django version 5.2.5, using settings 'neberku.settings'
Starting development server at http://127.0.0.1:8000/
Quit the server with CONTROL-C.
```

### Step 9: Test the Backend
Open your browser and go to:
- **API Root**: http://localhost:8000/api/
- **Admin Panel**: http://localhost:8000/admin/
- **Swagger Docs**: http://localhost:8000/swagger/

## Verify Frontend Connection

Once the backend is running:

1. **Keep the Django server running** in its terminal
2. **Keep the frontend running** in its terminal (on port 3000)
3. **Open the frontend** in your browser: http://localhost:3000
4. **Check the browser console** for connection logs

You should now see:
- ✅ Configuration Loaded Successfully!
- 📍 Base URL: http://localhost:8000
- 🔑 Available Endpoints: [list of endpoints]

## Troubleshooting

### If you still get connection errors:

1. **Check if Django is running**:
   - Look for the Django server output in the terminal
   - Try accessing http://localhost:8000/api/ in your browser

2. **Check CORS settings**:
   - The Django backend already has CORS configured for localhost:3000
   - Make sure both servers are running on different ports

3. **Check firewall/antivirus**:
   - Some security software might block local connections

4. **Verify ports**:
   - Django should be on port 8000
   - Frontend should be on port 3000

### Common Issues:

1. **Port already in use**:
   ```bash
   # If port 8000 is busy, use a different port:
   python manage.py runserver 8001
   # Then update config.js to use port 8001
   ```

2. **Database errors**:
   ```bash
   python manage.py migrate --run-syncdb
   ```

3. **Permission errors**:
   - Make sure you have write permissions to the project directory

## Testing the Complete System

1. **Start Django backend** (port 8000)
2. **Start frontend** (port 3000)
3. **Create a test event** using the Django admin or the create_test_event.py script
4. **Login to frontend** and check if events are loaded
5. **Create a new event** from the frontend dashboard

## Next Steps

Once the connection is working:
1. The frontend will automatically fetch events from the backend
2. You can create new events through the frontend
3. Guest contributions will work properly
4. All API endpoints will be accessible

## Need Help?

If you're still having issues:
1. Check the browser console for detailed error messages
2. Check the Django server terminal for backend errors
3. Verify both servers are running on the correct ports
4. Make sure no other applications are using the same ports 