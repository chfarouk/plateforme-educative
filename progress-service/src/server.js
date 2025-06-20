// src/server.js (dans progress-service)
require('dotenv').config();
const express = require('express');
const progressRoutes = require('./routes/progressRoutes');
const db = require('./config/db');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3003;

console.log(`[${process.env.SERVICE_NAME || 'Backend'}] Express app initialisée.`); 

app.use((req, res, next) => {
  console.log(`[${process.env.SERVICE_NAME || 'Backend'}] REQUÊTE ENTRANTE: ${req.method} ${req.originalUrl} - Headers Origin: ${req.headers.origin}`);
  next();
});

// --- CONFIGURATION CORS ---
const corsOptions = {
  origin: 'http://localhost:5173', // L'origine de votre frontend Vite
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true // Si vous prévoyez d'utiliser des cookies à l'avenir
};


app.use(cors(corsOptions));
console.log(`[${process.env.SERVICE_NAME || 'Backend'}] Middleware CORS appliqué.`);

app.use(express.json());

app.use((req, res, next) => {
  console.log(`ProgressService: ${req.method} ${req.url}`);
  next();
});

app.get('/', (req, res) => {
  res.send('API du Microservice Progression Fonctionne !');
});
app.use('/api/progress', progressRoutes);

app.use((err, req, res, next) => {
  console.error("ProgressService Error:", err.stack);
  res.status(500).send({ error: 'Quelque chose s\'est mal passé (Progression) !', details: err.message });
});

const startServer = async () => {
  try {
    await db.createProgressTables();
    app.listen(PORT, () => {
      console.log(`Microservice Progression démarré sur le port ${PORT}`);
    });
  } catch (error) {
    console.error("Impossible de démarrer le serveur ProgressService:", error);
    process.exit(1);
  }
};

startServer();