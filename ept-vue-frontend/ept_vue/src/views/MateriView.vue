<template>
  <div class="page">
    <Navbar />
    <div class="container" style="padding-top:2rem;padding-bottom:3rem;">
      <h1 style="margin-bottom:0.25rem;">📚 Materi Belajar</h1>
      <p style="color:var(--c-text-muted);margin-bottom:2rem;">Ringkasan materi untuk persiapan EPT</p>

      <div class="tabs" style="margin-bottom:1.5rem;">
        <button v-for="t in tabs" :key="t.key" class="tab-btn" :class="{active: activeTab===t.key}" @click="activeTab=t.key">
          {{ t.label }}
        </button>
      </div>

      <!-- LISTENING -->
      <div v-if="activeTab==='listening'">
        <div class="card" style="margin-bottom:1.25rem;">
          <h2 style="margin-bottom:1rem;">🎧 Tips Listening</h2>
          <ul class="tips-list">
            <li>Dengarkan dengan fokus pada kata kunci (subject, verb, object).</li>
            <li>Jangan panik jika ada kata yang tidak dimengerti — fokus pada konteks.</li>
            <li>Perhatikan intonasi untuk membedakan pernyataan, pertanyaan, dan negasi.</li>
            <li>Latih dengan BBC Learning English, VOA Learning English, atau podcast Bahasa Inggris setiap hari.</li>
          </ul>
        </div>
        <div class="grid-2">
          <div class="card topic-card">
            <div class="topic-icon">🗣️</div>
            <h3>Short Conversations</h3>
            <p>Percakapan singkat 2 orang. Fokus pada: siapa, apa, di mana, kapan.</p>
          </div>
          <div class="card topic-card">
            <div class="topic-icon">📢</div>
            <h3>Long Talks & Lectures</h3>
            <p>Monolog panjang. Catat poin utama dan kesimpulan pembicara.</p>
          </div>
        </div>
      </div>

      <!-- STRUCTURE -->
      <div v-if="activeTab==='structure'">
        <div class="card" style="margin-bottom:1.25rem;">
          <h2 style="margin-bottom:1rem;">📐 Materi Grammar Utama</h2>
          <div class="grammar-grid">
            <div v-for="g in grammarTopics" :key="g.title" class="grammar-item">
              <div class="grammar-title">{{ g.title }}</div>
              <div class="grammar-desc">{{ g.desc }}</div>
              <div class="grammar-ex"><em>{{ g.example }}</em></div>
            </div>
          </div>
        </div>
      </div>

      <!-- READING -->
      <div v-if="activeTab==='reading'">
        <div class="card" style="margin-bottom:1.25rem;">
          <h2 style="margin-bottom:1rem;">📖 Strategi Reading</h2>
          <div class="strategy-list">
            <div v-for="s in strategies" :key="s.name" class="strategy-item">
              <div class="strategy-icon">{{ s.icon }}</div>
              <div>
                <div class="strategy-name">{{ s.name }}</div>
                <div class="strategy-desc">{{ s.desc }}</div>
              </div>
            </div>
          </div>
        </div>
        <div class="card">
          <h2 style="margin-bottom:1rem;">🔑 Jenis Soal Reading</h2>
          <ul class="tips-list">
            <li><strong>Main Idea</strong> — Apa topik utama paragraf/teks?</li>
            <li><strong>Detail/Fact</strong> — Informasi spesifik yang disebutkan di teks.</li>
            <li><strong>Inference</strong> — Apa yang bisa disimpulkan dari teks?</li>
            <li><strong>Vocabulary in Context</strong> — Arti kata berdasarkan konteks kalimat.</li>
            <li><strong>Author's Purpose</strong> — Mengapa penulis menulis teks ini?</li>
          </ul>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import Navbar from '@/components/Navbar.vue'

const activeTab = ref('listening')
const tabs = [
  { key: 'listening', label: '🎧 Listening' },
  { key: 'structure', label: '📐 Structure' },
  { key: 'reading',   label: '📖 Reading' },
]

const grammarTopics = [
  { title: 'Subject-Verb Agreement', desc: 'Subjek dan kata kerja harus sesuai (singular/plural).', example: 'The students are studying. / She is studying.' },
  { title: 'Tenses (16 Tenses)', desc: 'Kenali pola dan penggunaan setiap tense.', example: 'He has been working here for 5 years.' },
  { title: 'Passive Voice', desc: 'Subject menerima aksi. Rumus: to be + past participle.', example: 'The report was written by her.' },
  { title: 'Conditional Sentences', desc: 'Kalimat pengandaian (Type 0, 1, 2, 3).', example: 'If I had studied, I would have passed.' },
  { title: 'Relative Clauses', desc: 'Klausa yang menjelaskan kata benda (who, which, that).', example: 'The man who called you is my uncle.' },
  { title: 'Gerund vs Infinitive', desc: 'Kapan pakai -ing dan kapan pakai to + verb.', example: 'I enjoy reading. / I want to read.' },
]

const strategies = [
  { icon: '⚡', name: 'Skimming', desc: 'Baca cepat untuk mendapat gambaran umum teks. Fokus pada judul, kalimat pertama & terakhir tiap paragraf.' },
  { icon: '🔍', name: 'Scanning', desc: 'Cari informasi spesifik (angka, nama, tanggal) tanpa membaca seluruh teks.' },
  { icon: '🧩', name: 'Intensive Reading', desc: 'Baca detail untuk memahami makna mendalam. Gunakan untuk soal inference dan vocabulary.' },
  { icon: '⏱️', name: 'Time Management', desc: 'Alokasikan waktu ~2 menit per soal reading. Jangan terpaku pada soal yang sulit.' },
]
</script>

<style scoped>
.tabs { display: flex; gap: 0.5rem; flex-wrap: wrap; }
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
.tips-list { list-style: none; display: flex; flex-direction: column; gap: 0.65rem; }
.tips-list li { padding: 0.7rem 1rem; background: var(--c-surface2); border-radius: var(--radius-sm); font-size: 0.92rem; border-left: 3px solid var(--c-primary); }
.topic-card { text-align: center; padding: 2rem 1.5rem; }
.topic-icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
.topic-card h3 { margin-bottom: 0.5rem; }
.topic-card p { color: var(--c-text-muted); font-size: 0.9rem; }
.grammar-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px,1fr)); gap: 1rem; }
.grammar-item { background: var(--c-surface2); border: 1px solid var(--c-border); border-radius: var(--radius-sm); padding: 1rem; }
.grammar-title { font-weight: 700; margin-bottom: 0.3rem; color: var(--c-primary-light); }
.grammar-desc { font-size: 0.88rem; color: var(--c-text-muted); margin-bottom: 0.4rem; }
.grammar-ex { font-size: 0.85rem; color: var(--c-text); background: rgba(108,99,255,0.08); padding: 0.4rem 0.6rem; border-radius: 4px; }
.strategy-list { display: flex; flex-direction: column; gap: 1rem; }
.strategy-item { display: flex; align-items: flex-start; gap: 1rem; padding: 1rem; background: var(--c-surface2); border-radius: var(--radius-sm); }
.strategy-icon { font-size: 1.8rem; flex-shrink: 0; }
.strategy-name { font-weight: 600; margin-bottom: 0.25rem; }
.strategy-desc { font-size: 0.9rem; color: var(--c-text-muted); }
</style>
