from extensions import db
from flask import url_for

from .car_image import CarImage # Import the CarImage model
from .equipment import Equipment
from .rental_listing import RentalListing

car_equipment_association = db.Table('car_equipment',
    db.Column('car_id', db.Integer, db.ForeignKey('car.id'), primary_key=True),
    db.Column('equipment_id', db.Integer, db.ForeignKey('equipment.id'), primary_key=True)
)

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
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    is_featured = db.Column(db.Boolean, default=False, nullable=False)
    is_bank_loan_available = db.Column(db.Boolean, default=False, nullable=False)
    transmission = db.Column(db.String(50))
    drivetrain = db.Column(db.String(50))
    mileage = db.Column(db.Integer)
    fuel_type = db.Column(db.String(50))
    condition = db.Column(db.String(50)) # e.g., New, Used
    body_type = db.Column(db.String(50), nullable=True) # e.g., SUV, Sedan
    listing_type = db.Column(db.String(50), default='auction', nullable=False) # 'auction', 'sale', 'rental'
    fixed_price = db.Column(db.Float, nullable=True) # For 'sale' listing_type

    # Relationship
    auction = db.relationship('Auction', backref='car', uselist=False, cascade="all, delete-orphan")
    rental_listing = db.relationship('RentalListing', backref='car', uselist=False, cascade="all, delete-orphan")
    images = db.relationship('CarImage', backref='car', lazy=True, cascade="all, delete-orphan") # One-to-many relationship with CarImage
    equipment = db.relationship('Equipment', secondary=car_equipment_association, lazy='subquery', backref=db.backref('cars', lazy=True))

    # Property to easily get the primary image for thumbnails
    @property
    def primary_image_url(self):
        """Generates an absolute URL for the primary image."""
        if self.images and self.images[0].image_url and '/static/' in self.images[0].image_url:
            # The image_url is stored as '/static/uploads/...'
            # We need to get the path relative to the 'static' folder for url_for.
            try:
                filename = self.images[0].image_url.split('/static/')[1]
                return url_for('static', filename=filename, _external=True)
            except IndexError:
                pass # Fallback if the URL format is unexpected
        # Return a default placeholder if you have one, otherwise None
        return url_for('static', filename='img/default_car.png', _external=True)

    def get_price_display(self):
        """Returns a formatted string for the car's price based on listing type."""
        price = None
        if self.listing_type == 'sale':
            price = self.fixed_price
        elif self.listing_type == 'auction' and self.auction:
            price = self.auction.current_price
        
        if price is not None:
            return f"{price:,.0f} ETB"
        return "N/A"

    def to_dict(self, include_owner=False):
        """Serializes the Car object to a dictionary for API responses."""
        car_dict = {
            'id': self.id,
            'make': self.make,
            'model': self.model,
            'year': self.year,
            'description': self.description,
            'is_approved': self.is_approved,
            'is_active': self.is_active,
            'is_featured': self.is_featured,
            'is_bank_loan_available': self.is_bank_loan_available,
            'transmission': self.transmission,
            'drivetrain': self.drivetrain,
            'mileage': self.mileage,
            'fuel_type': self.fuel_type,
            'condition': self.condition,
            'body_type': self.body_type,
            'listing_type': self.listing_type,
            'primary_image_url': self.primary_image_url,
            'image_urls': [
                url_for('static', filename=img.image_url.split('/static/')[1], _external=True)
                for img in self.images if img.image_url and '/static/' in img.image_url
            ],
            'equipment': [eq.name for eq in self.equipment]
        }

        if self.listing_type == 'auction' and self.auction:
            car_dict['auction_details'] = self.auction.to_dict()
        elif self.listing_type == 'sale':
            car_dict['fixed_price'] = self.fixed_price
        elif self.listing_type == 'rental' and self.rental_listing:
            car_dict['rental_details'] = {
                'price_per_day': self.rental_listing.price_per_day,
                'is_available': self.rental_listing.is_available
            }

        if include_owner and self.owner:
            car_dict['owner'] = {
                'id': self.owner.id,
                'username': self.owner.username
            }
        return car_dict

    def __repr__(self):
        return f'<Car {self.year} {self.make} {self.model}>'
