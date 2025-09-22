<template>
  <div class="channel-strip">
    <div class="channel-header">
      <span class="channel-name">{{ channel.name }}</span>
    </div>
    
    <div class="fader-container">
      <div class="level-display">{{ formatLevelDisplay(localLevel) }}</div>
      
      <div class="fader-track" @touchstart="handleTouchStart" @mousedown="handleMouseDown">
        <div class="fader-fill" :style="{ height: `${localLevel * 100}%` }"></div>
        <div 
          class="fader-thumb" 
          :style="{ bottom: `${localLevel * 100}%` }"
          @touchstart="handleTouchStart"
          @mousedown="handleMouseDown"
        ></div>
      </div>
      
      <input 
        type="range" 
        min="0" 
        max="0.99" 
        step="0.01"
        v-model.number="localLevel"
        @input="handleFaderChange"
        @change="handleFaderChange"
        class="fader-slider"
        orient="vertical"
        style="display: none;"
      />
    </div>
    
  </div>
</template>

<script>
import { ref, watch } from 'vue'

export default {
  name: 'ChannelStrip',
  props: {
    channel: {
      type: Object,
      required: true
    },
    auxNumber: {
      type: Number,
      required: true
    }
  },
  emits: ['level-change'],
  setup(props, { emit }) {
    const localLevel = ref(Math.min(0.99, props.channel.level || 0))
    const isDragging = ref(false)
    let updateTimeout = null

    watch(() => props.channel.level, (newLevel) => {
      if (!isDragging.value) {
        // Limitar el nivel máximo al 99%
        localLevel.value = Math.min(0.99, newLevel || 0)
      }
    })

    const handleFaderChange = () => {
      // Throttling muy reducido: solo enviar actualizaciones cada 10ms para máxima suavidad
      if (updateTimeout) {
        clearTimeout(updateTimeout)
      }
      
      updateTimeout = setTimeout(() => {
        emit('level-change', props.channel.number, localLevel.value)
        updateTimeout = null
      }, 10)
    }


    const handleTouchStart = (event) => {
      event.preventDefault()
      isDragging.value = true
      const faderTrack = event.currentTarget
      const touch = event.touches[0]
      let rect = faderTrack.getBoundingClientRect() // Cache inicial
      updateFaderFromPosition(touch.clientY, rect)
      
      const handleTouchMove = (e) => {
        e.preventDefault()
        const touch = e.touches[0]
        // Usar rect cached para mejor performance, actualizar solo ocasionalmente
        updateFaderFromPosition(touch.clientY, rect)
      }
      
      const handleTouchEnd = () => {
        isDragging.value = false
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleTouchEnd)
      }
      
      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('touchend', handleTouchEnd)
    }

    const handleMouseDown = (event) => {
      event.preventDefault()
      isDragging.value = true
      const faderTrack = event.currentTarget
      let rect = faderTrack.getBoundingClientRect() // Cache inicial
      updateFaderFromPosition(event.clientY, rect)
      
      const handleMouseMove = (e) => {
        e.preventDefault()
        // Usar rect cached para mejor performance
        updateFaderFromPosition(e.clientY, rect)
      }
      
      const handleMouseUp = () => {
        isDragging.value = false
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
      
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    const updateFaderFromPosition = (clientY, rect) => {
      const relativeY = clientY - rect.top
      
      // Rango más amplio para evitar "pegajosidad" en los bordes
      if (relativeY >= -100 && relativeY <= rect.height + 100) {
        // Constrañir la posición Y al rango válido del fader
        const constrainedY = Math.max(0, Math.min(rect.height, relativeY))
        const percentage = 1 - (constrainedY / rect.height)
        // Limitar el máximo al 99%
        const newLevel = Math.max(0, Math.min(0.99, percentage))
        
        // Solo actualizar si el cambio es significativo (reduce ruido)
        if (Math.abs(localLevel.value - newLevel) > 0.001) {
          localLevel.value = newLevel
          handleFaderChange()
        }
      }
    }

    const formatLevelDisplay = (level) => {
      // Convertir 0-0.99 a 0% hasta 99%
      const percentage = Math.round(level * 100)
      return `${percentage}%`
    }

    return {
      localLevel,
      handleFaderChange,
      handleTouchStart,
      handleMouseDown,
      formatLevelDisplay
    }
  }
}
</script>

