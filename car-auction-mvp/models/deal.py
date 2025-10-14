from datetime import datetime
from . import db

class Deal(db.Model):
    __tablename__ = 'deal'
    id = db.Column(db.Integer, primary_key=True)
    final_price = db.Column(db.Float, nullable=False)
    deal_date = db.Column(db.DateTime, default=datetime.utcnow)

    customer_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    dealer_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    car_request_id = db.Column(db.Integer, db.ForeignKey('car_requests.id'), nullable=False)
    accepted_bid_id = db.Column(db.Integer, db.ForeignKey('dealer_bid.id'), nullable=False)

    customer = db.relationship('User', foreign_keys=[customer_id])
    dealer = db.relationship('User', foreign_keys=[dealer_id])