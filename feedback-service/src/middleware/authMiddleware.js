// src/middleware/authMiddleware.js (dans feedback-service)
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

exports.protect = (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) { // Espace après Bearer
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = { userId: decoded.userId, username: decoded.username, userType: decoded.userType }; // Stocker infos user
      next();
    } catch (error) {
      console.error('FeedbackService Auth Middleware - Erreur Token:', error.message);
      return res.status(401).json({ message: 'Non autorisé, token invalide ou expiré' });
    }
  } else {
    console.log('FeedbackService Auth Middleware - Pas de header Authorization Bearer.');
    return res.status(401).json({ message: 'Non autorisé, pas de token fourni ou format incorrect' });
  }
};