<template>
  <div id="app">
    <header class="app-header" v-if="isAuthenticated">
      <div class="header-left">
        <h1>ICCR Monitoreo Personal</h1>
        <div class="connection-status" :class="{ connected: socketConnected }">
          {{ socketConnected ? 'Conectado' : 'Desconectado' }}
        </div>
      </div>
      
      <div class="header-right">
        <div class="user-info">
          <span class="username">{{ user?.username }}</span>
          <span class="user-role" :class="user?.role">
            ({{ user?.role === 'admin' ? 'Admin' : 'Usuario' }})
          </span>
        </div>
        
        <nav class="nav-menu">
          <router-link to="/" class="nav-link">Mixer</router-link>
          <router-link v-if="isAdmin" to="/admin" class="nav-link admin-link">
            Admin
          </router-link>
          <button @click="logout" class="logout-btn">Salir</button>
        </nav>
      </div>
    </header>
    <router-view />
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSocket } from './composables/useSocket'
import { useAuth } from './composables/useAuth'

export default {
  name: 'App',
  setup() {
    const router = useRouter()
    const socketConnected = ref(false)
    const { socket, connect, disconnect } = useSocket()
    const { user, isAuthenticated, isAdmin, logout: authLogout } = useAuth()

    const logout = async () => {
      await authLogout()
      router.push('/login')
    }

    onMounted(() => {
      // Only connect socket if authenticated
      if (isAuthenticated.value && user.value) {
        connect(user.value)
        
        if (socket.value) {
          socket.value.on('connect', () => {
            socketConnected.value = true
          })
          
          socket.value.on('disconnect', () => {
            socketConnected.value = false
          })
        }
      }
    })

    onUnmounted(() => {
      disconnect()
    })

    return {
      socketConnected,
      user,
      isAuthenticated,
      isAdmin,
      logout
    }
  }
}
</script>

<style>
#app {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  min-height: 100vh;
  background-color: #f5f7fa;
}

.app-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem 2rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.app-header h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.connection-status {
  background: rgba(255, 255, 255, 0.2);
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.connection-status.connected {
  background: rgba(46, 204, 113, 0.3);
  color: #2ecc71;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.user-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.2rem;
}

.username {
  font-weight: 600;
  font-size: 1rem;
}

.user-role {
  font-size: 0.8rem;
  opacity: 0.8;
}

.user-role.admin {
  color: #f39c12;
  font-weight: 600;
}

.nav-menu {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.nav-link {
  color: white;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 5px;
  transition: background-color 0.3s;
  font-weight: 500;
}

.nav-link:hover,
.nav-link.router-link-active {
  background: rgba(255, 255, 255, 0.2);
}

.admin-link {
  background: rgba(243, 156, 18, 0.3);
  border: 1px solid rgba(243, 156, 18, 0.5);
}

.admin-link:hover,
.admin-link.router-link-active {
  background: rgba(243, 156, 18, 0.5);
}

.logout-btn {
  background: rgba(231, 76, 60, 0.8);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.3s;
}

.logout-btn:hover {
  background: rgba(231, 76, 60, 1);
}

* {
  box-sizing: border-box;
}

/* Responsive design */
@media (max-width: 768px) {
  .app-header {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }
  
  .header-left,
  .header-right {
    width: 100%;
  }
  
  .header-right {
    justify-content: space-between;
  }
  
  .user-info {
    align-items: flex-start;
  }
  
  .nav-menu {
    gap: 0.5rem;
  }
  
  .nav-link,
  .logout-btn {
    padding: 0.4rem 0.8rem;
    font-size: 0.9rem;
  }
}
</style>