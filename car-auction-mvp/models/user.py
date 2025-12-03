from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from extensions import db

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), index=True, unique=True, nullable=False)
    email = db.Column(db.String(120), index=True, unique=True, nullable=False)
    phone_number = db.Column(db.String(20), nullable=True)
    password_hash = db.Column(db.String(128))
    is_admin = db.Column(db.Boolean, default=False)
    is_dealer = db.Column(db.Boolean, default=False)
    is_rental_company = db.Column(db.Boolean, default=False)
    is_verified = db.Column(db.Boolean, default=False) # For verified dealers
    points = db.Column(db.Integer, nullable=False, default=5) # Points for dealers to bid

    # Relationships
    cars = db.relationship('Car', backref='owner', lazy='dynamic')
    bids = db.relationship('Bid', backref='bidder', lazy='dynamic')
    dealer_bids = db.relationship('DealerBid', backref='dealer', lazy='dynamic')
    car_requests = db.relationship('CarRequest', backref='customer', lazy='dynamic')
    ratings_given = db.relationship('DealerRating', foreign_keys='DealerRating.buyer_id', back_populates='buyer', lazy='dynamic')
    ratings_received = db.relationship('DealerRating', foreign_keys='DealerRating.dealer_id', back_populates='dealer', lazy='dynamic')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self, detail_level='public'):
        """
        Serializes the User object to a dictionary.
        'public': Basic info for display.
        'owner': Full details for the user themselves.
        """
        data = {
            'id': self.id,
            'username': self.username,
            'is_dealer': self.is_dealer,
            'is_verified': self.is_verified,
            'is_rental_company': self.is_rental_company,
            'is_admin': self.is_admin,
        }
        if detail_level == 'owner':
            data['email'] = self.email
            data['phone_number'] = self.phone_number
            data['points'] = self.points
        return data

    def __repr__(self):
        return f'<User {self.username}>'
