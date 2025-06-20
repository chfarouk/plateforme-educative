// src/pages/LoginPage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import AuthForm from '../components/AuthForm/AuthForm'; // Assurez-vous du chemin
import { loginUser } from '../api/authApi';
import { useAuth } from '../contexts/AuthContext';
// import styles from './AuthPage.module.css'; // Optionnel: styles spécifiques à la page si besoin

function LoginPage() {
  const navigate = useNavigate();
  const { login, setLoading: setAuthLoadingGlobal } = useAuth(); // Renommé pour clarté

  const handleLogin = async (credentials) => {
    // setAuthLoadingGlobal(true); // Le AuthForm gère son propre 'loading'
    try {
      const data = await loginUser(credentials);
      login(data); 
      navigate('/dashboard');
    } catch (error) {
      console.error('Erreur de connexion (LoginPage):', error);
      // setAuthLoadingGlobal(false);
      throw error; 
    }
    // setAuthLoadingGlobal(false);
  };

  return (
    // Optionnel: <div className={styles.authPageWrapper}>
    <div> 
      <AuthForm 
        onSubmit={handleLogin} 
        buttonText="Se connecter" 
        formTitle="Connexion" 
      />
    </div>
  );
}

export default LoginPage;