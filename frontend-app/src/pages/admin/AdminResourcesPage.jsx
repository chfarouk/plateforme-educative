// src/pages/admin/AdminResourcesPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAllResources, deleteResource } from '../../api/authApi'; // deleteResource ajouté
import styles from './AdminPages.module.css'; // Un fichier CSS commun pour les pages admin
import { FaEye, FaEdit, FaTrash, FaPlus } from 'react-icons/fa'; // Exemple d'icônes

function AdminResourcesPage() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchResources = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllResources();
      setResources(data);
      setError('');
    } catch (err) {
      setError(err.message || 'Impossible de charger les ressources.');
      console.error("Erreur fetchResources (Admin):", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const handleDeleteResource = async (resourceId, resourceTitle) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la ressource "${resourceTitle}" ? Cette action est irréversible.`)) {
      try {
        setLoading(true); // Indicateur de chargement pour la suppression
        await deleteResource(resourceId);
        alert(`Ressource "${resourceTitle}" supprimée avec succès.`);
        fetchResources(); // Recharger la liste après suppression
      } catch (err) {
        setError(err.message || `Erreur lors de la suppression de la ressource "${resourceTitle}".`);
        console.error("Erreur handleDeleteResource (Admin):", err);
        setLoading(false); // S'assurer de désactiver le loading en cas d'erreur
      }
      // setLoading(false) est déjà dans le finally de fetchResources,
      // mais on pourrait le mettre ici aussi si fetchResources n'est pas toujours appelé.
    }
  };

  if (loading && resources.length === 0) return <div className={styles.statusMessage}>Chargement des ressources...</div>;
  // Si on recharge après suppression, loading sera true mais resources aura encore les anciennes données.
  // On pourrait avoir un état de chargement spécifique pour la suppression.

  return (
    <div className={styles.adminPageContainer}>
      <header className={styles.adminPageHeader}>
        <h1>Gestion des Ressources</h1>
        <Link to="/admin/resources/new" className={`${styles.adminButton} ${styles.primaryButton}`}>
          <FaPlus style={{ marginRight: '8px' }} /> Ajouter une Nouvelle Ressource
        </Link>
      </header>

      {error && <div className={`${styles.statusMessage} ${styles.errorMessage}`}>Erreur: {error}</div>}
      
      {!loading && resources.length === 0 && !error && (
        <p className={styles.statusMessage}>Aucune ressource n'a été créée pour le moment.</p>
      )}

      {resources.length > 0 && (
        <div className={styles.adminTableContainer}>
          <table className={styles.adminTable}>
            <thead>
              <tr>
                <th>Titre</th>
                <th>Type</th>
                <th>Domaine</th>
                <th>Difficulté</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {resources.map((res) => (
                <tr key={res.resource_id}>
                  <td data-label="Titre">{res.title}</td>
                  <td data-label="Type">{res.resource_type}</td>
                  <td data-label="Domaine">{res.subject_area || '-'}</td>
                  <td data-label="Difficulté">{res.difficulty_level || '-'}</td>
                  <td data-label="Actions" className={styles.actionsCell}>
                    <button 
                      onClick={() => navigate(`/resources/${res.resource_id}`)} 
                      className={`${styles.actionButton} ${styles.viewButton}`}
                      title="Voir les détails"
                    >
                      <FaEye /> <span>Voir</span>
                    </button>
                    <button 
                      onClick={() => navigate(`/admin/resources/edit/${res.resource_id}`)} // Route à créer pour la modification
                      className={`${styles.actionButton} ${styles.editButton}`}
                      title="Modifier"
                    >
                      <FaEdit /> <span>Modifier</span>
                    </button>
                    <button 
                      onClick={() => handleDeleteResource(res.resource_id, res.title)} 
                      className={`${styles.actionButton} ${styles.deleteButton}`}
                      title="Supprimer"
                      disabled={loading} // Désactiver pendant une autre action de chargement
                    >
                      <FaTrash /> <span>Supprimer</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminResourcesPage;