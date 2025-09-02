const osc = require('node-osc');

class XR18Controller {
  constructor() {
    this.mixerIP = process.env.XR18_IP || '192.168.1.100';
    this.mixerPort = parseInt(process.env.XR18_PORT) || 10024;
    this.client = null;
    this.server = null;
    this.connected = false;
    this.channelData = new Map();
    
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
      
      this.requestAllLevels();
      
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
        const address = `/ch/${ch.toString().padStart(2, '0')}/mix/${aux.toString().padStart(2, '0')}/level`;
        this.client.send(address);
      }
    }
  }

  async getAuxiliaryLevels(auxNumber) {
    if (!this.client || !this.connected) {
      throw new Error('No conectado a la mixer');
    }

    for (let ch = 1; ch <= this.channels; ch++) {
      const address = `/ch/${ch.toString().padStart(2, '0')}/mix/${auxNumber.toString().padStart(2, '0')}/level`;
      this.client.send(address);
    }

    await new Promise(resolve => setTimeout(resolve, 100));

    const channels = [];
    for (let ch = 1; ch <= this.channels; ch++) {
      const key = `ch${ch}-aux${auxNumber}`;
      const level = this.channelData.get(key) || 0;
      
      channels.push({
        number: ch,
        name: `Canal ${ch}`,
        level: level,
        muted: level === 0
      });
    }

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

    const clampedLevel = Math.max(0, Math.min(1, level));
    const address = `/ch/${channelNumber.toString().padStart(2, '0')}/mix/${auxNumber.toString().padStart(2, '0')}/level`;
    
    this.client.send(address, clampedLevel);
    
    const key = `ch${channelNumber}-aux${auxNumber}`;
    this.channelData.set(key, clampedLevel);

    return {
      channelNumber,
      auxNumber,
      level: clampedLevel
    };
  }

  async muteChannel(auxNumber, channelNumber, muted = true) {
    const level = muted ? 0 : 0.75;
    return this.setChannelLevel(auxNumber, channelNumber, level);
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