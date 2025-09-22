const os = require('os');

/**
 * Get the local network IP address
 * Returns the first non-internal IPv4 address found
 */
function getLocalNetworkIP() {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal addresses and IPv6
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  
  return '127.0.0.1'; // Fallback to localhost
}

/**
 * Generate CORS origins dynamically based on local IP and common ports
 */
function generateCorsOrigins() {
  const localIP = getLocalNetworkIP();
  const ports = [80, 3000];
  
  const origins = [
    process.env.FRONTEND_URL || "http://localhost",
    "http://localhost",        // Puerto 80 sin especificar
    "http://localhost:80",     // Puerto 80 explícito
    "http://localhost:3000"    // Backend API
  ];
  
  // Add origins for the detected local IP
  if (localIP !== '127.0.0.1') {
    ports.forEach(port => {
      if (port === 80) {
        // For port 80, add both with and without port (since 80 is default HTTP port)
        origins.push(`http://${localIP}`);
        origins.push(`http://${localIP}:${port}`);
      } else {
        origins.push(`http://${localIP}:${port}`);
      }
    });
  }
  
  console.log('Generated CORS origins:', origins);
  return origins;
}

/**
 * Discover XR18 mixer on the network using common IP patterns
 * This is a basic implementation - could be enhanced with actual network discovery
 */
function discoverMixerIP() {
  const localIP = getLocalNetworkIP();
  
  if (localIP === '127.0.0.1') {
    return '192.168.1.100'; // Default fallback
  }
  
  // Use the same network segment as the local IP
  const ipParts = localIP.split('.');
  const networkBase = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}`;
  
  // Common XR18 IP endings
  const commonEndings = [138, 100, 1, 2, 10];
  
  for (const ending of commonEndings) {
    const candidateIP = `${networkBase}.${ending}`;
    if (candidateIP !== localIP) {
      console.log(`Trying mixer IP: ${candidateIP}`);
      return candidateIP;
    }
  }
  
  // Fallback to .100 in the same network
  return `${networkBase}.100`;
}

module.exports = {
  getLocalNetworkIP,
  generateCorsOrigins,
  discoverMixerIP
};