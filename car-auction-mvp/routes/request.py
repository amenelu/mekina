from flask import Blueprint, render_template, redirect, url_for, flash, session, url_for, abort, request, jsonify
from flask_login import login_required, current_user
from models.car_request import CarRequest
from models.dealer_bid import DealerBid
from models.deal import Deal
from models import db
from models.notification import Notification
from models.request_question import RequestQuestion

from flask_wtf import FlaskForm
from wtforms import StringField, IntegerField, TextAreaField, SubmitField, RadioField, SelectField, SelectMultipleField, widgets, validators
from wtforms.validators import DataRequired, NumberRange, Optional

request_bp = Blueprint('request', __name__, url_prefix='/requests')

# --- Initial Choice Form ---
class RequestStep0_Choice(FlaskForm):
    knows_what_they_want = RadioField(
        'Do you know which car you want?',
        choices=[('yes', 'Yes, I know what I want'), ('no', 'No, help me decide')],
        validators=[DataRequired()]
    )
    submit = SubmitField('Continue')

# --- "I know what I want" Path ---
class RequestStep1_Make(FlaskForm):
    make = StringField('What make of car are you looking for?', validators=[DataRequired()])
    submit = SubmitField('Next')

class RequestStep2_Model(FlaskForm):
    model = StringField('Great! And what model?', validators=[DataRequired()])
    submit = SubmitField('Next')

class RequestStep3_Year(FlaskForm):
    min_year = IntegerField('What is the minimum year you would consider?', validators=[Optional(), NumberRange(min=1900, max=2100)])
    submit = SubmitField('Next')

class RequestStep4_Notes(FlaskForm):
    notes = TextAreaField('Any other details? (e.g., color, trim, condition)', validators=[Optional()])
    submit = SubmitField('Finish Request')

# --- "Help me decide" Path ---
class RequestGuided_Price(FlaskForm):
    price = RadioField('What is your approximate budget?', choices=[
        ('under_1m', 'Under 1,000,000 ETB'),
        ('1m_to_3m', '1M - 3M ETB'),
        ('3m_to_5m', '3M - 5M ETB'),
        ('over_5m', 'Over 5,000,000 ETB')
    ], validators=[DataRequired()])
    submit = SubmitField('Next')

class RequestGuided_BodyType(FlaskForm):
    body_type = RadioField('What type of car best fits your needs?', choices=[
        ('SUV', 'SUV'),
        ('Sedan', 'Sedan'),
        ('Hatchback', 'Hatchback'),
        ('Pickup', 'Pickup Truck')
    ], validators=[DataRequired()])
    submit = SubmitField('Next')

class RequestGuided_Fuel(FlaskForm):
    fuel_type = RadioField('Any preference on fuel type?', choices=[
        ('Gasoline', 'Gasoline'),
        ('Diesel', 'Diesel'),
        ('Hybrid', 'Hybrid'),
        ('Electric', 'Electric')
    ], validators=[DataRequired()])
    submit = SubmitField('Next')

class RequestGuided_Brand(FlaskForm):
    brand = StringField('Are you considering any specific brands? (Optional)', validators=[Optional()])
    submit = SubmitField('Finish Request')

class RequestGuided_Equipment(FlaskForm):
    equipment = SelectMultipleField('Which features are important to you? (Optional)', choices=[
        ('sunroof', 'Sunroof'),
        ('leather_seats', 'Leather Seats'),
        ('apple_carplay', 'Apple CarPlay / Android Auto'),
        ('awd', 'All-Wheel Drive')
    ], widget=widgets.ListWidget(prefix_label=False), option_widget=widgets.CheckboxInput())
    submit = SubmitField('Next')

class RequestQuestionForm(FlaskForm):
    question_text = TextAreaField('Your Question', validators=[DataRequired(), validators.Length(min=10, max=500)])
    submit_question = SubmitField('Ask Question')


@request_bp.route('/start')
@login_required
def start_request():
    # Clear any previous request data from the session
    session.pop('car_request_data', None)
    return redirect(url_for('request.step0_choice'))

@request_bp.route('/step1_make', methods=['GET', 'POST'])
@login_required
def step1_make():
    form = RequestStep1_Make()
    if form.validate_on_submit():
        session['car_request_data'] = {'make': form.make.data}
        return redirect(url_for('request.step2_model'))
    return render_template('request_step.html', form=form, title="Find a Car (1/4)")

@request_bp.route('/step2_model', methods=['GET', 'POST'])
@login_required
def step2_model():
    if 'car_request_data' not in session:
        return redirect(url_for('request.start_request'))
    form = RequestStep2_Model()
    if form.validate_on_submit():
        session['car_request_data']['model'] = form.model.data
        session.modified = True
        return redirect(url_for('request.step3_year'))
    return render_template('request_step.html', form=form, title="Find a Car (2/4)")

@request_bp.route('/step3_year', methods=['GET', 'POST'])
@login_required
def step3_year():
    if 'model' not in session.get('car_request_data', {}):
        return redirect(url_for('request.start_request'))
    form = RequestStep3_Year()
    if form.validate_on_submit():
        session['car_request_data']['min_year'] = form.min_year.data
        session.modified = True
        return redirect(url_for('request.step4_notes'))
    return render_template('request_step.html', form=form, title="Find a Car (3/4)")

@request_bp.route('/step4_notes', methods=['GET', 'POST'])
@login_required
def step4_notes():
    if 'min_year' not in session.get('car_request_data', {}):
        return redirect(url_for('request.start_request'))
    form = RequestStep4_Notes()
    if form.validate_on_submit():
        data = session.get('car_request_data', {})
        new_req = CarRequest(
            make=data.get('make'), model=data.get('model'),
            min_year=data.get('min_year'), notes=form.notes.data,
            user_id=current_user.id
        )
        db.session.add(new_req)
        db.session.commit()
        session.pop('car_request_data', None) # Clean up session
        flash("Dealers will contact you with their offers. Thank you!", 'success')
        return redirect(url_for('main.home'))
    return render_template('request_step.html', form=form, title="Find a Car (4/4)")

# --- New Routes for Guided Path ---

@request_bp.route('/step0_choice', methods=['GET', 'POST'])
@login_required
def step0_choice():
    form = RequestStep0_Choice()
    if form.validate_on_submit():
        session['car_request_data'] = {}
        if form.knows_what_they_want.data == 'yes':
            return redirect(url_for('request.step1_make'))
        else:
            return redirect(url_for('request.step_guided_price'))
    return render_template('request_step.html', form=form, title="Let's Find Your Next Car")

@request_bp.route('/guided_price', methods=['GET', 'POST'])
@login_required
def step_guided_price():
    form = RequestGuided_Price()
    if form.validate_on_submit():
        session['car_request_data']['price'] = form.price.data
        session.modified = True
        return redirect(url_for('request.step_guided_body_type'))
    return render_template('request_step.html', form=form, title="Help Us Decide (1/5)")

@request_bp.route('/guided_body_type', methods=['GET', 'POST'])
@login_required
def step_guided_body_type():
    if 'price' not in session.get('car_request_data', {}):
        return redirect(url_for('request.start_request'))
    form = RequestGuided_BodyType()
    if form.validate_on_submit():
        session['car_request_data']['body_type'] = form.body_type.data
        session.modified = True
        return redirect(url_for('request.step_guided_fuel'))
    return render_template('request_step.html', form=form, title="Help Us Decide (2/5)")

@request_bp.route('/guided_fuel', methods=['GET', 'POST'])
@login_required
def step_guided_fuel():
    if 'body_type' not in session.get('car_request_data', {}):
        return redirect(url_for('request.start_request'))
    form = RequestGuided_Fuel()
    if form.validate_on_submit():
        session['car_request_data']['fuel_type'] = form.fuel_type.data
        session.modified = True
        return redirect(url_for('request.step_guided_equipment'))
    return render_template('request_step.html', form=form, title="Help Us Decide (3/5)")

@request_bp.route('/guided_equipment', methods=['GET', 'POST'])
@login_required
def step_guided_equipment():
    if 'fuel_type' not in session.get('car_request_data', {}):
        return redirect(url_for('request.start_request'))
    form = RequestGuided_Equipment()
    if form.validate_on_submit():
        session['car_request_data']['equipment'] = form.equipment.data
        session.modified = True
        return redirect(url_for('request.step_guided_brand'))
    return render_template('request_step.html', form=form, title="Help Us Decide (4/5)")

@request_bp.route('/guided_brand', methods=['GET', 'POST'])
@login_required
def step_guided_brand():
    if 'equipment' not in session.get('car_request_data', {}):
        return redirect(url_for('request.start_request'))
    form = RequestGuided_Brand()
    if form.validate_on_submit():
        data = session.get('car_request_data', {})
        notes = (
            f"Customer is looking for a car with the following preferences:\n"
            f"- Budget: {data.get('price', 'Not specified')}\n"
            f"- Body Type: {data.get('body_type', 'Not specified')}\n"
            f"- Fuel Type: {data.get('fuel_type', 'Not specified')}\n"
            f"- Important Features: {', '.join(data.get('equipment', [])) or 'None'}\n"
            f"- Preferred Brand(s): {form.brand.data or 'Any'}"
        )
        new_req = CarRequest(notes=notes, user_id=current_user.id)
        db.session.add(new_req)
        db.session.commit()
        session.pop('car_request_data', None)
        flash("We've found some cars that match your preferences! Dealers will also be notified of your request.", 'success')

        # Redirect to the filtered "All Listings" page, not just auctions
        filter_params = {
            'body_type': data.get('body_type'), 
            'fuel_type': data.get('fuel_type'), 
            'make': form.brand.data or data.get('brand'),
            'exclude_listing_type': 'rental' # Exclude rentals from suggestions
        }
        return redirect(url_for('main.all_listings', **{k: v for k, v in filter_params.items() if v}))
    return render_template('request_step.html', form=form, title="Help Us Decide (5/5)")

@request_bp.route('/my')
@login_required
def my_requests():
    requests = CarRequest.query.filter_by(user_id=current_user.id).order_by(CarRequest.created_at.desc()).all()
    return render_template('my_requests.html', requests=requests)

@request_bp.route('/<int:request_id>')
@login_required
def request_detail(request_id):
    car_request = CarRequest.query.get_or_404(request_id)
    # Security check: only the user who made the request or an admin can view it.
    if car_request.user_id != current_user.id and not current_user.is_admin:
        abort(403)

    # Get all bids for this request, lowest first
    bids = car_request.dealer_bids.order_by(DealerBid.price.asc()).all()

    # We can pass one form instance to the template and reuse it for each bid with JS
    question_form = RequestQuestionForm()

    return render_template('request_detail.html', car_request=car_request, bids=bids, question_form=question_form)

@request_bp.route('/bid/<int:bid_id>/ask', methods=['POST'])
@login_required
def ask_dealer_question(bid_id):
    """Handles a buyer asking a question about a specific dealer bid."""
    bid = DealerBid.query.get_or_404(bid_id)
    car_request = bid.car_request

    # Security check: only the user who made the request can ask a question
    if car_request.user_id != current_user.id:
        abort(403)

    form = RequestQuestionForm()
    if form.validate_on_submit():
        new_question = RequestQuestion(
            question_text=form.question_text.data,
            user_id=current_user.id,
            dealer_bid_id=bid.id
        )
        db.session.add(new_question)
        db.session.commit()

        # Notify the dealer
        notification_message = f"A customer asked a question about your offer for request #{car_request.id}."
        link = url_for('dealer.answer_request_question', question_id=new_question.id, _external=True)
        notification = Notification(user_id=bid.dealer_id, message=notification_message, link=link)
        db.session.add(notification)
        db.session.commit()
        return jsonify({'status': 'success', 'message': 'Your question has been sent to the dealer.'})
    
    return jsonify({'status': 'error', 'errors': form.errors})

@request_bp.route('/offer/<int:bid_id>/accept', methods=['POST'])
@login_required
def accept_offer(bid_id):
    """Handles the logic for a customer accepting a dealer's offer."""
    bid_to_accept = DealerBid.query.get_or_404(bid_id)
    car_request = bid_to_accept.car_request

    # --- Security Checks ---
    if car_request.user_id != current_user.id:
        abort(403)  # User doesn't own the request
    if car_request.status != 'active':
        flash('This request is already closed.', 'warning')
        return redirect(url_for('request.request_detail', request_id=car_request.id))

    # --- Transactional Logic ---
    try:
        # 1. Update the accepted offer's status
        bid_to_accept.status = 'accepted'

        # 2. Reject all other bids for that request automatically
        for other_bid in car_request.dealer_bids.filter(DealerBid.id != bid_to_accept.id):
            other_bid.status = 'rejected'

        # 3. Lock the buyer’s request
        car_request.status = 'completed'
        car_request.accepted_bid_id = bid_to_accept.id

        # 4. Generate a “deal summary” record
        new_deal = Deal(
            final_price=bid_to_accept.price,
            customer_id=car_request.user_id,
            dealer_id=bid_to_accept.dealer_id,
            car_request_id=car_request.id,
            accepted_bid_id=bid_to_accept.id
        )
        db.session.add(new_deal)

        # We need to commit here to get the new_deal.id
        db.session.commit()

        # 5. Notify the dealer that their offer was accepted
        if car_request.make and car_request.model:
            request_description = f"'{car_request.make} {car_request.model}'"
        else:
            request_description = f"customer request #{car_request.id}"

        notification_message = f"Congratulations! Your offer for {request_description} was accepted by the customer."
        deal_notification = Notification(user_id=bid_to_accept.dealer_id, message=notification_message, link=url_for('request.deal_summary', deal_id=new_deal.id, _external=True))
        db.session.add(deal_notification)

        db.session.commit() # Commit the notification
        flash('Offer accepted! The dealer has been notified and you can see the deal summary below.', 'success')
        return redirect(url_for('request.deal_summary', deal_id=new_deal.id))

    except Exception as e:
        db.session.rollback()
        flash(f'An error occurred while accepting the offer: {e}', 'danger')
        return redirect(url_for('request.request_detail', request_id=car_request.id))

@request_bp.route('/deal/<int:deal_id>')
@login_required
def deal_summary(deal_id):
    """Displays the final summary of a completed deal."""
    deal = Deal.query.get_or_404(deal_id)
    # Security check: only participants or an admin can view the deal
    if current_user.id not in [deal.customer_id, deal.dealer_id] and not current_user.is_admin:
        abort(403)
    
    return render_template('deal_summary.html', deal=deal)