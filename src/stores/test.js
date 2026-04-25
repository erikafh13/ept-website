/**
 * stores/test.js
 *
 * Perbaikan final:
 * - Timer pakai state reaktif `remaining` + tickTimer() (bukan computed elapsed)
 * - finishTest() mengirim `sections` ke answerLogApi agar backend tahu seksi aktif
 * - testMode menentukan SECTIONS yang aktif dan durasi waktu
 * - Soal salah disimpan ke localStorage per user untuk fitur review
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { questionsApi, scoresApi, answerLogApi } from '@/services/api'
import { useAuthStore } from './auth'
import router from '@/router'

const ALL_SECTIONS = ['listening', 'structure', 'reading']

// Durasi tes per mode (detik)
const DURATION = {
  full:      90 * 60,
  listening: 30 * 60,
  structure: 25 * 60,
  reading:   35 * 60,
}

// Minimum soal per seksi
const MIN_QUOTA = { listening: 15, structure: 15, reading: 15 }

export const useTestStore = defineStore('test', () => {
  const auth = useAuthStore()

  // ── State ──────────────────────────────────────────────────────────────────
  const active      = ref(false)
  const section     = ref('listening')
  const idx         = ref(0)
  const answers     = ref({})
  const questions   = ref({ listening: [], structure: [], reading: [] })
  const remaining   = ref(0)
  const lastScore   = ref(null)
  const lastDetail  = ref(null)
  const loading     = ref(false)
  const soalMode    = ref('manual')
  const testMode    = ref('full')

  // ── Computed ───────────────────────────────────────────────────────────────
  // Seksi yang aktif dalam sesi ini
  const SECTIONS = computed(() =>
    testMode.value === 'full' ? ALL_SECTIONS : [testMode.value]
  )

  const currentList = computed(() => questions.value[section.value] || [])
  const currentQ    = computed(() => currentList.value[idx.value])
  const answerKey   = computed(() => `${section.value}_${idx.value}`)

  const totalAll = computed(() =>
    SECTIONS.value.reduce((s, k) => s + (questions.value[k]?.length || 0), 0)
  )
  const totalAnswered = computed(() => Object.keys(answers.value).length)

  // Cek apakah soal cukup untuk mode yang dipilih
  const hasQuestions = computed(() => {
    if (testMode.value === 'full') {
      return ALL_SECTIONS.every(s => (questions.value[s]?.length || 0) >= MIN_QUOTA[s])
    }
    return (questions.value[testMode.value]?.length || 0) >= MIN_QUOTA[testMode.value]
  })

  // ── Muat soal dari backend ─────────────────────────────────────────────────
  async function loadQuestions() {
    loading.value = true
    try {
      const res        = await questionsApi.getToday()
      questions.value  = res.data.questions
      soalMode.value   = res.data.mode || 'manual'
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
    const startSec  = testMode.value === 'full' ? 'listening' : testMode.value
    active.value    = true
    section.value   = startSec
    idx.value       = 0
    answers.value   = {}
    remaining.value = DURATION[testMode.value] ?? DURATION.full
    saveState()
    router.push('/test')
  }

  // ── Simpan & pulihkan state dari localStorage ──────────────────────────────
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
    try {
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
      testMode.value  = s.testMode ?? 'full'
      return true
    } catch {
      return false
    }
  }

  // ── Jawab soal ─────────────────────────────────────────────────────────────
  function setAnswer(val) {
    answers.value[answerKey.value] = val
    saveState()
  }

  // ── Navigasi antar soal ────────────────────────────────────────────────────
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

  // ── Tick timer (dipanggil TestView setiap 1 detik) ─────────────────────────
  function tickTimer() {
    if (remaining.value > 0) {
      remaining.value--
      // Hemat tulis localStorage — hanya tiap 5 detik
      if (remaining.value % 5 === 0) saveState()
    }
  }

  // ── Selesai tes & kirim skor ───────────────────────────────────────────────
  async function finishTest() {
    const qs   = questions.value
    const ans  = answers.value
    const secs = SECTIONS.value

    let s_l = 0, s_s = 0, s_r = 0
    const detail = []

    if (secs.includes('listening')) {
      qs.listening?.forEach((q, i) => {
        const correct = ans[`listening_${i}`] === q.correct
        if (correct) s_l++
        detail.push({
          section: 'listening', no: i + 1,
          question: q.question, options: q.options,
          correct: q.correct,
          userAnswer: ans[`listening_${i}`],
          explanation: q.explanation || '',
        })
      })
    }
    if (secs.includes('structure')) {
      qs.structure?.forEach((q, i) => {
        const correct = ans[`structure_${i}`] === q.correct
        if (correct) s_s++
        detail.push({
          section: 'structure', no: i + 1,
          question: q.question, options: q.options,
          correct: q.correct,
          userAnswer: ans[`structure_${i}`],
          explanation: q.explanation || '',
        })
      })
    }
    if (secs.includes('reading')) {
      qs.reading?.forEach((q, i) => {
        const correct = ans[`reading_${i}`] === q.correct
        if (correct) s_r++
        detail.push({
          section: 'reading', no: i + 1,
          question: q.question, options: q.options,
          correct: q.correct,
          userAnswer: ans[`reading_${i}`],
          explanation: q.explanation || '',
        })
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

    // Simpan soal salah ke localStorage (untuk review)
    _saveWrongQuestions(detail, auth.user?.username)

    // Kirim skor ke backend
    await scoresApi.save({
      username:  auth.user.username,
      name:      auth.user.name,
      listening: score.listening,
      structure: score.structure,
      reading:   score.reading,
      testMode:  testMode.value,
    })

    // Kirim log jawaban ke backend — sertakan `sections` agar backend tahu seksi aktif
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

  // ── Simpan soal salah ke localStorage per user ─────────────────────────────
  function _saveWrongQuestions(detail, username) {
    if (!username) return
    const key = `ept_wrong_${username}`
    let existing = []
    try { existing = JSON.parse(localStorage.getItem(key) || '[]') } catch {}
    const existingTexts = new Set(existing.map(q => q.question))
    const wrong  = detail.filter(d => d.userAnswer !== d.correct && !existingTexts.has(d.question))
    const merged = [...existing, ...wrong].slice(-100)
    localStorage.setItem(key, JSON.stringify(merged))
  }

  function getWrongQuestions(username) {
    if (!username) return []
    try {
      return JSON.parse(localStorage.getItem(`ept_wrong_${username}`) || '[]')
    } catch { return [] }
  }

  function clearWrongQuestion(username, questionText) {
    const key = `ept_wrong_${username}`
    try {
      const list = JSON.parse(localStorage.getItem(key) || '[]')
      localStorage.setItem(key, JSON.stringify(list.filter(q => q.question !== questionText)))
    } catch {}
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
