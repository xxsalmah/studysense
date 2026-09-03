print("========================================")
print("StudySense ML Training Started")
print("========================================")

import pandas as pd
import joblib

from sklearn.model_selection import KFold, cross_val_score
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error

from app import app
from models import Subject, StudySession, Score


# ========================================
# CREATE DATASET
# ========================================

def create_dataset():

    print("Loading data from database...")

    with app.app_context():

        subjects = Subject.query.all()
        sessions = StudySession.query.all()
        scores = Score.query.all()

    print(f"Subjects found: {len(subjects)}")
    print(f"Study sessions found: {len(sessions)}")
    print(f"Scores found: {len(scores)}")

    rows = []

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

        # --------------------------------
        # Study statistics
        # --------------------------------

        total_minutes = sum(
            session.duration
            for session in subject_sessions
        )

        session_count = len(subject_sessions)

        average_session_minutes = (
            total_minutes / session_count
            if session_count > 0
            else 0
        )

        study_hours = total_minutes / 60

        # --------------------------------
        # Score statistics
        # --------------------------------

        percentages = []

        for score in subject_scores:

            if score.max_score > 0:

                percentage = (
                    score.score / score.max_score
                ) * 100

                percentages.append(percentage)

        if percentages:

            average_score = (
                sum(percentages)
                / len(percentages)
            )

        else:

            average_score = None

        # --------------------------------
        # Target
        # --------------------------------

        target_score = (
            float(subject.target_score)
            if subject.target_score is not None
            else 0
        )

        # --------------------------------
        # Add training row
        # --------------------------------

        if average_score is not None:

            rows.append({

                "subject": subject.name,

                "study_hours": study_hours,

                "session_count": session_count,

                "average_session_minutes":
                    average_session_minutes,

                "score_count":
                    len(subject_scores),

                "target_score":
                    target_score,

                "average_score":
                    average_score

            })

    return pd.DataFrame(rows)


# ========================================
# TRAIN MODEL
# ========================================

def train_model():

    print()
    print("Creating ML dataset...")

    df = create_dataset()

    print()
    print("========================================")
    print("DATASET")
    print("========================================")

    if df.empty:

        print()
        print("No training data found.")
        print()
        print(
            "Add subjects with assessment scores "
            "before training the model."
        )

        return

    print(
        df.to_string(index=False)
    )

    print()
    print(
        f"Training examples: {len(df)}"
    )

    # ====================================
    # FEATURES
    # ====================================

    features = [
        "study_hours",
        "session_count",
        "average_session_minutes",
        "score_count",
        "target_score"
    ]

    X = df[features]

    # ====================================
    # TARGET
    # ====================================

    y = df["average_score"]

    print()
    print("========================================")
    print("FEATURES")
    print("========================================")

    print(
        X.to_string(index=False)
    )

    print()
    print("TARGET")

    print(
        y.to_string(index=False)
    )

    # ====================================
    # CROSS VALIDATION
    # ====================================

    print()
    print("========================================")
    print("CROSS-VALIDATION")
    print("========================================")

    # Use 5 folds when we have 5+ examples.
    # This means every example gets used for
    # validation once.

    number_of_folds = min(
        5,
        len(df)
    )

    kfold = KFold(
        n_splits=number_of_folds,
        shuffle=True,
        random_state=42
    )

    model = LinearRegression()

    # --------------------------------
    # MAE
    # --------------------------------

    mae_scores = cross_val_score(
        model,
        X,
        y,
        cv=kfold,
        scoring="neg_mean_absolute_error"
    )

    mae_scores = -mae_scores

    print()

    for index, score in enumerate(
        mae_scores,
        start=1
    ):

        print(
            f"Fold {index} MAE: {score:.2f}"
        )

    average_mae = mae_scores.mean()

    print()
    print(
        f"Average Cross-Validation MAE: "
        f"{average_mae:.2f}"
    )

    # ====================================
    # TRAIN FINAL MODEL
    # ====================================

    print()
    print("========================================")
    print("FINAL MODEL")
    print("========================================")

    print(
        "Training final Linear Regression "
        "model using all available data..."
    )

    model.fit(
        X,
        y
    )

    print(
        "Final model trained successfully!"
    )

    # ====================================
    # MODEL COEFFICIENTS
    # ====================================

    print()
    print("========================================")
    print("MODEL COEFFICIENTS")
    print("========================================")

    for feature, coefficient in zip(
        features,
        model.coef_
    ):

        print(
            f"{feature}: {coefficient:.4f}"
        )

    print()
    print(
        f"Intercept: {model.intercept_:.4f}"
    )

    # ====================================
    # SAVE MODEL
    # ====================================

    model_data = {

        "model": model,

        "features": features,

        "mae": float(average_mae),

        "cv_folds": number_of_folds,

        "training_examples": len(df)

    }

    joblib.dump(
        model_data,
        "studysense_model.pkl"
    )

    # ====================================
    # RESULT
    # ====================================

    print()
    print("========================================")
    print("MODEL SAVED")
    print("========================================")

    print(
        "studysense_model.pkl"
    )

    print()
    print(
        "Cross-validation complete."
    )

    print(
        "Final model trained on all data."
    )

    print()
    print(
        "StudySense ML pipeline is ready."
    )

    print("========================================")


# ========================================
# RUN
# ========================================

if __name__ == "__main__":

    train_model()