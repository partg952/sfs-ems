import express from 'express'
import cors from 'cors'
import { config } from './config.js'
import { initDB } from './db.js'
import authRoutes from './routes/auth.js'
import employeeRoutes from './routes/employees.js'
import path from 'path'
import fs from 'fs'

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
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true })
}
app.use('/uploads', express.static(path.resolve(config.uploadDir)))

app.use('/api/auth', authRoutes)
app.use('/api/employees', employeeRoutes)
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
