<template>
  <div class="page">
    <Navbar />
    <div class="container" style="padding-top:2rem;padding-bottom:3rem;">
      <h1 style="margin-bottom:0.25rem;">⚙️ Panel Admin</h1>
      <p style="color:var(--c-text-muted);margin-bottom:2rem;">Kelola soal, user, dan data sistem</p>

      <div class="tabs" style="margin-bottom:1.5rem;">
        <button v-for="t in tabs" :key="t.key" class="tab-btn" :class="{active:activeTab===t.key}" @click="activeTab=t.key">{{ t.label }}</button>
      </div>

      <!-- ── TAB: SOAL MANUAL ── -->
      <div v-if="activeTab==='soal'">
        <div class="grid-2" style="gap:1.5rem;">
          <!-- Form tambah soal -->
          <div class="card">
            <h2 style="margin-bottom:1.25rem;">➕ Tambah Soal</h2>
            <div class="form-group">
              <label class="form-label">Tanggal</label>
              <input v-model="form.date" type="date" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">Seksi</label>
              <select v-model="form.type" class="form-input">
                <option value="listening">Listening</option>
                <option value="structure">Structure</option>
                <option value="reading">Reading</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">No. Soal</label>
              <input v-model="form.no" type="number" class="form-input" placeholder="1" min="1" />
            </div>
            <div class="form-group">
              <label class="form-label">Pertanyaan</label>
              <textarea v-model="form.question" class="form-input" rows="3" placeholder="Tulis pertanyaan..."></textarea>
            </div>
            <div v-for="(_, k) in ['A','B','C','D']" :key="k" class="form-group">
              <label class="form-label">Opsi {{ ['A','B','C','D'][k] }}</label>
              <input v-model="form[`option_${['a','b','c','d'][k]}`]" class="form-input" :placeholder="`Opsi ${'ABCD'[k]}...`" />
            </div>
            <div class="form-group">
              <label class="form-label">Jawaban Benar</label>
              <select v-model="form.correct" class="form-input">
                <option :value="0">A</option>
                <option :value="1">B</option>
                <option :value="2">C</option>
                <option :value="3">D</option>
              </select>
            </div>
            <div v-if="form.type==='listening'" class="form-group">
              <label class="form-label">Script Audio (untuk TTS)</label>
              <textarea v-model="form.script" class="form-input" rows="3" placeholder="Teks yang akan dibacakan..."></textarea>
            </div>
            <div v-if="form.type==='reading'" class="form-group">
              <label class="form-label">Passage</label>
              <textarea v-model="form.passage" class="form-input" rows="5" placeholder="Teks bacaan..."></textarea>
            </div>
            <div v-if="msg" class="alert" :class="`alert-${msgType}`" style="margin-bottom:1rem;">{{ msg }}</div>
            <button class="btn btn-primary btn-full" @click="submitSoal" :disabled="saving">
              <span v-if="saving" class="spinner" style="width:14px;height:14px;border-width:2px;"></span>
              <span v-else>💾 Simpan Soal</span>
            </button>
          </div>

          <!-- Soal per tanggal -->
          <div class="card">
            <h2 style="margin-bottom:1rem;">📋 Soal Tersimpan</h2>
            <div style="display:flex;gap:0.75rem;margin-bottom:1rem;">
              <input v-model="filterDate" type="date" class="form-input" />
              <button class="btn btn-secondary" @click="loadSoalByDate">Cari</button>
            </div>
            <div v-if="loadingSoal" style="text-align:center;padding:2rem;"><div class="spinner" style="margin:auto;"></div></div>
            <div v-else-if="!soalList.length" class="alert alert-info">Belum ada soal untuk tanggal ini.</div>
            <div v-else>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;">
                <span style="font-size:0.9rem;color:var(--c-text-muted);">{{ soalList.length }} soal ditemukan</span>
                <button class="btn btn-danger" style="font-size:0.8rem;padding:0.4rem 0.8rem;" @click="hapusSoalDate">🗑️ Hapus Semua</button>
              </div>
              <div class="table-wrap">
                <table>
                  <thead><tr><th>No</th><th>Seksi</th><th>Pertanyaan</th></tr></thead>
                  <tbody>
                    <tr v-for="s in soalList" :key="s.no+s.type">
                      <td>{{ s.no }}</td>
                      <td><span class="badge badge-primary">{{ s.type }}</span></td>
                      <td style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ s.question }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── TAB: USER ── -->
      <div v-if="activeTab==='users'">
        <div class="grid-2" style="gap:1.5rem;">
          <div class="card">
            <h2 style="margin-bottom:1.25rem;">👤 Tambah User</h2>
            <div class="form-group"><label class="form-label">Username</label><input v-model="userForm.username" class="form-input" placeholder="username" /></div>
            <div class="form-group"><label class="form-label">Password</label><input v-model="userForm.password" class="form-input" placeholder="password" type="password" /></div>
            <div class="form-group"><label class="form-label">Nama Lengkap</label><input v-model="userForm.name" class="form-input" placeholder="Nama..." /></div>
            <div class="form-group"><label class="form-label">Role</label>
              <select v-model="userForm.role" class="form-input"><option value="user">User</option><option value="admin">Admin</option></select>
            </div>
            <div class="form-group"><label class="form-label">No. WhatsApp</label><input v-model="userForm.phone" class="form-input" placeholder="628xxxxxxxxx" /></div>
            <div v-if="userMsg" class="alert" :class="`alert-${userMsgType}`" style="margin-bottom:1rem;">{{ userMsg }}</div>
            <button class="btn btn-primary btn-full" @click="addUser" :disabled="savingUser">
              <span v-if="savingUser" class="spinner" style="width:14px;height:14px;border-width:2px;"></span>
              <span v-else>➕ Tambah User</span>
            </button>
          </div>
          <div class="card">
            <h2 style="margin-bottom:1rem;">👥 Daftar User</h2>
            <div v-if="loadingUsers" style="text-align:center;padding:2rem;"><div class="spinner" style="margin:auto;"></div></div>
            <div v-else class="table-wrap">
              <table>
                <thead><tr><th>Username</th><th>Nama</th><th>Role</th><th>Aksi</th></tr></thead>
                <tbody>
                  <tr v-for="u in users" :key="u.username">
                    <td>{{ u.username }}</td>
                    <td>{{ u.name }}</td>
                    <td><span class="badge" :class="u.role==='admin'?'badge-warning':'badge-primary'">{{ u.role }}</span></td>
                    <td>
                      <button class="btn btn-danger" style="padding:0.3rem 0.7rem;font-size:0.8rem;" @click="deleteUser(u.username)" :disabled="u.username===auth.user?.username">🗑️</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Navbar from '@/components/Navbar.vue'
import { useAuthStore } from '@/stores/auth'
import { questionsApi, usersApi } from '@/services/api'

const auth = useAuthStore()
const activeTab = ref('soal')
const tabs = [{ key:'soal', label:'📝 Soal Manual' }, { key:'users', label:'👥 User' }]

// Soal
const saving = ref(false)
const msg = ref('')
const msgType = ref('success')
const loadingSoal = ref(false)
const soalList = ref([])
const filterDate = ref(new Date().toISOString().slice(0,10))

const form = ref({
  date: new Date().toISOString().slice(0,10), type: 'listening', no: 1,
  question: '', option_a: '', option_b: '', option_c: '', option_d: '',
  correct: 0, script: '', passage: ''
})

async function submitSoal() {
  saving.value = true; msg.value = ''
  try {
    await questionsApi.add(form.value)
    msg.value = '✅ Soal berhasil disimpan!'; msgType.value = 'success'
    form.value.no++
    form.value.question = form.value.option_a = form.value.option_b =
    form.value.option_c = form.value.option_d = form.value.script = form.value.passage = ''
  } catch(e) {
    msg.value = e.response?.data?.message || 'Gagal menyimpan soal.'; msgType.value = 'danger'
  } finally {
    saving.value = false
  }
}

async function loadSoalByDate() {
  loadingSoal.value = true
  try {
    const res = await questionsApi.getByDate(filterDate.value)
    soalList.value = [...(res.data.questions?.listening||[]), ...(res.data.questions?.structure||[]), ...(res.data.questions?.reading||[])]
  } finally {
    loadingSoal.value = false
  }
}

async function hapusSoalDate() {
  if (!confirm(`Hapus semua soal tanggal ${filterDate.value}?`)) return
  await questionsApi.deleteByDate(filterDate.value)
  soalList.value = []
}

// Users
const savingUser = ref(false)
const userMsg = ref('')
const userMsgType = ref('success')
const loadingUsers = ref(false)
const users = ref([])
const userForm = ref({ username:'', password:'', name:'', role:'user', phone:'' })

async function loadUsers() {
  loadingUsers.value = true
  try {
    const res = await usersApi.getAll()
    users.value = res.data.users || []
  } finally {
    loadingUsers.value = false
  }
}

async function addUser() {
  savingUser.value = true; userMsg.value = ''
  try {
    await usersApi.add(userForm.value)
    userMsg.value = '✅ User berhasil ditambahkan!'; userMsgType.value = 'success'
    userForm.value = { username:'', password:'', name:'', role:'user', phone:'' }
    await loadUsers()
  } catch(e) {
    userMsg.value = e.response?.data?.message || 'Gagal menambah user.'; userMsgType.value = 'danger'
  } finally {
    savingUser.value = false
  }
}

async function deleteUser(username) {
  if (!confirm(`Hapus user ${username}?`)) return
  await usersApi.delete(username)
  await loadUsers()
}

onMounted(() => { loadUsers(); loadSoalByDate() })
</script>

<style scoped>
.tabs { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.tab-btn { padding:0.5rem 1.1rem; border-radius:var(--radius-sm); border:1px solid var(--c-border); background:var(--c-surface); color:var(--c-text-muted); cursor:pointer; font-family:var(--font-body); font-size:0.9rem; transition:all 0.2s; }
.tab-btn.active { background:var(--c-primary); border-color:var(--c-primary); color:#fff; }
textarea.form-input { resize: vertical; min-height: 80px; }
</style>
