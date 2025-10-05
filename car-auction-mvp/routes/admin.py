import os
from functools import wraps
from flask import Blueprint, render_template, flash, redirect, request, url_for, abort, current_app
from flask_login import login_required, current_user
from models.car import Car
from models.user import User
from models.auction import Auction
from app import db
from datetime import datetime
from werkzeug.utils import secure_filename

from flask_wtf import FlaskForm
from flask_wtf.file import FileField, FileAllowed
from wtforms import StringField, IntegerField, TextAreaField, FloatField, DateTimeLocalField, SubmitField, BooleanField, PasswordField
from wtforms.validators import DataRequired, NumberRange

admin_bp = Blueprint('admin', __name__)

# Custom decorator to check for admin privileges
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin:
            abort(403) # Forbidden
        return f(*args, **kwargs)
    return decorated_function

class AddCarForm(FlaskForm):
    make = StringField('Make', validators=[DataRequired()])
    model = StringField('Model', validators=[DataRequired()])
    year = IntegerField('Year', validators=[DataRequired(), NumberRange(min=1900, max=2100)])
    description = TextAreaField('Description')
    image_url = StringField('Image URL')
    start_price = FloatField('Starting Price (ETB)', validators=[DataRequired(), NumberRange(min=0)])
    end_time = DateTimeLocalField('Auction End Time', format='%Y-%m-%dT%H:%M', validators=[DataRequired()])
    service_history_doc = FileField('Service History Document (PDF, JPG, PNG)', validators=[FileAllowed(['pdf', 'jpg', 'jpeg', 'png'], 'Images and PDFs only!')])
    inspection_report_doc = FileField('Last Inspection Report (PDF, JPG, PNG)', validators=[FileAllowed(['pdf', 'jpg', 'jpeg', 'png'], 'Images and PDFs only!')])
    submit = SubmitField('Add Car and Create Auction')

class UserEditForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired()])
    email = StringField('Email', validators=[DataRequired()])
    is_admin = BooleanField('Is Admin?')
    submit = SubmitField('Update User')

@admin_bp.route('/dashboard')
@login_required
@admin_required
def dashboard():
    unapproved_cars = Car.query.filter_by(is_approved=False).all()

    # Gather platform statistics
    stats = {
        'user_count': User.query.count(),
        'active_auction_count': Auction.query.join(Car).filter(Car.is_approved == True, Auction.end_time > datetime.utcnow()).count(),
        'pending_approval_count': len(unapproved_cars)
    }

    return render_template('dashboard.html', cars=unapproved_cars, stats=stats)

@admin_bp.route('/approve_car/<int:car_id>', methods=['POST'])
@login_required
@admin_required
def approve_car(car_id):
    car = Car.query.get_or_404(car_id)
    car.is_approved = True
    db.session.commit()
    flash(f'The car "{car.year} {car.make} {car.model}" has been approved.', 'success')
    return redirect(url_for('admin.dashboard'))

def save_document(form_file_data):
    """Helper function to save an uploaded document."""
    if not form_file_data:
        return None
    filename = secure_filename(form_file_data.filename)
    # Ensure the uploads directory exists
    upload_path = os.path.join(current_app.root_path, 'static/uploads')
    os.makedirs(upload_path, exist_ok=True)
    file_path = os.path.join(upload_path, filename)
    form_file_data.save(file_path)
    # Return the URL path for storage in DB
    return url_for('static', filename=f'uploads/{filename}')

@admin_bp.route('/add_car', methods=['GET', 'POST'])
@login_required
@admin_required
def add_car():
    form = AddCarForm()
    if form.validate_on_submit():
        service_history_url = save_document(form.service_history_doc.data)
        inspection_report_url = save_document(form.inspection_report_doc.data)

        # Create new Car, automatically approved
        new_car = Car(
            make=form.make.data,
            model=form.model.data,
            year=form.year.data,
            description=form.description.data,
            image_url=form.image_url.data,
            owner_id=current_user.id, # Admin is the owner
            is_approved=True,
            service_history_url=service_history_url,
            inspection_report_url=inspection_report_url
        )
        db.session.add(new_car)
        db.session.commit() # Commit to get the new_car.id

        # Create new Auction for the car
        new_auction = Auction(start_time=datetime.utcnow(), end_time=form.end_time.data, start_price=form.start_price.data, current_price=form.start_price.data, car_id=new_car.id)
        db.session.add(new_auction)
        db.session.commit()
        flash(f'Successfully added {new_car.year} {new_car.make} {new_car.model} for auction.', 'success')
        return redirect(url_for('admin.dashboard'))
    return render_template('add_car.html', title='Add New Car', form=form, cancel_url=url_for('admin.dashboard'))

@admin_bp.route('/edit_auction/<int:auction_id>', methods=['GET', 'POST'])
@login_required
@admin_required
def edit_auction(auction_id):
    auction = Auction.query.get_or_404(auction_id)
    car = auction.car
    form = AddCarForm(obj=car)

    # Dynamically change the submit button text for the edit view
    form.submit.label.text = 'Update Auction'
    
    # Pre-populate auction-specific fields
    if request.method == 'GET':
        form.start_price.data = auction.start_price
        form.end_time.data = auction.end_time

    if form.validate_on_submit():
        # Update Car details
        car.make = form.make.data
        car.model = form.model.data
        car.year = form.year.data
        car.description = form.description.data
        car.image_url = form.image_url.data

        # Update Auction details
        auction.start_price = form.start_price.data
        auction.end_time = form.end_time.data
        # Optional: Reset current price if start price changes
        if auction.current_price < auction.start_price:
            auction.current_price = auction.start_price

        db.session.commit()
        flash(f'Successfully updated auction for {car.year} {car.make} {car.model}.', 'success')
        return redirect(url_for('auctions.list_auctions'))

    return render_template('add_car.html', title=f'Edit Auction: {car.year} {car.make}', form=form, cancel_url=url_for('auctions.list_auctions'))

@admin_bp.route('/delete_auction/<int:auction_id>', methods=['POST'])
@login_required
@admin_required
def delete_auction(auction_id):
    auction = Auction.query.get_or_404(auction_id)
    car = auction.car
    db.session.delete(auction) # Deleting auction will cascade and delete bids
    db.session.delete(car)
    db.session.commit()
    flash(f'Successfully deleted auction and car: {car.year} {car.make} {car.model}.', 'danger')
    return redirect(url_for('auctions.list_auctions'))