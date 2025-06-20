// user-service/src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;
const SERVICE_NAME = process.env.SERVICE_NAME || 'AuthMiddleware';

exports.protect = (req, res, next) => {
  let token;
  console.log(`[${SERVICE_NAME}] Protect - Headers Authorization:`, req.headers.authorization);

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      if (!JWT_SECRET) {
          console.error(`[${SERVICE_NAME}] ERREUR CRITIQUE: JWT_SECRET n'est pas défini!`);
          return res.status(500).json({ message: "Erreur de configuration serveur (jwt secret)." });
      }
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log(`[${SERVICE_NAME}] Protect - Token décodé:`, decoded);
      req.user = { userId: decoded.userId, username: decoded.username, userType: decoded.userType };
      next();
      return; // Important
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Protect - Erreur vérification token:`, error.name, error.message);
      return res.status(401).json({ message: 'Non autorisé, token invalide ou expiré.' });
    }
  }
  
  console.log(`[${SERVICE_NAME}] Protect - Pas de token Bearer trouvé.`);
  return res.status(401).json({ message: 'Non autorisé, pas de token fourni ou format incorrect.' });
};

exports.isAdmin = (req, res, next) => {
  console.log(`[${SERVICE_NAME}] isAdmin Check - req.user:`, req.user);
  if (req.user && req.user.userType === 'ADMIN') {
    next();
  } else {
    res.status(403).json({ message: 'Accès refusé. Rôle administrateur requis.' });
  }
};