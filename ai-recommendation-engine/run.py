# ai-recommendation-engine/run.py
from app import create_app
from dotenv import load_dotenv
import os

# Charger .env qui est à la racine de `ai-recommendation-engine`
load_dotenv() 

app = create_app() # Crée l'instance de l'application Flask

if __name__ == '__main__':
    port = int(os.getenv('RECOMMENDER_PORT', 5000))
    # FLASK_DEBUG est géré par `flask run` si FLASK_ENV=development ou par app.run(debug=True)
    # Pour `python run.py`, il faut le passer explicitement à app.run()
    debug_mode_env = os.getenv('FLASK_DEBUG', '0') 
    debug_mode = debug_mode_env.lower() in ['true', '1', 't']

    print(f"AI Engine: Démarrage du serveur Flask sur le port {port} en mode debug: {debug_mode}")
    app.run(host='0.0.0.0', port=port, debug=debug_mode)