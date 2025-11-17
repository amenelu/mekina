from datetime import datetime
from extensions import db

class Deal(db.Model):
    __tablename__ = 'deal'
    id = db.Column(db.Integer, primary_key=True)
    final_price = db.Column(db.Float, nullable=False)
    deal_date = db.Column(db.DateTime, default=datetime.utcnow)

    customer_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    dealer_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    car_request_id = db.Column(db.Integer, db.ForeignKey('car_requests.id'), nullable=False)
    accepted_bid_id = db.Column(db.Integer, db.ForeignKey('dealer_bid.id'), nullable=False)
    payment_method = db.Column(db.String(50), nullable=False, default='cash')

    customer = db.relationship('User', foreign_keys=[customer_id])
    dealer = db.relationship('User', foreign_keys=[dealer_id])

    def to_dict(self):
        """Serializes the Deal object to a dictionary."""
        return {
            'id': self.id,
            'final_price': self.final_price,
            'deal_date': self.deal_date.isoformat() + 'Z',
            'payment_method': self.payment_method,
            'customer': self.customer.to_dict(detail_level='owner') if self.customer else None,
            'dealer': self.dealer.to_dict(detail_level='owner') if self.dealer else None,
            'car_request_id': self.car_request_id,
            'accepted_bid': self.accepted_bid.to_dict() if self.accepted_bid else None,
            'rating': {
                'rating': self.rating.rating,
                'review_text': self.rating.review_text
            } if self.rating else None
        }