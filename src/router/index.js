import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/login', component: () => import('@/views/LoginView.vue'), meta: { guest: true } },
  {
    path: '/dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { requiresAuth: true, role: 'user' }
  },
  {
    path: '/test',
    component: () => import('@/views/TestView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/result',
    component: () => import('@/views/ResultView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/analitik',
    component: () => import('@/views/AnalitikView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/leaderboard',
    component: () => import('@/views/LeaderboardView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/materi',
    component: () => import('@/views/MateriView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/admin',
    component: () => import('@/views/AdminView.vue'),
    meta: { requiresAuth: true, role: 'admin' }
  },
  {
    path: '/admin/pool',
    component: () => import('@/views/PoolSoalView.vue'),
    meta: { requiresAuth: true, role: 'admin' }
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

router.beforeEach((to, _from, next) => {
  // Auth store belum reactive saat ini, pakai localStorage langsung
  const loggedIn = !!localStorage.getItem('ept_user')
  const user = loggedIn ? JSON.parse(localStorage.getItem('ept_user')) : null
  const role = user?.role || 'user'

  if (to.meta.requiresAuth && !loggedIn) return next('/login')
  if (to.meta.guest && loggedIn) {
    return next(role === 'admin' ? '/admin' : '/dashboard')
  }
  if (to.meta.role === 'admin' && role !== 'admin') return next('/dashboard')
  if (to.meta.role === 'user' && role === 'admin') return next('/admin')
  next()
})

export default router
