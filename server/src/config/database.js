const mongoose = require('mongoose')

let shutdownHooksRegistered = false

const registerShutdownHooks = () => {
    if (shutdownHooksRegistered) return
    shutdownHooksRegistered = true

    const closeConnection = async (signal) => {
        try {
            await mongoose.connection.close()
            console.log(`MongoDB connection closed after ${signal}`)
            process.exit(0)
        } catch (error) {
            console.error(`Error closing MongoDB connection after ${signal}:`, error)
            process.exit(1)
        }
    }

    process.once('SIGINT', () => closeConnection('SIGINT'))
    process.once('SIGTERM', () => closeConnection('SIGTERM'))
}

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

        registerShutdownHooks()

        return conn
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message)
        throw error
    }
}

module.exports = connectDB
