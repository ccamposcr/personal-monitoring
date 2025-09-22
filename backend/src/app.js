const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const session = require('express-session');
require('dotenv').config();

const XR18Controller = require('./controllers/XR18Controller');
const { generateCorsOrigins } = require('./utils/networkUtils');
const Database = require('./models/database');
const createAuthRoutes = require('./routes/auth');
const createAdminRoutes = require('./routes/admin');
const { requireAuth, checkAuxiliaryAccess } = require('./middleware/auth');

const app = express();
const server = createServer(app);

app.use(cors({
  origin: generateCorsOrigins(),
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json());

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'xr18-monitor-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true if using HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

const io = new Server(server, {
  cors: {
    origin: generateCorsOrigins(),
    methods: ["GET", "POST"],
    credentials: true
  }
});

const xr18 = new XR18Controller();
const database = new Database();

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

// Socket.IO authentication middleware
io.use((socket, next) => {
  const sessionData = socket.handshake.auth.session;
  if (!sessionData || !sessionData.user) {
    return next(new Error('Authentication error'));
  }
  
  socket.user = sessionData.user;
  next();
});

io.on('connection', (socket) => {
  console.log('Usuario conectado:', socket.id, `- ${socket.user.username} (${socket.user.role})`);
  
  connectedUsers.set(socket.id, {
    id: socket.id,
    user: socket.user,
    currentAux: null,
    joinedAt: new Date()
  });

  socket.on('join-auxiliary', async (auxNumber) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    // Check if user has access to this auxiliary
    if (socket.user.role !== 'admin') {
      try {
        const allowedAuxiliaries = await database.getUserAuxiliaries(socket.user.id);
        if (!allowedAuxiliaries.includes(auxNumber)) {
          socket.emit('error', 'No tienes acceso a este auxiliar');
          return;
        }
      } catch (error) {
        console.error('Error checking auxiliary access:', error);
        socket.emit('error', 'Error de autenticación');
        return;
      }
    }

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

// Routes
app.use('/auth', createAuthRoutes(database));
app.use('/admin', createAdminRoutes(database));

app.get('/health', (req, res) => {
  res.json({ status: 'OK', mixer: xr18.isConnected() });
});

app.get('/auxiliaries', requireAuth, async (req, res) => {
  try {
    console.log(`GET /auxiliaries - User: ${req.session.user.username} (${req.session.user.role})`);
    
    let allowedAuxiliaries;
    
    if (req.session.user.role === 'admin') {
      allowedAuxiliaries = [1, 2, 3, 4, 5, 6];
    } else {
      allowedAuxiliaries = await database.getUserAuxiliaries(req.session.user.id);
    }

    const allAuxiliaries = Array.from({ length: 6 }, (_, i) => ({
      id: i + 1,
      name: xr18.getAuxiliaryName(i + 1),
      userCount: auxiliaryUsers.get(i + 1)?.size || 0,
      allowed: allowedAuxiliaries.includes(i + 1)
    }));

    // Filter to only show allowed auxiliaries for regular users
    const auxiliaries = req.session.user.role === 'admin' ? 
      allAuxiliaries : 
      allAuxiliaries.filter(aux => aux.allowed);

    console.log('Enviando auxiliares:', auxiliaries.map(a => `${a.name} (${a.allowed ? 'allowed' : 'denied'})`));
    res.json({ auxiliaries });
  } catch (error) {
    console.error('Error getting auxiliaries:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;

// Initialize database and start server
database.init().then(() => {
  console.log('✅ Database initialized successfully');
  
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en puerto ${PORT} (todas las interfaces)`);
    xr18.connect();
    
    // Limpiar cualquier throttling previo y resetear todos los canales a mínimo después de la conexión
    setTimeout(async () => {
      try {
        xr18.clearAllThrottling(); // Limpiar estado de throttling previo
        await xr18.resetAllChannelsToMinimum();
      } catch (error) {
        console.error('Error durante reseteo inicial de canales:', error);
      }
    }, 3000); // Esperar 3 segundos para asegurar que la conexión esté establecida
  });
}).catch((error) => {
  console.error('❌ Failed to initialize database:', error);
  process.exit(1);
});