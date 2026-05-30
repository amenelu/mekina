from datetime import datetime

from extensions import db


class RequestIntentVerification(db.Model):
    __tablename__ = "request_intent_verifications"

    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(
        db.Integer, db.ForeignKey("car_requests.id"), nullable=False, unique=True
    )
    contact_confirmed = db.Column(db.Boolean, nullable=False, default=False)
    budget_confirmed = db.Column(db.Boolean, nullable=False, default=False)
    financing_ready = db.Column(db.Boolean, nullable=False, default=False)
    trade_in_ready = db.Column(db.Boolean, nullable=False, default=False)
    purchase_timeline = db.Column(db.String(40), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    score = db.Column(db.Integer, nullable=False, default=0)
    level = db.Column(db.String(20), nullable=False, default="basic")
    verified_at = db.Column(db.DateTime, nullable=True)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    def to_dict(self):
        return {
            "id": self.id,
            "request_id": self.request_id,
            "contact_confirmed": self.contact_confirmed,
            "budget_confirmed": self.budget_confirmed,
            "financing_ready": self.financing_ready,
            "trade_in_ready": self.trade_in_ready,
            "purchase_timeline": self.purchase_timeline,
            "notes": self.notes,
            "score": self.score,
            "level": self.level,
            "verified_at": self.verified_at.isoformat() + "Z" if self.verified_at else None,
            "updated_at": self.updated_at.isoformat() + "Z" if self.updated_at else None,
        }

