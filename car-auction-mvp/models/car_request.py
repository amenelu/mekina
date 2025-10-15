from . import db
from datetime import datetime
from .dealer_bid import DealerBid

class CarRequest(db.Model):
    """Model for a customer's request for a car."""
    __tablename__ = 'car_requests'

    id = db.Column(db.Integer, primary_key=True)
    make = db.Column(db.String(64), nullable=True)
    model = db.Column(db.String(64), nullable=True)
    min_year = db.Column(db.Integer, nullable=True)
    max_mileage = db.Column(db.Integer, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default='active', nullable=False) # e.g., active, completed, expired
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Foreign Key to the user who made the request
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    # Relationship to dealer bids
    dealer_bids = db.relationship('DealerBid', foreign_keys='DealerBid.request_id', backref='car_request', lazy='dynamic', cascade="all, delete-orphan")

    # Link to the winning bid
    accepted_bid_id = db.Column(db.Integer, db.ForeignKey('dealer_bid.id'), nullable=True)
    accepted_bid = db.relationship('DealerBid', foreign_keys=[accepted_bid_id])