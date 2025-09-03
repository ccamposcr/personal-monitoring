#!/bin/bash

echo "🎛️  Instalando ICCR Monitoreo Personal App..."

echo "📦 Instalando dependencias del backend..."
cd backend
npm install

echo "📱 Instalando dependencias del frontend..."
cd ../frontend
npm install

echo "✅ Instalación completada!"
echo ""
echo "Para ejecutar la aplicación:"
echo "1. Backend: cd backend && npm run dev"
echo "2. Frontend: cd frontend && npm run dev"
echo ""
echo "Configura las IPs en los archivos .env antes de ejecutar."