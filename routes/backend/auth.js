const express = require('express')
const bcrypt = require('bcryptjs')
const { getRange, SHEETS } = require('../sheets')

const router = express.Router()

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password)
      return res.status(400).json({ message: 'Username dan password wajib diisi.' })

    const rows = await getRange(`${SHEETS.USERS}!A2:F`)
    // Kolom: username | password | name | role | phone | created_at
    const user = rows.find(r => r[0] === username)
    if (!user)
      return res.status(401).json({ message: 'Username tidak ditemukan.' })

    // Support plain text password (legacy) dan bcrypt hash
    let valid = false
    const storedPass = user[1] || ''
    if (storedPass.startsWith('$2')) {
      valid = await bcrypt.compare(password, storedPass)
    } else {
      valid = password === storedPass
    }
    if (!valid)
      return res.status(401).json({ message: 'Password salah.' })

    return res.json({
      user: {
        username: user[0],
        name:     user[2] || user[0],
        role:     user[3] || 'user',
        phone:    user[4] || ''
      }
    })
  } catch (e) {
    console.error('Login error:', e)
    res.status(500).json({ message: 'Server error.' })
  }
})

module.exports = router
