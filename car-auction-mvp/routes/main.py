from flask import Blueprint, render_template
from models.auction import Auction

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
@main_bp.route('/home')
def home():
    # Get active auctions to display on the home page
    active_auctions = Auction.query.limit(6).all()
    return render_template('home.html', auctions=active_auctions)
