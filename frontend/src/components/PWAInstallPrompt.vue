<template>
  <div v-if="showInstallPrompt" class="pwa-install-prompt">
    <div class="install-card">
      <div class="install-header">
        <h3>📱 Instalar App</h3>
        <button @click="dismissPrompt" class="close-btn">&times;</button>
      </div>
      <p>Instala ICCR Monitor en tu dispositivo para un acceso más rápido</p>
      <div class="install-actions">
        <button @click="installApp" class="install-btn">Instalar</button>
        <button @click="dismissPrompt" class="dismiss-btn">Ahora no</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'

export default {
  name: 'PWAInstallPrompt',
  setup() {
    const showInstallPrompt = ref(false)
    const deferredPrompt = ref(null)

    onMounted(() => {
      // Check if already running as PWA
      if (window.matchMedia('(display-mode: standalone)').matches || 
          window.navigator.standalone === true) {
        console.log('Already running as PWA')
        return
      }

      // Listen for the beforeinstallprompt event
      window.addEventListener('beforeinstallprompt', (e) => {
        console.log('beforeinstallprompt fired')
        e.preventDefault()
        deferredPrompt.value = e
        
        // Check if user has dismissed the prompt before
        const dismissed = localStorage.getItem('pwa-install-dismissed')
        if (!dismissed) {
          showInstallPrompt.value = true
        }
      })

      // For iOS Safari and other browsers that don't support beforeinstallprompt
      setTimeout(() => {
        if (!deferredPrompt.value && isIOSSafari()) {
          const dismissed = localStorage.getItem('pwa-install-dismissed')
          if (!dismissed) {
            showInstallPrompt.value = true
          }
        }
      }, 3000) // Wait 3 seconds for page to load

      // Check if app is already installed
      window.addEventListener('appinstalled', () => {
        console.log('PWA was installed')
        showInstallPrompt.value = false
        deferredPrompt.value = null
      })
    })

    const installApp = async () => {
      if (!deferredPrompt.value) {
        // For iOS Safari, show instructions
        if (isIOSSafari()) {
          showIOSInstallInstructions()
          return
        }
        return
      }

      deferredPrompt.value.prompt()
      const { outcome } = await deferredPrompt.value.userChoice
      console.log(`User response to the install prompt: ${outcome}`)
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt')
      }
      
      showInstallPrompt.value = false
      deferredPrompt.value = null
    }

    const dismissPrompt = () => {
      showInstallPrompt.value = false
      localStorage.setItem('pwa-install-dismissed', 'true')
    }

    const isIOSSafari = () => {
      const ua = window.navigator.userAgent
      const iOS = !!ua.match(/iPad/i) || !!ua.match(/iPhone/i)
      const webkit = !!ua.match(/WebKit/i)
      const iOSSafari = iOS && webkit && !ua.match(/CriOS/i)
      return iOSSafari
    }

    const showIOSInstallInstructions = () => {
      alert('Para instalar en iOS:\n1. Toca el botón compartir (⬆️)\n2. Selecciona "Añadir a pantalla de inicio"\n3. Toca "Añadir"')
    }

    return {
      showInstallPrompt,
      installApp,
      dismissPrompt
    }
  }
}
</script>

<style scoped>
.pwa-install-prompt {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.install-card {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.install-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.install-header h3 {
  margin: 0;
  color: #333;
  font-size: 18px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #333;
}

.install-card p {
  margin: 0 0 24px 0;
  color: #666;
  line-height: 1.5;
}

.install-actions {
  display: flex;
  gap: 12px;
}

.install-btn {
  flex: 1;
  background: #2196f3;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.install-btn:hover {
  background: #1976d2;
}

.dismiss-btn {
  flex: 1;
  background: transparent;
  color: #666;
  border: 1px solid #ddd;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.dismiss-btn:hover {
  background: #f5f5f5;
  color: #333;
}

@media (max-width: 480px) {
  .install-actions {
    flex-direction: column;
  }
}
</style>