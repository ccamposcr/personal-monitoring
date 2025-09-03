const osc = require('node-osc');
const fs = require('fs');
const path = require('path');
const { discoverMixerIP } = require('../utils/networkUtils');

class XR18Controller {
  constructor() {
    this.mixerIP = process.env.XR18_IP || discoverMixerIP();
    this.mixerPort = parseInt(process.env.XR18_PORT) || 10024;
    this.client = null;
    this.server = null;
    this.connected = false;
    this.channelData = new Map();
    this.channelNames = new Map();
    this.auxiliaryNames = new Map();
    this.lastUpdateTime = new Map(); // Para throttling
    this.levelChangeCallback = null; // Callback para notificar cambios
    
    this.channels = 16;
    this.auxiliaries = 6;
    
    // Cargar nombres desde archivo de configuración
    this.loadNamesFromConfig();
    
    this.setupOSCServer();
  }

  loadNamesFromConfig() {
    try {
      const configPath = path.join(__dirname, '../../config/mixer-names.json');
      
      if (fs.existsSync(configPath)) {
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        // Cargar nombres de canales
        if (configData.channels) {
          for (let ch = 1; ch <= this.channels; ch++) {
            const name = configData.channels[ch.toString()];
            if (name) {
              this.channelNames.set(ch, name);
            }
          }
          console.log(`📝 Cargados ${this.channelNames.size} nombres de canales desde config`);
        }
        
        // Cargar nombres de auxiliares
        if (configData.auxiliaries) {
          for (let aux = 1; aux <= this.auxiliaries; aux++) {
            const name = configData.auxiliaries[aux.toString()];
            if (name) {
              this.auxiliaryNames.set(aux, name);
            }
          }
          console.log(`📝 Cargados ${this.auxiliaryNames.size} nombres de auxiliares desde config`);
        }
        
        console.log('✅ Configuración de nombres cargada exitosamente');
        
        // Configurar watcher para recargar automáticamente si cambia el archivo
        this.setupConfigWatcher(configPath);
        
      } else {
        console.log('⚠️ No se encontró archivo de configuración mixer-names.json');
        console.log(`📍 Ubicación esperada: ${configPath}`);
        console.log('💡 Se usarán nombres por defecto (Canal X, Auxiliar X)');
      }
      
    } catch (error) {
      console.error('❌ Error cargando configuración de nombres:', error.message);
      console.log('💡 Se usarán nombres por defecto');
    }
  }

  setupConfigWatcher(configPath) {
    try {
      // Limpiar watcher anterior si existe
      if (this.configWatcher) {
        this.configWatcher.close();
      }
      
      this.configWatcher = fs.watchFile(configPath, { interval: 1000 }, (curr, prev) => {
        if (curr.mtime > prev.mtime) {
          console.log('📝 Archivo de configuración modificado - recargando nombres...');
          
          // Limpiar nombres actuales
          this.channelNames.clear();
          this.auxiliaryNames.clear();
          
          // Recargar desde archivo
          this.loadNamesFromConfig();
          
          console.log('🔄 Nombres actualizados automáticamente');
        }
      });
      
      console.log('👁️ Vigilando cambios en archivo de configuración');
      
    } catch (error) {
      console.error('❌ Error configurando watcher:', error.message);
    }
  }

  setupOSCServer() {
    try {
      this.server = new osc.Server(10025, '0.0.0.0', () => {
        console.log('Servidor OSC iniciado en puerto 10025, escuchando en todas las interfaces');
      });

      this.server.on('message', (msg) => {
        this.handleOSCMessage(msg);
      });

      this.server.on('error', (err) => {
        console.error('Error en servidor OSC:', err);
      });

      console.log('Servidor OSC configurado para recibir en puerto 10025');
    } catch (error) {
      console.error('Error configurando servidor OSC:', error);
    }
  }

  handleOSCMessage(msg) {
    const [address, ...args] = msg;
    
    // Contar mensajes recibidos
    if (!this.oscMessageCount) this.oscMessageCount = 0;
    this.oscMessageCount++;
    
    // Si es el primer mensaje después de estar desconectados, reactivar polling
    if (this.oscMessageCount === 1 && this.pollingDisabledWarning) {
      console.log('✅ Comunicación OSC restablecida - reactivando polling');
      this.pollingDisabledWarning = false;
    }
    
    // Logging selectivo - solo mensajes importantes
    if (address.includes('/level') || address.includes('/info') || address.includes('/config') || this.oscMessageCount <= 10) {
      console.log(`🔽 OSC recibido: ${address} ${args.length > 0 ? `= ${args.join(', ')}` : '(sin argumentos)'}`);
    }
    
    if (this.oscMessageCount % 100 === 0) {
      console.log(`📊 Total mensajes OSC recibidos: ${this.oscMessageCount}`);
    }
    
    // Manejar respuestas de meters específicas del XR18
    if (address === '/meters' && args.length >= 2) {
      const meterPath = args[0];
      const meterValue = args[1];
      
      if (meterPath && meterPath.includes('/mix/') && meterPath.includes('/level')) {
        console.log(`Meter data recibido: ${meterPath} = ${meterValue}`);
        // Procesar como si fuera un mensaje de nivel normal
        this.processMixLevelMessage(meterPath, meterValue);
        return;
      }
    }
    
    if (address.includes('/mix/') && address.includes('/level')) {
      this.processMixLevelMessage(address, args[0]);
    }
    
    
    // Capturar nombres de canales
    if (address.includes('/config/name') && args[0]) {
      const pathParts = address.split('/');
      const channelIndex = pathParts.findIndex(part => part.startsWith('ch'));
      
      if (channelIndex !== -1) {
        const channel = parseInt(pathParts[channelIndex].replace('ch-', '').replace('ch', ''));
        this.channelNames.set(channel, args[0]);
        console.log(`Nombre canal recibido: Ch${channel} = "${args[0]}"`);
      }
    }
    
    // Capturar nombres de auxiliares
    if (address.includes('/bus/') && address.includes('/config/name') && args[0]) {
      const pathParts = address.split('/');
      const busIndex = pathParts.findIndex(part => part.startsWith('bus'));
      
      if (busIndex !== -1) {
        const bus = parseInt(pathParts[busIndex].replace('bus-', '').replace('bus', ''));
        // Los buses 1-6 corresponden a los auxiliares 1-6 en XR18
        if (bus >= 1 && bus <= 6) {
          this.auxiliaryNames.set(bus, args[0]);
          console.log(`Nombre auxiliar recibido: Bus${bus}/Aux${bus} = "${args[0]}"`);
        }
      }
    }
  }

  processMixLevelMessage(address, level) {
    const pathParts = address.split('/');
    const channelIndex = pathParts.findIndex(part => part.startsWith('ch'));
    const mixIndex = pathParts.findIndex(part => part.startsWith('mix'));
    
    if (channelIndex !== -1 && mixIndex !== -1) {
      const channel = parseInt(pathParts[channelIndex].replace('ch-', '').replace('ch', ''));
      const aux = parseInt(pathParts[mixIndex].replace('mix-', '').replace('mix', ''));
      
      const key = `ch${channel}-aux${aux}`;
      const previousLevel = this.channelData.get(key);
      this.channelData.set(key, level);
      
      // Solo mostrar log si el nivel realmente cambió significativamente
      const threshold = 0.001; // Evitar ruido de pequeños cambios
      if (Math.abs((previousLevel || 0) - level) > threshold) {
        console.log(`Nivel cambió: Ch${channel}/Aux${aux} ${previousLevel?.toFixed(3) || 'undefined'} -> ${level.toFixed(3)}`);
      }
      
      // Notificar cambio si hay un callback registrado y el nivel cambió significativamente
      if (this.levelChangeCallback && Math.abs((previousLevel || 0) - level) > threshold) {
        this.levelChangeCallback({
          auxNumber: aux,
          channelNumber: channel,
          level: level
        });
      }
    }
  }

  connect() {
    try {
      this.client = new osc.Client(this.mixerIP, this.mixerPort);
      this.connected = true;
      this.connectTime = Date.now(); // Registrar tiempo de conexión
      console.log(`Conectado a XR18 en ${this.mixerIP}:${this.mixerPort}`);
      
      this.sendKeepAlive();
      setInterval(() => this.sendKeepAlive(), 9000);
      
      // Esperar un poco antes de solicitar datos
      setTimeout(() => {
        console.log('Solicitando datos iniciales de la mixer...');
        this.subscribeToMixerUpdates(); // Suscribirse primero
        this.requestAllLevels();
        this.requestChannelNames();
        this.requestAuxiliaryNames();
        
        // Configurar solicitud periódica de niveles para mantener sincronización
        this.setupPeriodicSync();
        
        // Test de conectividad básica
        this.testBasicConnectivity();
      }, 1000);
      
    } catch (error) {
      console.error('Error conectando a XR18:', error);
      this.connected = false;
    }
  }

  sendKeepAlive() {
    if (this.client && this.connected) {
      if (!this.keepAliveCount) this.keepAliveCount = 0;
      this.keepAliveCount++;
      
      // Solo logear cada 10 keep-alives
      if (this.keepAliveCount % 10 === 1) {
        console.log(`🔄 Keep-alive #${this.keepAliveCount} (cada 9 segundos)`);
      }
      
      // Para XR18: usar xremote para mantener conexión activa
      this.client.send('/xremote');
      this.client.send('/xremoterenew');
      this.client.send('/info');
    }
  }

  subscribeToMixerUpdates() {
    if (!this.client || !this.connected) return;
    
    console.log(`Configurando sincronización con Behringer X-Air XR18 en ${this.mixerIP}:${this.mixerPort}...`);
    
    // Para XR18: Los métodos estándar de suscripción OSC no funcionan bien
    // En su lugar, usaremos polling dirigido y meter data
    
    // 1. Activar renew automático para mantener conexión
    this.client.send('/xremoterenew');
    
    // 2. Solicitar meter data que incluye niveles
    this.client.send('/meters', '/ch/01/mix/01/level');
    
    // 3. Para XR18, necesitamos activar meters de todos los canales
    this.enableXR18Meters();
    
    console.log('Configuración específica XR18 enviada');
  }

  enableXR18Meters() {
    console.log('Habilitando meters para todos los canales/auxiliares...');
    
    // En XR18, los meters deben habilitarse explícitamente
    for (let aux = 1; aux <= this.auxiliaries; aux++) {
      for (let ch = 1; ch <= this.channels; ch++) {
        const meterAddress = `/meters`;
        const levelPath = `/ch/${ch.toString().padStart(2, '0')}/mix/${aux.toString().padStart(2, '0')}/level`;
        
        // Solicitar meter data para este canal/aux específico
        this.client.send(meterAddress, levelPath);
      }
    }
    
    // También habilitar meters de canales principales para debug
    this.client.send('/meters', '/ch/01/config/name');
    this.client.send('/meters', '/info');
  }

  requestAllLevels() {
    if (!this.client || !this.connected) return;

    // Reducir logging - solo reportar cada 10 veces
    if (!this.requestCount) this.requestCount = 0;
    this.requestCount++;
    
    if (this.requestCount % 10 === 1) {
      console.log(`🔄 Solicitando todos los niveles (intento ${this.requestCount})...`);
    }

    for (let aux = 1; aux <= this.auxiliaries; aux++) {
      for (let ch = 1; ch <= this.channels; ch++) {
        const levelAddress = `/ch/${ch.toString().padStart(2, '0')}/mix/${aux.toString().padStart(2, '0')}/level`;
        this.client.send(levelAddress);
      }
    }
  }

  requestChannelNames() {
    if (!this.client || !this.connected) return;

    for (let ch = 1; ch <= this.channels; ch++) {
      const address = `/ch/${ch.toString().padStart(2, '0')}/config/name`;
      this.client.send(address);
    }
  }

  requestAuxiliaryNames() {
    if (!this.client || !this.connected) return;

    // En XR18, los auxiliares están en los buses 1-6
    for (let bus = 1; bus <= this.auxiliaries; bus++) {
      const address = `/bus/${bus.toString().padStart(2, '0')}/config/name`;
      this.client.send(address);
    }
  }

  setupPeriodicSync() {
    // Polling condicional - solo si hay comunicación OSC activa
    this.generalPollingInterval = setInterval(() => {
      if (this.client && this.connected && this.shouldPoll()) {
        this.requestAllLevels();
      }
    }, 5000); // Reducido a cada 5 segundos
    
    // También solicitar con más frecuencia para auxiliares activos
    this.activeAuxPolling = new Map();
  }

  shouldPoll() {
    // Solo hacer polling si hemos recibido al menos un mensaje OSC
    // o si han pasado menos de 30 segundos desde la conexión
    const messageCount = this.oscMessageCount || 0;
    const timeSinceConnect = Date.now() - (this.connectTime || 0);
    
    if (messageCount > 0) {
      return true; // Hay comunicación OSC, continuar polling
    }
    
    if (timeSinceConnect < 30000) {
      return true; // Primeros 30 segundos, seguir intentando
    }
    
    // Sin comunicación OSC después de 30 segundos, desactivar polling general
    if (!this.pollingDisabledWarning) {
      console.log('⚠️  Polling general desactivado - sin respuestas OSC del XR18');
      console.log('💡 El polling se reactivará si se detecta comunicación OSC');
      this.pollingDisabledWarning = true;
    }
    
    return false;
  }

  startActivePolling(auxNumber) {
    // Polling condicional para auxiliares activos
    if (this.activeAuxPolling.has(auxNumber)) {
      return; // Ya está activo
    }
    
    console.log(`Iniciando polling activo para auxiliar ${auxNumber}`);
    const intervalId = setInterval(() => {
      if (this.client && this.connected && this.shouldPoll()) {
        this.requestAuxiliaryLevels(auxNumber);
      }
    }, 2000); // Reducido a cada 2 segundos
    
    this.activeAuxPolling.set(auxNumber, intervalId);
  }

  stopActivePolling(auxNumber) {
    const intervalId = this.activeAuxPolling.get(auxNumber);
    if (intervalId) {
      clearInterval(intervalId);
      this.activeAuxPolling.delete(auxNumber);
      console.log(`Deteniendo polling activo para auxiliar ${auxNumber}`);
    }
  }

  requestAuxiliaryLevels(auxNumber) {
    // Solicitar solo los niveles de un auxiliar específico usando protocolo XR18
    for (let ch = 1; ch <= this.channels; ch++) {
      const levelAddress = `/ch/${ch.toString().padStart(2, '0')}/mix/${auxNumber.toString().padStart(2, '0')}/level`;
      
      // Método 1: Solicitud directa
      this.client.send(levelAddress);
      
      // Método 2: A través de meters (específico XR18)
      this.client.send('/meters', levelAddress);
    }
  }

  setLevelChangeCallback(callback) {
    this.levelChangeCallback = callback;
  }

  testBasicConnectivity() {
    console.log('🧪 Test de conectividad con XR18...');
    
    // Intentar tomar control del XR18
    this.attemptControlTakeover();
    
    // Test básico
    this.client.send('/info');
    this.client.send('/ch/01/mix/01/level');
    
    // Programar verificación de resultados
    setTimeout(() => {
      const messageCount = this.oscMessageCount || 0;
      if (messageCount === 0) {
        console.log('⚠️  XR18 no responde - posible conflicto con otra aplicación');
        console.log('💡 Para sincronización bidireccional:');
        console.log('   1. Cierra X-Air Edit completamente');
        console.log('   2. Reinicia esta aplicación');
        console.log('   3. O mantén X-Air Edit abierto y usa solo control unidireccional (app -> XR18)');
      } else {
        console.log(`✅ XR18 responde correctamente (${messageCount} mensajes)`);
      }
    }, 2000);
  }

  attemptControlTakeover() {
    console.log('🔄 Intentando tomar control OSC del XR18...');
    
    // Enviar múltiples comandos de control
    this.client.send('/xremote');
    this.client.send('/xremoterenew'); 
    
    // Intentar "empujar" otras conexiones
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.client.send('/xremote');
      }, i * 100);
    }
  }

  async getAuxiliaryLevels(auxNumber) {
    if (!this.client || !this.connected) {
      throw new Error('No conectado a la mixer');
    }

    // Solicitar niveles de canales para este auxiliar
    for (let ch = 1; ch <= this.channels; ch++) {
      const levelAddress = `/ch/${ch.toString().padStart(2, '0')}/mix/${auxNumber.toString().padStart(2, '0')}/level`;
      this.client.send(levelAddress);
    }

    // También solicitar nombres de canales si no los tenemos
    for (let ch = 1; ch <= this.channels; ch++) {
      if (!this.channelNames.has(ch)) {
        const address = `/ch/${ch.toString().padStart(2, '0')}/config/name`;
        this.client.send(address);
      }
    }

    console.log(`🔄 Solicitando niveles para Aux ${auxNumber}...`);
    
    // Un solo intento más simple
    for (let ch = 1; ch <= this.channels; ch++) {
      const levelAddress = `/ch/${ch.toString().padStart(2, '0')}/mix/${auxNumber.toString().padStart(2, '0')}/level`;
      this.client.send(levelAddress);
    }
    
    // Esperar un momento para respuestas
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Si no hay datos después del primer intento, advertir al usuario
    const currentDataCount = Array.from(this.channelData.keys()).length;
    if (currentDataCount === 0 && !this.noDataWarningShown) {
      console.log('⚠️  PROBLEMA: XR18 no responde a solicitudes OSC');
      console.log('💡 Causa más probable: X-Air Edit (u otra app) tiene control exclusivo');
      console.log('🔧 Solución: Cierra X-Air Edit o cualquier otra aplicación conectada al XR18');
      this.noDataWarningShown = true;
    }

    const channels = [];
    let channelsWithData = 0;
    
    for (let ch = 1; ch <= this.channels; ch++) {
      const key = `ch${ch}-aux${auxNumber}`;
      const mixerLevel = this.channelData.get(key);
      const hasData = mixerLevel !== undefined;
      
      if (hasData) channelsWithData++;
      
      // Convertir del rango de la mixer (0-1.0) al rango de la UI (0-1)
      // 0.0 = -∞dB, 0.75 = 0dB (unity), 1.0 = +10dB
      const uiLevel = mixerLevel || 0;
      const name = this.channelNames.get(ch) || `Canal ${ch}`;
      
      channels.push({
        number: ch,
        name: name,
        level: uiLevel
      });
      
    }

    console.log(`📊 Aux${auxNumber}: ${channelsWithData}/${this.channels} canales con datos`);
    
    // Solo mostrar detalles si hay algunos datos o si es la primera vez
    if (channelsWithData > 0) {
      const channelsWithLevels = channels.filter(ch => ch.level > 0);
      if (channelsWithLevels.length > 0) {
        console.log(`🎵 Canales activos:`, channelsWithLevels.map(ch => `Ch${ch.number}(${(ch.level * 100).toFixed(0)}%)`).join(', '));
      }
    }

    const auxName = this.auxiliaryNames.get(auxNumber) || `Auxiliar ${auxNumber}`;
    
    return {
      auxNumber,
      name: auxName,
      channels
    };
  }

  async setChannelLevel(auxNumber, channelNumber, level) {
    if (!this.client || !this.connected) {
      throw new Error('No conectado a la mixer');
    }

    const key = `ch${channelNumber}-aux${auxNumber}`;
    const now = Date.now();
    const lastUpdate = this.lastUpdateTime.get(key) || 0;
    
    // Throttling: solo enviar si han pasado al menos 50ms desde la última actualización
    if (now - lastUpdate < 50) {
      console.log(`Throttling update for ${key} - too frequent`);
      return {
        channelNumber,
        auxNumber,
        level: this.channelData.get(key) || level
      };
    }

    // Para XR18, el rango completo es 0.0 (-∞dB) a 1.0 (+10dB)
    // 0.75 corresponde a 0dB (unity gain)
    // Mapear directamente de nuestro rango 0-1 al rango real de la mixer
    const mixerLevel = Math.max(0, Math.min(1.0, level));
    const address = `/ch/${channelNumber.toString().padStart(2, '0')}/mix/${auxNumber.toString().padStart(2, '0')}/level`;
    
    console.log(`Enviando nivel: ${address} = ${mixerLevel.toFixed(3)} (frontend: ${level.toFixed(3)})`);
    this.client.send(address, mixerLevel);
    
    this.channelData.set(key, mixerLevel);
    this.lastUpdateTime.set(key, now);

    return {
      channelNumber,
      auxNumber,
      level: mixerLevel
    };
  }


  isConnected() {
    return this.connected;
  }

  getAuxiliaryName(auxNumber) {
    return this.auxiliaryNames.get(auxNumber) || `Auxiliar ${auxNumber}`;
  }

  getAllAuxiliaryNames() {
    const names = {};
    for (let aux = 1; aux <= this.auxiliaries; aux++) {
      names[aux] = this.getAuxiliaryName(aux);
    }
    return names;
  }

  disconnect() {
    if (this.client) {
      this.client.close();
    }
    if (this.server) {
      this.server.close();
    }
    
    // Limpiar watcher de configuración
    if (this.configWatcher) {
      fs.unwatchFile(this.configWatcher);
      this.configWatcher = null;
    }
    
    this.connected = false;
    console.log('Desconectado de XR18');
  }
}

module.exports = XR18Controller;