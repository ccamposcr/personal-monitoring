const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  
  next();
};

const checkAuxiliaryAccess = (database) => {
  return async (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Admins have access to all auxiliaries
    if (req.session.user.role === 'admin') {
      return next();
    }

    // For regular users, check if they have access to the requested auxiliary
    const auxNumber = parseInt(req.params.auxNumber || req.body.auxNumber);
    if (!auxNumber) {
      return res.status(400).json({ error: 'Auxiliary number required' });
    }

    try {
      const userAuxiliaries = await database.getUserAuxiliaries(req.session.user.id);
      
      if (!userAuxiliaries.includes(auxNumber)) {
        return res.status(403).json({ error: 'Access to this auxiliary not permitted' });
      }
      
      next();
    } catch (error) {
      console.error('Error checking auxiliary access:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

module.exports = {
  requireAuth,
  requireAdmin,
  checkAuxiliaryAccess
};