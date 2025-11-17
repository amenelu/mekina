from datetime import datetime
from extensions import db

class Notification(db.Model):
    __tablename__ = 'notification'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    message = db.Column(db.Text, nullable=False)
    link = db.Column(db.String(255), nullable=True)
    is_read = db.Column(db.Boolean, default=False, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def to_dict(self):
        """Serializes the Notification object to a dictionary."""
        return {
            'id': self.id,
            'message': self.message,
            'link': self.link,
            'is_read': self.is_read,
            'timestamp': self.timestamp.isoformat() + 'Z'
        }