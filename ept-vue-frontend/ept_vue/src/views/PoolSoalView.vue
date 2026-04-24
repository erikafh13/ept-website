<template>
  <div class="page">
    <Navbar />
    <div class="container" style="padding-top:2rem;padding-bottom:3rem;">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;margin-bottom:2rem;">
        <div>
          <h1 style="margin-bottom:0.25rem;">🎲 Pool Soal</h1>
          <p style="color:var(--c-text-muted);">Bank soal acak untuk simulasi EPT</p>
        </div>
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
          <div class="stat-pill">Total: <strong>{{ stats.total || 0 }}</strong></div>
          <div class="stat-pill">Listening: <strong>{{ stats.listening || 0 }}</strong></div>
          <div class="stat-pill">Structure: <strong>{{ stats.structure || 0 }}</strong></div>
          <div class="stat-pill">Reading: <strong>{{ stats.reading || 0 }}</strong></div>
        </div>
      </div>

      <div class="grid-2" style="gap:1.5rem;align-items:start;">
        <!-- Form -->
        <div class="card">
          <h2 style="margin-bottom:1.25rem;">➕ Tambah ke Pool</h2>
          <div class="form-group">
            <label class="form-label">Seksi</label>
            <select v-model="form.type" class="form-input">
              <option value="listening">Listening</option>
              <option value="structure">Structure</option>
              <option value="reading">Reading</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Tingkat Kesulitan</label>
            <select v-model="form.difficulty" class="form-input">
              <option value="easy">Mudah</option>
              <option value="medium">Sedang</option>
              <option value="hard">Sulit</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Pertanyaan</label>
            <textarea v-model="form.question" class="form-input" rows="3" placeholder="Tulis pertanyaan..."></textarea>
          </div>
          <div v-for="(ltr, k) in ['A','B','C','D']" :key="k" class="form-group">
            <label class="form-label">Opsi {{ ltr }}</label>
            <input v-model="form[`option_${['a','b','c','d'][k]}`]" class="form-input" :placeholder="`Opsi ${ltr}...`" />
          </div>
          <div class="form-group">
            <label class="form-label">Jawaban Benar</label>
            <select v-model="form.correct" class="form-input">
              <option :value="0">A</option><option :value="1">B</option>
              <option :value="2">C</option><option :value="3">D</option>
            </select>
          </div>
          <div v-if="form.type==='listening'" class="form-group">
            <label class="form-label">Script Audio</label>
            <textarea v-model="form.script" class="form-input" rows="3" placeholder="Teks untuk TTS..."></textarea>
          </div>
          <div v-if="form.type==='reading'" class="form-group">
            <label class="form-label">Passage</label>
            <textarea v-model="form.passage" class="form-input" rows="4" placeholder="Teks bacaan..."></textarea>
          </div>
          <div v-if="msg" class="alert" :class="`alert-${msgType}`" style="margin-bottom:1rem;">{{ msg }}</div>
          <button class="btn btn-primary btn-full" @click="submitToPool" :disabled="saving">
            <span v-if="saving" class="spinner" style="width:14px;height:14px;border-width:2px;"></span>
            <span v-else>💾 Tambah ke Pool</span>
          </button>
        </div>

        <!-- Daftar pool -->
        <div class="card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;gap:0.75rem;flex-wrap:wrap;">
            <h2>📦 Isi Pool</h2>
            <div style="display:flex;gap:0.5rem;">
              <select v-model="filterType" class="form-input" style="padding:0.4rem 0.7rem;font-size:0.85rem;">
                <option value="">Semua</option>
                <option value="listening">Listening</option>
                <option value="structure">Structure</option>
                <option value="reading">Reading</option>
              </select>
            </div>
          </div>
          <div v-if="loading" style="text-align:center;padding:2rem;"><div class="spinner" style="margin:auto;"></div></div>
          <div v-else-if="!filteredPool.length" class="alert alert-info">Pool kosong. Tambahkan soal terlebih dahulu.</div>
          <div v-else class="table-wrap">
            <table>
              <thead>
                <tr><th>ID</th><th>Seksi</th><th>Soal</th><th>Level</th><th></th></tr>
              </thead>
              <tbody>
                <tr v-for="q in filteredPool" :key="q.pool_id">
                  <td style="color:var(--c-text-dim);font-size:0.8rem;">{{ q.pool_id }}</td>
                  <td><span class="badge badge-primary" style="font-size:0.75rem;">{{ q.type }}</span></td>
                  <td style="max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:0.88rem;">{{ q.question }}</td>
                  <td>
                    <span class="badge" :class="{'badge-success':q.difficulty==='easy','badge-warning':q.difficulty==='medium','badge-danger':q.difficulty==='hard'}" style="font-size:0.75rem;">
                      {{ q.difficulty }}
                    </span>
                  </td>
                  <td>
                    <button class="btn btn-danger" style="padding:0.3rem 0.6rem;font-size:0.75rem;" @click="deleteFromPool(q.pool_id)">🗑️</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import Navbar from '@/components/Navbar.vue'
import { poolApi } from '@/services/api'

const loading = ref(true)
const saving = ref(false)
const msg = ref('')
const msgType = ref('success')
const pool = ref([])
const stats = ref({})
const filterType = ref('')

const form = ref({
  type:'listening', difficulty:'medium', question:'',
  option_a:'', option_b:'', option_c:'', option_d:'',
  correct:0, script:'', passage:''
})

const filteredPool = computed(() =>
  filterType.value ? pool.value.filter(q => q.type === filterType.value) : pool.value
)

async function loadPool() {
  loading.value = true
  try {
    const [pr, sr] = await Promise.all([poolApi.getAll(), poolApi.getStats()])
    pool.value = pr.data.pool || []
    stats.value = sr.data.stats || {}
  } finally {
    loading.value = false
  }
}

async function submitToPool() {
  saving.value = true; msg.value = ''
  try {
    await poolApi.add(form.value)
    msg.value = '✅ Soal berhasil ditambahkan ke pool!'; msgType.value = 'success'
    form.value.question = form.value.option_a = form.value.option_b =
    form.value.option_c = form.value.option_d = form.value.script = form.value.passage = ''
    await loadPool()
  } catch(e) {
    msg.value = e.response?.data?.message || 'Gagal menambah soal.'; msgType.value = 'danger'
  } finally {
    saving.value = false
  }
}

async function deleteFromPool(poolId) {
  if (!confirm('Hapus soal ini dari pool?')) return
  await poolApi.delete(poolId)
  await loadPool()
}

onMounted(loadPool)
</script>

<style scoped>
textarea.form-input { resize:vertical; min-height:80px; }
.stat-pill {
  padding: 0.4rem 0.85rem;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: 999px;
  font-size: 0.85rem;
  color: var(--c-text-muted);
}
.stat-pill strong { color: var(--c-text); }
</style>
