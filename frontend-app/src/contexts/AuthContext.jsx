// src/contexts/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { getCurrentUser, logoutUser as apiLogout } from '../api/authApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [loading, setLoading] = useState(false); // Pour gérer l'état de chargement

  const login = (userData) => {
    setCurrentUser(userData.user); // userData vient de la réponse de loginUser API
    // Le token est déjà stocké par loginUser dans authApi.js
  };

  const logout = () => {
    apiLogout();
    setCurrentUser(null);
  };

  // Optionnel : vérifier le token au chargement de l'app si on veut rafraîchir les données user
  // useEffect(() => {
  //   const user = getCurrentUser();
  //   if (user) {
  //     // Pourrait appeler getMe() pour vérifier la validité du token et rafraîchir les données
  //     // mais pour l'instant, on fait confiance à ce qui est dans localStorage
  //     setCurrentUser(user);
  //   }
  // }, []);

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, loading, setLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);