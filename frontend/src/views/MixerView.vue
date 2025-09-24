<template>
  <div class="mixer-view">
    <div class="auxiliary-selector">
      <label for="aux-select">Seleccionar Auxiliar:</label>
      <select 
        id="aux-select" 
        v-model="selectedAux" 
        @change="joinAuxiliary"
        :disabled="!connected"
      >
        <option value="">-- Selecciona un auxiliar --</option>
        <option 
          v-for="aux in auxiliaries" 
          :key="aux.id" 
          :value="aux.id"
        >
          {{ aux.name }} {{ aux.userCount > 0 ? `(${aux.userCount} usuarios)` : '' }}
        </option>
      </select>
      
      <div v-if="currentAuxData && connectedUsers > 0" class="user-indicator">
        <span class="user-count">{{ connectedUsers }} usuario{{ connectedUsers > 1 ? 's' : '' }} conectado{{ connectedUsers > 1 ? 's' : '' }}</span>
      </div>
    </div>

    <div v-if="loading" class="loading">
      Cargando datos del auxiliar...
    </div>

    <div v-if="error" class="error">
      {{ error }}
    </div>

    <div v-if="currentAuxData && !loading" class="mixer-channels">
      <h2>{{ currentAuxData.name }}</h2>
      <div class="channels-grid">
        <ChannelStrip 
          v-for="channel in currentAuxData.channels"
          :key="channel.number"
          :channel="channel"
          :aux-number="currentAuxData.auxNumber"
          @level-change="handleLevelChange"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'
import { useSocket } from '@/composables/useSocket'
import { useAuth } from '@/composables/useAuth'
import ChannelStrip from '@/components/ChannelStrip.vue'

export default {
  name: 'MixerView',
  components: {
    ChannelStrip
  },
  setup() {
    const { socket, connect, connected } = useSocket()
    const { user, api } = useAuth()
    const selectedAux = ref('')
    const currentAuxData = ref(null)
    const auxiliaries = ref([])
    const loading = ref(false)
    const error = ref('')
    const connectedUsers = ref(0)
    let muteStatusInterval = null

    const loadAuxiliaries = async () => {
      try {
        console.log(`Cargando auxiliares para usuario: ${user.value?.username}`)
        
        const response = await api.get('/auxiliaries')
        console.log('Datos recibidos:', response.data)
        
        // Filter only allowed auxiliaries (already filtered by backend for regular users)
        auxiliaries.value = response.data.auxiliaries.filter(aux => aux.allowed !== false)
        console.log('Auxiliares permitidos:', auxiliaries.value)
      } catch (err) {
        console.error('Error cargando auxiliares:', err)
        if (err.response?.status === 401) {
          error.value = 'Sesión expirada. Por favor, inicia sesión nuevamente.'
        } else {
          error.value = `Error cargando auxiliares: ${err.response?.data?.error || err.message}`
        }
      }
    }

    const joinAuxiliary = () => {
      if (selectedAux.value && socket) {
        loading.value = true
        error.value = ''
        socket.value.emit('join-auxiliary', parseInt(selectedAux.value))
      }
    }

    const handleLevelChange = (channelNumber, level) => {
      if (socket && currentAuxData.value) {
        // Actualización visual instantánea para eliminar el delay percibido
        const channel = currentAuxData.value.channels.find(
          ch => ch.number === channelNumber
        )
        if (channel) {
          channel.level = level
        }
        
        // Enviar al backend de forma asíncrona
        socket.value.emit('update-channel-level', {
          auxNumber: currentAuxData.value.auxNumber,
          channelNumber,
          level
        })
      }
    }

    const requestMainLRMuteStatus = () => {
      if (socket && socket.value) {
        console.log('🔊 Solicitando estado Main LR mute desde frontend...')
        socket.value.emit('request-main-lr-mute-status')
        console.log('✅ Solicitud enviada al backend')
      } else {
        console.log('❌ Socket no disponible para solicitar estado mute')
      }
    }


    onMounted(() => {
      if (user.value) {
        connect(user.value)
      }
      loadAuxiliaries()

      if (socket.value) {
        socket.value.on('connect', () => {
          loadAuxiliaries()
          // Request initial mute status
          setTimeout(() => {
            requestMainLRMuteStatus()
          }, 2000)
          
          // Set up periodic mute status updates every 30 seconds
          muteStatusInterval = setInterval(() => {
            requestMainLRMuteStatus()
          }, 30000) // 30 seconds
        })

        socket.value.on('disconnect', () => {
          currentAuxData.value = null
          connectedUsers.value = 0
          // Clear mute status interval on disconnect
          if (muteStatusInterval) {
            clearInterval(muteStatusInterval)
            muteStatusInterval = null
          }
        })

        socket.value.on('auxiliary-data', (data) => {
          // Initialize mute state for all channels if not present
          data.channels.forEach(channel => {
            if (channel.muted === undefined) {
              channel.muted = false
            }
          })
          currentAuxData.value = data
          loading.value = false
          
          // Request Main LR mute status when auxiliary data is loaded
          setTimeout(() => {
            requestMainLRMuteStatus()
          }, 500)
        })

        socket.value.on('user-count-updated', (count) => {
          connectedUsers.value = count
          loadAuxiliaries()
        })

        socket.value.on('channel-updated', (data) => {
          if (currentAuxData.value) {
            const channel = currentAuxData.value.channels.find(
              ch => ch.number === data.channelNumber
            )
            if (channel) {
              channel.level = data.level
            }
          }
        })

        socket.value.on('main-lr-mute-updated', (data) => {
          if (currentAuxData.value) {
            const channel = currentAuxData.value.channels.find(
              ch => ch.number === data.channelNumber
            )
            if (channel) {
              channel.muted = data.muted
            }
          }
        })

        socket.value.on('main-lr-mute-status', (muteStates) => {
          console.log('Recibidos estados Main LR mute:', muteStates)
          if (currentAuxData.value) {
            muteStates.forEach(muteState => {
              const channel = currentAuxData.value.channels.find(
                ch => ch.number === muteState.channelNumber
              )
              if (channel) {
                channel.muted = muteState.muted
              }
            })
          }
        })

        socket.value.on('error', (message) => {
          error.value = message
          loading.value = false
        })
      }
    })

    onUnmounted(() => {
      // Clear mute status interval
      if (muteStatusInterval) {
        clearInterval(muteStatusInterval)
        muteStatusInterval = null
      }
      
      // Remove specific event listeners when component unmounts
      // but don't disconnect the socket as it's shared
      if (socket && socket.value) {
        try {
          socket.value.off('auxiliary-data')
          socket.value.off('user-count-updated')
          socket.value.off('channel-updated')
          socket.value.off('main-lr-mute-updated')
          socket.value.off('main-lr-mute-status')
          socket.value.off('error')
          // Keep 'connect' and 'disconnect' listeners as they're global
        } catch (error) {
          console.warn('Error removing socket listeners:', error)
        }
      }
    })

    return {
      connected,
      selectedAux,
      currentAuxData,
      auxiliaries,
      loading,
      error,
      connectedUsers,
      joinAuxiliary,
      handleLevelChange
    }
  }
}
</script>


