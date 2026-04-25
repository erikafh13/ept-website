<template>
  <div class="page">
    <Navbar />
    <div class="container" style="padding-top: 2rem; padding-bottom: 3rem;">

      <!-- Header -->
      <div class="dash-header">
        <div>
          <h1>Halo, <span class="name-hl">{{ auth.user?.name }}</span> 👋</h1>
          <p class="date-text">📅 {{ todayStr }}</p>
        </div>
        <!-- Streak badge -->
        <div class="streak-badge" v-if="!loading">
          <span class="streak-fire">🔥</span>
          <div>
            <div class="streak-num">{{ streak }}</div>
            <div class="streak-label">Hari Berturut</div>
          </div>
        </div>
      </div>

      <!-- ── SKELETON LOADING ──────────────────────────────── -->
      <template v-if="loading">
        <!-- Stat cards skeleton -->
        <div class="grid-4" style="margin-bottom:1.5rem;">
          <div v-for="n in 4" :key="n" class="skeleton-card">
            <div class="skel skel-num"></div>
            <div class="skel skel-label"></div>
          </div>
        </div>
        <!-- Action cards skeleton -->
        <div class="grid-2" style="margin-bottom:2rem;">
          <div class="card skeleton-action">
            <div class="skel skel-title"></div>
            <div class="skel skel-body"></div>
            <div class="skel skel-body short"></div>
            <div class="skel skel-btn"></div>
          </div>
          <div class="card skeleton-action">
            <div class="skel skel-title"></div>
            <div class="skel skel-row" v-for="i in 4" :key="i"></div>
          </div>
        </div>
      </template>

      <!-- ── KONTEN UTAMA ──────────────────────────────────── -->
      <template v-else>
        <!-- Stat cards -->
        <div class="grid-4" style="margin-bottom:1.5rem;">
          <div class="stat-card blue">
            <div class="stat-num">{{ totalQ }}</div>
            <div class="stat-label">Soal Tersedia</div>
          </div>
          <div class="stat-card" :class="doneToday ? 'green' : 'orange'">
            <div class="stat-num">{{ doneToday ? '✅' : '⏳' }}</div>
            <div class="stat-label">Status Hari Ini</div>
          </div>
          <div class="stat-card purple">
            <div class="stat-num">{{ bestScore }}<span style="font-size:0.7em;opacity:0.7;">/45</span></div>
            <div class="stat-label">Skor Terbaik</div>
          </div>
          <div class="stat-card orange">
            <div class="stat-num">{{ totalTests }}</div>
            <div class="stat-label">Total Tes</div>
          </div>
        </div>

        <!-- Action cards -->
        <div class="grid-2" style="margin-bottom:2rem;">

          <!-- ── CARD MULAI TES ──────────────────────────── -->
          <div class="card action-card">
            <h2 style="margin-bottom:1rem;">🚀 Simulasi EPT</h2>

            <div v-if="doneToday" class="alert alert-success" style="margin-bottom:1rem;">
              ✅ Kamu sudah mengerjakan tes hari ini! Soal baru tersedia besok.
            </div>
            <div v-else-if="totalQ < 15" class="alert alert-danger" style="margin-bottom:1rem;">
              ⚠️ Soal belum tersedia ({{ totalQ }} soal). Hubungi admin.
            </div>

            <template v-else>
              <p style="color:var(--c-text-muted);margin-bottom:1rem;font-size:0.88rem;">
                <span class="badge badge-primary">{{ modeLabel }}</span>
              </p>

              <!-- Pilihan kategori tes -->
              <div class="category-grid">
                <button
                  v-for="cat in categories"
                  :key="cat.mode"
                  class="cat-btn"
                  :class="{
                    selected: selectedMode === cat.mode,
                    disabled: !cat.available
                  }"
                  :disabled="!cat.available"
                  @click="selectedMode = cat.mode"
                >
                  <span class="cat-icon">{{ cat.icon }}</span>
                  <span class="cat-name">{{ cat.label }}</span>
                  <span class="cat-count">{{ cat.count }} soal</span>
                  <span v-if="!cat.available" class="cat-unavail">Belum tersedia</span>
                </button>
              </div>

              <!-- Tombol mulai -->
              <button
                class="btn btn-primary btn-full"
                style="margin-top:1.25rem;"
                :disabled="!selectedMode"
                @click="handleStartTest"
              >
                ▶️ Mulai {{ selectedModeLabel }}
              </button>

              <!-- Review soal salah -->
              <button
                v-if="wrongCount > 0"
                class="btn btn-secondary btn-full"
                style="margin-top:0.75rem;font-size:0.88rem;"
                @click="goReview"
              >
                🔁 Review {{ wrongCount }} Soal yang Pernah Salah
              </button>
            </template>
          </div>

          <!-- ── CARD RIWAYAT ──────────────────────────────── -->
          <div class="card action-card">
            <h2 style="margin-bottom:1rem;">📋 Riwayat Terakhir</h2>
            <div v-if="!scores.length" class="alert alert-info">
              Belum ada riwayat. Selesaikan simulasi pertamamu!
            </div>
            <div v-else class="table-wrap">
              <table>
                <thead>
                  <tr><th>Tanggal</th><th>Mode</th><th>Skor</th><th>Akurasi</th></tr>
                </thead>
                <tbody>
                  <tr v-for="s in scores.slice(0,6)" :key="s.timestamp">
                    <td>{{ formatDate(s.date) }}</td>
                    <td>
                      <span class="badge badge-primary" style="font-size:0.72rem;">
                        {{ modeShort(s.testMode) }}
                      </span>
                    </td>
                    <td><strong>{{ s.total }}</strong></td>
                    <td>{{ s.accuracy }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Quick nav -->
        <h2 style="margin-bottom:1rem;">⚡ Akses Cepat</h2>
        <div class="grid-3">
          <router-link to="/analitik" class="quick-nav-card card">
            <span class="quick-icon">📊</span>
            <span>Analitik Saya</span>
          </router-link>
          <router-link to="/leaderboard" class="quick-nav-card card">
            <span class="quick-icon">🏆</span>
            <span>Leaderboard</span>
          </router-link>
          <router-link to="/materi" class="quick-nav-card card">
            <span class="quick-icon">📚</span>
            <span>Materi Belajar</span>
          </router-link>
          <router-link to="/profil" class="quick-nav-card card">
            <span class="quick-icon">👤</span>
            <span>Profil Saya</span>
          </router-link>
        </div>
      </template>

    </div>

    <!-- Toast notifikasi -->
    <transition name="toast-slide">
      <div v-if="toast.show" class="toast" :class="`toast-${toast.type}`">
        {{ toast.message }}
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Navbar from '@/components/Navbar.vue'
import { useAuthStore } from '@/stores/auth'
import { useTestStore } from '@/stores/test'
import { scoresApi } from '@/services/api'

const auth   = useAuthStore()
const test   = useTestStore()
const router = useRouter()

const loading      = ref(true)
const scores       = ref([])
const selectedMode = ref('full')

// Toast state
const toast = ref({ show: false, message: '', type: 'success' })
function showToast(message, type = 'success') {
  toast.value = { show: true, message, type }
  setTimeout(() => { toast.value.show = false }, 3000)
}

const todayStr = new Date().toLocaleDateString('id-ID', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
})

const modeLabel = computed(() =>
  test.soalMode === 'pool' ? '🎲 Soal Acak (Pool)' : '📋 Soal Manual'
)

// Kategori yang bisa dipilih
const categories = computed(() => {
  const qs = test.questions
  return [
    {
      mode:      'full',
      icon:      '🎯',
      label:     'Full Test',
      count:     (qs.listening?.length || 0) + (qs.structure?.length || 0) + (qs.reading?.length || 0),
      available: (qs.listening?.length || 0) >= 15 && (qs.structure?.length || 0) >= 15 && (qs.reading?.length || 0) >= 15,
    },
    {
      mode:      'listening',
      icon:      '🎧',
      label:     'Listening',
      count:     qs.listening?.length || 0,
      available: (qs.listening?.length || 0) >= 15,
    },
    {
      mode:      'structure',
      icon:      '📐',
      label:     'Structure',
      count:     qs.structure?.length || 0,
      available: (qs.structure?.length || 0) >= 15,
    },
    {
      mode:      'reading',
      icon:      '📖',
      label:     'Reading',
      count:     qs.reading?.length || 0,
      available: (qs.reading?.length || 0) >= 15,
    },
  ]
})

const selectedModeLabel = computed(() => {
  const cat = categories.value.find(c => c.mode === selectedMode.value)
  return cat?.label || 'Tes'
})

const totalQ = computed(() => test.totalAll)

// Statistik dari riwayat
const bestScore  = computed(() => scores.value.length ? Math.max(...scores.value.map(s => +s.total)) : 0)
const totalTests = computed(() => scores.value.length)
const doneToday  = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  return scores.value.some(s => s.date?.startsWith(today))
})

// Streak: hitung berapa hari berturut-turut
const streak = computed(() => {
  if (!scores.value.length) return 0
  const dates = [...new Set(scores.value.map(s => s.date?.slice(0, 10)).filter(Boolean))].sort().reverse()
  let count = 0
  let cur   = new Date()
  cur.setHours(0, 0, 0, 0)
  for (const d of dates) {
    const diff = Math.round((cur - new Date(d)) / 86400000)
    if (diff === count) count++
    else break
  }
  return count
})

// Soal salah yang pernah tersimpan
const wrongCount = computed(() => test.getWrongQuestions(auth.user?.username).length)

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function modeShort(mode) {
  const map = { full: 'Full', listening: 'Listen', structure: 'Struct', reading: 'Read' }
  return map[mode] || 'Full'
}

function handleStartTest() {
  test.setTestMode(selectedMode.value)
  test.startTest()
  showToast('Tes dimulai! Semangat! 💪')
}

function goReview() {
  router.push('/review')
}

onMounted(async () => {
  try {
    await test.loadQuestions()
    const res = await scoresApi.getUser(auth.user.username)
    scores.value = res.data.scores || []

    // Otomatis pilih mode yang tersedia
    const hasAll = categories.value[0]?.available
    if (!hasAll) {
      // Pilih seksi pertama yang tersedia
      const avail = categories.value.find(c => c.mode !== 'full' && c.available)
      if (avail) selectedMode.value = avail.mode
      else selectedMode.value = null
    }

    // Toast sambutan jika belum tes hari ini
    if (!doneToday.value && scores.value.length > 0) {
      showToast('Selamat datang kembali! Jangan lupa tes hari ini 📝', 'info')
    }
  } catch (e) {
    console.error(e)
    showToast('Gagal memuat data. Coba refresh.', 'error')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
/* ── Header ─────────────────────────────────────────────────── */
.dash-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.75rem;
  flex-wrap: wrap;
  gap: 1rem;
}
.name-hl { color: var(--c-primary-light); }
.date-text { color: var(--c-text-muted); font-size: 0.9rem; margin-top: 0.25rem; }

/* ── Streak badge ───────────────────────────────────────────── */
.streak-badge {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  padding: 0.75rem 1.25rem;
}
.streak-fire { font-size: 2rem; }
.streak-num  { font-family: var(--font-display); font-size: 1.6rem; font-weight: 700; color: var(--c-warning); line-height: 1; }
.streak-label{ font-size: 0.75rem; color: var(--c-text-muted); }

/* ── Category grid ──────────────────────────────────────────── */
.category-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.65rem;
}
.cat-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  padding: 0.85rem 0.5rem;
  background: var(--c-surface2);
  border: 2px solid var(--c-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  color: var(--c-text);
  font-family: var(--font-body);
  transition: all 0.18s;
  position: relative;
}
.cat-btn:hover:not(.disabled) { border-color: var(--c-primary); background: rgba(108,99,255,0.07); }
.cat-btn.selected { border-color: var(--c-primary); background: rgba(108,99,255,0.13); }
.cat-btn.disabled { opacity: 0.45; cursor: not-allowed; }
.cat-icon  { font-size: 1.5rem; }
.cat-name  { font-weight: 700; font-size: 0.9rem; }
.cat-count { font-size: 0.75rem; color: var(--c-text-muted); }
.cat-unavail {
  position: absolute;
  top: 4px; right: 6px;
  font-size: 0.62rem;
  color: var(--c-danger);
}

/* ── Action card ────────────────────────────────────────────── */
.action-card { height: 100%; }

/* ── Quick nav ──────────────────────────────────────────────── */
.quick-nav-card {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  text-decoration: none;
  color: var(--c-text);
  font-weight: 600;
  transition: all 0.2s;
}
.quick-nav-card:hover { border-color: var(--c-primary); color: var(--c-primary-light); transform: translateY(-2px); }
.quick-icon { font-size: 1.5rem; }

/* ── Skeleton loading ───────────────────────────────────────── */
@keyframes shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
.skel {
  border-radius: 6px;
  background: linear-gradient(90deg, var(--c-surface2) 25%, var(--c-border) 50%, var(--c-surface2) 75%);
  background-size: 800px 100%;
  animation: shimmer 1.4s infinite linear;
}
.skeleton-card {
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.skel-num   { height: 40px; width: 60%; }
.skel-label { height: 14px; width: 80%; }
.skel-title { height: 22px; width: 55%; margin-bottom: 0.5rem; }
.skel-body  { height: 14px; width: 90%; }
.skel-body.short { width: 60%; }
.skel-btn   { height: 40px; width: 100%; margin-top: 0.5rem; }
.skel-row   { height: 14px; width: 100%; margin-top: 0.5rem; }
.skeleton-action { display: flex; flex-direction: column; gap: 0.6rem; }

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
.toast-success { background: var(--c-success);   color: #fff; }
.toast-error   { background: var(--c-danger);    color: #fff; }
.toast-info    { background: var(--c-info);      color: #fff; }
.toast-warning { background: var(--c-warning);   color: #000; }

.toast-slide-enter-active { transition: all 0.3s ease; }
.toast-slide-leave-active { transition: all 0.3s ease; }
.toast-slide-enter-from   { opacity: 0; transform: translateX(-50%) translateY(20px); }
.toast-slide-leave-to     { opacity: 0; transform: translateX(-50%) translateY(20px); }

/* ── Responsive ─────────────────────────────────────────────── */
@media (max-width: 640px) {
  .streak-badge { padding: 0.6rem 1rem; }
  .category-grid { grid-template-columns: 1fr 1fr; }
  .cat-btn { padding: 0.7rem 0.4rem; }
  .cat-icon { font-size: 1.25rem; }
  .cat-name { font-size: 0.82rem; }
  .dash-header { flex-direction: column; align-items: flex-start; }
}

@media (max-width: 400px) {
  .category-grid { grid-template-columns: 1fr; }
}
</style>
