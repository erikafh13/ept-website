<template>
  <div class="page">
    <Navbar />
    <div class="container" style="padding-top:2rem;padding-bottom:3rem;max-width:800px;">

      <div class="page-header">
        <div>
          <h1>🔁 Review Soal Salah</h1>
          <p class="sub-text">Soal-soal yang pernah kamu jawab salah. Pelajari dan tandai sebagai "sudah dipahami".</p>
        </div>
        <router-link to="/dashboard" class="btn btn-secondary">← Dashboard</router-link>
      </div>

      <!-- Kosong -->
      <div v-if="!wrongList.length" class="empty-state card">
        <span class="empty-icon">🎉</span>
        <h2>Tidak Ada Soal Salah!</h2>
        <p>Kamu belum memiliki riwayat soal yang salah, atau semua sudah ditandai dipahami.</p>
        <router-link to="/dashboard" class="btn btn-primary" style="margin-top:1rem;">Mulai Tes Baru</router-link>
      </div>

      <template v-else>
        <!-- Filter seksi -->
        <div class="filter-row">
          <button
            v-for="f in filters"
            :key="f.value"
            class="filter-btn"
            :class="{ active: activeFilter === f.value }"
            @click="activeFilter = f.value"
          >
            {{ f.icon }} {{ f.label }}
            <span class="filter-count">{{ f.count }}</span>
          </button>
        </div>

        <!-- Progress penguasaan -->
        <div class="card mastery-card">
          <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem;">
            <span style="font-weight:600;">Progress Penguasaan</span>
            <span style="color:var(--c-success);">{{ masteredCount }}/{{ originalTotal }} dipahami</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" :style="`width:${masteryPct}%;background:var(--c-success);`"></div>
          </div>
        </div>

        <!-- Daftar soal salah -->
        <div
          v-for="(item, idx) in filteredList"
          :key="idx"
          class="wrong-card card"
          :class="{ mastered: item._mastered }"
        >
          <!-- Header soal -->
          <div class="wrong-header">
            <span class="section-tag">{{ ICONS[item.section] }} {{ LABELS[item.section] }} · Soal {{ item.no }}</span>
            <button
              class="btn-mastered"
              :class="{ done: item._mastered }"
              @click="toggleMastered(item)"
            >
              {{ item._mastered ? '✅ Dipahami' : '○ Tandai Dipahami' }}
            </button>
          </div>

          <!-- Teks soal -->
          <p class="wrong-q">{{ item.question }}</p>

          <!-- Pilihan -->
          <div class="wrong-opts">
            <div
              v-for="(opt, oi) in item.options"
              :key="oi"
              class="wrong-opt"
              :class="{
                'opt-correct': oi === item.correct,
                'opt-wrong':   oi === item.userAnswer && oi !== item.correct
              }"
            >
              <span class="opt-letter-sm">{{ 'ABCD'[oi] }}</span>
              <span>{{ opt }}</span>
              <span v-if="oi === item.correct"       class="tag-correct">✅ Benar</span>
              <span v-else-if="oi === item.userAnswer" class="tag-wrong">❌ Jawabanmu</span>
            </div>
          </div>

          <!-- Penjelasan -->
          <div class="expl-box">
            <span>💡</span>
            <span>{{ getExplanation(item) }}</span>
          </div>
        </div>

        <!-- Tombol hapus semua yang sudah dipahami -->
        <div style="text-align:center;margin-top:1.5rem;" v-if="masteredCount > 0">
          <button class="btn btn-secondary" @click="clearMastered" style="font-size:0.88rem;">
            🗑️ Hapus {{ masteredCount }} soal yang sudah dipahami
          </button>
        </div>
      </template>
    </div>

    <!-- Toast -->
    <transition name="toast-slide">
      <div v-if="toast.show" class="toast" :class="`toast-${toast.type}`">
        {{ toast.message }}
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import Navbar from '@/components/Navbar.vue'
import { useTestStore } from '@/stores/test'
import { useAuthStore } from '@/stores/auth'

const test    = useTestStore()
const auth    = useAuthStore()

const ICONS  = { listening: '🎧', structure: '📐', reading: '📖' }
const LABELS = { listening: 'Listening', structure: 'Structure', reading: 'Reading' }

// Daftar soal salah (dari localStorage via store)
const wrongList = ref([])
const activeFilter = ref('all')

// Toast
const toast = ref({ show: false, message: '', type: 'success' })
function showToast(msg, type = 'success') {
  toast.value = { show: true, message: msg, type }
  setTimeout(() => { toast.value.show = false }, 2500)
}

// Jumlah soal salah sebelum hapus (untuk progress bar)
const originalTotal = ref(0)

// Filter
const filters = computed(() => [
  { value: 'all',       icon: '📋', label: 'Semua',     count: wrongList.value.length },
  { value: 'listening', icon: '🎧', label: 'Listening', count: wrongList.value.filter(q => q.section === 'listening').length },
  { value: 'structure', icon: '📐', label: 'Structure', count: wrongList.value.filter(q => q.section === 'structure').length },
  { value: 'reading',   icon: '📖', label: 'Reading',   count: wrongList.value.filter(q => q.section === 'reading').length },
])

const filteredList = computed(() => {
  if (activeFilter.value === 'all') return wrongList.value
  return wrongList.value.filter(q => q.section === activeFilter.value)
})

// Progress penguasaan
const masteredCount = computed(() => wrongList.value.filter(q => q._mastered).length)
const masteryPct    = computed(() =>
  originalTotal.value ? Math.round((masteredCount.value / originalTotal.value) * 100) : 0
)

// Toggle mastered di memori lokal
function toggleMastered(item) {
  item._mastered = !item._mastered
  if (item._mastered) {
    showToast('Soal ditandai sudah dipahami ✅')
  }
}

// Hapus dari localStorage semua yang sudah mastered
function clearMastered() {
  const masteredTexts = new Set(wrongList.value.filter(q => q._mastered).map(q => q.question))
  wrongList.value = wrongList.value.filter(q => !q._mastered)
  // Hapus dari store/localStorage
  masteredTexts.forEach(qt => test.clearWrongQuestion(auth.user?.username, qt))
  showToast(`${masteredTexts.size} soal dihapus dari daftar review.`)
  originalTotal.value = wrongList.value.length
}

// Penjelasan per soal
function getExplanation(item) {
  if (item.explanation) return item.explanation
  const correctOpt = item.options?.[item.correct] || '-'
  const userOpt    = item.userAnswer !== undefined ? (item.options?.[item.userAnswer] || 'tidak dijawab') : 'tidak dijawab'
  if (item.section === 'listening')
    return `Jawaban benar: "${correctOpt}". Fokus pada kata kunci dalam audio. Kamu memilih: "${userOpt}".`
  if (item.section === 'structure')
    return `Jawaban benar: "${correctOpt}". Periksa aturan grammar yang berlaku. Kamu memilih: "${userOpt}".`
  if (item.section === 'reading')
    return `Jawaban benar: "${correctOpt}". Baca passage lebih seksama menggunakan teknik scanning. Kamu memilih: "${userOpt}".`
  return `Jawaban benar: "${correctOpt}". Kamu memilih: "${userOpt}".`
}

onMounted(() => {
  // Ambil soal salah dari store (localStorage)
  const raw = test.getWrongQuestions(auth.user?.username)
  // Tambahkan field _mastered secara reaktif
  wrongList.value = raw.map(q => ({ ...q, _mastered: false }))
  originalTotal.value = wrongList.value.length
})
</script>

<style scoped>
/* ── Header ─────────────────────────────────────────────────── */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.75rem;
  flex-wrap: wrap;
  gap: 1rem;
}
.sub-text { color: var(--c-text-muted); font-size: 0.9rem; margin-top: 0.3rem; }

/* ── Empty state ────────────────────────────────────────────── */
.empty-state {
  text-align: center;
  padding: 3rem 2rem;
}
.empty-icon { font-size: 3.5rem; display: block; margin-bottom: 1rem; }

/* ── Filter row ─────────────────────────────────────────────── */
.filter-row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1.25rem;
}
.filter-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.9rem;
  border-radius: var(--radius-sm);
  background: var(--c-surface2);
  border: 1px solid var(--c-border);
  color: var(--c-text-muted);
  font-family: var(--font-body);
  font-size: 0.88rem;
  cursor: pointer;
  transition: all 0.15s;
}
.filter-btn:hover { border-color: var(--c-primary); color: var(--c-text); }
.filter-btn.active { border-color: var(--c-primary); background: rgba(108,99,255,0.1); color: var(--c-primary-light); }
.filter-count {
  background: var(--c-surface);
  border-radius: 99px;
  padding: 0 6px;
  font-size: 0.75rem;
  color: var(--c-text-muted);
}

/* ── Mastery card ───────────────────────────────────────────── */
.mastery-card { margin-bottom: 1.25rem; }

/* ── Wrong card ─────────────────────────────────────────────── */
.wrong-card {
  margin-bottom: 1rem;
  border-left: 3px solid var(--c-danger);
  transition: all 0.25s;
}
.wrong-card.mastered {
  border-left-color: var(--c-success);
  opacity: 0.65;
}

.wrong-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.section-tag { font-size: 0.82rem; color: var(--c-text-muted); font-weight: 600; }

.btn-mastered {
  font-size: 0.8rem;
  padding: 0.3rem 0.75rem;
  border-radius: 99px;
  border: 1px solid var(--c-border);
  background: var(--c-surface2);
  color: var(--c-text-muted);
  cursor: pointer;
  font-family: var(--font-body);
  transition: all 0.2s;
}
.btn-mastered:hover { border-color: var(--c-success); color: var(--c-success); }
.btn-mastered.done  { border-color: var(--c-success); color: var(--c-success); background: rgba(16,212,142,0.1); }

.wrong-q  { font-size: 0.95rem; line-height: 1.65; margin-bottom: 0.75rem; }

/* ── Pilihan ────────────────────────────────────────────────── */
.wrong-opts { display: flex; flex-direction: column; gap: 0.3rem; margin-bottom: 0.75rem; }
.wrong-opt {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.38rem 0.7rem;
  border-radius: 4px;
  font-size: 0.87rem;
}
.opt-correct { background: rgba(16,212,142,0.1); color: var(--c-success); font-weight: 600; }
.opt-wrong   { background: rgba(248,113,113,0.1); color: var(--c-danger); }
.opt-letter-sm {
  width: 20px; height: 20px;
  border-radius: 50%;
  background: rgba(255,255,255,0.07);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 700;
  flex-shrink: 0;
}
.tag-correct { margin-left: auto; font-size: 0.78rem; }
.tag-wrong   { margin-left: auto; font-size: 0.78rem; color: var(--c-danger); }

/* ── Penjelasan ─────────────────────────────────────────────── */
.expl-box {
  display: flex;
  gap: 0.6rem;
  background: rgba(108,99,255,0.07);
  border: 1px solid rgba(108,99,255,0.18);
  border-radius: var(--radius-sm);
  padding: 0.7rem 0.9rem;
  font-size: 0.865rem;
  line-height: 1.65;
  color: var(--c-text-muted);
}

/* ── Toast ──────────────────────────────────────────────────── */
.toast {
  position: fixed;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 0.9rem;
  z-index: 999;
  box-shadow: var(--shadow-card);
  white-space: nowrap;
}
.toast-success { background: var(--c-success); color: #fff; }
.toast-error   { background: var(--c-danger);  color: #fff; }
.toast-slide-enter-active { transition: all 0.3s ease; }
.toast-slide-leave-active { transition: all 0.3s ease; }
.toast-slide-enter-from, .toast-slide-leave-to { opacity: 0; transform: translateX(-50%) translateY(20px); }

/* ── Responsive ─────────────────────────────────────────────── */
@media (max-width: 600px) {
  .wrong-q { font-size: 0.9rem; }
  .wrong-opt { font-size: 0.83rem; }
  .page-header { flex-direction: column; }
}
</style>
