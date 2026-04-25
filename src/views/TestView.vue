<template>
  <div class="test-page">
    <!-- Guard: redirect jika test tidak aktif -->
    <div v-if="!test.active" class="not-active">
      <p>Tidak ada tes aktif.</p>
      <router-link to="/dashboard" class="btn btn-primary">Ke Dashboard</router-link>
    </div>

    <template v-else>
      <!-- Header bar -->
      <div class="test-topbar">
        <div class="section-badge">
          <span>{{ ICONS[test.section] }}</span>
          <strong class="section-label">{{ LABELS[test.section] }}</strong>
          <span class="q-counter">Soal {{ test.idx + 1 }}/{{ test.currentList.length }}</span>
        </div>

        <div class="timer-box" :class="timerClass">
          ⏱ {{ timerStr }}
        </div>
      </div>

      <!-- Progress bar soal dalam seksi saat ini -->
      <div class="progress-wrap">
        <div class="progress-bar" style="border-radius:0; height:4px;">
          <div class="progress-fill" :style="`width:${sectionProgressPct}%;transition:width 0.3s ease;`"></div>
        </div>
        <div class="progress-label">
          <span>{{ ICONS[test.section] }} {{ LABELS[test.section] }}: {{ test.idx + 1 }}/{{ test.currentList.length }}</span>
          <span>Total: {{ test.totalAnswered }}/{{ test.totalAll }} dijawab</span>
        </div>
      </div>

      <div class="test-body">
        <div class="test-main">

          <!-- Audio (listening): teks TANPA label pembicara -->
          <div v-if="test.section === 'listening' && cleanScript" class="audio-card card">
            <div class="audio-label">🎧 Audio Listening</div>
            <audio controls :key="cleanScript" class="audio-player">
              <source :src="ttsUrl(cleanScript)" type="audio/mpeg" />
              Browser tidak mendukung audio.
            </audio>
            <!-- Script tanpa "Woman: / Man: / Narrator:" dll -->
            <p class="audio-script">{{ cleanScript }}</p>
            <p class="audio-hint">Dengarkan audio sebelum menjawab.</p>
          </div>

          <!-- Passage (reading) -->
          <div v-if="test.section === 'reading' && q?.passage" class="passage-wrap">
            <details open>
              <summary class="passage-toggle">📖 Baca Passage</summary>
              <div class="passage-box">{{ q.passage }}</div>
            </details>
          </div>

          <!-- Soal dengan animasi transisi antar soal -->
          <transition name="question-slide" mode="out-in">
            <div :key="`${test.section}_${test.idx}`" class="question-block">
              <!-- Question card -->
              <div class="question-card card">
                <div class="q-num">Soal {{ test.idx + 1 }}</div>
                <p class="q-text">{{ q?.question }}</p>
              </div>

              <!-- Pilihan jawaban -->
              <div class="options-list">
                <button
                  v-for="(opt, i) in q?.options"
                  :key="i"
                  class="opt-btn"
                  :class="{ selected: test.answers[test.answerKey] === i }"
                  @click="test.setAnswer(i)"
                >
                  <span class="opt-letter">{{ 'ABCD'[i] }}</span>
                  <span class="opt-text">{{ opt }}</span>
                </button>
              </div>
            </div>
          </transition>

          <!-- Navigasi -->
          <div class="nav-row">
            <button class="btn btn-secondary" @click="test.prevQ()" :disabled="isFirstQ">
              ◀ Kembali
            </button>
            <button
              v-if="!isLastQ"
              class="btn btn-primary"
              @click="test.nextQ()"
              :disabled="test.answers[test.answerKey] === undefined"
            >
              Lanjut ▶
            </button>
            <button
              v-else
              class="btn btn-success"
              @click="showConfirm = true"
              :disabled="test.answers[test.answerKey] === undefined"
            >
              ✅ Kumpulkan
            </button>
          </div>
        </div>

        <!-- Sidebar desktop: peta soal -->
        <div class="test-sidebar">
          <div class="sidebar-card card">
            <h3 style="margin-bottom:1rem;">🗺️ Peta Soal</h3>
            <div v-for="sec in test.SECTIONS" :key="sec" class="map-section">
              <div class="map-sec-header">
                <span>{{ ICONS[sec] }} {{ LABELS[sec] }}</span>
                <span class="map-count">{{ answeredInSec(sec) }}/{{ test.questions[sec]?.length || 0 }}</span>
              </div>
              <div class="map-grid">
                <button
                  v-for="(_, i) in test.questions[sec]"
                  :key="i"
                  class="map-dot"
                  :class="{
                    active:   sec === test.section && i === test.idx,
                    answered: test.answers[`${sec}_${i}`] !== undefined
                  }"
                  @click="test.jumpTo(sec, i)"
                >{{ i + 1 }}</button>
              </div>
            </div>
            <div class="divider"></div>
            <div class="map-total">
              Total: <strong>{{ test.totalAnswered }}/{{ test.totalAll }}</strong>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" :style="`width:${(test.totalAnswered/test.totalAll||0)*100}%`"></div>
            </div>
            <button class="btn btn-danger btn-full" style="margin-top:1rem;font-size:0.85rem;" @click="showConfirm = true">
              ⚠️ Submit Sekarang
            </button>
          </div>
        </div>
      </div>

      <!-- Mobile: tombol buka peta soal -->
      <button class="sidebar-toggle-btn btn btn-secondary" @click="showMobileSidebar = true">
        🗺️ Peta ({{ test.totalAnswered }}/{{ test.totalAll }})
      </button>

      <!-- Mobile sidebar drawer -->
      <transition name="slide-up">
        <div v-if="showMobileSidebar" class="mobile-sidebar-overlay" @click.self="showMobileSidebar = false">
          <div class="mobile-sidebar-drawer card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
              <h3>🗺️ Peta Soal</h3>
              <button class="btn btn-secondary" style="padding:0.3rem 0.7rem;" @click="showMobileSidebar = false">✕</button>
            </div>
            <div v-for="sec in test.SECTIONS" :key="sec" class="map-section">
              <div class="map-sec-header">
                <span>{{ ICONS[sec] }} {{ LABELS[sec] }}</span>
                <span class="map-count">{{ answeredInSec(sec) }}/{{ test.questions[sec]?.length || 0 }}</span>
              </div>
              <div class="map-grid">
                <button
                  v-for="(_, i) in test.questions[sec]"
                  :key="i"
                  class="map-dot"
                  :class="{
                    active:   sec === test.section && i === test.idx,
                    answered: test.answers[`${sec}_${i}`] !== undefined
                  }"
                  @click="test.jumpTo(sec, i); showMobileSidebar = false"
                >{{ i + 1 }}</button>
              </div>
            </div>
            <button class="btn btn-danger btn-full" style="margin-top:1rem;" @click="showConfirm = true; showMobileSidebar = false">
              ⚠️ Submit Sekarang
            </button>
          </div>
        </div>
      </transition>

      <!-- Modal konfirmasi submit -->
      <div v-if="showConfirm" class="modal-overlay" @click.self="showConfirm = false">
        <div class="modal-box card">
          <h2>Kumpulkan Jawaban?</h2>
          <p style="color:var(--c-text-muted);margin:1rem 0;">
            Kamu telah menjawab <strong>{{ test.totalAnswered }}/{{ test.totalAll }}</strong> soal.
            Jawaban yang belum diisi akan dihitung salah.
          </p>
          <div style="display:flex;gap:1rem;">
            <button class="btn btn-secondary" style="flex:1" @click="showConfirm = false">Kembali</button>
            <button class="btn btn-success" style="flex:1" @click="handleFinish" :disabled="finishing">
              <span v-if="finishing" class="spinner" style="width:14px;height:14px;border-width:2px;"></span>
              <span v-else>✅ Ya, Kumpulkan</span>
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useTestStore } from '@/stores/test'
import { useRouter } from 'vue-router'

const test              = useTestStore()
const router            = useRouter()
const showConfirm       = ref(false)
const finishing         = ref(false)
const showMobileSidebar = ref(false)

const ICONS  = { listening: '🎧', structure: '📐', reading: '📖' }
const LABELS = { listening: 'Listening', structure: 'Structure', reading: 'Reading' }

const q = computed(() => test.currentQ)

// Progress soal dalam seksi saat ini
const sectionProgressPct = computed(() => {
  const total = test.currentList.length
  if (!total) return 0
  return ((test.idx + 1) / total) * 100
})

// Timer: format MM:SS dari test.remaining (state reaktif)
const timerStr = computed(() => {
  const m = Math.floor(test.remaining / 60)
  const s = test.remaining % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})
const timerClass = computed(() => {
  if (test.remaining < 300) return 'danger'
  if (test.remaining < 900) return 'warning'
  return 'safe'
})

// Navigasi batas soal
const isFirstQ = computed(() => {
  const secs   = test.SECTIONS
  const secIdx = secs.indexOf(test.section)
  return secIdx === 0 && test.idx === 0
})
const isLastQ = computed(() => {
  const secs   = test.SECTIONS
  const secIdx = secs.indexOf(test.section)
  return secIdx === secs.length - 1 && test.idx === test.currentList.length - 1
})

// Hapus label pembicara dari script listening (misal "Woman: Hello" → "Hello")
// Pola yang dihapus: kata diawali huruf kapital diikuti titik dua
const cleanScript = computed(() => {
  const raw = q.value?.script || ''
  if (!raw) return ''
  // Hapus semua "Label:" di awal baris atau setelah newline
  return raw
    .replace(/^[A-Z][a-zA-Z\s]*:\s*/gm, '')
    .replace(/\n{2,}/g, '\n')
    .trim()
})

function answeredInSec(sec) {
  return (test.questions[sec] || []).filter((_, i) => test.answers[`${sec}_${i}`] !== undefined).length
}

function ttsUrl(text) {
  return `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=en&client=tw-ob`
}

async function handleFinish() {
  finishing.value = true
  try {
    await test.finishTest()
  } finally {
    finishing.value = false
  }
}

// Timer: gunakan tickTimer() dari store agar remaining reaktif
let ticker
onMounted(() => {
  if (!test.active) test.restoreState()

  // FIX: ticker memanggil store.tickTimer() yang mengubah state reaktif remaining
  ticker = setInterval(() => {
    if (!test.active) {
      clearInterval(ticker)
      return
    }
    test.tickTimer()
    if (test.remaining <= 0) {
      clearInterval(ticker)
      handleFinish()
    }
  }, 1000)
})
onUnmounted(() => clearInterval(ticker))
</script>

<style scoped>
/* ── Layout utama ──────────────────────────────────────────── */
.test-page { min-height: 100vh; display: flex; flex-direction: column; }
.not-active { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 1rem; }

/* ── Topbar ────────────────────────────────────────────────── */
.test-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.25rem;
  background: var(--c-surface);
  border-bottom: 1px solid var(--c-border);
  position: sticky;
  top: 0;
  z-index: 50;
}
.section-badge { display: flex; align-items: center; gap: 0.6rem; font-size: 1rem; }
.section-label { display: inline; }
.q-counter { color: var(--c-text-muted); font-size: 0.85rem; }

.timer-box {
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 700;
  padding: 0.3rem 0.85rem;
  border-radius: var(--radius-sm);
  border: 2px solid;
}
.timer-box.safe    { border-color: var(--c-success); color: var(--c-success); }
.timer-box.warning { border-color: var(--c-warning); color: var(--c-warning); }
.timer-box.danger  { border-color: var(--c-danger);  color: var(--c-danger); animation: pulse 1s infinite; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }

/* ── Progress bar ──────────────────────────────────────────── */
.progress-wrap { background: var(--c-surface); }
.progress-label {
  display: flex;
  justify-content: space-between;
  padding: 0.35rem 1.25rem;
  font-size: 0.78rem;
  color: var(--c-text-muted);
}

/* ── Body grid ─────────────────────────────────────────────── */
.test-body {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 1.5rem;
  padding: 1.5rem;
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

/* ── Audio card ────────────────────────────────────────────── */
.audio-card { margin-bottom: 1rem; }
.audio-label { font-weight: 600; margin-bottom: 0.75rem; }
.audio-player { width: 100%; margin-bottom: 0.5rem; }
.audio-script {
  font-size: 0.88rem;
  color: var(--c-text-muted);
  line-height: 1.7;
  margin-bottom: 0.5rem;
  white-space: pre-line;
}
.audio-hint { font-size: 0.8rem; color: var(--c-text-dim); }

/* ── Passage ───────────────────────────────────────────────── */
.passage-wrap { margin-bottom: 1rem; }
.passage-toggle { cursor: pointer; font-weight: 600; color: var(--c-primary-light); list-style: none; }
.passage-box {
  background: var(--c-surface2);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  padding: 1rem;
  font-size: 0.9rem;
  line-height: 1.8;
  margin-top: 0.75rem;
  white-space: pre-wrap;
  max-height: 260px;
  overflow-y: auto;
}

/* ── Question & options ────────────────────────────────────── */
.question-card { margin-bottom: 1.25rem; }
.q-num { font-size: 0.8rem; color: var(--c-text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; }
.q-text { font-size: 1.05rem; line-height: 1.75; }

.options-list { display: flex; flex-direction: column; gap: 0.6rem; margin-bottom: 1.5rem; }
.opt-btn {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1.1rem;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  text-align: left;
  color: var(--c-text);
  font-size: 0.95rem;
  transition: all 0.15s;
  font-family: var(--font-body);
  width: 100%;
}
.opt-btn:hover { border-color: var(--c-primary); background: rgba(108,99,255,0.05); }
.opt-btn.selected { border-color: var(--c-primary); background: rgba(108,99,255,0.12); color: var(--c-primary-light); }
.opt-letter {
  width: 28px; height: 28px;
  border-radius: 50%;
  background: var(--c-surface2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  flex-shrink: 0;
  border: 1px solid var(--c-border);
}
.opt-btn.selected .opt-letter { background: var(--c-primary); border-color: var(--c-primary); color: #fff; }

.nav-row { display: flex; justify-content: space-between; gap: 1rem; }

/* ── Animasi transisi soal ─────────────────────────────────── */
.question-slide-enter-active { transition: all 0.25s ease; }
.question-slide-leave-active { transition: all 0.18s ease; }
.question-slide-enter-from { opacity: 0; transform: translateX(20px); }
.question-slide-leave-to  { opacity: 0; transform: translateX(-20px); }

/* ── Sidebar desktop ───────────────────────────────────────── */
.sidebar-card { position: sticky; top: 90px; }
.map-section { margin-bottom: 1.25rem; }
.map-sec-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; font-size: 0.85rem; font-weight: 600; }
.map-count { color: var(--c-text-muted); font-weight: 400; }
.map-grid { display: flex; flex-wrap: wrap; gap: 4px; }
.map-dot {
  width: 28px; height: 28px;
  border-radius: 6px;
  background: var(--c-surface2);
  border: 1px solid var(--c-border);
  color: var(--c-text-dim);
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.15s;
  font-family: var(--font-body);
}
.map-dot.answered { background: rgba(16,212,142,0.15); border-color: var(--c-success); color: var(--c-success); }
.map-dot.active { background: var(--c-primary); border-color: var(--c-primary); color: #fff; }
.map-total { font-size: 0.85rem; color: var(--c-text-muted); margin-bottom: 0.5rem; }
.divider { height: 1px; background: var(--c-border); margin: 0.75rem 0; }

/* ── Mobile sidebar toggle ─────────────────────────────────── */
.sidebar-toggle-btn {
  display: none; /* hanya tampil di mobile */
  position: fixed;
  bottom: 1.25rem;
  right: 1.25rem;
  z-index: 80;
  box-shadow: var(--shadow-card);
}
.mobile-sidebar-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.65);
  z-index: 120;
  display: flex;
  align-items: flex-end;
}
.mobile-sidebar-drawer {
  width: 100%;
  max-height: 75vh;
  overflow-y: auto;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  padding: 1.25rem;
}

/* Animasi slide-up untuk mobile drawer */
.slide-up-enter-active, .slide-up-leave-active { transition: transform 0.3s ease; }
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(100%); }

/* ── Modal ─────────────────────────────────────────────────── */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}
.modal-box { max-width: 400px; width: 90%; padding: 2rem; }

/* ── Responsive mobile ─────────────────────────────────────── */
@media (max-width: 900px) {
  .test-body {
    grid-template-columns: 1fr;
    padding: 1rem;
    gap: 1rem;
  }
  .test-sidebar { display: none; } /* pakai mobile drawer */
  .sidebar-toggle-btn { display: inline-flex; }
  .section-label { display: none; }
  .q-text { font-size: 0.97rem; }
  .opt-btn { padding: 0.75rem 0.9rem; font-size: 0.9rem; }
  .timer-box { font-size: 0.95rem; padding: 0.25rem 0.65rem; }
}

@media (max-width: 480px) {
  .test-topbar { padding: 0.6rem 0.85rem; }
  .q-text { font-size: 0.93rem; }
  .opt-btn { gap: 0.75rem; }
}
</style>
