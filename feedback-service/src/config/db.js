// src/config/db.js (dans feedback-service)
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.on('connect', () => console.log('FeedbackService: Connecté à PostgreSQL!'));
pool.on('error', (err) => console.error('FeedbackService: Erreur PostgreSQL:', err));

const createFeedbackTables = async () => {
  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

    const ratingsTable = `
      CREATE TABLE IF NOT EXISTS resource_ratings (
        rating_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        resource_id UUID NOT NULL,
        user_id UUID NOT NULL,    
        rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (resource_id, user_id)
      );
    `;

    // Table pour les commentaires
    const commentsTable = `
      CREATE TABLE IF NOT EXISTS resource_comments (
        comment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        resource_id UUID NOT NULL,
        user_id UUID NOT NULL, 
        author_username VARCHAR(50) NOT NULL, -- << NOUVELLE COLONNE
        parent_comment_id UUID NULL REFERENCES resource_comments(comment_id) ON DELETE CASCADE,
        comment_text TEXT NOT NULL CHECK (length(comment_text) > 0 AND length(comment_text) <= 1000),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;
    // Index pour améliorer les performances de recherche
    const idxRatingsResource = `CREATE INDEX IF NOT EXISTS idx_ratings_resource_id ON resource_ratings (resource_id);`;
    const idxCommentsResource = `CREATE INDEX IF NOT EXISTS idx_comments_resource_id ON resource_comments (resource_id, created_at DESC);`;
    const idxCommentsParent = `CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON resource_comments (parent_comment_id);`;

    const updateTimestampFunction = `
      CREATE OR REPLACE FUNCTION trigger_set_feedback_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;
    const ratingUpdateTrigger = `
      DROP TRIGGER IF EXISTS set_rating_updated_at ON resource_ratings;
      CREATE TRIGGER set_rating_updated_at
      BEFORE UPDATE ON resource_ratings FOR EACH ROW EXECUTE PROCEDURE trigger_set_feedback_updated_at();
    `;
    const commentUpdateTrigger = `
      DROP TRIGGER IF EXISTS set_comment_updated_at ON resource_comments;
      CREATE TRIGGER set_comment_updated_at
      BEFORE UPDATE ON resource_comments FOR EACH ROW EXECUTE PROCEDURE trigger_set_feedback_updated_at();
    `;

    await pool.query(ratingsTable);
    await pool.query(commentsTable);
    await pool.query(idxRatingsResource);
    await pool.query(idxCommentsResource);
    await pool.query(idxCommentsParent);
    await pool.query(updateTimestampFunction);
    await pool.query(ratingUpdateTrigger);
    await pool.query(commentUpdateTrigger);
    console.log("Tables 'resource_ratings' et 'resource_comments' (avec author_username) vérifiées/créées.");

  } catch (err) {
    console.error("Erreur création tables feedback:", err);
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  createFeedbackTables,
};