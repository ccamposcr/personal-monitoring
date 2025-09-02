const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const XR18Controller = require('./controllers/XR18Controller');

const app = express();
const server = createServer(app);

app.use(cors({
  origin: [
    process.env.FRONTEND_URL || "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:4173",
    "http://localhost:8080",
    "http://192.168.2.175:5173"
  ],
  methods: ["GET", "POST"]
}));

app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost:4173",
      "http://localhost:8080",
      "http://192.168.2.175:5173"
    ],
    methods: ["GET", "POST"]
  }
});

const xr18 = new XR18Controller();

const connectedUsers = new Map();
const auxiliaryUsers = new Map();

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
  res.json({
    auxiliaries: Array.from({ length: 6 }, (_, i) => ({
      id: i + 1,
      name: `Auxiliar ${i + 1}`,
      userCount: auxiliaryUsers.get(i + 1)?.size || 0
    }))
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  xr18.connect();
});