<template>
  <div class="channel-strip">
    <div class="channel-header">
      <span class="channel-name">{{ channel.name }}</span>
    </div>
    
    <div class="fader-container">
      <div class="level-display">{{ Math.round(localLevel * 100) }}%</div>
      
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
        max="1" 
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
    const localLevel = ref(props.channel.level || 0)
    const isDragging = ref(false)
    let updateTimeout = null

    watch(() => props.channel.level, (newLevel) => {
      if (!isDragging.value) {
        localLevel.value = newLevel || 0
      }
    })

    const handleFaderChange = () => {
      // Throttling: solo enviar actualizaciones cada 100ms como máximo
      if (updateTimeout) {
        clearTimeout(updateTimeout)
      }
      
      updateTimeout = setTimeout(() => {
        emit('level-change', props.channel.number, localLevel.value)
        updateTimeout = null
      }, 100)
    }


    const handleTouchStart = (event) => {
      event.preventDefault()
      isDragging.value = true
      const faderTrack = event.currentTarget
      const touch = event.touches[0]
      const rect = faderTrack.getBoundingClientRect()
      updateFaderFromPosition(touch.clientY, rect)
      
      const handleTouchMove = (e) => {
        e.preventDefault()
        const touch = e.touches[0]
        const rect = faderTrack.getBoundingClientRect()
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
      const rect = faderTrack.getBoundingClientRect()
      updateFaderFromPosition(event.clientY, rect)
      
      const handleMouseMove = (e) => {
        e.preventDefault()
        const rect = faderTrack.getBoundingClientRect()
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
      
      // Solo actualizar si está dentro de un rango ampliado del fader
      // Esto evita saltos bruscos cuando se sale del área
      if (relativeY >= -50 && relativeY <= rect.height + 50) {
        // Constrañir la posición Y al rango válido del fader
        const constrainedY = Math.max(0, Math.min(rect.height, relativeY))
        const percentage = 1 - (constrainedY / rect.height)
        localLevel.value = Math.max(0, Math.min(1, percentage))
        handleFaderChange()
      }
      // Si se sale demasiado del área, mantener el valor actual sin actualizar
    }

    return {
      localLevel,
      handleFaderChange,
      handleTouchStart,
      handleMouseDown
    }
  }
}
</script>