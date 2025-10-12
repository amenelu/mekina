from flask import Blueprint, render_template, redirect, url_for, flash, session
from flask_login import login_required, current_user
from models.car_request import CarRequest
from models import db

from flask_wtf import FlaskForm
from wtforms import StringField, IntegerField, TextAreaField, SubmitField, RadioField, SelectField, SelectMultipleField, widgets
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
            customer_id=current_user.id
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
        new_req = CarRequest(notes=notes, customer_id=current_user.id)
        db.session.add(new_req)
        db.session.commit()
        session.pop('car_request_data', None)
        flash("Dealers will contact you with their offers. Thank you!", 'success')
        return redirect(url_for('main.home'))
    return render_template('request_step.html', form=form, title="Help Us Decide (5/5)")