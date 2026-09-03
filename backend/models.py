from database import db


class Subject(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    target_score = db.Column(db.Float, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "target_score": self.target_score
        }


class StudySession(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    subject_id = db.Column(
        db.Integer,
        db.ForeignKey("subject.id"),
        nullable=False
    )
    topic = db.Column(db.String(200), nullable=False)
    duration = db.Column(db.Integer, nullable=False)
    date = db.Column(db.String(20), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "subject_id": self.subject_id,
            "topic": self.topic,
            "duration": self.duration,
            "date": self.date
        }


class Score(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    subject_id = db.Column(
        db.Integer,
        db.ForeignKey("subject.id"),
        nullable=False
    )
    assessment = db.Column(db.String(200), nullable=False)
    score = db.Column(db.Float, nullable=False)
    max_score = db.Column(db.Float, nullable=False)
    date = db.Column(db.String(20), nullable=False)

    def to_dict(self):
        percentage = (self.score / self.max_score) * 100

        return {
            "id": self.id,
            "subject_id": self.subject_id,
            "assessment": self.assessment,
            "score": self.score,
            "max_score": self.max_score,
            "percentage": round(percentage, 2),
            "date": self.date
        }