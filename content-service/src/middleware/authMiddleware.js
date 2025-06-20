// src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

exports.protect = (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = { userId: decoded.userId, username: decoded.username, userType: decoded.userType };
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Non autorisé, token invalide' });
    }
  }
  if (!token) {
    return res.status(401).json({ message: 'Non autorisé, pas de token' });
  }
};

// Middleware pour vérifier si l'utilisateur est un admin
exports.isAdmin = (req, res, next) => {
  if (req.user && req.user.userType === 'ADMIN') {
    next();
  } else {
    res.status(403).json({ message: 'Accès refusé. Rôle administrateur requis.' });
  }
};