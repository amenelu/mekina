from datetime import datetime
from app import db
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


    def __repr__(self):
        return f'<Auction for Car ID {self.car_id}>'