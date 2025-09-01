<template>
  <div class="channel-strip">
    <div class="channel-header">
      <span class="channel-number">{{ channel.number }}</span>
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
      />
    </div>
    
    <button 
      class="mute-button"
      :class="{ muted: localLevel === 0 }"
      @click="toggleMute"
    >
      {{ localLevel === 0 ? 'UNMUTE' : 'MUTE' }}
    </button>
  </div>
</template>

<script>
import { ref, watch, computed } from 'vue'

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
    const previousLevel = ref(0.75)
    const isDragging = ref(false)

    watch(() => props.channel.level, (newLevel) => {
      if (!isDragging.value) {
        localLevel.value = newLevel || 0
      }
    })

    const handleFaderChange = () => {
      emit('level-change', props.channel.number, localLevel.value)
    }

    const toggleMute = () => {
      if (localLevel.value === 0) {
        localLevel.value = previousLevel.value
      } else {
        previousLevel.value = localLevel.value
        localLevel.value = 0
      }
      handleFaderChange()
    }

    const handleTouchStart = (event) => {
      event.preventDefault()
      isDragging.value = true
      handleTouch(event)
      
      const handleTouchMove = (e) => {
        e.preventDefault()
        handleTouch(e)
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
      handleMouse(event)
      
      const handleMouseMove = (e) => {
        e.preventDefault()
        handleMouse(e)
      }
      
      const handleMouseUp = () => {
        isDragging.value = false
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
      
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    const handleTouch = (event) => {
      const touch = event.touches[0]
      const rect = event.currentTarget.getBoundingClientRect()
      updateFaderFromPosition(touch.clientY, rect)
    }

    const handleMouse = (event) => {
      const rect = event.currentTarget.getBoundingClientRect()
      updateFaderFromPosition(event.clientY, rect)
    }

    const updateFaderFromPosition = (clientY, rect) => {
      const relativeY = clientY - rect.top
      const percentage = 1 - (relativeY / rect.height)
      const clampedValue = Math.max(0, Math.min(1, percentage))
      
      localLevel.value = clampedValue
      handleFaderChange()
    }

    return {
      localLevel,
      handleFaderChange,
      toggleMute,
      handleTouchStart,
      handleMouseDown
    }
  }
}
</script>