// user-service/src/config/db.js
const { Pool } = require('pg');
// dotenv.config() est appelé dans server.js, donc process.env devrait être peuplé ici
// require('dotenv').config(); // Peut être redondant si server.js le fait en premier

const SERVICE_NAME_DB = process.env.SERVICE_NAME || 'UserServiceDB'; // Pour les logs

const pool = new Pool({
  user: process.env.DB_USER, // Vient de docker-compose, qui le lit du .env global (PG_USER_SERVICE_USER)
  host: process.env.DB_HOST, // Vient de docker-compose (ex: db_users_postgres)
  database: process.env.DB_DATABASE, // Vient de docker-compose (PG_USER_SERVICE_DB)
  password: process.env.DB_PASSWORD, // Vient de docker-compose (PG_USER_SERVICE_PASSWORD)
  port: parseInt(process.env.DB_PORT || "5432"), // Assurer que c'est un nombre
});

pool.on('connect', () => {
  console.log(`[${SERVICE_NAME_DB}] Connecté à PostgreSQL (Pool)!`);
});

pool.on('error', (err) => {
  console.error(`[${SERVICE_NAME_DB}] Erreur Pool PostgreSQL :`, err);
});

const createUsersTable = async () => {
  const client = await pool.connect(); // Obtenir un client pour les transactions initiales si besoin
  console.log(`[${SERVICE_NAME_DB}] Client PostgreSQL connecté pour création de table.`);
  try {
    await client.query('BEGIN'); // Optionnel: transaction pour la création de table/extension
    console.log(`[${SERVICE_NAME_DB}] Vérification/Création de l'extension pgcrypto...`);
    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
    console.log(`[${SERVICE_NAME_DB}] Extension pgcrypto vérifiée/créée.`);

    const queryText = `
      CREATE TABLE IF NOT EXISTS users (
        user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(50),
        last_name VARCHAR(50),
        user_type VARCHAR(10) NOT NULL DEFAULT 'STUDENT' CHECK (user_type IN ('STUDENT', 'ADMIN')),
        registration_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_login_date TIMESTAMPTZ
      );
    `;
    console.log(`[${SERVICE_NAME_DB}] Vérification/Création de la table 'users'...`);
    await client.query(queryText);
    console.log(`[${SERVICE_NAME_DB}] Table 'users' vérifiée/créée.`);
    
    // Si vous aviez d'autres tables à créer pour ce service (ex: student_profiles)
    // const studentProfilesTable = `...`;
    // await client.query(studentProfilesTable);
    // console.log(`[${SERVICE_NAME_DB}] Table 'student_profiles' vérifiée/créée.`);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK'); // Annuler la transaction en cas d'erreur
    console.error(`[${SERVICE_NAME_DB}] Erreur lors de la création des tables utilisateur:`, err);
    throw err; 
  } finally {
    client.release(); // Toujours libérer le client
    console.log(`[${SERVICE_NAME_DB}] Client PostgreSQL libéré après création de table.`);
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  createUsersTable, 
  pool 
};