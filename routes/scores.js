const express = require('express')
const { getRange, appendRow, SHEETS } = require('../sheets')

const router = express.Router()

// Kolom Scores: timestamp | date | username | name | listening | structure | reading | total | accuracy
function parseScore(row) {
  return {
    timestamp:  row[0],
    date:       row[1],
    username:   row[2],
    name:       row[3],
    listening:  parseInt(row[4]) || 0,
    structure:  parseInt(row[5]) || 0,
    reading:    parseInt(row[6]) || 0,
    total:      parseInt(row[7]) || 0,
    accuracy:   row[8] || '0%'
  }
}

// POST /api/scores  — simpan hasil tes
router.post('/', async (req, res) => {
  try {
    const { username, name, listening, structure, reading } = req.body
    const total = (listening || 0) + (structure || 0) + (reading || 0)
    const accuracy = Math.round((total / 45) * 100) + '%'
    const now = new Date()
    const timestamp = now.toISOString()
    const date = now.toISOString().slice(0, 10)

    await appendRow(SHEETS.SCORES, [timestamp, date, username, name, listening, structure, reading, total, accuracy])
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
    const rows = await getRange(`${SHEETS.SCORES}!A2:I`)
    const scores = rows.filter(r => r[2] === username).map(parseScore).reverse()
    return res.json({ scores })
  } catch (e) {
    res.status(500).json({ message: 'Gagal mengambil skor.' })
  }
})

// GET /api/scores/all  — semua skor (admin/leaderboard)
router.get('/all', async (req, res) => {
  try {
    const rows = await getRange(`${SHEETS.SCORES}!A2:I`)
    const scores = rows.map(parseScore).reverse()
    return res.json({ scores })
  } catch (e) {
    res.status(500).json({ message: 'Gagal mengambil skor.' })
  }
})

module.exports = router
