// src/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const contentRoutes = require('./routes/contentRoutes');
const pgDb = require('./config/db');
const { connectToMongoDB } = require('./config/mongoDb');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors({
  origin: 'http://localhost:5173', // autorise seulement ton front
  credentials: true                // autorise les cookies / headers sécurisés (si nécessaire)
}));

app.use(express.json());

app.use((req, res, next) => {
  console.log(`ContentService: ${req.method} ${req.url}`);
  next();
});

// Routes
app.get('/', (req, res) => {
  res.send('API du Microservice Contenu Fonctionne !');
});
app.use('/api/content', contentRoutes);

app.use((err, req, res, next) => {
  console.error("ContentService Error:",err.stack);
  res.status(500).send({ error: 'Quelque chose s\'est mal passé (Contenu) !', details: err.message });
});


const startServer = async () => {
  try {
    await pgDb.createContentTables(); // Initialiser les tables PostgreSQL
    await connectToMongoDB();      // Établir la connexion à MongoDB
    
    app.listen(PORT, () => {
      console.log(`Microservice Contenu démarré sur le port ${PORT}`);
    });
  } catch (error) {
    console.error("Impossible de démarrer le serveur ContentService:", error);
    process.exit(1);
  }
};

startServer();