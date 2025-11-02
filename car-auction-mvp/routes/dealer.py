from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_required, current_user
from models.car_request import CarRequest
from models.dealer_bid import DealerBid
from models.car import Car
from models.request_question import RequestQuestion
from models.question import Question
from models.auction import Auction
from models.conversation import Conversation
from models.chat_message import ChatMessage
from models.notification import Notification 
from extensions import db
from sqlalchemy import func
from functools import wraps
from datetime import datetime
from flask_wtf import FlaskForm
from wtforms import StringField, IntegerField, TextAreaField, SelectField, DateField, FloatField, SubmitField
from wtforms.validators import DataRequired, NumberRange, Optional, Length, ValidationError
from routes.main import mark_notification_as_read

# Import socketio instance from the new extensions.py file
from extensions import socketio

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
    price = FloatField('Offer Price (ETB)', validators=[DataRequired(), NumberRange(min=1)])
    make = StringField('Car Make', validators=[DataRequired()])
    model = StringField('Car Model', validators=[DataRequired()])
    car_year = IntegerField('Car Year', validators=[DataRequired(), NumberRange(min=1900, max=datetime.now().year + 1)])
    condition = SelectField('Condition', choices=[('New', 'New'), ('Used', 'Used')], validators=[DataRequired()])
    mileage = IntegerField('Mileage (km)', validators=[Optional(), NumberRange(min=0)])
    availability = SelectField('Availability', choices=[('In Stock', 'In Stock'), ('Available on Order', 'Available on Order')], validators=[DataRequired()])
    valid_until = DateField('Offer Valid Until', format='%Y-%m-%d', validators=[DataRequired()])
    extras = TextAreaField('Extras (e.g., free service, floor mats)', validators=[Optional(), Length(max=500)])
    message = TextAreaField('Message to Customer (Optional)', validators=[Optional(), Length(max=1000)])
    submit = SubmitField('Submit Offer')

    def validate_mileage(self, field):
        """Custom validator to make mileage required only for used cars."""
        if self.condition.data == 'Used' and field.data is None:
            raise ValidationError('Mileage is required for used cars.')

class RequestAnswerForm(FlaskForm):
    answer_text = TextAreaField('Your Answer', validators=[DataRequired(), Length(min=5)])
    submit = SubmitField('Post Answer')

@dealer_bp.route('/dashboard')
@login_required
@dealer_required
def dashboard():
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

    active_requests = db.session.query(CarRequest, bid_count_subquery.c.bid_count, lowest_offer_subquery.c.lowest_offer).\
        outerjoin(bid_count_subquery, CarRequest.id == bid_count_subquery.c.request_id).\
        outerjoin(lowest_offer_subquery, CarRequest.id == lowest_offer_subquery.c.request_id).\
        filter(CarRequest.status == 'active').order_by(CarRequest.created_at.desc()).all()

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
        now=datetime.utcnow()
    )

@dealer_bp.route('/messages')
@login_required
@dealer_required
def list_messages():
    """Lists all conversations for the dealer."""
    conversations = Conversation.query.filter_by(dealer_id=current_user.id).order_by(Conversation.created_at.desc()).all()
    return render_template('dealer_messages.html', conversations=conversations)

@dealer_bp.route('/messages/<int:conversation_id>', methods=['GET', 'POST'])
@login_required
@dealer_required
def view_conversation(conversation_id):
    """Displays a single conversation and allows the dealer to reply."""
    conversation = Conversation.query.get_or_404(conversation_id)

    # Security check: ensure dealer is part of this conversation
    if conversation.dealer_id != current_user.id:
        from flask import abort
        abort(403)

    return render_template('dealer_conversation_detail.html', conversation=conversation)

@dealer_bp.route('/request/<int:request_id>/bid', methods=['GET', 'POST'])
@login_required
@dealer_required
def place_bid(request_id):
    car_request = CarRequest.query.get_or_404(request_id)
    # Get existing bids to show the history
    existing_bids = car_request.dealer_bids.order_by(DealerBid.price.asc()).all()

    form = DealerBidForm()

    if form.validate_on_submit():
        # --- Point System Logic ---
        # Check if the dealer has enough points to place a bid.
        if current_user.points <= 0:
            flash('You do not have enough points to place an offer. Please purchase more points.', 'danger')
            return redirect(url_for('dealer.dashboard'))


        new_bid = DealerBid(
            price=form.price.data,
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

    return render_template('place_dealer_bid.html', form=form, car_request=car_request, bids=existing_bids)

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
        bids=bid.car_request.dealer_bids.order_by(DealerBid.price.asc()).all()
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