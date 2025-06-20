// src/config/db.js (dans recommendation-service)
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.on('connect', () => console.log('RecommendationService: Connecté à PostgreSQL!'));
pool.on('error', (err) => console.error('RecommendationService: Erreur PostgreSQL:', err));

const createRecommendationTables = async () => {
  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

    const recommendationsTable = `
      CREATE TABLE IF NOT EXISTS recommendations (
        recommendation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id UUID NOT NULL,
        resource_id UUID NOT NULL, 
        source_resource_id UUID, 
        reason TEXT, 
        relevance_score FLOAT,
        recommendation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        is_clicked BOOLEAN NOT NULL DEFAULT FALSE,
        is_useful BOOLEAN NULL, -- <<< COLONNE is_useful (peut être NULL au début)
        feedback_date TIMESTAMPTZ NULL, -- <<< COLONNE feedback_date (peut être NULL)
        UNIQUE (student_id, resource_id) -- Assurez-vous que cette contrainte est là
      );
    `;
    const idxStudentDate = `CREATE INDEX IF NOT EXISTS idx_recommendations_student_date ON recommendations (student_id, recommendation_date DESC);`;

    // Table pour le feedback (celle-ci est séparée et semble OK d'après les logs)
    const feedbackTable = `
      CREATE TABLE IF NOT EXISTS recommendation_feedback (
        feedback_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        recommendation_id UUID NOT NULL REFERENCES recommendations(recommendation_id) ON DELETE CASCADE,
        student_id UUID NOT NULL,
        is_useful BOOLEAN, 
        feedback_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;
    // Index pour la table de feedback
    const idxFeedbackRecoId = `CREATE INDEX IF NOT EXISTS idx_feedback_recommendation_id ON recommendation_feedback (recommendation_id);`;


    await pool.query(recommendationsTable);
    console.log("Table 'recommendations' vérifiée/créée.");
    await pool.query(idxStudentDate);
    console.log("Index 'idx_recommendations_student_date' vérifié/créé.");
    
    await pool.query(feedbackTable);
    console.log("Table 'recommendation_feedback' vérifiée/créée.");
    await pool.query(idxFeedbackRecoId);
    console.log("Index 'idx_feedback_recommendation_id' vérifié/créé.");

  } catch (err) {
    console.error("Erreur création tables de recommandation:", err);
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  createRecommendationTables,
};