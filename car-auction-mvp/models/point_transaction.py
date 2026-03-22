from extensions import db
from datetime import datetime


class PointTransaction(db.Model):
    __tablename__ = "point_transactions"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    amount = db.Column(
        db.Integer, nullable=False
    )  # Negative for spend, Positive for deposit
    transaction_type = db.Column(
        db.String(50), nullable=False
    )  # e.g., 'analytics_unlock', 'bid_fee'
    description = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", backref=db.backref("transactions", lazy=True))
