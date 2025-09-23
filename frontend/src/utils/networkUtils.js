/**
 * Get the backend URL dynamically based on the current network
 * Falls back to localhost if unable to detect
 */
export function getBackendUrl() {
  // In development, try to detect the local IP
  if (import.meta.env.DEV) {
    // Use the current hostname but replace with detected IP if available
    const hostname = window.location.hostname;
    
    // If we're already on a local IP, use it
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `http://${hostname}:3000`;
    }
    
    // For localhost, we'll need to make a best guess
    // This could be enhanced with network detection if needed
    return 'http://localhost:3000';
  }
  
  // In production, use the same host as the frontend
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  return `${protocol}//${hostname}:3000`;
}

