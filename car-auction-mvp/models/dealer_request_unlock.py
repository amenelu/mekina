from datetime import datetime

from extensions import db


class DealerRequestUnlock(db.Model):
    __tablename__ = "dealer_request_unlocks"

    id = db.Column(db.Integer, primary_key=True)
    dealer_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    request_id = db.Column(db.Integer, db.ForeignKey("car_requests.id"), nullable=False)
    unlock_type = db.Column(db.String(40), nullable=False, default="high_intent")
    points_spent = db.Column(db.Integer, nullable=False, default=1)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    dealer = db.relationship("User", foreign_keys=[dealer_id])
    car_request = db.relationship("CarRequest")

    __table_args__ = (
        db.UniqueConstraint(
            "dealer_id",
            "request_id",
            "unlock_type",
            name="uq_dealer_request_unlock_once",
        ),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "dealer_id": self.dealer_id,
            "request_id": self.request_id,
            "unlock_type": self.unlock_type,
            "points_spent": self.points_spent,
            "created_at": self.created_at.isoformat() + "Z"
            if self.created_at
            else None,
        }
