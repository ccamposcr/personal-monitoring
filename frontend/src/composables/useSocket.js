import { ref, onUnmounted } from 'vue'
import io from 'socket.io-client'
import { getBackendUrl } from '../utils/networkUtils.js'

const socket = ref(null)
const connected = ref(false)

export function useSocket() {
  const connect = () => {
    if (!socket.value) {
      socket.value = io(import.meta.env.VITE_BACKEND_URL || getBackendUrl())
      
      socket.value.on('connect', () => {
        connected.value = true
        console.log('Conectado al servidor')
      })
      
      socket.value.on('disconnect', () => {
        connected.value = false
        console.log('Desconectado del servidor')
      })
    }
  }

  const disconnect = () => {
    if (socket.value) {
      socket.value.disconnect()
      socket.value = null
      connected.value = false
    }
  }

  onUnmounted(() => {
    disconnect()
  })

  return {
    socket,
    connected,
    connect,
    disconnect
  }
}