// frontend-app/src/components/RecommendationItem/RecommendationItem.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { provideRecommendationFeedback } from '../api/authApi'; 
// import styles from './RecommendationItem.module.css'; // Créez ce fichier si vous voulez des styles dédiés

function RecommendationItem({ recommendation }) {
  const [feedbackSent, setFeedbackSent] = useState(null); 
  const [actionLoading, setActionLoading] = useState(false);

  // Utiliser db_recommendation_id qui vient du backend Node.js
  // C'est l'ID de la ligne dans la table 'recommendations' du service Node.js
  const idForFeedbackApi = recommendation.db_recommendation_id; 

  const handleFeedback = async (isUseful) => {
    if (!idForFeedbackApi) { 
      console.error("ID système de la recommandation (db_recommendation_id) manquant pour le feedback.");
      alert("Impossible de donner un feedback pour cette recommandation (ID système manquant).");
      return;
    }
    setActionLoading(true);
    try {
      // `provideRecommendationFeedback` dans `authApi.js` appelle l'endpoint du service Node.js
      // qui lui-même relaiera à l'IA si le feedback est négatif.
      const response = await provideRecommendationFeedback(idForFeedbackApi, isUseful);
      console.log("Réponse du feedback API:", response);
      setFeedbackSent(isUseful ? 'useful' : 'not_useful');
    } catch (error) {
      alert(error.message || "Erreur lors de l'envoi du feedback.");
      console.error("Erreur handleFeedback:", error);
    } finally {
      setActionLoading(false);
    }
  };

  if (!recommendation || !recommendation.resource_id) { // Vérifier aussi resource_id
    console.warn("RecommendationItem: Recommandation invalide ou resource_id manquant", recommendation);
    return null;
  }

  // Styles inline pour cet exemple, mais à déplacer dans un .module.css
  const listItemStyle = { 
    border: '1px solid var(--color-lighter-gray)', 
    padding: '15px', 
    marginBottom: '15px', 
    listStyle: 'none', 
    borderRadius: 'var(--border-radius-sm)' 
  };
  const titleStyle = { 
    fontSize: 'var(--font-size-medium)', 
    marginBottom: '5px',
    color: 'var(--color-black)'
  };
  const linkStyle = { 
    color: 'inherit', // Hérite la couleur du parent (h4)
    textDecoration: 'none' 
  };
  linkStyle[':hover'] = {
      textDecoration: 'underline'
  };
  const reasonStyle = { 
    fontSize: 'var(--font-size-small)', 
    color: 'var(--color-medium-gray)', 
    fontStyle: 'italic', 
    marginBottom: '8px' 
  };
  const descriptionStyle = {
    fontSize: 'var(--font-size-small)',
    color: 'var(--color-dark-gray)',
    marginBottom: '10px',
    // Pour limiter le texte
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };
  const feedbackActionsStyle = { 
    marginTop: '10px', 
    borderTop: '1px dashed var(--color-lighter-gray)', 
    paddingTop: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  };
  const feedbackButtonStyle = {
    padding: '6px 12px', // Boutons un peu plus petits
    borderRadius: 'var(--border-radius-sm)',
    border: '1px solid var(--color-light-gray)',
    backgroundColor: 'var(--color-white)',
    color: 'var(--color-dark-gray)',
    cursor: 'pointer',
    fontSize: 'var(--font-size-small)',
    transition: 'background-color 0.2s ease, border-color 0.2s ease'
  };
  const feedbackYesButtonStyle = { ...feedbackButtonStyle };
  const feedbackNoButtonStyle = { ...feedbackButtonStyle };

  const feedbackSentStyle = { 
    marginTop: '10px', 
    color: 'var(--color-dark-gray)', 
    fontSize: 'var(--font-size-small)', 
    fontStyle: 'italic'
  };


  return (
    <li style={listItemStyle}>
      <h4 style={titleStyle}>
        <Link 
            to={`/resources/${recommendation.resource_id}`} 
            style={linkStyle} 
            title={recommendation.description || recommendation.title}
        >
            {recommendation.title || "Titre non disponible"}
        </Link>
      </h4>
      {recommendation.reason && <p style={reasonStyle}>{recommendation.reason}</p>}
      {recommendation.description && <p style={descriptionStyle}>{recommendation.description}</p>}
      
      {feedbackSent === null && idForFeedbackApi ? (
        <div style={feedbackActionsStyle}>
          <small style={{color: 'var(--color-medium-gray)'}}>Utile ?</small>
          <button 
            onClick={() => handleFeedback(true)} 
            disabled={actionLoading} 
            style={feedbackYesButtonStyle}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-gray)'; e.currentTarget.style.borderColor = 'var(--color-medium-gray)';}}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-white)'; e.currentTarget.style.borderColor = 'var(--color-light-gray)';}}
          >
            {actionLoading ? '...' : '👍'}
          </button>
          <button 
            onClick={() => handleFeedback(false)} 
            disabled={actionLoading} 
            style={feedbackNoButtonStyle}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-gray)'; e.currentTarget.style.borderColor = 'var(--color-medium-gray)';}}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-white)'; e.currentTarget.style.borderColor = 'var(--color-light-gray)';}}
          >
            {actionLoading ? '...' : '👎'}
          </button>
        </div>
      ) : idForFeedbackApi && (
        <p style={feedbackSentStyle}>
          Merci pour votre retour !
        </p>
      )}
      {!idForFeedbackApi && <small style={{color: 'var(--color-light-gray)', fontStyle: 'italic'}}>(Feedback non disponible pour cette recommandation)</small>}
    </li>
  );
}

export default RecommendationItem;