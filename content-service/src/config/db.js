// content-service/src/config/db.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.on('connect', () => console.log('ContentService: Connecté à PostgreSQL!'));
pool.on('error', (err) => console.error('ContentService: Erreur PostgreSQL:', err));

const createContentTables = async () => {
  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";'); 

    const learningResourcesTable = `
      CREATE TABLE IF NOT EXISTS learning_resources (
        resource_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        resource_type VARCHAR(20) NOT NULL CHECK (resource_type IN ('VIDEO', 'ARTICLE', 'EXERCISE')), -- 'COURSE' enlevé
        title VARCHAR(255) NOT NULL,
        description TEXT,
        subject_area VARCHAR(100),
        difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('EASY', 'MEDIUM', 'HARD')),
        creation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by_user_id UUID NOT NULL, 
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW() 
      );
    `;
    
    const updateTimestampFunction = `
      CREATE OR REPLACE FUNCTION trigger_set_updated_at_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;

    const updateTimestampTrigger = `
      DROP TRIGGER IF EXISTS set_updated_at_lr ON learning_resources;
      CREATE TRIGGER set_updated_at_lr
      BEFORE UPDATE ON learning_resources
      FOR EACH ROW
      EXECUTE PROCEDURE trigger_set_updated_at_timestamp();
    `;

    await pool.query(learningResourcesTable);
    console.log("Table 'learning_resources' vérifiée/créée (types de ressources mis à jour).");
    await pool.query(updateTimestampFunction);
    console.log("Fonction de trigger 'trigger_set_updated_at_timestamp' vérifiée/créée.");
    await pool.query(updateTimestampTrigger);
    console.log("Trigger 'set_updated_at_lr' vérifié/créé.");

  } catch (err) {
    console.error("Erreur lors de la configuration des tables/triggers du contenu:", err);
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  createContentTables,
};