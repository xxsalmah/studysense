print("========================================")
print("StudySense ML Training Started")
print("========================================")

import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, r2_score

from app import app
from models import Subject, StudySession, Score


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

            percentages = []

            for score in subject_scores:

                percentage = (
                    score.score / score.max_score
                ) * 100

                percentages.append(percentage)

            average_score = (
                sum(percentages) / len(percentages)
            )

        else:
            average_score = None

        if subject.target_score is not None:
            target_score = subject.target_score
        else:
            target_score = 0

        # Only subjects with scores
        # can be used to train the model.
        if average_score is not None:

            rows.append({
                "subject": subject.name,
                "study_hours": study_hours,
                "session_count": session_count,
                "average_session_minutes":
                    average_session_minutes,
                "score_count": score_count,
                "target_score": target_score,
                "average_score": average_score
            })

    return pd.DataFrame(rows)


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

    print(df.to_string(index=False))

    print()
    print(
        f"Training examples: {len(df)}"
    )

    # We need enough rows to create
    # a useful train/test split.
    if len(df) < 5:

        print()
        print("========================================")
        print("NOT ENOUGH DATA")
        print("========================================")
        print()
        print(
            "You currently have fewer than 5 "
            "subjects with scores."
        )
        print()
        print(
            "The ML pipeline is working, but "
            "there isn't enough data yet for "
            "a meaningful model evaluation."
        )
        print()
        print(
            "Add more subjects and assessment "
            "scores, then run this script again."
        )

        return

    # --------------------------------
    # Features
    # --------------------------------

    X = df[
        [
            "study_hours",
            "session_count",
            "average_session_minutes",
            "score_count",
            "target_score"
        ]
    ]

    # --------------------------------
    # Target
    # --------------------------------

    y = df["average_score"]

    print()
    print("Splitting dataset...")

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42
    )

    print(
        f"Training rows: {len(X_train)}"
    )

    print(
        f"Testing rows: {len(X_test)}"
    )

    # --------------------------------
    # Create model
    # --------------------------------

    print()
    print("Creating Linear Regression model...")

    model = LinearRegression()

    # --------------------------------
    # Train
    # --------------------------------

    print("Training model...")

    model.fit(
        X_train,
        y_train
    )

    print("Model trained successfully!")

    # --------------------------------
    # Predict
    # --------------------------------

    print()
    print("Making predictions...")

    predictions = model.predict(X_test)

    # --------------------------------
    # Evaluate
    # --------------------------------

    mae = mean_absolute_error(
        y_test,
        predictions
    )

    r2 = r2_score(
        y_test,
        predictions
    )

    print()
    print("========================================")
    print("MODEL RESULTS")
    print("========================================")

    print(
        f"Mean Absolute Error: {mae:.2f}"
    )

    print(
        f"R² Score: {r2:.2f}"
    )

    print()

    # --------------------------------
    # Show predictions
    # --------------------------------

    print("Actual vs Predicted:")

    for actual, predicted in zip(
        y_test,
        predictions
    ):

        print(
            f"Actual: {actual:.2f}%  |  "
            f"Predicted: {predicted:.2f}%"
        )

    # --------------------------------
    # Save model
    # --------------------------------

    model_data = {
        "model": model,
        "features": [
            "study_hours",
            "session_count",
            "average_session_minutes",
            "score_count",
            "target_score"
        ],
        "mae": float(mae),
        "r2": float(r2) if len(y_test) >= 2 else None,
        "training_examples": len(df),
        "training_rows": len(X_train),
        "testing_rows": len(X_test)
    }

    joblib.dump(
        model_data,
        "studysense_model.pkl"
    )

    print()
    print("========================================")
    print("MODEL SAVED")
    print("========================================")

    print(
        "studysense_model.pkl"
    )

    print()
    print("Training complete!")


if __name__ == "__main__":
    train_model()