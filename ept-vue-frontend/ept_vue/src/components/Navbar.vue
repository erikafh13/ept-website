<template>
  <nav class="navbar">
    <div class="container navbar-inner">
      <router-link to="/" class="navbar-brand">
        <span class="brand-icon">🎓</span>
        <span class="brand-text">EPT Pro</span>
      </router-link>

      <div class="navbar-links" v-if="!hideLinks">
        <router-link v-if="!isAdmin" to="/dashboard" class="nav-link">Dashboard</router-link>
        <router-link v-if="!isAdmin" to="/analitik" class="nav-link">Analitik</router-link>
        <router-link v-if="!isAdmin" to="/leaderboard" class="nav-link">Leaderboard</router-link>
        <router-link v-if="!isAdmin" to="/materi" class="nav-link">Materi</router-link>
        <router-link v-if="isAdmin" to="/admin" class="nav-link">Admin</router-link>
        <router-link v-if="isAdmin" to="/admin/pool" class="nav-link">Pool Soal</router-link>
      </div>

      <div class="navbar-right">
        <div class="user-info" v-if="user">
          <div class="user-avatar">{{ initial }}</div>
          <span class="user-name">{{ user.name }}</span>
          <span class="badge" :class="isAdmin ? 'badge-warning' : 'badge-primary'">
            {{ isAdmin ? 'Admin' : 'User' }}
          </span>
        </div>
        <button class="btn btn-secondary" @click="auth.logout()" style="padding: 0.5rem 1rem; font-size: 0.85rem;">
          Keluar
        </button>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const props = defineProps({ hideLinks: Boolean })
const auth = useAuthStore()
const user = computed(() => auth.user)
const isAdmin = computed(() => auth.isAdmin)
const initial = computed(() => user.value?.name?.[0]?.toUpperCase() || '?')
</script>

<style scoped>
.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(15,15,19,0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--c-border);
}
.navbar-inner {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding-top: 0.85rem;
  padding-bottom: 0.85rem;
}
.navbar-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
}
.brand-icon { font-size: 1.4rem; }
.brand-text { font-family: var(--font-display); font-size: 1.1rem; font-weight: 700; color: var(--c-text); }
.navbar-links {
  display: flex;
  gap: 0.25rem;
  flex: 1;
  margin-left: 1.5rem;
}
.nav-link {
  padding: 0.4rem 0.85rem;
  border-radius: var(--radius-sm);
  text-decoration: none;
  color: var(--c-text-muted);
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s;
}
.nav-link:hover { color: var(--c-text); background: rgba(255,255,255,0.05); }
.nav-link.router-link-active { color: var(--c-primary-light); background: rgba(108,99,255,0.1); }
.navbar-right { display: flex; align-items: center; gap: 0.75rem; margin-left: auto; }
.user-info { display: flex; align-items: center; gap: 0.5rem; }
.user-avatar {
  width: 30px; height: 30px;
  background: var(--c-primary-glow);
  border: 1px solid var(--c-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--c-primary-light);
}
.user-name { font-size: 0.9rem; font-weight: 500; color: var(--c-text); }
@media (max-width: 768px) {
  .navbar-links { display: none; }
  .user-name { display: none; }
}
</style>
