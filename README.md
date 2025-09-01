# XR18 Monitor Mixer App

Una aplicación web completa para permitir a músicos y cantantes crear sus propias mezclas de monitores personales usando una mixer Behringer XR18.

## Características

- 🎛️ Interfaz de mixer en tiempo real optimizada para móviles
- 🎵 Control individual de 18 canales en 6 auxiliares
- 👥 Soporte multi-usuario simultáneo
- 🔄 Sincronización en tiempo real con la mixer XR18
- 📱 Diseño responsivo optimizado para smartphones
- ⚡ Comunicación bidireccional vía Socket.io y OSC

## Estructura del Proyecto

```
personal-monitoring/
├── backend/                 # Servidor Node.js
│   ├── src/
│   │   ├── app.js          # Servidor principal
│   │   └── controllers/
│   │       └── XR18Controller.js # Control OSC de la mixer
│   ├── package.json
│   └── .env
└── frontend/               # Cliente Vue.js
    ├── src/
    │   ├── components/
    │   │   └── ChannelStrip.vue
    │   ├── views/
    │   │   └── MixerView.vue
    │   ├── composables/
    │   │   └── useSocket.js
    │   └── assets/styles/
    │       └── main.scss
    ├── package.json
    └── .env
```

## Instalación

### Backend

```bash
cd backend
npm install
```

Configura tu archivo `.env`:

```env
PORT=3000
XR18_IP=192.168.1.100  # IP de tu mixer XR18
XR18_PORT=10024        # Puerto OSC de la XR18
FRONTEND_URL=http://localhost:5173
```

### Frontend

```bash
cd frontend
npm install
```

Configura tu archivo `.env`:

```env
VITE_BACKEND_URL=http://localhost:3000
```

## Uso

### 1. Iniciar el Backend

```bash
cd backend
npm run dev
```

El servidor estará disponible en `http://localhost:3000`

### 2. Iniciar el Frontend

```bash
cd frontend
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

### 3. Conectar con la XR18

1. Asegúrate de que tu mixer XR18 esté conectada a la misma red
2. Configura la IP correcta en el archivo `.env` del backend
3. La aplicación se conectará automáticamente al mixer

## Funcionalidades Principales

### Selección de Auxiliar
- Dropdown para seleccionar entre los 6 auxiliares disponibles
- Indicador de usuarios conectados al mismo auxiliar
- Sincronización automática al cambiar de auxiliar

### Control de Canales
- 18 faders verticales para controlar el nivel de cada canal
- Botones de mute/unmute individuales
- Visualización del nivel actual en porcentaje
- Controles táctiles optimizados para móviles

### Comunicación en Tiempo Real
- Sincronización instantánea entre usuarios
- Updates bidireccionales con la mixer física
- Reconexión automática en caso de pérdida de conexión

## API OSC de la XR18

La aplicación utiliza los siguientes comandos OSC:

- `/ch/XX/mix/YY/level` - Control de nivel de canal XX en auxiliar YY
- `/xremote` - Mantener conexión activa
- `/info` - Información del mixer

## Optimizaciones para Móviles

- Interfaz táctil responsive
- Prevención de zoom no deseado
- Gestos optimizados para faders
- Diseño adaptativo para diferentes tamaños de pantalla
- Prevención de selección accidental de texto

## Tecnologías Utilizadas

### Backend
- **Node.js** - Runtime
- **Express.js** - Framework web
- **Socket.io** - Comunicación en tiempo real
- **node-osc** - Protocolo OSC para comunicación con XR18

### Frontend
- **Vue.js 3** - Framework frontend
- **Socket.io-client** - Cliente de tiempo real
- **Vite** - Build tool y dev server
- **SCSS** - Preprocesador CSS

## Configuración de Red

Para usar en una red local:

1. Cambia `VITE_BACKEND_URL` por la IP del servidor backend
2. Asegúrate de que todos los dispositivos estén en la misma red que la XR18
3. Configura la IP correcta de la XR18 en el backend

## Troubleshooting

### No se conecta a la mixer
- Verifica que la IP de la XR18 sea correcta
- Asegúrate de que el puerto OSC esté habilitado en la mixer
- Revisa que no haya firewalls bloqueando la conexión

### Los faders no responden
- Verifica la conexión WebSocket en las herramientas de desarrollo
- Revisa que el backend esté ejecutándose correctamente
- Comprueba la consola por errores de OSC

## Licencia

MIT License