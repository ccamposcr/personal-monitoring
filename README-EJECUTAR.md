# Personal Monitoring XR18 - Guía de Ejecución

## 🚀 Inicio Rápido

Esta aplicación incluye scripts ejecutables para facilitar su uso. Solo necesitas hacer **doble clic** en el archivo correspondiente a tu sistema operativo:

### Windows
- **Archivo**: `start-app.bat`
- **Uso**: Doble clic en el archivo `start-app.bat`

### macOS / Linux
- **Archivo**: `start-app.sh`
- **Uso**: Doble clic en el archivo `start-app.sh`

## ✅ Requisitos Previos

**Solo necesitas tener instalado:**
- **Node.js** (versión 16 o superior) - [Descargar aquí](https://nodejs.org/)

*Los scripts se encargarán automáticamente de instalar todas las dependencias necesarias.*

## 🔧 ¿Qué hace el script automáticamente?

1. ✅ Verifica que Node.js y npm estén instalados
2. ✅ Instala las dependencias del backend (si es necesario)
3. ✅ Instala las dependencias del frontend (si es necesario)
4. ✅ Inicia el servidor backend en `http://localhost:3000`
5. ✅ Inicia el servidor frontend en `http://localhost:80`
6. ✅ Abre automáticamente la aplicación en tu navegador

## 🌐 Acceso a la Aplicación

Una vez ejecutado el script, la aplicación estará disponible en:
- **URL Principal**: http://localhost
- **URL Alternativa**: http://localhost:80

## 🛑 Detener la Aplicación

Para detener la aplicación:
- Presiona `Ctrl + C` en la ventana de comandos
- O simplemente cierra las ventanas de terminal/comandos

## 🔑 Credenciales por Defecto

- **Usuario**: `produccion`
- **Contraseña**: `12345`

## 📝 Notas Importantes

- **Puerto 80**: La aplicación usa el puerto 80 por defecto. Si tienes otro servicio corriendo en este puerto, debes detenerlo primero.
- **Red Local**: La aplicación está configurada para ejecutarse en una red local.
- **Primera Ejecución**: La primera vez puede tomar unos minutos mientras se descargan e instalan las dependencias.

## 🆘 Solución de Problemas

### Error: "Puerto en uso"
Si aparece un error de puerto en uso:
1. Cierra cualquier otra aplicación web que esté corriendo
2. Reinicia tu computadora si es necesario
3. Ejecuta el script nuevamente

### Error: "Node.js no encontrado"
1. Instala Node.js desde [nodejs.org](https://nodejs.org/)
2. Reinicia tu terminal/computadora
3. Ejecuta el script nuevamente

### La aplicación no se abre automáticamente
Ve manualmente a: http://localhost

## 📞 Soporte

Si encuentras algún problema, revisa que:
1. Node.js esté correctamente instalado
2. No haya otras aplicaciones usando el puerto 80
3. Tengas conexión a internet para la descarga de dependencias

---

**¡Listo! Con estos scripts, cualquier persona puede ejecutar la aplicación fácilmente.**