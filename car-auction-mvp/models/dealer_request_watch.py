from datetime import datetime

from extensions import db


class DealerRequestWatch(db.Model):
    __tablename__ = "dealer_request_watches"

    id = db.Column(db.Integer, primary_key=True)
    dealer_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    request_id = db.Column(db.Integer, db.ForeignKey("car_requests.id"), nullable=False)
    points_spent = db.Column(db.Integer, nullable=False, default=1)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=True)

    dealer = db.relationship("User", foreign_keys=[dealer_id])
    car_request = db.relationship("CarRequest")

    __table_args__ = (
        db.UniqueConstraint(
            "dealer_id",
            "request_id",
            name="uq_dealer_request_watch_once",
        ),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "dealer_id": self.dealer_id,
            "request_id": self.request_id,
            "points_spent": self.points_spent,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() + "Z"
            if self.created_at
            else None,
            "expires_at": self.expires_at.isoformat() + "Z"
            if self.expires_at
            else None,
        }
