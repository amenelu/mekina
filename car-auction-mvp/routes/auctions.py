from flask import Blueprint, render_template, redirect, url_for, flash, request, jsonify
from flask_login import login_required, current_user
from models.auction import Auction
from models.car import Car
from models.bid import Bid
from app import db
from datetime import datetime

# Simple form for placing a bid
from flask_wtf import FlaskForm
from wtforms import FloatField, SubmitField
from wtforms.validators import DataRequired, NumberRange, ValidationError

auctions_bp = Blueprint('auctions', __name__)

def bid_increment_validator(form, field):
    """Custom validator to enforce bid increments."""
    auction = form.auction

    # Check if user is the current highest bidder
    highest_bid = auction.bids.order_by(Bid.amount.desc()).first()
    if highest_bid and highest_bid.user_id == current_user.id:
        raise ValidationError("You are already the highest bidder.")

    if auction.bids.first():
        # There are existing bids, enforce increment
        min_bid = auction.current_price + 50000
        if field.data < min_bid:
            raise ValidationError(f"Your bid must be at least {min_bid:,.2f} ETB (50,000 ETB increment).")
    else:
        # No bids yet, bid must be at least the start price
        if field.data < auction.start_price:
            raise ValidationError(f"The first bid must be at least the starting price of {auction.start_price:,.2f} ETB.")

class BidForm(FlaskForm):
    amount = FloatField('Bid Amount (ETB)', validators=[DataRequired(), bid_increment_validator])
    submit = SubmitField('Place Bid')

    def __init__(self, *args, auction=None, **kwargs):
        super(BidForm, self).__init__(*args, **kwargs)
        self.auction = auction # Pass auction object to the form for the validator

@auctions_bp.route('/')
def list_auctions():
    page = request.args.get('page', 1, type=int)

    if current_user.is_authenticated and current_user.is_admin:
        # Admin view: show all auctions, ordered by end time
        auctions = Auction.query.join(Car).order_by(Auction.end_time.desc()).paginate(page=page, per_page=10)
        return render_template('auction_management.html', auctions=auctions, now=datetime.utcnow())
    else:
        # The initial page load will be handled by AJAX, so we just render the shell.
        return render_template('auction_list.html')


@auctions_bp.route('/<int:auction_id>', methods=['GET', 'POST'])
def auction_detail(auction_id):
    auction = Auction.query.join(Car).filter(Auction.id == auction_id).first_or_404()

    # Security check: Only show approved auctions to non-admins
    if not auction.car.is_approved and (not current_user.is_authenticated or not current_user.is_admin):
        from flask import abort
        abort(404)

    form = BidForm(auction=auction)

    if form.validate_on_submit():
        if not current_user.is_authenticated:
            flash('You must be logged in to place a bid.')
            return redirect(url_for('auth.login'))

        new_bid = Bid(amount=form.amount.data, user_id=current_user.id, auction_id=auction.id)
        auction.current_price = form.amount.data
        db.session.add(new_bid)
        db.session.commit()
        flash('Your bid has been placed successfully!')
        return redirect(url_for('auctions.auction_detail', auction_id=auction.id))

    highest_bid = Bid.query.filter_by(auction_id=auction.id).order_by(Bid.amount.desc()).first()

    # Get all bids for the history, newest first
    all_bids = auction.bids.order_by(Bid.timestamp.desc()).all()

    return render_template('auction_detail.html', auction=auction, form=form, highest_bid=highest_bid, all_bids=all_bids)

@auctions_bp.route('/api/filter')
def filter_auctions_api():
    """API endpoint to return filtered auction data as JSON."""
    query = Auction.query.join(Car).filter(
        Car.is_approved == True,
        Auction.end_time > datetime.utcnow()
    )

    # Apply filters from request arguments
    if make := request.args.get('make'):
        query = query.filter(Car.make.ilike(f"%{make}%"))
    if model := request.args.get('model'):
        query = query.filter(Car.model.ilike(f"%{model}%"))
    if max_price := request.args.get('max_price', type=float):
        query = query.filter(Auction.current_price <= max_price)
    if transmission := request.args.get('transmission'):
        query = query.filter(Car.transmission == transmission)
    if drivetrain := request.args.get('drivetrain'):
        query = query.filter(Car.drivetrain == drivetrain)
    if max_mileage := request.args.get('max_mileage', type=int):
        query = query.filter(Car.mileage <= max_mileage)
    if fuel_type := request.args.get('fuel_type'):
        query = query.filter(Car.fuel_type == fuel_type)

    auctions = query.order_by(Auction.end_time.asc()).all()

    # Prepare data for JSON response
    results = [
        {
            'id': auction.id,
            'year': auction.car.year,
            'make': auction.car.make,
            'model': auction.car.model,
            'current_price': auction.current_price,
            'image_url': auction.car.image_url or url_for('static', filename='img/default_car.png'),
            'detail_url': url_for('auctions.auction_detail', auction_id=auction.id)
        }
        for auction in auctions
    ]

    return jsonify(results)
