from . import db

from .car_image import CarImage # Import the CarImage model
class Car(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    make = db.Column(db.String(64), nullable=False)
    model = db.Column(db.String(64), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    description = db.Column(db.Text, nullable=True)
    # image_url = db.Column(db.String(200), nullable=True) # REMOVE THIS LINE
    owner_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    service_history_url = db.Column(db.String(200), nullable=True)
    inspection_report_url = db.Column(db.String(200), nullable=True)
    is_approved = db.Column(db.Boolean, default=False, nullable=False)
    transmission = db.Column(db.String(50))
    drivetrain = db.Column(db.String(50))
    mileage = db.Column(db.Integer)
    fuel_type = db.Column(db.String(50))
    condition = db.Column(db.String(50)) # New, Used

    # Relationship
    auction = db.relationship('Auction', backref='car', uselist=False) # One-to-one relationship with Auction
    images = db.relationship('CarImage', backref='car', lazy=True, cascade="all, delete-orphan") # One-to-many relationship with CarImage

    # Property to easily get the primary image for thumbnails
    @property
    def primary_image_url(self):
        if self.images:
            return self.images[0].image_url
        return None

    def __repr__(self):
        return f'<Car {self.year} {self.make} {self.model}>'
