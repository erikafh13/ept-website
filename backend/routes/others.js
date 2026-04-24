const express = require('express')
const bcrypt = require('bcryptjs')
const { v4: uuidv4 } = require('uuid')
const { getRange, appendRow, clearRange, SHEETS } = require('../sheets')

// ── Answer Log ────────────────────────────────────────────────────────────────
const answersRouter = express.Router()

// POST /api/answers
answersRouter.post('/', async (req, res) => {
  try {
    const { username, answers, questions } = req.body
    const date = new Date().toISOString().slice(0, 10)
    const timestamp = new Date().toISOString()

    // Simpan setiap jawaban sebagai baris
    for (const sec of ['listening', 'structure', 'reading']) {
      const qs = questions[sec] || []
      for (let i = 0; i < qs.length; i++) {
        const q = qs[i]
        const userAns = answers[`${sec}_${i}`]
        const isCorrect = userAns === q.correct ? 1 : 0
        await appendRow(SHEETS.ANSWER_LOG, [
          timestamp, date, username, sec, i + 1,
          userAns !== undefined ? userAns : '',
          q.correct, isCorrect
        ])
      }
    }
    return res.json({ message: 'Jawaban berhasil disimpan.' })
  } catch (e) {
    console.error('Save answers error:', e)
    res.status(500).json({ message: 'Gagal menyimpan jawaban.' })
  }
})

// GET /api/answers/all
answersRouter.get('/all', async (req, res) => {
  try {
    const rows = await getRange(`${SHEETS.ANSWER_LOG}!A2:H`)
    // timestamp | date | username | section | q_no | user_answer | correct_answer | is_correct
    const log = rows.map(r => ({
      timestamp: r[0], date: r[1], username: r[2],
      section: r[3], q_no: parseInt(r[4]),
      user_answer: r[5], correct_answer: r[6],
      is_correct: parseInt(r[7]) === 1
    }))
    return res.json({ log })
  } catch (e) {
    res.status(500).json({ message: 'Gagal mengambil log.' })
  }
})

// GET /api/answers/user
answersRouter.get('/user', async (req, res) => {
  try {
    const { username } = req.query
    const rows = await getRange(`${SHEETS.ANSWER_LOG}!A2:H`)
    const log = rows
      .filter(r => r[2] === username)
      .map(r => ({
        timestamp: r[0], date: r[1], username: r[2],
        section: r[3], q_no: parseInt(r[4]),
        user_answer: r[5], correct_answer: r[6],
        is_correct: parseInt(r[7]) === 1
      }))
    return res.json({ log })
  } catch (e) {
    res.status(500).json({ message: 'Gagal mengambil log.' })
  }
})

// ── Users ─────────────────────────────────────────────────────────────────────
const usersRouter = express.Router()

// GET /api/users
usersRouter.get('/', async (req, res) => {
  try {
    const rows = await getRange(`${SHEETS.USERS}!A2:F`)
    const users = rows.map(r => ({
      username: r[0], name: r[2] || r[0], role: r[3] || 'user', phone: r[4] || ''
    }))
    return res.json({ users })
  } catch (e) {
    res.status(500).json({ message: 'Gagal mengambil users.' })
  }
})

// POST /api/users
usersRouter.post('/', async (req, res) => {
  try {
    const { username, password, name, role, phone } = req.body
    if (!username || !password || !name)
      return res.status(400).json({ message: 'username, password, name wajib.' })

    const rows = await getRange(`${SHEETS.USERS}!A2:A`)
    const exists = rows.some(r => r[0] === username)
    if (exists) return res.status(409).json({ message: 'Username sudah digunakan.' })

    const hashed = await bcrypt.hash(password, 10)
    const now = new Date().toISOString()
    await appendRow(SHEETS.USERS, [username, hashed, name, role || 'user', phone || '', now])
    return res.json({ message: 'User berhasil ditambahkan.' })
  } catch (e) {
    console.error('Add user error:', e)
    res.status(500).json({ message: 'Gagal menambah user.' })
  }
})

// DELETE /api/users?username=xxx
usersRouter.delete('/', async (req, res) => {
  try {
    const { username } = req.query
    const rows = await getRange(`${SHEETS.USERS}!A2:F`)
    const kept = rows.filter(r => r[0] !== username)
    await clearRange(`${SHEETS.USERS}!A2:F`)
    if (kept.length) {
      const { getSheetsClient, SPREADSHEET_ID } = require('../sheets')
      const sheets = getSheetsClient()
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEETS.USERS}!A2`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: kept }
      })
    }
    return res.json({ message: `User ${username} dihapus.` })
  } catch (e) {
    res.status(500).json({ message: 'Gagal menghapus user.' })
  }
})

// ── Question Pool ─────────────────────────────────────────────────────────────
const poolRouter = express.Router()

function parsePoolRow(row) {
  return {
    pool_id:    row[0],
    type:       row[1],
    no:         parseInt(row[2]) || 0,
    question:   row[3] || '',
    options:    [row[4]||'', row[5]||'', row[6]||'', row[7]||''],
    correct:    parseInt(row[8]) || 0,
    script:     row[9] || '',
    passage:    row[10] || '',
    difficulty: row[11] || 'medium'
  }
}

// GET /api/pool
poolRouter.get('/', async (req, res) => {
  try {
    const rows = await getRange(`${SHEETS.POOL}!A2:L`)
    return res.json({ pool: rows.map(parsePoolRow) })
  } catch (e) {
    res.status(500).json({ message: 'Gagal mengambil pool.' })
  }
})

// GET /api/pool/stats
poolRouter.get('/stats', async (req, res) => {
  try {
    const rows = await getRange(`${SHEETS.POOL}!A2:B`)
    const stats = { total: rows.length, listening: 0, structure: 0, reading: 0 }
    rows.forEach(r => { if (stats[r[1]] !== undefined) stats[r[1]]++ })
    return res.json({ stats })
  } catch (e) {
    res.status(500).json({ message: 'Gagal mengambil stats.' })
  }
})

// POST /api/pool  — tambah ke pool
poolRouter.post('/', async (req, res) => {
  try {
    const { type, no, question, option_a, option_b, option_c, option_d, correct, script, passage, difficulty } = req.body
    if (!type || !question) return res.status(400).json({ message: 'type dan question wajib.' })
    const pool_id = uuidv4().slice(0, 8).toUpperCase()
    await appendRow(SHEETS.POOL, [pool_id, type, no||1, question, option_a, option_b, option_c, option_d, correct||0, script||'', passage||'', difficulty||'medium'])
    return res.json({ message: 'Soal berhasil ditambahkan ke pool.', pool_id })
  } catch (e) {
    res.status(500).json({ message: 'Gagal menambah ke pool.' })
  }
})

// DELETE /api/pool?pool_id=xxx
poolRouter.delete('/', async (req, res) => {
  try {
    const { pool_id } = req.query
    const rows = await getRange(`${SHEETS.POOL}!A2:L`)
    const kept = rows.filter(r => r[0] !== pool_id)
    await clearRange(`${SHEETS.POOL}!A2:L`)
    if (kept.length) {
      const { getSheetsClient, SPREADSHEET_ID } = require('../sheets')
      const sheets = getSheetsClient()
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEETS.POOL}!A2`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: kept }
      })
    }
    return res.json({ message: 'Soal dihapus dari pool.' })
  } catch (e) {
    res.status(500).json({ message: 'Gagal menghapus dari pool.' })
  }
})

// POST /api/pool/draw  — ambil/buat soal acak hari ini (15+15+15)
poolRouter.post('/draw', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10)

    // Cek sudah ada draw hari ini?
    const drawRows = await getRange(`${SHEETS.DAILY_DRAW}!A2:B`)
    const existing = drawRows.find(r => r[0] === today)
    if (existing) {
      const ids = (existing[1] || '').split(',')
      return res.json({ message: 'Draw sudah ada.', pool_ids: ids, date: today })
    }

    // Ambil pool per seksi
    const poolRows = await getRange(`${SHEETS.POOL}!A2:L`)
    const bySection = {
      listening: poolRows.filter(r => r[1] === 'listening'),
      structure: poolRows.filter(r => r[1] === 'structure'),
      reading:   poolRows.filter(r => r[1] === 'reading')
    }

    for (const sec of ['listening','structure','reading']) {
      if (bySection[sec].length < 15)
        return res.status(400).json({ message: `Pool ${sec} kurang dari 15 soal (${bySection[sec].length} tersedia).` })
    }

    // Shuffle & pilih 15 tiap seksi
    const pick = (arr, n) => arr.sort(() => Math.random() - 0.5).slice(0, n)
    const chosen = [
      ...pick(bySection.listening, 15),
      ...pick(bySection.structure, 15),
      ...pick(bySection.reading, 15)
    ]
    const ids = chosen.map(r => r[0]).join(',')
    await appendRow(SHEETS.DAILY_DRAW, [today, ids])
    return res.json({ message: 'Draw berhasil dibuat.', pool_ids: ids.split(','), date: today })
  } catch (e) {
    console.error('Pool draw error:', e)
    res.status(500).json({ message: 'Gagal membuat draw.' })
  }
})

module.exports = { answersRouter, usersRouter, poolRouter }
