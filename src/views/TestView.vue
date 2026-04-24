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
          <strong>{{ LABELS[test.section] }}</strong>
          <span class="q-counter">Soal {{ test.idx + 1 }}/{{ test.currentList.length }}</span>
        </div>

        <div class="timer-box" :class="timerClass">
          ⏱ {{ timerStr }}
        </div>
      </div>

      <!-- Progress -->
      <div class="progress-bar" style="border-radius:0;">
        <div class="progress-fill" :style="`width:${progressPct}%`"></div>
      </div>

      <div class="test-body">
        <div class="test-main">

          <!-- Audio (listening) -->
          <div v-if="test.section === 'listening' && q?.script" class="audio-card card">
            <div class="audio-label">🎧 Audio Listening</div>
            <audio controls :key="q.script" class="audio-player">
              <source :src="ttsUrl(q.script)" type="audio/mpeg" />
              Browser tidak mendukung audio.
            </audio>
            <p class="audio-hint">Dengarkan audio sebelum menjawab.</p>
          </div>

          <!-- Passage (reading) -->
          <div v-if="test.section === 'reading' && q?.passage" style="margin-bottom:1rem;">
            <details open>
              <summary class="passage-toggle">📖 Baca Passage</summary>
              <div class="passage-box" style="margin-top:0.75rem;">{{ q.passage }}</div>
            </details>
          </div>

          <!-- Question -->
          <div class="question-card card">
            <div class="q-num">Soal {{ test.idx + 1 }}</div>
            <p class="q-text">{{ q?.question }}</p>
          </div>

          <!-- Options -->
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

          <!-- Navigation -->
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
              ✅ Kumpulkan Jawaban
            </button>
          </div>
        </div>

        <!-- Sidebar: peta soal -->
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
                    active: sec === test.section && i === test.idx,
                    answered: test.answers[`${sec}_${i}`] !== undefined
                  }"
                  @click="test.jumpTo(sec, i)"
                >{{ i + 1 }}</button>
              </div>
            </div>
            <div class="divider"></div>
            <div style="font-size:0.85rem;color:var(--c-text-muted);margin-bottom:0.75rem;">
              Total dijawab: <strong style="color:var(--c-text)">{{ test.totalAnswered }}/{{ test.totalAll }}</strong>
            </div>
            <div class="progress-bar"><div class="progress-fill" :style="`width:${(test.totalAnswered/test.totalAll)*100}%`"></div></div>
            <button class="btn btn-danger btn-full" style="margin-top:1rem;font-size:0.85rem;" @click="showConfirm = true">
              ⚠️ Submit Sekarang
            </button>
          </div>
        </div>
      </div>

      <!-- Confirm modal -->
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

const test = useTestStore()
const router = useRouter()
const showConfirm = ref(false)
const finishing = ref(false)

const ICONS  = { listening: '🎧', structure: '📐', reading: '📖' }
const LABELS = { listening: 'Listening', structure: 'Structure', reading: 'Reading' }

const q = computed(() => test.currentQ)
const progressPct = computed(() => test.totalAll ? (test.totalAnswered / test.totalAll) * 100 : 0)

const timerStr = computed(() => {
  const m = Math.floor(test.remaining / 60)
  const s = test.remaining % 60
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
})
const timerClass = computed(() => {
  if (test.remaining < 300) return 'danger'
  if (test.remaining < 900) return 'warning'
  return 'safe'
})

const isFirstQ = computed(() => {
  const secIdx = test.SECTIONS.indexOf(test.section)
  return secIdx === 0 && test.idx === 0
})
const isLastQ = computed(() => {
  const secIdx = test.SECTIONS.indexOf(test.section)
  return secIdx === test.SECTIONS.length - 1 &&
    test.idx === (test.currentList.length - 1)
})

function answeredInSec(sec) {
  return (test.questions[sec] || []).filter((_, i) => test.answers[`${sec}_${i}`] !== undefined).length
}

function ttsUrl(text) {
  return `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=en&client=tw-ob`
}

async function handleFinish() {
  finishing.value = true
  await test.finishTest()
}

// Auto-submit saat waktu habis
let ticker
onMounted(() => {
  if (!test.active) test.restoreState()
  ticker = setInterval(() => {
    if (test.remaining <= 0) {
      clearInterval(ticker)
      handleFinish()
    }
  }, 1000)
})
onUnmounted(() => clearInterval(ticker))
</script>

<style scoped>
.test-page { min-height: 100vh; display: flex; flex-direction: column; }
.not-active { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 1rem; }

.test-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.5rem;
  background: var(--c-surface);
  border-bottom: 1px solid var(--c-border);
  position: sticky;
  top: 0;
  z-index: 50;
}
.section-badge { display: flex; align-items: center; gap: 0.6rem; font-size: 1rem; }
.q-counter { color: var(--c-text-muted); font-size: 0.85rem; }
.timer-box {
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 700;
  padding: 0.35rem 0.9rem;
  border-radius: var(--radius-sm);
  border: 2px solid;
}
.timer-box.safe    { border-color: var(--c-success); color: var(--c-success); }
.timer-box.warning { border-color: var(--c-warning); color: var(--c-warning); }
.timer-box.danger  { border-color: var(--c-danger);  color: var(--c-danger); animation: pulse 1s infinite; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }

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
@media (max-width: 900px) {
  .test-body { grid-template-columns: 1fr; }
  .test-sidebar { order: -1; }
}

.audio-card { margin-bottom: 1rem; }
.audio-label { font-weight: 600; margin-bottom: 0.75rem; }
.audio-player { width: 100%; margin-bottom: 0.5rem; }
.audio-hint { font-size: 0.8rem; color: var(--c-text-muted); }

.passage-toggle { cursor: pointer; font-weight: 600; color: var(--c-primary-light); }

.question-card { margin-bottom: 1.25rem; }
.q-num { font-size: 0.8rem; color: var(--c-text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; }
.q-text { font-size: 1.05rem; line-height: 1.7; }

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

/* Sidebar */
.sidebar-card { position: sticky; top: 80px; }
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

/* Modal */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}
.modal-box { max-width: 400px; width: 90%; padding: 2rem; }
</style>
