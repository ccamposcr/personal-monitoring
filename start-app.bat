@echo off
setlocal enabledelayedexpansion

echo =============================================
echo    Personal Monitoring XR18 - Inicio Simple
echo =============================================
echo.

:: Cambiar al directorio del script
cd /d "%~dp0"

echo NOTA: Este script asume que ya instalaste las dependencias.
echo.
echo Si aun NO has instalado las dependencias, cierra este script y:
echo   1. Abre una terminal en la carpeta 'backend' y ejecuta: npm install
echo   2. Abre una terminal en la carpeta 'frontend' y ejecuta: npm install
echo   3. Luego ejecuta este script nuevamente.
echo.

:: Verificar que existan las dependencias
if not exist "backend\node_modules\" (
    echo ERROR: No se encontraron dependencias del backend.
    echo Por favor ejecuta 'npm install' en la carpeta backend primero.
    echo.
    exit /b 1
)

if not exist "frontend\node_modules\" (
    echo ERROR: No se encontraron dependencias del frontend.
    echo Por favor ejecuta 'npm install' en la carpeta frontend primero.
    echo.
    exit /b 1
)

echo =============================================
echo Dependencias encontradas. Iniciando servidores...
echo =============================================
echo.

:: Iniciar backend
echo Iniciando backend en nueva ventana...
start "XR18 Backend" cmd /k "cd /d "%~dp0backend" && npm run dev"
echo Backend iniciado

:: Esperar 3 segundos
timeout /t 3 /nobreak >nul

:: Iniciar frontend
echo.
echo Iniciando frontend en nueva ventana...
start "XR18 Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"
echo Frontend iniciado

:: Esperar 5 segundos y abrir navegador
echo.
echo Esperando 5 segundos antes de abrir el navegador...
timeout /t 5 /nobreak >nul

echo.
echo Abriendo navegador en http://localhost:8080...
start http://localhost:8080

echo.
echo =============================================
echo    Aplicacion iniciada exitosamente!
echo =============================================
echo.
echo Se han abierto dos ventanas:
echo - Backend en puerto 3000
echo - Frontend en puerto 8080
echo.
echo Para detener la aplicacion, cierra ambas ventanas.
echo.
