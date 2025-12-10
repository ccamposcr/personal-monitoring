import { ref } from 'vue'
import io from 'socket.io-client'
import { getBackendUrl } from '../utils/networkUtils.js'

const socket = ref(null)
const connected = ref(false)

export function useSocket() {
  const connect = (user = null) => {
    if (!socket.value && user) {
      const token = localStorage.getItem('auth_token');
      socket.value = io(import.meta.env.VITE_BACKEND_URL || getBackendUrl(), {
        auth: {
          token: token
        }
      })
      
      socket.value.on('connect', () => {
        connected.value = true
        console.log('Conectado al servidor')
      })
      
      socket.value.on('disconnect', () => {
        connected.value = false
        console.log('Desconectado del servidor')
      })

      socket.value.on('connect_error', (error) => {
        console.error('Error de conexión Socket.IO:', error.message)
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

  // Don't auto-disconnect on unmount since this is a global socket
  // Components should manually call disconnect when appropriate

  return {
    socket,
    connected,
    connect,
    disconnect
  }
}