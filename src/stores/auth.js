import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/services/api'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const loading = ref(false)
  const error = ref('')

  const isLoggedIn = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  function init() {
    const stored = localStorage.getItem('ept_user')
    if (stored) user.value = JSON.parse(stored)
  }

  async function login(username, password) {
    loading.value = true
    error.value = ''
    try {
      const res = await authApi.login(username, password)
      user.value = res.data.user
      localStorage.setItem('ept_user', JSON.stringify(res.data.user))
      router.push(user.value.role === 'admin' ? '/admin' : '/dashboard')
    } catch (e) {
      error.value = e.response?.data?.message || 'Username atau password salah.'
    } finally {
      loading.value = false
    }
  }

  function logout() {
    user.value = null
    localStorage.removeItem('ept_user')
    localStorage.removeItem('ept_test_state')
    router.push('/login')
  }

  return { user, loading, error, isLoggedIn, isAdmin, init, login, logout }
})
