// recommendation-service/src/services/recommendationLogic.js
const axios = require('axios');
// dotenv devrait être chargé une seule fois au point d'entrée (server.js)
// require('dotenv').config(); // Peut être enlevé si server.js le fait déjà

const PROGRESS_SERVICE_URL = process.env.PROGRESS_SERVICE_URL;
const AI_ENGINE_URL = process.env.AI_ENGINE_URL;
const CONTENT_SERVICE_URL_FOR_FALLBACK = process.env.CONTENT_SERVICE_URL;

async function callNodeService(url, token = null, method = 'get', data = null) {
  try {
    const config = { headers: {} };
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (method.toLowerCase() === 'post') {
      return (await axios.post(url, data, config)).data;
    }
    return (await axios.get(url, config)).data;
  } catch (error) {
    const serviceName = url?.split('/')[2] || 'service inconnu'; 
    console.error(`Node Recommender: Erreur appel service ${serviceName} (${url}):`, error.response?.data?.message || error.message);
    return null; 
  }
}

async function getHybridRecommendations(studentId, studentToken, count = 5, userIdForAIFeedback = null) {
  let recommendations = [];
  let reasonForFallback = "";
  let numAiRecommendations = 0;

  console.log(`Node Recommender: Début getHybridRecommendations pour studentId: ${studentId}`);
  console.log(`Node Recommender: URL du moteur IA configurée: ${AI_ENGINE_URL}`);
  console.log(`Node Recommender: URL du service de contenu (fallback): ${CONTENT_SERVICE_URL_FOR_FALLBACK}`);
  console.log(`Node Recommender: URL du service de progression: ${PROGRESS_SERVICE_URL}`);


  try {
    if (!PROGRESS_SERVICE_URL) {
        console.error("Node Recommender: PROGRESS_SERVICE_URL n'est pas défini ! Impossible de récupérer l'historique.");
        reasonForFallback = "Erreur de configuration interne (progression). ";
        // Forcer le fallback si on ne peut pas récupérer l'historique
    }
    
    const userProgressData = PROGRESS_SERVICE_URL ? await callNodeService(`${PROGRESS_SERVICE_URL}`, studentToken) : [];
    let userProgress = [];
    if (userProgressData && Array.isArray(userProgressData)) {
        userProgress = userProgressData;
    } else if (userProgressData) {
        console.warn("Node Recommender: userProgressData n'est pas un tableau, sera traité comme vide.", userProgressData);
    }

    const completedOrInProgressResources = userProgress
      .filter(p => p.status === 'COMPLETED' || p.status === 'IN_PROGRESS')
      .map(p => p.resource_id);

    const lastCompletedResource = userProgress
        .filter(p => p.status === 'COMPLETED')
        .sort((a,b) => new Date(b.last_accessed_date || 0) - new Date(a.last_accessed_date || 0))[0];
    
    let sourceResourceIdForAI = lastCompletedResource?.resource_id;
    if (!sourceResourceIdForAI) {
        const lastInProgress = userProgress
            .filter(p => p.status === 'IN_PROGRESS')
            .sort((a,b) => new Date(b.last_accessed_date || 0) - new Date(a.last_accessed_date || 0))[0];
        if (lastInProgress) {
            sourceResourceIdForAI = lastInProgress.resource_id;
        }
    }

    if (sourceResourceIdForAI && AI_ENGINE_URL) {
      console.log(`Node Recommender: Appel du moteur IA Python avec source_resource_id: ${sourceResourceIdForAI}, user_id_for_feedback: ${userIdForAIFeedback}`);
      const aiPayload = {
        source_resource_id: sourceResourceIdForAI,
        num_recommendations: count + 5, // Demander plus pour filtrer l'historique déjà présent dans l'IA
        user_history_ids: completedOrInProgressResources, // L'IA peut aussi filtrer ça
        user_id: userIdForAIFeedback 
      };
      
      try {
        const aiResponse = await axios.post(`${AI_ENGINE_URL}/recommend`, aiPayload, { timeout: 5000 }); // Ajout timeout
        if (aiResponse.data && aiResponse.data.recommendations && Array.isArray(aiResponse.data.recommendations)) {
          recommendations = aiResponse.data.recommendations.map(rec => ({
            resource_id: rec.resource_id,
            title: rec.title,
            description: rec.description, // Le moteur IA Python renvoie maintenant la description
            reason: rec.reason || `Suggestion basée sur votre activité (IA)`,
            relevance_score: rec.similarity_score || 0.5 
          }));
          numAiRecommendations = recommendations.length; 
          console.log(`Node Recommender: ${numAiRecommendations} recommandations reçues de l'IA Python.`);
        } else {
            console.warn("Node Recommender: Réponse de l'IA Python malformée ou pas de recommandations.", aiResponse.data);
            reasonForFallback = "Le moteur IA n'a pas retourné de suggestions. ";
        }
      } catch (aiError) {
          console.error("Node Recommender: Erreur lors de l'appel au moteur IA Python:", aiError.response?.data?.error || aiError.message);
          reasonForFallback = "Erreur de communication avec le moteur IA. ";
          if (aiError.code === 'ECONNREFUSED') {
              reasonForFallback = "Moteur IA indisponible. ";
          }
      }
    } else if (!AI_ENGINE_URL) {
        console.warn("Node Recommender: AI_ENGINE_URL n'est pas défini. Recommandations IA désactivées.");
        reasonForFallback = "Moteur IA non configuré. ";
    } else {
        console.log("Node Recommender: Pas de ressource source pour l'IA (nouvel utilisateur ou pas d'historique pertinent). Passage au fallback.");
        reasonForFallback = "Pas assez d'historique pour les recommandations IA. ";
    }

    if (recommendations.length < count) {
      console.log(`Node Recommender: Pas assez de recos (${recommendations.length}/${count}), utilisation du fallback.`);
      if (!CONTENT_SERVICE_URL_FOR_FALLBACK) {
          console.error("Node Recommender: CONTENT_SERVICE_URL_FOR_FALLBACK n'est pas défini pour le fallback !");
      } else {
        try {
            const allResourcesResponse = await callNodeService(CONTENT_SERVICE_URL_FOR_FALLBACK);
            let numAddedByFallback = 0;

            if (allResourcesResponse && Array.isArray(allResourcesResponse)) {
                const recentNotSeen = allResourcesResponse
                    .filter(r => !completedOrInProgressResources.includes(r.resource_id)) 
                    .sort((a, b) => new Date(b.creation_date) - new Date(a.creation_date));
                    
                for (const res of recentNotSeen) {
                    if (recommendations.length >= count) break;
                    if (!recommendations.some(rec => rec.resource_id === res.resource_id)) {
                        recommendations.push({
                            resource_id: res.resource_id,
                            title: res.title,
                            description: res.description?.substring(0,150) + "...",
                            reason: reasonForFallback + "Nouvelle ressource populaire.",
                            relevance_score: 0.1 
                        });
                        numAddedByFallback++;
                    }
                }
                console.log(`Node Recommender: Ajout de ${numAddedByFallback} recommandations par fallback.`);
            } else {
                 console.warn("Node Recommender: Aucune ressource reçue du content-service pour le fallback.");
            }
          } catch (fallbackError) {
              console.error("Node Recommender: Erreur lors de l'exécution du fallback:", fallbackError.message);
          }
      }
    }
    
    return recommendations.slice(0, count);

  } catch (error) {
    console.error("Node Recommender: Erreur majeure dans getHybridRecommendations:", error);
    return []; 
  }
}

module.exports = {
  getHybridRecommendations,
};