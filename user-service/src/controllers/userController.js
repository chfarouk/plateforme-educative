// user-service/src/controllers/userController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db'); 

const JWT_SECRET = process.env.JWT_SECRET;
const SERVICE_NAME = process.env.SERVICE_NAME || 'UserController';

console.log(`[${SERVICE_NAME}] Contrôleur chargé.`);

exports.register = async (req, res) => {
  let { username, email, password, firstName, lastName, userType } = req.body;
  console.log(`[${SERVICE_NAME}] Register - Données reçues:`, { username, email, password_provided: !!password, firstName, lastName, userType });

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Nom d\'utilisateur, email et mot de passe sont requis.' });
  }

  const validUserTypes = ['STUDENT', 'ADMIN'];
  if (userType && !validUserTypes.includes(userType.toUpperCase())) {
    console.warn(`[${SERVICE_NAME}] Register - Tentative avec userType invalide: ${userType}. Défaut à STUDENT.`);
    userType = 'STUDENT'; 
  } else if (userType) {
    userType = userType.toUpperCase(); 
  } else {
    userType = 'STUDENT'; 
  }
  
  try {
    const userExists = await db.query('SELECT * FROM users WHERE email = $1 OR username = $2', [email, username]);
    if (userExists.rows.length > 0) {
      return res.status(409).json({ message: 'L\'email ou le nom d\'utilisateur existe déjà.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUserQuery = 'INSERT INTO users (username, email, password_hash, first_name, last_name, user_type) VALUES ($1, $2, $3, $4, $5, $6) RETURNING user_id, username, email, user_type, first_name, last_name, registration_date';
    const newUser = await db.query(newUserQuery, [username, email, passwordHash, firstName, lastName, userType]);
    
    console.log(`[${SERVICE_NAME}] Register - Utilisateur créé:`, newUser.rows[0].user_id);
    res.status(201).json({
      message: 'Utilisateur créé avec succès.',
      user: newUser.rows[0], 
    });
  } catch (err) {
    console.error(`[${SERVICE_NAME}] Erreur d'inscription:`, err);
    res.status(500).json({ message: 'Erreur serveur lors de l\'inscription.', error: err.message, details: err.detail || null });
  }
};

exports.login = async (req, res) => { 
  const { email, password } = req.body;
  console.log(`[${SERVICE_NAME}] Login - Tentative pour email: ${email}`);
  if (!email || !password) {
    return res.status(400).json({ message: 'Email et mot de passe sont requis.' });
  }
  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ message: 'Identifiants invalides (email non trouvé).' });
    }
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Identifiants invalides (mot de passe incorrect).' });
    }
    await db.query('UPDATE users SET last_login_date = NOW() WHERE user_id = $1', [user.user_id]);
    const payload = {
      userId: user.user_id,
      username: user.username,
      userType: user.user_type,
    };
    if (!JWT_SECRET) {
        console.error(`[${SERVICE_NAME}] ERREUR CRITIQUE: JWT_SECRET n'est pas défini!`);
        return res.status(500).json({ message: "Erreur de configuration serveur (jwt)." });
    }
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    console.log(`[${SERVICE_NAME}] Login - Succès pour user: ${user.username}, ID: ${user.user_id}`);
    res.status(200).json({
      message: 'Connexion réussie.',
      token,
      user: {
        userId: user.user_id,
        username: user.username,
        email: user.email,
        userType: user.user_type,
        firstName: user.first_name, // Ajouter ces champs pour le contexte Auth
        lastName: user.last_name,
      },
    });
  } catch (err) {
    console.error(`[${SERVICE_NAME}] Erreur de connexion:`, err);
    res.status(500).json({ message: 'Erreur serveur lors de la connexion.', error: err.message });
  }
};

exports.getMe = async (req, res) => { 
  console.log(`[${SERVICE_NAME}] getMe - Demandé par user ID: ${req.user?.userId}`);
  if (!req.user || !req.user.userId) { // Vérification plus robuste
      return res.status(401).json({ message: "Non autorisé. Information utilisateur manquante dans la requête." });
  }
  try {
    const result = await db.query('SELECT user_id, username, email, first_name, last_name, user_type, registration_date, last_login_date FROM users WHERE user_id = $1', [req.user.userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(`[${SERVICE_NAME}] Erreur getMe:`, err);
    res.status(500).json({ message: 'Erreur serveur.', error: err.message });
  }
};

exports.getAllUsers = async (req, res) => {
  console.log(`[${SERVICE_NAME}] getAllUsers - Demandé par admin: ${req.user?.username}`);
  try {
    const result = await db.query('SELECT user_id, username, email, first_name, last_name, user_type, registration_date, last_login_date FROM users ORDER BY registration_date DESC');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Erreur getAllUsers:`, error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des utilisateurs.', error: error.message });
  }
};

exports.getUserById = async (req, res) => {
  const { userId } = req.params;
  console.log(`[${SERVICE_NAME}] getUserById - ID: ${userId} - Demandé par admin: ${req.user?.username}`);
  try {
    const result = await db.query('SELECT user_id, username, email, first_name, last_name, user_type, registration_date, last_login_date FROM users WHERE user_id = $1', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Erreur getUserById (ID: ${userId}):`, error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération de l\'utilisateur.', error: error.message });
  }
};

exports.updateUserByAdmin = async (req, res) => {
  const { userId } = req.params; 
  const adminUserId = req.user?.userId; 
  const { username, email, first_name, last_name, user_type, password } = req.body;

  console.log(`[${SERVICE_NAME}] updateUserByAdmin - ID: ${userId} - Modifié par admin: ${adminUserId}`);
  console.log(`[${SERVICE_NAME}] updateUserByAdmin - Données reçues:`, req.body);

  if (userId === adminUserId && (req.body.hasOwnProperty('user_type') || req.body.hasOwnProperty('password'))) {
      if(req.body.hasOwnProperty('user_type') && user_type !== req.user.userType) {
        console.warn(`[${SERVICE_NAME}] Tentative par admin ${adminUserId} de modifier son propre userType.`);
        return res.status(403).json({ message: "Un administrateur ne peut pas modifier son propre type de compte via cette interface." });
      }
  }

  try {
    const updateFields = [];
    const values = [];
    let valueCounter = 1;

    if (username) { 
      const existingUser = await db.query('SELECT user_id FROM users WHERE username = $1 AND user_id != $2', [username, userId]);
      if (existingUser.rows.length > 0) {
        return res.status(409).json({ message: 'Ce nom d\'utilisateur est déjà pris.' });
      }
      updateFields.push(`username = $${valueCounter++}`); values.push(username); 
    }
    if (email) { 
      const existingUser = await db.query('SELECT user_id FROM users WHERE email = $1 AND user_id != $2', [email, userId]);
      if (existingUser.rows.length > 0) {
        return res.status(409).json({ message: 'Cet email est déjà utilisé.' });
      }
      updateFields.push(`email = $${valueCounter++}`); values.push(email); 
    }
    if (first_name !== undefined) { updateFields.push(`first_name = $${valueCounter++}`); values.push(first_name); }
    if (last_name !== undefined) { updateFields.push(`last_name = $${valueCounter++}`); values.push(last_name); }
    if (user_type) { 
        if (!['STUDENT', 'ADMIN'].includes(user_type.toUpperCase())) {
            return res.status(400).json({message: "Type d'utilisateur invalide. Doit être STUDENT ou ADMIN."})
        }
        updateFields.push(`user_type = $${valueCounter++}`); values.push(user_type.toUpperCase()); 
    }
    if (password) { 
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      updateFields.push(`password_hash = $${valueCounter++}`); values.push(passwordHash);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'Aucun champ à mettre à jour fourni.' });
    }

    values.push(userId); 
    const queryText = `UPDATE users SET ${updateFields.join(', ')} WHERE user_id = $${valueCounter} RETURNING user_id, username, email, first_name, last_name, user_type, registration_date, last_login_date`;
    
    console.log(`[${SERVICE_NAME}] updateUserByAdmin - Query:`, queryText);
    console.log(`[${SERVICE_NAME}] updateUserByAdmin - Values:`, values);

    const result = await db.query(queryText, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé pour la mise à jour.' });
    }
    res.status(200).json(result.rows[0]);

  } catch (error) {
    console.error(`[${SERVICE_NAME}] Erreur updateUserByAdmin (ID: ${userId}):`, error);
    if (error.code === '23505') { 
        return res.status(409).json({ message: 'Conflit de données (email ou username déjà existant).', details: error.detail });
    }
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour de l\'utilisateur.', error: error.message });
  }
};

exports.deleteUserByAdmin = async (req, res) => {
  const { userId } = req.params; 
  const adminUserId = req.user?.userId; 

  console.log(`[${SERVICE_NAME}] deleteUserByAdmin - ID: ${userId} - Supprimé par admin: ${adminUserId}`);

  if (userId === adminUserId) {
    console.warn(`[${SERVICE_NAME}] Tentative par admin ${adminUserId} de se supprimer lui-même.`);
    return res.status(403).json({ message: 'Un administrateur ne peut pas se supprimer lui-même.' });
  }

  try {
    const userCheck = await db.query('SELECT user_id FROM users WHERE user_id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé pour suppression.' });
    }
    const result = await db.query('DELETE FROM users WHERE user_id = $1 RETURNING user_id, username, email', [userId]);
    console.log(`[${SERVICE_NAME}] Utilisateur ${userId} supprimé par ${adminUserId}.`);
    res.status(200).json({ message: 'Utilisateur supprimé avec succès.', user: result.rows[0] });
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Erreur deleteUserByAdmin (ID: ${userId}):`, error);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression de l\'utilisateur.', error: error.message });
  }
};