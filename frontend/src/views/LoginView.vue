<template>
  <div class="login-view">
    <div class="login-container">
      <div class="login-form">
        <h1>ICCR Monitoreo Personal</h1>
        <h2>Iniciar Sesión</h2>
        
        <form @submit.prevent="handleLogin">
          <div class="form-group">
            <label for="username">Usuario:</label>
            <input
              id="username"
              v-model="credentials.username"
              type="text"
              required
              :disabled="loading"
              placeholder="Ingrese su usuario"
            >
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

    const handleLogin = async () => {
      error.value = ''
      
      const result = await login(credentials.value.username.trim(), credentials.value.password.trim())
      
      if (result.success) {
        router.push('/')
      } else {
        error.value = result.error
      }
    }

    onMounted(() => {
      // If already authenticated, redirect to mixer
      if (isAuthenticated.value) {
        router.push('/')
      }
    })

    return {
      credentials,
      error,
      loading,
      handleLogin
    }
  }
}
</script>

