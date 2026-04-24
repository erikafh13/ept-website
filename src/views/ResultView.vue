<template>
  <div class="page">
    <Navbar />
    <div class="container result-wrap">
      <div v-if="!score" class="no-result">
        <p>Tidak ada hasil test.</p>
        <router-link to="/dashboard" class="btn btn-primary">Ke Dashboard</router-link>
      </div>

      <template v-else>
        <!-- Hero -->
        <div class="result-hero card-glass">
          <div class="grade-ring" :style="`--gc:${gradeColor}`">{{ grade }}</div>
          <h1>Simulasi Selesai!</h1>
          <p class="grade-msg">{{ gradeMsg }}</p>
        </div>

        <!-- Skor -->
        <div class="grid-4" style="margin: 1.5rem 0;">
          <div class="stat-card blue">
            <div class="stat-num">{{ score.listening }}</div>
            <div class="stat-label">Listening<br>/15</div>
          </div>
          <div class="stat-card purple">
            <div class="stat-num">{{ score.structure }}</div>
            <div class="stat-label">Structure<br>/15</div>
          </div>
          <div class="stat-card orange">
            <div class="stat-num">{{ score.reading }}</div>
            <div class="stat-label">Reading<br>/15</div>
          </div>
          <div class="stat-card green">
            <div class="stat-num">{{ total }}</div>
            <div class="stat-label">Total<br>/45</div>
          </div>
        </div>

        <!-- Accuracy bar -->
        <div class="card" style="margin-bottom:1.5rem;">
          <div style="display:flex;justify-content:space-between;margin-bottom:0.6rem;">
            <span style="font-weight:600;">Akurasi Keseluruhan</span>
            <strong :style="`color:${gradeColor}`">{{ accuracy }}%</strong>
          </div>
          <div class="progress-bar" style="height:10px;">
            <div class="progress-fill" :style="`width:${accuracy}%;background:${gradeColor};`"></div>
          </div>
        </div>

        <!-- Rekomendasi -->
        <div class="card" style="margin-bottom:1.5rem;">
          <h2 style="margin-bottom:1rem;">💡 Rekomendasi Belajar</h2>
          <ul class="recs-list">
            <li v-for="r in recs" :key="r">{{ r }}</li>
          </ul>
        </div>

        <!-- Review Jawaban -->
        <div class="card" style="margin-bottom:1.5rem;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:0.75rem;">
            <h2>🧠 Review Jawaban</h2>
            <label class="toggle-label">
              <input type="checkbox" v-model="wrongOnly" />
              <span>Tampilkan salah saja</span>
            </label>
          </div>

          <div v-for="sec in SECTIONS" :key="sec">
            <div class="review-sec-header">
              <span>{{ ICONS[sec] }} {{ sec.charAt(0).toUpperCase()+sec.slice(1) }}</span>
              <span class="badge badge-primary">{{ secScore(sec) }}/{{ questions[sec]?.length || 0 }}</span>
            </div>

            <div v-for="(q, i) in questions[sec]" :key="i">
              <div v-if="!wrongOnly || answers[`${sec}_${i}`] !== q.correct" class="review-item" :class="answers[`${sec}_${i}`] === q.correct ? 'correct' : 'wrong'">
                <p class="review-q"><strong>Soal {{ i+1 }}.</strong> {{ q.question }}</p>
                <div class="review-opts">
                  <div v-for="(opt, oi) in q.options" :key="oi" class="review-opt"
                    :class="{
                      'opt-correct': oi === q.correct,
                      'opt-wrong': oi === answers[`${sec}_${i}`] && oi !== q.correct
                    }">
                    {{ 'ABCD'[oi] }}. {{ opt }}
                    <span v-if="oi === q.correct" class="opt-mark">✅</span>
                    <span v-else-if="oi === answers[`${sec}_${i}`]" class="opt-mark">❌</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:2rem;">
          <router-link to="/dashboard" class="btn btn-primary" style="flex:1;min-width:200px;">
            🏠 Kembali ke Dashboard
          </router-link>
          <router-link to="/analitik" class="btn btn-secondary" style="flex:1;min-width:200px;">
            📊 Lihat Analitik
          </router-link>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import Navbar from '@/components/Navbar.vue'
import { useTestStore } from '@/stores/test'

const test = useTestStore()
const wrongOnly = ref(false)

const SECTIONS = ['listening', 'structure', 'reading']
const ICONS = { listening: '🎧', structure: '📐', reading: '📖' }

const score = computed(() => test.lastScore)
const questions = computed(() => test.questions)
const answers = computed(() => test.answers)
const total = computed(() => score.value ? score.value.listening + score.value.structure + score.value.reading : 0)
const accuracy = computed(() => score.value ? Math.round((total.value / 45) * 100) : 0)

const grade = computed(() => {
  const a = accuracy.value
  if (a >= 85) return 'A'
  if (a >= 70) return 'B'
  if (a >= 55) return 'C'
  if (a >= 40) return 'D'
  return 'E'
})
const gradeColor = computed(() => {
  const map = { A:'#10d48e', B:'#38bdf8', C:'#fbbf24', D:'#f97316', E:'#f87171' }
  return map[grade.value]
})
const gradeMsg = computed(() => {
  const map = { A:'Luar biasa! Performa sangat baik 🎉', B:'Bagus! Terus tingkatkan 💪', C:'Cukup baik, masih bisa lebih! 📈', D:'Perlu lebih banyak latihan 📚', E:'Jangan menyerah, terus berlatih! 🔥' }
  return map[grade.value]
})
const recs = computed(() => {
  if (!score.value) return []
  const r = []
  if (score.value.listening < 10) r.push('🎧 Listening — Dengarkan BBC Learning English atau VOA setiap hari.')
  if (score.value.structure < 10) r.push('📐 Structure — Fokus grammar: tenses, passive voice, conditional sentences.')
  if (score.value.reading < 10) r.push('📖 Reading — Latih skimming & scanning di artikel berbahasa Inggris.')
  if (!r.length) r.push('🌟 Performa sangat baik! Pertahankan dan terus latihan setiap hari.')
  return r
})

function secScore(sec) {
  return (questions.value[sec] || []).filter((q, i) => answers.value[`${sec}_${i}`] === q.correct).length
}
</script>

<style scoped>
.result-wrap { max-width: 800px; padding-top: 2rem; padding-bottom: 3rem; }
.no-result { display: flex; flex-direction: column; align-items: center; padding: 5rem 0; gap: 1rem; }

.result-hero {
  text-align: center;
  padding: 2.5rem;
  margin-bottom: 0;
}
.grade-ring {
  width: 80px; height: 80px;
  border-radius: 50%;
  border: 3px solid var(--gc, var(--c-primary));
  color: var(--gc, var(--c-primary));
  font-family: var(--font-display);
  font-size: 2.5rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
  box-shadow: 0 0 20px color-mix(in srgb, var(--gc, var(--c-primary)) 30%, transparent);
}
.grade-msg { color: var(--c-text-muted); margin-top: 0.5rem; }

.recs-list { list-style: none; display: flex; flex-direction: column; gap: 0.6rem; }
.recs-list li { padding: 0.75rem 1rem; background: var(--c-surface2); border-radius: var(--radius-sm); font-size: 0.9rem; }

.toggle-label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.9rem; color: var(--c-text-muted); }
.review-sec-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--c-border);
  margin: 1rem 0 0.75rem;
  font-weight: 600;
}
.review-item { margin-bottom: 1rem; padding: 1rem; border-radius: var(--radius-sm); border-left: 3px solid; }
.review-item.correct { background: rgba(16,212,142,0.05); border-color: var(--c-success); }
.review-item.wrong   { background: rgba(248,113,113,0.05); border-color: var(--c-danger); }
.review-q { margin-bottom: 0.75rem; font-size: 0.95rem; line-height: 1.6; }
.review-opts { display: flex; flex-direction: column; gap: 0.35rem; }
.review-opt { font-size: 0.88rem; padding: 0.4rem 0.6rem; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; }
.opt-correct { background: rgba(16,212,142,0.1); color: var(--c-success); }
.opt-wrong   { background: rgba(248,113,113,0.1); color: var(--c-danger); }
</style>
