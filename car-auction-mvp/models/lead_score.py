from extensions import db

class LeadScore(db.Model):
    __tablename__ = 'lead_scores'
    id = db.Column(db.Integer, primary_key=True)
    score = db.Column(db.Integer, nullable=False, default=0)

    # Foreign Key
    conversation_id = db.Column(db.Integer, db.ForeignKey('conversations.id'), nullable=False, unique=True)

    # Relationship
    conversation = db.relationship('Conversation', backref=db.backref('lead_score', uselist=False, cascade="all, delete-orphan"))