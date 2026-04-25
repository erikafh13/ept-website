<template>
  <div class="page" :class="{ 'light-mode': isLight }">
    <Navbar />
    <div class="container" style="padding-top:2rem;padding-bottom:3rem;max-width:800px;">

      <!-- Header profil -->
      <div class="profil-hero card-glass">
        <div class="avatar-big">{{ initial }}</div>
        <div class="profil-info">
          <h1>{{ auth.user?.name }}</h1>
          <p class="username-text">@{{ auth.user?.username }}</p>
          <span class="badge" :class="isAdmin ? 'badge-warning' : 'badge-primary'">
            {{ isAdmin ? '👑 Admin' : '🎓 Student' }}
          </span>
        </div>
        <!-- Dark/Light mode toggle -->
        <button class="theme-toggle" @click="toggleTheme" :title="isLight ? 'Mode Gelap' : 'Mode Terang'">
          {{ isLight ? '🌙' : '☀️' }}
          <span class="theme-label">{{ isLight ? 'Dark' : 'Light' }}</span>
        </button>
      </div>

      <!-- Loading skeleton -->
      <template v-if="loading">
        <div class="grid-3" style="margin:1.5rem 0;">
          <div v-for="n in 3" :key="n" class="card skeleton-stat">
            <div class="skel skel-num"></div>
            <div class="skel skel-lbl"></div>
          </div>
        </div>
      </template>

      <template v-else>
        <!-- Stat overview -->
        <div class="grid-3" style="margin:1.5rem 0;">
          <div class="stat-card blue">
            <div class="stat-num">{{ totalTests }}</div>
            <div class="stat-label">Total Tes</div>
          </div>
          <div class="stat-card green">
            <div class="stat-num">{{ avgScore }}<span style="font-size:0.65em;opacity:0.7;">/45</span></div>
            <div class="stat-label">Rata-rata Skor</div>
          </div>
          <div class="stat-card orange">
            <div class="stat-num">{{ streak }}🔥</div>
            <div class="stat-label">Streak Harian</div>
          </div>
        </div>

        <!-- Progress per kategori -->
        <div class="card" style="margin-bottom:1.5rem;">
          <h2 style="margin-bottom:1.25rem;">📊 Progress Per Kategori</h2>
          <div class="cat-progress-list">
            <div v-for="cat in categoryStats" :key="cat.key" class="cat-prog-row">
              <div class="cat-prog-header">
                <span>{{ cat.icon }} {{ cat.label }}</span>
                <span class="cat-avg">Rata-rata: <strong>{{ cat.avg }}/15</strong></span>
              </div>
              <div class="progress-bar" style="height:8px;">
                <div
                  class="progress-fill"
                  :style="`width:${(cat.avg/15)*100}%;background:${cat.color};transition:width 0.8s ease;`"
                ></div>
              </div>
              <div class="cat-prog-meta">
                <span>Terbaik: {{ cat.best }}/15</span>
                <span>Terburuk: {{ cat.worst }}/15</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Soal yang sering salah -->
        <div class="card" style="margin-bottom:1.5rem;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
            <h2>❌ Soal Sering Salah</h2>
            <router-link to="/review" class="btn btn-secondary" style="font-size:0.82rem;padding:0.4rem 0.8rem;">
              Review Semua →
            </router-link>
          </div>
          <div v-if="!wrongList.length" class="alert alert-success">
            🎉 Tidak ada soal yang tersimpan sebagai salah. Kerja bagus!
          </div>
          <div v-else>
            <p class="sub-text" style="margin-bottom:0.75rem;">
              {{ wrongList.length }} soal tersimpan dari sesi-sesi sebelumnya.
            </p>
            <div class="wrong-summary">
              <div v-for="(sec, key) in wrongBySec" :key="key" class="wrong-sec-badge">
                <span>{{ ICONS[key] }}</span>
                <span>{{ LABELS[key] }}: <strong>{{ sec }}</strong></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Riwayat lengkap -->
        <div class="card" style="margin-bottom:1.5rem;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
            <h2>📋 Riwayat Tes</h2>
            <span class="badge badge-primary">{{ totalTests }} tes</span>
          </div>
          <div v-if="!scores.length" class="alert alert-info">
            Belum ada riwayat tes.
          </div>
          <div v-else class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Mode</th>
                  <th>Listen</th>
                  <th>Struct</th>
                  <th>Read</th>
                  <th>Total</th>
                  <th>Akurasi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="s in scores" :key="s.timestamp">
                  <td style="white-space:nowrap;">{{ formatDate(s.date) }}</td>
                  <td>
                    <span class="badge badge-primary" style="font-size:0.7rem;">
                      {{ modeShort(s.testMode) }}
                    </span>
                  </td>
                  <td>{{ s.listening }}</td>
                  <td>{{ s.structure }}</td>
                  <td>{{ s.reading }}</td>
                  <td><strong>{{ s.total }}</strong></td>
                  <td :style="`color:${accuracyColor(s.accuracy)};`">{{ s.accuracy }}</td>
                </tr>
              </tbody>
            </table>
          </div>
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

const auth    = useAuthStore()
const test    = useTestStore()
const loading = ref(true)
const scores  = ref([])

const isAdmin  = computed(() => auth.isAdmin)
const initial  = computed(() => auth.user?.name?.[0]?.toUpperCase() || '?')

const ICONS  = { listening: '🎧', structure: '📐', reading: '📖' }
const LABELS = { listening: 'Listening', structure: 'Structure', reading: 'Reading' }

// ── Dark / Light mode ──────────────────────────────────────────
// Simpan preferensi ke localStorage
const isLight = ref(localStorage.getItem('ept_theme') === 'light')

function toggleTheme() {
  isLight.value = !isLight.value
  localStorage.setItem('ept_theme', isLight.value ? 'light' : 'dark')
  // Terapkan ke root <html> agar berlaku global
  document.documentElement.setAttribute('data-theme', isLight.value ? 'light' : 'dark')
}

// Apply tema saat komponen mount
onMounted(async () => {
  document.documentElement.setAttribute('data-theme', isLight.value ? 'light' : 'dark')

  try {
    const res = await scoresApi.getUser(auth.user.username)
    scores.value = res.data.scores || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

// ── Statistik ──────────────────────────────────────────────────
const totalTests = computed(() => scores.value.length)

const avgScore = computed(() => {
  if (!scores.value.length) return 0
  return Math.round(scores.value.reduce((s, r) => s + (+r.total || 0), 0) / scores.value.length)
})

const streak = computed(() => {
  if (!scores.value.length) return 0
  const dates = [...new Set(scores.value.map(s => s.date?.slice(0, 10)).filter(Boolean))].sort().reverse()
  let count = 0
  let cur   = new Date(); cur.setHours(0,0,0,0)
  for (const d of dates) {
    const diff = Math.round((cur - new Date(d)) / 86400000)
    if (diff === count) count++
    else break
  }
  return count
})

// Progress per kategori
const categoryStats = computed(() => {
  const cats = [
    { key: 'listening', icon: '🎧', label: 'Listening', color: '#38bdf8' },
    { key: 'structure', icon: '📐', label: 'Structure', color: '#a78bfa' },
    { key: 'reading',   icon: '📖', label: 'Reading',   color: '#fb923c' },
  ]
  return cats.map(cat => {
    const vals = scores.value
      .filter(s => s[cat.key] !== undefined && s[cat.key] !== null && s[cat.key] !== '')
      .map(s => +s[cat.key] || 0)
    return {
      ...cat,
      avg:   vals.length ? Math.round(vals.reduce((a,b) => a+b, 0) / vals.length) : 0,
      best:  vals.length ? Math.max(...vals) : 0,
      worst: vals.length ? Math.min(...vals) : 0,
    }
  })
})

// Soal salah
const wrongList   = computed(() => test.getWrongQuestions(auth.user?.username))
const wrongBySec  = computed(() => {
  const obj = { listening: 0, structure: 0, reading: 0 }
  wrongList.value.forEach(q => { if (obj[q.section] !== undefined) obj[q.section]++ })
  return obj
})

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' })
}

function modeShort(mode) {
  return { full: 'Full', listening: 'Listen', structure: 'Struct', reading: 'Read' }[mode] || 'Full'
}

function accuracyColor(acc) {
  const n = parseInt(acc) || 0
  if (n >= 85) return 'var(--c-success)'
  if (n >= 70) return 'var(--c-info)'
  if (n >= 55) return 'var(--c-warning)'
  return 'var(--c-danger)'
}
</script>

<style scoped>
/* ── Profil hero ────────────────────────────────────────────── */
.profil-hero {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 2rem;
  margin-bottom: 0;
  flex-wrap: wrap;
}
.avatar-big {
  width: 72px; height: 72px;
  border-radius: 50%;
  background: var(--c-primary-glow);
  border: 2px solid var(--c-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 700;
  color: var(--c-primary-light);
  flex-shrink: 0;
}
.profil-info { flex: 1; }
.profil-info h1 { font-size: 1.5rem; margin-bottom: 0.2rem; }
.username-text { color: var(--c-text-muted); font-size: 0.88rem; margin-bottom: 0.4rem; }

/* ── Theme toggle ───────────────────────────────────────────── */
.theme-toggle {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: var(--c-surface2);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  padding: 0.5rem 0.85rem;
  cursor: pointer;
  font-size: 1rem;
  font-family: var(--font-body);
  color: var(--c-text);
  transition: all 0.2s;
}
.theme-toggle:hover { border-color: var(--c-primary); }
.theme-label { font-size: 0.82rem; }

/* ── Category progress ──────────────────────────────────────── */
.cat-progress-list { display: flex; flex-direction: column; gap: 1.25rem; }
.cat-prog-row {}
.cat-prog-header {
  display: flex;
  justify-content: space-between;
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 0.4rem;
}
.cat-avg { color: var(--c-text-muted); font-weight: 400; }
.cat-prog-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.78rem;
  color: var(--c-text-dim);
  margin-top: 0.25rem;
}

/* ── Wrong summary ──────────────────────────────────────────── */
.wrong-summary { display: flex; gap: 0.75rem; flex-wrap: wrap; }
.wrong-sec-badge {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: var(--c-surface2);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  padding: 0.4rem 0.85rem;
  font-size: 0.88rem;
}

/* ── Skeleton ───────────────────────────────────────────────── */
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
.skeleton-stat { display: flex; flex-direction: column; gap: 0.6rem; }
.skel-num { height: 36px; width: 60%; }
.skel-lbl { height: 14px; width: 80%; }
.sub-text { color: var(--c-text-muted); font-size: 0.88rem; }

/* ── Light mode override (diterapkan via data-theme di <html>) ─ */
/* Variabel disetel di main.css, cukup tambahkan tag di sini agar
   halaman ini juga ikut merespons. Implementasi lengkap di main.css */

/* ── Responsive ─────────────────────────────────────────────── */
@media (max-width: 600px) {
  .profil-hero { padding: 1.25rem; flex-direction: column; align-items: flex-start; }
  .avatar-big  { width: 56px; height: 56px; font-size: 1.5rem; }
  .theme-toggle { align-self: flex-end; }
  .wrong-summary { flex-direction: column; gap: 0.5rem; }
}
</style>
