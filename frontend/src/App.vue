<template>
  <div id="app">
    <header class="app-header">
      <h1>ICCR Monitoreo Personal</h1>
      <div class="connection-status" :class="{ connected: socketConnected }">
        {{ socketConnected ? 'Conectado' : 'Desconectado' }}
      </div>
    </header>
    <router-view />
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'
import { useSocket } from './composables/useSocket'

export default {
  name: 'App',
  setup() {
    const socketConnected = ref(false)
    const { socket, connect, disconnect } = useSocket()

    onMounted(() => {
      connect()
      
      socket.value.on('connect', () => {
        socketConnected.value = true
      })
      
      socket.value.on('disconnect', () => {
        socketConnected.value = false
      })
    })

    onUnmounted(() => {
      disconnect()
    })

    return {
      socketConnected
    }
  }
}
</script>