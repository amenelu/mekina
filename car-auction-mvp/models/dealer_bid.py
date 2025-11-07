from datetime import datetime, date
from . import db

class DealerBid(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    price = db.Column(db.Float, nullable=False)
    price_with_loan = db.Column(db.Float, nullable=True)
    timestamp = db.Column(db.DateTime, index=True, default=datetime.utcnow)
    status = db.Column(db.String(20), nullable=False, default='pending') # e.g., pending, accepted, rejected
    
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
    image_url = db.Column(db.String(255), nullable=True) # New field for bid photo

    edit_point_deducted = db.Column(db.Boolean, default=False, nullable=False)
    dealer_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    request_id = db.Column(db.Integer, db.ForeignKey('car_requests.id'), nullable=False)

    # Relationship to the final deal, if this bid was accepted
    deal = db.relationship('Deal', backref='accepted_bid', uselist=False, foreign_keys='Deal.accepted_bid_id')

    def __repr__(self):
        return f'<DealerBid {self.price} for Request ID {self.request_id}>'