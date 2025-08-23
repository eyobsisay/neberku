# Neberku Frontend Setup Guide

This guide will help you set up and run the Neberku frontend project that connects to your Django API endpoints.

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v14 or higher) - [Download here](https://nodejs.org/)
- **Your Django backend** running on `http://localhost:8000`

### Installation Steps

1. **Navigate to the frontend directory**
   ```bash
   cd neberku-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

## 📁 Project Structure

```
neberku-frontend/
├── index.html                 # Landing page
├── login.html                 # User login
├── register.html              # User registration (to be created)
├── dashboard.html             # Event owner dashboard (to be created)
├── guest-contribution.html    # Guest contribution page (to be created)
├── css/
│   └── custom.css            # Custom styles
├── js/
│   ├── main.js               # Main functionality
│   ├── auth.js               # Authentication logic
│   └── api.js                # API integration (to be created)
├── config.js                 # API configuration
├── package.json              # Dependencies and scripts
└── README.md                 # Project documentation
```

## ⚙️ Configuration

### API Endpoints
Edit `config.js` to match your Django API endpoints:

```javascript
const API_CONFIG = {
    BASE_URL: 'http://localhost:8000/api',  // Change this to your API URL
    
    ENDPOINTS: {
        EVENTS: '/events/',
        GUEST_POSTS: '/guest-posts/',
        MEDIA_FILES: '/media-files/',
        // ... other endpoints
    }
};
```

### Environment Variables
You can also set environment-specific configurations:

- **Development**: `http://localhost:8000/api`
- **Production**: `https://yourdomain.com/api`

## 🔧 Available Scripts

- **`npm start`** - Start production server
- **`npm run dev`** - Start development server with live reload
- **`npm run build`** - Build for production (not needed for static HTML)

## 🌐 API Integration

The frontend is designed to work with your existing Django API endpoints:

### Authentication
- **Login**: `POST /api/auth/login/`
- **Register**: `POST /api/auth/register/`
- **Logout**: `POST /api/auth/logout/`

### Events
- **List Events**: `GET /api/events/`
- **Create Event**: `POST /api/events/`
- **Event Details**: `GET /api/events/{id}/`

### Guest Posts
- **List Posts**: `GET /api/guest-posts/`
- **Approve Post**: `POST /api/guest-posts/{id}/approve/`
- **Reject Post**: `POST /api/guest-posts/{id}/reject/`

### Media Files
- **List Media**: `GET /api/media-files/`
- **Approve Media**: `POST /api/media-files/{id}/approve/`
- **Reject Media**: `POST /api/media-files/{id}/reject/`

## 🎨 Customization

### Styling
- Modify `css/custom.css` for visual changes
- Update CSS variables for consistent theming
- Add new CSS classes as needed

### Functionality
- Edit `js/main.js` for general functionality
- Modify `js/auth.js` for authentication changes
- Update `js/api.js` for API integration changes

### Content
- Edit HTML files directly for content changes
- Update navigation links in all HTML files
- Modify form fields and validation

## 🔒 Security Considerations

### CORS Configuration
Ensure your Django backend allows requests from the frontend:

```python
# settings.py
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

CORS_ALLOW_CREDENTIALS = True
```

### Authentication
- The frontend uses token-based authentication
- Tokens are stored in localStorage (consider httpOnly cookies for production)
- Implement proper token validation on your backend

## 🚨 Troubleshooting

### Common Issues

1. **Port 3000 already in use**
   ```bash
   # Kill the process using port 3000
   npx kill-port 3000
   # Or change the port in package.json
   ```

2. **API connection failed**
   - Check if Django backend is running
   - Verify API URL in `config.js`
   - Check CORS settings in Django

3. **Authentication not working**
   - Verify API endpoints in Django
   - Check token storage in browser dev tools
   - Ensure proper error handling

### Debug Mode
Enable debug logging in `config.js`:

```javascript
const ENV_CONFIG = {
    development: {
        DEBUG: true,           // Enable debug logging
        LOG_LEVEL: 'debug',
        API_TIMEOUT: 10000,
    }
};
```

## 📱 Browser Support

- **Chrome** 90+
- **Firefox** 88+
- **Safari** 14+
- **Edge** 90+
- **Mobile browsers** (iOS Safari 14+, Chrome Mobile 90+)

## 🚀 Deployment

### Static Hosting
The frontend can be deployed to any static hosting service:

- **Netlify**: Drag and drop the folder
- **Vercel**: Connect your GitHub repository
- **GitHub Pages**: Push to gh-pages branch
- **AWS S3**: Upload files to S3 bucket

### Production Build
For production, consider:

1. **Minify CSS/JS** files
2. **Optimize images** and assets
3. **Enable compression** on your server
4. **Set proper cache headers**

## 📞 Support

If you encounter issues:

1. Check the browser console for errors
2. Verify API endpoints are accessible
3. Check Django backend logs
4. Review the configuration files

## 🔄 Updates

To update the frontend:

1. **Backup** your customizations
2. **Pull** the latest changes
3. **Reapply** your customizations
4. **Test** all functionality

---

**Happy coding! 🎉**

The Neberku frontend is now ready to connect to your Django API endpoints. 