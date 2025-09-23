#!/bin/bash

echo "============================================="
echo "   Personal Monitoring XR18 - Iniciando..."
echo "============================================="
echo

# Función para verificar si un comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Función para cleanup al salir
cleanup() {
    echo
    echo "Deteniendo servidores..."
    # Matar procesos en los puertos específicos
    pkill -f "npm run dev" >/dev/null 2>&1
    pkill -f "node.*backend" >/dev/null 2>&1
    pkill -f "vite" >/dev/null 2>&1
    echo "Servidores detenidos."
    exit 0
}

# Configurar trap para cleanup
trap cleanup SIGINT SIGTERM

# Verificar que Node.js esté instalado
if ! command_exists node; then
    echo "ERROR: Node.js no está instalado."
    echo "Por favor instala Node.js desde https://nodejs.org/"
    exit 1
fi

# Verificar que npm esté instalado
if ! command_exists npm; then
    echo "ERROR: npm no está disponible."
    exit 1
fi

echo "✓ Node.js y npm detectados correctamente"
echo

# Obtener el directorio del script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Instalar dependencias del backend si es necesario
echo "Verificando dependencias del backend..."
cd backend
if [ ! -d "node_modules" ]; then
    echo "Instalando dependencias del backend..."
    npm install
    if [ $? -ne 0 ]; then
        echo "ERROR: Falló la instalación de dependencias del backend"
        exit 1
    fi
fi

# Instalar dependencias del frontend si es necesario
echo "Verificando dependencias del frontend..."
cd ../frontend
if [ ! -d "node_modules" ]; then
    echo "Instalando dependencias del frontend..."
    npm install
    if [ $? -ne 0 ]; then
        echo "ERROR: Falló la instalación de dependencias del frontend"
        exit 1
    fi
fi

echo
echo "✓ Todas las dependencias están instaladas"
echo
echo "Iniciando servidores..."
echo
echo "Backend corriendo en: http://localhost:3000"
echo "Frontend corriendo en: http://localhost:80"
echo
echo "Para detener la aplicación, presiona Ctrl+C"
echo

# Iniciar backend en segundo plano
cd ../backend
npm run dev &
BACKEND_PID=$!

# Esperar un momento para que el backend inicie
sleep 3

# Iniciar frontend en segundo plano
cd ../frontend
npm run dev &
FRONTEND_PID=$!

# Esperar un momento y tratar de abrir el navegador
sleep 5

# Intentar abrir el navegador (funciona en macOS y Linux)
if command_exists open; then
    # macOS
    open http://localhost
elif command_exists xdg-open; then
    # Linux
    xdg-open http://localhost >/dev/null 2>&1
elif command_exists sensible-browser; then
    # Linux alternativo
    sensible-browser http://localhost >/dev/null 2>&1
fi

echo
echo "============================================="
echo "   Aplicación iniciada exitosamente!"
echo "============================================="
echo
echo "Los servidores están corriendo en segundo plano."
echo "La aplicación debería abrirse automáticamente en tu navegador."
echo
echo "Si no se abre automáticamente, ve a: http://localhost"
echo
echo "Presiona Ctrl+C para detener la aplicación..."
echo

# Esperar indefinidamente hasta que el usuario presione Ctrl+C
wait