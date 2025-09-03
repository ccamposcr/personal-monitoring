const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const router = express.Router();

function createAuthRoutes(database) {
  // Login route
  router.post('/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }

      const user = await database.verifyPassword(username, password);
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Create session
      req.session.user = user;
      
      console.log(`User logged in: ${username} (${user.role})`);
      
      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Logout route
  router.post('/logout', (req, res) => {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error('Logout error:', err);
          return res.status(500).json({ error: 'Could not log out' });
        }
        res.json({ success: true });
      });
    } else {
      res.json({ success: true });
    }
  });

  // Get current user
  router.get('/me', requireAuth, async (req, res) => {
    try {
      const user = req.session.user;
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