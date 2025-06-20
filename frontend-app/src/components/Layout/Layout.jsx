// src/components/Layout/Layout.jsx
import React from 'react';
import Navbar from '../Navbar/Navbar'; // Assurez-vous que le chemin est correct
import styles from './Layout.module.css';

const Layout = ({ children }) => {
  return (
    <div className={styles.layoutContainer}>
      <Navbar />
      <main className={styles.mainContent}>
        {children}
      </main>
      <footer className={styles.footer}>
        <p>© {new Date().getFullYear()} Plateforme Éducative Intelligente. Tous droits réservés.</p>
      </footer>
    </div>
  );
};

export default Layout;