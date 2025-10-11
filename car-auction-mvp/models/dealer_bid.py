from . import db
from datetime import datetime

class DealerBid(db.Model):
    """Model for a dealer's price bid on a car request."""
    __tablename__ = 'dealer_bids'

    id = db.Column(db.Integer, primary_key=True)
    price = db.Column(db.Float, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    # Foreign Keys
    dealer_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    request_id = db.Column(db.Integer, db.ForeignKey('car_requests.id'), nullable=False)