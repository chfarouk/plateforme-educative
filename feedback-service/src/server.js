// src/server.js (dans feedback-service)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const feedbackRoutes = require('./routes/feedbackRoutes');
const db = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3005;

app.use(express.json());

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true 
}));


app.use((req, res, next) => {
  console.log(`FeedbackService: ${req.method} ${req.url}`);
  next();
});

app.get('/', (req, res) => {
  res.send('API du Microservice Feedback (Commentaires & Notes) Fonctionne !');
});
app.use('/api/feedback', feedbackRoutes);

app.use((err, req, res, next) => {
  console.error("FeedbackService Error Handler:", err.message);
  console.error(err.stack);
  res.status(500).send({ error: 'Quelque chose s\'est mal passé (Feedback) !', details: err.message });
});

const startServer = async () => {
  try {
    await db.createFeedbackTables();
    app.listen(PORT, () => {
      console.log(`Microservice Feedback démarré sur le port ${PORT}`);
    });
  } catch (error) {
    console.error("Impossible de démarrer le serveur FeedbackService:", error);
    process.exit(1);
  }
};

startServer();