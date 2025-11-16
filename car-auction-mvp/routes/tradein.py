from flask import Blueprint, render_template, redirect, url_for, flash, request, current_app, jsonify
from flask_login import login_required, current_user
from flask_wtf import FlaskForm
from wtforms import StringField, IntegerField, SelectField, TextAreaField, SubmitField, MultipleFileField
from wtforms.validators import DataRequired, Length, NumberRange, Optional
from flask_wtf.file import FileAllowed
from werkzeug.utils import secure_filename
import os
from datetime import datetime

from extensions import db
# We will assume these models will be created
# from models.trade_in import TradeInRequest, TradeInPhoto

tradein_bp = Blueprint('tradein', __name__, url_prefix='/trade-in')

TRADE_IN_UPLOAD_FOLDER = 'static/uploads/trade_ins'

class TradeInForm(FlaskForm):
    """Form for users to submit their car for a trade-in valuation."""
    make = StringField('Car Make', validators=[DataRequired(), Length(max=50)])
    model = StringField('Car Model', validators=[DataRequired(), Length(max=50)])
    year = IntegerField('Year', validators=[DataRequired(), NumberRange(min=1950, max=datetime.now().year)])
    mileage = IntegerField('Mileage (km)', validators=[DataRequired(), NumberRange(min=0)])
    condition = SelectField('Condition', choices=[
        ('Excellent', 'Excellent'),
        ('Good', 'Good'),
        ('Fair', 'Fair'),
        ('Poor', 'Poor')
    ], validators=[DataRequired()])
    vin = StringField('VIN (Vehicle Identification Number)', validators=[Optional(), Length(min=17, max=17)])
    comments = TextAreaField('Additional Comments (e.g., modifications, issues)', validators=[Optional(), Length(max=1000)])
    images = MultipleFileField('Upload Photos (up to 10)', validators=[
        FileAllowed(['jpg', 'png', 'jpeg'], 'Images only!'),
        DataRequired(message="Please upload at least one photo of your car.")
    ])
    submit = SubmitField('Get My Trade-in Offer')

def save_trade_in_photo(file):
    """Saves an uploaded photo for a trade-in and returns its web-accessible path."""
    if not file or file.filename == '':
        return None
    
    filename = secure_filename(file.filename)
    upload_dir = os.path.join(current_app.root_path, TRADE_IN_UPLOAD_FOLDER)
    os.makedirs(upload_dir, exist_ok=True)
    
    # Create a unique filename to avoid overwrites
    unique_filename = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}_{filename}"
    file_path = os.path.join(upload_dir, unique_filename)
    file.save(file_path)
    
    # Return the relative path for web access
    return os.path.join('/', TRADE_IN_UPLOAD_FOLDER, unique_filename).replace(os.sep, '/')

@tradein_bp.route('/', methods=['GET', 'POST'])
@login_required
def submit_trade_in():
    """Displays and processes the trade-in submission form."""
    form = TradeInForm()
    if form.validate_on_submit():
        # NOTE: The following lines are commented out as the models do not exist yet.
        # You would uncomment this when you create the TradeInRequest and TradeInPhoto models.
        
        # new_request = TradeInRequest(
        #     user_id=current_user.id,
        #     make=form.make.data,
        #     model=form.model.data,
        #     year=form.year.data,
        #     mileage=form.mileage.data,
        #     condition=form.condition.data,
        #     vin=form.vin.data,
        #     comments=form.comments.data,
        #     status='pending'
        # )
        # db.session.add(new_request)
        # db.session.flush() # To get the ID for the new_request

        # for image_file in form.images.data:
        #     image_url = save_trade_in_photo(image_file)
        #     if image_url:
        #         new_photo = TradeInPhoto(image_url=image_url, trade_in_request_id=new_request.id)
        #         db.session.add(new_photo)
        
        # db.session.commit()

        # For now, we will just flash a success message.
        flash('Thank you! Your trade-in request has been submitted. Our team will review it and get back to you shortly.', 'success')
        return redirect(url_for('main.home'))

    return render_template('trade_in_form.html', form=form, title="Trade-in Your Car")

@tradein_bp.route('/api', methods=['POST'])
@login_required
def api_submit_trade_in():
    """API endpoint for submitting a trade-in request (for mobile apps)."""
    data = request.get_json()
    if not data:
        return jsonify({'status': 'error', 'message': 'Invalid JSON payload.'}), 400

    # Here you would add validation and logic similar to the web form,
    # handling base64 encoded images, etc.

    return jsonify({'status': 'success', 'message': 'Trade-in request received.'}), 201