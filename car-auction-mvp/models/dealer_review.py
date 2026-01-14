from extensions import db
from datetime import datetime


class DealerRating(db.Model):
    __tablename__ = "dealer_ratings"

    id = db.Column(db.Integer, primary_key=True)
    dealer_id = db.Column(
        db.Integer, db.ForeignKey("user.id"), nullable=False, index=True
    )
    buyer_id = db.Column(
        db.Integer, db.ForeignKey("user.id"), nullable=False, index=True
    )
    deal_id = db.Column(
        db.Integer, db.ForeignKey("deal.id"), nullable=False, unique=True
    )
    rating = db.Column(db.Integer, nullable=False)  # e.g., 1 to 5
    review_text = db.Column(db.Text, nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    dealer = db.relationship(
        "User",
        foreign_keys=[dealer_id],
        backref=db.backref("reviews_received", lazy="dynamic"),
    )
    buyer = db.relationship(
        "User",
        foreign_keys=[buyer_id],
        backref=db.backref("reviews_given", lazy="dynamic"),
    )
    deal = db.relationship("Deal", backref=db.backref("rating", uselist=False))

    def to_dict(self):
        """Serializes the DealerRating object to a dictionary."""
        return {
            "id": self.id,
            "rating": self.rating,
            "review_text": self.review_text,
            "comment": self.review_text,  # Alias for frontend compatibility
            "timestamp": self.timestamp.isoformat() + "Z",
            "dealer_id": self.dealer_id,
            "buyer_id": self.buyer_id,
            "deal_id": self.deal_id,
            "buyer_username": self.buyer.username if self.buyer else None,
        }

    def __repr__(self):
        return f"<DealerRating {self.id} for Dealer {self.dealer_id}>"
