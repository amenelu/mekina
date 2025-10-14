from datetime import datetime, date
from . import db

class DealerBid(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    price = db.Column(db.Float, nullable=False)
    timestamp = db.Column(db.DateTime, index=True, default=datetime.utcnow)
    
    # --- New fields for detailed offer ---
    availability = db.Column(db.String(50), nullable=False)
    car_year = db.Column(db.Integer, nullable=False)
    mileage = db.Column(db.Integer, nullable=False)
    condition = db.Column(db.String(50), nullable=False)
    extras = db.Column(db.Text, nullable=True)
    valid_until = db.Column(db.Date, nullable=False)
    message = db.Column(db.Text, nullable=True)

    dealer_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    request_id = db.Column(db.Integer, db.ForeignKey('car_requests.id'), nullable=False)

    def __repr__(self):
        return f'<DealerBid {self.price} for Request ID {self.request_id}>'