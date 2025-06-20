// src/components/Navbar/Navbar.jsx
import React, { useState } from 'react';
import { Link, useNavigate } // Supprimer useLocation si plus utilisé pour cette logique
from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import styles from './Navbar.module.css';

function Navbar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  // const location = useLocation(); // Plus nécessaire pour cette logique simplifiée
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
    navigate('/');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  }

  return (
    <nav className={styles.navbar}>
      <div className={styles.navContainer}>
        <Link to="/" className={styles.navLogo} onClick={closeMobileMenu}>
          🎓 Plateforme Edu
        </Link>

        <div className={styles.menuIcon} onClick={toggleMobileMenu}>
          {isMobileMenuOpen ? '✖' : '☰'}
        </div>

        <ul className={isMobileMenuOpen ? `${styles.navMenu} ${styles.active}` : styles.navMenu}>
          <li className={styles.navItem}>
            <Link to="/" className={styles.navLink} onClick={closeMobileMenu}>
              Accueil
            </Link>
          </li>
          <li className={styles.navItem}>
            <Link to="/catalogue" className={styles.navLink} onClick={closeMobileMenu}>
              Catalogue
            </Link>
          </li>
          {currentUser ? (
            <>
              <li className={styles.navItem}>
                <Link to="/dashboard" className={styles.navLink} onClick={closeMobileMenu}>
                  Tableau de Bord 
                  {/* Le dashboard s'adaptera en fonction du userType */}
                </Link>
              </li>
              {/* Il n'y a plus de condition spécifique pour afficher un lien "Admin" ici
                  car le tableau de bord de l'admin contient les liens de gestion.
                  Si vous aviez d'autres sections admin NON accessibles depuis le dashboard,
                  vous pourriez remettre une condition ici.
              */}
              <li className={styles.navItem}>
                <button onClick={handleLogout} className={`${styles.navLink} ${styles.navButton}`}>
                  Déconnexion ({currentUser.username})
                </button>
              </li>
            </>
          ) : (
            <>
              <li className={styles.navItem}>
                <Link to="/login" className={styles.navLink} onClick={closeMobileMenu}>
                  Connexion
                </Link>
              </li>
              <li className={styles.navItem}>
                <Link to="/register" className={`${styles.navLink} ${styles.navButtonPrimary}`} onClick={closeMobileMenu}>
                  Inscription
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;