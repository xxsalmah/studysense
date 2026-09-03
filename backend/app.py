from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import os

from database import db
from models import Subject, StudySession, Score


app = Flask(__name__)

# --------------------------------
# Database configuration
# --------------------------------

app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///studysense.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False


# --------------------------------
# Initialize extensions
# --------------------------------

db.init_app(app)

CORS(
    app,
    resources={
        r"/api/*": {
            "origins": "http://localhost:5173"
        }
    }
)


# --------------------------------
# Load ML model
# --------------------------------

MODEL_PATH = os.path.join(
    os.path.dirname(__file__),
    "studysense_model.pkl"
)

ml_model = None

if os.path.exists(MODEL_PATH):

    model_data = joblib.load(MODEL_PATH)

    ml_model = model_data["model"]

    print("ML model loaded successfully.")

else:

    print(
        "WARNING: studysense_model.pkl not found."
    )


# --------------------------------
# Create database tables
# --------------------------------

with app.app_context():

    db.create_all()


# =================================
# SUBJECTS
# =================================

@app.route("/api/subjects", methods=["GET"])
def get_subjects():

    subjects = Subject.query.all()

    return jsonify([
        subject.to_dict()
        for subject in subjects
    ])


@app.route("/api/subjects", methods=["POST"])
def add_subject():

    data = request.get_json()

    name = data.get("name")
    target_score = data.get("target_score")

    if not name:

        return jsonify({
            "error": "Subject name is required"
        }), 400

    subject = Subject(
        name=name,
        target_score=target_score
    )

    db.session.add(subject)
    db.session.commit()

    return jsonify(
        subject.to_dict()
    ), 201


# =================================
# STUDY SESSIONS
# =================================

@app.route("/api/sessions", methods=["GET"])
def get_sessions():

    sessions = StudySession.query.all()

    return jsonify([
        session.to_dict()
        for session in sessions
    ])


@app.route("/api/sessions", methods=["POST"])
def add_session():

    data = request.get_json()

    subject_id = data.get("subject_id")
    topic = data.get("topic")
    duration = data.get("duration")
    date = data.get("date")

    if not subject_id or not topic or not duration or not date:

        return jsonify({
            "error": "All session fields are required"
        }), 400

    session = StudySession(
        subject_id=subject_id,
        topic=topic,
        duration=duration,
        date=date
    )

    db.session.add(session)
    db.session.commit()

    return jsonify(
        session.to_dict()
    ), 201


# =================================
# SCORES
# =================================

@app.route("/api/scores", methods=["GET"])
def get_scores():

    scores = Score.query.all()

    return jsonify([
        score.to_dict()
        for score in scores
    ])


@app.route("/api/scores", methods=["POST"])
def add_score():

    data = request.get_json()

    subject_id = data.get("subject_id")
    assessment = data.get("assessment")
    score = data.get("score")
    max_score = data.get("max_score")
    date = data.get("date")

    if (
        not subject_id
        or not assessment
        or score is None
        or max_score is None
        or not date
    ):

        return jsonify({
            "error": "All score fields are required"
        }), 400

    if float(max_score) <= 0:

        return jsonify({
            "error": "Maximum score must be greater than zero"
        }), 400

    new_score = Score(
        subject_id=subject_id,
        assessment=assessment,
        score=score,
        max_score=max_score,
        date=date
    )

    db.session.add(new_score)
    db.session.commit()

    return jsonify(
        new_score.to_dict()
    ), 201


# =================================
# ANALYTICS FEATURES
# =================================

@app.route("/api/analytics/features", methods=["GET"])
def get_features():

    subjects = Subject.query.all()
    sessions = StudySession.query.all()
    scores = Score.query.all()

    features = []

    for subject in subjects:

        subject_sessions = [
            session
            for session in sessions
            if session.subject_id == subject.id
        ]

        subject_scores = [
            score
            for score in scores
            if score.subject_id == subject.id
        ]

        total_minutes = sum(
            session.duration
            for session in subject_sessions
        )

        session_count = len(subject_sessions)

        if session_count > 0:

            average_session_minutes = (
                total_minutes / session_count
            )

        else:

            average_session_minutes = 0

        study_hours = total_minutes / 60

        score_count = len(subject_scores)

        if score_count > 0:

            percentages = [
                (score.score / score.max_score) * 100
                for score in subject_scores
            ]

            average_score = (
                sum(percentages)
                / len(percentages)
            )

        else:

            average_score = 0

        target_score = (
            subject.target_score
            if subject.target_score is not None
            else 0
        )

        score_gap = (
            average_score - target_score
        )

        features.append({

            "subject_id": subject.id,

            "subject": subject.name,

            "study_hours": round(
                study_hours,
                2
            ),

            "session_count": session_count,

            "average_session_minutes": round(
                average_session_minutes,
                2
            ),

            "score_count": score_count,

            "average_score": round(
                average_score,
                2
            ),

            "target_score": target_score,

            "score_gap": round(
                score_gap,
                2
            )
        })

    return jsonify(features)


# =================================
# ML PREDICTION
# =================================

@app.route("/api/predict", methods=["POST"])
def predict_score():

    global ml_model

    if ml_model is None:

        return jsonify({
            "error": "ML model is not available. Train the model first."
        }), 503

    data = request.get_json()

    required_fields = [
        "study_hours",
        "session_count",
        "average_session_minutes",
        "score_count",
        "target_score"
    ]

    for field in required_fields:

        if field not in data:

            return jsonify({
                "error": f"Missing field: {field}"
            }), 400

    try:

        input_data = [[
            float(data["study_hours"]),
            float(data["session_count"]),
            float(data["average_session_minutes"]),
            float(data["score_count"]),
            float(data["target_score"])
        ]]

        prediction = ml_model.predict(
            input_data
        )[0]

        prediction = max(
            0,
            min(100, prediction)
        )

        return jsonify({

            "predicted_score": round(
                float(prediction),
                2
            )

        })

    except Exception as error:

        return jsonify({
            "error": str(error)
        }), 500

# =================================
# ML MODEL PERFORMANCE
# =================================

@app.route("/api/model-performance", methods=["GET"])
def model_performance():

    if not os.path.exists(MODEL_PATH):

        return jsonify({
            "error": "ML model has not been trained yet."
        }), 404

    try:

        model_data = joblib.load(MODEL_PATH)

        mae = model_data.get("mae")
        r2 = model_data.get("r2")

        return jsonify({

            "mae": round(mae, 2)
            if mae is not None
            else None,

            "r2": round(r2, 2)
            if r2 is not None
            else None,

            "training_examples":
                model_data.get(
                    "training_examples",
                    0
                ),

            "training_rows":
                model_data.get(
                    "training_rows",
                    0
                ),

            "testing_rows":
                model_data.get(
                    "testing_rows",
                    0
                ),

            "status":
                "More data needed"
                if r2 is None
                else "Evaluated"

        })

    except Exception as error:

        return jsonify({
            "error": str(error)
        }), 500

# =================================
# HOME
# =================================

@app.route("/")
def home():

    return jsonify({
        "message": "StudySense API is running"
    })


# =================================
# RUN SERVER
# =================================

if __name__ == "__main__":

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )