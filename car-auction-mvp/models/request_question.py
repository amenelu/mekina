from . import db
from datetime import datetime

class RequestQuestion(db.Model):
    __tablename__ = 'request_questions'
    id = db.Column(db.Integer, primary_key=True)
    question_text = db.Column(db.Text, nullable=False)
    answer_text = db.Column(db.Text, nullable=True)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    answer_timestamp = db.Column(db.DateTime, nullable=True)

    # Foreign Keys
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False) # The user (buyer) asking
    dealer_bid_id = db.Column(db.Integer, db.ForeignKey('dealer_bid.id'), nullable=False)

    # Relationships
    asker = db.relationship('User', backref='asked_request_questions')
    dealer_bid = db.relationship('DealerBid', backref=db.backref('questions', lazy='dynamic', cascade="all, delete-orphan"))

    def __repr__(self):
        return f'<RequestQuestion {self.id} for Bid {self.dealer_bid_id}>'
