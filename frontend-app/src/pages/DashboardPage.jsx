// src/pages/DashboardPage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getMe, getAllUserProgress, getMyRecommendations } from '../api/authApi';
import { Link, useNavigate } from 'react-router-dom';
import RecommendationItem from '../components/RecommendationItem'; 
import styles from './DashboardPage.module.css'; 

function DashboardPage() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const [userData, setUserData] = useState(null);
  const [userProgress, setUserProgress] = useState([]); 
  const [recommendations, setRecommendations] = useState([]); 

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const basicUserDataPromise = getMe();
      let promisesToAwait = [basicUserDataPromise];

      if (currentUser.userType === 'STUDENT') {
        promisesToAwait.push(getAllUserProgress());
        promisesToAwait.push(getMyRecommendations()); 
      }

      const results = await Promise.all(promisesToAwait);
      
      setUserData(results[0]); 

      if (currentUser.userType === 'STUDENT') {
        setUserProgress(results[1] || []); 
        setRecommendations(results[2] || []); 
      }

    } catch (err) {
      console.error("Erreur chargement dashboard data:", err);
      setError(err.message || 'Impossible de charger les données du tableau de bord.');
      if (err.response && err.response.status === 401) { 
        logout();
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  }, [currentUser, navigate, logout]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <div className={styles.statusMessage}>Chargement du tableau de bord...</div>;
  if (error) return <div className={`${styles.statusMessage} ${styles.errorMessage}`}>Erreur: {error}</div>;
  if (!userData) return <div className={styles.statusMessage}>Aucune donnée utilisateur à afficher.</div>;

  const completedCount = currentUser.userType === 'STUDENT' ? userProgress.filter(p => p.status === 'COMPLETED').length : 0;
  const inProgressCount = currentUser.userType === 'STUDENT' ? userProgress.filter(p => p.status === 'IN_PROGRESS').length : 0;

  const singleRecommendation = recommendations.length > 0 ? recommendations[0] : null;

  return (
    <div className={styles.dashboardPage}>
      <header className={styles.dashboardHeader}>
        <h1>Tableau de Bord</h1>
        <p>
          Bienvenue, {userData.username} ! 
          {currentUser.userType === 'ADMIN' 
            ? " Gestion de la plateforme." 
            : " Prêt à apprendre aujourd'hui ?"}
        </p>
      </header>

      <div className={styles.dashboardGrid}>
        <section 
          className={`
            ${styles.dashboardCard} 
            ${currentUser.userType === 'ADMIN' ? styles.adminInfoCard : styles.userInfoCard} 
          `}
        >
          <h2>Mes Informations</h2>
          <div className={styles.userInfoDetails}>
            <p><strong>Nom d'utilisateur:</strong> {userData.username}</p>
            <p><strong>Email:</strong> {userData.email}</p>
            <p><strong>Type de compte:</strong> {userData.userType === 'ADMIN' ? 'Administrateur' : 'Étudiant'}</p>
            <p><strong>Inscrit le:</strong> {new Date(userData.registration_date).toLocaleDateString()}</p>
          </div>
          <button onClick={() => { logout(); navigate('/'); }} className={styles.logoutButton}>
            Déconnexion
          </button>
        </section>

        {currentUser.userType === 'ADMIN' && (
          <>
            <section className={`${styles.dashboardCard} ${styles.adminManagementCard}`}>
              <h2>Gestion des Ressources</h2>
              <ul className={styles.adminActionList}>
                <li><Link to="/admin/resources" className={styles.adminLink}>Voir toutes les ressources</Link></li>
                <li><Link to="/admin/resources/new" className={styles.adminLink}>Ajouter une nouvelle ressource</Link></li>
              </ul>
              <p className={styles.adminCardDescription}>Créez, modifiez et organisez le contenu pédagogique de la plateforme.</p>
            </section>

            <section className={`${styles.dashboardCard} ${styles.adminManagementCard}`}>
              <h2>Gestion des Utilisateurs</h2>
              <ul className={styles.adminActionList}>
                <li><Link to="/admin/users" className={styles.adminLink}>Voir tous les utilisateurs</Link></li>
              </ul>
              <p className={styles.adminCardDescription}>Gérez les comptes étudiants et administrateurs. (Fonctionnalité à venir)</p>
            </section>
          </>
        )}

        {currentUser.userType === 'STUDENT' && (
          <>
            <section className={`${styles.dashboardCard} ${styles.progressCard}`}>
              <h2>Ma Progression</h2>
              <div className={styles.progressStats}>
                <div className={styles.statItem}>
                  <span className={styles.statValue}>{inProgressCount}</span>
                  <span className={styles.statLabel}>En Cours</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statValue}>{completedCount}</span>
                  <span className={styles.statLabel}>Terminées</span>
                </div>
              </div>
              <Link to="/catalogue" className={styles.actionLink}>
                Explorer plus de ressources →
              </Link>
            </section>

            <section className={`${styles.dashboardCard} ${styles.recommendationsCard}`}>
              <h2>Recommandations</h2>
              {singleRecommendation && !loading ? ( 
                <ul className={styles.recommendationsList}>
                    <RecommendationItem 
                        key={singleRecommendation.db_recommendation_id || singleRecommendation.resource_id} 
                        recommendation={singleRecommendation} 
                    />
                </ul>
              ) : !loading ? ( 
                <p className={styles.noRecommendationsMessage}>
                  Pas de recommandation pour le moment. Explorez et complétez plus de contenu pour des suggestions personnalisées !
                </p>
              ) : null } 
            </section>
          </>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;