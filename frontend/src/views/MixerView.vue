<template>
  <div class="mixer-view">
    <div class="auxiliary-selector">
      <label for="aux-select">Seleccionar Auxiliar:</label>
      <select 
        id="aux-select" 
        v-model="selectedAux" 
        @change="joinAuxiliary"
        :disabled="!socketConnected"
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
import ChannelStrip from '@/components/ChannelStrip.vue'

export default {
  name: 'MixerView',
  components: {
    ChannelStrip
  },
  setup() {
    const { socket, connect } = useSocket()
    const socketConnected = ref(false)
    const selectedAux = ref('')
    const currentAuxData = ref(null)
    const auxiliaries = ref([])
    const loading = ref(false)
    const error = ref('')
    const connectedUsers = ref(0)

    const loadAuxiliaries = async () => {
      try {
        const response = await fetch('http://localhost:3000/auxiliaries')
        const data = await response.json()
        auxiliaries.value = data.auxiliaries
      } catch (err) {
        console.error('Error cargando auxiliares:', err)
      }
    }

    const joinAuxiliary = () => {
      if (selectedAux.value && socket) {
        loading.value = true
        error.value = ''
        socket.emit('join-auxiliary', parseInt(selectedAux.value))
      }
    }

    const handleLevelChange = (channelNumber, level) => {
      if (socket && currentAuxData.value) {
        socket.emit('update-channel-level', {
          auxNumber: currentAuxData.value.auxNumber,
          channelNumber,
          level
        })
      }
    }

    onMounted(() => {
      connect()
      loadAuxiliaries()

      if (socket) {
        socket.on('connect', () => {
          socketConnected.value = true
          loadAuxiliaries()
        })

        socket.on('disconnect', () => {
          socketConnected.value = false
          currentAuxData.value = null
          connectedUsers.value = 0
        })

        socket.on('auxiliary-data', (data) => {
          currentAuxData.value = data
          loading.value = false
        })

        socket.on('user-count-updated', (count) => {
          connectedUsers.value = count
          loadAuxiliaries()
        })

        socket.on('channel-updated', (data) => {
          if (currentAuxData.value) {
            const channel = currentAuxData.value.channels.find(
              ch => ch.number === data.channelNumber
            )
            if (channel) {
              channel.level = data.level
            }
          }
        })

        socket.on('error', (message) => {
          error.value = message
          loading.value = false
        })
      }
    })

    onUnmounted(() => {
      if (socket) {
        socket.off('connect')
        socket.off('disconnect')
        socket.off('auxiliary-data')
        socket.off('user-count-updated')
        socket.off('channel-updated')
        socket.off('error')
      }
    })

    return {
      socketConnected,
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