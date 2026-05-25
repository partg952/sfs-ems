import express from 'express'
import cors from 'cors'
import { config } from './config.js'
import { initDB } from './db.js'
import authRoutes from './routes/auth.js'

const app = express()

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'UP', message: 'SFS EMS Node.js Backend is running' })
})

// API Routes
app.use('/api/auth', authRoutes)
app.get('/api/health', (req, res) => {
  res.json({ status: 'UP', message: 'SFS EMS Node.js Backend is running' })
})

// Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err)
  res.status(500).json({ success: false, message: err.message || 'Internal server error', data: null })
})

async function startServer() {
  try {
    console.log('🔄 Initializing PostgreSQL database...')
    await initDB()
    app.listen(config.port, () => {
      console.log(`🚀 SFS-EMS backend running on http://localhost:${config.port}`)
    })
  } catch (err) {
    console.error('❌ Failed to start backend server:', err)
    process.exit(1)
  }
}

startServer()
