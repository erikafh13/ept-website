/**
 * backend/routes/questions.js
 *
 * Perbaikan:
 * - DailyDraw dibaca per baris (date|pool_id|no|section), bukan satu baris CSV
 * - Pool soal dibaca sesuai urutan kolom aktual QuestionPool
 * - Questions manual dibaca sesuai kolom aktual sheet Questions
 *
 * Kolom Questions aktual:
 * A:date | B:no | C:type | D:question | E:opt_a | F:opt_b | G:opt_c | H:opt_d |
 * I:correct | J:script | K:passage | L:difficulty
 *
 * Kolom QuestionPool aktual:
 * A:pool_id | B:type | C:question | D:opt_a | E:opt_b | F:opt_c | G:opt_d |
 * H:correct | I:script | J:passage | K:difficulty | L:answer_key | M:explanation
 *
 * Kolom DailyDraw aktual (per baris per soal):
 * A:date | B:pool_id | C:no | D:section
 */
const express = require('express')
const { getRange, appendRow, clearRange, SHEETS } = require('../sheets')

const router = express.Router()

// ── Parser Questions manual (sheet "Questions") ───────────────────────────────
function parseQuestion(row) {
  return {
    date:       row[0] || '',
    no:         parseInt(row[1]) || 0,
    type:       row[2] || '',
    question:   row[3] || '',
    options:    [row[4]||'', row[5]||'', row[6]||'', row[7]||''],
    correct:    parseInt(row[8]) || 0,
    script:     row[9]  || '',
    passage:    row[10] || '',
    difficulty: row[11] || 'medium',
    answer_key: row[12] || '',
    explanation:row[13] || '',
  }
}

// ── Parser QuestionPool ───────────────────────────────────────────────────────
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

// Kelompokkan soal berdasarkan type (listening/structure/reading)
function groupBySection(questions) {
  return {
    listening: questions.filter(q => q.type === 'listening').sort((a, b) => a.no - b.no),
    structure: questions.filter(q => q.type === 'structure').sort((a, b) => a.no - b.no),
    reading:   questions.filter(q => q.type === 'reading').sort((a, b) => a.no - b.no),
  }
}

// ── GET /api/questions/today — soal hari ini ──────────────────────────────────
router.get('/today', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10)

    // Cek DailyDraw — format: satu baris per soal (date|pool_id|no|section)
    const drawRows   = await getRange(`${SHEETS.DAILY_DRAW}!A2:D`)
    const todayDraws = drawRows.filter(r => r[0] === today)

    if (todayDraws.length > 0) {
      // Kumpulkan semua pool_id yang dipilih hari ini
      const poolIds = todayDraws.map(r => r[1]).filter(Boolean)
      const poolIdSet = new Set(poolIds)

      // Ambil semua soal dari pool, filter hanya yang terpilih
      const poolRows = await getRange(`${SHEETS.POOL}!A2:M`)
      const poolMap  = {}
      poolRows.forEach(r => { if (poolIdSet.has(r[0])) poolMap[r[0]] = r })

      // Susun soal sesuai urutan DailyDraw (kolom no & section sudah ada)
      const poolQs = todayDraws.map((draw, idx) => {
        const pid = draw[1]
        const no  = parseInt(draw[2]) || (idx + 1)
        const sec = draw[3] || ''
        const row = poolMap[pid]
        if (!row) return null
        return {
          ...parsePoolRow(row),
          type: sec || row[1],  // gunakan section dari DailyDraw, fallback ke pool
          no,
        }
      }).filter(Boolean)

      return res.json({ questions: groupBySection(poolQs), mode: 'pool' })
    }

    // Fallback: soal manual dari sheet Questions
    const rows    = await getRange(`${SHEETS.QUESTIONS}!A2:N`)
    const todayQs = rows.filter(r => r[0] === today).map(parseQuestion)
    return res.json({ questions: groupBySection(todayQs), mode: 'manual' })
  } catch (e) {
    console.error('Get today questions error:', e)
    res.status(500).json({ message: 'Gagal mengambil soal.' })
  }
})

// ── GET /api/questions?date=YYYY-MM-DD — soal per tanggal (admin) ─────────────
router.get('/', async (req, res) => {
  try {
    const { date } = req.query
    const rows     = await getRange(`${SHEETS.QUESTIONS}!A2:N`)
    const filtered = date ? rows.filter(r => r[0] === date) : rows
    return res.json({ questions: groupBySection(filtered.map(parseQuestion)) })
  } catch (e) {
    res.status(500).json({ message: 'Gagal mengambil soal.' })
  }
})

// ── POST /api/questions — tambah soal manual (admin) ─────────────────────────
router.post('/', async (req, res) => {
  try {
    const {
      date, no, type, question,
      option_a, option_b, option_c, option_d,
      correct, script, passage, difficulty,
      answer_key, explanation,
    } = req.body

    if (!date || !type || !question)
      return res.status(400).json({ message: 'date, type, question wajib diisi.' })

    // Simpan sesuai urutan kolom aktual sheet Questions
    await appendRow(SHEETS.QUESTIONS, [
      date, no || 1, type, question,
      option_a || '', option_b || '', option_c || '', option_d || '',
      correct || 0,
      script || '', passage || '',
      difficulty || 'medium',
      answer_key || '',
      explanation || '',
    ])

    return res.json({ message: 'Soal berhasil ditambahkan.' })
  } catch (e) {
    console.error('Add question error:', e)
    res.status(500).json({ message: 'Gagal menyimpan soal.' })
  }
})

// ── DELETE /api/questions?date=YYYY-MM-DD — hapus soal per tanggal (admin) ───
router.delete('/', async (req, res) => {
  try {
    const { date } = req.query
    if (!date) return res.status(400).json({ message: 'date wajib.' })

    const rows = await getRange(`${SHEETS.QUESTIONS}!A2:N`)
    const kept = rows.filter(r => r[0] !== date)
    await clearRange(`${SHEETS.QUESTIONS}!A2:N`)

    if (kept.length) {
      const { getSheetsClient, SPREADSHEET_ID } = require('../sheets')
      const sheets = getSheetsClient()
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEETS.QUESTIONS}!A2`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: kept },
      })
    }

    return res.json({ message: `Soal tanggal ${date} dihapus.` })
  } catch (e) {
    console.error('Delete questions error:', e)
    res.status(500).json({ message: 'Gagal menghapus soal.' })
  }
})

module.exports = router
