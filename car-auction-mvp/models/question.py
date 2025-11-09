from . import db
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

    def to_dict(self):
        """Serializes the Question object to a dictionary."""
        return {
            'id': self.id,
            'question_text': self.question_text,
            'answer_text': self.answer_text,
            'timestamp': self.timestamp.isoformat() + 'Z',
            'answer_timestamp': self.answer_timestamp.isoformat() + 'Z' if self.answer_timestamp else None,
            'asker': self.asker.to_dict() if self.asker else None
        }