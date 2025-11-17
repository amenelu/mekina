from extensions import db
from datetime import datetime

class Conversation(db.Model):
    __tablename__ = 'conversations'
    id = db.Column(db.Integer, primary_key=True)
    is_unlocked = db.Column(db.Boolean, nullable=False, default=False) # Tracks if dealer paid to unlock
    message_count = db.Column(db.Integer, nullable=False, default=0) # Tracks number of free messages
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    # Foreign Keys
    car_id = db.Column(db.Integer, db.ForeignKey('car.id'), nullable=False)
    buyer_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    dealer_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    # Relationships
    car = db.relationship('Car', backref='conversations')
    buyer = db.relationship('User', foreign_keys=[buyer_id])
    dealer = db.relationship('User', foreign_keys=[dealer_id])

    def __repr__(self):
        return f'<Conversation {self.id} between Buyer {self.buyer_id} and Dealer {self.dealer_id}>'