const express = require('express')
const cookieParser = require('cookie-parser')
const cors = require('cors')
require("dotenv").config();

const connectDB = require('./config/database')

const authRoutes = require('./modules/auth/auth.routes')
const workspaceRoutes = require('./modules/workspace/workspace.routes')
const teamsRoutes = require('./modules/team/teams.routes')
const projectsRoutes = require('./modules/projects/project.routes')
const tasksRoutes = require('./modules/tasks/tasks.routes')
const usersRoutes = require('./modules/user/user.routes')

const app = express();
const port = process.env.PORT;

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}))

// Middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(cookieParser())

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Server is running' })
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/workspace', workspaceRoutes)
app.use('/api/teams', teamsRoutes)
app.use('/api/projects', projectsRoutes)
app.use('/api/tasks', tasksRoutes)
app.use('/api/user', usersRoutes)

// 404 handler for undefined routes
app.use((req, res) => {
    res.status(404).json({ 
        success: false,
        message: `Route ${req.originalUrl} not found` 
    })
})

// Global error handler middleware (must be last)
app.use((err, req, res, next) => {
    console.error('Error:', err)
    
    // Handle validation errors
    if (err.name === 'ZodError') {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: err.errors
        })
    }

    // Handle JWT errors
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        })
    }

    // Handle MongoDB errors
    if (err.name === 'MongoServerError' || err.name === 'MongooseError') {
        return res.status(500).json({
            success: false,
            message: 'Database error occurred'
        })
    }

    // Default error response
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    })
})

// Start server
connectDB()
    .then(() => {
        app.listen(port, () => {
            console.log("✅ DB connected successfully")
            console.log(`🚀 Server listening on port ${port}`)
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
        })
    })
    .catch((err) => {
        console.error('❌ MongoDB connection ERROR:', err)
        process.exit(1)
    })


