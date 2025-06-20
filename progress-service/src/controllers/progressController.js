// src/controllers/progressController.js
const db = require('../config/db');

// Obtenir ou créer un enregistrement de progression
// Utile quand un utilisateur accède à une ressource pour la première fois
const getOrCreateProgress = async (studentId, resourceId) => {
  let result = await db.query(
    'SELECT * FROM progress_records WHERE student_id = $1 AND resource_id = $2',
    [studentId, resourceId]
  );

  if (result.rows.length === 0) {
    // Créer un nouvel enregistrement avec statut NOT_STARTED
    result = await db.query(
      `INSERT INTO progress_records (student_id, resource_id, status)
       VALUES ($1, $2, 'NOT_STARTED') RETURNING *`,
      [studentId, resourceId]
    );
  }
  return result.rows[0];
};


// Mettre à jour le statut de progression d'une ressource pour l'utilisateur connecté
exports.updateProgress = async (req, res) => {
  const student_id = req.user.userId; // Utilisateur authentifié
  const { resourceId } = req.params; // ID de la ressource depuis l'URL
  const { status, score, time_spent_seconds } = req.body;

  if (!status && score === undefined && time_spent_seconds === undefined) {
    return res.status(400).json({ message: 'Au moins un champ (status, score, time_spent_seconds) est requis pour la mise à jour.' });
  }

  const validStatuses = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED'];
  if (status && !validStatuses.includes(status.toUpperCase())) {
    return res.status(400).json({ message: `Statut invalide. Valides : ${validStatuses.join(', ')}` });
  }

  try {
    // Assurer que l'enregistrement existe, sinon le créer (ou le créer au premier accès à une ressource)
    await getOrCreateProgress(student_id, resourceId);

    const updateFields = [];
    const values = [];
    let valueCounter = 1;

    if (status) {
      updateFields.push(`status = $${valueCounter++}`);
      values.push(status.toUpperCase());
    }
    if (score !== undefined) {
      updateFields.push(`score = $${valueCounter++}`);
      values.push(score);
    }
    if (time_spent_seconds !== undefined) {
      updateFields.push(`time_spent_seconds = COALESCE(time_spent_seconds, 0) + $${valueCounter++}`); // Pour ajouter au temps existant
      values.push(time_spent_seconds);
    }
    
    // Le trigger s'occupe de completion_date et last_accessed_date si status ou autres champs sont mis à jour
    // Si on ne veut pas que le trigger mette à jour last_accessed_date à chaque fois (ex: juste pour status 'IN_PROGRESS'),
    // on pourrait gérer la date ici : updateFields.push(`last_accessed_date = NOW()`); values.push();

    if (updateFields.length === 0) {
        return res.status(400).json({ message: "Aucun champ valide fourni pour la mise à jour."});
    }

    values.push(student_id);
    values.push(resourceId);

    const queryText = `
      UPDATE progress_records
      SET ${updateFields.join(', ')}
      WHERE student_id = $${valueCounter++} AND resource_id = $${valueCounter++}
      RETURNING *;
    `;

    const result = await db.query(queryText, values);

    if (result.rows.length === 0) {
      // Devrait être très rare si getOrCreateProgress a fonctionné
      return res.status(404).json({ message: 'Enregistrement de progression non trouvé pour mise à jour.' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Erreur updateProgress:", error);
    // Gérer les erreurs de clé unique si getOrCreate a un race condition (peu probable avec await)
    if (error.code === '23505') { // unique_violation
        return res.status(409).json({ message: "Conflit: L'enregistrement de progression existe déjà (race condition?). Réessayez."});
    }
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// Obtenir la progression d'un utilisateur pour une ressource spécifique
exports.getProgressForResource = async (req, res) => {
  const student_id = req.user.userId;
  const { resourceId } = req.params;

  try {
    // Utilise getOrCreate pour que si l'utilisateur n'a jamais interagi, on lui donne un statut 'NOT_STARTED'
    const progress = await getOrCreateProgress(student_id, resourceId);
    res.status(200).json(progress);
  } catch (error) {
    console.error("Erreur getProgressForResource:", error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// Obtenir toute la progression pour l'utilisateur connecté
exports.getAllUserProgress = async (req, res) => {
  const student_id = req.user.userId;
  try {
    const result = await db.query('SELECT * FROM progress_records WHERE student_id = $1', [student_id]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Erreur getAllUserProgress:", error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};