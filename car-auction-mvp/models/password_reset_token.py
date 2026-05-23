from datetime import datetime, timedelta
import hashlib
import secrets

from extensions import db


class PasswordResetToken(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    token_hash = db.Column(db.String(64), unique=True, nullable=False, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    used_at = db.Column(db.DateTime, nullable=True)

    user = db.relationship("User", back_populates="password_reset_tokens")

    @staticmethod
    def hash_token(token: str) -> str:
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    @classmethod
    def create_for_user(cls, user, expires_in_minutes=30):
        raw_token = secrets.token_urlsafe(32)
        token = cls(
            user=user,
            token_hash=cls.hash_token(raw_token),
            expires_at=datetime.utcnow() + timedelta(minutes=expires_in_minutes),
        )
        return raw_token, token

    @property
    def is_expired(self) -> bool:
        return datetime.utcnow() >= self.expires_at

    @property
    def is_used(self) -> bool:
        return self.used_at is not None
