from extensions import db
from datetime import datetime

class ChatMessage(db.Model):
    __tablename__ = 'chat_messages'
    id = db.Column(db.Integer, primary_key=True)
    body = db.Column(db.Text, nullable=False)
    original_body = db.Column(db.Text, nullable=True) # Store the unmasked message
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    is_read = db.Column(db.Boolean, nullable=False, default=False)

    # Foreign Keys
    conversation_id = db.Column(db.Integer, db.ForeignKey('conversations.id'), nullable=False)
    sender_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    def to_dict(self):
        """Serializes the ChatMessage object to a dictionary."""
        return {
            'id': self.id,
            'body': self.body,
            'timestamp': self.timestamp.isoformat() + 'Z',
            'is_read': self.is_read,
            'sender': {
                'id': self.sender_id,
                'username': self.sender.username
            }
        }
    # Relationships
    conversation = db.relationship('Conversation', backref=db.backref('messages', lazy='dynamic', cascade="all, delete-orphan"))
    sender = db.relationship('User', backref='sent_chat_messages')