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

/**
 * Alternative approach: Try to detect local network IP
 * This is more complex but can work in some scenarios
 */
export async function detectLocalIP() {
  try {
    // This uses WebRTC to detect local IP
    const pc = new RTCPeerConnection({
      iceServers: []
    });
    
    pc.createDataChannel('');
    
    return new Promise((resolve) => {
      pc.onicecandidate = (ice) => {
        if (!ice || !ice.candidate || !ice.candidate.candidate) return;
        
        const myIP = /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/.exec(ice.candidate.candidate);
        if (myIP) {
          resolve(myIP[1]);
          pc.close();
        }
      };
      
      pc.createOffer().then(offer => pc.setLocalDescription(offer));
      
      // Fallback after 2 seconds
      setTimeout(() => resolve(null), 2000);
    });
  } catch (error) {
    console.warn('Could not detect local IP:', error);
    return null;
  }
}