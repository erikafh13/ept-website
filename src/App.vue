<template>
  <router-view v-slot="{ Component }">
    <transition name="fade" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

onMounted(() => {
  // Inisialisasi auth dari localStorage
  auth.init()

  // Terapkan tema yang tersimpan (dark/light mode)
  const savedTheme = localStorage.getItem('ept_theme') || 'dark'
  document.documentElement.setAttribute('data-theme', savedTheme)
})
</script>
