from flask import Blueprint, render_template, redirect, url_for, flash, request, jsonify
from flask_login import login_required, current_user
from sqlalchemy import or_, func
from models.auction import Auction
from models.car import Car
from models.bid import Bid
from models.question import Question
from extensions import db
from datetime import datetime
from routes.main import get_similar_cars, mark_notification_as_read

# Simple form for placing a bid
from flask_wtf import FlaskForm
from wtforms import FloatField, SubmitField
from wtforms.validators import DataRequired, NumberRange, ValidationError
from wtforms import TextAreaField, validators
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
    query = request.args.get('q', '')

    if current_user.is_authenticated and current_user.is_admin:
        # Admin view: show all auctions, ordered by end time
        # Change: Fetch all approved cars, not just auctions.
        # Admin sees all cars, regardless of active status
        cars_query = Car.query.order_by(Car.id.desc())

        if query:
            search_term = f"%{query}%"
            cars_query = cars_query.filter(or_(
                Car.make.ilike(search_term),
                Car.model.ilike(search_term),
                Car.year.like(search_term)
            ))

        cars = cars_query.paginate(page=page, per_page=10)
        return render_template(
            'listing_management.html', 
            cars=cars, 
            now=datetime.utcnow()
        )
    else:
        # The initial page load will be handled by AJAX, so we just render the shell.
        return render_template('auction_list.html')


@auctions_bp.route('/<int:auction_id>', methods=['GET', 'POST'])
@mark_notification_as_read
def auction_detail(auction_id):
    auction = Auction.query.join(Car).filter(Auction.id == auction_id).first_or_404()

    # Security check: Only show approved auctions to non-admins
    if not auction.car.is_approved and (not current_user.is_authenticated or not current_user.is_admin):
        from flask import abort
        abort(404)

    bid_form = BidForm(auction=auction)

    # Separate logic for two different forms on the page
    if bid_form.validate_on_submit() and bid_form.submit.data:
        if not current_user.is_authenticated:
            flash('You must be logged in to place a bid.')
            return redirect(url_for('auth.login'))

        new_bid = Bid(amount=bid_form.amount.data, user_id=current_user.id, auction_id=auction.id)
        auction.current_price = bid_form.amount.data
        db.session.add(new_bid)
        db.session.commit()
        flash('Your bid has been placed successfully!')
        return redirect(url_for('auctions.auction_detail', auction_id=auction.id))

    highest_bid = Bid.query.filter_by(auction_id=auction.id).order_by(Bid.amount.desc()).first()

    # Get all bids for the history, newest first
    all_bids = auction.bids.order_by(Bid.timestamp.desc()).all()

    # --- Get Similar Auctions using the helper ---
    similar_cars, similarity_reason = get_similar_cars(auction.car, 'auction')
    # The helper returns Car objects, but the template expects Auction objects.
    # We can get the associated auction from each car.
    similar_auctions = [car.auction for car in similar_cars if car.auction]

    return render_template('auction_detail.html', auction=auction, bid_form=bid_form, highest_bid=highest_bid, all_bids=all_bids, similar_auctions=similar_auctions, similarity_reason=similarity_reason)

@auctions_bp.route('/api/auctions/<int:auction_id>/bid', methods=['POST'])
@login_required
def api_place_bid(auction_id):
    """API endpoint for placing a bid on an auction."""
    auction = Auction.query.get_or_404(auction_id)
    data = request.get_json()

    if not data or 'amount' not in data:
        return jsonify({'status': 'error', 'message': 'Bid amount is required.'}), 400

    try:
        amount = float(data['amount'])
    except (ValueError, TypeError):
        return jsonify({'status': 'error', 'message': 'Invalid bid amount format.'}), 400

    # --- Manual Validation Logic (adapted from BidForm) ---
    highest_bid = auction.bids.order_by(Bid.amount.desc()).first()
    if highest_bid and highest_bid.user_id == current_user.id:
        return jsonify({'status': 'error', 'message': 'You are already the highest bidder.'}), 400

    if auction.bids.first():
        min_bid = auction.current_price + 50000
        if amount < min_bid:
            return jsonify({'status': 'error', 'message': f"Your bid must be at least {min_bid:,.2f} ETB."}), 400
    else:
        if amount < auction.start_price:
            return jsonify({'status': 'error', 'message': f"The first bid must be at least {auction.start_price:,.2f} ETB."}), 400

    # --- Create and Save the Bid ---
    new_bid = Bid(amount=amount, user_id=current_user.id, auction_id=auction.id)
    auction.current_price = amount
    db.session.add(new_bid)
    db.session.commit()

    # Return the new state of the auction data
    return jsonify({'status': 'success', 'message': 'Your bid has been placed successfully!', 'new_current_price': auction.current_price})

@auctions_bp.route('/api/auctions/<int:auction_id>')
@mark_notification_as_read
def api_auction_detail(auction_id):
    """API endpoint for a single auction's details."""
    auction = Auction.query.join(Car).filter(Auction.id == auction_id).first_or_404()

    # Security check
    if not auction.car.is_approved and (not current_user.is_authenticated or not current_user.is_admin):
        return jsonify({'error': 'Auction not found or not approved'}), 404

    highest_bid = auction.bids.order_by(Bid.amount.desc()).first()
    all_bids = auction.bids.order_by(Bid.timestamp.desc()).all()
    questions = auction.questions.order_by(Question.timestamp.asc()).all()

    similar_cars, similarity_reason = get_similar_cars(auction.car, 'auction')
    similar_auctions = [car.auction for car in similar_cars if car.auction]

    # --- Data for API clients (like a mobile app) ---
    # Calculate the minimum next bid required
    min_next_bid = auction.start_price
    if highest_bid:
        min_next_bid = highest_bid.amount + 50000 # Assuming 50,000 increment

    is_owner = current_user.is_authenticated and current_user.id == auction.car.owner_id

    return jsonify(
        auction=auction.car.to_dict(include_owner=True), # The car's to_dict includes auction_details
        highest_bid=highest_bid.to_dict() if highest_bid else None,
        all_bids=[bid.to_dict() for bid in all_bids],
        questions=[q.to_dict() for q in questions],
        similar_auctions=[sa.car.to_dict() for sa in similar_auctions],
        similarity_reason=similarity_reason,
        bidding_rules={
            'min_next_bid': min_next_bid,
            'increment': 50000
        },
        user_context={
            'is_owner': is_owner
        }
    )

@auctions_bp.route('/api/filter')
def filter_auctions_api():
    """API endpoint to return filtered auction data as JSON."""
    query = Auction.query.join(Car).filter(
        Car.is_approved == True,
        Auction.end_time > datetime.utcnow()
    )

    # Apply filters from request arguments
    if q := request.args.get('q'):
        search_term = f"%{q}%"
        query = query.filter(or_(
            Car.make.ilike(search_term),
            Car.model.ilike(search_term),
            Car.year.like(search_term)
        ))

    if condition := request.args.get('condition'):
        query = query.filter(Car.condition == condition)
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
    # The body_type filter is a placeholder for now as the model doesn't have this field.
    # To implement it fully, you would add a `body_type` column to the `Car` model.
    if body_type := request.args.get('body_type'):
        query = query.filter(Car.body_type == body_type)

    if request.args.get('random') == 'true':
        query = query.order_by(func.random())
    else:
        query = query.order_by(Auction.end_time.asc())

    if limit := request.args.get('limit', type=int):
        query = query.limit(limit)

    auctions = query.all()

    def format_timedelta(td):
        """Helper to format time left in a human-readable way."""
        days = td.days
        hours, remainder = divmod(td.seconds, 3600)
        minutes, _ = divmod(remainder, 60)
        if days > 0:
            return f"{days} day{'s' if days > 1 else ''} left"
        elif hours > 0:
            return f"{hours} hour{'s' if hours > 1 else ''} left"
        elif minutes > 0:
            return f"{minutes} minute{'s' if minutes > 1 else ''} left"
        return "Ending soon"

    # Prepare data for JSON response
    results = [
        {
            'id': auction.id,
            'year': auction.car.year,
            'make': auction.car.make,
            'model': auction.car.model,
            'current_price': auction.current_price,
            'image_url': auction.car.primary_image_url or url_for('static', filename='img/default_car.png'),
            'detail_url': url_for('auctions.auction_detail', auction_id=auction.id),
            'time_left': format_timedelta(auction.end_time - datetime.utcnow()),
            'bid_count': auction.bids.count(),
            'owner_role': (
                'Admin' if auction.car.owner.is_admin else
                'Dealer' if auction.car.owner.is_dealer else
                'Rental' if auction.car.owner.is_rental_company else
                None
            )
        }
        for auction in auctions
    ]

    return jsonify(results)

@auctions_bp.route('/api/admin/listings')
@login_required
def api_admin_list_cars():
    """API endpoint for admin to search/filter all car listings."""
    if not current_user.is_admin:
        from flask import abort
        abort(403)

    page = request.args.get('page', 1, type=int)
    query = request.args.get('q', '')

    cars_query = Car.query.order_by(Car.id.desc())

    if query:
        search_term = f"%{query}%"
        cars_query = cars_query.filter(or_(
            Car.make.ilike(search_term),
            Car.model.ilike(search_term),
            Car.year.like(search_term)
        ))

    paginated_cars = cars_query.paginate(page=page, per_page=10)

    cars_data = [{
        'id': car.id,
        'year': car.year,
        'make': car.make,
        'model': car.model,
        'owner_username': car.owner.username,
        'listing_type': car.listing_type,
        'is_approved': car.is_approved,
        'is_active': car.is_active,
        'edit_url': url_for('admin.edit_listing', car_id=car.id),
        'delete_url': url_for('admin.delete_listing', car_id=car.id)
    } for car in paginated_cars.items]

    return jsonify({
        'cars': cars_data,
        'pagination': { 'page': paginated_cars.page, 'pages': paginated_cars.pages, 'has_prev': paginated_cars.has_prev, 'prev_num': paginated_cars.prev_num, 'has_next': paginated_cars.has_next, 'next_num': paginated_cars.next_num }
    })
