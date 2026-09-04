print("========================================")
print("StudySense ML Training Started")
print("========================================")

import pandas as pd
import joblib

from sklearn.model_selection import KFold, cross_val_score
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, r2_score

from app import app
from models import Subject, StudySession, Score


# ========================================
# CREATE ASSESSMENT-LEVEL DATASET
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

    # ------------------------------------
    # Each assessment becomes one ML row
    # ------------------------------------

    for score in scores:

        subject = next(
            (
                subject
                for subject in subjects
                if subject.id == score.subject_id
            ),
            None
        )

        if subject is None:
            continue

        # --------------------------------
        # Sessions BEFORE this assessment
        # --------------------------------

        previous_sessions = [
            session
            for session in sessions
            if session.subject_id == score.subject_id
            and session.date <= score.date
        ]

        # --------------------------------
        # Previous assessments
        # --------------------------------

        previous_scores = [
            previous_score
            for previous_score in scores
            if previous_score.subject_id == score.subject_id
            and previous_score.date < score.date
            and previous_score.id != score.id
        ]

        # --------------------------------
        # Study statistics
        # --------------------------------

        total_minutes = sum(
            float(session.duration)
            for session in previous_sessions
        )

        session_count = len(
            previous_sessions
        )

        study_hours = (
            total_minutes / 60
        )

        average_session_minutes = (
            total_minutes / session_count
            if session_count > 0
            else 0
        )

        # --------------------------------
        # Previous score statistics
        # --------------------------------

        previous_percentages = []

        for previous_score in previous_scores:

            if float(previous_score.max_score) > 0:

                percentage = (
                    float(previous_score.score)
                    / float(previous_score.max_score)
                ) * 100

                previous_percentages.append(
                    percentage
                )

        if previous_percentages:

            previous_score_average = (
                sum(previous_percentages)
                / len(previous_percentages)
            )

        else:

            previous_score_average = 0

        previous_score_count = len(
            previous_percentages
        )

        # --------------------------------
        # Target score
        # --------------------------------

        target_score = (
            float(subject.target_score)
            if subject.target_score is not None
            else 0
        )

        # --------------------------------
        # Actual assessment score
        # --------------------------------

        if float(score.max_score) <= 0:
            continue

        actual_score = (
            float(score.score)
            / float(score.max_score)
        ) * 100

        # --------------------------------
        # Create ML row
        # --------------------------------

        rows.append({

            "subject":
                subject.name,

            "study_hours":
                study_hours,

            "session_count":
                session_count,

            "average_session_minutes":
                average_session_minutes,

            "previous_score_average":
                previous_score_average,

            "previous_score_count":
                previous_score_count,

            "target_score":
                target_score,

            "actual_score":
                actual_score

        })

    return pd.DataFrame(rows)


# ========================================
# TRAIN MODEL
# ========================================

def train_model():

    print()
    print(
        "Creating assessment-level "
        "ML dataset..."
    )

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
            "Add assessment scores before "
            "training the model."
        )

        return

    print(
        df.to_string(index=False)
    )

    training_examples = len(df)

    print()
    print(
        f"Training examples: "
        f"{training_examples}"
    )

    # ====================================
    # FEATURES
    # ====================================

    features = [

        "study_hours",

        "session_count",

        "average_session_minutes",

        "previous_score_average",

        "previous_score_count",

        "target_score"

    ]

    X = df[features]

    # ====================================
    # TARGET
    # ====================================

    y = df["actual_score"]

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

    average_mae = None
    cv_folds = 0
    cv_mae_scores = []
    cv_r2_scores = []

    # ------------------------------------
    # Need at least 5 rows for CV
    # ------------------------------------

    if len(df) >= 5:

        cv_folds = min(
            5,
            len(df)
        )

        kfold = KFold(
            n_splits=cv_folds,
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

        cv_mae_scores = [
            float(value)
            for value in mae_scores
        ]

        for index, score_value in enumerate(
            mae_scores,
            start=1
        ):

            print(
                f"Fold {index} MAE: "
                f"{score_value:.2f}"
            )

        average_mae = mae_scores.mean()

        print()
        print(
            f"Average Cross-Validation MAE: "
            f"{average_mae:.2f}"
        )

        # --------------------------------
        # R²
        # --------------------------------
        #
        # With very small datasets, R² can
        # be unstable. We calculate it for
        # reference but only save it when
        # cross-validation provides valid
        # values.
        # --------------------------------

        r2_scores = cross_val_score(
            model,
            X,
            y,
            cv=kfold,
            scoring="r2"
        )

        cv_r2_scores = [
            float(value)
            for value in r2_scores
            if pd.notna(value)
        ]

        if cv_r2_scores:

            average_r2 = (
                sum(cv_r2_scores)
                / len(cv_r2_scores)
            )

            print()
            print(
                f"Average Cross-Validation R²: "
                f"{average_r2:.4f}"
            )

        else:

            average_r2 = None

            print()
            print(
                "R² could not be calculated "
                "reliably."
            )

    else:

        print()
        print(
            "Not enough examples for "
            "5-fold cross-validation."
        )

        print(
            "More assessment data is needed."
        )

        average_r2 = None

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

    final_model = LinearRegression()

    final_model.fit(
        X,
        y
    )

    print(
        "Final model trained successfully!"
    )

    # ====================================
    # TRAINING R²
    # ====================================

    training_predictions = (
        final_model.predict(X)
    )

    training_r2 = r2_score(
        y,
        training_predictions
    )

    print()
    print(
        f"Training R²: "
        f"{training_r2:.4f}"
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
        final_model.coef_
    ):

        print(
            f"{feature}: "
            f"{coefficient:.4f}"
        )

    print()

    print(
        f"Intercept: "
        f"{final_model.intercept_:.4f}"
    )

    # ====================================
    # MODEL STATUS
    # ====================================

    if training_examples < 10:

        model_status = (
            "Early model - more assessment "
            "data needed"
        )

    elif average_mae is not None and average_mae <= 10:

        model_status = (
            "Good early performance"
        )

    elif average_mae is not None:

        model_status = (
            "Needs more data and improvement"
        )

    else:

        model_status = (
            "More assessment data needed"
        )

    # ====================================
    # SAVE MODEL
    # ====================================

    model_data = {

        "model":
            final_model,

        "features":
            features,

        "mae":
            (
                float(average_mae)
                if average_mae is not None
                else None
            ),

        "r2":
            (
                float(average_r2)
                if average_r2 is not None
                else None
            ),

        "training_r2":
            float(training_r2),

        "training_examples":
            training_examples,

        "testing_examples":
            0,

        "cv_folds":
            cv_folds,

        "cv_mae_scores":
            cv_mae_scores,

        "cv_r2_scores":
            cv_r2_scores,

        "model_status":
            model_status,

        "model_type":
            "Linear Regression",

        "prediction_target":
            "assessment_score"

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
        f"Training examples: "
        f"{training_examples}"
    )

    print(
        f"Cross-validation folds: "
        f"{cv_folds}"
    )

    if average_mae is not None:

        print(
            f"Average CV MAE: "
            f"{average_mae:.2f}"
        )

    if average_r2 is not None:

        print(
            f"Average CV R²: "
            f"{average_r2:.4f}"
        )

    print()

    print(
        "The model now predicts assessment "
        "performance from study history."
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