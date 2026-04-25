<template>
  <div class="page">
    <Navbar />
    <div class="container result-wrap">
      <div v-if="!score" class="no-result">
        <p>Tidak ada hasil test.</p>
        <router-link to="/dashboard" class="btn btn-primary">Ke Dashboard</router-link>
      </div>

      <template v-else>
        <!-- ── Hero skor ──────────────────────────────────── -->
        <div class="result-hero card-glass">
          <div class="grade-ring" :style="`--gc:${gradeColor}`">{{ grade }}</div>
          <h1>Simulasi Selesai!</h1>
          <p class="mode-badge">
            <span class="badge badge-primary">{{ modeLabelFull }}</span>
          </p>
          <p class="grade-msg">{{ gradeMsg }}</p>
        </div>

        <!-- ── Kartu skor per kategori ───────────────────── -->
        <div class="score-grid" style="margin: 1.5rem 0;">
          <div v-if="score.listening !== null" class="stat-card blue">
            <div class="stat-num">{{ score.listening }}</div>
            <div class="stat-label">Listening<br>/{{ sectionMax('listening') }}</div>
          </div>
          <div v-if="score.structure !== null" class="stat-card purple">
            <div class="stat-num">{{ score.structure }}</div>
            <div class="stat-label">Structure<br>/{{ sectionMax('structure') }}</div>
          </div>
          <div v-if="score.reading !== null" class="stat-card orange">
            <div class="stat-num">{{ score.reading }}</div>
            <div class="stat-label">Reading<br>/{{ sectionMax('reading') }}</div>
          </div>
          <div class="stat-card green">
            <div class="stat-num">{{ totalCorrect }}</div>
            <div class="stat-label">Total<br>/{{ totalPossible }}</div>
          </div>
        </div>

        <!-- ── Akurasi ────────────────────────────────────── -->
        <div class="card" style="margin-bottom:1.5rem;">
          <div style="display:flex;justify-content:space-between;margin-bottom:0.6rem;">
            <span style="font-weight:600;">Akurasi Keseluruhan</span>
            <strong :style="`color:${gradeColor}`">{{ accuracy }}%</strong>
          </div>
          <div class="progress-bar" style="height:10px;">
            <div class="progress-fill" :style="`width:${accuracy}%;background:${gradeColor};transition:width 1s ease;`"></div>
          </div>
        </div>

        <!-- ── Info soal salah disimpan ───────────────────── -->
        <div v-if="wrongDetailCount > 0" class="alert alert-info" style="margin-bottom:1.5rem;">
          📌 <strong>{{ wrongDetailCount }} soal</strong> yang kamu jawab salah telah disimpan.
          Kamu bisa review ulang di halaman <router-link to="/review" style="color:var(--c-primary-light);font-weight:600;">Review Soal</router-link>
          atau langsung dari Dashboard.
        </div>

        <!-- ── Rekomendasi belajar ─────────────────────────── -->
        <div class="card" style="margin-bottom:1.5rem;">
          <h2 style="margin-bottom:1rem;">💡 Rekomendasi Belajar</h2>
          <ul class="recs-list">
            <li v-for="r in recs" :key="r">{{ r }}</li>
          </ul>
        </div>

        <!-- ── Review Jawaban ─────────────────────────────── -->
        <div class="card" style="margin-bottom:1.5rem;">
          <div class="review-header">
            <h2>🧠 Review Jawaban</h2>
            <label class="toggle-label">
              <input type="checkbox" v-model="wrongOnly" />
              <span>Salah saja</span>
            </label>
          </div>

          <div v-if="!detail || !detail.length" class="alert alert-info">
            Detail jawaban tidak tersedia.
          </div>

          <template v-else>
            <div v-for="sec in activeSections" :key="sec">
              <div class="review-sec-header">
                <span>{{ ICONS[sec] }} {{ LABELS[sec] }}</span>
                <span class="badge badge-primary">{{ secCorrect(sec) }}/{{ secTotal(sec) }}</span>
              </div>

              <div
                v-for="item in filteredDetail(sec)"
                :key="`${sec}_${item.no}`"
                class="review-item"
                :class="item.userAnswer === item.correct ? 'correct' : 'wrong'"
              >
                <!-- Nomor & teks soal -->
                <p class="review-q">
                  <strong>Soal {{ item.no }}.</strong> {{ item.question }}
                </p>

                <!-- Pilihan jawaban dengan highlight -->
                <div class="review-opts">
                  <div
                    v-for="(opt, oi) in item.options"
                    :key="oi"
                    class="review-opt"
                    :class="{
                      'opt-correct': oi === item.correct,
                      'opt-wrong':   oi === item.userAnswer && oi !== item.correct,
                      'opt-neutral': oi !== item.correct && oi !== item.userAnswer
                    }"
                  >
                    <span class="opt-letter-sm">{{ 'ABCD'[oi] }}</span>
                    <span>{{ opt }}</span>
                    <span v-if="oi === item.correct"       class="opt-mark">✅ Jawaban Benar</span>
                    <span v-else-if="oi === item.userAnswer" class="opt-mark red">❌ Jawabanmu</span>
                  </div>
                </div>

                <!-- Penjelasan jawaban untuk soal yang salah -->
                <div v-if="item.userAnswer !== item.correct" class="explanation-box">
                  <span class="expl-icon">💡</span>
                  <div>
                    <strong>Penjelasan:</strong>
                    <span>{{ generateExplanation(item, sec) }}</span>
                  </div>
                </div>

                <!-- Jika belum dijawab -->
                <div v-if="item.userAnswer === undefined" class="not-answered-note">
                  ⚠️ Soal ini tidak dijawab.
                </div>
              </div>

              <!-- Jika filter wrongOnly dan semua benar -->
              <p
                v-if="wrongOnly && filteredDetail(sec).length === 0"
                style="color:var(--c-success);padding:0.5rem 0;font-size:0.9rem;"
              >
                ✅ Semua jawaban {{ LABELS[sec] }} benar!
              </p>
            </div>
          </template>
        </div>

        <!-- ── Actions ────────────────────────────────────── -->
        <div style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:2rem;">
          <router-link to="/dashboard" class="btn btn-primary" style="flex:1;min-width:160px;">
            🏠 Ke Dashboard
          </router-link>
          <router-link to="/analitik" class="btn btn-secondary" style="flex:1;min-width:160px;">
            📊 Analitik
          </router-link>
          <router-link v-if="wrongDetailCount > 0" to="/review" class="btn btn-secondary" style="flex:1;min-width:160px;">
            🔁 Review Salah
          </router-link>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import Navbar from '@/components/Navbar.vue'
import { useTestStore } from '@/stores/test'
import { useAuthStore } from '@/stores/auth'

const test    = useTestStore()
const auth    = useAuthStore()
const wrongOnly = ref(false)

const SECTIONS = ['listening', 'structure', 'reading']
const ICONS    = { listening: '🎧', structure: '📐', reading: '📖' }
const LABELS   = { listening: 'Listening', structure: 'Structure', reading: 'Reading' }

const score  = computed(() => test.lastScore)
const detail = computed(() => test.lastDetail || [])

// Seksi yang dikerjakan dalam sesi ini
const activeSections = computed(() => {
  if (!score.value) return []
  return SECTIONS.filter(s => score.value[s] !== null && score.value[s] !== undefined)
})

// Hitung total soal yang mungkin
function sectionMax(sec) {
  return (test.questions[sec] || []).length || 15
}
const totalPossible = computed(() =>
  activeSections.value.reduce((sum, s) => sum + sectionMax(s), 0)
)
const totalCorrect = computed(() =>
  activeSections.value.reduce((sum, s) => sum + (score.value?.[s] ?? 0), 0)
)
const accuracy = computed(() =>
  totalPossible.value ? Math.round((totalCorrect.value / totalPossible.value) * 100) : 0
)

// Mode tes label
const modeLabelFull = computed(() => {
  const map = { full: '🎯 Full Test', listening: '🎧 Listening', structure: '📐 Structure', reading: '📖 Reading' }
  return map[score.value?.testMode] || '🎯 Full Test'
})

// Grade
const grade = computed(() => {
  const a = accuracy.value
  if (a >= 85) return 'A'
  if (a >= 70) return 'B'
  if (a >= 55) return 'C'
  if (a >= 40) return 'D'
  return 'E'
})
const gradeColor = computed(() => {
  const map = { A: '#10d48e', B: '#38bdf8', C: '#fbbf24', D: '#f97316', E: '#f87171' }
  return map[grade.value]
})
const gradeMsg = computed(() => {
  const map = {
    A: 'Luar biasa! Performa sangat baik 🎉',
    B: 'Bagus! Terus tingkatkan 💪',
    C: 'Cukup baik, masih bisa lebih! 📈',
    D: 'Perlu lebih banyak latihan 📚',
    E: 'Jangan menyerah, terus berlatih! 🔥'
  }
  return map[grade.value]
})

// Rekomendasi
const recs = computed(() => {
  if (!score.value) return []
  const r = []
  const threshold = 10
  if (score.value.listening !== null && score.value.listening < threshold)
    r.push('🎧 Listening — Dengarkan BBC Learning English atau VOA setiap hari.')
  if (score.value.structure !== null && score.value.structure < threshold)
    r.push('📐 Structure — Fokus grammar: tenses, passive voice, conditional sentences.')
  if (score.value.reading !== null && score.value.reading < threshold)
    r.push('📖 Reading — Latih skimming & scanning di artikel berbahasa Inggris.')
  if (!r.length) r.push('🌟 Performa sangat baik! Pertahankan dan terus latihan setiap hari.')
  return r
})

// Skor per seksi dari detail
function secCorrect(sec) {
  return detail.value.filter(d => d.section === sec && d.userAnswer === d.correct).length
}
function secTotal(sec) {
  return detail.value.filter(d => d.section === sec).length
}

// Filter detail per seksi + wrongOnly
function filteredDetail(sec) {
  const items = detail.value.filter(d => d.section === sec)
  if (wrongOnly.value) return items.filter(d => d.userAnswer !== d.correct)
  return items
}

// Jumlah soal salah yang tersimpan
const wrongDetailCount = computed(() =>
  detail.value.filter(d => d.userAnswer !== d.correct).length
)

/**
 * Buat penjelasan otomatis berdasarkan tipe soal.
 * Catatan: Ini fallback generik. Jika soal memiliki field `explanation`
 * dari backend, gunakan itu terlebih dulu.
 */
function generateExplanation(item, sec) {
  // Jika ada field explanation dari soal (dari Google Sheets kolom ke-12+)
  if (item.explanation) return item.explanation

  const correctOpt = item.options[item.correct] || ''
  const userOpt    = item.userAnswer !== undefined ? (item.options[item.userAnswer] || 'tidak dijawab') : 'tidak dijawab'

  // Penjelasan generik per seksi
  if (sec === 'listening') {
    return `Jawaban yang benar adalah "${correctOpt}". Pada soal listening, fokus pada kata kunci yang diucapkan dalam audio. Kamu memilih "${userOpt}" — coba dengarkan ulang audio dan perhatikan konteks percakapan secara keseluruhan.`
  }
  if (sec === 'structure') {
    return `Jawaban yang benar adalah "${correctOpt}". Dalam soal structure/grammar, pastikan kamu memperhatikan subjek, predikat, dan tense yang digunakan. Kamu memilih "${userOpt}" — periksa kembali aturan grammar yang relevan.`
  }
  if (sec === 'reading') {
    return `Jawaban yang benar adalah "${correctOpt}". Pada soal reading, gunakan teknik skimming untuk ide utama dan scanning untuk detail spesifik. Kamu memilih "${userOpt}" — coba baca kembali passage dengan seksama.`
  }
  return `Jawaban yang benar adalah "${correctOpt}". Kamu memilih "${userOpt}".`
}
</script>

<style scoped>
.result-wrap { max-width: 820px; padding-top: 2rem; padding-bottom: 3rem; }
.no-result   { display: flex; flex-direction: column; align-items: center; padding: 5rem 0; gap: 1rem; }

/* ── Hero ───────────────────────────────────────────────────── */
.result-hero { text-align: center; padding: 2.5rem; margin-bottom: 0; }
.grade-ring {
  width: 80px; height: 80px;
  border-radius: 50%;
  border: 3px solid var(--gc, var(--c-primary));
  color: var(--gc, var(--c-primary));
  font-family: var(--font-display);
  font-size: 2.5rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
  box-shadow: 0 0 20px color-mix(in srgb, var(--gc, var(--c-primary)) 30%, transparent);
}
.mode-badge { margin: 0.5rem 0; }
.grade-msg  { color: var(--c-text-muted); margin-top: 0.5rem; }

/* ── Score grid ─────────────────────────────────────────────── */
.score-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 1rem;
}

/* ── Rekomendasi ────────────────────────────────────────────── */
.recs-list { list-style: none; display: flex; flex-direction: column; gap: 0.6rem; }
.recs-list li { padding: 0.75rem 1rem; background: var(--c-surface2); border-radius: var(--radius-sm); font-size: 0.9rem; }

/* ── Review header ──────────────────────────────────────────── */
.review-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.toggle-label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.9rem; color: var(--c-text-muted); }

/* ── Review section header ──────────────────────────────────── */
.review-sec-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--c-border);
  margin: 1.25rem 0 0.75rem;
  font-weight: 600;
}

/* ── Review item ────────────────────────────────────────────── */
.review-item {
  margin-bottom: 1.25rem;
  padding: 1rem;
  border-radius: var(--radius-sm);
  border-left: 3px solid;
}
.review-item.correct { background: rgba(16,212,142,0.05); border-color: var(--c-success); }
.review-item.wrong   { background: rgba(248,113,113,0.05); border-color: var(--c-danger); }

.review-q { margin-bottom: 0.75rem; font-size: 0.95rem; line-height: 1.6; }

/* ── Pilihan jawaban ────────────────────────────────────────── */
.review-opts { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 0.75rem; }
.review-opt {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.88rem;
  padding: 0.4rem 0.7rem;
  border-radius: 4px;
  flex-wrap: wrap;
}
.opt-correct { background: rgba(16,212,142,0.12); color: var(--c-success); font-weight: 600; }
.opt-wrong   { background: rgba(248,113,113,0.12); color: var(--c-danger); }
.opt-neutral { color: var(--c-text-dim); }
.opt-letter-sm {
  width: 22px; height: 22px;
  border-radius: 50%;
  background: rgba(255,255,255,0.07);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
}
.opt-mark { margin-left: auto; font-size: 0.78rem; white-space: nowrap; }
.opt-mark.red { color: var(--c-danger); }

/* ── Kotak penjelasan ───────────────────────────────────────── */
.explanation-box {
  display: flex;
  gap: 0.65rem;
  background: rgba(108,99,255,0.08);
  border: 1px solid rgba(108,99,255,0.2);
  border-radius: var(--radius-sm);
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  line-height: 1.65;
  color: var(--c-text-muted);
}
.expl-icon { font-size: 1.1rem; flex-shrink: 0; margin-top: 1px; }

.not-answered-note {
  font-size: 0.82rem;
  color: var(--c-warning);
  margin-top: 0.5rem;
}

/* ── Responsive ─────────────────────────────────────────────── */
@media (max-width: 600px) {
  .result-hero { padding: 1.75rem 1rem; }
  .grade-ring  { width: 68px; height: 68px; font-size: 2rem; }
  .review-item { padding: 0.75rem; }
  .review-q    { font-size: 0.9rem; }
}
</style>
