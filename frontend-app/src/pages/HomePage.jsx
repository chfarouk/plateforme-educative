// src/pages/HomePage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import styles from './HomePage.module.css'; // Nouveau fichier CSS Module

// Vous pouvez trouver une image libre de droits sur unsplash.com, pexels.com, etc.
// et la mettre dans public/images/ ou src/assets/
// import heroImage from '../assets/images/education-hero.jpg'; // Exemple si dans src/assets

function HomePage() {
  const { currentUser } = useAuth();

  return (
    <div className={styles.homePage}>
      <header className={styles.heroSection}>
        {/* <img src={heroImage} alt="Apprentissage en ligne" className={styles.heroImage} /> */}
        <div className={styles.heroOverlay}></div>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Débloquez Votre Potentiel d'Apprentissage</h1>
          <p className={styles.heroSubtitle}>
            Des parcours personnalisés et des recommandations intelligentes pour vous aider à réussir.
          </p>
          {currentUser ? (
            <Link to="/dashboard" className={`${styles.ctaButton} ${styles.ctaButtonPrimary}`}>
              Accéder à mon Tableau de Bord
            </Link>
          ) : (
            <div className={styles.heroActions}>
              <Link to="/register" className={`${styles.ctaButton} ${styles.ctaButtonPrimary}`}>
                Commencer Gratuitement
              </Link>
              <Link to="/login" className={`${styles.ctaButton} ${styles.ctaButtonSecondary}`}>
                Se Connecter
              </Link>
            </div>
          )}
        </div>
      </header>

      <section className={styles.featuresSection}>
        <h2 className={styles.sectionTitle}>Pourquoi Nous Choisir ?</h2>
        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            {/* Vous pouvez utiliser des icônes SVG ou FontAwesome ici */}
            {/* <IconBrain size={48} className={styles.featureIcon} /> */}
            <span className={styles.featureIcon}>🧠</span>
            <h3 className={styles.featureTitle}>Apprentissage Personnalisé</h3>
            <p className={styles.featureText}>
              Notre IA analyse vos besoins pour vous proposer les meilleures ressources, adaptées à votre niveau.
            </p>
          </div>
          <div className={styles.featureCard}>
            <span className={styles.featureIcon}>📚</span>
            <h3 className={styles.featureTitle}>Vaste Catalogue</h3>
            <p className={styles.featureText}>
              Accédez à une multitude de cours, vidéos, articles et exercices dans divers domaines.
            </p>
          </div>
          <div className={styles.featureCard}>
            <span className={styles.featureIcon}>📈</span>
            <h3 className={styles.featureTitle}>Suivi de Progression</h3>
            <p className={styles.featureText}>
              Visualisez vos progrès en temps réel et restez motivé pour atteindre vos objectifs.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.callToActionSection}>
        <h2 className={styles.sectionTitle}>Prêt à Transformer Votre Apprentissage ?</h2>
        <p>Rejoignez des milliers d'étudiants et commencez votre parcours personnalisé dès aujourd'hui.</p>
        {!currentUser && (
          <Link to="/register" className={`${styles.ctaButton} ${styles.ctaButtonLarge}`}>
            Inscrivez-vous Maintenant
          </Link>
        )}
      </section>
    </div>
  );
}

export default HomePage;