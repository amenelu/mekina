from extensions import db

class RentalListing(db.Model):
    __tablename__ = 'rental_listings'
    id = db.Column(db.Integer, primary_key=True)
    price_per_day = db.Column(db.Float, nullable=False)
    is_available = db.Column(db.Boolean, default=True, nullable=False)
    car_id = db.Column(db.Integer, db.ForeignKey('car.id'), nullable=False, unique=True)

    def __repr__(self):
        return f'<RentalListing {self.id} for Car {self.car_id}>'