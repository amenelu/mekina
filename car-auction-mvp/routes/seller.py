import os
from flask import Blueprint, render_template, abort, flash, redirect, url_for, current_app
from flask_login import login_required, current_user
from models.car import Car
from models.auction import Auction
from datetime import datetime
from functools import wraps
from werkzeug.utils import secure_filename
from app import db

from flask_wtf import FlaskForm
from flask_wtf.file import FileField, FileAllowed
from wtforms import StringField, IntegerField, TextAreaField, FloatField, DateTimeLocalField, SubmitField, SelectField
from wtforms.validators import DataRequired, NumberRange

seller_bp = Blueprint('seller', __name__)


# Custom decorator to ensure only non-admin authenticated users can access
def seller_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or current_user.is_admin:
            abort(403) # Forbidden
        return f(*args, **kwargs)
    return decorated_function

def save_document(form_file_data):
    """Helper function to save an uploaded document."""
    if not form_file_data:
        return None
    filename = secure_filename(form_file_data.filename)
    upload_path = os.path.join(current_app.root_path, 'static/uploads')
    os.makedirs(upload_path, exist_ok=True)
    file_path = os.path.join(upload_path, filename)
    form_file_data.save(file_path)
    return url_for('static', filename=f'uploads/{filename}')

class SubmitCarForm(FlaskForm):
    make = StringField('Make', validators=[DataRequired()])
    model = StringField('Model', validators=[DataRequired()])
    year = IntegerField('Year', validators=[DataRequired(), NumberRange(min=1900, max=2100)])
    description = TextAreaField('Description')
    image_url = StringField('Main Image URL (Optional)')
    transmission = SelectField('Transmission', choices=[('Automatic', 'Automatic'), ('Manual', 'Manual')])
    drivetrain = SelectField('Drivetrain', choices=[('FWD', 'FWD'), ('RWD', 'RWD'), ('AWD', 'AWD'), ('4WD', '4WD')])
    mileage = IntegerField('Mileage (km)', validators=[DataRequired(), NumberRange(min=0)])
    fuel_type = SelectField('Fuel Type', choices=[('Gasoline', 'Gasoline'), ('Diesel', 'Diesel'), ('Electric', 'Electric')])
    start_price = FloatField('Starting Price (ETB)', validators=[DataRequired(), NumberRange(min=0)])
    end_time = DateTimeLocalField('Auction End Time', format='%Y-%m-%dT%H:%M', validators=[DataRequired()])
    service_history_doc = FileField('Service History Document (PDF, JPG, PNG)', validators=[FileAllowed(['pdf', 'jpg', 'jpeg', 'png'], 'Images and PDFs only!')])
    inspection_report_doc = FileField('Last Inspection Report (PDF, JPG, PNG)', validators=[FileAllowed(['pdf', 'jpg', 'jpeg', 'png'], 'Images and PDFs only!')])
    submit = SubmitField('Submit Car for Approval')

@seller_bp.route('/dashboard')
@login_required
@seller_required
def dashboard():
    """Displays a dashboard for the seller with their submitted cars."""
    # Get cars owned by the current user, ordered by year
    my_cars = Car.query.filter_by(owner_id=current_user.id).order_by(Car.year.desc()).all()
    
    return render_template('seller_dashboard.html', my_cars=my_cars, now=datetime.utcnow())

@seller_bp.route('/submit_car', methods=['GET', 'POST'])
@login_required
@seller_required
def submit_car():
    form = SubmitCarForm()
    if form.validate_on_submit():
        service_history_url = save_document(form.service_history_doc.data)
        inspection_report_url = save_document(form.inspection_report_doc.data)

        new_car = Car(
            make=form.make.data,
            model=form.model.data,
            year=form.year.data,
            description=form.description.data,
            image_url=form.image_url.data,
            owner_id=current_user.id,
            is_approved=False, # Submitted cars need admin approval
            transmission=form.transmission.data,
            drivetrain=form.drivetrain.data,
            mileage=form.mileage.data,
            fuel_type=form.fuel_type.data,
            service_history_url=service_history_url,
            inspection_report_url=inspection_report_url
        )
        db.session.add(new_car)
        db.session.commit()

        new_auction = Auction(start_time=datetime.utcnow(), end_time=form.end_time.data, start_price=form.start_price.data, current_price=form.start_price.data, car_id=new_car.id)
        db.session.add(new_auction)
        db.session.commit()
        flash(f'Your car "{new_car.year} {new_car.make} {new_car.model}" has been submitted for admin approval.', 'success')
        return redirect(url_for('seller.dashboard'))
    return render_template('submit_car.html', title='Submit Car for Auction', form=form, cancel_url=url_for('seller.dashboard'))