# ai-recommendation-engine/app/recommender.py
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import requests 
import os
from dotenv import load_dotenv
import json 

# Charger les variables d'environnement depuis le .env à la racine du projet ai-recommendation-engine
# Assurez-vous que votre .env contient CONTENT_SERVICE_URL_FOR_AI
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
load_dotenv(dotenv_path=os.path.join(project_root, '.env'))

CONTENT_SERVICE_URL = os.getenv('CONTENT_SERVICE_URL_FOR_AI')
# Fichier pour persister le feedback négatif (sera créé à la racine du projet ai-recommendation-engine)
USER_NEGATIVE_FEEDBACK_FILE = os.path.join(project_root, 'user_negative_feedback.json') 

class ContentBasedRecommender:
    def __init__(self):
        self.resources_df = None
        self.tfidf_matrix = None
        self.tfidf_vectorizer = TfidfVectorizer(stop_words='english', ngram_range=(1, 2)) 
        self.resource_indices = None 
        self.resource_ids_map = None 
        self.user_negative_feedback = self._load_negative_feedback() 

    def _load_negative_feedback(self):
        """Charge les retours négatifs depuis un fichier JSON."""
        try:
            if os.path.exists(USER_NEGATIVE_FEEDBACK_FILE):
                with open(USER_NEGATIVE_FEEDBACK_FILE, 'r') as f:
                    data = json.load(f)
                    return {str(user_id): set(resource_ids) for user_id, resource_ids in data.items()}
            print("AI Recommender: Fichier de feedback négatif non trouvé, initialisation à vide.")
            return {}
        except Exception as e:
            print(f"AI Recommender: Erreur lors du chargement du fichier de feedback négatif: {e}")
            return {}

    def _save_negative_feedback(self):
        """Sauvegarde les retours négatifs dans un fichier JSON."""
        try:
            data_to_save = {user_id: list(resource_ids) for user_id, resource_ids in self.user_negative_feedback.items()}
            with open(USER_NEGATIVE_FEEDBACK_FILE, 'w') as f:
                json.dump(data_to_save, f, indent=2)
            print(f"AI Recommender: Feedback négatif sauvegardé dans {USER_NEGATIVE_FEEDBACK_FILE}")
        except Exception as e:
            print(f"AI Recommender: Erreur lors de la sauvegarde du feedback négatif: {e}")
            
    def add_user_negative_feedback(self, user_id, resource_id):
        """Ajoute une ressource à la liste des 'non utiles' pour un utilisateur."""
        user_id_str = str(user_id) 
        if user_id_str not in self.user_negative_feedback:
            self.user_negative_feedback[user_id_str] = set()
        
        if resource_id not in self.user_negative_feedback[user_id_str]:
            self.user_negative_feedback[user_id_str].add(resource_id)
            self._save_negative_feedback() 
            print(f"AI Recommender: Feedback négatif ajouté pour user {user_id_str} sur resource {resource_id}")
        else:
            print(f"AI Recommender: Feedback négatif déjà existant pour user {user_id_str} sur resource {resource_id}")
        
        print(f"AI Recommender: État actuel du feedback négatif pour {user_id_str}: {self.user_negative_feedback.get(user_id_str)}")


    def fetch_resources(self):
        """Récupère les données des ressources depuis le content-service."""
        if not CONTENT_SERVICE_URL:
            print("AI Recommender: ERREUR - CONTENT_SERVICE_URL_FOR_AI n'est pas défini dans .env")
            return False
        print(f"AI Recommender: Tentative de récupération des ressources depuis {CONTENT_SERVICE_URL}")
        try:
            response = requests.get(CONTENT_SERVICE_URL, timeout=10) # Ajout d'un timeout
            response.raise_for_status()  
            resources_data = response.json()
            
            if not resources_data or not isinstance(resources_data, list):
                print("AI Recommender: Aucune ressource reçue ou format incorrect du content-service.")
                self.resources_df = pd.DataFrame() # Créer un DataFrame vide pour éviter des erreurs plus tard
                return False # Indiquer l'échec mais permettre à l'initialisation de continuer sans données
            
            self.resources_df = pd.DataFrame(resources_data)
            
            # S'assurer que les colonnes essentielles existent
            if 'resource_id' not in self.resources_df.columns:
                print("AI Recommender: La colonne 'resource_id' est manquante dans les données des ressources.")
                return False # Critique, on ne peut pas continuer

            self.resources_df['description'] = self.resources_df['description'].fillna('') if 'description' in self.resources_df.columns else ''
            self.resources_df['title'] = self.resources_df['title'].fillna('') if 'title' in self.resources_df.columns else ''
            self.resources_df['combined_text'] = self.resources_df['title'] + ' ' + self.resources_df['description']
            
            self.resources_df = self.resources_df.reset_index(drop=True) # Assurer un index numérique unique
            # Recréer les mappings après reset_index
            self.resource_indices = pd.Series(self.resources_df.index, index=self.resources_df['resource_id']).drop_duplicates()
            self.resource_ids_map = pd.Series(self.resources_df['resource_id'], index=self.resources_df.index).drop_duplicates()

            print(f"AI Recommender: {len(self.resources_df)} ressources récupérées et traitées.")
            return True
        except requests.exceptions.RequestException as e:
            print(f"AI Recommender: Erreur lors de la récupération des ressources (RequestException): {e}")
            return False
        except Exception as e:
            print(f"AI Recommender: Erreur inattendue lors du traitement des ressources: {e}")
            return False

    def fit(self):
        """Calcule la matrice TF-IDF."""
        if self.resources_df is None or self.resources_df.empty:
            print("AI Recommender: DataFrame des ressources vide. Appelez fetch_resources() et assurez-vous qu'elle réussit.")
            return False
        if 'combined_text' not in self.resources_df.columns or self.resources_df['combined_text'].isnull().all():
            print("AI Recommender: Colonne 'combined_text' manquante ou toutes les valeurs sont nulles. Impossible de calculer TF-IDF.")
            return False
        try:
            self.resources_df['combined_text'] = self.resources_df['combined_text'].fillna('')
            self.tfidf_matrix = self.tfidf_vectorizer.fit_transform(self.resources_df['combined_text'])
            print("AI Recommender: Matrice TF-IDF calculée.")
            return True
        except Exception as e:
            print(f"AI Recommender: Erreur lors du calcul de la matrice TF-IDF: {e}")
            return False

    def get_recommendations(self, resource_id_source, num_recommendations=5, user_history_ids=None, user_id_for_feedback=None):
        if self.tfidf_matrix is None or self.resources_df is None or self.resources_df.empty or self.resource_indices is None or self.resource_ids_map is None:
            print("AI Recommender: Le modèle n'est pas prêt (données/matrice manquantes). Appelez fetch_resources() et fit().")
            return []
        if user_history_ids is None:
            user_history_ids = []

        user_id_for_feedback_str = str(user_id_for_feedback) if user_id_for_feedback else None
        negative_feedback_for_user = self.user_negative_feedback.get(user_id_for_feedback_str, set())
        
        if user_id_for_feedback_str: # Log seulement si un user_id est fourni
             print(f"AI Recommender: Filtre feedback négatif pour user '{user_id_for_feedback_str}': {negative_feedback_for_user}")


        try:
            if resource_id_source not in self.resource_indices:
                print(f"AI Recommender: ID de ressource source '{resource_id_source}' non trouvé dans les index.")
                return []
                
            idx = self.resource_indices[resource_id_source]

            if idx >= self.tfidf_matrix.shape[0]:
                 print(f"AI Recommender: Index '{idx}' hors limites pour la matrice TF-IDF (shape: {self.tfidf_matrix.shape[0]}). Vérifiez la cohérence des données.")
                 return []

            cosine_similarities = cosine_similarity(self.tfidf_matrix[idx], self.tfidf_matrix).flatten()
            similar_resources_scores = list(enumerate(cosine_similarities))
            similar_resources_scores = sorted(similar_resources_scores, key=lambda x: x[1], reverse=True)
            
            recommendations = []
            source_title = self.resources_df.iloc[idx]['title'] if idx < len(self.resources_df) else "Inconnu"

            for i, score in similar_resources_scores:
                if len(recommendations) >= num_recommendations:
                    break
                
                if i >= len(self.resource_ids_map): # Sécurité
                    print(f"AI Recommender: Index de ressource {i} hors limites pour resource_ids_map.")
                    continue

                current_resource_id = self.resource_ids_map[i]
                
                if (current_resource_id != resource_id_source and 
                    current_resource_id not in user_history_ids and
                    current_resource_id not in negative_feedback_for_user): 
                    
                    resource_details = self.resources_df.iloc[i]
                    recommendations.append({
                        'resource_id': resource_details['resource_id'],
                        'title': resource_details['title'],
                        'description': resource_details.get('description', '')[:150] + "...", # Tronquer la description
                        'similarity_score': round(score, 4),
                        'reason': f"Similaire à '{source_title}'"
                    })
            
            print(f"AI Recommender: {len(recommendations)} recommandations générées pour {resource_id_source}")
            return recommendations
        except KeyError:
            print(f"AI Recommender: Clé non trouvée pour resource_id '{resource_id_source}' pendant la recommandation.")
            return []
        except Exception as e:
            print(f"AI Recommender: Erreur inattendue pendant get_recommendations: {e}")
            return []

recommender_instance = ContentBasedRecommender()

def initialize_recommender():
    """Charge les données et prépare le modèle. Appelé au démarrage et sur /retrain."""
    print("AI Recommender: Démarrage de l'initialisation du moteur de recommandation...")
    if recommender_instance.fetch_resources():
        if recommender_instance.fit():
            print("AI Recommender: Moteur de recommandation initialisé et prêt.")
            return True
    print("AI Recommender: Échec de l'initialisation du moteur de recommandation. Vérifiez les logs précédents.")
    return False

if __name__ == '__main__':
    if initialize_recommender():
        if recommender_instance.resources_df is not None and not recommender_instance.resources_df.empty:
            sample_resource_id = recommender_instance.resources_df['resource_id'].iloc[0] 
            print(f"\n--- Test de recommandations pour la ressource ID: {sample_resource_id} ---")
            
            test_user_id = 'test_user_for_feedback_123'
            recos_before = recommender_instance.get_recommendations(sample_resource_id, num_recommendations=3, user_history_ids=[], user_id_for_feedback=test_user_id)
            print("\nRecommandations AVANT feedback:")
            if recos_before:
                for rec in recos_before:
                    print(f"  - {rec['title']} (Score: {rec['similarity_score']})")
            else:
                print("  Aucune recommandation générée.")
            
            if recos_before:
                feedback_resource_id = recos_before[0]['resource_id']
                print(f"\nAjout d'un feedback négatif pour user '{test_user_id}' sur resource '{feedback_resource_id}'...")
                recommender_instance.add_user_negative_feedback(test_user_id, feedback_resource_id)
                
                print("\nRecommandations APRÈS feedback:")
                recos_after_feedback = recommender_instance.get_recommendations(sample_resource_id, num_recommendations=3, user_history_ids=[], user_id_for_feedback=test_user_id)
                if recos_after_feedback:
                    for rec in recos_after_feedback:
                        print(f"  - {rec['title']} (Score: {rec['similarity_score']})")
                else:
                    print("  Aucune recommandation générée après feedback.")
            else:
                print("Impossible de tester le feedback car aucune recommandation initiale n'a été générée.")
        else:
            print("Aucune ressource chargée, impossible de tester les recommandations.")