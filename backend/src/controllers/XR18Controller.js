const osc = require('node-osc');
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
    this.channelMuteStates = new Map();
    this.lastUpdateTime = new Map(); // Para throttling
    
    this.channels = 16;
    this.auxiliaries = 6;
    
    this.setupOSCServer();
  }

  setupOSCServer() {
    this.server = new osc.Server(10025, '0.0.0.0', () => {
      console.log('Servidor OSC iniciado en puerto 10025');
    });

    this.server.on('message', (msg) => {
      this.handleOSCMessage(msg);
    });
  }

  handleOSCMessage(msg) {
    const [address, ...args] = msg;
    
    if (address.includes('/mix/') && address.includes('/level')) {
      const pathParts = address.split('/');
      const channelIndex = pathParts.findIndex(part => part.startsWith('ch'));
      const mixIndex = pathParts.findIndex(part => part.startsWith('mix'));
      
      if (channelIndex !== -1 && mixIndex !== -1) {
        const channel = parseInt(pathParts[channelIndex].replace('ch-', '').replace('ch', ''));
        const aux = parseInt(pathParts[mixIndex].replace('mix-', '').replace('mix', ''));
        const level = args[0];
        
        const key = `ch${channel}-aux${aux}`;
        this.channelData.set(key, level);
        console.log(`OSC recibido: ${address} = ${level} (${typeof level}) -> ${key}`);
      }
    }
    
    // Capturar estados de mute
    if (address.includes('/mix/') && address.includes('/on')) {
      const pathParts = address.split('/');
      const channelIndex = pathParts.findIndex(part => part.startsWith('ch'));
      const mixIndex = pathParts.findIndex(part => part.startsWith('mix'));
      
      if (channelIndex !== -1 && mixIndex !== -1) {
        const channel = parseInt(pathParts[channelIndex].replace('ch-', '').replace('ch', ''));
        const aux = parseInt(pathParts[mixIndex].replace('mix-', '').replace('mix', ''));
        const isOn = args[0] === 1; // 1 = unmuted, 0 = muted
        
        const key = `ch${channel}-aux${aux}`;
        this.channelMuteStates.set(key, isOn);
        console.log(`OSC mute recibido: ${address} = ${isOn} -> ${key}`);
      }
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
  }

  connect() {
    try {
      this.client = new osc.Client(this.mixerIP, this.mixerPort);
      this.connected = true;
      console.log(`Conectado a XR18 en ${this.mixerIP}:${this.mixerPort}`);
      
      this.sendKeepAlive();
      setInterval(() => this.sendKeepAlive(), 9000);
      
      // Esperar un poco antes de solicitar datos
      setTimeout(() => {
        console.log('Solicitando datos iniciales de la mixer...');
        this.requestAllLevels();
        this.requestChannelNames();
      }, 1000);
      
    } catch (error) {
      console.error('Error conectando a XR18:', error);
      this.connected = false;
    }
  }

  sendKeepAlive() {
    if (this.client && this.connected) {
      this.client.send('/xremote');
      this.client.send('/info');
    }
  }

  requestAllLevels() {
    if (!this.client || !this.connected) return;

    for (let aux = 1; aux <= this.auxiliaries; aux++) {
      for (let ch = 1; ch <= this.channels; ch++) {
        const levelAddress = `/ch/${ch.toString().padStart(2, '0')}/mix/${aux.toString().padStart(2, '0')}/level`;
        const muteAddress = `/ch/${ch.toString().padStart(2, '0')}/mix/${aux.toString().padStart(2, '0')}/on`;
        this.client.send(levelAddress);
        this.client.send(muteAddress);
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

  async getAuxiliaryLevels(auxNumber) {
    if (!this.client || !this.connected) {
      throw new Error('No conectado a la mixer');
    }

    // Solicitar niveles y estados de mute de canales para este auxiliar
    for (let ch = 1; ch <= this.channels; ch++) {
      const levelAddress = `/ch/${ch.toString().padStart(2, '0')}/mix/${auxNumber.toString().padStart(2, '0')}/level`;
      const muteAddress = `/ch/${ch.toString().padStart(2, '0')}/mix/${auxNumber.toString().padStart(2, '0')}/on`;
      this.client.send(levelAddress);
      this.client.send(muteAddress);
    }

    // También solicitar nombres de canales si no los tenemos
    for (let ch = 1; ch <= this.channels; ch++) {
      if (!this.channelNames.has(ch)) {
        const address = `/ch/${ch.toString().padStart(2, '0')}/config/name`;
        this.client.send(address);
      }
    }

    // Esperar más tiempo para que lleguen las respuestas OSC
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Solicitar datos una segunda vez para asegurar que lleguen
    for (let ch = 1; ch <= this.channels; ch++) {
      const levelAddress = `/ch/${ch.toString().padStart(2, '0')}/mix/${auxNumber.toString().padStart(2, '0')}/level`;
      const muteAddress = `/ch/${ch.toString().padStart(2, '0')}/mix/${auxNumber.toString().padStart(2, '0')}/on`;
      this.client.send(levelAddress);
      this.client.send(muteAddress);
    }
    
    // Esperar un poco más
    await new Promise(resolve => setTimeout(resolve, 300));

    const channels = [];
    for (let ch = 1; ch <= this.channels; ch++) {
      const key = `ch${ch}-aux${auxNumber}`;
      const mixerLevel = this.channelData.get(key) || 0;
      // Convertir del rango de la mixer (0-0.75) al rango de la UI (0-1)
      const uiLevel = mixerLevel / 0.75;
      const name = this.channelNames.get(ch) || `Canal ${ch}`;
      const isOn = this.channelMuteStates.get(key);
      const muted = isOn === false; // Si isOn es false, está muteado; si es undefined, asumimos unmuted
      
      channels.push({
        number: ch,
        name: name,
        level: Math.min(1, uiLevel), // Asegurarse de no exceder 1
        muted: muted
      });
    }

    console.log(`Datos auxiliar ${auxNumber}:`, channels.map(ch => `Ch${ch.number}: level=${ch.level.toFixed(2)}, muted=${ch.muted}, name="${ch.name}"`).join(' | '));

    return {
      auxNumber,
      name: `Auxiliar ${auxNumber}`,
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

    // Para XR18, el rango típico es 0.0 (silencio) a 0.75 (0dB/unity)
    // Mapear de nuestro rango 0-1 al rango real de la mixer
    const mixerLevel = Math.max(0, Math.min(0.75, level * 0.75));
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

  async muteChannel(auxNumber, channelNumber, muted = true) {
    if (!this.client || !this.connected) {
      throw new Error('No conectado a la mixer');
    }

    const onValue = muted ? 0 : 1; // 0 = muted, 1 = unmuted
    const address = `/ch/${channelNumber.toString().padStart(2, '0')}/mix/${auxNumber.toString().padStart(2, '0')}/on`;
    
    console.log(`Enviando mute: ${address} = ${onValue} (muted: ${muted})`);
    this.client.send(address, onValue);
    
    const key = `ch${channelNumber}-aux${auxNumber}`;
    this.channelMuteStates.set(key, !muted);

    console.log(`Estado mute actualizado: ${key} = ${!muted}`);

    return {
      channelNumber,
      auxNumber,
      muted: muted
    };
  }

  isConnected() {
    return this.connected;
  }

  disconnect() {
    if (this.client) {
      this.client.close();
    }
    if (this.server) {
      this.server.close();
    }
    this.connected = false;
    console.log('Desconectado de XR18');
  }
}

module.exports = XR18Controller;