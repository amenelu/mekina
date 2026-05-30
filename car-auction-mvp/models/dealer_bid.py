from datetime import datetime, date, timedelta
from extensions import db
from flask import url_for
from .request_question import RequestQuestion


class DealerBid(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    price = db.Column(db.Float, nullable=False)
    price_with_loan = db.Column(db.Float, nullable=True)
    timestamp = db.Column(db.DateTime, index=True, default=datetime.utcnow)
    status = db.Column(
        db.String(20), nullable=False, default="pending"
    )  # e.g., pending, accepted, rejected

    # --- New fields for detailed offer ---
    # These fields are added to specify the exact car being offered.
    make = db.Column(db.String(64), nullable=False)
    model = db.Column(db.String(64), nullable=False)
    availability = db.Column(db.String(50), nullable=False)
    car_year = db.Column(db.Integer, nullable=False)
    mileage = db.Column(db.Integer, nullable=False)
    condition = db.Column(db.String(50), nullable=False)
    extras = db.Column(db.Text, nullable=True)
    valid_until = db.Column(db.Date, nullable=False)
    message = db.Column(db.Text, nullable=True)

    edit_point_deducted = db.Column(db.Boolean, default=False, nullable=False)
    dealer_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    request_id = db.Column(db.Integer, db.ForeignKey("car_requests.id"), nullable=False)

    # Relationship to the final deal, if this bid was accepted
    deal = db.relationship(
        "Deal",
        backref="accepted_bid",
        uselist=False,
        foreign_keys="Deal.accepted_bid_id",
    )
    images = db.relationship(
        "DealerBidImage", backref="dealer_bid", lazy=True, cascade="all, delete-orphan"
    )
    questions = db.relationship("RequestQuestion", backref="dealer_bid", lazy="dynamic")
    pipeline_entry = db.relationship(
        "DealerLeadPipeline",
        back_populates="dealer_bid",
        uselist=False,
        cascade="all, delete-orphan",
    )

    def to_dict(self, is_newest=False, is_best_deal=False):
        """Serializes the DealerBid object to a dictionary, with optional flags."""
        image_urls = []
        if (
            self.images
        ):  # This block is now cleaner and relies on the existing request context
            image_urls = [
                url_for(
                    "static",
                    filename=img.image_url.split("/static/")[1],
                    _external=True,
                )
                for img in self.images
                if img.image_url and "/static/" in img.image_url
            ]
        return {
            "id": self.id,
            "price": self.price,
            "price_with_loan": self.price_with_loan,
            "timestamp": self.timestamp.isoformat() + "Z",
            "free_edit_expires_at": (
                (self.timestamp + timedelta(minutes=5))
                .replace(microsecond=0)
                .isoformat()
                + "Z"
            ),
            "status": self.status,
            "make": self.make,
            "model": self.model,
            "availability": self.availability,
            "car_year": self.car_year,
            "mileage": self.mileage,
            "condition": self.condition,
            "extras": self.extras,
            "valid_until": self.valid_until.isoformat(),
            "message": self.message,
            "image_urls": image_urls,
            "image_url": image_urls[0] if image_urls else None,
            "is_newest": is_newest,
            "is_best_deal": is_best_deal,
            "questions": [
                q.to_dict() for q in self.questions.order_by(RequestQuestion.timestamp)
            ],
            "request_id": self.request_id,
            "dealer": (
                {
                    "id": self.dealer.id,
                    "username": self.dealer.username,
                    "is_verified": self.dealer.is_verified,
                    "avg_rating": self.dealer.get_average_rating(),
                    "closed_deal_count": self.dealer.get_closed_deal_count(),
                }
                if self.dealer
                else None
            ),
        }

    def __repr__(self):
        return f"<DealerBid {self.price} for Request ID {self.request_id}>"
