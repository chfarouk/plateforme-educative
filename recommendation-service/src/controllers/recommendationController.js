// recommendation-service/src/controllers/recommendationController.js
const recommendationLogic = require('../services/recommendationLogic');
const db = require('../config/db'); 
const axios = require('axios'); 
require('dotenv').config({ path: require('find-config')('.env') || undefined });

const AI_ENGINE_FEEDBACK_URL = process.env.AI_ENGINE_FEEDBACK_URL;

exports.getRecommendations = async (req, res) => {
  const studentId = req.user.userId; 
  const studentToken = req.headers.authorization?.split(' ')[1]; 

  if (!studentToken) { 
      console.error("Recommendation Controller: Token d'authentification manquant.");
      return res.status(401).json({ message: "Token d'authentification manquant pour les appels inter-services." });
  }
  if (!studentId) { 
      console.error("Recommendation Controller: studentId manquant dans req.user après authentification.");
      return res.status(401).json({ message: "Information utilisateur invalide après authentification." });
  }

  try {
    console.log(`Recommendation Controller: Appel de getHybridRecommendations pour studentId: ${studentId}`);
    const recommendationsFromLogic = await recommendationLogic.getHybridRecommendations(studentId, studentToken, 5, studentId); 
    
    const finalRecommendationsForClient = [];
    if (recommendationsFromLogic && recommendationsFromLogic.length > 0) {
      console.log(`Recommendation Controller: ${recommendationsFromLogic.length} recommandations brutes reçues de la logique.`);
      for (const rec of recommendationsFromLogic) { 
        if (!rec || !rec.resource_id) { 
            console.warn("Recommendation Controller: Recommandation invalide (pas de resource_id) reçue de la logique:", rec);
            continue;
        }
        let dbRecId = null;
        try {
            // Étape 1: Essayer d'insérer. Si conflit, l'UPDATE se déclenche.
            const upsertQuery = `
                INSERT INTO recommendations (student_id, resource_id, reason, relevance_score, recommendation_date, is_clicked, is_useful, feedback_date)
                VALUES ($1, $2, $3, $4, NOW(), FALSE, NULL, NULL) 
                ON CONFLICT (student_id, resource_id) 
                DO UPDATE SET 
                    reason = EXCLUDED.reason, 
                    relevance_score = EXCLUDED.relevance_score, 
                    recommendation_date = NOW(),
                    is_clicked = FALSE,
                    is_useful = NULL,
                    feedback_date = NULL
                RETURNING recommendation_id;
            `;
            const upsertResult = await db.query(upsertQuery, [studentId, rec.resource_id, rec.reason, rec.relevance_score]);

            if (upsertResult.rows.length > 0) {
                dbRecId = upsertResult.rows[0].recommendation_id;
                console.log(`Recommendation Controller: UPSERT réussi, dbRecId: ${dbRecId} pour resource ${rec.resource_id}`);
            } else {
                // Ce cas est moins probable avec RETURNING sur un INSERT/UPDATE qui affecte une ligne,
                // mais on garde une sécurité pour récupérer l'ID si UPSERT n'a pas retourné de ligne.
                console.warn(`Recommendation Controller: UPSERT n'a pas retourné d'ID pour resource ${rec.resource_id}. Tentative de SELECT.`);
                const existingRec = await db.query(
                    `SELECT recommendation_id FROM recommendations 
                     WHERE student_id = $1 AND resource_id = $2`,
                    [studentId, rec.resource_id]
                );
                if (existingRec.rows.length > 0) {
                     dbRecId = existingRec.rows[0].recommendation_id;
                     console.log(`Recommendation Controller: ID existant trouvé par SELECT: ${dbRecId} pour resource ${rec.resource_id}`);
                } else {
                     // Cela signifie que l'INSERT initial a échoué silencieusement ou que la logique est erronée
                     console.error(`Recommendation Controller: CRITIQUE - Impossible de trouver ou créer un enregistrement de recommandation pour resource ${rec.resource_id} et student ${studentId} après UPSERT.`);
                }
            }

            finalRecommendationsForClient.push({
                ...rec, 
                db_recommendation_id: dbRecId 
            });

        } catch(dbError){
            console.error("Recommendation Controller: Erreur DB lors de l'UPSERT/SELECT pour recommendation_id (resource:", rec.resource_id, "):", dbError.message);
            console.error("Stack de l'erreur DB:", dbError.stack);
            // On ajoute quand même la recommandation pour ne pas bloquer l'utilisateur, mais sans ID de feedback
            finalRecommendationsForClient.push({ ...rec, db_recommendation_id: null }); 
        }
      }
    } else {
        console.log("Recommendation Controller: Aucune recommandation brute reçue de la logique.");
    }
    
    console.log(`Recommendation Controller: ${finalRecommendationsForClient.length} recommandations finales formatées envoyées au client.`);
    res.status(200).json(finalRecommendationsForClient);

  } catch (error) {
    console.error("Recommendation Controller: Erreur globale dans getRecommendations:", error.message);
    console.error("Stack de l'erreur globale:", error.stack);
    res.status(500).json({ message: 'Erreur serveur lors de la génération des recommandations', error: error.message });
  }
};

// La fonction provideRecommendationFeedback reste la même que dans ma réponse précédente complète
exports.provideRecommendationFeedback = async (req, res) => {
  const studentId = req.user.userId;
  const { recommendationId } = req.params; 
  const { is_useful } = req.body; 

  if (typeof is_useful !== 'boolean') {
    return res.status(400).json({ message: 'Le champ is_useful (boolean) est requis.' });
  }
  if (!recommendationId) {
      return res.status(400).json({message: "L'ID de la recommandation (db_recommendation_id) est manquant dans l'URL."});
  }
  if (!studentId) {
      console.error("Recommendation Controller (Feedback): studentId manquant dans req.user.");
      return res.status(401).json({ message: "Information utilisateur invalide." });
  }

  let resourceIdForAIFeedback = null;
  try {
    const result = await db.query(
      `UPDATE recommendations 
       SET is_clicked = TRUE, is_useful = $1, feedback_date = NOW() 
       WHERE recommendation_id = $2 AND student_id = $3
       RETURNING resource_id, is_useful`, 
      [is_useful, recommendationId, studentId]
    );

    if (result.rows.length === 0) {
      const recoCheck = await db.query('SELECT resource_id, student_id FROM recommendations WHERE recommendation_id = $1', [recommendationId]);
      if (recoCheck.rows.length === 0) {
          return res.status(404).json({ message: "Recommandation non trouvée pour ce feedback."});
      } else if (recoCheck.rows[0].student_id !== studentId) {
          console.warn(`RecommendationService Node: Feedback donné par user ${studentId} sur une reco initialement pour ${recoCheck.rows[0].student_id}`);
      }
      resourceIdForAIFeedback = recoCheck.rows[0]?.resource_id; 
      if (!resourceIdForAIFeedback) {
          console.error(`RecommendationService Node: Impossible de trouver resource_id pour recommendation_id ${recommendationId}`);
          return res.status(200).json({ message: 'Feedback enregistré localement (ou tentative), mais information ressource manquante pour IA.' });
      }
    } else {
      resourceIdForAIFeedback = result.rows[0].resource_id;
    }
    
    const localFeedbackResponse = { 
        message: 'Feedback enregistré localement.', 
        feedback: { recommendation_id: recommendationId, is_useful: result.rows[0]?.is_useful ?? is_useful } 
    };

    if (!is_useful && AI_ENGINE_FEEDBACK_URL && resourceIdForAIFeedback) {
      console.log(`RecommendationService Node: Envoi du feedback négatif à l'IA pour user ${studentId}, resource ${resourceIdForAIFeedback}`);
      try {
        await axios.post(AI_ENGINE_FEEDBACK_URL, {
          user_id: studentId, 
          resource_id: resourceIdForAIFeedback, 
          is_useful: false 
        }, { timeout: 3000 }); 
        console.log("RecommendationService Node: Feedback négatif transmis à l'IA.");
        return res.status(200).json({ ...localFeedbackResponse, ai_feedback_status: "transmis" });
      } catch (aiError) {
        console.error("RecommendationService Node: Erreur lors de l'envoi du feedback à l'IA:", aiError.response?.data?.error || aiError.message);
        return res.status(200).json({ ...localFeedbackResponse, ai_feedback_status: "erreur_transmission", error_details: aiError.response?.data?.error || aiError.message });
      }
    } else if (!is_useful && !AI_ENGINE_FEEDBACK_URL) {
        console.warn("RecommendationService Node: AI_ENGINE_FEEDBACK_URL non configuré. Feedback négatif non transmis à l'IA.");
    } else if (is_useful) {
        console.log("RecommendationService Node: Feedback positif reçu, non transmis à l'IA pour le moment.");
    }
    res.status(200).json(localFeedbackResponse);
  } catch (error) {
    console.error("RecommendationService Node: Erreur globale dans provideRecommendationFeedback:", error);
    res.status(500).json({ message: 'Erreur serveur lors du traitement du feedback.', error: error.message });
  }
};