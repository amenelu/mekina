from datetime import datetime
from extensions import db
from .question import Question

class Auction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    start_time = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    end_time = db.Column(db.DateTime, nullable=False)
    start_price = db.Column(db.Float, nullable=False)
    current_price = db.Column(db.Float, nullable=False)
    
    car_id = db.Column(db.Integer, db.ForeignKey('car.id'), nullable=False, unique=True)
    winner_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)

    # Relationships
    bids = db.relationship('Bid', backref='auction', lazy='dynamic', cascade="all, delete-orphan")
    questions = db.relationship('Question', back_populates='auction', lazy='dynamic', cascade="all, delete-orphan")

    def to_dict(self):
        """Serializes the Auction object to a dictionary."""
        return {
            'id': self.id,
            'start_time': self.start_time.isoformat() + 'Z',
            'end_time': self.end_time.isoformat() + 'Z',
            'start_price': self.start_price,
            'current_price': self.current_price,
            'bid_count': self.bids.count()
        }

    def __repr__(self):
        return f'<Auction for Car ID {self.car_id}>'