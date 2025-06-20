// src/routes/feedbackRoutes.js
const express = require('express');
const feedbackController = require('../controllers/feedbackController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Routes pour les notes (ratings)
router.get('/ratings/:resourceId/stats', feedbackController.getRatingStatsForResource); // Publique
router.get('/ratings/:resourceId/mine', protect, feedbackController.getUserRatingForResource); // Note de l'utilisateur connecté
router.post('/ratings/:resourceId', protect, feedbackController.addOrUpdateRating); // Ajouter/Modifier sa note

// Routes pour les commentaires
router.get('/comments/:resourceId', feedbackController.getCommentsForResource); // Publique, avec pagination
router.post('/comments/:resourceId', protect, feedbackController.addComment);
router.put('/comments/:commentId', protect, feedbackController.updateComment);
router.delete('/comments/:commentId', protect, feedbackController.deleteComment);

module.exports = router;