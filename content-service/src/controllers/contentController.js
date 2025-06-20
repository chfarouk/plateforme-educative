// content-service/src/controllers/contentController.js
const pgDb = require('../config/db');
const { getDb, RESOURCES_DETAILS_COLLECTION } = require('../config/mongoDb');
// const { ObjectId } = require('mongodb');

exports.createResource = async (req, res) => {
  const { title, description, resource_type, subject_area, difficulty_level, content_details } = req.body;
  
  console.log('CONTENT-SERVICE - createResource - Entrée - req.user:', req.user); 
  
  if (!req.user || !req.user.userId) {
    console.error('CONTENT-SERVICE - createResource - ERREUR: req.user ou req.user.userId est manquant après authentification !');
    return res.status(401).json({ message: 'Information utilisateur (ID) manquante après authentification. Le token est peut-être invalide ou sa structure est incorrecte.' });
  }
  const userIdForDb = req.user.userId; 

  console.log('CONTENT-SERVICE - createResource - userIdForDb (pour created_by_user_id):', userIdForDb); 

  if (!title || !resource_type) {
    return res.status(400).json({ message: 'Le titre et le type de ressource sont requis.' });
  }
  
  if (!userIdForDb) { 
      console.error('CONTENT-SERVICE - createResource - ERREUR CRITIQUE: userIdForDb est null/undefined AVANT INSERTION !');
      return res.status(500).json({ message: 'Erreur interne du serveur: L\'ID utilisateur est manquant de manière inattendue pour la création de la ressource.' });
  }

  let pgResource;
  try {
    const pgQueryText = `
      INSERT INTO learning_resources (
         title, description, resource_type, subject_area, difficulty_level, created_by_user_id
      ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING * 
    `;
    
    const pgValues = [
      title, 
      description, 
      resource_type.toUpperCase(), 
      subject_area, 
      difficulty_level, 
      userIdForDb
    ];

    console.log('CONTENT-SERVICE - createResource - Query:', pgQueryText);
    console.log('CONTENT-SERVICE - createResource - Values:', pgValues);

    const pgResult = await pgDb.query(pgQueryText, pgValues);
    pgResource = pgResult.rows[0];
    console.log('CONTENT-SERVICE - createResource - Ressource insérée dans PG:', pgResource);

    if (content_details && Object.keys(content_details).length > 0) {
      const mongo = getDb();
      const mongoResult = await mongo.collection(RESOURCES_DETAILS_COLLECTION).insertOne({
        resource_id: pgResource.resource_id, 
        ...content_details,
      });
      console.log('CONTENT-SERVICE - createResource - Détails insérés dans MongoDB, result ID:', mongoResult.insertedId);
    }

    res.status(201).json({ ...pgResource, details_in_mongo: !!content_details });

  } catch (error) {
    console.error("CONTENT-SERVICE - createResource - ERREUR SQL/Mongo lors de la création:", error.message);
    console.error("CONTENT-SERVICE - createResource - Détail de l'erreur:", error); 
    
    if (error.code === '23502') { 
        console.error("CONTENT-SERVICE - createResource - Violation de contrainte NOT NULL. Colonne:", error.column, "Détail:", error.detail);
    } else if (error.code === '23505') { 
        console.error("CONTENT-SERVICE - createResource - Violation de contrainte UNIQUE. Détail:", error.detail);
    }

    if (pgResource && pgResource.resource_id) {
        console.warn(`CONTENT-SERVICE - createResource - AVERTISSEMENT: Possible incohérence de données. Ressource PG créée (ID: ${pgResource.resource_id}) mais une erreur est survenue ensuite.`);
    }
    res.status(500).json({ message: 'Erreur serveur lors de la création de la ressource.', error: error.message, details: error.detail || null });
  }
};

exports.getAllResources = async (req, res) => {
  try {
    const queryText = `
      SELECT 
        resource_id, title, description, resource_type, 
        subject_area, difficulty_level, creation_date, 
        created_by_user_id, updated_at 
      FROM learning_resources 
      ORDER BY creation_date DESC
    `;
    const result = await pgDb.query(queryText);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("CONTENT-SERVICE - getAllResources - ERREUR:", error.message);
    console.error("CONTENT-SERVICE - getAllResources - Détail de l'erreur:", error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des ressources.', error: error.message, details: error.detail || null });
  }
};

exports.getResourceById = async (req, res) => {
  const { resourceId } = req.params;
  try {
    const queryText = `
      SELECT 
        resource_id, title, description, resource_type, 
        subject_area, difficulty_level, creation_date, 
        created_by_user_id, updated_at 
      FROM learning_resources 
      WHERE resource_id = $1
    `;
    const pgResult = await pgDb.query(queryText, [resourceId]);
    
    if (pgResult.rows.length === 0) {
      return res.status(404).json({ message: 'Ressource non trouvée dans PostgreSQL.' });
    }
    const resourceMetadata = pgResult.rows[0];

    const mongo = getDb();
    const resourceDetails = await mongo.collection(RESOURCES_DETAILS_COLLECTION).findOne(
      { resource_id: resourceId },
      { projection: { _id: 0, resource_id: 0 } } 
    );

    res.status(200).json({
      ...resourceMetadata,
      details: resourceDetails || null, 
    });
  } catch (error) {
    console.error(`CONTENT-SERVICE - getResourceById ${resourceId} - ERREUR:`, error.message);
    console.error(`CONTENT-SERVICE - getResourceById - Détail de l'erreur:`, error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération de la ressource.', error: error.message, details: error.detail || null });
  }
};

exports.updateResource = async (req, res) => {
  const { resourceId } = req.params;
  const { title, description, resource_type, subject_area, difficulty_level, content_details } = req.body;
  
  console.log('CONTENT-SERVICE - updateResource - Entrée');
  console.log('CONTENT-SERVICE - updateResource - resourceId:', resourceId);
  console.log('CONTENT-SERVICE - updateResource - req.body:', req.body);
  console.log('CONTENT-SERVICE - updateResource - req.user:', req.user);

  if (!req.user || !req.user.userId) {
    console.error('CONTENT-SERVICE - updateResource - ERREUR: Utilisateur non authentifié ou ID manquant.');
    return res.status(401).json({ message: 'Information utilisateur manquante pour la mise à jour.' });
  }

  try {
    const pgUpdateFields = [];
    const pgValues = [];
    let pgValueCounter = 1;

    if (title !== undefined) { pgUpdateFields.push(`title = $${pgValueCounter++}`); pgValues.push(title); }
    if (description !== undefined) { pgUpdateFields.push(`description = $${pgValueCounter++}`); pgValues.push(description); }
    if (resource_type !== undefined) { 
        // Vérifier si le type est valide avant de l'ajouter
        const validTypes = ['VIDEO', 'ARTICLE', 'EXERCISE'];
        if (!validTypes.includes(resource_type.toUpperCase())) {
            return res.status(400).json({ message: `Type de ressource invalide: ${resource_type}`});
        }
        pgUpdateFields.push(`resource_type = $${pgValueCounter++}`); 
        pgValues.push(resource_type.toUpperCase()); 
    }
    if (subject_area !== undefined) { pgUpdateFields.push(`subject_area = $${pgValueCounter++}`); pgValues.push(subject_area); }
    if (difficulty_level !== undefined) { pgUpdateFields.push(`difficulty_level = $${pgValueCounter++}`); pgValues.push(difficulty_level); }
    
    // La mise à jour de 'updated_at' est gérée par le trigger défini dans db.js

    if (pgUpdateFields.length === 0 && (!content_details || Object.keys(content_details).length === 0)) {
        console.log('CONTENT-SERVICE - updateResource - Aucun champ à mettre à jour.');
        return res.status(400).json({ message: "Aucun champ à mettre à jour fourni." });
    }
    
    let updatedPgResource;
    if (pgUpdateFields.length > 0) {
        pgValues.push(resourceId); 
        const pgQueryText = `UPDATE learning_resources SET ${pgUpdateFields.join(', ')} WHERE resource_id = $${pgValueCounter} RETURNING *`;
        
        console.log('CONTENT-SERVICE - updateResource - PG Query:', pgQueryText);
        console.log('CONTENT-SERVICE - updateResource - PG Values:', pgValues);
        
        const pgResult = await pgDb.query(pgQueryText, pgValues);
        if (pgResult.rows.length === 0) {
            console.warn('CONTENT-SERVICE - updateResource - Ressource non trouvée dans PG pour update.');
            return res.status(404).json({ message: 'Ressource non trouvée dans PostgreSQL pour mise à jour.' });
        }
        updatedPgResource = pgResult.rows[0];
        console.log('CONTENT-SERVICE - updateResource - Ressource mise à jour dans PG:', updatedPgResource);
    } else {
        const queryText = `
            SELECT resource_id, title, description, resource_type, subject_area, 
                   difficulty_level, creation_date, created_by_user_id, updated_at 
            FROM learning_resources WHERE resource_id = $1
        `;
        const pgResult = await pgDb.query(queryText, [resourceId]);
        if (pgResult.rows.length === 0) {
            return res.status(404).json({ message: 'Ressource non trouvée.' });
        }
        updatedPgResource = pgResult.rows[0];
    }

    let updatedMongoDetails = null;
    if (content_details && Object.keys(content_details).length > 0) {
      const mongo = getDb();
      console.log('CONTENT-SERVICE - updateResource - Mise à jour MongoDB pour resource_id:', resourceId, 'avec details:', content_details);
      const result = await mongo.collection(RESOURCES_DETAILS_COLLECTION).findOneAndUpdate(
        { resource_id: resourceId },
        { $set: { resource_id: resourceId, ...content_details } }, 
        { upsert: true, returnDocument: 'after', projection: { _id: 0, resource_id: 0 } } 
      );
      updatedMongoDetails = result.value || null; 
      if (updatedMongoDetails) console.log('CONTENT-SERVICE - updateResource - Détails MongoDB mis à jour/créés.');
      else console.log('CONTENT-SERVICE - updateResource - Aucun document MongoDB mis à jour/créé.');
    } else if (content_details === null || (typeof content_details === 'object' && Object.keys(content_details).length === 0 && isEditMode)) {
      // Si content_details est explicitement vide ou null en mode édition, on peut supprimer les détails mongo existants
      const mongo = getDb();
      await mongo.collection(RESOURCES_DETAILS_COLLECTION).deleteOne({ resource_id: resourceId });
      console.log('CONTENT-SERVICE - updateResource - Détails MongoDB supprimés pour resource_id:', resourceId);
      updatedMongoDetails = null;
    }


    res.status(200).json({
        ...updatedPgResource,
        details: updatedMongoDetails 
    });

  } catch (error) {
    console.error(`CONTENT-SERVICE - updateResource (ID: ${resourceId}) - ERREUR CAPTURÉE:`, error.message);
    console.error(`CONTENT-SERVICE - updateResource - Détail complet de l'erreur:`, error); 
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour de la ressource.', error: error.message, details: error.detail || error.stack || null });
  }
};

exports.deleteResource = async (req, res) => {
  const { resourceId } = req.params;
  console.log('CONTENT-SERVICE - deleteResource - req.user:', req.user);
  if (!req.user || !req.user.userId) {
    return res.status(401).json({ message: 'Information utilisateur manquante pour la suppression.' });
  }

  try {
    const pgResult = await pgDb.query('DELETE FROM learning_resources WHERE resource_id = $1 RETURNING *', [resourceId]);
    if (pgResult.rows.length === 0) {
      return res.status(404).json({ message: 'Ressource non trouvée pour suppression.' });
    }
    console.log('CONTENT-SERVICE - deleteResource - Ressource supprimée de PG:', pgResult.rows[0]);

    const mongo = getDb();
    const mongoResult = await mongo.collection(RESOURCES_DETAILS_COLLECTION).deleteOne({ resource_id: resourceId });
    console.log('CONTENT-SERVICE - deleteResource - Résultat suppression MongoDB:', mongoResult);

    res.status(200).json({ message: 'Ressource supprimée avec succès.', resource: pgResult.rows[0] });
  } catch (error) {
    console.error(`CONTENT-SERVICE - deleteResource ${resourceId} - ERREUR:`, error.message);
    console.error(`CONTENT-SERVICE - deleteResource - Détail de l'erreur:`, error);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression de la ressource.', error: error.message, details: error.detail || null });
  }
};