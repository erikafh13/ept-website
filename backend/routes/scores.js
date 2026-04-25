/**
 * backend/routes/scores.js
 * Kolom Scores (diperbarui):
 * timestamp | date | username | name | listening | structure | reading | total | accuracy | testMode
 */
const express = require('express')
const { getRange, appendRow, SHEETS } = require('../sheets')

const router = express.Router()

// Parsing baris score dari Sheets
function parseScore(row) {
  return {
    timestamp: row[0],
    date:      row[1],
    username:  row[2],
    name:      row[3],
    listening: row[4] !== '' ? parseInt(row[4]) : null,
    structure: row[5] !== '' ? parseInt(row[5]) : null,
    reading:   row[6] !== '' ? parseInt(row[6]) : null,
    total:     parseInt(row[7]) || 0,
    accuracy:  row[8] || '0%',
    testMode:  row[9] || 'full',   // kolom baru
  }
}

// POST /api/scores  — simpan hasil tes
router.post('/', async (req, res) => {
  try {
    const { username, name, listening, structure, reading, testMode } = req.body

    // Hitung total hanya dari seksi yang dikerjakan (bukan null)
    const vals = [listening, structure, reading].filter(v => v !== null && v !== undefined)
    const total = vals.reduce((s, v) => s + (parseInt(v) || 0), 0)

    // Total possible tergantung mode
    const modeMap = { full: 45, listening: 15, structure: 15, reading: 15 }
    const possible = modeMap[testMode] || 45
    const accuracy = Math.round((total / possible) * 100) + '%'

    const now       = new Date()
    const timestamp = now.toISOString()
    const date      = now.toISOString().slice(0, 10)

    // Simpan — kolom null disimpan sebagai string kosong
    await appendRow(SHEETS.SCORES, [
      timestamp, date, username, name,
      listening ?? '',
      structure ?? '',
      reading   ?? '',
      total, accuracy,
      testMode || 'full'
    ])

    return res.json({ message: 'Skor berhasil disimpan.', total, accuracy })
  } catch (e) {
    console.error('Save score error:', e)
    res.status(500).json({ message: 'Gagal menyimpan skor.' })
  }
})

// GET /api/scores/user?username=xxx  — skor satu user
router.get('/user', async (req, res) => {
  try {
    const { username } = req.query
    if (!username) return res.status(400).json({ message: 'username wajib.' })
    const rows   = await getRange(`${SHEETS.SCORES}!A2:J`)
    const scores = rows
      .filter(r => r[2] === username)
      .map(parseScore)
      .reverse()
    return res.json({ scores })
  } catch (e) {
    res.status(500).json({ message: 'Gagal mengambil skor.' })
  }
})

// GET /api/scores/all  — semua skor (admin/leaderboard)
router.get('/all', async (req, res) => {
  try {
    const rows   = await getRange(`${SHEETS.SCORES}!A2:J`)
    const scores = rows.map(parseScore).reverse()
    return res.json({ scores })
  } catch (e) {
    res.status(500).json({ message: 'Gagal mengambil skor.' })
  }
})

module.exports = router
