const { google } = require('googleapis')
const path = require('path')

let _sheets = null

function getSheetsClient() {
  if (_sheets) return _sheets

  let credentials
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
  } else {
    const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH || './service-account.json'
    credentials = require(path.resolve(keyPath))
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  })

  _sheets = google.sheets({ version: 'v4', auth })
  return _sheets
}

const SPREADSHEET_ID = process.env.SPREADSHEET_ID

// ── Generic helpers ──────────────────────────────────────────────────────────

async function getRange(range) {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range })
  return res.data.values || []
}

async function appendRow(sheet, values) {
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheet}!A1`,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [values] }
  })
}

async function clearRange(range) {
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID, range })
}

async function updateRow(sheet, rowIndex, values) {
  const sheets = getSheetsClient()
  const range = `${sheet}!A${rowIndex}:Z${rowIndex}`
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [values] }
  })
}

// ── Sheet names (sesuaikan dengan spreadsheet kamu) ──────────────────────────
const SHEETS = {
  USERS:       'Users',
  QUESTIONS:   'Questions',
  SCORES:      'Scores',
  ANSWER_LOG:  'AnswerLog',
  POOL:        'QuestionPool',
  DAILY_DRAW:  'DailyDraw'
}

module.exports = { getRange, appendRow, clearRange, updateRow, SHEETS, SPREADSHEET_ID }
