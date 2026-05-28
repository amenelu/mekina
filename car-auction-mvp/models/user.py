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
    is_verified = db.Column(db.Boolean, default=False)  # For verified dealers
    points = db.Column(
        db.Integer, nullable=False, default=5
    )  # Points for dealers to bid
    fcm_token = db.Column(db.String(255), nullable=True)

    # Relationships
    cars = db.relationship("Car", backref="owner", lazy="dynamic")
    bids = db.relationship("Bid", backref="bidder", lazy="dynamic")
    dealer_bids = db.relationship("DealerBid", backref="dealer", lazy="dynamic")
    car_requests = db.relationship("CarRequest", backref="customer", lazy="dynamic")
    ratings_given = db.relationship(
        "DealerRating",
        foreign_keys="DealerRating.buyer_id",
        back_populates="buyer",
        lazy="dynamic",
    )
    ratings_received = db.relationship(
        "DealerRating",
        foreign_keys="DealerRating.dealer_id",
        back_populates="dealer",
        lazy="dynamic",
    )
    password_reset_tokens = db.relationship(
        "PasswordResetToken",
        back_populates="user",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def get_average_rating(self):
        """Calculates and returns the average rating for a dealer."""
        if not self.is_dealer:
            return None

        from models.dealer_rating import DealerRating

        avg_rating = (
            db.session.query(db.func.avg(DealerRating.rating))
            .filter(DealerRating.dealer_id == self.id)
            .scalar()
        )
        return float(avg_rating) if avg_rating is not None else 0

    def get_closed_deal_count(self):
        """Returns the number of offers this dealer has won."""
        from models.dealer_bid import DealerBid

        return DealerBid.query.filter_by(dealer_id=self.id, status="accepted").count()

    def get_analytics_status(self):
        """
        Calculates if the dealer has unlocked advanced analytics based on credit spending.
        Returns a dict with locked status and progress metrics.
        """
        from models.point_transaction import PointTransaction
        from datetime import datetime, timedelta

        # Define thresholds for unlocking
        WEEKLY_THRESHOLD = 50
        MONTHLY_THRESHOLD = 200

        now = datetime.utcnow()
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)

        def calculate_spend(since_date):
            # Sum all negative amounts (spending) since the date
            total_spend = (
                db.session.query(db.func.sum(PointTransaction.amount))
                .filter(PointTransaction.user_id == self.id)
                .filter(PointTransaction.amount < 0)
                .filter(PointTransaction.created_at >= since_date)
                .scalar()
            )
            return abs(total_spend) if total_spend else 0

        spent_week = calculate_spend(week_ago)
        spent_month = calculate_spend(month_ago)

        # Unlock if either threshold is met
        is_unlocked = spent_week >= WEEKLY_THRESHOLD or spent_month >= MONTHLY_THRESHOLD

        return {
            "is_locked": not is_unlocked,
            "spent_week": spent_week,
            "threshold_week": WEEKLY_THRESHOLD,
            "spent_month": spent_month,
            "threshold_month": MONTHLY_THRESHOLD,
            "message": (
                "Unlock advanced insights by spending credits on bids."
                if not is_unlocked
                else "Analytics Unlocked"
            ),
        }

    def to_dict(self, detail_level="public"):
        """
        Serializes the User object to a dictionary.
        'public': Basic info for display.
        'owner': Full details for the user themselves.
        """
        data = {
            "id": self.id,
            "username": self.username,
            "is_dealer": self.is_dealer,
            "is_verified": self.is_verified,
            "is_rental_company": self.is_rental_company,
            "is_admin": self.is_admin,
        }
        if detail_level == "owner":
            data["email"] = self.email
            data["phone_number"] = self.phone_number
            data["points"] = self.points
        return data

    def __repr__(self):
        return f"<User {self.username}>"
