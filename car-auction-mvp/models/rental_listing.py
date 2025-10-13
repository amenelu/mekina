from . import db
from datetime import datetime

class RentalListing(db.Model):
    __tablename__ = 'rental_listings'

    id = db.Column(db.Integer, primary_key=True)
    price_per_day = db.Column(db.Float, nullable=False)
    is_available = db.Column(db.Boolean, default=True, nullable=False)
    
    car_id = db.Column(db.Integer, db.ForeignKey('car.id'), nullable=False, unique=True)