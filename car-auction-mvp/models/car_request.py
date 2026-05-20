from extensions import db
from datetime import datetime
from flask import url_for
from .dealer_bid import DealerBid


class CarRequest(db.Model):
    """Model for a customer's request for a car."""

    __tablename__ = "car_requests"

    id = db.Column(db.Integer, primary_key=True)
    make = db.Column(db.String(64), nullable=True)
    model = db.Column(db.String(64), nullable=True)
    min_year = db.Column(db.Integer, nullable=True)
    max_mileage = db.Column(db.Integer, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    request_source = db.Column(db.String(20), nullable=True)
    status = db.Column(
        db.String(20), default="active", nullable=False
    )  # e.g., active, completed, expired
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Foreign Key to the user who made the request
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    target_car_id = db.Column(db.Integer, db.ForeignKey("car.id"), nullable=True)
    target_car = db.relationship("Car", foreign_keys=[target_car_id])

    # Relationship to dealer bids
    dealer_bids = db.relationship(
        "DealerBid",
        foreign_keys="DealerBid.request_id",
        backref="car_request",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )

    # Relationship to images
    images = db.relationship(
        "CarRequestImage",
        backref="car_request",
        lazy=True,
        cascade="all, delete-orphan",
    )

    # Link to the winning bid
    accepted_bid_id = db.Column(
        db.Integer,
        db.ForeignKey(
            "dealer_bid.id", use_alter=True, name="fk_car_requests_accepted_bid_id"
        ),
        nullable=True,
    )
    accepted_bid = db.relationship("DealerBid", foreign_keys=[accepted_bid_id])

    def to_dict(self):
        """Serializes the CarRequest object to a dictionary."""
        deal_id = None
        if self.status == "completed" and self.accepted_bid and self.accepted_bid.deal:
            deal_id = self.accepted_bid.deal.id
        request_source = self.request_source or getattr(self, "_request_source", None)
        if not request_source and self.notes and "Customer is looking for a car" in self.notes:
            request_source = "general"
        elif not request_source and self.images and not (self.make or self.model or self.min_year):
            request_source = "image_based"
        elif not request_source:
            request_source = "specific"

        return {
            "id": self.id,
            "make": self.make,
            "model": self.model,
            "request_source": request_source,
            "target_car_id": self.target_car_id,
            "target_car": self.target_car.to_dict() if self.target_car else None,
            "min_year": self.min_year,
            "max_mileage": self.max_mileage,
            "notes": self.notes,
            "status": self.status,
            "created_at": self.created_at.isoformat() + "Z",
            "user_id": self.user_id,
            "bid_count": self.dealer_bids.count(),  # Kept for web compatibility
            "offer_count": self.dealer_bids.count(),  # Added for mobile app
            "accepted_bid_id": self.accepted_bid_id,
            "deal_id": deal_id,
            "image_urls": [
                url_for(
                    "static",
                    filename=img.image_url.split("/static/")[1],
                    _external=True,
                )
                for img in self.images
                if img.image_url and "/static/" in img.image_url
            ],
        }
