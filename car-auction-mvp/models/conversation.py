from extensions import db
from datetime import datetime
from .chat_message import ChatMessage


class Conversation(db.Model):
    __tablename__ = "conversations"
    id = db.Column(db.Integer, primary_key=True)
    is_unlocked = db.Column(
        db.Boolean, nullable=False, default=False
    )  # Tracks if dealer paid to unlock
    message_count = db.Column(
        db.Integer, nullable=False, default=0
    )  # Tracks number of free messages
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    # Foreign Keys
    car_id = db.Column(db.Integer, db.ForeignKey("car.id"), nullable=False)
    buyer_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    dealer_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)

    # Relationships
    car = db.relationship("Car", backref="conversations")
    buyer = db.relationship("User", foreign_keys=[buyer_id])
    dealer = db.relationship("User", foreign_keys=[dealer_id])

    def to_dict(self, current_user_id):
        """Serializes the Conversation object to a dictionary."""
        # Determine the 'other party' in the conversation
        if current_user_id == self.buyer_id:
            other_party = self.dealer
        else:
            other_party = self.buyer

        last_message = self.messages.order_by(db.desc(ChatMessage.timestamp)).first()

        # --- Defensive serialization ---
        # If the other party or car was deleted, provide a placeholder to prevent client-side crashes.
        other_party_data = (
            other_party.to_dict()
            if other_party
            else {"username": "[Deleted User]", "is_dealer": False}
        )
        car_data = (
            self.car.to_dict()
            if self.car
            else {"make": "[Deleted", "model": "Listing]", "year": ""}
        )

        # Helper for specific roles (backward compatibility)
        buyer_data = (
            self.buyer.to_dict()
            if self.buyer
            else {"username": "[Deleted User]", "is_dealer": False}
        )
        dealer_data = (
            self.dealer.to_dict()
            if self.dealer
            else {"username": "[Deleted User]", "is_dealer": True}
        )

        return {
            "id": self.id,
            "car": car_data,
            "other_party": other_party_data,
            "buyer": buyer_data,
            "dealer": dealer_data,
            "last_message_body": (
                last_message.body if last_message else "No messages yet."
            ),
            "last_message_timestamp": (
                last_message.timestamp.isoformat() + "Z"
                if last_message
                else self.created_at.isoformat() + "Z"
            ),
            "unread_count": self.messages.filter_by(is_read=False)
            .filter(ChatMessage.sender_id != current_user_id)
            .count(),
        }

    def __repr__(self):
        return f"<Conversation {self.id} between Buyer {self.buyer_id} and Dealer {self.dealer_id}>"
