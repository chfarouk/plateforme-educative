// src/pages/CataloguePage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getAllResources, getAllUserProgress } from '../api/authApi';
import { useAuth } from '../contexts/AuthContext';
import styles from './CataloguePage.module.css';
import { FaPlayCircle, FaFileAlt, FaPuzzlePiece } from 'react-icons/fa'; // Icônes

const ResourceCard = ({ resource, progressStatus }) => {
  let statusDisplay = '';
  let statusClass = '';
  let icon = null;

  if (resource.resource_type === 'VIDEO') icon = <FaPlayCircle className={styles.cardIcon} />;
  else if (resource.resource_type === 'ARTICLE') icon = <FaFileAlt className={styles.cardIcon} />;
  else if (resource.resource_type === 'EXERCISE') icon = <FaPuzzlePiece className={styles.cardIcon} />;


  if (progressStatus === 'COMPLETED') {
    statusDisplay = 'Terminé'; // Texte plus court
    statusClass = styles.statusCompleted;
  } else if (progressStatus === 'IN_PROGRESS') {
    statusDisplay = 'En cours';
    statusClass = styles.statusInProgress;
  }

  return (
    <Link to={`/resources/${resource.resource_id}`} className={styles.cardLink}>
      <div className={styles.resourceCard}>
        <div className={styles.cardHeader}>
          {icon}
          <h3 className={styles.cardTitle}>{resource.title}</h3>
        </div>
        <div className={styles.cardContent}>
          {statusDisplay && <span className={`${styles.cardStatus} ${statusClass}`}>{statusDisplay}</span>}
          <p className={styles.cardDescription}>{resource.description?.substring(0, 100)}...</p> {/* Description un peu plus courte */}
          <div className={styles.cardMeta}>
            <span><strong>Type:</strong> {resource.resource_type}</span>
            <span><strong>Domaine:</strong> {resource.subject_area || 'N/A'}</span>
            <span><strong>Difficulté:</strong> {resource.difficulty_level || 'N/A'}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};


function CataloguePage() {
  const { currentUser } = useAuth();
  const [resources, setResources] = useState([]);
  const [userProgressMap, setUserProgressMap] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const resourcesData = await getAllResources();
      setResources(resourcesData);

      if (currentUser) {
        const progressData = await getAllUserProgress();
        const progressMap = new Map();
        progressData.forEach(p => progressMap.set(p.resource_id, p));
        setUserProgressMap(progressMap);
      }
      setError('');
    } catch (err) {
      setError(err.message || 'Impossible de charger les données.');
      console.error("Erreur chargement catalogue/progression:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getProgressStatusForResource = (resourceId) => {
    if (!currentUser || !userProgressMap.has(resourceId)) {
      return null;
    }
    return userProgressMap.get(resourceId).status;
  };

  const filteredResources = resources
    .filter(resource => 
      (filterType === '' || resource.resource_type === filterType) &&
      (searchTerm === '' || 
        resource.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (resource.description && resource.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (resource.subject_area && resource.subject_area.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    );

  if (loading) return <div className={styles.loadingMessage}>Chargement du catalogue...</div>;
  if (error) return <div className={`${styles.statusMessage} ${styles.errorMessage}`}>Erreur: {error}</div>;

  return (
    <div className={styles.cataloguePage}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Catalogue des Ressources</h1>
        <p className={styles.pageSubtitle}>Trouvez la prochaine ressource pour booster votre apprentissage.</p>
      </header>
      
      <div className={styles.filters}>
        <input 
          type="text" 
          placeholder="Rechercher (titre, description, domaine)..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
        <select 
          value={filterType} 
          onChange={(e) => setFilterType(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="">Tous les Types</option>
          <option value="VIDEO">Vidéo</option>
          <option value="ARTICLE">Article</option>
          <option value="EXERCISE">Exercice</option>
          {/* Option "COURSE" supprimée */}
        </select>
      </div>

      {filteredResources.length === 0 ? (
        <p className={styles.noResourcesMessage}>Aucune ressource ne correspond à vos critères de recherche.</p>
      ) : (
        <div className={styles.resourcesGrid}>
          {filteredResources.map((resource) => (
            <ResourceCard 
              key={resource.resource_id} 
              resource={resource} 
              progressStatus={getProgressStatusForResource(resource.resource_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default CataloguePage;