from datetime import datetime
from . import db

class Bid(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    amount = db.Column(db.Float, nullable=False)
    timestamp = db.Column(db.DateTime, index=True, default=datetime.utcnow)
    
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    auction_id = db.Column(db.Integer, db.ForeignKey('auction.id'), nullable=False)

    def to_dict(self):
        """Serializes the Bid object to a dictionary."""
        return {
            'id': self.id,
            'amount': self.amount,
            'timestamp': self.timestamp.isoformat() + 'Z',
            'bidder': self.bidder.to_dict() if self.bidder else None
        }

    def __repr__(self):
        return f'<Bid {self.amount} by User ID {self.user_id}>'
