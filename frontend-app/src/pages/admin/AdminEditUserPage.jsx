// src/pages/admin/AdminEditUserPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getUserByIdAdmin, updateUserByAdmin } from '../../api/authApi';
import styles from './AdminPages.module.css'; 
import formStyles from '../../components/AuthForm/AuthForm.module.css'; 
import { useAuth } from '../../contexts/AuthContext'; 

function AdminEditUserPage() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { currentUser: adminUser } = useAuth(); 

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    user_type: 'STUDENT', 
    password: '', 
  });
  const [originalUserType, setOriginalUserType] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); // Pour la soumission du formulaire
  const [pageLoading, setPageLoading] = useState(true); // Pour le chargement initial des données

  const fetchUserData = useCallback(async () => {
    if (!userId) {
      setError('ID utilisateur manquant pour l\'édition.');
      setPageLoading(false);
      return;
    }
    console.log(`AdminEditUserPage: Tentative de récupération des données pour userId: ${userId}`);
    setPageLoading(true);
    try {
      const user = await getUserByIdAdmin(userId);
      console.log("AdminEditUserPage: Données utilisateur récupérées:", user);
      setFormData({
        username: user.username || '',
        email: user.email || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        user_type: user.user_type || 'STUDENT',
        password: '', 
      });
      setOriginalUserType(user.user_type); 
      setError('');
    } catch (err) {
      setError('Impossible de charger les données de l\'utilisateur. ' + (err.message || ''));
      console.error("Erreur fetchUserData (Admin Edit):", err);
    } finally {
      setPageLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { username, email, first_name, last_name, user_type, password } = formData;
    
    if (userId === adminUser?.userId && user_type !== originalUserType) {
        setError("Vous ne pouvez pas modifier votre propre type de compte via cette interface.");
        setLoading(false);
        return;
    }

    const payload = { username, email, first_name, last_name, user_type };
    if (password && password.trim() !== '') { 
      payload.password = password;
    }

    console.log("AdminEditUserPage: Soumission du payload:", payload);
    try {
      await updateUserByAdmin(userId, payload);
      alert('Utilisateur modifié avec succès !');
      navigate('/admin/users'); 
    } catch (err) {
      setError(err.message || 'Erreur lors de la modification de l\'utilisateur.');
      console.error("Erreur updateUser (Admin Edit):", err);
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return <div className={styles.statusMessage}>Chargement des données de l'utilisateur...</div>;
  }
  // Afficher l'erreur de chargement même si formData.username est vide, car c'est une page d'édition
  if (error && pageLoading === false && !formData.username && !isEditMode) { 
    // Ce cas est plus pour la création, pour l'édition on veut voir le formulaire même si erreur de chargement initial
  }


  return (
    <div className={`${styles.adminPageContainer} ${styles.adminFormPage}`}>
      <header className={styles.adminPageHeader}>
        <h1>Modifier l'Utilisateur : {formData.username || `ID ${userId?.slice(0,8)}...`}</h1>
        <Link to="/admin/users" className={`${styles.adminButton} ${styles.secondaryButton}`}>
          ← Retour à la liste
        </Link>
      </header>

      {/* Afficher l'erreur si elle existe, même si le formulaire est partiellement rempli */}
      {error && <div className={`${formStyles.errorMessage} ${styles.formErrorMessage}`}>{error}</div>}

      <form onSubmit={handleSubmit} className={`${formStyles.authForm} ${styles.resourceForm}`}>
        <div className={formStyles.formGroup}>
          <label htmlFor="username" className={formStyles.formLabel}>Nom d'utilisateur:</label>
          <input type="text" id="username" name="username" className={formStyles.formInput} value={formData.username} onChange={handleChange} required />
        </div>
        <div className={formStyles.formGroup}>
          <label htmlFor="email" className={formStyles.formLabel}>Email:</label>
          <input type="email" id="email" name="email" className={formStyles.formInput} value={formData.email} onChange={handleChange} required />
        </div>
        
        <div className={styles.formRow}> 
            <div className={`${formStyles.formGroup} ${formStyles.formGroupHalf}`}> 
                <label htmlFor="first_name" className={formStyles.formLabel}>Prénom:</label>
                <input type="text" id="first_name" name="first_name" className={formStyles.formInput} value={formData.first_name || ''} onChange={handleChange} />
            </div>
            <div className={`${formStyles.formGroup} ${formStyles.formGroupHalf}`}>
                <label htmlFor="last_name" className={formStyles.formLabel}>Nom:</label>
                <input type="text" id="last_name" name="last_name" className={formStyles.formInput} value={formData.last_name || ''} onChange={handleChange} />
            </div>
        </div>

        <div className={formStyles.formGroup}>
          <label htmlFor="user_type" className={formStyles.formLabel}>Type de compte:</label>
          <select 
            id="user_type" 
            name="user_type" 
            className={formStyles.formInput} 
            value={formData.user_type} 
            onChange={handleChange}
            disabled={userId === adminUser?.userId} 
          >
            <option value="STUDENT">Étudiant</option>
            <option value="ADMIN">Administrateur</option>
          </select>
          {userId === adminUser?.userId && <small className={styles.fieldNote}>Vous ne pouvez pas modifier votre propre type de compte.</small>}
        </div>

        <div className={formStyles.formGroup}>
          <label htmlFor="password" className={formStyles.formLabel}>Nouveau Mot de passe (laisser vide pour ne pas changer):</label>
          <input type="password" id="password" name="password" className={formStyles.formInput} value={formData.password} onChange={handleChange} placeholder="Nouveau mot de passe" />
        </div>

        <button type="submit" className={`${formStyles.submitButton} ${styles.submitResourceButton}`} disabled={loading || pageLoading}>
          {loading ? <span className={formStyles.spinner}></span> : 'Enregistrer les Modifications'}
        </button>
      </form>
    </div>
  );
}

export default AdminEditUserPage;