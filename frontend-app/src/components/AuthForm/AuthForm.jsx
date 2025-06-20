// src/components/AuthForm/AuthForm.jsx
import React, { useState } from 'react';
import styles from './AuthForm.module.css';
import { Link } from 'react-router-dom';

// Ajout de la prop allowRoleSelection
function AuthForm({ onSubmit, buttonText, isRegister = false, formTitle, allowRoleSelection = false }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    userType: 'STUDENT', // Valeur par défaut
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let dataToSubmit;
      if (isRegister) {
        // Si allowRoleSelection n'est pas vrai, on s'assure que userType est STUDENT
        // même si le champ n'est pas affiché (sécurité côté client, le backend doit aussi valider)
        dataToSubmit = { ...formData };
        if (!allowRoleSelection) {
          dataToSubmit.userType = 'STUDENT';
        }
      } else {
        dataToSubmit = { email: formData.email, password: formData.password };
      }
      await onSubmit(dataToSubmit);
    } catch (err) {
      setError(err.message || 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authFormContainer}>
      <form onSubmit={handleSubmit} className={styles.authForm}>
        <h2 className={styles.formTitle}>{formTitle}</h2>
        {error && <p className={styles.errorMessage}>{error}</p>}

        {isRegister && (
          <>
            <div className={styles.formGroup}>
              <label htmlFor="username" className={styles.formLabel}>Nom d'utilisateur</label>
              <input
                type="text" id="username" name="username"
                className={styles.formInput} value={formData.username}
                onChange={handleChange} required placeholder="Choisissez un nom d'utilisateur"
              />
            </div>
            <div className={styles.nameGroup}>
              <div className={`${styles.formGroup} ${styles.formGroupHalf}`}>
                <label htmlFor="firstName" className={styles.formLabel}>Prénom</label>
                <input
                  type="text" id="firstName" name="firstName"
                  className={styles.formInput} value={formData.firstName}
                  onChange={handleChange} placeholder="Votre prénom"
                />
              </div>
              <div className={`${styles.formGroup} ${styles.formGroupHalf}`}>
                <label htmlFor="lastName" className={styles.formLabel}>Nom</label>
                <input
                  type="text" id="lastName" name="lastName"
                  className={styles.formInput} value={formData.lastName}
                  onChange={handleChange} placeholder="Votre nom"
                />
              </div>
            </div>
          </>
        )}

        <div className={styles.formGroup}>
          <label htmlFor="email" className={styles.formLabel}>Adresse Email</label>
          <input
            type="email" id="email" name="email"
            className={styles.formInput} value={formData.email}
            onChange={handleChange} required placeholder="exemple@domaine.com"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="password" className={styles.formLabel}>Mot de passe</label>
          <input
            type="password" id="password" name="password"
            className={styles.formInput} value={formData.password}
            onChange={handleChange} required
            placeholder={isRegister ? "Choisissez un mot de passe sécurisé" : "Votre mot de passe"}
          />
        </div>
        
        {/* Champ de sélection du rôle, affiché seulement si isRegister et allowRoleSelection sont vrais */}
        {isRegister && allowRoleSelection && (
          <div className={styles.formGroup}>
            <label htmlFor="userType" className={styles.formLabel}>Type de compte :</label>
            <select
              id="userType"
              name="userType"
              className={styles.formInput} // Peut nécessiter un style spécifique pour select si différent de input
              value={formData.userType}
              onChange={handleChange}
            >
              <option value="STUDENT">Étudiant</option>
              <option value="ADMIN">Administrateur</option>
            </select>
          </div>
        )}

        <button type="submit" className={styles.submitButton} disabled={loading}>
          {loading ? <span className={styles.spinner}></span> : buttonText}
        </button>
        <div className={styles.formFooter}>
          {isRegister ? (
            <p>Vous avez déjà un compte ? <Link to="/login">Connectez-vous</Link></p>
          ) : (
            <p>Pas encore de compte ? <Link to="/register">Inscrivez-vous</Link></p>
          )}
        </div>
      </form>
    </div>
  );
}

export default AuthForm;