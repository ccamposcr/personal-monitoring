@echo off
setlocal enabledelayedexpansion

echo =============================================
echo    Personal Monitoring XR18 - Iniciando...
echo =============================================
echo.

:: Verificar que Node.js esté instalado
echo Verificando Node.js...
where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js no esta instalado.
    echo Por favor instala Node.js desde https://nodejs.org/
    echo.
    pause
    exit /b 1
)
echo Node.js encontrado
echo.

:: Verificar que npm esté instalado
echo Verificando npm...
where npm >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm no esta disponible.
    echo.
    pause
    exit /b 1
)
echo npm encontrado
echo.
echo Node.js y npm detectados correctamente
echo.

:: Cambiar al directorio del script
echo Cambiando al directorio del script...
cd /d "%~dp0"
echo Directorio actual: %CD%
echo.

:: Instalar dependencias del backend si es necesario
echo Verificando dependencias del backend...
cd backend
if not exist "node_modules\" (
    echo Instalando dependencias del backend...
    echo Esto puede tomar unos minutos...
    npm install
    if errorlevel 1 (
        echo ERROR: Fallo la instalacion de dependencias del backend
        echo.
        pause
        exit /b 1
    )
    echo Dependencias del backend instaladas correctamente
) else (
    echo Dependencias del backend ya instaladas
)
echo.

:: Instalar dependencias del frontend si es necesario
echo Verificando dependencias del frontend...
cd ..\frontend
if not exist "node_modules\" (
    echo Instalando dependencias del frontend...
    echo Esto puede tomar unos minutos...
    npm install
    if errorlevel 1 (
        echo ERROR: Fallo la instalacion de dependencias del frontend
        echo.
        pause
        exit /b 1
    )
    echo Dependencias del frontend instaladas correctamente
) else (
    echo Dependencias del frontend ya instaladas
)

echo.
echo =============================================
echo Todas las dependencias estan instaladas
echo =============================================
echo.
echo Iniciando servidores...
echo.
echo Backend corriendo en: http://localhost:3000
echo Frontend corriendo en: http://localhost:8080
echo.

:: Iniciar backend en segundo plano
echo Cambiando al directorio backend...
cd "%~dp0backend"
if not exist "package.json" (
    echo ERROR: No se encuentra package.json en el directorio backend
    echo Directorio actual: %CD%
    pause
    exit /b 1
)
echo.
echo Iniciando backend...
start "XR18 Backend" cmd /k "cd /d "%~dp0backend" && npm run dev"
echo Backend iniciado en nueva ventana

:: Esperar un momento para que el backend inicie
echo Esperando 3 segundos para que el backend inicie...
timeout /t 3 /nobreak >nul

:: Iniciar frontend
echo.
echo Cambiando al directorio frontend...
cd "%~dp0frontend"
if not exist "package.json" (
    echo ERROR: No se encuentra package.json en el directorio frontend
    echo Directorio actual: %CD%
    pause
    exit /b 1
)
echo.
echo Iniciando frontend...
start "XR18 Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"
echo Frontend iniciado en nueva ventana

:: Esperar un momento y abrir el navegador
echo.
echo Esperando 5 segundos antes de abrir el navegador...
timeout /t 5 /nobreak >nul
echo.
echo Abriendo navegador...
start http://localhost:8080
echo Navegador abierto

echo.
echo =============================================
echo    Aplicacion iniciada exitosamente!
echo =============================================
echo.
echo Se han abierto dos ventanas de comandos:
echo - Backend (puerto 3000)
echo - Frontend (puerto 8080)
echo.
echo La aplicacion deberia abrirse automaticamente en tu navegador.
echo.
echo Si no se abre automaticamente, ve a: http://localhost:8080
echo.
echo Para cerrar la aplicacion, cierra ambas ventanas de comando.
echo.
echo =============================================
echo IMPORTANTE: NO cierres esta ventana todavia!
echo Mantener esta ventana abierta ayuda a monitorear el proceso.
echo =============================================
echo.
echo Presiona cualquier tecla para cerrar esta ventana...
echo (Las aplicaciones seguiran corriendo en las otras ventanas)
echo.
pause >nul

echo.
echo Cerrando ventana de inicio...
echo Las aplicaciones siguen corriendo en las otras ventanas.
timeout /t 2 >nul