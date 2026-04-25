/**
 * backend/routes/others.js
 *
 * Perbaikan dari sheet aktual:
 *
 * AnswerLog kolom aktual:
 * A: username | B: date | C: question_date | D: section | E: q_no |
 * F: is_correct | G: user_answer | H: correct_answer | I: timestamp
 *
 * DailyDraw kolom aktual:
 * A: date | B: pool_id | C: no | D: section
 * (SATU BARIS PER SOAL — bukan satu baris dengan semua ID dipisah koma)
 *
 * QuestionPool kolom aktual:
 * A: pool_id | B: type | C: question | D: option_a | E: option_b |
 * F: option_c | G: option_d | H: correct | I: script | J: passage | K: difficulty
 * (kolom L: answer_key dan M: explanation akan ditambahkan nanti)
 */
const express = require('express')
const { getRange, appendRow, clearRange, SHEETS } = require('../sheets')

// ── Answer Log ────────────────────────────────────────────────────────────────
const answersRouter = express.Router()

// POST /api/answers — simpan log jawaban per soal
answersRouter.post('/', async (req, res) => {
  try {
    const { username, answers, questions, sections } = req.body
    const now           = new Date()
    const timestamp     = now.toISOString()
    const date          = timestamp.slice(0, 10)
    const question_date = date // soal harian = tanggal hari ini

    // Iterasi hanya seksi yang dikerjakan
    const activeSections = sections || ['listening', 'structure', 'reading']

    for (const sec of activeSections) {
      const qs = questions[sec] || []
      for (let i = 0; i < qs.length; i++) {
        const q          = qs[i]
        const userAns    = answers[`${sec}_${i}`]
        const isCorrect  = userAns === q.correct ? 1 : 0

        // Simpan sesuai urutan kolom aktual sheet AnswerLog:
        // username | date | question_date | section | q_no | is_correct | user_answer | correct_answer | timestamp
        await appendRow(SHEETS.ANSWER_LOG, [
          username,
          date,
          question_date,
          sec,
          i + 1,
          isCorrect,
          userAns !== undefined ? userAns : '',
          q.correct,
          timestamp,
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
    const rows = await getRange(`${SHEETS.ANSWER_LOG}!A2:I`)
    const log  = rows.map(parseAnswerLog)
    return res.json({ log })
  } catch (e) {
    res.status(500).json({ message: 'Gagal mengambil log.' })
  }
})

// GET /api/answers/user?username=xxx
answersRouter.get('/user', async (req, res) => {
  try {
    const { username } = req.query
    const rows = await getRange(`${SHEETS.ANSWER_LOG}!A2:I`)
    const log  = rows.filter(r => r[0] === username).map(parseAnswerLog)
    return res.json({ log })
  } catch (e) {
    res.status(500).json({ message: 'Gagal mengambil log.' })
  }
})

function parseAnswerLog(r) {
  return {
    username:      r[0] || '',
    date:          r[1] || '',
    question_date: r[2] || '',
    section:       r[3] || '',
    q_no:          parseInt(r[4]) || 0,
    is_correct:    parseInt(r[5]) === 1,
    user_answer:   r[6] !== '' && r[6] !== undefined ? parseInt(r[6]) : null,
    correct_answer:r[7] !== '' && r[7] !== undefined ? parseInt(r[7]) : null,
    timestamp:     r[8] || '',
  }
}

// ── Users ─────────────────────────────────────────────────────────────────────
const usersRouter = express.Router()

// GET /api/users
usersRouter.get('/', async (req, res) => {
  try {
    const rows  = await getRange(`${SHEETS.USERS}!A2:F`)
    // Kolom: username | password | name | role | phone | created_at
    const users = rows.map(r => ({
      username: r[0],
      name:     r[2] || r[0],
      role:     r[3] || 'user',
      phone:    r[4] || '',
    }))
    return res.json({ users })
  } catch (e) {
    res.status(500).json({ message: 'Gagal mengambil users.' })
  }
})

// POST /api/users
usersRouter.post('/', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs')
    const { username, password, name, role, phone } = req.body
    if (!username || !password || !name)
      return res.status(400).json({ message: 'username, password, name wajib.' })

    const rows   = await getRange(`${SHEETS.USERS}!A2:A`)
    const exists = rows.some(r => r[0] === username)
    if (exists) return res.status(409).json({ message: 'Username sudah digunakan.' })

    const hashed = await bcrypt.hash(password, 10)
    const now    = new Date().toISOString()
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
    await _rewriteSheet(SHEETS.USERS, 'A2:F', kept)
    return res.json({ message: `User ${username} dihapus.` })
  } catch (e) {
    res.status(500).json({ message: 'Gagal menghapus user.' })
  }
})

// ── Question Pool ─────────────────────────────────────────────────────────────
const poolRouter = express.Router()

// Parsing baris QuestionPool sesuai kolom aktual
// A:pool_id | B:type | C:question | D:opt_a | E:opt_b | F:opt_c | G:opt_d |
// H:correct | I:script | J:passage | K:difficulty
// (L:answer_key | M:explanation akan ditambahkan nanti)
function parsePoolRow(row) {
  return {
    pool_id:    row[0]  || '',
    type:       row[1]  || '',
    question:   row[2]  || '',
    options:    [row[3]||'', row[4]||'', row[5]||'', row[6]||''],
    correct:    parseInt(row[7]) || 0,
    script:     row[8]  || '',
    passage:    row[9]  || '',
    difficulty: row[10] || 'medium',
    answer_key: row[11] || '',
    explanation:row[12] || '',
  }
}

// GET /api/pool
poolRouter.get('/', async (req, res) => {
  try {
    const rows = await getRange(`${SHEETS.POOL}!A2:M`)
    return res.json({ pool: rows.map(parsePoolRow) })
  } catch (e) {
    res.status(500).json({ message: 'Gagal mengambil pool.' })
  }
})

// GET /api/pool/stats
poolRouter.get('/stats', async (req, res) => {
  try {
    const rows  = await getRange(`${SHEETS.POOL}!A2:B`)
    const stats = { total: rows.length, listening: 0, structure: 0, reading: 0 }
    rows.forEach(r => { if (stats[r[1]] !== undefined) stats[r[1]]++ })
    return res.json({ stats })
  } catch (e) {
    res.status(500).json({ message: 'Gagal mengambil stats.' })
  }
})

// POST /api/pool — tambah soal ke pool
poolRouter.post('/', async (req, res) => {
  try {
    const {
      pool_id, type, question,
      option_a, option_b, option_c, option_d,
      correct, script, passage, difficulty,
      answer_key, explanation,
    } = req.body
    if (!type || !question)
      return res.status(400).json({ message: 'type dan question wajib.' })

    // Generate pool_id otomatis jika tidak dikirim
    const prefix = type === 'listening' ? 'L' : type === 'structure' ? 'S' : 'R'
    const id     = pool_id || (prefix + String(Date.now()).slice(-4))

    // Simpan sesuai urutan kolom aktual:
    // pool_id|type|question|opt_a|opt_b|opt_c|opt_d|correct|script|passage|difficulty|answer_key|explanation
    await appendRow(SHEETS.POOL, [
      id, type, question,
      option_a || '', option_b || '', option_c || '', option_d || '',
      correct || 0,
      script || '', passage || '',
      difficulty || 'medium',
      answer_key || '',
      explanation || '',
    ])
    return res.json({ message: 'Soal berhasil ditambahkan ke pool.', pool_id: id })
  } catch (e) {
    res.status(500).json({ message: 'Gagal menambah ke pool.' })
  }
})

// DELETE /api/pool?pool_id=xxx
poolRouter.delete('/', async (req, res) => {
  try {
    const { pool_id } = req.query
    const rows = await getRange(`${SHEETS.POOL}!A2:M`)
    const kept = rows.filter(r => r[0] !== pool_id)
    await _rewriteSheet(SHEETS.POOL, 'A2:M', kept)
    return res.json({ message: 'Soal dihapus dari pool.' })
  } catch (e) {
    res.status(500).json({ message: 'Gagal menghapus dari pool.' })
  }
})

// POST /api/pool/draw — buat soal acak hari ini (15+15+15)
// Format DailyDraw: SATU BARIS PER SOAL (sesuai sheet aktual)
// A:date | B:pool_id | C:no | D:section
poolRouter.post('/draw', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10)

    // Cek apakah draw hari ini sudah ada
    const drawRows   = await getRange(`${SHEETS.DAILY_DRAW}!A2:D`)
    const todayDraws = drawRows.filter(r => r[0] === today)
    if (todayDraws.length > 0) {
      const pool_ids = todayDraws.map(r => r[1])
      return res.json({ message: 'Draw sudah ada.', pool_ids, date: today })
    }

    // Ambil pool per seksi
    const poolRows  = await getRange(`${SHEETS.POOL}!A2:B`)
    const bySection = {
      listening: poolRows.filter(r => r[1] === 'listening').map(r => r[0]),
      structure: poolRows.filter(r => r[1] === 'structure').map(r => r[0]),
      reading:   poolRows.filter(r => r[1] === 'reading').map(r => r[0]),
    }

    for (const sec of ['listening', 'structure', 'reading']) {
      if (bySection[sec].length < 15)
        return res.status(400).json({
          message: `Pool ${sec} kurang dari 15 soal (${bySection[sec].length} tersedia).`
        })
    }

    // Shuffle & pilih 15 tiap seksi
    const shuffle = arr => arr.sort(() => Math.random() - 0.5)
    const chosen = {
      listening: shuffle([...bySection.listening]).slice(0, 15),
      structure: shuffle([...bySection.structure]).slice(0, 15),
      reading:   shuffle([...bySection.reading]).slice(0, 15),
    }

    // Simpan ke DailyDraw — satu baris per soal sesuai format sheet aktual
    const allIds = []
    let noCounter = 1
    for (const sec of ['listening', 'structure', 'reading']) {
      for (let i = 0; i < chosen[sec].length; i++) {
        const pid = chosen[sec][i]
        await appendRow(SHEETS.DAILY_DRAW, [today, pid, noCounter, sec])
        allIds.push(pid)
        noCounter++
      }
    }

    return res.json({ message: 'Draw berhasil dibuat.', pool_ids: allIds, date: today })
  } catch (e) {
    console.error('Pool draw error:', e)
    res.status(500).json({ message: 'Gagal membuat draw.' })
  }
})

// ── Helper internal: tulis ulang sheet ───────────────────────────────────────
async function _rewriteSheet(sheetName, range, rows) {
  const { getSheetsClient, SPREADSHEET_ID } = require('../sheets')
  await clearRange(`${sheetName}!${range}`)
  if (!rows.length) return
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A2`,
    valueInputOption: 'USER_ENTERED',
    resource: { values: rows },
  })
}

module.exports = { answersRouter, usersRouter, poolRouter }
