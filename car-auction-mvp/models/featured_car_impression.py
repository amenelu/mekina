from datetime import datetime

from extensions import db


class FeaturedCarImpression(db.Model):
    __tablename__ = "featured_car_impressions"

    id = db.Column(db.Integer, primary_key=True)
    car_id = db.Column(
        db.Integer,
        db.ForeignKey("car.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    impression_count = db.Column(db.Integer, default=0, nullable=False)
    last_shown_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    car = db.relationship("Car", backref=db.backref("featured_impression", uselist=False))
