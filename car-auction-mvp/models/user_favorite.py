from extensions import db
from datetime import datetime


class UserFavorite(db.Model):
    __tablename__ = "user_favorites"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    car_id = db.Column(db.Integer, db.ForeignKey("car.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Define a unique constraint to prevent duplicate favorites
    __table_args__ = (
        db.UniqueConstraint("user_id", "car_id", name="uq_user_car_favorite"),
    )
