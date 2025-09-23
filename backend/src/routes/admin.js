const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

function createAdminRoutes(database, xr18Controller = null) {
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
      if (password && password.trim() !== '') updateData.password = password;
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

  // Auxiliary names management
  router.get('/auxiliary-names', async (req, res) => {
    try {
      const auxiliaryNames = await database.getAuxiliaryNames();
      res.json({ auxiliaryNames });
    } catch (error) {
      console.error('Error getting auxiliary names:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.put('/auxiliary-names/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { customName, useCustom } = req.body;
      
      if (!customName || customName.trim() === '') {
        return res.status(400).json({ error: 'Custom name is required' });
      }

      await database.setAuxiliaryName(parseInt(id), customName.trim(), useCustom);
      console.log(`Admin updated auxiliary ${id} name: "${customName}" (use custom: ${useCustom})`);
      
      // Refresh XR18Controller names if available
      if (xr18Controller) {
        await xr18Controller.refreshCustomNames();
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating auxiliary name:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.patch('/auxiliary-names/:id/toggle', async (req, res) => {
    try {
      const { id } = req.params;
      const { useCustom } = req.body;
      
      await database.toggleAuxiliaryCustomName(parseInt(id), useCustom);
      console.log(`Admin toggled auxiliary ${id} custom name: ${useCustom}`);
      
      // Refresh XR18Controller names if available
      if (xr18Controller) {
        await xr18Controller.refreshCustomNames();
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error toggling auxiliary custom name:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Channel names management
  router.get('/channel-names', async (req, res) => {
    try {
      const channelNames = await database.getChannelNames();
      res.json({ channelNames });
    } catch (error) {
      console.error('Error getting channel names:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.put('/channel-names/:number', async (req, res) => {
    try {
      const { number } = req.params;
      const { customName, useCustom } = req.body;
      
      if (!customName || customName.trim() === '') {
        return res.status(400).json({ error: 'Custom name is required' });
      }

      if (parseInt(number) < 1 || parseInt(number) > 32) {
        return res.status(400).json({ error: 'Invalid channel number' });
      }

      await database.setChannelName(parseInt(number), customName.trim(), useCustom);
      console.log(`Admin updated channel ${number} name: "${customName}" (use custom: ${useCustom})`);
      
      // Refresh XR18Controller names if available
      if (xr18Controller) {
        await xr18Controller.refreshCustomNames();
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating channel name:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.patch('/channel-names/:number/toggle', async (req, res) => {
    try {
      const { number } = req.params;
      const { useCustom } = req.body;
      
      if (parseInt(number) < 1 || parseInt(number) > 32) {
        return res.status(400).json({ error: 'Invalid channel number' });
      }

      await database.toggleChannelCustomName(parseInt(number), useCustom);
      console.log(`Admin toggled channel ${number} custom name: ${useCustom}`);
      
      // Refresh XR18Controller names if available
      if (xr18Controller) {
        await xr18Controller.refreshCustomNames();
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error toggling channel custom name:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

module.exports = createAdminRoutes;