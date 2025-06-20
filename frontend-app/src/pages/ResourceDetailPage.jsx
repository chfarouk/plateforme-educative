// src/pages/ResourceDetailPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
    getResourceById, 
    getProgressForResource, 
    updateProgress,
    addOrUpdateRating,
    getUserRatingForResource,
    getRatingStatsForResource,
    addCommentToResource,
    getCommentsForResource,
    updateCommentById,
    deleteCommentById
} from '../api/authApi';
import { useAuth } from '../contexts/AuthContext';
import ReactPlayer from 'react-player/lazy'; 
import { 
    FaPlayCircle, FaFileAlt, FaPuzzlePiece, 
    FaCheckCircle, FaTimesCircle, 
    FaStar, // FaRegStar n'est plus nécessaire si on style FaStar directement
    FaEdit, FaTrashAlt 
} from 'react-icons/fa';
import styles from './ResourceDetailPage.module.css'; 
import formStyles from '../components/AuthForm/AuthForm.module.css'; 

// Composant QCMInteraction
const QCMInteraction = ({ exerciseDetails, onAnswersChange, userAnswers, showResults, disabled }) => {
  if (!exerciseDetails || (exerciseDetails.type !== "QCM" && exerciseDetails.type !== "qcm") || !Array.isArray(exerciseDetails.questions)) {
    return <p className={styles.contentTypeMissing}>Structure d'exercice QCM invalide ou type non supporté.</p>;
  }
  const handleOptionSelect = (questionId, optionId) => {
    if (disabled) return;
    onAnswersChange(prevAnswers => ({ ...prevAnswers, [questionId]: optionId }));
  };
  return (
    <>
      {exerciseDetails.instructions && <p className={styles.exerciseInstructions}>{exerciseDetails.instructions}</p>}
      {exerciseDetails.questions.map((question, qIndex) => (
        <div 
          key={question.id || `q-${qIndex}`} 
          className={`
            ${styles.exerciseQuestion}
            ${showResults && userAnswers[question.id] === question.correctOptionId ? styles.correctAnswerHighlight : ''}
            ${showResults && userAnswers[question.id] && userAnswers[question.id] !== question.correctOptionId ? styles.incorrectAnswerHighlight : ''}
          `}
        >
          <p className={styles.questionText}><strong>Question {qIndex + 1}:</strong> {question.text}</p>
          {question.options && question.options.length > 0 && (
            <ul className={styles.exerciseOptions}>
              {question.options.map(option => (
                <li key={option.id} className={styles.optionItem}>
                  <label>
                    <input 
                      type="radio" 
                      name={`q_${question.id}`} 
                      value={option.id}
                      checked={userAnswers[question.id] === option.id}
                      onChange={() => handleOptionSelect(question.id, option.id)}
                      className={styles.optionRadio} 
                      disabled={disabled || showResults}
                    />
                    <span className={styles.optionText}>{option.text}</span>
                    {showResults && option.id === question.correctOptionId && <FaCheckCircle className={`${styles.optionFeedbackIcon} ${styles.iconCorrectResult}`} title="Bonne réponse"/>}
                    {showResults && userAnswers[question.id] === option.id && option.id !== question.correctOptionId && <FaTimesCircle className={`${styles.optionFeedbackIcon} ${styles.iconIncorrectResult}`} title="Votre réponse (incorrecte)"/>}
                  </label>
                </li>
              ))}
            </ul>
          )}
          {showResults && question.explanation && <p className={styles.questionExplanation}><i>Explication: {question.explanation}</i></p>}
        </div>
      ))}
    </>
  );
};

// Composant StarRating
const StarRating = ({ totalStars = 5, currentRating = 0, onRate, disabled = false, size = "1.3rem" }) => {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className={styles.starRating} onMouseLeave={() => !disabled && setHoverRating(0)}>
      {[...Array(totalStars)].map((_, index) => {
        const starValue = index + 1;
        return (
          <span 
            key={starValue} 
            className={`
              ${styles.star} 
              ${starValue <= (hoverRating || currentRating) ? styles.filledStar : styles.emptyStar} 
              ${disabled ? styles.disabledStar : ''}
            `}
            onClick={() => !disabled && onRate(starValue)}
            onMouseEnter={() => !disabled && setHoverRating(starValue)}
            title={`${starValue} étoile${starValue > 1 ? 's' : ''}`}
            style={{ fontSize: size }}
          >
            <FaStar />
          </span>
        );
      })}
    </div>
  );
};


function ResourceDetailPage() {
  const { resourceId } = useParams();
  const { currentUser } = useAuth(); // currentUser peut être null

  const [resource, setResource] = useState(null);
  const [progress, setProgress] = useState(null); // État initial: null, sera un objet si progression existe
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false); 

  const [userRating, setUserRating] = useState(0); 
  const [ratingStats, setRatingStats] = useState({ average_rating: null, total_ratings: 0 });
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [editingComment, setEditingComment] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState({ rating: false, comments: false, submitComment: false });
  const [commentPage, setCommentPage] = useState(1);
  const [totalComments, setTotalComments] = useState(0);
  const COMMENTS_PER_PAGE = 5;

  const [userAnswers, setUserAnswers] = useState({}); 
  const [showResults, setShowResults] = useState(false);
  const [exerciseScore, setExerciseScore] = useState(null);

  const fetchAllData = useCallback(async () => {
    if (!resourceId) return;
    setLoading(true); 
    setError('');
    setUserAnswers({}); 
    setShowResults(false);
    setExerciseScore(null);
    setComments([]);
    setCommentPage(1);
    setTotalComments(0);
    setUserRating(0); 
    setRatingStats({ average_rating: null, total_ratings: 0 }); 

    try {
      const resourceDataPromise = getResourceById(resourceId);
      const ratingStatsPromise = getRatingStatsForResource(resourceId);
      const commentsPromise = getCommentsForResource(resourceId, 1, COMMENTS_PER_PAGE);
      
      let userSpecificPromises = [];
      if (currentUser && currentUser.userId) { // Vérifier aussi currentUser.userId
        userSpecificPromises.push(getProgressForResource(resourceId));
        userSpecificPromises.push(getUserRatingForResource(resourceId));
      } else {
        // Si pas d'utilisateur, on peut quand même résoudre les promesses avec des valeurs par défaut
        userSpecificPromises.push(Promise.resolve(null)); // Pour progress
        userSpecificPromises.push(Promise.resolve({ rating: 0 })); // Pour userRating
      }

      const [resourceData, ratingStatsData, commentsData, progressData, userRatingData] = await Promise.all([
        resourceDataPromise,
        ratingStatsPromise,
        commentsPromise,
        ...userSpecificPromises // Déstructurer les promesses résolues
      ]);

      setResource(resourceData);
      setRatingStats(ratingStatsData || { average_rating: null, total_ratings: 0 });
      setComments(commentsData?.comments || []);
      setTotalComments(commentsData?.totalComments || 0);
      setCommentPage(1); 

      // Traiter les résultats des promesses spécifiques à l'utilisateur
      setProgress(progressData); // Peut être null si l'utilisateur n'est pas connecté ou pas de progression
      setUserRating(userRatingData?.rating || 0);
      
      if (resourceData?.resource_type === 'EXERCISE' && progressData?.status === 'COMPLETED' && progressData?.score !== null) {
          setShowResults(true); 
          setExerciseScore(progressData.score);
      }
    } catch (err) {
      setError(err.message || `Impossible de charger les données pour la ressource ${resourceId}.`);
      console.error(`Erreur chargement resource/feedback ${resourceId}:`, err);
    } finally {
      setLoading(false);
    }
  }, [resourceId, currentUser]); // currentUser est une dépendance clé

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]); 

  const handleUpdateProgress = async (newStatus, scoreToRecord = null) => {
    if (!currentUser || currentUser.userType !== 'STUDENT' || !resourceId ) {
      console.warn("handleUpdateProgress annulé: conditions non remplies", {currentUser, resourceId});
      return;
    }
    
    setActionLoading(true);
    try {
      const dataToUpdate = { status: newStatus };
      if (scoreToRecord !== null) dataToUpdate.score = scoreToRecord;

      const updatedData = await updateProgress(resourceId, dataToUpdate);
      setProgress(updatedData); 
      console.log(`Progression mise à jour à: ${newStatus} pour la ressource ${resourceId}`);
      
      if (newStatus === 'COMPLETED' && resource?.resource_type === 'EXERCISE') {
          setShowResults(true); 
          setExerciseScore(scoreToRecord);
      }
      if (newStatus === 'IN_PROGRESS' && resource?.resource_type === 'EXERCISE'){
          setShowResults(false); 
          setExerciseScore(null);
          setUserAnswers({}); 
      }
    } catch (err) {
      console.error("Erreur mise à jour progression:", err);
      alert(err.message || "Erreur lors de la mise à jour de la progression.");
    } finally {
      setActionLoading(false);
    }
  };
  
  const handleSubmitExercise = () => {
    if (!resource || !resource.details || !resource.details.questions || !isStudent) return;
    let score = 0; let correctAnswers = 0;
    const totalQuestions = resource.details.questions.length;
    resource.details.questions.forEach(q => { if (userAnswers[q.id] === q.correctOptionId) correctAnswers++; });
    score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    
    // S'assurer que progress est initialisé (ce qui devrait être le cas si l'étudiant a cliqué "Commencer")
    if (progress) {
        handleUpdateProgress('COMPLETED', score); 
    } else {
        console.warn("Tentative de soumettre un exercice sans progression initiée. L'utilisateur doit d'abord 'Commencer'.");
        alert("Veuillez d'abord commencer l'exercice avant de soumettre vos réponses.");
        // Optionnel: On pourrait forcer un statut IN_PROGRESS ici si on le souhaite
        // handleUpdateProgress('IN_PROGRESS', null).then(() => handleUpdateProgress('COMPLETED', score));
    }
  };

  const handleRetakeExercise = () => {
    if (!isStudent) return; 
    setUserAnswers({}); 
    setShowResults(false); 
    setExerciseScore(null);
    handleUpdateProgress('IN_PROGRESS', null);
  };

  const handleRateResource = async (newRating) => {
    if (!currentUser || !isStudent) { alert("Veuillez vous connecter en tant qu'étudiant pour noter."); return; }
    setFeedbackLoading(prev => ({ ...prev, rating: true }));
    try {
      await addOrUpdateRating(resourceId, newRating);
      setUserRating(newRating);
      const newStats = await getRatingStatsForResource(resourceId); 
      setRatingStats(newStats);
    } catch (err) {
      alert(err.message || "Erreur lors de l'enregistrement de la note.");
    } finally {
      setFeedbackLoading(prev => ({ ...prev, rating: false }));
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    if (!currentUser) { alert("Veuillez vous connecter pour commenter."); return; }
    
    setFeedbackLoading(prev => ({ ...prev, submitComment: true }));
    try {
      const addedComment = await addCommentToResource(resourceId, newCommentText);
      // addedComment contient maintenant author_username du backend
      setComments(prevComments => [addedComment, ...prevComments]); 
      setNewCommentText('');
      setTotalComments(prev => prev + 1); 
    } catch (err) {
      alert(err.message || "Erreur lors de l'ajout du commentaire.");
    } finally {
      setFeedbackLoading(prev => ({ ...prev, submitComment: false }));
    }
  };
  
  const handleBeginEditComment = (comment) => {
    setEditingComment({ comment_id: comment.comment_id, comment_text: comment.comment_text });
  };

  const handleCancelEditComment = () => {
    setEditingComment(null);
  };

  const handleSaveEditedComment = async (e) => {
    e.preventDefault();
    if (!editingComment || !editingComment.comment_text.trim()) return;
    setFeedbackLoading(prev => ({ ...prev, submitComment: true })); 
    try {
        const updatedCommentData = await updateCommentById(editingComment.comment_id, editingComment.comment_text);
        setComments(prevComments => prevComments.map(c => 
            c.comment_id === editingComment.comment_id 
            ? { ...c, 
                comment_text: updatedCommentData.comment_text, 
                updated_at: updatedCommentData.updated_at, 
                author_username: updatedCommentData.author_username || c.author_username 
              } 
            : c
        ));
        setEditingComment(null);
    } catch (err) {
        alert(err.message || "Erreur lors de la modification du commentaire.");
    } finally {
        setFeedbackLoading(prev => ({ ...prev, submitComment: false }));
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce commentaire ?")) return;
    try {
        await deleteCommentById(commentId);
        setComments(prevComments => prevComments.filter(c => c.comment_id !== commentId));
        setTotalComments(prev => prev - 1);
    } catch (err) {
        alert(err.message || "Erreur lors de la suppression du commentaire.");
    }
  };

  const loadMoreComments = async () => {
    if (comments.length >= totalComments) return;
    setFeedbackLoading(prev => ({ ...prev, comments: true }));
    try {
        const nextPage = commentPage + 1;
        const newCommentsData = await getCommentsForResource(resourceId, nextPage, COMMENTS_PER_PAGE);
        if (newCommentsData && newCommentsData.comments) {
            setComments(prev => [...prev, ...newCommentsData.comments]);
            setCommentPage(nextPage);
        }
    } catch (err) {
        setError("Impossible de charger plus de commentaires."); 
    } finally {
        setFeedbackLoading(prev => ({ ...prev, comments: false }));
    }
  };

  if (loading) return <div className={styles.statusMessage}>Chargement de la ressource...</div>;
  if (error && !resource) return <div className={`${styles.statusMessage} ${styles.errorMessage}`}>Erreur: {error}</div>;
  if (!resource) return <div className={styles.statusMessage}>Ressource non trouvée.</div>;

  const currentStatus = progress ? progress.status : 'NOT_STARTED';
  const isStudent = currentUser && currentUser.userType === 'STUDENT';

  const getResourceIcon = (type) => {
    if (type === 'VIDEO') return <FaPlayCircle className={styles.headerIcon} />;
    if (type === 'ARTICLE') return <FaFileAlt className={styles.headerIcon} />;
    if (type === 'EXERCISE') return <FaPuzzlePiece className={styles.headerIcon} />;
    return null;
  };

  return (
    <div className={styles.resourceDetailPage}>
      <Link to="/catalogue" className={styles.backLink}>
        ← Retour au catalogue
      </Link>

      <article className={styles.resourceContentCard}>
        <header className={styles.resourceHeader}>
          <div className={styles.titleWithIcon}>
            {getResourceIcon(resource.resource_type)}
            <h1>{resource.title}</h1>
          </div>
          <div className={styles.metaInfo}>
            <span><strong>Type:</strong> {resource.resource_type}</span>
            <span><strong>Domaine:</strong> {resource.subject_area || 'N/A'}</span>
            <span><strong>Difficulté:</strong> {resource.difficulty_level || 'N/A'}</span>
          </div>
          <div className={styles.ratingDisplay}>
            <StarRating totalStars={5} currentRating={ratingStats.average_rating || 0} disabled={true} size="1.1rem"/>
            {ratingStats.total_ratings > 0 ? (
              <span className={styles.ratingText}>
                {ratingStats.average_rating?.toFixed(1)} ({ratingStats.total_ratings} vote{ratingStats.total_ratings !== 1 ? 's' : ''})
              </span>
            ) : (
              <span className={styles.ratingText}>Pas encore noté</span>
            )}
          </div>
          <p className={styles.creationDate}>
            <i>Publié le: {new Date(resource.creation_date).toLocaleDateString()}</i>
          </p>
        </header>

        {resource.description && (
          <section className={styles.sectionBlock}> 
            <h2 className={styles.sectionTitle}>Description</h2>
            <p className={styles.descriptionText}>{resource.description}</p>
          </section>
        )}

        {isStudent && (
          <section className={`${styles.sectionBlock} ${styles.progressSection}`}>
            <h2 className={styles.sectionTitle}>Votre Progression</h2>
            <div className={styles.progressStatus}>
              Statut: <strong className={`${styles.statusTag} ${styles[currentStatus.toLowerCase().replace('_', '')]}`}>{currentStatus.replace('_', ' ')}</strong>
              {(exerciseScore !== null || (progress?.score !== null && currentStatus === 'COMPLETED')) && resource.resource_type === 'EXERCISE' && (
                <span className={styles.score}>Score: {exerciseScore !== null ? exerciseScore : progress?.score}%</span>
              )}
            </div>
            {progress?.completion_date && currentStatus === 'COMPLETED' && (
              <p className={styles.completionDate}>Terminé le: {new Date(progress.completion_date).toLocaleDateString()}</p>
            )}
            {resource.resource_type !== 'EXERCISE' && (
                <div className={styles.progressActions}>
                {currentStatus !== 'COMPLETED' && (
                    <>
                    {currentStatus === 'NOT_STARTED' && (
                        <button onClick={() => handleUpdateProgress('IN_PROGRESS')} disabled={actionLoading} className={styles.actionButton}>
                        {actionLoading ? <span className={formStyles.spinner}></span> : '🚀 Commencer'}
                        </button>
                    )}
                    {currentStatus === 'IN_PROGRESS' && (
                        <button onClick={() => handleUpdateProgress('COMPLETED')} disabled={actionLoading} className={styles.actionButton}>
                        {actionLoading ? <span className={formStyles.spinner}></span> : '✅ Marquer comme terminé'}
                        </button>
                    )}
                    </>
                )}
                {currentStatus === 'COMPLETED' && (
                    <button onClick={() => handleUpdateProgress('IN_PROGRESS')} disabled={actionLoading} className={`${styles.actionButton} ${styles.actionButtonTertiary}`}>
                        {actionLoading ? <span className={formStyles.spinner}></span> : '🔄 Recommencer'}
                    </button>
                )}
                </div>
            )}
             {resource.resource_type === 'EXERCISE' && currentStatus === 'NOT_STARTED' && !showResults && (
                <div className={styles.progressActions}>
                    <button onClick={() => handleUpdateProgress('IN_PROGRESS')} disabled={actionLoading} className={styles.actionButton}>
                        {actionLoading ? <span className={formStyles.spinner}></span> : '🚀 Commencer l\'exercice'}
                    </button>
                </div>
            )}
          </section>
        )}
        {currentUser && !isStudent && ( <p className={styles.adminNotice}>Les actions de progression sont réservées aux étudiants.</p> )}
        {!currentUser && ( <p className={styles.loginNotice}><Link to="/login">Connectez-vous</Link> pour suivre votre progression et interagir avec le contenu.</p> )}

        <section className={`${styles.sectionBlock} ${styles.resourceSpecificContentSection}`}>
          <h2 className={styles.sectionTitle}>Contenu de la Ressource</h2>
          
          {resource.resource_type === 'VIDEO' && resource.details?.videoUrl && (
            <div className={styles.videoContent}>
              <div className={styles.videoPlayerWrapper}>
                <ReactPlayer 
                  url={resource.details.videoUrl} 
                  controls={true}
                  width='100%'
                  height='100%'
                  className={styles.reactPlayer}
                  config={{
                    youtube: { playerVars: { showinfo: 0, modestbranding:1, rel: 0, iv_load_policy: 3 } },
                    vimeo: { playerOptions: { byline: false, portrait: false, title: false } }
                  }}
                />
              </div>
              {resource.details.durationMinutes && <p className={styles.videoMeta}>Durée approximative: {resource.details.durationMinutes} minutes</p>}
            </div>
          )}
          {resource.resource_type === 'VIDEO' && (!resource.details || !resource.details.videoUrl) && (
            <p className={styles.contentTypeMissing}>Lien vidéo non disponible.</p>
          )}

          {resource.resource_type === 'ARTICLE' && resource.details?.articleText && (
            <div className={styles.articleContent}>
              {resource.details.estimatedReadTime && <p className={styles.readTime}>Temps de lecture estimé: {resource.details.estimatedReadTime} minutes</p>}
              <div className={styles.articleText}>
                {resource.details.articleText.split('\n').map((paragraph, index) => (
                    paragraph.trim() === '' ? <br key={`br-${index}`} /> : <p key={`p-${index}`}>{paragraph}</p>
                ))}
              </div>
            </div>
          )}
           {resource.resource_type === 'ARTICLE' && (!resource.details || !resource.details.articleText) && (
            <p className={styles.contentTypeMissing}>Contenu de l'article non disponible.</p>
          )}

          {resource.resource_type === 'EXERCISE' && resource.details?.questions && ( 
            <>
              {(isStudent && !showResults && currentStatus === 'IN_PROGRESS') || (!isStudent && resource.details) ? ( 
                <div className={styles.exerciseInteractive}>
                  <QCMInteraction 
                    exerciseDetails={resource.details} 
                    userAnswers={userAnswers}
                    onAnswersChange={setUserAnswers}
                    disabled={actionLoading || showResults || !isStudent} 
                  />
                  {isStudent && !showResults && currentStatus === 'IN_PROGRESS' && (
                      <button 
                        onClick={handleSubmitExercise} 
                        disabled={actionLoading || Object.keys(userAnswers).length !== resource.details.questions.length} 
                        className={`${styles.actionButton} ${styles.submitExerciseButton}`}
                      >
                        {actionLoading ? <span className={formStyles.spinner}></span> : 'Soumettre mes réponses'}
                      </button>
                  )}
                </div>
              ) : null}

              {isStudent && showResults && ( 
                <div className={styles.exerciseResults}>
                  <h3>Vos Résultats</h3>
                  <p className={styles.finalScore}>Votre score: {exerciseScore !== null ? `${exerciseScore}%` : "Calcul en cours..."}</p>
                  <QCMInteraction 
                    exerciseDetails={resource.details} 
                    userAnswers={userAnswers} 
                    onAnswersChange={() => {}} 
                    showResults={true} 
                    disabled={true} 
                  />
                  <button onClick={handleRetakeExercise} disabled={actionLoading} className={`${styles.actionButton} ${styles.actionButtonTertiary}`}>
                    {actionLoading ? <span className={formStyles.spinner}></span> : 'Refaire l\'exercice'}
                  </button>
                </div>
              )}
            </>
          )}
          {resource.resource_type === 'EXERCISE' && isStudent && currentStatus === 'NOT_STARTED' && !showResults && (
            <p className={styles.startExercisePrompt}>Cliquez sur "Commencer l'exercice" dans la section "Votre Progression" pour démarrer.</p>
          )}
           {resource.resource_type === 'EXERCISE' && (!resource.details || !Array.isArray(resource.details.questions)) && (
            <p className={styles.contentTypeMissing}>Structure de l'exercice non disponible ou incorrecte.</p>
          )}
        </section>

        <section className={`${styles.sectionBlock} ${styles.feedbackSection}`}>
            <h2 className={styles.sectionTitle}>Avis et Commentaires</h2>
            {currentUser && isStudent && ( // Seuls les étudiants connectés peuvent noter
            <div className={styles.userRatingSection}>
                <h4>Votre Note :</h4>
                <StarRating 
                    currentRating={userRating || 0} 
                    onRate={handleRateResource} 
                    disabled={feedbackLoading.rating}
                />
                {feedbackLoading.rating && <small className={styles.loadingText}>Enregistrement...</small>}
            </div>
            )}
            {currentUser && !isStudent && (
                <p className={styles.disabledTextForRating}>La notation est réservée aux étudiants.</p>
            )}
            {!currentUser && <p className={styles.loginToInteract}>Veuillez <Link to="/login">vous connecter</Link> pour noter cette ressource.</p>}

            <div className={styles.commentsSection}>
                <h4>Commentaires ({totalComments})</h4>
                {currentUser && (
                  editingComment ? (
                    <form onSubmit={handleSaveEditedComment} className={styles.commentForm}>
                        <textarea 
                            value={editingComment.comment_text}
                            onChange={(e) => setEditingComment(prev => ({...prev, comment_text: e.target.value}))}
                            rows="3"
                            className={styles.commentTextarea}
                            required
                            maxLength="1000"
                        />
                        <div className={styles.editActions}>
                            <button type="submit" className={styles.commentSubmitButton} disabled={feedbackLoading.submitComment || !editingComment.comment_text.trim()}>
                                {feedbackLoading.submitComment ? <span className={formStyles.spinner}></span> : "Enregistrer"}
                            </button>
                            <button type="button" onClick={handleCancelEditComment} className={styles.commentCancelButton}>
                                Annuler
                            </button>
                        </div>
                    </form>
                  ) : (
                    <form onSubmit={handleAddComment} className={styles.commentForm}>
                        <textarea 
                            value={newCommentText}
                            onChange={(e) => setNewCommentText(e.target.value)}
                            placeholder="Laissez votre commentaire ici..."
                            rows="3"
                            className={styles.commentTextarea}
                            required
                            maxLength="1000"
                        />
                        <button type="submit" className={styles.commentSubmitButton} disabled={feedbackLoading.submitComment || !newCommentText.trim()}>
                            {feedbackLoading.submitComment ? <span className={formStyles.spinner}></span> : "Commenter"}
                        </button>
                    </form>
                  )
                )}
                {!currentUser && <p className={styles.loginToInteract}>Veuillez <Link to="/login">vous connecter</Link> pour laisser un commentaire.</p>}
                
                {error && <p className={`${styles.errorMessage} ${styles.commentsError}`}>{error}</p>} {/* Afficher l'erreur de chargement des commentaires */}

                {feedbackLoading.comments && comments.length === 0 && <div className={styles.statusMessage}>Chargement des commentaires...</div>}
                
                {!feedbackLoading.comments && comments.length === 0 && !error && (
                    <p className={styles.noComments}>Aucun commentaire pour le moment. Soyez le premier à donner votre avis !</p>
                )}

                {comments.length > 0 && (
                    <ul className={styles.commentsList}>
                        {comments.map(comment => (
                            <li key={comment.comment_id} className={styles.commentItem}>
                                <div className={styles.commentHeader}>
                                    <strong className={styles.commentAuthor}>
                                        {comment.author_username || `Utilisateur ${comment.user_id.slice(0,8)}...`} 
                                    </strong>
                                    <span className={styles.commentDate}>
                                      {new Date(comment.created_at).toLocaleString()}
                                      {comment.updated_at && new Date(comment.updated_at).getTime() !== new Date(comment.created_at).getTime() && ' (modifié)'}
                                    </span>
                                </div>
                                <p className={styles.commentText}>{comment.comment_text}</p>
                                {currentUser && (currentUser.userId === comment.user_id || currentUser.userType === 'ADMIN') && !editingComment && (
                                    <div className={styles.commentActions}>
                                        {currentUser.userId === comment.user_id && (
                                            <button onClick={() => handleBeginEditComment(comment)} className={styles.commentActionButton} title="Modifier">
                                                <FaEdit /> <span>Modifier</span>
                                            </button>
                                        )}
                                        <button onClick={() => handleDeleteComment(comment.comment_id)} className={`${styles.commentActionButton} ${styles.deleteAction}`} title="Supprimer">
                                            <FaTrashAlt /> <span>Supprimer</span>
                                        </button>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
                {comments.length > 0 && comments.length < totalComments && (
                    <button onClick={loadMoreComments} disabled={feedbackLoading.comments} className={styles.loadMoreButton}>
                        {feedbackLoading.comments ? <span className={formStyles.spinner}></span> : "Charger plus de commentaires"}
                    </button>
                )}
            </div>
        </section>
      </article>
    </div>
  );
}

export default ResourceDetailPage;