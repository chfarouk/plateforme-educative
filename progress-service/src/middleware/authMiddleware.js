// src/middleware/authMiddleware.js (dans progress-service)
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

exports.protect = (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      // Important : On stocke l'ID de l'utilisateur DANS la requête pour l'utiliser dans les controllers
      req.user = { userId: decoded.userId, username: decoded.username, userType: decoded.userType };
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Non autorisé, token invalide ou expiré' });
    }
  }
  if (!token) {
    return res.status(401).json({ message: 'Non autorisé, pas de token' });
  }
};