from datetime import datetime

from extensions import db


class DealerLeadPipeline(db.Model):
    __tablename__ = "dealer_lead_pipeline"

    id = db.Column(db.Integer, primary_key=True)
    dealer_bid_id = db.Column(
        db.Integer, db.ForeignKey("dealer_bid.id"), nullable=False, unique=True
    )
    dealer_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    buyer_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    request_id = db.Column(db.Integer, db.ForeignKey("car_requests.id"), nullable=False)
    stage = db.Column(db.String(40), nullable=False, default="offer_sent")
    buyer_viewed_at = db.Column(db.DateTime, nullable=True)
    last_activity_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    next_follow_up_at = db.Column(db.DateTime, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    dealer_bid = db.relationship("DealerBid", back_populates="pipeline_entry")
    dealer = db.relationship("User", foreign_keys=[dealer_id])
    buyer = db.relationship("User", foreign_keys=[buyer_id])
    car_request = db.relationship("CarRequest")

    def to_dict(self):
        bid = self.dealer_bid
        return {
            "id": self.id,
            "dealer_bid_id": self.dealer_bid_id,
            "dealer_id": self.dealer_id,
            "buyer_id": self.buyer_id,
            "request_id": self.request_id,
            "stage": self.stage,
            "buyer_viewed_at": (
                self.buyer_viewed_at.isoformat() + "Z" if self.buyer_viewed_at else None
            ),
            "last_activity_at": (
                self.last_activity_at.isoformat() + "Z" if self.last_activity_at else None
            ),
            "next_follow_up_at": (
                self.next_follow_up_at.isoformat() + "Z" if self.next_follow_up_at else None
            ),
            "notes": self.notes,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
            "updated_at": self.updated_at.isoformat() + "Z" if self.updated_at else None,
            "bid": bid.to_dict() if bid else None,
        }

