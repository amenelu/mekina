from extensions import db
from datetime import datetime


class TradeInRequest(db.Model):
    """Represents a user's request to trade in their car."""

    __tablename__ = "trade_in_requests"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    make = db.Column(db.String(50), nullable=False)
    model = db.Column(db.String(50), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    mileage = db.Column(db.Integer, nullable=False)
    condition = db.Column(db.String(50), nullable=False)
    vin = db.Column(db.String(17), nullable=True)
    comments = db.Column(db.Text, nullable=True)
    target_car = db.Column(db.String(100), nullable=True)
    status = db.Column(
        db.String(50), nullable=False, default="pending"
    )  # e.g., pending, reviewed, contacted, completed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    user = db.relationship("User", backref=db.backref("trade_in_requests", lazy=True))
    photos = db.relationship(
        "TradeInPhoto",
        backref="trade_in_request",
        lazy=True,
        cascade="all, delete-orphan",
    )
    offers = db.relationship(
        "TradeInOffer",
        backref="trade_in_request",
        lazy=True,
        cascade="all, delete-orphan",
    )

    def to_dict(self):
        """Serializes the object to a dictionary."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "make": self.make,
            "model": self.model,
            "year": self.year,
            "mileage": self.mileage,
            "condition": self.condition,
            "vin": self.vin,
            "comments": self.comments,
            "target_car": self.target_car,
            "status": self.status,
            "created_at": self.created_at.isoformat() + "Z",
            "photos": [photo.to_dict() for photo in self.photos],
            "offer_count": len(self.offers),
        }


class TradeInPhoto(db.Model):
    """Represents a photo associated with a trade-in request."""

    __tablename__ = "trade_in_photos"

    id = db.Column(db.Integer, primary_key=True)
    image_url = db.Column(db.String(255), nullable=False)
    trade_in_request_id = db.Column(
        db.Integer, db.ForeignKey("trade_in_requests.id"), nullable=False
    )

    def to_dict(self):
        """Serializes the object to a dictionary."""
        return {
            "id": self.id,
            "image_url": self.image_url,
            "trade_in_request_id": self.trade_in_request_id,
        }


class TradeInOffer(db.Model):
    """Represents an offer made by a dealer on a trade-in request."""

    __tablename__ = "trade_in_offers"

    id = db.Column(db.Integer, primary_key=True)
    trade_in_request_id = db.Column(
        db.Integer, db.ForeignKey("trade_in_requests.id"), nullable=False
    )
    dealer_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    amount = db.Column(db.Integer, nullable=False)
    notes = db.Column(db.Text, nullable=True)
    offered_car_make = db.Column(db.String(50), nullable=True)
    offered_car_model = db.Column(db.String(50), nullable=True)
    offered_car_year = db.Column(db.Integer, nullable=True)
    offered_car_condition = db.Column(db.String(50), nullable=True)
    offered_car_mileage = db.Column(db.Integer, nullable=True)
    offered_car_specs = db.Column(db.Text, nullable=True)
    offered_car_image_url = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(20), default="pending")  # pending, accepted, rejected
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    dealer = db.relationship("User", backref="trade_in_offers")

    def to_dict(self):
        return {
            "id": self.id,
            "dealer_name": self.dealer.username,
            "amount": self.amount,
            "notes": self.notes,
            "offered_car_make": self.offered_car_make,
            "offered_car_model": self.offered_car_model,
            "offered_car_year": self.offered_car_year,
            "offered_car_condition": self.offered_car_condition,
            "offered_car_mileage": self.offered_car_mileage,
            "offered_car_specs": self.offered_car_specs,
            "offered_car_image_url": self.offered_car_image_url,
            "status": self.status,
            "created_at": self.created_at.isoformat() + "Z",
        }
