from flask import Blueprint, render_template, redirect, url_for, flash, request, abort, current_app
from flask_login import login_required, current_user, AnonymousUserMixin
from models.car_request import CarRequest 
from werkzeug.utils import secure_filename
from models.dealer_bid import DealerBid
from models.car import Car
from models.dealer_bid_image import DealerBidImage
from models.user import User
from models.request_question import RequestQuestion
from models.question import Question
from models.auction import Auction
from models.conversation import Conversation
import os # Import the os module
from models.chat_message import ChatMessage
from models.notification import Notification 
from models.dealer_review import DealerReview
from models.dealer_request_view import DealerRequestView
from extensions import db, socketio
from sqlalchemy import func, or_
from functools import wraps
from datetime import datetime
from datetime import datetime, timedelta
from flask_wtf import FlaskForm # Import timedelta
from wtforms import StringField, IntegerField, TextAreaField, SelectField, DateField, FloatField, SubmitField
from wtforms.validators import DataRequired, NumberRange, Optional, Length, ValidationError # Import FileField and FileAllowed
from wtforms import FileField
from flask_wtf.file import FileAllowed
from routes.main import mark_notification_as_read

dealer_bp = Blueprint('dealer', __name__, url_prefix='/dealer')

# Custom decorator to check for dealer privileges
def dealer_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Admins should also have access to dealer pages
        if not current_user.is_authenticated or not (current_user.is_dealer or current_user.is_admin):
            abort(403) # Forbidden
        # A non-admin dealer should not be able to access other dealers' pages if they guess the URL
        if not current_user.is_admin and 'dealer_id' in kwargs and kwargs['dealer_id'] != current_user.id:
            abort(403)
        return f(*args, **kwargs)
    return decorated_function

class DealerBidForm(FlaskForm):
    price = FloatField('Cash Offer Price (ETB)', validators=[DataRequired(), NumberRange(min=1)])
    price_with_loan = FloatField('Offer Price with Bank Loan (ETB)', validators=[Optional(), NumberRange(min=1)])
    make = StringField('Car Make', validators=[DataRequired()])
    model = StringField('Car Model', validators=[DataRequired()])
    car_year = IntegerField('Car Year', validators=[DataRequired(), NumberRange(min=1900, max=datetime.now().year + 1)])
    condition = SelectField('Condition', choices=[('New', 'New'), ('Used', 'Used')], validators=[DataRequired()])
    mileage = IntegerField('Mileage (km)', validators=[Optional(), NumberRange(min=0)])
    availability = SelectField('Availability', choices=[('In Stock', 'In Stock'), ('Available on Order', 'Available on Order')], validators=[DataRequired()])
    valid_until = DateField('Offer Valid Until', format='%Y-%m-%d', validators=[DataRequired()])
    extras = TextAreaField('Extras (e.g., free service, floor mats)', validators=[Optional(), Length(max=500)])
    message = TextAreaField('Message to Customer (Optional)', validators=[Optional(), Length(max=1000)])
    photo = FileField('Car Photo (Optional)', validators=[FileAllowed(['jpg', 'png', 'jpeg', 'gif'], 'Images only!')]) # New photo field
    submit = SubmitField('Submit Offer')

    def validate_valid_until(self, field):
        """Custom validator to ensure 'Offer Valid Until' is not a past date."""
        if field.data and field.data < datetime.utcnow().date():
            raise ValidationError('The offer valid until date cannot be in the past.')

    def validate_mileage(self, field):
        """Custom validator to make mileage required only for used cars."""
        if self.condition.data == 'Used' and field.data is None:
            raise ValidationError('Mileage is required for used cars.')

# Define the grace period for free edits (e.g., 30 minutes)
EDIT_GRACE_PERIOD_MINUTES = 30
BID_PHOTO_UPLOAD_FOLDER = 'static/uploads/dealer_bids' # Define upload folder

class RequestAnswerForm(FlaskForm):
    answer_text = TextAreaField('Your Answer', validators=[DataRequired(), Length(min=5)])
    submit = SubmitField('Post Answer')

@dealer_bp.route('/dashboard')
@login_required
@dealer_required
def dashboard():
    # Get filter from request args
    filter_new = request.args.get('filter_new', 'false').lower() == 'true'

    # --- Dealer Functionality: Fetch customer requests ---
    # OPTIMIZATION: Use a single query with subqueries to avoid the N+1 problem.
    # This calculates bid counts and lowest offers in the database, not in a Python loop.
    bid_count_subquery = db.session.query(
        DealerBid.request_id,
        func.count(DealerBid.id).label('bid_count')
    ).group_by(DealerBid.request_id).subquery()

    lowest_offer_subquery = db.session.query(
        DealerBid.request_id,
        func.min(DealerBid.price).label('lowest_offer')
    ).group_by(DealerBid.request_id).subquery()

    # Subquery to get all request IDs that the current dealer has already viewed.
    viewed_requests_subquery = db.session.query(
        DealerRequestView.request_id
    ).filter(DealerRequestView.dealer_id == current_user.id).subquery()

    query = db.session.query(
        CarRequest, 
        bid_count_subquery.c.bid_count, 
        lowest_offer_subquery.c.lowest_offer,
        # This will be True if the request has been viewed, otherwise False.
        (CarRequest.id.in_(db.select(viewed_requests_subquery))).label('has_been_viewed')
    ).\
        outerjoin(bid_count_subquery, CarRequest.id == bid_count_subquery.c.request_id).\
        outerjoin(lowest_offer_subquery, CarRequest.id == lowest_offer_subquery.c.request_id).\
        filter(CarRequest.status == 'active')

    # Apply the filter if requested
    if filter_new:
        query = query.filter(CarRequest.id.notin_(db.select(viewed_requests_subquery)))

    active_requests = query.order_by(CarRequest.created_at.desc()).all()
    # --- Seller Functionality: Fetch dealer's own listings and questions ---
    my_cars = Car.query.filter_by(owner_id=current_user.id).order_by(Car.id.desc()).all()
    my_car_ids = [car.id for car in my_cars]
    my_auctions = Auction.query.filter(Auction.car_id.in_(my_car_ids)).all()
    my_auction_ids = [auction.id for auction in my_auctions]
    unanswered_questions = Question.query.filter(
        Question.auction_id.in_(my_auction_ids),
        Question.answer_text == None
    ).order_by(Question.timestamp.desc()).all()

    # --- New: Fetch unanswered questions on dealer's offers ---
    unanswered_request_questions = RequestQuestion.query.join(DealerBid).filter(
        DealerBid.dealer_id == current_user.id,
        RequestQuestion.answer_text == None
    ).order_by(RequestQuestion.timestamp.desc()).all()


    return render_template(
        'dealer_dashboard.html', 
        requests=active_requests,
        my_cars=my_cars,
        unanswered_questions=unanswered_questions,
        unanswered_request_questions=unanswered_request_questions,
        now=datetime.utcnow(),
        filter_new=filter_new
    )

@dealer_bp.route('/api/dashboard')
@login_required
@dealer_required
def api_dealer_dashboard():
    """API endpoint for dealer dashboard data."""
    filter_new = request.args.get('filter_new', 'false').lower() == 'true'

    bid_count_subquery = db.session.query(
        DealerBid.request_id,
        func.count(DealerBid.id).label('bid_count')
    ).group_by(DealerBid.request_id).subquery()

    lowest_offer_subquery = db.session.query(
        DealerBid.request_id,
        func.min(DealerBid.price).label('lowest_offer')
    ).group_by(DealerBid.request_id).subquery()

    viewed_requests_subquery = db.session.query(
        DealerRequestView.request_id
    ).filter(DealerRequestView.dealer_id == current_user.id).subquery()

    query = db.session.query(
        CarRequest, 
        bid_count_subquery.c.bid_count, 
        lowest_offer_subquery.c.lowest_offer,
        (CarRequest.id.in_(db.select(viewed_requests_subquery))).label('has_been_viewed')
    ).\
        outerjoin(bid_count_subquery, CarRequest.id == bid_count_subquery.c.request_id).\
        outerjoin(lowest_offer_subquery, CarRequest.id == lowest_offer_subquery.c.request_id).\
        filter(CarRequest.status == 'active')

    if filter_new:
        query = query.filter(CarRequest.id.notin_(db.select(viewed_requests_subquery)))

    active_requests_data = []
    for req, bid_count, lowest_offer, has_been_viewed in query.order_by(CarRequest.created_at.desc()).all():
        req_dict = req.to_dict()
        req_dict['bid_count'] = bid_count or 0
        req_dict['lowest_offer'] = lowest_offer
        req_dict['has_been_viewed'] = has_been_viewed
        active_requests_data.append(req_dict)

    my_cars = Car.query.filter_by(owner_id=current_user.id).order_by(Car.id.desc()).all()
    my_car_ids = [car.id for car in my_cars]
    my_auctions = Auction.query.filter(Auction.car_id.in_(my_car_ids)).all()
    my_auction_ids = [auction.id for auction in my_auctions]
    unanswered_questions = Question.query.filter(
        Question.auction_id.in_(my_auction_ids), Question.answer_text == None
    ).order_by(Question.timestamp.desc()).all()
    unanswered_request_questions = RequestQuestion.query.join(DealerBid).filter(
        DealerBid.dealer_id == current_user.id, RequestQuestion.answer_text == None
    ).order_by(RequestQuestion.timestamp.desc()).all()

    return jsonify(
        active_requests=active_requests_data,
        my_cars=[car.to_dict() for car in my_cars],
        unanswered_questions=[q.to_dict() for q in unanswered_questions],
        unanswered_request_questions=[q.to_dict() for q in unanswered_request_questions],
        now=datetime.utcnow().isoformat() + 'Z'
    )

@dealer_bp.route('/messages')
@login_required
@dealer_required
def list_messages():
    """Lists all conversations for the dealer."""
    # Use joinedload to efficiently fetch the related lead_score, buyer, and car objects
    conversations = Conversation.query.options(
        db.joinedload(Conversation.lead_score),
        db.joinedload(Conversation.buyer),
        db.joinedload(Conversation.car)
    ).filter_by(dealer_id=current_user.id).order_by(Conversation.created_at.desc()).all()
    return render_template('dealer_messages.html', conversations=conversations)

@dealer_bp.route('/api/dealers/<int:dealer_id>/profile')
def api_dealer_profile(dealer_id):
    """API endpoint for a dealer's public profile, listings, and ratings."""
    dealer = User.query.filter_by(id=dealer_id, is_dealer=True).first_or_404()

    active_listings = Car.query.filter_by(owner_id=dealer.id, is_approved=True, is_active=True).order_by(Car.id.desc()).all()

    ratings = dealer.reviews_received.all()
    avg_rating = 0
    if ratings:
        avg_rating = sum(r.rating for r in ratings) / len(ratings)

    # Determine if the current user can view the phone number (for API, this might be handled client-side)
    can_view_phone = current_user.is_authenticated and (current_user.id == dealer.id or current_user.is_admin)

    return jsonify(
        dealer=dealer.to_dict(detail_level='owner' if can_view_phone else 'public'),
        listings=[car.to_dict() for car in active_listings],
        ratings=[r.to_dict() for r in ratings],
        avg_rating=round(avg_rating, 2),
        review_count=len(ratings)
    )



@dealer_bp.route('/profile/<int:dealer_id>')
def profile(dealer_id):
    """Displays a dealer's public profile, listings, and ratings."""
    dealer = User.query.filter_by(id=dealer_id, is_dealer=True).first_or_404()

    # Get the dealer's active listings
    active_listings = Car.query.filter_by(owner_id=dealer.id, is_approved=True, is_active=True).order_by(Car.id.desc()).all()

    # Calculate average rating
    ratings = dealer.reviews_received.all()
    avg_rating = 0
    if ratings:
        avg_rating = sum(r.rating for r in ratings) / len(ratings)

    is_profile_owner = current_user.is_authenticated and current_user.id == dealer.id
    can_view_phone = is_profile_owner or (current_user.is_authenticated and current_user.is_admin)

    return render_template('dealer_profile.html', 
                           dealer=dealer, 
                           listings=active_listings, 
                           ratings=ratings,
                           avg_rating=avg_rating,
                           can_view_phone=can_view_phone)

@dealer_bp.route('/toggle_verification/<int:dealer_id>', methods=['POST'])
@login_required
def toggle_verification(dealer_id):
    """Allows an admin to verify or un-verify a dealer."""
    # This is a critical admin function, so we must check for admin status explicitly.
    if not current_user.is_admin:
        abort(403)

    dealer = User.query.get_or_404(dealer_id)
    if not dealer.is_dealer:
        flash("This user is not a dealer.", "warning")
        return redirect(url_for('admin.dealer_management'))

    dealer.is_verified = not dealer.is_verified
    db.session.commit()

    status = "verified" if dealer.is_verified else "un-verified"
    flash(f"Dealer '{dealer.username}' has been {status}.", "success")
    return redirect(url_for('dealer.profile', dealer_id=dealer.id))

@dealer_bp.route('/messages/<int:conversation_id>', methods=['GET', 'POST'])
@login_required
@dealer_required
def view_conversation(conversation_id):
    """Displays a single conversation and allows the dealer to reply."""
    conversation = Conversation.query.get_or_404(conversation_id)

    # Security check: ensure dealer is part of this conversation
    if conversation.dealer_id != current_user.id:
        abort(403)

    # The logic to mark messages as read is now handled by the API endpoint.

    return render_template('dealer_conversation_detail.html', conversation=conversation, ChatMessage=ChatMessage)

@dealer_bp.route('/api/messages/<int:conversation_id>/unlock', methods=['POST'])
@login_required
@dealer_required
def api_unlock_conversation(conversation_id):
    """API endpoint for a dealer to spend a point to unlock a conversation."""
    conversation = Conversation.query.get_or_404(conversation_id)

    if conversation.dealer_id != current_user.id:
        return jsonify({'status': 'error', 'message': 'Permission denied.'}), 403

    if current_user.points <= 0:
        return jsonify({'status': 'error', 'message': 'You do not have enough credits to unlock this conversation.'}), 400

    if not conversation.is_unlocked:
        current_user.points -= 1
        conversation.is_unlocked = True
        # Masked messages need to be unmasked for the dealer
        for msg in conversation.messages.filter(ChatMessage.sender_id == conversation.buyer_id):
            msg.body = msg.original_body # Restore original message
        db.session.commit()
        return jsonify({'status': 'success', 'message': 'Conversation unlocked!', 'conversation': conversation.to_dict(current_user.id)}), 200
    return jsonify({'status': 'info', 'message': 'This conversation is already unlocked.'}), 200

@dealer_bp.route('/messages/<int:conversation_id>/unlock', methods=['POST'])
@login_required
@dealer_required
def unlock_conversation(conversation_id):
    """Allows a dealer to spend a point to unlock a conversation."""
    conversation = Conversation.query.get_or_404(conversation_id)

    # Security check
    if conversation.dealer_id != current_user.id:
        abort(403)

    # Point system check
    if current_user.points <= 0:
        flash("You do not have enough credits to unlock this conversation.", "danger")
        return redirect(url_for('dealer.view_conversation', conversation_id=conversation.id))

    if not conversation.is_unlocked:
        # Deduct point and unlock
        current_user.points -= 1
        conversation.is_unlocked = True
        db.session.commit()
        flash("Conversation unlocked! You can now see the buyer's full messages.", "success")
    else:
        flash("This conversation is already unlocked.", "info")

    return redirect(url_for('dealer.view_conversation', conversation_id=conversation.id))


@dealer_bp.route('/request/<int:request_id>/bid', methods=['GET', 'POST'])
@login_required
@dealer_required
def place_bid(request_id):
    car_request = CarRequest.query.get_or_404(request_id)

    # --- Mark the request as viewed by the dealer ---
    # This is idempotent due to the unique constraint on the model.
    view_exists = DealerRequestView.query.filter_by(
        dealer_id=current_user.id,
        request_id=car_request.id
    ).first()
    if not view_exists:
        new_view = DealerRequestView(dealer_id=current_user.id, request_id=car_request.id)
        db.session.add(new_view)
        db.session.commit()
    # Get existing bids to show the history
    existing_bids = car_request.dealer_bids.order_by(DealerBid.price.asc()).all()

    form = DealerBidForm()

    if form.validate_on_submit():
        # --- Point System Logic ---
        # Handle photo upload
        photo_filename = None
        if form.photo.data:
            filename = secure_filename(form.photo.data.filename)
            # Construct the absolute path to the upload directory
            upload_dir_abs = os.path.join(current_app.root_path, BID_PHOTO_UPLOAD_FOLDER)
            os.makedirs(upload_dir_abs, exist_ok=True) # Ensure the directory exists

            # Construct the full absolute path to save the file
            file_path_abs = os.path.join(upload_dir_abs, filename)
            form.photo.data.save(file_path_abs)
            photo_filename = os.path.join('/', BID_PHOTO_UPLOAD_FOLDER, filename).replace(os.sep, '/') # Store relative path for web access, ensure forward slashes
        # Check if the dealer has enough points to place a bid.
        if current_user.points <= 0:
            flash('You do not have enough points to place an offer. Please purchase more points.', 'danger')
            return redirect(url_for('dealer.dashboard'))


        new_bid = DealerBid(
            price=form.price.data,
            price_with_loan=form.price_with_loan.data,
            make=form.make.data,
            model=form.model.data,
            car_year=form.car_year.data,
            mileage=form.mileage.data or 0, # Default to 0 if condition is 'New' and mileage is empty
            condition=form.condition.data,
            availability=form.availability.data,
            valid_until=form.valid_until.data,
            extras=form.extras.data,
            message=form.message.data, 
            dealer_id=current_user.id,
            request_id=car_request.id
        )
        db.session.add(new_bid)

        # If a photo was uploaded, create a DealerBidImage and associate it
        if photo_filename:
            new_image = DealerBidImage(image_url=photo_filename)
            new_bid.images.append(new_image)

        # Deduct one point from the dealer's account
        current_user.points -= 1


        # --- Notify the customer who made the request ---
        request_description = f"'{car_request.make} {car_request.model}'" if car_request.make else f"request #{car_request.id}"
        notification_message = f"A dealer has placed an offer on your {request_description}."
        notification = Notification(user_id=car_request.user_id, message=notification_message)
        db.session.add(notification)
        db.session.flush() # Flush to get the notification ID

        # Now update the link with the notification ID
        notification.link = url_for('request.request_detail', request_id=car_request.id, notification_id=notification.id)
        db.session.commit()

        # --- Real-time Notification (send *after* commit) ---
        # Get the new unread count for the customer
        unread_count = Notification.query.filter_by(user_id=car_request.user_id, is_read=False).count()

        # Create a dictionary with the notification data to send to the client
        notification_data = {
            'message': notification.message,
            'link': notification.link,
            'timestamp': notification.timestamp.isoformat() + 'Z', # Use ISO format for JavaScript
            'count': unread_count
        }
        socketio.emit('new_notification', notification_data, room=str(car_request.user_id))

        flash(f'Your offer of {form.price.data:,.2f} ETB has been sent to the customer!', 'success')
        return redirect(url_for('dealer.dashboard'))

    return render_template('place_dealer_bid.html', form=form, car_request=car_request, bids=existing_bids, now=datetime.utcnow())

@dealer_bp.route('/api/requests/<int:request_id>/bids', methods=['GET', 'POST'])
@login_required
@dealer_required
def api_place_dealer_bid(request_id):
    """API endpoint for getting existing bids or placing a new bid on a car request."""
    car_request = CarRequest.query.get_or_404(request_id)

    # Mark the request as viewed by the dealer
    view_exists = DealerRequestView.query.filter_by(dealer_id=current_user.id, request_id=car_request.id).first()
    if not view_exists:
        new_view = DealerRequestView(dealer_id=current_user.id, request_id=car_request.id)
        db.session.add(new_view)
        db.session.commit()

    if request.method == 'GET':
        existing_bids = car_request.dealer_bids.order_by(DealerBid.price.asc()).all()
        return jsonify(car_request=car_request.to_dict(), existing_bids=[bid.to_dict() for bid in existing_bids])

    elif request.method == 'POST':
        data = request.get_json()
        if not data:
            return jsonify({'status': 'error', 'message': 'Invalid JSON payload.'}), 400

        # Basic validation
        required_fields = ['price', 'make', 'model', 'car_year', 'condition', 'availability', 'valid_until']
        if not all(field in data for field in required_fields):
            return jsonify({'status': 'error', 'message': 'Missing required bid details.'}), 400

        try:
            price = float(data['price'])
            car_year = int(data['car_year'])
            mileage = int(data.get('mileage', 0))
            valid_until = datetime.fromisoformat(data['valid_until'])
        except (ValueError, TypeError):
            return jsonify({'status': 'error', 'message': 'Invalid data format for price, year, mileage, or valid_until.'}), 400

        # Check if the dealer has enough points
        if current_user.points <= 0:
            return jsonify({'status': 'error', 'message': 'You do not have enough points to place an offer.'}), 400

        if price <= 0:
            return jsonify({'status': 'error', 'message': 'Bid price must be positive.'}), 400

        photo_filename = None
        if data.get('image_base64'):
            photo_filename = save_base64_image(data['image_base64'], filename_prefix=f"dealer_bid_{car_request.id}")
        elif data.get('image_url'):
            photo_filename = data['image_url']

        new_bid = DealerBid(
            price=price, price_with_loan=data.get('price_with_loan'),
            make=data.get('make'), model=data.get('model'), car_year=car_year,
            mileage=mileage, condition=data.get('condition'),
            availability=data.get('availability'), valid_until=valid_until,
            extras=data.get('extras'), message=data.get('message'), dealer_id=current_user.id, request_id=car_request.id
        )
        db.session.add(new_bid)

        # If a photo was uploaded, create a DealerBidImage and associate it
        if photo_filename:
            new_image = DealerBidImage(image_url=photo_filename)
            new_bid.images.append(new_image)

        current_user.points -= 1 # Deduct point
        db.session.commit()

        # Notify the customer
        request_description = f"'{car_request.make} {car_request.model}'" if car_request.make else f"request #{car_request.id}"
        notification_message = f"A dealer has placed an offer on your {request_description}."
        notification = Notification(user_id=car_request.user_id, message=notification_message)
        db.session.add(notification)
        db.session.flush()
        notification.link = url_for('request.request_detail', request_id=car_request.id, notification_id=notification.id)
        db.session.commit()

        # Real-time Notification
        unread_count = Notification.query.filter_by(user_id=car_request.user_id, is_read=False).count()
        notification_data = { 'message': notification.message, 'link': notification.link, 'timestamp': notification.timestamp.isoformat() + 'Z', 'count': unread_count }
        socketio.emit('new_notification', notification_data, room=str(car_request.user_id))

        return jsonify({'status': 'success', 'message': 'Your offer has been sent to the customer!', 'bid': new_bid.to_dict()}), 201

@dealer_bp.route('/bid/<int:bid_id>/edit', methods=['GET', 'POST'])
@login_required
@dealer_required
def edit_bid(bid_id):
    """Allows a dealer to edit their own existing bid."""
    bid = DealerBid.query.get_or_404(bid_id)

    # --- Security Checks ---
    if bid.dealer_id != current_user.id:
        abort(403) # Can't edit another dealer's bid
    if bid.car_request.status != 'active':
        flash("This request is closed and offers can no longer be edited.", "warning")
        return redirect(url_for('dealer.dashboard'))

    # Pre-populate the form with the existing bid's data
    form = DealerBidForm(obj=bid)
    form.submit.label.text = 'Update Offer' # Change button text

    if form.validate_on_submit():
        # Handle photo upload on edit
        photo_filename = bid.image_url # Keep existing photo if no new one is uploaded
        if form.photo.data:
            filename = secure_filename(form.photo.data.filename)            
            upload_dir_abs = os.path.join(current_app.root_path, BID_PHOTO_UPLOAD_FOLDER)
            os.makedirs(upload_dir_abs, exist_ok=True)

            file_path_abs = os.path.join(upload_dir_abs, filename)
            form.photo.data.save(file_path_abs)

            photo_filename = os.path.join('/', BID_PHOTO_UPLOAD_FOLDER, filename).replace(os.sep, '/')

        # Update the bid object with the new form data
        form.populate_obj(bid)
        db.session.commit()
        flash('Your offer has been updated successfully!', 'success')
        # Redirect back to the request detail page for the customer
        return redirect(url_for('dealer.place_bid', request_id=bid.request_id))

    return render_template(
        'place_dealer_bid.html',
        form=form,
        car_request=bid.car_request,
        bids=bid.car_request.dealer_bids.order_by(DealerBid.price.asc()).all(),
        now=datetime.utcnow() # Pass now for the edit button logic
    )

@dealer_bp.route('/request_question/<int:question_id>/answer', methods=['GET', 'POST'])
@login_required
@dealer_required
@mark_notification_as_read
def answer_request_question(question_id):
    question = RequestQuestion.query.get_or_404(question_id)
    bid = question.dealer_bid

    # Security check: ensure the current user is the dealer who received the question
    if bid.dealer_id != current_user.id:
        flash("You do not have permission to answer this question.", "danger")
        return redirect(url_for('dealer.dashboard'))

    # --- Fetch all of the dealer's bids for this request to show context ---
    my_bids_for_this_request = DealerBid.query.filter_by(
        dealer_id=current_user.id,
        request_id=bid.request_id
    ).order_by(DealerBid.price.asc()).all()

    form = RequestAnswerForm()
    if form.validate_on_submit():
        question.answer_text = form.answer_text.data
        question.answer_timestamp = datetime.utcnow()

        # Notify the buyer that their question was answered
        notification_message = f"The dealer has answered your question regarding their offer for request #{bid.car_request.id}."
        notification = Notification(user_id=question.user_id, message=notification_message)
        db.session.add(notification)
        db.session.flush() # Get ID

        notification.link = url_for('request.request_detail', request_id=bid.car_request.id, _anchor=f'qna-for-bid-{bid.id}', notification_id=notification.id)
        db.session.commit()

        # --- Real-time Notification ---
        unread_count = Notification.query.filter_by(user_id=question.user_id, is_read=False).count()
        notification_data = {
            'message': notification.message,
            'link': notification.link,
            'timestamp': notification.timestamp.isoformat() + 'Z',
            'count': unread_count
        }
        socketio.emit('new_notification', notification_data, room=str(question.user_id))

        flash("Your answer has been posted.", "success")
        # Redirect back to the dealer dashboard, which is a more logical flow.
        return redirect(url_for('dealer.dashboard'))

    return render_template('answer_request_question.html', form=form, question=question, my_bids=my_bids_for_this_request)