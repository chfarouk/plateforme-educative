// src/pages/RegisterPage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import AuthForm from '../components/AuthForm/AuthForm'; 
import { registerUser } from '../api/authApi';
// import { useAuth } from '../contexts/AuthContext'; // Pas utilisé ici

function RegisterPage() {
  const navigate = useNavigate();

  const handleRegister = async (userData) => {
    // userData inclura maintenant userType si allowRoleSelection est true dans AuthForm
    console.log("Données d'inscription envoyées au backend:", userData); 
    try {
      await registerUser(userData); // La fonction registerUser de l'API enverra ces données
      alert('Inscription réussie ! Vous pouvez maintenant vous connecter.');
      navigate('/login');
    } catch (error) {
      console.error('Erreur d\'inscription (RegisterPage):', error);
      throw error; 
    }
  };

  return (
    <div>
      {/* On passe allowRoleSelection={true} ici */}
      <AuthForm 
        onSubmit={handleRegister} 
        buttonText="S'inscrire" 
        isRegister={true} 
        formTitle="Créer un Compte"
        allowRoleSelection={true} // <<< IMPORTANT : Activer la sélection de rôle
      />
    </div>
  );
}

export default RegisterPage;