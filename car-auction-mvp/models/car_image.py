from . import db

class CarImage(db.Model):
    """Model for storing multiple images for a car."""
    __tablename__ = 'car_images'

    id = db.Column(db.Integer, primary_key=True)
    image_url = db.Column(db.String(255), nullable=False)
    car_id = db.Column(db.Integer, db.ForeignKey('car.id'), nullable=False)

    def __repr__(self):
        return f'<CarImage {self.image_url}>'