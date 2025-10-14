from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_required, current_user
from models.car_request import CarRequest
from models.dealer_bid import DealerBid
from models.car import Car
from models.question import Question
from models.auction import Auction
from models import db
from functools import wraps
from datetime import datetime
from flask_wtf import FlaskForm
from wtforms import FloatField, SubmitField
from wtforms.validators import DataRequired, NumberRange

dealer_bp = Blueprint('dealer', __name__, url_prefix='/dealer')

# Custom decorator to check for dealer privileges
def dealer_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Admins should also have access to dealer pages
        if not current_user.is_authenticated or not (current_user.is_dealer or current_user.is_admin):
            from flask import abort
            abort(403) # Forbidden
        return f(*args, **kwargs)
    return decorated_function

class DealerBidForm(FlaskForm):
    price = FloatField('Your Offer Price (ETB)', validators=[DataRequired(), NumberRange(min=1)])
    submit = SubmitField('Place Bid')

@dealer_bp.route('/dashboard')
@login_required
@dealer_required
def dashboard():
    # --- Dealer Functionality: Fetch customer requests ---
    active_requests = CarRequest.query.filter_by(status='active').order_by(CarRequest.created_at.desc()).all()

    # --- Seller Functionality: Fetch dealer's own listings and questions ---
    my_cars = Car.query.filter_by(owner_id=current_user.id).order_by(Car.id.desc()).all()
    my_car_ids = [car.id for car in my_cars]
    my_auctions = Auction.query.filter(Auction.car_id.in_(my_car_ids)).all()
    my_auction_ids = [auction.id for auction in my_auctions]
    unanswered_questions = Question.query.filter(
        Question.auction_id.in_(my_auction_ids),
        Question.answer_text == None
    ).order_by(Question.timestamp.desc()).all()

    return render_template(
        'dealer_dashboard.html', 
        requests=active_requests,
        my_cars=my_cars,
        unanswered_questions=unanswered_questions,
        now=datetime.utcnow()
    )

@dealer_bp.route('/request/<int:request_id>/bid', methods=['GET', 'POST'])
@login_required
@dealer_required
def place_bid(request_id):
    car_request = CarRequest.query.get_or_404(request_id)
    # Get existing bids to show the history
    existing_bids = car_request.dealer_bids.order_by(DealerBid.price.asc()).all()

    form = DealerBidForm()

    if form.validate_on_submit():
        new_bid = DealerBid(
            price=form.price.data,
            dealer_id=current_user.id,
            request_id=car_request.id
        )
        db.session.add(new_bid)
        db.session.commit()
        flash(f'Your bid of {form.price.data:,.2f} ETB has been placed successfully!', 'success')
        return redirect(url_for('dealer.dashboard'))

    return render_template('place_dealer_bid.html', form=form, car_request=car_request, bids=existing_bids)