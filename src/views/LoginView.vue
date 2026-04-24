<template>
  <div class="login-page">
    <div class="login-bg">
      <div class="bg-orb orb1"></div>
      <div class="bg-orb orb2"></div>
    </div>

    <div class="login-card card-glass">
      <div class="login-header">
        <div class="login-icon">🎓</div>
        <h1 class="login-title">EPT Pro</h1>
        <p class="login-sub">English Proficiency Training System</p>
      </div>

      <transition name="fade">
        <div class="alert alert-danger" v-if="auth.error">{{ auth.error }}</div>
      </transition>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label class="form-label">Username</label>
          <input
            v-model="username"
            class="form-input"
            type="text"
            placeholder="Masukkan username..."
            required
            autocomplete="username"
          />
        </div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <div class="input-wrap">
            <input
              v-model="password"
              class="form-input"
              :type="showPass ? 'text' : 'password'"
              placeholder="••••••••"
              required
              autocomplete="current-password"
            />
            <button type="button" class="eye-btn" @click="showPass = !showPass">
              {{ showPass ? '🙈' : '👁️' }}
            </button>
          </div>
        </div>
        <button class="btn btn-primary btn-full" type="submit" :disabled="auth.loading">
          <span v-if="auth.loading" class="spinner" style="width:16px;height:16px;border-width:2px;"></span>
          <span v-else>🚀 Masuk Sekarang</span>
        </button>
      </form>

      <p class="login-footer">EPT Pro System &copy; {{ new Date().getFullYear() }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const username = ref('')
const password = ref('')
const showPass = ref(false)

async function handleLogin() {
  await auth.login(username.value, password.value)
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  position: relative;
  overflow: hidden;
}
.login-bg { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
.bg-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.15;
}
.orb1 { width: 400px; height: 400px; background: var(--c-primary); top: -100px; right: -100px; animation: drift 8s ease-in-out infinite alternate; }
.orb2 { width: 300px; height: 300px; background: var(--c-accent); bottom: -80px; left: -80px; animation: drift 10s ease-in-out infinite alternate-reverse; }
@keyframes drift { to { transform: translate(40px, 30px); } }

.login-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
  padding: 2.5rem;
}
.login-header { text-align: center; margin-bottom: 2rem; }
.login-icon { font-size: 3rem; display: block; margin-bottom: 0.75rem; }
.login-title { font-size: 1.8rem; margin-bottom: 0.35rem; }
.login-sub { color: var(--c-text-muted); font-size: 0.9rem; }
.login-form { display: flex; flex-direction: column; gap: 0; }
.input-wrap { position: relative; }
.eye-btn {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.25rem;
}
.login-footer { text-align: center; margin-top: 1.5rem; font-size: 0.8rem; color: var(--c-text-dim); }
</style>
