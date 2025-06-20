// user-service/src/routes/userRoutes.js
const express = require('express');
const userController = require('../controllers/userController');
const { protect, isAdmin } = require('../middleware/authMiddleware'); 

const router = express.Router();

// Routes publiques
router.post('/register', userController.register);
router.post('/login', userController.login);

// Route protégée pour l'utilisateur connecté (lui-même)
router.get('/me', protect, userController.getMe);

// --- ROUTES ADMIN (protégées et nécessitant le rôle admin) ---
router.get('/', protect, isAdmin, userController.getAllUsers); 
router.get('/:userId', protect, isAdmin, userController.getUserById); 
router.put('/:userId', protect, isAdmin, userController.updateUserByAdmin); 
router.delete('/:userId', protect, isAdmin, userController.deleteUserByAdmin); 

module.exports = router;