from flask import Blueprint, render_template, redirect, url_for, flash, request, jsonify
from flask_login import login_required, current_user
from sqlalchemy import or_, func
from models.auction import Auction
from models.car import Car
from models.bid import Bid
from models.question import Question
from app import db
from datetime import datetime

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

class QuestionForm(FlaskForm):
    question_text = TextAreaField('Ask a Question', validators=[DataRequired(), validators.Length(min=10, max=500)])
    submit_question = SubmitField('Submit Question')

@auctions_bp.route('/')
def list_auctions():
    page = request.args.get('page', 1, type=int)

    if current_user.is_authenticated and current_user.is_admin:
        # Admin view: show all auctions, ordered by end time
        # Change: Fetch all approved cars, not just auctions.
        cars = Car.query.filter(Car.is_approved == True).order_by(Car.id.desc()).paginate(page=page, per_page=10)
        return render_template(
            'listing_management.html', 
            cars=cars, 
            now=datetime.utcnow()
        )
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

    bid_form = BidForm(auction=auction)
    question_form = QuestionForm()

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

    if question_form.validate_on_submit() and question_form.submit_question.data:
        if not current_user.is_authenticated:
            return jsonify({'error': 'You must be logged in to ask a question.'}), 401

        new_question = Question(question_text=question_form.question_text.data, user_id=current_user.id, auction_id=auction.id)
        db.session.add(new_question)
        db.session.commit()

        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return jsonify({
                'status': 'success',
                'message': 'Your question has been submitted.',
                'question_html': render_template('_question_item.html', q=new_question, auction=auction)
            })

        flash('Your question has been submitted successfully!')
        return redirect(url_for('auctions.auction_detail', auction_id=auction.id))

    highest_bid = Bid.query.filter_by(auction_id=auction.id).order_by(Bid.amount.desc()).first()

    # Get all bids for the history, newest first
    all_bids = auction.bids.order_by(Bid.timestamp.desc()).all()

    # --- Enhanced Similar Auctions Logic ---
    similar_auctions = []
    similarity_reason = ""
    base_query = Auction.query.join(Car).filter(
        Auction.id != auction_id,
        Car.is_approved == True,
        Auction.end_time > datetime.utcnow()
    )

    # 1. Try same Make and Model
    similar_auctions = base_query.filter(Car.make == auction.car.make, Car.model == auction.car.model).limit(4).all()
    if similar_auctions:
        similarity_reason = f"More {auction.car.make} {auction.car.model} models"

    # 2. If not enough, try same Make
    if not similar_auctions:
        similar_auctions = base_query.filter(Car.make == auction.car.make).limit(4).all()
        if similar_auctions:
            similarity_reason = f"More from {auction.car.make}"

    # 3. If still none, try a broader search (same fuel type or similar year)
    if not similar_auctions:
        similar_auctions = base_query.filter(or_(
            Car.fuel_type == auction.car.fuel_type,
            Car.year.between(auction.car.year - 2, auction.car.year + 2)
        )).limit(4).all()
        if similar_auctions:
            similarity_reason = "Similar Models"

    # 4. As a last resort, show any other active auctions
    if not similar_auctions:
        similar_auctions = base_query.limit(4).all()
        similarity_reason = "Other Active Auctions"

    # Get all questions and answers for this auction
    questions = auction.questions.order_by(Question.timestamp.asc()).all()

    return render_template('auction_detail.html', auction=auction, bid_form=bid_form, question_form=question_form, highest_bid=highest_bid, all_bids=all_bids, similar_auctions=similar_auctions, questions=questions, similarity_reason=similarity_reason)

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
        pass # query = query.filter(Car.body_type == body_type)

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

@auctions_bp.route('/api/all_listings')
def all_listings_api():
    """API endpoint to return all types of listings (auctions, rentals, etc.) as JSON."""
    query = Car.query.options(db.joinedload(Car.auction), db.joinedload(Car.rental_listing)).filter(Car.is_approved == True)

    # This is a simplified filter for the generic listings page.
    # It can be expanded later to include more car-specific attributes.
    if q := request.args.get('q'):
        search_term = f"%{q}%"
        query = query.filter(or_(
            Car.make.ilike(search_term),
            Car.model.ilike(search_term),
            Car.year.like(search_term)
        ))
    
    if condition := request.args.get('condition'):
        query = query.filter(Car.condition == condition)
    if fuel_type := request.args.get('fuel_type'):
        query = query.filter(Car.fuel_type == fuel_type)
    if body_type := request.args.get('body_type'):
        query = query.filter(Car.body_type == body_type)
    if max_price := request.args.get('max_price', type=float):
        # Correctly filter by price across different listing types
        query = query.outerjoin(Auction).filter(
            or_(
                (Car.listing_type == 'sale') & (Car.fixed_price <= max_price),
                (Car.listing_type == 'auction') & (Auction.current_price <= max_price)
            )
        )

    cars = query.order_by(Car.id.desc()).all()

    def format_timedelta(td):
        days = td.days
        hours, remainder = divmod(td.seconds, 3600)
        if days > 0:
            return f"{days} day{'s' if days > 1 else ''} left"
        elif hours > 0:
            return f"{hours} hour{'s' if hours > 1 else ''} left"
        return "Ending soon"

    results = []
    for car in cars:
        listing_data = {
            'id': car.id,
            'year': car.year,
            'make': car.make,
            'model': car.model,
            'image_url': car.primary_image_url or url_for('static', filename='img/default_car.png'),
            'owner_role': (
                'Admin' if car.owner.is_admin else
                'Dealer' if car.owner.is_dealer else
                'Rental' if car.owner.is_rental_company else
                None
            ),
            'listing_type': 'For Sale', # Default
            'price_display': 'Contact Seller',
            'time_left': ''
        }
        if car.auction:
            listing_data['listing_type'] = 'Auction'
            listing_data['detail_url'] = url_for('auctions.auction_detail', auction_id=car.auction.id)
            listing_data['price_display'] = f"{car.auction.current_price:,.2f} ETB"
            if car.auction.end_time > datetime.utcnow():
                listing_data['time_left'] = format_timedelta(car.auction.end_time - datetime.utcnow())
            else:
                listing_data['time_left'] = "Ended"
        elif car.rental_listing:
            listing_data['listing_type'] = 'Rental'
            listing_data['detail_url'] = url_for('rentals.rental_detail', listing_id=car.rental_listing.id) # Assuming this route exists
            listing_data['price_display'] = f"{car.rental_listing.price_per_day:,.2f} ETB/day"
        elif car.listing_type == 'sale':
            listing_data['listing_type'] = 'For Sale'
            listing_data['detail_url'] = url_for('main.car_detail', car_id=car.id) # We will create this route next
            listing_data['price_display'] = f"{car.fixed_price:,.2f} ETB" if car.fixed_price else "Contact Seller"

        results.append(listing_data)

    return jsonify(results)
