from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from . import db

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), index=True, unique=True, nullable=False)
    email = db.Column(db.String(120), index=True, unique=True, nullable=False)
    phone_number = db.Column(db.String(20), nullable=True)
    password_hash = db.Column(db.String(128))
    is_admin = db.Column(db.Boolean, default=False)
    is_dealer = db.Column(db.Boolean, default=False)
    is_rental_company = db.Column(db.Boolean, default=False)
    points = db.Column(db.Integer, nullable=False, default=5) # Points for dealers to bid

    # Relationships
    cars = db.relationship('Car', backref='owner', lazy='dynamic')
    bids = db.relationship('Bid', backref='bidder', lazy='dynamic')
    dealer_bids = db.relationship('DealerBid', backref='dealer', lazy='dynamic')
    car_requests = db.relationship('CarRequest', backref='customer', lazy='dynamic')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f'<User {self.username}>'
