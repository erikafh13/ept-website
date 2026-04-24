<template>
  <div class="page">
    <Navbar />
    <div class="container" style="padding-top:2rem;padding-bottom:3rem;">
      <h1 style="margin-bottom:0.25rem;">📊 Analitik</h1>
      <p style="color:var(--c-text-muted);margin-bottom:2rem;">Pantau perkembangan belajarmu</p>

      <div v-if="loading" style="text-align:center;padding:3rem;">
        <div class="spinner" style="margin:auto;"></div>
      </div>

      <template v-else>
        <!-- Admin: all users -->
        <template v-if="isAdmin">
          <div class="tabs" style="margin-bottom:1.5rem;">
            <button v-for="t in adminTabs" :key="t.key" class="tab-btn" :class="{active:activeTab===t.key}" @click="activeTab=t.key">
              {{ t.label }}
            </button>
          </div>

          <!-- Per user -->
          <div v-if="activeTab==='users'" class="card">
            <h2 style="margin-bottom:1rem;">👥 Skor Semua Peserta</h2>
            <div class="table-wrap">
              <table>
                <thead><tr><th>Nama</th><th>Username</th><th>Tes Terakhir</th><th>Total</th><th>Akurasi</th></tr></thead>
                <tbody>
                  <tr v-for="s in allScores" :key="s.username+s.timestamp">
                    <td>{{ s.name }}</td>
                    <td style="color:var(--c-text-muted);">{{ s.username }}</td>
                    <td>{{ formatDate(s.date) }}</td>
                    <td><strong>{{ s.total }}</strong></td>
                    <td>{{ s.accuracy }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Hardest questions -->
          <div v-if="activeTab==='soal'" class="card">
            <h2 style="margin-bottom:1rem;">🔴 Soal Paling Sulit</h2>
            <p style="color:var(--c-text-muted);font-size:0.9rem;">Data dari answer log semua peserta.</p>
            <div class="table-wrap" style="margin-top:1rem;">
              <table>
                <thead><tr><th>Section</th><th>No Soal</th><th>Total Dijawab</th><th>Salah</th><th>Error Rate</th></tr></thead>
                <tbody>
                  <tr v-for="q in hardestQs" :key="q.key">
                    <td><span class="badge badge-primary">{{ q.section }}</span></td>
                    <td>{{ q.q_no }}</td>
                    <td>{{ q.total }}</td>
                    <td style="color:var(--c-danger)">{{ q.wrong }}</td>
                    <td>
                      <div style="display:flex;align-items:center;gap:0.5rem;">
                        <div class="progress-bar" style="width:80px;"><div class="progress-fill" :style="`width:${q.error_rate}%;background:var(--c-danger);`"></div></div>
                        {{ q.error_rate }}%
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>

        <!-- User: own analytics -->
        <template v-else>
          <!-- Stat mini -->
          <div class="grid-3" style="margin-bottom:1.5rem;">
            <div class="stat-card blue"><div class="stat-num">{{ userStats.totalTests }}</div><div class="stat-label">Total Tes</div></div>
            <div class="stat-card purple"><div class="stat-num">{{ userStats.avgScore }}</div><div class="stat-label">Rata-rata Skor</div></div>
            <div class="stat-card green"><div class="stat-num">{{ userStats.best }}</div><div class="stat-label">Skor Terbaik</div></div>
          </div>

          <!-- Progress per seksi -->
          <div class="card" style="margin-bottom:1.5rem;">
            <h2 style="margin-bottom:1.25rem;">📈 Progress Per Seksi (30 Tes Terakhir)</h2>
            <canvas ref="chartRef" height="280"></canvas>
          </div>

          <!-- Tabel riwayat -->
          <div class="card">
            <h2 style="margin-bottom:1rem;">📋 Riwayat Lengkap</h2>
            <div class="table-wrap">
              <table>
                <thead><tr><th>Tanggal</th><th>Listening</th><th>Structure</th><th>Reading</th><th>Total</th><th>Akurasi</th></tr></thead>
                <tbody>
                  <tr v-for="s in userScores" :key="s.timestamp">
                    <td>{{ formatDate(s.date) }}</td>
                    <td>{{ s.listening }}</td>
                    <td>{{ s.structure }}</td>
                    <td>{{ s.reading }}</td>
                    <td><strong>{{ s.total }}</strong></td>
                    <td>{{ s.accuracy }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Legend, Tooltip } from 'chart.js'
import Navbar from '@/components/Navbar.vue'
import { useAuthStore } from '@/stores/auth'
import { scoresApi, answerLogApi } from '@/services/api'

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Legend, Tooltip)

const auth = useAuthStore()
const isAdmin = computed(() => auth.isAdmin)

const loading = ref(true)
const userScores = ref([])
const allScores  = ref([])
const answerLog  = ref([])
const activeTab  = ref('users')
const chartRef   = ref(null)
const adminTabs  = [{ key:'users', label:'👥 Per User' }, { key:'soal', label:'🔍 Analisis Soal' }]

const userStats = computed(() => {
  const s = userScores.value
  if (!s.length) return { totalTests: 0, avgScore: 0, best: 0 }
  const totals = s.map(x => +x.total)
  return {
    totalTests: s.length,
    avgScore: Math.round(totals.reduce((a,b)=>a+b,0)/totals.length),
    best: Math.max(...totals)
  }
})

const hardestQs = computed(() => {
  const log = answerLog.value
  if (!log.length) return []
  const map = {}
  for (const row of log) {
    const key = `${row.section}_${row.q_no}`
    if (!map[key]) map[key] = { key, section: row.section, q_no: row.q_no, total: 0, wrong: 0 }
    map[key].total++
    if (!row.is_correct) map[key].wrong++
  }
  return Object.values(map)
    .map(x => ({ ...x, error_rate: Math.round((x.wrong/x.total)*100) }))
    .sort((a,b) => b.error_rate - a.error_rate)
    .slice(0, 15)
})

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' })
}

function drawChart() {
  if (!chartRef.value) return
  const scores = userScores.value.slice(0, 30).reverse()
  const labels = scores.map(s => formatDate(s.date))
  new Chart(chartRef.value, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Listening', data: scores.map(s=>+s.listening), borderColor: '#38bdf8', tension: 0.3, fill: false },
        { label: 'Structure', data: scores.map(s=>+s.structure), borderColor: '#8b85ff', tension: 0.3, fill: false },
        { label: 'Reading',   data: scores.map(s=>+s.reading),   borderColor: '#f97316', tension: 0.3, fill: false },
        { label: 'Total',     data: scores.map(s=>+s.total),     borderColor: '#10d48e', tension: 0.3, fill: false, borderWidth: 2 },
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#8888a0' } } },
      scales: {
        x: { ticks: { color: '#8888a0' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#8888a0' }, grid: { color: 'rgba(255,255,255,0.05)' }, min: 0, max: 45 }
      }
    }
  })
}

onMounted(async () => {
  try {
    if (isAdmin.value) {
      const [sr, lr] = await Promise.all([scoresApi.getAll(), answerLogApi.getAll()])
      allScores.value = sr.data.scores || []
      answerLog.value = lr.data.log || []
    } else {
      const res = await scoresApi.getUser(auth.user.username)
      userScores.value = res.data.scores || []
      await nextTick()
      if (userScores.value.length > 1) drawChart()
    }
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.tabs { display: flex; gap: 0.5rem; }
.tab-btn {
  padding: 0.5rem 1.1rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--c-border);
  background: var(--c-surface);
  color: var(--c-text-muted);
  cursor: pointer;
  font-family: var(--font-body);
  font-size: 0.9rem;
  transition: all 0.2s;
}
.tab-btn.active { background: var(--c-primary); border-color: var(--c-primary); color: #fff; }
</style>
