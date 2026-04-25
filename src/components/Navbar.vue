<template>
  <nav class="navbar">
    <div class="container navbar-inner">
      <!-- Brand -->
      <router-link to="/" class="navbar-brand">
        <span class="brand-icon">🎓</span>
        <span class="brand-text">EPT Pro</span>
      </router-link>

      <!-- Desktop links -->
      <div class="navbar-links" v-if="!hideLinks">
        <router-link v-if="!isAdmin" to="/dashboard"  class="nav-link">Dashboard</router-link>
        <router-link v-if="!isAdmin" to="/analitik"   class="nav-link">Analitik</router-link>
        <router-link v-if="!isAdmin" to="/leaderboard" class="nav-link">Leaderboard</router-link>
        <router-link v-if="!isAdmin" to="/materi"     class="nav-link">Materi</router-link>
        <router-link v-if="!isAdmin" to="/review"     class="nav-link">Review</router-link>
        <router-link v-if="isAdmin"  to="/admin"      class="nav-link">Admin</router-link>
        <router-link v-if="isAdmin"  to="/admin/pool" class="nav-link">Pool Soal</router-link>
      </div>

      <!-- Desktop right section -->
      <div class="navbar-right" v-if="!hideLinks">
        <router-link v-if="!isAdmin" to="/profil" class="user-info" title="Profil Saya">
          <div class="user-avatar">{{ initial }}</div>
          <span class="user-name">{{ user?.name }}</span>
          <span class="badge" :class="isAdmin ? 'badge-warning' : 'badge-primary'">
            {{ isAdmin ? 'Admin' : 'User' }}
          </span>
        </router-link>
        <div v-else class="user-info">
          <div class="user-avatar">{{ initial }}</div>
          <span class="user-name">{{ user?.name }}</span>
          <span class="badge badge-warning">Admin</span>
        </div>
        <button class="btn btn-secondary logout-btn" @click="auth.logout()">
          Keluar
        </button>
      </div>

      <!-- Mobile: hamburger button -->
      <button
        v-if="!hideLinks"
        class="hamburger-btn"
        @click="menuOpen = !menuOpen"
        :aria-expanded="menuOpen"
        aria-label="Toggle navigasi"
      >
        <span class="ham-line" :class="{ open: menuOpen }"></span>
        <span class="ham-line" :class="{ open: menuOpen }"></span>
        <span class="ham-line" :class="{ open: menuOpen }"></span>
      </button>
    </div>

    <!-- Mobile dropdown menu -->
    <transition name="menu-drop">
      <div v-if="menuOpen && !hideLinks" class="mobile-menu">
        <template v-if="!isAdmin">
          <router-link to="/dashboard"   class="mob-link" @click="menuOpen = false">🏠 Dashboard</router-link>
          <router-link to="/analitik"    class="mob-link" @click="menuOpen = false">📊 Analitik</router-link>
          <router-link to="/leaderboard" class="mob-link" @click="menuOpen = false">🏆 Leaderboard</router-link>
          <router-link to="/materi"      class="mob-link" @click="menuOpen = false">📚 Materi</router-link>
          <router-link to="/review"      class="mob-link" @click="menuOpen = false">🔁 Review Soal</router-link>
          <router-link to="/profil"      class="mob-link" @click="menuOpen = false">👤 Profil Saya</router-link>
        </template>
        <template v-else>
          <router-link to="/admin"      class="mob-link" @click="menuOpen = false">⚙️ Admin</router-link>
          <router-link to="/admin/pool" class="mob-link" @click="menuOpen = false">📋 Pool Soal</router-link>
        </template>
        <div class="mob-divider"></div>
        <div class="mob-user-info">
          <div class="user-avatar">{{ initial }}</div>
          <div>
            <div style="font-weight:600;font-size:0.9rem;">{{ user?.name }}</div>
            <div style="font-size:0.78rem;color:var(--c-text-muted);">@{{ user?.username }}</div>
          </div>
        </div>
        <button class="btn btn-secondary btn-full" style="margin-top:0.75rem;" @click="auth.logout()">
          Keluar
        </button>
      </div>
    </transition>
  </nav>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

defineProps({ hideLinks: Boolean })

const auth     = useAuthStore()
const menuOpen = ref(false)
const user     = computed(() => auth.user)
const isAdmin  = computed(() => auth.isAdmin)
const initial  = computed(() => user.value?.name?.[0]?.toUpperCase() || '?')
</script>

<style scoped>
/* ── Navbar ────────────────────────────────────────────────── */
.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(15,15,19,0.88);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--c-border);
}
[data-theme="light"] .navbar {
  background: rgba(255,255,255,0.88);
}

.navbar-inner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-top: 0.75rem;
  padding-bottom: 0.75rem;
}

/* Brand */
.navbar-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  flex-shrink: 0;
}
.brand-icon { font-size: 1.4rem; }
.brand-text {
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--c-text);
}

/* Desktop nav links */
.navbar-links {
  display: flex;
  gap: 0.15rem;
  flex: 1;
  margin-left: 1.25rem;
  overflow-x: auto;
}
.nav-link {
  padding: 0.4rem 0.75rem;
  border-radius: var(--radius-sm);
  text-decoration: none;
  color: var(--c-text-muted);
  font-size: 0.88rem;
  font-weight: 500;
  transition: all 0.2s;
  white-space: nowrap;
}
.nav-link:hover        { color: var(--c-text); background: rgba(255,255,255,0.05); }
.nav-link.router-link-active { color: var(--c-primary-light); background: rgba(108,99,255,0.1); }

/* Desktop right */
.navbar-right { display: flex; align-items: center; gap: 0.75rem; margin-left: auto; flex-shrink: 0; }
.user-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  color: var(--c-text);
  cursor: pointer;
}
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
  flex-shrink: 0;
}
.user-name { font-size: 0.88rem; font-weight: 500; }
.logout-btn { padding: 0.45rem 0.85rem; font-size: 0.82rem; }

/* ── Hamburger ─────────────────────────────────────────────── */
.hamburger-btn {
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  width: 38px;
  height: 38px;
  padding: 6px;
  background: var(--c-surface2);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  margin-left: auto;
}
.ham-line {
  display: block;
  height: 2px;
  background: var(--c-text);
  border-radius: 2px;
  transition: all 0.25s;
}
.ham-line.open:nth-child(1) { transform: translateY(6px) rotate(45deg); }
.ham-line.open:nth-child(2) { opacity: 0; }
.ham-line.open:nth-child(3) { transform: translateY(-6px) rotate(-45deg); }

/* ── Mobile menu ───────────────────────────────────────────── */
.mobile-menu {
  padding: 0.75rem 1.25rem 1.25rem;
  border-top: 1px solid var(--c-border);
  background: var(--c-surface);
}
[data-theme="light"] .mobile-menu { background: #fff; }

.mob-link {
  display: block;
  padding: 0.65rem 0.75rem;
  border-radius: var(--radius-sm);
  text-decoration: none;
  color: var(--c-text-muted);
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.15s;
}
.mob-link:hover { background: var(--c-surface2); color: var(--c-text); }
.mob-link.router-link-active { color: var(--c-primary-light); background: rgba(108,99,255,0.08); }

.mob-divider { height: 1px; background: var(--c-border); margin: 0.75rem 0; }
.mob-user-info { display: flex; align-items: center; gap: 0.75rem; padding: 0.25rem 0.5rem; }

/* Animasi dropdown */
.menu-drop-enter-active { transition: all 0.22s ease; }
.menu-drop-leave-active { transition: all 0.18s ease; }
.menu-drop-enter-from, .menu-drop-leave-to { opacity: 0; transform: translateY(-8px); }

/* ── Responsive ─────────────────────────────────────────────── */
@media (max-width: 768px) {
  .navbar-links  { display: none; }
  .navbar-right  { display: none; }
  .hamburger-btn { display: flex; }
  .brand-text    { font-size: 1rem; }
}
</style>
