import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { questionsApi, scoresApi, answerLogApi } from '@/services/api'
import { useAuthStore } from './auth'
import router from '@/router'

const SECTIONS = ['listening', 'structure', 'reading']
const TEST_DURATION = 90 * 60 // 90 menit

export const useTestStore = defineStore('test', () => {
  const auth = useAuthStore()

  // State
  const active = ref(false)
  const section = ref('listening')
  const idx = ref(0)
  const answers = ref({})
  const questions = ref({ listening: [], structure: [], reading: [] })
  const startTime = ref(null)
  const lastScore = ref(null)
  const loading = ref(false)
  const soalMode = ref('manual')

  // Computed
  const currentList = computed(() => questions.value[section.value] || [])
  const currentQ = computed(() => currentList.value[idx.value])
  const answerKey = computed(() => `${section.value}_${idx.value}`)
  const totalAll = computed(() => SECTIONS.reduce((s, k) => s + (questions.value[k]?.length || 0), 0))
  const totalAnswered = computed(() => Object.keys(answers.value).length)
  const elapsed = computed(() => startTime.value ? Math.floor((Date.now() - startTime.value) / 1000) : 0)
  const remaining = computed(() => Math.max(0, TEST_DURATION - elapsed.value))
  const hasQuestions = computed(() => totalAll.value >= 45)

  // Muat soal dari API
  async function loadQuestions() {
    loading.value = true
    try {
      const res = await questionsApi.getToday()
      questions.value = res.data.questions
      soalMode.value = res.data.mode || 'manual'
    } finally {
      loading.value = false
    }
  }

  // Mulai tes
  function startTest() {
    active.value = true
    section.value = 'listening'
    idx.value = 0
    answers.value = {}
    startTime.value = Date.now()
    saveState()
    router.push('/test')
  }

  // Simpan state ke localStorage (agar tidak hilang saat refresh)
  function saveState() {
    localStorage.setItem('ept_test_state', JSON.stringify({
      active: active.value,
      section: section.value,
      idx: idx.value,
      answers: answers.value,
      startTime: startTime.value,
      questions: questions.value,
    }))
  }

  // Pulihkan state dari localStorage
  function restoreState() {
    const saved = localStorage.getItem('ept_test_state')
    if (!saved) return false
    const s = JSON.parse(saved)
    if (!s.active) return false
    active.value = s.active
    section.value = s.section
    idx.value = s.idx
    answers.value = s.answers
    startTime.value = s.startTime
    questions.value = s.questions
    return true
  }

  // Jawab soal
  function setAnswer(val) {
    answers.value[answerKey.value] = val
    saveState()
  }

  // Navigasi
  function nextQ() {
    const secIdx = SECTIONS.indexOf(section.value)
    if (idx.value < currentList.value.length - 1) {
      idx.value++
    } else if (secIdx < SECTIONS.length - 1) {
      section.value = SECTIONS[secIdx + 1]
      idx.value = 0
    }
    saveState()
  }

  function prevQ() {
    const secIdx = SECTIONS.indexOf(section.value)
    if (idx.value > 0) {
      idx.value--
    } else if (secIdx > 0) {
      section.value = SECTIONS[secIdx - 1]
      idx.value = questions.value[section.value]?.length - 1 || 0
    }
    saveState()
  }

  function jumpTo(sec, i) {
    section.value = sec
    idx.value = i
    saveState()
  }

  // Hitung dan submit skor
  async function finishTest() {
    const qs = questions.value
    const ans = answers.value
    let s_l = 0, s_s = 0, s_r = 0

    qs.listening?.forEach((q, i) => { if (ans[`listening_${i}`] === q.correct) s_l++ })
    qs.structure?.forEach((q, i) => { if (ans[`structure_${i}`] === q.correct) s_s++ })
    qs.reading?.forEach((q, i)   => { if (ans[`reading_${i}`]   === q.correct) s_r++ })

    const score = { listening: s_l, structure: s_s, reading: s_r }
    lastScore.value = score

    // Simpan ke Sheets
    await scoresApi.save({
      username: auth.user.username,
      name: auth.user.name,
      ...score
    })

    // Simpan answer log
    await answerLogApi.save({
      username: auth.user.username,
      answers: ans,
      questions: qs
    })

    active.value = false
    localStorage.removeItem('ept_test_state')
    router.push('/result')
  }

  return {
    active, section, idx, answers, questions, startTime, lastScore,
    loading, soalMode, currentList, currentQ, answerKey,
    totalAll, totalAnswered, elapsed, remaining, hasQuestions,
    loadQuestions, startTest, saveState, restoreState,
    setAnswer, nextQ, prevQ, jumpTo, finishTest, SECTIONS
  }
})
