import { createRouter, createWebHistory } from 'vue-router'
import LoginPage from '../pages/LoginPage.vue'
import HomePage from '../pages/HomePage.vue'
import SetupPage from '../pages/SetupPage.vue'
import MonitorPage from '../pages/MonitorPage.vue'
import { useAppState } from '../composables/useAppState.js'

const routes = [
  { path: '/login', name: 'Login', component: LoginPage, meta: { public: true } },
  { path: '/', name: 'Home', component: HomePage },
  { path: '/setup', name: 'Setup', component: SetupPage },
  { path: '/monitor', name: 'Monitor', component: MonitorPage },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Global guard: all routes require auth unless meta.public is true
router.beforeEach((to, from, next) => {
  const { isAuthenticated, isRunning } = useAppState()

  // Allow access to public routes (login)
  if (to.meta.public) {
    // If already logged in, redirect to home
    if (isAuthenticated.value && to.name === 'Login') {
      next({ name: 'Home' })
      return
    }
    next()
    return
  }

  // Not authenticated → redirect to login
  if (!isAuthenticated.value) {
    next({ name: 'Login' })
    return
  }

  // Guard: redirect /monitor → / if system not running
  if (to.name === 'Monitor' && !isRunning.value) {
    next({ name: 'Home' })
    return
  }

  next()
})

export default router
