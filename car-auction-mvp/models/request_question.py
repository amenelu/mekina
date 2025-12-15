from extensions import db
from datetime import datetime


class RequestQuestion(db.Model):
    """Model for a question asked by a buyer about a dealer's bid."""

    id = db.Column(db.Integer, primary_key=True)
    question_text = db.Column(db.Text, nullable=False)
    answer_text = db.Column(db.Text, nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    answered_at = db.Column(db.DateTime, nullable=True)

    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    dealer_bid_id = db.Column(
        db.Integer, db.ForeignKey("dealer_bid.id"), nullable=False
    )

    def to_dict(self):
        """Serializes the RequestQuestion object to a dictionary."""
        return {
            "id": self.id,
            "question_text": self.question_text,
            "answer_text": self.answer_text,
            "timestamp": self.timestamp.isoformat() + "Z",
            "answered_at": (
                self.answered_at.isoformat() + "Z" if self.answered_at else None
            ),
        }
