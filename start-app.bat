@echo off
echo =============================================
echo    Personal Monitoring XR18 - Iniciando...
echo =============================================
echo.

:: Verificar que Node.js esté instalado
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js no está instalado.
    echo Por favor instala Node.js desde https://nodejs.org/
    pause
    exit /b 1
)

:: Verificar que npm esté instalado
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm no está disponible.
    pause
    exit /b 1
)

echo ✓ Node.js y npm detectados correctamente
echo.

:: Cambiar al directorio del script
cd /d "%~dp0"

:: Instalar dependencias del backend si es necesario
echo Verificando dependencias del backend...
cd backend
if not exist "node_modules\" (
    echo Instalando dependencias del backend...
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Falló la instalación de dependencias del backend
        pause
        exit /b 1
    )
)

:: Instalar dependencias del frontend si es necesario
echo Verificando dependencias del frontend...
cd ..\frontend
if not exist "node_modules\" (
    echo Instalando dependencias del frontend...
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Falló la instalación de dependencias del frontend
        pause
        exit /b 1
    )
)

echo.
echo ✓ Todas las dependencias están instaladas
echo.
echo Iniciando servidores...
echo.
echo Backend corriendo en: http://localhost:3000
echo Frontend corriendo en: http://localhost:80
echo.
echo Para detener la aplicación, presiona Ctrl+C
echo.

:: Iniciar backend en segundo plano
cd ..\backend
start "XR18 Backend" cmd /c "npm run dev"

:: Esperar un momento para que el backend inicie
timeout /t 3 /nobreak >nul

:: Iniciar frontend
cd ..\frontend
start "XR18 Frontend" cmd /c "npm run dev"

:: Esperar un momento y abrir el navegador
timeout /t 5 /nobreak >nul
start http://localhost

echo.
echo =============================================
echo    Aplicación iniciada exitosamente!
echo =============================================
echo.
echo Las ventanas de los servidores se abrieron en segundo plano.
echo La aplicación debería abrirse automáticamente en tu navegador.
echo.
echo Si no se abre automáticamente, ve a: http://localhost
echo.
pause