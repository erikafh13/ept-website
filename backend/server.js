require('dotenv').config()
const express = require('express')
const cors = require('cors')

const authRoutes      = require('./routes/auth')
const questionRoutes  = require('./routes/questions')
const scoreRoutes     = require('./routes/scores')
const { answersRouter, usersRouter, poolRouter } = require('./routes/others')

const app = express()

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'],
  allowedHeaders: ['Content-Type', 'x-username']
}))
app.use(express.json({ limit: '2mb' }))

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }))

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes)
app.use('/api/questions', questionRoutes)
app.use('/api/scores',    scoreRoutes)
app.use('/api/answers',   answersRouter)
app.use('/api/users',     usersRouter)
app.use('/api/pool',      poolRouter)

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ message: `Route ${req.method} ${req.path} tidak ditemukan.` }))

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ message: 'Internal server error.' })
})

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`✅  EPT Backend running on http://localhost:${PORT}`)
  console.log(`📊  Spreadsheet ID: ${process.env.SPREADSHEET_ID || '(belum diset)'}`)
})
