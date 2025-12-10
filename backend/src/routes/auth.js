const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { generateToken, requireJWT } = require('../middleware/jwt');
const router = express.Router();

function createAuthRoutes(database) {
  // Get all users for dropdown
  router.get('/users', async (req, res) => {
    try {
      const users = await database.getAllUsers();
      // Only return username and role for security
      const userList = users.map(user => ({
        username: user.username,
        role: user.role
      }));
      res.json({ users: userList });
    } catch (error) {
      console.error('Error getting users:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Login route with enhanced logging and JWT support
  router.post('/login', async (req, res) => {
    const startTime = Date.now();
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    
    try {
      const { username, password, useJWT = false } = req.body;
      
      // Enhanced logging for diagnosis
      console.log(`🔐 Login attempt - IP: ${clientIP}, User-Agent: ${userAgent?.substring(0, 50)}...`);
      console.log(`📝 Login data - Username: "${username}", Password length: ${password?.length}, UseJWT: ${useJWT}`);
      
      // Validate and sanitize input
      if (!username || !password) {
        console.log('❌ Login failed - Missing credentials');
        return res.status(400).json({ error: 'Username and password required' });
      }
      
      // Trim whitespace that might come from autocomplete
      const cleanUsername = username.trim();
      const cleanPassword = password.trim();
      
      if (cleanUsername !== username || cleanPassword !== password) {
        console.log(`⚠️  Whitespace detected - Original: "${username}"|"${password}", Clean: "${cleanUsername}"|"${cleanPassword}"`);
      }

      const user = await database.verifyPassword(cleanUsername, cleanPassword);
      
      if (!user) {
        const duration = Date.now() - startTime;
        console.log(`❌ Login failed - Invalid credentials for "${cleanUsername}" (${duration}ms)`);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const userResponse = {
        id: user.id,
        username: user.username,
        role: user.role
      };

      // Generate JWT token (always)
      const token = generateToken(user);
      console.log(`🎫 JWT token generated for ${username}`);
      
      const duration = Date.now() - startTime;
      console.log(`✅ User logged in: ${username} (${user.role}) - ${duration}ms`);
      
      const response = {
        success: true,
        user: userResponse,
        token: token
      };

      res.json(response);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`💥 Login error (${duration}ms):`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Logout route
  router.post('/logout', (req, res) => {
    res.json({ success: true });
  });

  // Get current user (JWT only)
  router.get('/me', requireJWT, async (req, res) => {
    try {
      // User comes from JWT token
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({ error: 'No user data available' });
      }
      
      let auxiliaries = [];

      if (user.role === 'regular') {
        auxiliaries = await database.getUserAuxiliaries(user.id);
      } else {
        // Admins have access to all auxiliaries
        auxiliaries = [1, 2, 3, 4, 5, 6];
      }

      res.json({
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        },
        auxiliaries
      });
    } catch (error) {
      console.error('Error getting user info:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

module.exports = createAuthRoutes;