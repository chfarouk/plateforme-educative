// src/controllers/feedbackController.js
const db = require('../config/db');

// --- Ratings (Notes) ---

// Ajouter ou mettre à jour une note pour une ressource
exports.addOrUpdateRating = async (req, res) => {
  const { resourceId } = req.params;
  const { rating } = req.body; 
  const userId = req.user.userId; 

  if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Une note valide (nombre entre 1 et 5) est requise.' });
  }
  try {
    const queryText = `
      INSERT INTO resource_ratings (resource_id, user_id, rating)
      VALUES ($1, $2, $3)
      ON CONFLICT (resource_id, user_id)
      DO UPDATE SET rating = EXCLUDED.rating, updated_at = NOW()
      RETURNING *;
    `;
    const result = await db.query(queryText, [resourceId, userId, rating]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(`Erreur addOrUpdateRating pour resource ${resourceId}:`, error);
    res.status(500).json({ message: 'Erreur serveur lors de l\'ajout/mise à jour de la note.', error: error.message });
  }
};


// Obtenir la note d'un utilisateur pour une ressource
exports.getUserRatingForResource = async (req, res) => {
    const { resourceId } = req.params;
    const userId = req.user.userId;
    try {
        const result = await db.query(
            'SELECT rating FROM resource_ratings WHERE resource_id = $1 AND user_id = $2',
            [resourceId, userId]
        );
        if (result.rows.length > 0) {
            res.status(200).json(result.rows[0]);
        } else {
            res.status(200).json({ rating: null }); // L'utilisateur n'a pas encore noté
        }
    } catch (error) {
        console.error(`Erreur getUserRatingForResource pour resource ${resourceId}:`, error);
        res.status(500).json({ message: 'Erreur serveur.', error: error.message });
    }
};


// Obtenir les statistiques de notation pour une ressource (note moyenne, nombre de notes)
exports.getRatingStatsForResource = async (req, res) => {
  const { resourceId } = req.params;
  try {
    const queryText = `
      SELECT 
        AVG(rating) as average_rating, 
        COUNT(rating) as total_ratings,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as count_1_star,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as count_2_star,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as count_3_star,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as count_4_star,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as count_5_star
      FROM resource_ratings 
      WHERE resource_id = $1;
    `;
    const result = await db.query(queryText, [resourceId]);
    const stats = result.rows[0];
    for (const key in stats) {
        if (stats[key] !== null && key !== 'average_rating') {
            stats[key] = parseInt(stats[key], 10);
        } else if (key === 'average_rating' && stats[key] !== null) {
            stats[key] = parseFloat(parseFloat(stats[key]).toFixed(1)); 
        }
    }
    if (stats.total_ratings === 0) { 
        stats.average_rating = null;
    }
    res.status(200).json(stats);
  } catch (error) {
    console.error(`Erreur getRatingStatsForResource pour resource ${resourceId}:`, error);
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// --- Comments ---

// Ajouter un commentaire à une ressource
exports.addComment = async (req, res) => {
  const { resourceId } = req.params;
  const { comment_text, parent_comment_id = null } = req.body; 
  const userId = req.user.userId;
  const username = req.user.username; // Récupérer le username du token

  if (!comment_text || typeof comment_text !== 'string' || comment_text.trim().length === 0 || comment_text.length > 1000) {
    return res.status(400).json({ message: 'Le texte du commentaire est requis (1-1000 caractères).' });
  }
  if (!username) { // Sécurité supplémentaire
    return res.status(400).json({message: "Nom d'utilisateur manquant dans le token."})
  }

  try {
    const queryText = `
      INSERT INTO resource_comments (resource_id, user_id, author_username, comment_text, parent_comment_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING comment_id, resource_id, user_id, author_username, comment_text, created_at, updated_at, parent_comment_id; 
    `;
    const result = await db.query(queryText, [resourceId, userId, username, comment_text.trim(), parent_comment_id]);
    
    res.status(201).json(result.rows[0]); // Le username est maintenant inclus depuis la BDD
  } catch (error) {
    console.error(`Erreur addComment pour resource ${resourceId}:`, error);
    res.status(500).json({ message: 'Erreur serveur lors de l\'ajout du commentaire.', error: error.message });
  }
};

// Obtenir les commentaires pour une ressource (avec infos de l'auteur)
exports.getCommentsForResource = async (req, res) => {
  const { resourceId } = req.params;
  const { limit = 10, offset = 0 } = req.query; 

  try {
    const queryText = `
      SELECT 
        comment_id, 
        resource_id, 
        user_id, 
        author_username, -- << SÉLECTIONNER LA NOUVELLE COLONNE
        comment_text, 
        created_at, 
        updated_at,
        parent_comment_id
      FROM resource_comments
      WHERE resource_id = $1 AND parent_comment_id IS NULL 
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3;
    `;
    const result = await db.query(queryText, [resourceId, parseInt(limit, 10), parseInt(offset, 10)]);
    
    const totalResult = await db.query(
        'SELECT COUNT(*) FROM resource_comments WHERE resource_id = $1 AND parent_comment_id IS NULL',
        [resourceId]
    );
    const totalComments = parseInt(totalResult.rows[0].count, 10);

    res.status(200).json({
        comments: result.rows,
        totalComments,
        page: Math.floor(offset / limit) + 1,
        limit: parseInt(limit, 10)
    });
  } catch (error) {
    console.error(`Erreur getCommentsForResource pour resource ${resourceId}:`, error);
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// (Optionnel V1) Modifier un commentaire
exports.updateComment = async (req, res) => {
  const { commentId } = req.params;
  const { comment_text } = req.body;
  const userId = req.user.userId;

  if (!comment_text || typeof comment_text !== 'string' || comment_text.trim().length === 0 || comment_text.length > 1000) {
    return res.status(400).json({ message: 'Le texte du commentaire est requis (1-1000 caractères).' });
  }

  try {
    // author_username n'est pas mis à jour ici, il est fixé à la création
    const queryText = `
      UPDATE resource_comments 
      SET comment_text = $1, updated_at = NOW()
      WHERE comment_id = $2 AND user_id = $3 
      RETURNING comment_id, resource_id, user_id, author_username, comment_text, created_at, updated_at, parent_comment_id;
    `;
    const result = await db.query(queryText, [comment_text.trim(), commentId, userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Commentaire non trouvé ou vous n\'êtes pas autorisé à le modifier.' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(`Erreur updateComment ${commentId}:`, error);
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// (Optionnel V1) Supprimer un commentaire
exports.deleteComment = async (req, res) => {
  // ... (La fonction deleteComment reste INCHANGÉE)
  const { commentId } = req.params;
  const userId = req.user.userId;
  const userType = req.user.userType;
  try {
    let queryText; let queryParams;
    if (userType === 'ADMIN') { 
      queryText = `DELETE FROM resource_comments WHERE comment_id = $1 RETURNING *;`;
      queryParams = [commentId];
    } else { 
      queryText = `DELETE FROM resource_comments WHERE comment_id = $1 AND user_id = $2 RETURNING *;`;
      queryParams = [commentId, userId];
    }
    const result = await db.query(queryText, queryParams);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Commentaire non trouvé ou vous n\'êtes pas autorisé à le supprimer.' });
    }
    res.status(200).json({ message: 'Commentaire supprimé avec succès.', deletedComment: result.rows[0] });
  } catch (error) {
    console.error(`Erreur deleteComment ${commentId}:`, error);
    if (error.code === '23503') { 
        return res.status(409).json({ message: 'Impossible de supprimer ce commentaire car il a des réponses.'});
    }
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};