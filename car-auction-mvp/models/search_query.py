from extensions import db
from datetime import datetime


class SearchQuery(db.Model):
    __tablename__ = "search_queries"
    id = db.Column(db.Integer, primary_key=True)
    query_text = db.Column(db.String(255), nullable=False, index=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("user.id"), nullable=True
    )  # Can be anonymous
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def __repr__(self):
        return f'<SearchQuery "{self.query_text}">'
