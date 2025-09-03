const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

function createAdminRoutes(database) {
  // Apply admin middleware to all routes
  router.use(requireAdmin);

  // Get all users
  router.get('/users', async (req, res) => {
    try {
      const users = await database.getAllUsers();
      
      // Get auxiliaries for each user
      const usersWithAuxiliaries = await Promise.all(
        users.map(async (user) => {
          const auxiliaries = user.role === 'admin' ? 
            [1, 2, 3, 4, 5, 6] : 
            await database.getUserAuxiliaries(user.id);
          
          return {
            ...user,
            auxiliaries
          };
        })
      );

      res.json({ users: usersWithAuxiliaries });
    } catch (error) {
      console.error('Error getting users:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Create new user
  router.post('/users', async (req, res) => {
    try {
      const { username, password, role, auxiliaries } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }

      if (role && !['admin', 'regular'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      if (auxiliaries) {
        const invalidAux = auxiliaries.find(aux => aux < 1 || aux > 6);
        if (invalidAux) {
          return res.status(400).json({ error: 'Invalid auxiliary number' });
        }
      }

      const user = await database.createUser(username, password, role || 'regular');
      
      // Set auxiliaries for regular users
      if (user.role === 'regular' && auxiliaries && auxiliaries.length > 0) {
        await database.setUserAuxiliaries(user.id, auxiliaries);
      }

      console.log(`Admin created user: ${username} (${user.role})`);
      
      res.status(201).json({
        success: true,
        user: {
          ...user,
          auxiliaries: user.role === 'admin' ? [1, 2, 3, 4, 5, 6] : (auxiliaries || [])
        }
      });
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(400).json({ error: 'Username already exists' });
      }
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update user
  router.put('/users/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { username, password, role, auxiliaries } = req.body;
      
      const updateData = {};
      if (username) updateData.username = username;
      if (password) updateData.password = password;
      if (role && ['admin', 'regular'].includes(role)) updateData.role = role;

      if (auxiliaries) {
        const invalidAux = auxiliaries.find(aux => aux < 1 || aux > 6);
        if (invalidAux) {
          return res.status(400).json({ error: 'Invalid auxiliary number' });
        }
      }

      const result = await database.updateUser(parseInt(id), updateData);
      
      if (result.changes === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Update auxiliaries for regular users
      if (role === 'regular' && auxiliaries !== undefined) {
        await database.setUserAuxiliaries(parseInt(id), auxiliaries);
      }

      console.log(`Admin updated user ID ${id}`);
      
      res.json({ success: true });
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(400).json({ error: 'Username already exists' });
      }
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Delete user
  router.delete('/users/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const userId = parseInt(id);

      // Prevent deletion of current admin user
      if (req.session.user.id === userId) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }

      const result = await database.deleteUser(userId);
      
      if (result.changes === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      console.log(`Admin deleted user ID ${id}`);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Change user password
  router.post('/users/:id/password', async (req, res) => {
    try {
      const { id } = req.params;
      const { password } = req.body;
      
      if (!password || password.length < 1) {
        return res.status(400).json({ error: 'Password required' });
      }

      const result = await database.updateUser(parseInt(id), { password });
      
      if (result.changes === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      console.log(`Admin changed password for user ID ${id}`);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error changing password:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

module.exports = createAdminRoutes;