# ai-recommendation-engine/app/__init__.py
from flask import Flask
from flask_cors import CORS
import os
from dotenv import load_dotenv
from .recommender import initialize_recommender # Importer la fonction d'initialisation

def create_app():
    # Charger .env qui est à la racine de `ai-recommendation-engine`
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    load_dotenv(dotenv_path=os.path.join(project_root, '.env'))
    
    app = Flask(__name__)
    
    # Configuration CORS
    # Mettez ici l'URL de votre frontend React. Si elle tourne sur 5173:
    frontend_url = os.getenv('FRONTEND_URL', "http://localhost:5173") # Valeur par défaut si non défini
    CORS(app, resources={r"/api/ai/*": {"origins": [frontend_url, "http://127.0.0.1:5173"]}})
    # Si vous avez plusieurs frontends ou si le port change, ajustez "origins"
    # Pour autoriser toutes les origines en développement (moins sécurisé):
    # CORS(app) 

    from .routes import ai_bp, is_recommender_ready as routes_recommender_status # Importer le statut initial
    app.register_blueprint(ai_bp, url_prefix='/api/ai')

    print("AI Flask App: Application créée et blueprint enregistré.")
    
    # S'assurer que l'initialisation est tentée au démarrage de l'app
    # La variable `is_recommender_ready` dans routes.py sera mise à jour
    if not routes_recommender_status: # Si l'import initial n'a pas suffi
        print("AI Flask App: Tentative d'initialisation du recommender depuis create_app...")
        if not initialize_recommender(): # Tenter à nouveau
            print("AI Flask App: AVERTISSEMENT - Le moteur de recommandation n'a pas pu être initialisé au démarrage.")
        else:
            # Mettre à jour la variable globale dans routes.py (un peu hacky, mieux si géré dans un contexte d'app)
            # Pour cet exemple simple, on suppose que initialize_recommender met à jour un état global ou que `ensure_recommender_ready` suffit.
            # La modification de `is_recommender_ready` dans routes.py est suffisante.
            pass


    return app