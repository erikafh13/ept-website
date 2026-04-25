/**
 * stores/test.js
 * Store utama untuk sesi tes EPT.
 *
 * Perbaikan:
 * - Timer menggunakan nilai absolut yang disimpan, bukan computed dari elapsed
 *   (bug: computed elapsed tidak reaktif karena Date.now() tidak reaktif)
 * - Pemisahan kategori: user bisa pilih mode (single section / full test)
 * - Simpan soal salah per user ke localStorage untuk review di sesi berikutnya
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { questionsApi, scoresApi, answerLogApi } from '@/services/api'
import { useAuthStore } from './auth'
import router from '@/router'

const ALL_SECTIONS = ['listening', 'structure', 'reading']

// Durasi per mode (dalam detik)
const DURATION_MAP = {
  listening: 30 * 60,   // 30 menit
  structure: 25 * 60,   // 25 menit
  reading:   35 * 60,   // 35 menit
  full:      90 * 60,   // 90 menit
}

// Label jumlah soal per seksi
const SECTION_QUOTA = { listening: 15, structure: 15, reading: 15 }

export const useTestStore = defineStore('test', () => {
  const auth = useAuthStore()

  // ── State ──────────────────────────────────────────────────────────────────
  const active        = ref(false)
  const section       = ref('listening')       // seksi yang sedang dikerjakan
  const idx           = ref(0)
  const answers       = ref({})
  const questions     = ref({ listening: [], structure: [], reading: [] })
  const remaining     = ref(0)                 // FIX: disimpan sebagai state reaktif
  const lastScore     = ref(null)
  const lastDetail    = ref(null)              // detail per soal untuk halaman result
  const loading       = ref(false)
  const soalMode      = ref('manual')
  const testMode      = ref('full')            // 'full' | 'listening' | 'structure' | 'reading'

  // Seksi yang aktif dalam sesi ini (sesuai testMode)
  const SECTIONS = computed(() => {
    if (testMode.value === 'full') return ALL_SECTIONS
    return [testMode.value]
  })

  // ── Computed ───────────────────────────────────────────────────────────────
  const currentList    = computed(() => questions.value[section.value] || [])
  const currentQ       = computed(() => currentList.value[idx.value])
  const answerKey      = computed(() => `${section.value}_${idx.value}`)
  const totalAll       = computed(() =>
    SECTIONS.value.reduce((s, k) => s + (questions.value[k]?.length || 0), 0)
  )
  const totalAnswered  = computed(() => Object.keys(answers.value).length)
  const hasQuestions   = computed(() => {
    if (testMode.value === 'full') return totalAll.value >= 45
    const sec = testMode.value
    return (questions.value[sec]?.length || 0) >= SECTION_QUOTA[sec]
  })

  // ── Muat soal dari API ─────────────────────────────────────────────────────
  async function loadQuestions() {
    loading.value = true
    try {
      const res = await questionsApi.getToday()
      questions.value = res.data.questions
      soalMode.value  = res.data.mode || 'manual'
    } finally {
      loading.value = false
    }
  }

  // ── Pilih mode tes ─────────────────────────────────────────────────────────
  function setTestMode(mode) {
    testMode.value = mode
  }

  // ── Mulai tes ──────────────────────────────────────────────────────────────
  function startTest() {
    const startSec = testMode.value === 'full' ? 'listening' : testMode.value
    active.value    = true
    section.value   = startSec
    idx.value       = 0
    answers.value   = {}
    remaining.value = DURATION_MAP[testMode.value] ?? DURATION_MAP.full

    saveState()
    router.push('/test')
  }

  // ── Simpan & pulihkan state ────────────────────────────────────────────────
  function saveState() {
    localStorage.setItem('ept_test_state', JSON.stringify({
      active:    active.value,
      section:   section.value,
      idx:       idx.value,
      answers:   answers.value,
      remaining: remaining.value,
      questions: questions.value,
      testMode:  testMode.value,
    }))
  }

  function restoreState() {
    const saved = localStorage.getItem('ept_test_state')
    if (!saved) return false
    const s = JSON.parse(saved)
    if (!s.active) return false
    active.value    = s.active
    section.value   = s.section
    idx.value       = s.idx
    answers.value   = s.answers
    remaining.value = s.remaining ?? 0
    questions.value = s.questions
    testMode.value  = s.testMode  ?? 'full'
    return true
  }

  // ── Jawab soal ─────────────────────────────────────────────────────────────
  function setAnswer(val) {
    answers.value[answerKey.value] = val
    saveState()
  }

  // ── Navigasi ───────────────────────────────────────────────────────────────
  function nextQ() {
    const secs   = SECTIONS.value
    const secIdx = secs.indexOf(section.value)
    if (idx.value < currentList.value.length - 1) {
      idx.value++
    } else if (secIdx < secs.length - 1) {
      section.value = secs[secIdx + 1]
      idx.value     = 0
    }
    saveState()
  }

  function prevQ() {
    const secs   = SECTIONS.value
    const secIdx = secs.indexOf(section.value)
    if (idx.value > 0) {
      idx.value--
    } else if (secIdx > 0) {
      section.value = secs[secIdx - 1]
      idx.value     = (questions.value[section.value]?.length || 1) - 1
    }
    saveState()
  }

  function jumpTo(sec, i) {
    section.value = sec
    idx.value     = i
    saveState()
  }

  // ── Hitung & submit skor ───────────────────────────────────────────────────
  async function finishTest() {
    const qs  = questions.value
    const ans = answers.value
    const secs = SECTIONS.value

    let s_l = 0, s_s = 0, s_r = 0
    const detail = []  // untuk halaman result: { section, no, question, options, correct, userAnswer }

    if (secs.includes('listening')) {
      qs.listening?.forEach((q, i) => {
        const correct = ans[`listening_${i}`] === q.correct
        if (correct) s_l++
        detail.push({ section: 'listening', no: i + 1, question: q.question, options: q.options, correct: q.correct, userAnswer: ans[`listening_${i}`] })
      })
    }
    if (secs.includes('structure')) {
      qs.structure?.forEach((q, i) => {
        const correct = ans[`structure_${i}`] === q.correct
        if (correct) s_s++
        detail.push({ section: 'structure', no: i + 1, question: q.question, options: q.options, correct: q.correct, userAnswer: ans[`structure_${i}`] })
      })
    }
    if (secs.includes('reading')) {
      qs.reading?.forEach((q, i) => {
        const correct = ans[`reading_${i}`] === q.correct
        if (correct) s_r++
        detail.push({ section: 'reading', no: i + 1, question: q.question, options: q.options, correct: q.correct, userAnswer: ans[`reading_${i}`] })
      })
    }

    const score = {
      listening: secs.includes('listening') ? s_l : null,
      structure: secs.includes('structure') ? s_s : null,
      reading:   secs.includes('reading')   ? s_r : null,
      testMode:  testMode.value,
    }
    lastScore.value  = score
    lastDetail.value = detail

    // Simpan soal yang salah ke localStorage per user (untuk review mode)
    _saveWrongQuestions(detail, auth.user?.username)

    // Simpan ke Sheets
    const totalCorrect = (score.listening ?? 0) + (score.structure ?? 0) + (score.reading ?? 0)
    const totalPossible = secs.length * 15
    await scoresApi.save({
      username:  auth.user.username,
      name:      auth.user.name,
      listening: score.listening ?? 0,
      structure: score.structure ?? 0,
      reading:   score.reading   ?? 0,
      testMode:  testMode.value,
    })

    // Simpan answer log
    await answerLogApi.save({
      username:  auth.user.username,
      answers:   ans,
      questions: qs,
      sections:  secs,
    })

    active.value = false
    localStorage.removeItem('ept_test_state')
    router.push('/result')
  }

  // ── Simpan soal salah per user ─────────────────────────────────────────────
  function _saveWrongQuestions(detail, username) {
    if (!username) return
    const key = `ept_wrong_${username}`
    let existing = []
    try { existing = JSON.parse(localStorage.getItem(key) || '[]') } catch {}

    // Gabungkan: jika soal sama (berdasar teks question) sudah ada, skip
    const existingTexts = new Set(existing.map(q => q.question))
    const wrong = detail.filter(d => d.userAnswer !== d.correct && !existingTexts.has(d.question))
    const merged = [...existing, ...wrong].slice(-100) // simpan maks 100 soal salah
    localStorage.setItem(key, JSON.stringify(merged))
  }

  // Ambil soal yang pernah salah untuk review
  function getWrongQuestions(username) {
    if (!username) return []
    try {
      return JSON.parse(localStorage.getItem(`ept_wrong_${username}`) || '[]')
    } catch { return [] }
  }

  // Hapus soal salah tertentu (setelah user menjawab benar saat review)
  function clearWrongQuestion(username, questionText) {
    const key = `ept_wrong_${username}`
    try {
      const list = JSON.parse(localStorage.getItem(key) || '[]')
      localStorage.setItem(key, JSON.stringify(list.filter(q => q.question !== questionText)))
    } catch {}
  }

  // ── Tick timer dari luar (dipanggil oleh TestView setiap 1 detik) ──────────
  function tickTimer() {
    if (remaining.value > 0) {
      remaining.value--
      // Simpan ke state setiap 5 detik agar tidak terlalu sering tulis localStorage
      if (remaining.value % 5 === 0) saveState()
    }
  }

  return {
    // state
    active, section, idx, answers, questions, remaining,
    lastScore, lastDetail, loading, soalMode, testMode,
    // computed
    SECTIONS, currentList, currentQ, answerKey,
    totalAll, totalAnswered, hasQuestions,
    // actions
    loadQuestions, setTestMode, startTest,
    saveState, restoreState,
    setAnswer, nextQ, prevQ, jumpTo,
    finishTest, tickTimer,
    getWrongQuestions, clearWrongQuestion,
  }
})
