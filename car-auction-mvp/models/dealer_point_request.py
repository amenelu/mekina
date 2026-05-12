from datetime import datetime

from extensions import db


class DealerPointRequest(db.Model):
    __tablename__ = "dealer_point_requests"

    id = db.Column(db.Integer, primary_key=True)
    dealer_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    requested_points = db.Column(db.Integer, nullable=False)
    reason = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), nullable=False, default="pending", index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    reviewed_at = db.Column(db.DateTime, nullable=True)

    dealer = db.relationship(
        "User",
        backref=db.backref("point_requests", lazy="dynamic"),
        foreign_keys=[dealer_id],
    )

    def to_dict(self):
        return {
            "id": self.id,
            "dealer_id": self.dealer_id,
            "dealer_username": self.dealer.username if self.dealer else None,
            "dealer_email": self.dealer.email if self.dealer else None,
            "dealer_phone_number": self.dealer.phone_number if self.dealer else None,
            "dealer_current_points": self.dealer.points if self.dealer else None,
            "requested_points": self.requested_points,
            "reason": self.reason,
            "status": self.status,
            "created_at": self.created_at.isoformat() + "Z",
            "reviewed_at": self.reviewed_at.isoformat() + "Z"
            if self.reviewed_at
            else None,
        }
