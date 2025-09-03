import { ref, computed } from 'vue'
import axios from 'axios'
import { getBackendUrl } from '@/utils/networkUtils.js'

const user = ref(null)
const auxiliaries = ref([])
const loading = ref(false)

// Configure axios defaults
const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || getBackendUrl(),
  withCredentials: true
})

export function useAuth() {
  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  const login = async (username, password) => {
    loading.value = true
    try {
      const response = await api.post('/auth/login', {
        username,
        password
      })

      if (response.data.success) {
        user.value = response.data.user
        await getUserInfo() // Get auxiliaries
        return { success: true }
      } else {
        return { success: false, error: 'Login failed' }
      }
    } catch (error) {
      console.error('Login error:', error)
      return { 
        success: false, 
        error: error.response?.data?.error || 'Error de conexión'
      }
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      user.value = null
      auxiliaries.value = []
    }
  }

  const getUserInfo = async () => {
    try {
      const response = await api.get('/auth/me')
      user.value = response.data.user
      auxiliaries.value = response.data.auxiliaries
      return response.data
    } catch (error) {
      // Only log error if it's not a normal 401 (unauthorized)
      if (error.response?.status !== 401) {
        console.error('Error getting user info:', error)
      }
      
      // If unauthorized, clear user data (this is expected when not logged in)
      if (error.response?.status === 401) {
        user.value = null
        auxiliaries.value = []
      }
      throw error
    }
  }

  const checkAuth = async () => {
    // If we already have user data, verify it's still valid
    if (user.value) {
      try {
        // Make a quick request to verify the session is still valid
        await api.get('/auth/me')
        return true
      } catch (error) {
        // If session is invalid, clear user data (don't log 401 as it's expected)
        if (error.response?.status === 401) {
          user.value = null
          auxiliaries.value = []
        }
      }
    }
    
    try {
      await getUserInfo()
      return true
    } catch (error) {
      // 401 errors are expected when not authenticated, so we don't need to log them
      return false
    }
  }

  // Admin functions
  const getUsers = async () => {
    try {
      // First check if we have a valid user session
      if (!user.value) {
        await getUserInfo()
      }
      
      const response = await api.get('/admin/users')
      return response.data.users
    } catch (error) {
      console.error('Error getting users:', error)
      
      // If unauthorized, clear user data
      if (error.response?.status === 401) {
        user.value = null
        auxiliaries.value = []
      }
      
      throw error
    }
  }

  const createUser = async (userData) => {
    try {
      const response = await api.post('/admin/users', userData)
      return response.data
    } catch (error) {
      console.error('Error creating user:', error)
      throw error
    }
  }

  const updateUser = async (id, userData) => {
    try {
      const response = await api.put(`/admin/users/${id}`, userData)
      return response.data
    } catch (error) {
      console.error('Error updating user:', error)
      throw error
    }
  }

  const deleteUser = async (id) => {
    try {
      const response = await api.delete(`/admin/users/${id}`)
      return response.data
    } catch (error) {
      console.error('Error deleting user:', error)
      throw error
    }
  }

  const changeUserPassword = async (id, password) => {
    try {
      const response = await api.post(`/admin/users/${id}/password`, { password })
      return response.data
    } catch (error) {
      console.error('Error changing password:', error)
      throw error
    }
  }

  return {
    // State
    user: computed(() => user.value),
    auxiliaries: computed(() => auxiliaries.value),
    loading: computed(() => loading.value),
    isAuthenticated,
    isAdmin,

    // Methods
    login,
    logout,
    getUserInfo,
    checkAuth,

    // Admin methods
    getUsers,
    createUser,
    updateUser,
    deleteUser,
    changeUserPassword,

    // API instance for other requests
    api
  }
}