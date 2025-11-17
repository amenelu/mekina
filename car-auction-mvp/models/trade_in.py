from extensions import db
from datetime import datetime

class TradeInRequest(db.Model):
    """Represents a user's request to trade in their car."""
    __tablename__ = 'trade_in_requests'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    make = db.Column(db.String(50), nullable=False)
    model = db.Column(db.String(50), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    mileage = db.Column(db.Integer, nullable=False)
    condition = db.Column(db.String(50), nullable=False)
    vin = db.Column(db.String(17), nullable=True)
    comments = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(50), nullable=False, default='pending') # e.g., pending, reviewed, contacted, completed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    user = db.relationship('User', backref=db.backref('trade_in_requests', lazy=True))
    photos = db.relationship('TradeInPhoto', backref='trade_in_request', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        """Serializes the object to a dictionary."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'make': self.make,
            'model': self.model,
            'year': self.year,
            'mileage': self.mileage,
            'condition': self.condition,
            'vin': self.vin,
            'comments': self.comments,
            'status': self.status,
            'created_at': self.created_at.isoformat() + 'Z',
            'photos': [photo.to_dict() for photo in self.photos]
        }

class TradeInPhoto(db.Model):
    """Represents a photo associated with a trade-in request."""
    __tablename__ = 'trade_in_photos'

    id = db.Column(db.Integer, primary_key=True)
    image_url = db.Column(db.String(255), nullable=False)
    trade_in_request_id = db.Column(db.Integer, db.ForeignKey('trade_in_requests.id'), nullable=False)

    def to_dict(self):
        """Serializes the object to a dictionary."""
        return {
            'id': self.id,
            'image_url': self.image_url,
            'trade_in_request_id': self.trade_in_request_id
        }