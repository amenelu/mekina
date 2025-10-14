from . import db

class DealerBidImage(db.Model):
    __tablename__ = 'dealer_bid_image'
    id = db.Column(db.Integer, primary_key=True)
    image_url = db.Column(db.String(255), nullable=False)
    dealer_bid_id = db.Column(db.Integer, db.ForeignKey('dealer_bid.id'), nullable=False)

    def __repr__(self):
        return f'<DealerBidImage {self.id}>'