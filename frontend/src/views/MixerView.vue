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
      
      <!-- Master Volume Fader -->
      <div class="master-fader-section">
        <h3>Volumen Principal</h3>
        <div class="master-fader-container">
          <div class="master-level-display">{{ formatLevelDisplay(masterLevel) }}</div>
          <div class="master-fader-track" @touchstart="handleMasterTouchStart" @mousedown="handleMasterMouseDown">
            <div class="master-fader-fill" :style="{ width: `${masterLevel * 100}%` }"></div>
            <div
              class="master-fader-thumb"
              :style="{ left: `${masterLevel * 100}%` }"
              @touchstart="handleMasterTouchStart"
              @mousedown="handleMasterMouseDown"
            ></div>
          </div>
        </div>
      </div>
      
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
    const masterLevel = ref(0)
    const isDraggingMaster = ref(false)

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

    const handleMasterLevelChange = () => {
      if (socket && currentAuxData.value) {
        // Enviar cambio de volumen principal
        socket.value.emit('update-master-level', {
          auxNumber: currentAuxData.value.auxNumber,
          level: masterLevel.value
        })
      }
    }

    const formatLevelDisplay = (level) => {
      const percentage = Math.round(level * 100)
      return `${percentage}%`
    }

    const handleMasterTouchStart = (event) => {
      event.preventDefault()
      isDraggingMaster.value = true
      const faderTrack = event.currentTarget
      const touch = event.touches[0]
      let rect = faderTrack.getBoundingClientRect()
      updateMasterFaderFromPosition(touch.clientX, rect)
      
      const handleTouchMove = (e) => {
        e.preventDefault()
        const touch = e.touches[0]
        updateMasterFaderFromPosition(touch.clientX, rect)
      }
      
      const handleTouchEnd = () => {
        isDraggingMaster.value = false
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleTouchEnd)
      }
      
      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('touchend', handleTouchEnd)
    }

    const handleMasterMouseDown = (event) => {
      event.preventDefault()
      isDraggingMaster.value = true
      const faderTrack = event.currentTarget
      let rect = faderTrack.getBoundingClientRect()
      updateMasterFaderFromPosition(event.clientX, rect)
      
      const handleMouseMove = (e) => {
        e.preventDefault()
        updateMasterFaderFromPosition(e.clientX, rect)
      }
      
      const handleMouseUp = () => {
        isDraggingMaster.value = false
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
      
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    const updateMasterFaderFromPosition = (clientX, rect) => {
      const relativeX = clientX - rect.left
      
      if (relativeX >= -100 && relativeX <= rect.width + 100) {
        const constrainedX = Math.max(0, Math.min(rect.width, relativeX))
        const percentage = constrainedX / rect.width
        const newLevel = Math.max(0, Math.min(0.99, percentage))
        
        if (Math.abs(masterLevel.value - newLevel) > 0.001) {
          masterLevel.value = newLevel
          handleMasterLevelChange()
        }
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
          // Re-join auxiliary if one was selected before disconnect
          if (selectedAux.value) {
            joinAuxiliary()
          }
        })

        socket.value.on('disconnect', () => {
          currentAuxData.value = null
          connectedUsers.value = 0
        })

        socket.value.on('auxiliary-data', (data) => {
          currentAuxData.value = data
          masterLevel.value = data.masterLevel || 0.0
          loading.value = false
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

        socket.value.on('master-level-updated', (data) => {
          if (currentAuxData.value && !isDraggingMaster.value) {
            masterLevel.value = data.level
          }
        })

        socket.value.on('error', (message) => {
          error.value = message
          loading.value = false
        })
      }
    })

    onUnmounted(() => {
      // Remove specific event listeners when component unmounts
      // but don't disconnect the socket as it's shared
      if (socket && socket.value) {
        try {
          socket.value.off('auxiliary-data')
          socket.value.off('user-count-updated')
          socket.value.off('channel-updated')
          socket.value.off('master-level-updated')
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
      masterLevel,
      joinAuxiliary,
      handleLevelChange,
      handleMasterTouchStart,
      handleMasterMouseDown,
      formatLevelDisplay
    }
  }
}
</script>

<style scoped>
.master-fader-section {
  padding: 15px;
  margin: 20px 0;
}

.master-fader-section h3 {
  color: #000;
  margin: 0 0 15px 0;
  font-size: 16px;
  text-align: center;
}

.master-fader-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
}

.master-level-display {
  color: #000;
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 10px;
  min-height: 20px;
  text-align: center;
}

.master-fader-track {
  position: relative;
  width: 100%;
  height: 20px;
  background: #333;
  border: 1px solid #555;
  border-radius: 10px;
  cursor: pointer;
  touch-action: none;
}

.master-fader-fill {
  position: absolute;
  left: 0;
  height: 100%;
  background: linear-gradient(to right, #4a90e2, #7bb3f0);
  border-radius: 9px 0 0 9px;
  transition: width 0.05s ease;
}

.master-fader-thumb {
  position: absolute;
  width: 15px;
  height: 30px;
  background: #fff;
  border: 2px solid #4a90e2;
  border-radius: 3px;
  top: -6px;
  cursor: grab;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  transform: translateX(-50%);
}

.master-fader-thumb:active {
  cursor: grabbing;
  background: #f0f0f0;
}

.mixer-channels {
  padding: 20px;
}

.mixer-channels h2 {
  color: #fff;
  text-align: center;
  margin-bottom: 20px;
}

.channels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 20px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 10px;
}

@media (max-width: 768px) {
  .master-fader-container {
    max-width: 300px;
  }
  
  .master-fader-track {
    height: 18px;
  }
  
  .master-fader-thumb {
    width: 12px;
    height: 24px;
    top: -4px;
  }
  
  .channels-grid {
    grid-template-columns: repeat(auto-fit, minmax(65px, 1fr));
    gap: 15px;
    padding: 0 5px;
  }
}
</style>
