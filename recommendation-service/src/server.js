// recommendation-service/src/server.js
require('dotenv').config(); // DOIT ÊTRE LA PREMIÈRE LIGNE ou parmi les toutes premières
const express = require('express');
const cors = require('cors');
const recommendationRoutes = require('./routes/recommendationRoutes');
const db = require('./config/db');
// const cors = require('cors'); // Si vous avez besoin de CORS pour ce service

const app = express();
const PORT = process.env.PORT || 3004;

app.use(cors());

// app.use(cors()); // Activez CORS si nécessaire
app.use(express.json());

app.use((req, res, next) => {
  console.log(`RecommendationService: ${req.method} ${req.url}`);
  next();
});

app.get('/', (req, res) => {
  res.send('API du Microservice Recommandation (Node.js) Fonctionne !');
});
app.use('/api/recommendations', recommendationRoutes);

app.use((err, req, res, next) => {
  console.error("RecommendationService Error Handler:", err.message);
  console.error(err.stack);
  res.status(500).send({ error: 'Quelque chose s\'est mal passé (Recommandation) !', details: err.message });
});

const startServer = async () => {
  try {
    await db.createRecommendationTables(); // Assurez-vous que cette fonction existe et est correcte
    app.listen(PORT, () => {
      console.log(`Microservice Recommandation (Node.js) démarré sur le port ${PORT}`);
    });
  } catch (error) {
    console.error("Impossible de démarrer le serveur RecommendationService (Node.js):", error);
    process.exit(1);
  }
};

startServer();