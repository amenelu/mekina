from extensions import db
from datetime import datetime

class DealerRating(db.Model):
    __tablename__ = 'dealer_ratings'
    id = db.Column(db.Integer, primary_key=True)
    rating = db.Column(db.Integer, nullable=False) # e.g., 1 to 5
    review_text = db.Column(db.Text, nullable=True)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    # Foreign Keys
    dealer_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    buyer_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    deal_id = db.Column(db.Integer, db.ForeignKey('deal.id'), nullable=False, unique=True)

    # Relationships
    dealer = db.relationship('User', foreign_keys=[dealer_id], back_populates='ratings_received')
    buyer = db.relationship('User', foreign_keys=[buyer_id], back_populates='ratings_given')
    deal = db.relationship('Deal', backref=db.backref('rating', uselist=False))