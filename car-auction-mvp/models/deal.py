from datetime import datetime
from extensions import db

class Deal(db.Model):
    __tablename__ = 'deal'
    id = db.Column(db.Integer, primary_key=True)
    final_price = db.Column(db.Float, nullable=False)
    deal_date = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), nullable=False, default='accepted')
    completed_at = db.Column(db.DateTime, nullable=True)
    reward_points_awarded = db.Column(db.Boolean, nullable=False, default=False)
    reward_points_amount = db.Column(db.Integer, nullable=False, default=0)
    completion_requested_at = db.Column(db.DateTime, nullable=True)
    completion_requested_by_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)

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
            'status': self.status,
            'completed_at': self.completed_at.isoformat() + 'Z' if self.completed_at else None,
            'completion_requested_at': self.completion_requested_at.isoformat() + 'Z' if self.completion_requested_at else None,
            'completion_requested_by_id': self.completion_requested_by_id,
            'reward_points_awarded': self.reward_points_awarded,
            'reward_points_amount': self.reward_points_amount,
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
