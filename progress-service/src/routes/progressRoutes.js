// src/routes/progressRoutes.js
const express = require('express');
const progressController = require('../controllers/progressController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Toutes ces routes nécessitent que l'utilisateur soit authentifié
router.use(protect);

router.get('/', progressController.getAllUserProgress); // Progression de l'utilisateur sur toutes les ressources
router.get('/:resourceId', progressController.getProgressForResource); // Progression sur une ressource spécifique
router.put('/:resourceId', progressController.updateProgress); // Mettre à jour la progression sur une ressource

module.exports = router;