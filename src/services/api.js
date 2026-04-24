/**
 * services/api.js
 * Semua request ke backend proxy yang akan diteruskan ke Google Sheets API.
 * Ganti BASE_URL dengan URL backend kamu setelah deploy.
 */
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

const http = axios.create({
  baseURL: BASE_URL,
  timeout: 15000
})

// Tambahkan token auth ke setiap request
http.interceptors.request.use(config => {
  const user = localStorage.getItem('ept_user')
  if (user) {
    const { username } = JSON.parse(user)
    config.headers['x-username'] = username
  }
  return config
})

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (username, password) => http.post('/auth/login', { username, password }),
}

// ── Questions ─────────────────────────────────────────────────────────────────
export const questionsApi = {
  getToday: (date) => http.get('/questions/today', { params: { date } }),
  getByDate: (date) => http.get('/questions', { params: { date } }),
  add: (data) => http.post('/questions', data),
  deleteByDate: (date) => http.delete('/questions', { params: { date } }),
}

// ── Scores ────────────────────────────────────────────────────────────────────
export const scoresApi = {
  save: (data) => http.post('/scores', data),
  getUser: (username) => http.get('/scores/user', { params: { username } }),
  getAll: () => http.get('/scores/all'),
}

// ── Answer Log ────────────────────────────────────────────────────────────────
export const answerLogApi = {
  save: (data) => http.post('/answers', data),
  getAll: () => http.get('/answers'),
  getUser: (username) => http.get('/answers/user', { params: { username } }),
}

// ── Users (Admin) ─────────────────────────────────────────────────────────────
export const usersApi = {
  getAll: () => http.get('/users'),
  add: (data) => http.post('/users', data),
  delete: (username) => http.delete('/users', { params: { username } }),
}

// ── Question Pool ─────────────────────────────────────────────────────────────
export const poolApi = {
  getAll: () => http.get('/pool'),
  add: (data) => http.post('/pool', data),
  delete: (poolId) => http.delete('/pool', { params: { pool_id: poolId } }),
  getStats: () => http.get('/pool/stats'),
  getOrCreateToday: () => http.post('/pool/draw'),
}

export default http
