<template>
  <div class="login-view">
    <div class="login-container">
      <div class="login-form">
        <h1>ICCR Monitoreo Personal</h1>
        <h2>Iniciar Sesión</h2>
        
        <form @submit.prevent="handleLogin">
          <div class="form-group">
            <label for="username">Usuario:</label>
            <select
              id="username"
              v-model="credentials.username"
              required
              :disabled="loading || loadingUsers"
            >
              <option value="" v-if="loadingUsers">Cargando usuarios...</option>
              <option value="" v-else>-- Seleccione un usuario --</option>
              <option 
                v-for="user in availableUsers" 
                :key="user.username" 
                :value="user.username"
              >
                {{ user.username }} ({{ user.role }})
              </option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="password">Contraseña:</label>
            <input
              id="password"
              v-model="credentials.password"
              type="password"
              required
              :disabled="loading"
              placeholder="Ingrese su contraseña"
            >
          </div>

          <div v-if="error" class="error-message">
            {{ error }}
          </div>

          <button type="submit" :disabled="loading || !credentials.username || !credentials.password">
            {{ loading ? 'Iniciando sesión...' : 'Iniciar Sesión' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { getBackendUrl } from '@/utils/networkUtils.js'

export default {
  name: 'LoginView',
  setup() {
    const router = useRouter()
    const { login, loading, isAuthenticated } = useAuth()

    const credentials = ref({
      username: '',
      password: ''
    })
    
    const error = ref('')
    const availableUsers = ref([])
    const loadingUsers = ref(true)

    const loadUsers = async () => {
      try {
        loadingUsers.value = true
        const backendUrl = getBackendUrl()
        const response = await fetch(`${backendUrl}/auth/users`)
        
        if (response.ok) {
          const data = await response.json()
          availableUsers.value = data.users
        } else {
          console.error('Error loading users:', response.statusText)
          error.value = 'Error cargando usuarios disponibles'
        }
      } catch (err) {
        console.error('Error loading users:', err)
        error.value = 'Error conectando con el servidor'
      } finally {
        loadingUsers.value = false
      }
    }

    const handleLogin = async () => {
      error.value = ''
      
      const result = await login(credentials.value.username.trim(), credentials.value.password.trim())
      
      if (result.success) {
        router.push('/')
      } else {
        error.value = result.error
      }
    }

    onMounted(async () => {
      // If already authenticated, redirect to mixer
      if (isAuthenticated.value) {
        router.push('/')
        return
      }
      
      // Load available users
      await loadUsers()
    })

    return {
      credentials,
      error,
      loading,
      loadingUsers,
      availableUsers,
      handleLogin
    }
  }
}
</script>

