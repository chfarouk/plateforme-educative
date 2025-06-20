// src/routes/recommendationRoutes.js
const express = require('express');
const recommendationController = require('../controllers/recommendationController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // Toutes les routes de recommandation sont pour les utilisateurs connectés

router.get('/', recommendationController.getRecommendations);
router.post('/feedback/:recommendationId', recommendationController.provideRecommendationFeedback);

module.exports = router;