from extensions import db

# Import all models here to ensure they are registered with SQLAlchemy's metadata
# before Alembic tries to create a migration.
from .user import User
from .car import Car
from .car_image import CarImage
from .auction import Auction
from .bid import Bid
from .question import Question
from .car_request import CarRequest
from .dealer_bid import DealerBid
from .dealer_bid_image import DealerBidImage
from .rental_listing import RentalListing
from .equipment import Equipment
from .request_question import RequestQuestion
from .conversation import Conversation
from .chat_message import ChatMessage
from .lead_score import LeadScore