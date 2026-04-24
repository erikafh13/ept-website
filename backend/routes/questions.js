const express = require('express')
const { getRange, appendRow, clearRange, SHEETS } = require('../sheets')

const router = express.Router()

// Parsing baris sheet Questions jadi objek soal
// Kolom: date | type | no | question | option_a | option_b | option_c | option_d | correct | script | passage
function parseQuestion(row) {
  return {
    date:     row[0],
    type:     row[1],
    no:       parseInt(row[2]) || 0,
    question: row[3] || '',
    options:  [row[4]||'', row[5]||'', row[6]||'', row[7]||''],
    correct:  parseInt(row[8]) || 0,
    script:   row[9] || '',
    passage:  row[10] || ''
  }
}

function groupBySection(questions) {
  return {
    listening: questions.filter(q => q.type === 'listening').sort((a,b) => a.no - b.no),
    structure: questions.filter(q => q.type === 'structure').sort((a,b) => a.no - b.no),
    reading:   questions.filter(q => q.type === 'reading').sort((a,b) => a.no - b.no)
  }
}

// GET /api/questions/today  — ambil soal untuk hari ini
// Jika ada di DailyDraw pakai pool, jika tidak pakai Questions manual
router.get('/today', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10)

    // Cek DailyDraw dulu
    const drawRows = await getRange(`${SHEETS.DAILY_DRAW}!A2:B`)
    const todayDraw = drawRows.find(r => r[0] === today)

    if (todayDraw) {
      // Ambil pool_ids dari kolom B (format: "id1,id2,id3,...")
      const poolIds = (todayDraw[1] || '').split(',').map(s => s.trim()).filter(Boolean)
      const poolRows = await getRange(`${SHEETS.POOL}!A2:L`)
      const poolQs = poolRows
        .filter(r => poolIds.includes(r[0]))
        .map(r => ({
          date: today,
          type: r[1], no: parseInt(r[2]) || 0,
          question: r[3] || '',
          options: [r[4]||'', r[5]||'', r[6]||'', r[7]||''],
          correct: parseInt(r[8]) || 0,
          script: r[9] || '',
          passage: r[10] || ''
        }))
      return res.json({ questions: groupBySection(poolQs), mode: 'pool' })
    }

    // Fallback: soal manual
    const rows = await getRange(`${SHEETS.QUESTIONS}!A2:K`)
    const todayQs = rows.filter(r => r[0] === today).map(parseQuestion)
    return res.json({ questions: groupBySection(todayQs), mode: 'manual' })
  } catch (e) {
    console.error('Get today questions error:', e)
    res.status(500).json({ message: 'Gagal mengambil soal.' })
  }
})

// GET /api/questions?date=YYYY-MM-DD  — soal per tanggal (admin)
router.get('/', async (req, res) => {
  try {
    const { date } = req.query
    const rows = await getRange(`${SHEETS.QUESTIONS}!A2:K`)
    const filtered = date ? rows.filter(r => r[0] === date) : rows
    return res.json({ questions: groupBySection(filtered.map(parseQuestion)) })
  } catch (e) {
    res.status(500).json({ message: 'Gagal mengambil soal.' })
  }
})

// POST /api/questions  — tambah soal (admin)
router.post('/', async (req, res) => {
  try {
    const { date, type, no, question, option_a, option_b, option_c, option_d, correct, script, passage } = req.body
    if (!date || !type || !question)
      return res.status(400).json({ message: 'date, type, question wajib diisi.' })
    await appendRow(SHEETS.QUESTIONS, [date, type, no, question, option_a, option_b, option_c, option_d, correct, script||'', passage||''])
    return res.json({ message: 'Soal berhasil ditambahkan.' })
  } catch (e) {
    console.error('Add question error:', e)
    res.status(500).json({ message: 'Gagal menyimpan soal.' })
  }
})

// DELETE /api/questions?date=YYYY-MM-DD  — hapus soal per tanggal (admin)
router.delete('/', async (req, res) => {
  try {
    const { date } = req.query
    if (!date) return res.status(400).json({ message: 'date wajib.' })

    const rows = await getRange(`${SHEETS.QUESTIONS}!A2:K`)
    const kept = rows.filter(r => r[0] !== date)

    // Clear seluruh data lalu tulis ulang yang tersisa
    await clearRange(`${SHEETS.QUESTIONS}!A2:K`)
    if (kept.length) {
      const { getSheetsClient, SPREADSHEET_ID } = require('../sheets')
      // Tulis ulang pakai update langsung
      const sheets = getSheetsClient()
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEETS.QUESTIONS}!A2`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: kept }
      })
    }
    return res.json({ message: `Soal tanggal ${date} dihapus.` })
  } catch (e) {
    console.error('Delete questions error:', e)
    res.status(500).json({ message: 'Gagal menghapus soal.' })
  }
})

module.exports = router
