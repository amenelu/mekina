from flask import Blueprint, render_template, redirect, url_for, flash, session
from flask_login import login_required, current_user
from models.car_request import CarRequest
from models import db

from flask_wtf import FlaskForm
from wtforms import StringField, IntegerField, TextAreaField, SubmitField
from wtforms.validators import DataRequired, NumberRange, Optional

request_bp = Blueprint('request', __name__, url_prefix='/requests')

# --- Multi-step Forms ---
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


@request_bp.route('/start')
@login_required
def start_request():
    # Clear any previous request data from the session
    session.pop('car_request_data', None)
    return redirect(url_for('request.step1_make'))

@request_bp.route('/step1_make', methods=['GET', 'POST'])
@login_required
def step1_make():
    form = RequestStep1_Make()
    if form.validate_on_submit():
        session['car_request_data'] = {'make': form.make.data}
        return redirect(url_for('request.step2_model'))
    return render_template('request_step.html', form=form, title="Step 1: Make")

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
    return render_template('request_step.html', form=form, title="Step 2: Model")

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
    return render_template('request_step.html', form=form, title="Step 3: Year")

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
    return render_template('request_step.html', form=form, title="Step 4: Final Details")