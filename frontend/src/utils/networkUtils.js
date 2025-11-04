/**
 * Get the backend URL dynamically based on the current network
 * Falls back to localhost if unable to detect
 */
export function getBackendUrl() {
  // In development, try to detect the local IP
  if (import.meta.env.DEV) {
    // Use the current hostname but replace with detected IP if available
    const hostname = window.location.hostname;
    
    // Backend is always HTTP in development (port 3000)
    // Frontend can be HTTPS (port 8080) but backend stays HTTP
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `http://${hostname}:3000`;
    }
    
    // For localhost, always use HTTP for backend
    return 'http://localhost:3000';
  }
  
  // In production, use the same host as the frontend
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  return `${protocol}//${hostname}:3000`;
}

