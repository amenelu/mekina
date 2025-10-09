from app import db
from datetime import datetime

class Question(db.Model):
    """Model for questions and answers on an auction."""
    __tablename__ = 'questions'

    id = db.Column(db.Integer, primary_key=True)
    question_text = db.Column(db.Text, nullable=False)
    answer_text = db.Column(db.Text, nullable=True)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    answer_timestamp = db.Column(db.DateTime, nullable=True)

    # Foreign Keys
    auction_id = db.Column(db.Integer, db.ForeignKey('auction.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False) # User who asked

    # Relationships
    auction = db.relationship('Auction', back_populates='questions')
    asker = db.relationship('User', backref='questions_asked')