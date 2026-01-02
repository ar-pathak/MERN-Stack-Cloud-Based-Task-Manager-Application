const mongoose = require('mongoose')

const connectDB = async () => {
    try {
        if (!process.env.MONGO_URL) {
            throw new Error('MONGO_URL environment variable is not set')
        }

        const conn = await mongoose.connect(process.env.MONGO_URL, {
            // These options are recommended for Mongoose 6+
            // Remove deprecated options
        })

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`)
        
        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err)
        })

        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️ MongoDB disconnected')
        })

        // Graceful shutdown
        process.on('SIGINT', async () => {
            await mongoose.connection.close()
            console.log('MongoDB connection closed through app termination')
            process.exit(0)
        })

        return conn
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message)
        throw error
    }
}

module.exports = connectDB