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
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useSocket } from '@/composables/useSocket'
import { useAuth } from '@/composables/useAuth'
import ChannelStrip from '@/components/ChannelStrip.vue'
import { getBackendUrl } from '@/utils/networkUtils.js'

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
        socket.value.emit('update-channel-level', {
          auxNumber: currentAuxData.value.auxNumber,
          channelNumber,
          level
        })
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
        })

        socket.value.on('disconnect', () => {
          currentAuxData.value = null
          connectedUsers.value = 0
        })

        socket.value.on('auxiliary-data', (data) => {
          currentAuxData.value = data
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


