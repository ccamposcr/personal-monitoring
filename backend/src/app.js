const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const XR18Controller = require('./controllers/XR18Controller');
const { generateCorsOrigins } = require('./utils/networkUtils');

const app = express();
const server = createServer(app);

app.use(cors({
  origin: generateCorsOrigins(),
  methods: ["GET", "POST"]
}));

app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: generateCorsOrigins(),
    methods: ["GET", "POST"]
  }
});

const xr18 = new XR18Controller();

const connectedUsers = new Map();
const auxiliaryUsers = new Map();

// Configurar callback para sincronización en tiempo real
xr18.setLevelChangeCallback((data) => {
  const { auxNumber, channelNumber, level } = data;
  console.log(`Sincronizando cambio: Ch${channelNumber} Aux${auxNumber} = ${level.toFixed(3)}`);
  
  // Broadcast el cambio a todos los usuarios conectados a este auxiliar
  io.to(`aux-${auxNumber}`).emit('channel-updated', {
    channelNumber,
    level
  });
});

io.on('connection', (socket) => {
  console.log('Usuario conectado:', socket.id);
  
  connectedUsers.set(socket.id, {
    id: socket.id,
    currentAux: null,
    joinedAt: new Date()
  });

  socket.on('join-auxiliary', async (auxNumber) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    if (user.currentAux) {
      socket.leave(`aux-${user.currentAux}`);
      const currentUsers = auxiliaryUsers.get(user.currentAux) || new Set();
      currentUsers.delete(socket.id);
      if (currentUsers.size === 0) {
        auxiliaryUsers.delete(user.currentAux);
        // Parar polling activo si no quedan usuarios en este auxiliar
        xr18.stopActivePolling(user.currentAux);
      } else {
        auxiliaryUsers.set(user.currentAux, currentUsers);
      }
      io.to(`aux-${user.currentAux}`).emit('user-count-updated', currentUsers.size);
    }

    user.currentAux = auxNumber;
    socket.join(`aux-${auxNumber}`);
    
    const auxUsers = auxiliaryUsers.get(auxNumber) || new Set();
    auxUsers.add(socket.id);
    auxiliaryUsers.set(auxNumber, auxUsers);

    try {
      const auxData = await xr18.getAuxiliaryLevels(auxNumber);
      socket.emit('auxiliary-data', auxData);
      io.to(`aux-${auxNumber}`).emit('user-count-updated', auxUsers.size);
      
      // Iniciar polling activo para este auxiliar si es el primer usuario
      if (auxUsers.size === 1) {
        xr18.startActivePolling(auxNumber);
      }
    } catch (error) {
      console.error('Error obteniendo datos del auxiliar:', error);
      socket.emit('error', 'No se pudo conectar con la mixer XR18');
    }
  });

  socket.on('update-channel-level', async (data) => {
    const { auxNumber, channelNumber, level } = data;
    
    try {
      await xr18.setChannelLevel(auxNumber, channelNumber, level);
      socket.to(`aux-${auxNumber}`).emit('channel-updated', {
        channelNumber,
        level
      });
    } catch (error) {
      console.error('Error actualizando canal:', error);
      socket.emit('error', 'Error actualizando el canal');
    }
  });


  socket.on('disconnect', () => {
    console.log('Usuario desconectado:', socket.id);
    
    const user = connectedUsers.get(socket.id);
    if (user && user.currentAux) {
      const auxUsers = auxiliaryUsers.get(user.currentAux);
      if (auxUsers) {
        auxUsers.delete(socket.id);
        if (auxUsers.size === 0) {
          auxiliaryUsers.delete(user.currentAux);
          // Parar polling activo si no quedan usuarios en este auxiliar
          xr18.stopActivePolling(user.currentAux);
        } else {
          auxiliaryUsers.set(user.currentAux, auxUsers);
        }
        io.to(`aux-${user.currentAux}`).emit('user-count-updated', auxUsers.size);
      }
    }
    
    connectedUsers.delete(socket.id);
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', mixer: xr18.isConnected() });
});

app.get('/auxiliaries', (req, res) => {
  console.log(`GET /auxiliaries - IP: ${req.ip}, User-Agent: ${req.get('User-Agent')}`);
  const auxiliaries = Array.from({ length: 6 }, (_, i) => ({
    id: i + 1,
    name: xr18.getAuxiliaryName(i + 1),
    userCount: auxiliaryUsers.get(i + 1)?.size || 0
  }));
  console.log('Enviando auxiliares:', auxiliaries);
  res.json({ auxiliaries });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en puerto ${PORT} (todas las interfaces)`);
  xr18.connect();
});