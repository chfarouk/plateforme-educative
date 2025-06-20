// src/pages/admin/AdminAddResourcePage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { createResource, getResourceById, updateResource } from '../../api/authApi';
import styles from './AdminPages.module.css'; 
import formStyles from '../../components/AuthForm/AuthForm.module.css'; 
import { FaPlusCircle, FaTimesCircle, FaArrowUp, FaArrowDown } from 'react-icons/fa';

const defaultQuestion = () => ({
  id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, // ID unique simple
  text: '',
  options: [
    { id: `o1_${Date.now()}`, text: '', isCorrect: false }, // Ajout de isCorrect
    { id: `o2_${Date.now()}`, text: '', isCorrect: false },
  ],
  explanation: '' // Optionnel
});

function AdminAddResourcePage() {
  const navigate = useNavigate();
  const { resourceId } = useParams(); 
  const isEditMode = Boolean(resourceId);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    resource_type: 'VIDEO', 
    subject_area: '',
    difficulty_level: 'EASY',
    videoUrl: '', 
    videoDurationMinutes: '', 
    articleContentText: '', 
    articleEstimatedReadTime: '', 
    // Pour les exercices
    exerciseType: 'QCM', // Type d'exercice (QCM, Vrai/Faux, etc.)
    exerciseInstructions: '',
    exerciseQuestions: [defaultQuestion()] // Commence avec une question
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageTitle, setPageTitle] = useState('Ajouter une Nouvelle Ressource');
  const [currentResourceType, setCurrentResourceType] = useState('VIDEO');

  const fetchResourceData = useCallback(async () => {
    if (isEditMode && resourceId) {
      setPageTitle('Modifier la Ressource');
      setLoading(true);
      try {
        const resource = await getResourceById(resourceId);
        setCurrentResourceType(resource.resource_type || 'VIDEO');
        let questionsForState = [defaultQuestion()];
        if (resource.resource_type === 'EXERCISE' && resource.details && Array.isArray(resource.details.questions)) {
          questionsForState = resource.details.questions.map(q => ({
            ...q,
            options: q.options.map(opt => ({ ...opt, isCorrect: opt.id === q.correctOptionId }))
          }));
        }

        setFormData({
          title: resource.title || '',
          description: resource.description || '',
          resource_type: resource.resource_type || 'VIDEO',
          subject_area: resource.subject_area || '',
          difficulty_level: resource.difficulty_level || 'EASY',
          videoUrl: resource.details?.videoUrl || '',
          videoDurationMinutes: resource.details?.durationMinutes || '',
          articleContentText: resource.details?.articleText || '',
          articleEstimatedReadTime: resource.details?.estimatedReadTime || '',
          exerciseType: resource.details?.type || 'QCM',
          exerciseInstructions: resource.details?.instructions || '',
          exerciseQuestions: questionsForState,
        });
      } catch (err) {
        setError('Impossible de charger les données de la ressource.');
        console.error("Erreur fetchResourceData (Admin Edit):", err);
      } finally {
        setLoading(false);
      }
    } else {
      setPageTitle('Ajouter une Nouvelle Ressource');
      setCurrentResourceType('VIDEO');
      setFormData({
            title: '', description: '', resource_type: 'VIDEO',
            subject_area: '', difficulty_level: 'EASY',
            videoUrl: '', videoDurationMinutes: '',
            articleContentText: '', articleEstimatedReadTime: '',
            exerciseType: 'QCM', exerciseInstructions: '', exerciseQuestions: [defaultQuestion()]
        });
    }
  }, [isEditMode, resourceId]);

  useEffect(() => {
    fetchResourceData();
  }, [fetchResourceData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === "resource_type") {
        setCurrentResourceType(value);
    }
    if (error) setError('');
  };

  // Fonctions pour gérer les questions d'exercice
  const handleQuestionChange = (qIndex, field, value) => {
    const updatedQuestions = [...formData.exerciseQuestions];
    updatedQuestions[qIndex][field] = value;
    setFormData(prev => ({ ...prev, exerciseQuestions: updatedQuestions }));
  };

  const handleOptionChange = (qIndex, oIndex, field, value) => {
    const updatedQuestions = [...formData.exerciseQuestions];
    updatedQuestions[qIndex].options[oIndex][field] = value;
    setFormData(prev => ({ ...prev, exerciseQuestions: updatedQuestions }));
  };
  
  const handleCorrectOptionChange = (qIndex, correctOptionId) => {
    const updatedQuestions = [...formData.exerciseQuestions];
    updatedQuestions[qIndex].options.forEach(opt => {
        opt.isCorrect = (opt.id === correctOptionId);
    });
    setFormData(prev => ({ ...prev, exerciseQuestions: updatedQuestions }));
  };

  const addQuestion = () => {
    setFormData(prev => ({
      ...prev,
      exerciseQuestions: [...prev.exerciseQuestions, defaultQuestion()]
    }));
  };

  const removeQuestion = (qIndex) => {
    if (formData.exerciseQuestions.length <= 1) {
      alert("Un exercice doit contenir au moins une question.");
      return;
    }
    const updatedQuestions = formData.exerciseQuestions.filter((_, index) => index !== qIndex);
    setFormData(prev => ({ ...prev, exerciseQuestions: updatedQuestions }));
  };

  const addOption = (qIndex) => {
    const updatedQuestions = [...formData.exerciseQuestions];
    if (updatedQuestions[qIndex].options.length < 6) { // Limiter le nombre d'options
        updatedQuestions[qIndex].options.push({ id: `o${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, text: '', isCorrect: false });
        setFormData(prev => ({ ...prev, exerciseQuestions: updatedQuestions }));
    } else {
        alert("Maximum 6 options par question.");
    }
  };

  const removeOption = (qIndex, oIndex) => {
    const updatedQuestions = [...formData.exerciseQuestions];
    if (updatedQuestions[qIndex].options.length <= 2) { // Au moins 2 options
        alert("Une question doit avoir au moins deux options.");
        return;
    }
    updatedQuestions[qIndex].options = updatedQuestions[qIndex].options.filter((_, index) => index !== oIndex);
    // S'assurer qu'il y a toujours une option correcte si possible, ou réinitialiser
    const hasCorrect = updatedQuestions[qIndex].options.some(opt => opt.isCorrect);
    if (!hasCorrect && updatedQuestions[qIndex].options.length > 0) {
        updatedQuestions[qIndex].options[0].isCorrect = true;
    }
    setFormData(prev => ({ ...prev, exerciseQuestions: updatedQuestions }));
  };

  const moveQuestion = (qIndex, direction) => {
    const updatedQuestions = [...formData.exerciseQuestions];
    const targetIndex = direction === 'up' ? qIndex - 1 : qIndex + 1;
    if (targetIndex < 0 || targetIndex >= updatedQuestions.length) return;
    [updatedQuestions[qIndex], updatedQuestions[targetIndex]] = [updatedQuestions[targetIndex], updatedQuestions[qIndex]];
    setFormData(prev => ({ ...prev, exerciseQuestions: updatedQuestions }));
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { title, description, resource_type, subject_area, difficulty_level, 
            videoUrl, videoDurationMinutes, articleContentText, articleEstimatedReadTime,
            exerciseType, exerciseInstructions, exerciseQuestions } = formData;
    
    let content_details = {};
    if (resource_type === 'VIDEO') {
      if (!videoUrl || !videoUrl.trim()) {
        setError("L'URL de la vidéo est requise pour le type VIDÉO."); setLoading(false); return;
      }
      content_details = { videoUrl, durationMinutes: videoDurationMinutes ? parseInt(videoDurationMinutes) : null };
    } else if (resource_type === 'ARTICLE') {
      if (!articleContentText || !articleContentText.trim()) {
        setError("Le contenu de l'article est requis pour le type ARTICLE."); setLoading(false); return;
      }
      content_details = { articleText: articleContentText, estimatedReadTime: articleEstimatedReadTime ? parseInt(articleEstimatedReadTime) : null };
    } else if (resource_type === 'EXERCISE') {
      if (exerciseQuestions.some(q => !q.text.trim() || q.options.some(opt => !opt.text.trim()))) {
        setError("Toutes les questions et options d'exercice doivent avoir un texte."); setLoading(false); return;
      }
      if (exerciseQuestions.some(q => !q.options.find(opt => opt.isCorrect))) {
        setError("Chaque question doit avoir au moins une option correcte sélectionnée."); setLoading(false); return;
      }
      content_details = {
        type: exerciseType,
        instructions: exerciseInstructions,
        questions: exerciseQuestions.map(q => ({
          id: q.id,
          text: q.text,
          options: q.options.map(opt => ({ id: opt.id, text: opt.text })),
          correctOptionId: q.options.find(opt => opt.isCorrect)?.id,
          explanation: q.explanation
        }))
      };
    }

    const resourcePayload = {
      title, description, resource_type, subject_area, difficulty_level,
      content_details,
    };

    try {
      if (isEditMode) {
        await updateResource(resourceId, resourcePayload);
        alert('Ressource modifiée avec succès !');
      } else {
        await createResource(resourcePayload);
        alert('Ressource ajoutée avec succès !');
      }
      navigate('/admin/resources');
    } catch (err) {
      setError(err.message || `Erreur lors de ${isEditMode ? 'la modification' : 'la création'} de la ressource.`);
      console.error(`Erreur ${isEditMode ? 'update' : 'create'}Resource (Admin):`, err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode && !formData.title) { 
    return <div className={styles.statusMessage}>Chargement des données de la ressource...</div>;
  }

  return (
    <div className={`${styles.adminPageContainer} ${styles.adminFormPage}`}>
      <header className={styles.adminPageHeader}>
        <h1>{pageTitle}</h1>
        <Link to="/admin/resources" className={`${styles.adminButton} ${styles.secondaryButton}`}>
          ← Retour à la liste
        </Link>
      </header>

      {error && <div className={`${formStyles.errorMessage} ${styles.formErrorMessage}`}>{error}</div>}

      <form onSubmit={handleSubmit} className={`${formStyles.authForm} ${styles.resourceForm}`}>
        {/* ... Champs communs (title, description, type, subject_area, difficulty_level) ... */}
        <div className={formStyles.formGroup}>
          <label htmlFor="title" className={formStyles.formLabel}>Titre de la ressource *</label>
          <input type="text" id="title" name="title" className={formStyles.formInput} value={formData.title} onChange={handleChange} required />
        </div>
        <div className={formStyles.formGroup}>
          <label htmlFor="description" className={formStyles.formLabel}>Description courte</label>
          <textarea id="description" name="description" className={`${formStyles.formInput} ${styles.textareaInputSmall}`} value={formData.description} onChange={handleChange} rows="3"/>
        </div>
        <div className={styles.formRow}>
          <div className={`${formStyles.formGroup} ${styles.formGroupThird}`}>
            <label htmlFor="resource_type" className={formStyles.formLabel}>Type de ressource *</label>
            <select id="resource_type" name="resource_type" className={formStyles.formInput} value={formData.resource_type} onChange={handleChange}>
              <option value="VIDEO">Vidéo</option>
              <option value="ARTICLE">Article</option>
              <option value="EXERCISE">Exercice</option>
            </select>
          </div>
          <div className={`${formStyles.formGroup} ${styles.formGroupThird}`}>
            <label htmlFor="subject_area" className={formStyles.formLabel}>Domaine/Sujet</label>
            <input type="text" id="subject_area" name="subject_area" className={formStyles.formInput} value={formData.subject_area} onChange={handleChange} placeholder="Ex: React, Mathématiques" />
          </div>
          <div className={`${formStyles.formGroup} ${styles.formGroupThird}`}>
            <label htmlFor="difficulty_level" className={formStyles.formLabel}>Difficulté</label>
            <select id="difficulty_level" name="difficulty_level" className={formStyles.formInput} value={formData.difficulty_level} onChange={handleChange}>
              <option value="EASY">Facile</option>
              <option value="MEDIUM">Moyen</option>
              <option value="HARD">Difficile</option>
            </select>
          </div>
        </div>


        {currentResourceType === 'VIDEO' && (
          <fieldset className={styles.detailsFieldset}>
            <legend>Détails Vidéo</legend>
            <div className={formStyles.formGroup}>
              <label htmlFor="videoUrl" className={formStyles.formLabel}>URL de la Vidéo (Embed YouTube ou lien direct .mp4) *</label>
              <input type="url" id="videoUrl" name="videoUrl" className={formStyles.formInput} value={formData.videoUrl} onChange={handleChange} placeholder="https://www.youtube.com/embed/ID_VIDEO" required={currentResourceType === 'VIDEO'}/>
            </div>
            <div className={formStyles.formGroup}>
              <label htmlFor="videoDurationMinutes" className={formStyles.formLabel}>Durée (minutes)</label>
              <input type="number" id="videoDurationMinutes" name="videoDurationMinutes" className={formStyles.formInput} value={formData.videoDurationMinutes} onChange={handleChange} placeholder="Ex: 15" min="0" />
            </div>
          </fieldset>
        )}
        {currentResourceType === 'ARTICLE' && (
          <fieldset className={styles.detailsFieldset}>
            <legend>Détails Article</legend>
            <div className={formStyles.formGroup}>
              <label htmlFor="articleContentText" className={formStyles.formLabel}>Contenu de l'article (Markdown simple supporté) *</label>
              <textarea id="articleContentText" name="articleContentText" className={`${formStyles.formInput} ${styles.textareaInputLarge}`} value={formData.articleContentText} onChange={handleChange} rows="15" placeholder="Écrivez ou collez le contenu de l'article ici..." required={currentResourceType === 'ARTICLE'}/>
            </div>
            <div className={formStyles.formGroup}>
              <label htmlFor="articleEstimatedReadTime" className={formStyles.formLabel}>Temps de lecture estimé (minutes)</label>
              <input type="number" id="articleEstimatedReadTime" name="articleEstimatedReadTime" className={formStyles.formInput} value={formData.articleEstimatedReadTime} onChange={handleChange} placeholder="Ex: 10" min="0" />
            </div>
          </fieldset>
        )}
        {currentResourceType === 'EXERCISE' && (
          <fieldset className={styles.detailsFieldset}>
            <legend>Détails Exercice</legend>
            <div className={formStyles.formGroup}>
                <label htmlFor="exerciseType" className={formStyles.formLabel}>Type d'exercice:</label>
                <select id="exerciseType" name="exerciseType" className={formStyles.formInput} value={formData.exerciseType} onChange={handleChange}>
                    <option value="QCM">Choix Multiple (QCM)</option>
                    {/* <option value="VRAI_FAUX">Vrai/Faux</option> -> À implémenter si besoin */}
                </select>
            </div>
            <div className={formStyles.formGroup}>
                <label htmlFor="exerciseInstructions" className={formStyles.formLabel}>Instructions générales:</label>
                <textarea id="exerciseInstructions" name="exerciseInstructions" className={`${formStyles.formInput} ${styles.textareaInputSmall}`} value={formData.exerciseInstructions} onChange={handleChange} placeholder="Instructions pour l'exercice..." />
            </div>

            {formData.exerciseQuestions.map((question, qIndex) => (
              <div key={question.id || qIndex} className={styles.questionBlock}>
                <div className={styles.questionHeader}>
                  <h4>Question {qIndex + 1}</h4>
                  <div>
                    {formData.exerciseQuestions.length > 1 && (
                        <button type="button" onClick={() => moveQuestion(qIndex, 'up')} disabled={qIndex === 0} className={styles.questionActionButton} title="Monter la question"><FaArrowUp /></button>
                    )}
                    {formData.exerciseQuestions.length > 1 && (
                        <button type="button" onClick={() => moveQuestion(qIndex, 'down')} disabled={qIndex === formData.exerciseQuestions.length - 1} className={styles.questionActionButton} title="Descendre la question"><FaArrowDown /></button>
                    )}
                    <button type="button" onClick={() => removeQuestion(qIndex)} className={`${styles.questionActionButton} ${styles.removeButton}`} title="Supprimer la question"><FaTimesCircle /></button>
                  </div>
                </div>
                <div className={formStyles.formGroup}>
                  <label htmlFor={`q_text_${qIndex}`} className={formStyles.formLabel}>Texte de la question *</label>
                  <textarea id={`q_text_${qIndex}`} name="text" value={question.text} onChange={(e) => handleQuestionChange(qIndex, 'text', e.target.value)} className={`${formStyles.formInput} ${styles.textareaInputSmall}`} rows="2" required />
                </div>
                <h5>Options de réponse (cochez la bonne réponse):</h5>
                {question.options.map((option, oIndex) => (
                  <div key={option.id || oIndex} className={styles.optionInputGroup}>
                    <input 
                        type="radio" 
                        id={`q${qIndex}_opt_correct_${oIndex}`} 
                        name={`q${qIndex}_correctOption`} 
                        checked={option.isCorrect}
                        onChange={() => handleCorrectOptionChange(qIndex, option.id)}
                        className={styles.correctOptionRadio}
                    />
                    <input type="text" value={option.text} onChange={(e) => handleOptionChange(qIndex, oIndex, 'text', e.target.value)} placeholder={`Texte de l'option ${oIndex + 1}`} className={formStyles.formInput} required />
                    {question.options.length > 2 && (
                      <button type="button" onClick={() => removeOption(qIndex, oIndex)} className={`${styles.questionActionButton} ${styles.removeButtonSmall}`} title="Supprimer l'option"><FaTimesCircle /></button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => addOption(qIndex)} className={`${styles.adminButton} ${styles.addOptionButton}`}><FaPlusCircle style={{marginRight: '5px'}}/> Ajouter une option</button>
                 <div className={formStyles.formGroup} style={{marginTop: '10px'}}>
                  <label htmlFor={`q_expl_${qIndex}`} className={formStyles.formLabel}>Explication (optionnel):</label>
                  <textarea id={`q_expl_${qIndex}`} name="explanation" value={question.explanation} onChange={(e) => handleQuestionChange(qIndex, 'explanation', e.target.value)} className={`${formStyles.formInput} ${styles.textareaInputSmall}`} rows="2" placeholder="Explication de la bonne réponse..."/>
                </div>
              </div>
            ))}
            <button type="button" onClick={addQuestion} className={`${styles.adminButton} ${styles.addQuestionButton}`}><FaPlusCircle style={{marginRight: '8px'}}/> Ajouter une Question</button>
          </fieldset>
        )}

        <button type="submit" className={`${formStyles.submitButton} ${styles.submitResourceButton}`} disabled={loading}>
          {loading ? <span className={formStyles.spinner}></span> : (isEditMode ? 'Enregistrer les Modifications' : 'Ajouter la Ressource')}
        </button>
      </form>
    </div>
  );
}

export default AdminAddResourcePage;