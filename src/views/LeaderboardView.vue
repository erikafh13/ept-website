<template>
  <div class="page">
    <Navbar />
    <div class="container" style="padding-top:2rem;max-width:800px;">
      <h1 style="margin-bottom:0.25rem;">🏆 Leaderboard</h1>
      <p style="color:var(--c-text-muted);margin-bottom:2rem;">Peringkat peserta berdasarkan skor terbaik</p>

      <div v-if="loading" style="text-align:center;padding:3rem;"><div class="spinner" style="margin:auto;"></div></div>

      <div v-else class="card">
        <div class="lb-filter" style="margin-bottom:1.25rem;">
          <select v-model="period" class="form-input" style="max-width:200px;">
            <option value="all">Semua Waktu</option>
            <option value="month">Bulan Ini</option>
            <option value="week">Minggu Ini</option>
          </select>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>#</th><th>Peserta</th><th>Skor Terbaik</th><th>Rata-rata</th><th>Total Tes</th></tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in filtered" :key="row.username" :class="{highlight: row.username === auth.user?.username}">
                <td>
                  <span class="rank" :class="['gold','silver','bronze'][i] || ''">
                    {{ i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i+1 }}
                  </span>
                </td>
                <td>
                  <div style="display:flex;align-items:center;gap:0.6rem;">
                    <div class="lb-avatar">{{ row.name[0] }}</div>
                    <div>
                      <div style="font-weight:600;">{{ row.name }}</div>
                      <div style="font-size:0.8rem;color:var(--c-text-muted);">@{{ row.username }}</div>
                    </div>
                  </div>
                </td>
                <td><strong style="font-size:1.1rem;color:var(--c-primary-light);">{{ row.best }}</strong></td>
                <td>{{ row.avg }}</td>
                <td>{{ row.count }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import Navbar from '@/components/Navbar.vue'
import { useAuthStore } from '@/stores/auth'
import { scoresApi } from '@/services/api'

const auth = useAuthStore()
const loading = ref(true)
const allScores = ref([])
const period = ref('all')

const filtered = computed(() => {
  let rows = allScores.value
  const now = new Date()
  if (period.value === 'month') {
    rows = rows.filter(s => new Date(s.date).getMonth() === now.getMonth())
  } else if (period.value === 'week') {
    const weekAgo = new Date(now - 7 * 86400000)
    rows = rows.filter(s => new Date(s.date) >= weekAgo)
  }
  // Group by username
  const map = {}
  for (const s of rows) {
    if (!map[s.username]) map[s.username] = { username: s.username, name: s.name, totals: [] }
    map[s.username].totals.push(+s.total)
  }
  return Object.values(map).map(u => ({
    ...u,
    best: Math.max(...u.totals),
    avg: Math.round(u.totals.reduce((a,b)=>a+b,0)/u.totals.length),
    count: u.totals.length
  })).sort((a,b) => b.best - a.best)
})

onMounted(async () => {
  try {
    const res = await scoresApi.getAll()
    allScores.value = res.data.scores || []
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.highlight td { background: rgba(108,99,255,0.08) !important; }
.lb-avatar {
  width: 34px; height: 34px;
  background: var(--c-primary-glow);
  border: 1px solid var(--c-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: var(--c-primary-light);
  font-size: 0.9rem;
}
</style>
