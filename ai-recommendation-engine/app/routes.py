# ai-recommendation-engine/app/routes.py
from flask import Blueprint, request, jsonify
from .recommender import recommender_instance, initialize_recommender 

ai_bp = Blueprint('ai_bp', __name__)

# Tenter d'initialiser au chargement du module. 
# initialize_recommender() sera aussi appelé dans create_app pour s'assurer qu'il est prêt.
is_recommender_ready = False # Sera mis à True par create_app si l'init réussit

# Fonction pour vérifier et initialiser si besoin (utilisée par les routes)
def ensure_recommender_ready():
    global is_recommender_ready
    if not is_recommender_ready:
        print("AI API: Recommender non prêt, tentative de ré-initialisation...")
        is_recommender_ready = initialize_recommender()
    return is_recommender_ready


@ai_bp.route('/recommend', methods=['POST'])
def get_ai_recommendations_route():
    if not ensure_recommender_ready():
        return jsonify({"error": "Moteur de recommandation non initialisé ou échec de l'initialisation."}), 503

    data = request.get_json()
    if not data:
        return jsonify({"error": "Données JSON manquantes dans la requête."}), 400

    source_resource_id = data.get('source_resource_id')
    user_id = data.get('user_id') # ID de l'utilisateur pour le filtrage de feedback
    num_recommendations = data.get('num_recommendations', 5)
    user_history_ids = data.get('user_history_ids', []) 

    if not source_resource_id:
        return jsonify({"error": "'source_resource_id' est requis."}), 400

    print(f"AI API (/recommend): Reçu source_id={source_resource_id}, user_id={user_id}, num={num_recommendations}, history_len={len(user_history_ids)}")

    recommendations = recommender_instance.get_recommendations(
        resource_id_source=source_resource_id,
        num_recommendations=num_recommendations,
        user_history_ids=user_history_ids,
        user_id_for_feedback=user_id 
    )
    
    return jsonify({"recommendations": recommendations}), 200

@ai_bp.route('/feedback', methods=['POST'])
def receive_feedback_route(): # Renommer pour éviter conflit
    # Pas besoin de ensure_recommender_ready ici, on peut stocker le feedback même si le modèle n'est pas chargé
    # mais ce serait mieux qu'il le soit pour la cohérence immédiate.
    # if not ensure_recommender_ready():
    #     print("AI API (/feedback): Recommender non prêt, mais le feedback sera stocké.")
        # return jsonify({"error": "Moteur de recommandation non initialisé, feedback non traité."}), 503

    data = request.get_json()
    if not data:
        return jsonify({"error": "Données JSON manquantes."}), 400

    user_id = data.get('user_id')
    resource_id = data.get('resource_id') 
    is_useful = data.get('is_useful')

    if user_id is None or resource_id is None or is_useful is None: # is_useful peut être False, donc vérifier None
        return jsonify({"error": "'user_id', 'resource_id', et 'is_useful' sont requis."}), 400

    print(f"AI API (/feedback): Reçu feedback: user_id={user_id}, resource_id={resource_id}, is_useful={is_useful}")

    if not is_useful: 
        recommender_instance.add_user_negative_feedback(user_id, resource_id)
        return jsonify({"message": "Feedback négatif enregistré par le moteur IA."}), 200
    else:
        # On pourrait aussi stocker le feedback positif si on voulait l'utiliser plus tard
        return jsonify({"message": "Feedback positif reçu (actuellement non utilisé pour l'ajustement direct par le moteur IA)."}), 200


@ai_bp.route('/health', methods=['GET'])
def health_check_route(): # Renommer
    if ensure_recommender_ready() and recommender_instance.resources_df is not None and not recommender_instance.resources_df.empty:
        return jsonify({"status": "UP", "message": "Moteur de recommandation IA opérationnel.", "resources_count": len(recommender_instance.resources_df)}), 200
    else:
        return jsonify({"status": "DOWN", "message": "Moteur de recommandation IA non prêt ou pas de données."}), 503


@ai_bp.route('/retrain', methods=['POST'])
def retrain_model_route(): # Renommer
    global is_recommender_ready
    print("AI API: Demande de réentraînement reçue.")
    is_recommender_ready = initialize_recommender() # Tenter de réinitialiser
    if is_recommender_ready:
        return jsonify({"message": "Modèle de recommandation ré-entraîné avec succès."}), 200
    else:
        return jsonify({"error": "Échec du ré-entraînement du modèle."}), 500