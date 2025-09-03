import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from './composables/useAuth'
import MixerView from './views/MixerView.vue'
import LoginView from './views/LoginView.vue'
import AdminView from './views/AdminView.vue'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { requiresGuest: true }
  },
  {
    path: '/',
    name: 'mixer',
    component: MixerView,
    meta: { requiresAuth: true }
  },
  {
    path: '/admin',
    name: 'admin',
    component: AdminView,
    meta: { requiresAuth: true, requiresAdmin: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guards
router.beforeEach(async (to, from, next) => {
  const { checkAuth, isAuthenticated, isAdmin } = useAuth()

  // Check authentication status
  if (!isAuthenticated.value) {
    await checkAuth()
  }

  // Handle routes that require authentication
  if (to.meta.requiresAuth && !isAuthenticated.value) {
    next('/login')
    return
  }

  // Handle routes that require admin privileges
  if (to.meta.requiresAdmin && !isAdmin.value) {
    next('/')
    return
  }

  // Handle routes that require guest (logged out)
  if (to.meta.requiresGuest && isAuthenticated.value) {
    next('/')
    return
  }

  next()
})

export default router