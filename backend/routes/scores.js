/**
 * backend/routes/scores.js
 *
 * Urutan kolom di Google Sheet "Scores" (AKTUAL):
 * A: username | B: name | C: date | D: listening | E: structure |
 * F: reading  | G: total | H: accuracy | I: timestamp | J: testMode (kolom baru)
 *
 * PERHATIAN: Tambahkan header kolom J "testMode" di baris 1 sheet Scores.
 */
const express = require('express')
const { getRange, appendRow, SHEETS } = require('../sheets')

const router = express.Router()

// Parsing baris dari sheet sesuai urutan kolom aktual
function parseScore(row) {
  return {
    username:  row[0] || '',
    name:      row[1] || '',
    date:      row[2] || '',
    listening: row[3] !== '' && row[3] !== undefined ? parseInt(row[3]) : null,
    structure: row[4] !== '' && row[4] !== undefined ? parseInt(row[4]) : null,
    reading:   row[5] !== '' && row[5] !== undefined ? parseInt(row[5]) : null,
    total:     parseInt(row[6]) || 0,
    accuracy:  row[7] || '0%',
    timestamp: row[8] || '',
    testMode:  row[9] || 'full',
  }
}

// POST /api/scores — simpan hasil tes
router.post('/', async (req, res) => {
  try {
    const { username, name, listening, structure, reading, testMode } = req.body

    // Hitung total hanya dari seksi yang dikerjakan
    const vals    = [listening, structure, reading].filter(v => v !== null && v !== undefined)
    const total   = vals.reduce((s, v) => s + (parseInt(v) || 0), 0)
    const modeMax = { full: 45, listening: 15, structure: 15, reading: 15 }
    const possible  = modeMax[testMode] || 45
    const accuracy  = Math.round((total / possible) * 100) + '%'
    const timestamp = new Date().toISOString()
    const date      = timestamp.slice(0, 10)

    // Simpan sesuai urutan kolom aktual di sheet
    await appendRow(SHEETS.SCORES, [
      username,
      name,
      date,
      listening ?? '',
      structure ?? '',
      reading   ?? '',
      total,
      accuracy,
      timestamp,
      testMode || 'full',
    ])

    return res.json({ message: 'Skor berhasil disimpan.', total, accuracy })
  } catch (e) {
    console.error('Save score error:', e)
    res.status(500).json({ message: 'Gagal menyimpan skor.' })
  }
})

// GET /api/scores/user?username=xxx
router.get('/user', async (req, res) => {
  try {
    const { username } = req.query
    if (!username) return res.status(400).json({ message: 'username wajib.' })
    const rows   = await getRange(`${SHEETS.SCORES}!A2:J`)
    const scores = rows.filter(r => r[0] === username).map(parseScore).reverse()
    return res.json({ scores })
  } catch (e) {
    console.error('Get user scores error:', e)
    res.status(500).json({ message: 'Gagal mengambil skor.' })
  }
})

// GET /api/scores/all
router.get('/all', async (req, res) => {
  try {
    const rows   = await getRange(`${SHEETS.SCORES}!A2:J`)
    const scores = rows.map(parseScore).reverse()
    return res.json({ scores })
  } catch (e) {
    console.error('Get all scores error:', e)
    res.status(500).json({ message: 'Gagal mengambil skor.' })
  }
})

module.exports = router
