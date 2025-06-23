// frontend-app/src/api/authApi.js
import axios from 'axios';

// !!! IMPORTANT: REMPLACEZ CES VALEURS PAR LES URLS FOURNIES PAR 'minikube service ... --url' !!!
// Ces valeurs sont des placeholders et ne fonctionneront probablement pas directement.
const MINIKUBE_USER_SERVICE_URL = "http://127.0.0.1:57398";
const MINIKUBE_CONTENT_SERVICE_URL = "http://127.0.0.1:57408";
const MINIKUBE_PROGRESS_SERVICE_URL = "http://127.0.0.1:57427";
const MINIKUBE_RECOMMENDATION_NODE_SERVICE_URL = "http://127.0.0.1:57437";
const MINIKUBE_FEEDBACK_SERVICE_URL = "http://127.0.0.1:57446";
// L'URL du moteur IA Python n'est généralement pas appelée directement par le frontend.

const USER_API_BASE_URL = `${MINIKUBE_USER_SERVICE_URL}/api/users`;
const CONTENT_API_BASE_URL = `${MINIKUBE_CONTENT_SERVICE_URL}/api/content`;
const PROGRESS_API_BASE_URL = `${MINIKUBE_PROGRESS_SERVICE_URL}/api/progress`;
const RECOMMENDATION_API_BASE_URL = `${MINIKUBE_RECOMMENDATION_NODE_SERVICE_URL}/api/recommendations`;
const FEEDBACK_API_BASE_URL = `${MINIKUBE_FEEDBACK_SERVICE_URL}/api/feedback`;


console.log("USER_API_BASE_URL:", USER_API_BASE_URL);
console.log("CONTENT_API_BASE_URL:", CONTENT_API_BASE_URL);
console.log("PROGRESS_API_BASE_URL:", PROGRESS_API_BASE_URL);
console.log("RECOMMENDATION_API_BASE_URL:", RECOMMENDATION_API_BASE_URL);
console.log("FEEDBACK_API_BASE_URL:", FEEDBACK_API_BASE_URL);

// --- Fonctions Utilisateur ---
export const registerUser = async (userData) => {
  try {
    const response = await axios.post(`${USER_API_BASE_URL}/register`, userData);
    return response.data;
  } catch (error) {
    console.error("Erreur API registerUser:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

export const loginUser = async (credentials) => {
  try {
    const response = await axios.post(`${USER_API_BASE_URL}/login`, credentials);
    if (response.data.token) {
      localStorage.setItem('userToken', response.data.token);
      localStorage.setItem('userInfo', JSON.stringify(response.data.user));
    }
    return response.data;
  } catch (error) {
    console.error("Erreur API loginUser:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

export const logoutUser = () => {
  localStorage.removeItem('userToken');
  localStorage.removeItem('userInfo');
};

export const getMe = async () => {
  try {
    const token = localStorage.getItem('userToken');
    if (!token) throw new Error('Token non trouvé pour getMe');
    const response = await axios.get(`${USER_API_BASE_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) logoutUser();
    console.error("Erreur API getMe:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

export const getCurrentUser = () => {
  const userInfoString = localStorage.getItem('userInfo');
  if (userInfoString) {
    try { return JSON.parse(userInfoString); } catch (e) { console.error("Erreur parsing userInfo", e); logoutUser(); return null;}
  }
  return null;
};

// --- Fonctions Admin pour Utilisateurs (exemples, complétez selon vos besoins) ---
export const getAllUsersAdmin = async () => {
    const token = localStorage.getItem('userToken');
    if (!token) throw new Error('Token requis pour cette action administrateur.');
    const response = await axios.get(`${USER_API_BASE_URL}/`, { headers: { Authorization: `Bearer ${token}` } });
    return response.data;
};

export const getUserByIdAdmin = async (userId) => {
    const token = localStorage.getItem('userToken');
    if (!token) throw new Error('Token requis.');
    const response = await axios.get(`${USER_API_BASE_URL}/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
    return response.data;
};

export const updateUserByAdmin = async (userId, userData) => {
    const token = localStorage.getItem('userToken');
    if (!token) throw new Error('Token requis.');
    const response = await axios.put(`${USER_API_BASE_URL}/${userId}`, userData, { headers: { Authorization: `Bearer ${token}` } });
    return response.data;
};

export const deleteUserByAdmin = async (userId) => {
    const token = localStorage.getItem('userToken');
    if (!token) throw new Error('Token requis.');
    const response = await axios.delete(`${USER_API_BASE_URL}/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
    return response.data;
};


// --- Fonctions Contenu ---
export const getAllResources = async () => {
  try {
    const response = await axios.get(CONTENT_API_BASE_URL);
    return response.data;
  } catch (error) {
    console.error("Erreur API getAllResources:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

export const getResourceById = async (resourceId) => {
  try {
    const response = await axios.get(`${CONTENT_API_BASE_URL}/${resourceId}`);
    return response.data;
  } catch (error) {
    console.error("Erreur API getResourceById:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

export const createResource = async (resourceData) => {
  try {
    const token = localStorage.getItem('userToken');
    if (!token) throw new Error('Token non trouvé pour créer une ressource.');
    const response = await axios.post(CONTENT_API_BASE_URL, resourceData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error("Erreur API createResource:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

export const updateResource = async (resourceId, resourceData) => {
  try {
    const token = localStorage.getItem('userToken');
    if (!token) throw new Error('Token non trouvé pour modifier la ressource.');
    const response = await axios.put(`${CONTENT_API_BASE_URL}/${resourceId}`, resourceData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error("Erreur API updateResource:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

export const deleteResource = async (resourceId) => {
  try {
    const token = localStorage.getItem('userToken');
    if (!token) throw new Error('Token non trouvé pour supprimer la ressource.');
    const response = await axios.delete(`${CONTENT_API_BASE_URL}/${resourceId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error("Erreur API deleteResource:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

// --- Fonctions Progression ---
export const getProgressForResource = async (resourceId) => {
  try {
    const token = localStorage.getItem('userToken');
    if (!token) throw new Error('Token non trouvé pour la progression.');
    const response = await axios.get(`${PROGRESS_API_BASE_URL}/${resourceId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error("Erreur API getProgressForResource:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

export const updateProgress = async (resourceId, progressData) => {
  try {
    const token = localStorage.getItem('userToken');
    if (!token) throw new Error('Token non trouvé pour mettre à jour la progression.');
    const response = await axios.put(`${PROGRESS_API_BASE_URL}/${resourceId}`, progressData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error("Erreur API updateProgress:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

export const getAllUserProgress = async () => {
  try {
    const token = localStorage.getItem('userToken');
    if (!token) throw new Error('Token non trouvé pour récupérer toute la progression.');
    const response = await axios.get(PROGRESS_API_BASE_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error("Erreur API getAllUserProgress:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

// --- Fonctions Recommandations ---
export const getMyRecommendations = async () => {
  try {
    const token = localStorage.getItem('userToken');
    if (!token) throw new Error('Token non trouvé pour les recommandations.');
    const response = await axios.get(RECOMMENDATION_API_BASE_URL, { // Utilise RECOMMENDATION_API_BASE_URL
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data; 
  } catch (error) {
    console.error("Erreur API getMyRecommendations:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

// dbRecommendationId est l'ID de la ligne dans la table 'recommendations' du service Node.js
export const provideRecommendationFeedback = async (dbRecommendationId, isUseful) => {
  try {
    const token = localStorage.getItem('userToken');
    if (!token) throw new Error('Token non trouvé pour le feedback sur recommandation.');
    const response = await axios.post(`${RECOMMENDATION_API_BASE_URL}/feedback/${dbRecommendationId}`,
      { is_useful: isUseful },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.error("Erreur API provideRecommendationFeedback:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};


// --- Fonctions Feedback (Commentaires & Notes sur Ressources) ---
export const addOrUpdateRating = async (resourceId, rating) => {
  try {
    const token = localStorage.getItem('userToken');
    if (!token) throw new Error('Token non trouvé pour noter.');
    const response = await axios.post(`${FEEDBACK_API_BASE_URL}/ratings/${resourceId}`, 
      { rating },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.error("Erreur API addOrUpdateRating:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

export const getUserRatingForResource = async (resourceId) => {
  try {
    const token = localStorage.getItem('userToken');
    if (!token) return { rating: null }; 
    const response = await axios.get(`${FEEDBACK_API_BASE_URL}/ratings/${resourceId}/mine`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data; 
  } catch (error) {
    if (error.response?.status === 404) return { rating: null };
    console.error("Erreur API getUserRatingForResource:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

export const getRatingStatsForResource = async (resourceId) => {
  try {
    const response = await axios.get(`${FEEDBACK_API_BASE_URL}/ratings/${resourceId}/stats`);
    return response.data; 
  } catch (error) {
    console.error("Erreur API getRatingStatsForResource:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

export const addCommentToResource = async (resourceId, commentText, parentCommentId = null) => {
  try {
    const token = localStorage.getItem('userToken');
    if (!token) throw new Error('Token non trouvé pour commenter.');
    const payload = { comment_text: commentText };
    if (parentCommentId) {
      payload.parent_comment_id = parentCommentId;
    }
    const response = await axios.post(`${FEEDBACK_API_BASE_URL}/comments/${resourceId}`, 
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data; 
  } catch (error) {
    console.error("Erreur API addCommentToResource:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

export const getCommentsForResource = async (resourceId, page = 1, limit = 10) => {
  try {
    const offset = (page - 1) * limit;
    const response = await axios.get(`${FEEDBACK_API_BASE_URL}/comments/${resourceId}?limit=${limit}&offset=${offset}`);
    return response.data; 
  } catch (error) {
    console.error("Erreur API getCommentsForResource:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

export const updateCommentById = async (commentId, commentText) => {
  try {
    const token = localStorage.getItem('userToken');
    if (!token) throw new Error('Token non trouvé pour modifier le commentaire.');
    const response = await axios.put(`${FEEDBACK_API_BASE_URL}/comments/${commentId}`, 
      { comment_text: commentText },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.error("Erreur API updateCommentById:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

export const deleteCommentById = async (commentId) => {
  try {
    const token = localStorage.getItem('userToken');
    if (!token) throw new Error('Token non trouvé pour supprimer le commentaire.');
    const response = await axios.delete(`${FEEDBACK_API_BASE_URL}/comments/${commentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error("Erreur API deleteCommentById:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};