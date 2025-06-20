// src/config/db.js (dans progress-service)
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.on('connect', () => console.log('ProgressService: Connecté à PostgreSQL!'));
pool.on('error', (err) => console.error('ProgressService: Erreur PostgreSQL:', err));

const createProgressTables = async () => {
  await pool.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";'); // Si vous utilisez gen_random_uuid()

  const progressRecordsTable = `
    CREATE TABLE IF NOT EXISTS progress_records (
      record_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id UUID NOT NULL, -- Référence l'ID de l'utilisateur du user-service
      resource_id UUID NOT NULL, -- Référence l'ID de la ressource du content-service
      status VARCHAR(20) NOT NULL DEFAULT 'NOT_STARTED' CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED')),
      completion_date TIMESTAMPTZ,
      score FLOAT, -- Pour les exercices
      time_spent_seconds INTEGER,
      last_accessed_date TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (student_id, resource_id) -- Un étudiant ne peut avoir qu'un enregistrement de progression par ressource
    );
  `;
  // Trigger pour last_accessed_date (optionnel, ou gérer côté applicatif)
  const lastAccessedTriggerFunction = `
    CREATE OR REPLACE FUNCTION trigger_update_last_accessed()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.last_accessed_date = NOW();
      IF (NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED') THEN
        NEW.completion_date = NOW();
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `;
  const lastAccessedTrigger = `
    DROP TRIGGER IF EXISTS update_last_accessed_pr ON progress_records;
    CREATE TRIGGER update_last_accessed_pr
    BEFORE UPDATE ON progress_records
    FOR EACH ROW
    EXECUTE PROCEDURE trigger_update_last_accessed();
  `;

  try {
    await pool.query(progressRecordsTable);
    await pool.query(lastAccessedTriggerFunction);
    await pool.query(lastAccessedTrigger);
    console.log("Table 'progress_records' vérifiée/créée.");
  } catch (err) {
    console.error("Erreur création table 'progress_records':", err);
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  createProgressTables,
};