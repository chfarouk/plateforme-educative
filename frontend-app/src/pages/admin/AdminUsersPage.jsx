// src/pages/admin/AdminUsersPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAllUsersAdmin, deleteUserByAdmin } from '../../api/authApi';
import styles from './AdminPages.module.css'; 
import { FaUserEdit, FaUserSlash } from 'react-icons/fa'; // FaUserPlus, FaEye enlevées si non utilisées
import { useAuth } from '../../contexts/AuthContext'; 

function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { currentUser } = useAuth(); 

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllUsersAdmin();
      setUsers(data);
      setError('');
    } catch (err) {
      setError(err.message || 'Impossible de charger les utilisateurs.');
      console.error("Erreur fetchUsers (Admin):", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDeleteUser = async (userId, username) => {
    if (userId === currentUser?.userId) {
      alert("Vous ne pouvez pas supprimer votre propre compte administrateur.");
      return;
    }
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur "${username}" ? Cette action est irréversible.`)) {
      try {
        // Il serait bon d'avoir un état de chargement spécifique pour la suppression
        // pour ne pas désactiver tous les boutons de la page si loading global est utilisé
        await deleteUserByAdmin(userId);
        alert(`Utilisateur "${username}" supprimé avec succès.`);
        fetchUsers(); 
      } catch (err) {
        setError(err.message || `Erreur lors de la suppression de l'utilisateur "${username}".`);
        console.error("Erreur handleDeleteUser (Admin):", err);
      }
    }
  };

  const handleEditUser = (userId) => {
    console.log("AdminUsersPage: Clic sur Modifier pour l'utilisateur ID:", userId); // LOG DE DÉBOGAGE
    navigate(`/admin/users/edit/${userId}`);
  };


  if (loading && users.length === 0 && !error) return <div className={styles.statusMessage}>Chargement des utilisateurs...</div>;
  
  return (
    <div className={styles.adminPageContainer}>
      <header className={styles.adminPageHeader}>
        <h1>Gestion des Utilisateurs</h1>
        {/* Optionnel: Bouton pour ajouter un utilisateur (nécessiterait une page AdminCreateUserPage) */}
        {/* 
        <Link to="/admin/users/new" className={`${styles.adminButton} ${styles.primaryButton}`}>
          <FaUserPlus style={{ marginRight: '8px' }} /> Ajouter un Utilisateur
        </Link> 
        */}
      </header>

      {error && <div className={`${styles.statusMessage} ${styles.errorMessage}`}>{error}</div>}
      
      {!loading && users.length === 0 && !error && (
        <p className={styles.statusMessage}>Aucun utilisateur trouvé.</p>
      )}

      {users.length > 0 && (
        <div className={styles.adminTableContainer}>
          <table className={styles.adminTable}>
            <thead>
              <tr>
                <th>Nom d'utilisateur</th>
                <th>Email</th>
                <th>Nom Complet</th>
                <th>Type</th>
                <th>Inscrit le</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.user_id}>
                  <td data-label="Nom d'utilisateur">{user.username}</td>
                  <td data-label="Email">{user.email}</td>
                  <td data-label="Nom Complet">{(user.first_name || '') + ' ' + (user.last_name || '')}</td>
                  <td data-label="Type">
                    <span className={`${styles.userTypeBadge} ${styles[user.user_type?.toLowerCase()]}`}>
                      {user.user_type}
                    </span>
                  </td>
                  <td data-label="Inscrit le">{new Date(user.registration_date).toLocaleDateString()}</td>
                  <td data-label="Actions" className={styles.actionsCell}>
                    <button 
                      onClick={() => handleEditUser(user.user_id)} // Utiliser la nouvelle fonction handler
                      className={`${styles.actionButton} ${styles.editButton}`}
                      title="Modifier l'utilisateur"
                      // Désactiver si l'admin essaie de modifier son propre rôle (géré dans la page d'édition maintenant)
                      // disabled={user.user_id === currentUser?.userId && user.user_type === 'ADMIN'} 
                    >
                      <FaUserEdit /> <span>Modifier</span>
                    </button>
                    <button 
                      onClick={() => handleDeleteUser(user.user_id, user.username)} 
                      className={`${styles.actionButton} ${styles.deleteButton}`}
                      title="Supprimer l'utilisateur"
                      disabled={user.user_id === currentUser?.userId} // Empêcher l'auto-suppression
                    >
                      <FaUserSlash /> <span>Supprimer</span>
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

export default AdminUsersPage;