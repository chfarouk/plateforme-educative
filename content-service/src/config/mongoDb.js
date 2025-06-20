// src/config/mongoDb.js
const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

let db;

async function connectToMongoDB() {
  if (db) return db; // Retourner la connexion existante si déjà établie
  try {
    await client.connect();
    db = client.db(); // Utilise la base de données spécifiée dans l'URI ou la base 'test' par défaut
    console.log('ContentService: Connecté à MongoDB!');
    return db;
  } catch (error) {
    console.error('ContentService: Impossible de se connecter à MongoDB', error);
    process.exit(1); // Arrêter l'application en cas d'échec de connexion critique
  }
}

function getDb() {
  if (!db) {
    throw new Error('La base de données MongoDB n\'est pas encore connectée.');
  }
  return db;
}

// Collection pour les détails des ressources
const RESOURCES_DETAILS_COLLECTION = 'resource_details';

module.exports = {
  connectToMongoDB,
  getDb,
  RESOURCES_DETAILS_COLLECTION,
};