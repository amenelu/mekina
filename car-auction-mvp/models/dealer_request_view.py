from extensions import db
from datetime import datetime

class DealerRequestView(db.Model):
    __tablename__ = 'dealer_request_view'

    id = db.Column(db.Integer, primary_key=True)
    dealer_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    request_id = db.Column(db.Integer, db.ForeignKey('car_requests.id'), nullable=False, index=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    dealer = db.relationship('User', backref=db.backref('request_views', lazy='dynamic'))
    car_request = db.relationship('CarRequest', backref=db.backref('views_by_dealers', lazy='dynamic'))

    __table_args__ = (db.UniqueConstraint('dealer_id', 'request_id', name='_dealer_request_uc'),)

    def __repr__(self):
        return f'<DealerRequestView Dealer {self.dealer_id} viewed Request {self.request_id}>'