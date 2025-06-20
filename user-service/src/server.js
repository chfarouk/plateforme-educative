// user-service/src/server.js
console.log(`--- USER-SERVICE: Démarrage du script server.js ---`); 

require('dotenv').config(); 
const express = require('express');
const cors = require('cors'); 
const userRoutes = require('./routes/userRoutes'); 
const db = require('./config/db'); 

const app = express();
const PORT = process.env.PORT || 3001;
const SERVICE_NAME = process.env.SERVICE_NAME || 'UserService'; 

console.log(`[${SERVICE_NAME}] Express app initialisée. Port cible: ${PORT}`); 

const corsOptions = {
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true 
};
app.use(cors(corsOptions));
console.log(`[${SERVICE_NAME}] Middleware CORS appliqué.`);

app.use(express.json());
console.log(`[${SERVICE_NAME}] Middleware express.json appliqué.`);

app.use((req, res, next) => {
  console.log(`[${SERVICE_NAME}] REQUÊTE: ${req.method} ${req.originalUrl} - Origin: ${req.headers.origin}`);
  if (req.method === 'OPTIONS') {
    console.log(`[${SERVICE_NAME}] Réponse OPTIONS pour ${req.originalUrl}`);
    return res.sendStatus(204); 
  }
  next();
});

app.get('/', (req, res) => {
  console.log(`[${SERVICE_NAME}] GET / (health check)`);
  res.send(`API du ${SERVICE_NAME} Fonctionne !`);
});
app.use('/api/users', userRoutes); 
console.log(`[${SERVICE_NAME}] Routes montées sur /api/users.`);

app.use((err, req, res, next) => {
  console.error(`[${SERVICE_NAME}] ERREUR GLOBALE:`, err.message);
  console.error(err.stack);
  res.status(err.status || 500).json({ 
    error: 'Erreur interne du serveur.',
    message: err.message, 
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined 
  });
});

const startServer = async () => {
  try {
    console.log(`[${SERVICE_NAME}] Connexion BDD & création tables...`);
    await db.createUsersTable(); 
    console.log(`[${SERVICE_NAME}] BDD et tables prêtes.`);

    app.listen(PORT, () => {
      console.log(`[${SERVICE_NAME}] Démarré sur port ${PORT}. En attente de requêtes...`);
    });
  } catch (error) {
    console.error(`[${SERVICE_NAME}] IMPOSSIBLE DE DÉMARRER:`, error);
    process.exit(1); 
  }
};

startServer();