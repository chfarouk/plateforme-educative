// src/routes/contentRoutes.js
const express = require('express');
const contentController = require('../controllers/contentController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// Routes publiques
router.get('/', contentController.getAllResources);
router.get('/:resourceId', contentController.getResourceById);

// Routes protégées pour Admin
router.post('/', protect, isAdmin, contentController.createResource);
router.put('/:resourceId', protect, isAdmin, contentController.updateResource);
router.delete('/:resourceId', protect, isAdmin, contentController.deleteResource);

module.exports = router;