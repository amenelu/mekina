from app import db

class Car(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    make = db.Column(db.String(64), nullable=False)
    model = db.Column(db.String(64), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    description = db.Column(db.Text, nullable=True)
    image_url = db.Column(db.String(200), nullable=True)
    owner_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    is_approved = db.Column(db.Boolean, default=False, nullable=False)

    # Relationship
    auction = db.relationship('Auction', backref='car', uselist=False) # One-to-one

    def __repr__(self):
        return f'<Car {self.year} {self.make} {self.model}>'
