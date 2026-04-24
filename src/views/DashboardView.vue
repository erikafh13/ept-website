<template>
  <div class="page">
    <Navbar />
    <div class="container" style="padding-top: 2rem;">

      <!-- Header -->
      <div class="dash-header">
        <div>
          <h1>Halo, <span class="name-hl">{{ auth.user?.name }}</span> 👋</h1>
          <p class="date-text">📅 {{ todayStr }}</p>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-center">
        <div class="spinner"></div>
        <p style="color:var(--c-text-muted);margin-top:1rem;">Memuat soal hari ini...</p>
      </div>

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
            <div class="stat-num">{{ bestScore }}/45</div>
            <div class="stat-label">Skor Terbaik</div>
          </div>
          <div class="stat-card orange">
            <div class="stat-num">{{ streak }}🔥</div>
            <div class="stat-label">Hari Berturut</div>
          </div>
        </div>

        <!-- Action cards -->
        <div class="grid-2" style="margin-bottom:2rem;">
          <!-- Mulai test -->
          <div class="card action-card">
            <h2 style="margin-bottom:1rem;">🚀 Simulasi EPT Hari Ini</h2>
            <div v-if="doneToday" class="alert alert-success" style="margin-bottom:1rem;">
              ✅ Kamu sudah mengerjakan tes hari ini! Soal baru tersedia besok.
            </div>
            <div v-else-if="totalQ < 45" class="alert alert-danger" style="margin-bottom:1rem;">
              ⚠️ Soal belum lengkap ({{ totalQ }}/45). Hubungi admin.
            </div>
            <template v-else>
              <p style="color:var(--c-text-muted);margin-bottom:1.25rem;font-size:0.9rem;">
                <span class="badge badge-primary">{{ modeLabel }}</span>&nbsp;
                {{ test.questions.listening.length }} Listening ·
                {{ test.questions.structure.length }} Structure ·
                {{ test.questions.reading.length }} Reading
              </p>
              <button class="btn btn-primary btn-full" @click="handleStartTest">
                ▶️ Mulai Simulasi Sekarang
              </button>
            </template>
          </div>

          <!-- Riwayat -->
          <div class="card action-card">
            <h2 style="margin-bottom:1rem;">📋 Riwayat Terakhir</h2>
            <div v-if="!scores.length" class="alert alert-info">
              Belum ada riwayat. Selesaikan simulasi pertamamu!
            </div>
            <div v-else class="table-wrap">
              <table>
                <thead>
                  <tr><th>Tanggal</th><th>Skor</th><th>Akurasi</th></tr>
                </thead>
                <tbody>
                  <tr v-for="s in scores.slice(0,5)" :key="s.timestamp">
                    <td>{{ formatDate(s.date) }}</td>
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
        </div>
      </template>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import Navbar from '@/components/Navbar.vue'
import { useAuthStore } from '@/stores/auth'
import { useTestStore } from '@/stores/test'
import { scoresApi } from '@/services/api'

const auth = useAuthStore()
const test = useTestStore()
const loading = ref(true)
const scores = ref([])

const todayStr = new Date().toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' })

const totalQ = computed(() => test.totalAll)
const modeLabel = computed(() => test.soalMode === 'pool' ? '🎲 Soal Acak (Pool)' : '📋 Soal Manual')

const bestScore = computed(() => scores.value.length ? Math.max(...scores.value.map(s => +s.total)) : 0)
const doneToday = computed(() => {
  const today = new Date().toISOString().slice(0,10)
  return scores.value.some(s => s.date?.startsWith(today))
})
const streak = computed(() => {
  if (!scores.value.length) return 0
  const dates = [...new Set(scores.value.map(s => s.date?.slice(0,10)))].sort().reverse()
  let count = 0
  let cur = new Date()
  cur.setHours(0,0,0,0)
  for (const d of dates) {
    const dd = new Date(d)
    const diff = Math.round((cur - dd) / 86400000)
    if (diff === count) count++
    else break
  }
  return count
})

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', { day:'numeric', month:'short' })
}

async function handleStartTest() {
  test.startTest()
}

onMounted(async () => {
  try {
    await test.loadQuestions()
    const res = await scoresApi.getUser(auth.user.username)
    scores.value = res.data.scores || []
  } catch(e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.dash-header { margin-bottom: 1.75rem; }
.name-hl { color: var(--c-primary-light); }
.date-text { color: var(--c-text-muted); font-size: 0.9rem; margin-top: 0.25rem; }
.loading-center { display: flex; flex-direction: column; align-items: center; padding: 5rem 0; }
.action-card { height: 100%; }
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
</style>
