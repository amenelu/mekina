import os
from flask import Blueprint, render_template, redirect, url_for, flash, request, current_app
from flask_login import login_required, current_user
from models.car import Car
from models.question import Question
from models.auction import Auction
from models.rental_listing import RentalListing
from models.equipment import Equipment
from models.car_image import CarImage
from extensions import db, socketio
from datetime import datetime
from werkzeug.utils import secure_filename

from flask_wtf import FlaskForm
from wtforms import (StringField, IntegerField, TextAreaField, SubmitField, FloatField, 
                     SelectField, SelectMultipleField, widgets, RadioField, BooleanField)
from wtforms.fields import DateTimeLocalField, MultipleFileField
from wtforms.validators import DataRequired, Length, NumberRange, Optional, ValidationError

seller_bp = Blueprint('seller', __name__, url_prefix='/seller')

class CarSubmissionForm(FlaskForm):
    make = StringField('Make', validators=[DataRequired()])
    model = StringField('Model', validators=[DataRequired()])
    year = IntegerField('Year', validators=[DataRequired(), NumberRange(min=1900, max=datetime.now().year + 1)])
    description = TextAreaField('Description', validators=[Optional(), Length(max=2000)])
    images = MultipleFileField('Car Photos (select multiple)')
    condition = SelectField('Condition', choices=[('Used', 'Used'), ('New', 'New')], validators=[DataRequired()])
    body_type = SelectField('Body Type', choices=[('SUV', 'SUV'), ('Sedan', 'Sedan'), ('Hatchback', 'Hatchback'), ('Pickup', 'Pickup Truck'), ('Coupe', 'Coupe'), ('Minivan', 'Minivan')], validators=[DataRequired()])
    mileage = IntegerField('Mileage', validators=[Optional(), NumberRange(min=0)])
    transmission = SelectField('Transmission', choices=[('Automatic', 'Automatic'), ('Manual', 'Manual')], validators=[DataRequired()])
    drivetrain = SelectField('Drivetrain', choices=[('FWD', 'FWD'), ('RWD', 'RWD'), ('AWD', 'AWD'), ('4WD', '4WD')], validators=[DataRequired()])
    fuel_type = SelectField('Fuel Type', choices=[('Gasoline', 'Gasoline'), ('Diesel', 'Diesel'), ('Electric', 'Electric'), ('Hybrid', 'Hybrid')], validators=[DataRequired()])
    equipment = SelectMultipleField('Features', choices=[
        ('sunroof', 'Sunroof'), ('leather_seats', 'Leather Seats'),
        ('apple_carplay', 'Apple CarPlay / Android Auto'), ('awd', 'All-Wheel Drive')
    ], widget=widgets.ListWidget(prefix_label=False), option_widget=widgets.CheckboxInput(), validators=[Optional()])
    listing_type = RadioField('How do you want to list this car?', choices=[('auction', 'Auction'), ('sale', 'For Sale (Fixed Price)'), ('rental', 'For Rent')], default='auction', validators=[DataRequired()])
    
    # Auction Details
    start_price = FloatField('Starting Price (ETB)', validators=[Optional(), NumberRange(min=1)])
    end_time = DateTimeLocalField('Auction End Time', format='%Y-%m-%dT%H:%M', validators=[Optional()])
    # For Sale Details
    fixed_price = FloatField('Sale Price (ETB)', validators=[Optional(), NumberRange(min=1)])
    # Rental Details
    price_per_day = FloatField('Price Per Day (ETB)', validators=[Optional(), NumberRange(min=1)])

    # Admin-only field
    is_featured = BooleanField('Featured Listing')

    submit = SubmitField('Submit')

    def validate_mileage(self, field):
        """Custom validator to make mileage required only for used cars."""
        if self.condition.data == 'Used' and field.data is None:
            raise ValidationError('Mileage is required for used cars.')

    def validate_description(self, field):
        """Custom validator to make description required only for used cars."""
        if self.condition.data == 'Used' and not field.data:
            raise ValidationError('A description is required for used cars.')

class AnswerForm(FlaskForm):
    answer_text = TextAreaField('Your Answer', validators=[DataRequired(), Length(min=5)])
    submit = SubmitField('Post Answer')

def save_seller_document(form_file_data):
    """Helper function to save an uploaded document for sellers."""
    if not form_file_data or not form_file_data.filename:
        return None
    filename = secure_filename(form_file_data.filename)
    upload_path = os.path.join(current_app.root_path, 'static/uploads')
    os.makedirs(upload_path, exist_ok=True)
    file_path = os.path.join(upload_path, filename)
    form_file_data.save(file_path)
    return url_for('static', filename=f'uploads/{filename}')


@seller_bp.route('/dashboard')
@login_required
def dashboard():
    my_cars = Car.query.filter_by(owner_id=current_user.id).order_by(Car.id.desc()).all()
    # Get all questions for all cars owned by the current user
    my_car_ids = [car.id for car in my_cars]
    
    # Find auctions associated with these cars
    from models.auction import Auction
    my_auctions = Auction.query.filter(Auction.car_id.in_(my_car_ids)).all()
    my_auction_ids = [auction.id for auction in my_auctions]

    # Get unanswered questions for those auctions
    unanswered_questions = Question.query.filter(
        Question.auction_id.in_(my_auction_ids),
        Question.answer_text == None
    ).order_by(Question.timestamp.desc()).all()

    return render_template('seller_dashboard.html', my_cars=my_cars, unanswered_questions=unanswered_questions, now=datetime.utcnow())

@seller_bp.route('/submit_car', methods=['GET', 'POST'])
@login_required
def submit_car():
    form = CarSubmissionForm()

    # Dynamically set choices and default based on user role
    if current_user.is_rental_company:
        form.listing_type.choices = [('rental', 'For Rent')]
        if request.method == 'GET':
            form.listing_type.data = 'rental' # Pre-select 'rental' for new submissions
    else:
        form.listing_type.choices = [('auction', 'Auction'), ('sale', 'For Sale (Fixed Price)')]

    if form.validate_on_submit():
        # --- Conditional Validation ---
        listing_type = form.listing_type.data
        if listing_type == 'auction' and (not form.start_price.data or not form.end_time.data):
            flash('For an auction, you must provide a starting price and an end time.', 'danger')
            return render_template('submit_car.html', title='Submit Your Car', form=form)
        if listing_type == 'sale' and not form.fixed_price.data:
            flash('For a fixed-price sale, you must provide a sale price.', 'danger')
            return render_template('submit_car.html', title='Submit Your Car', form=form)
        if listing_type == 'rental' and not form.price_per_day.data:
            flash('For a rental, you must provide a price per day.', 'danger')
            return render_template('submit_car.html', title='Submit Your Car', form=form)


        # Create the Car object first
        new_car = Car(
            make=form.make.data,
            model=form.model.data,
            year=form.year.data,
            description=form.description.data,
            condition=form.condition.data, # 'New' or 'Used'
            body_type=form.body_type.data,
            mileage=form.mileage.data,
            transmission=form.transmission.data,
            drivetrain=form.drivetrain.data,
            fuel_type=form.fuel_type.data,
            owner_id=current_user.id,
            listing_type=listing_type,
            fixed_price=form.fixed_price.data if listing_type == 'sale' else None,
            is_approved=False # All seller submissions must be approved
        )
        db.session.add(new_car)
        db.session.flush() # Use flush to get the new_car.id before committing

        # Add equipment
        for item_name in form.equipment.data:
            equipment_item = Equipment.query.filter_by(name=item_name).first()
            if equipment_item:
                new_car.equipment.append(equipment_item)

        # Save multiple images
        for image_file in form.images.data:
            image_url = save_seller_document(image_file)
            if image_url:
                new_image = CarImage(image_url=image_url, car_id=new_car.id)
                db.session.add(new_image)

        # Create either an Auction or a Rental Listing based on choice
        if listing_type == 'auction':
            new_auction = Auction(
                start_price=form.start_price.data,
                current_price=form.start_price.data,
                end_time=form.end_time.data,
                car_id=new_car.id
            )
            db.session.add(new_auction)
        elif listing_type == 'rental':
            new_rental = RentalListing(
                price_per_day=form.price_per_day.data,
                car_id=new_car.id
            )
            db.session.add(new_rental)

        db.session.commit()
        flash('Your car has been submitted for approval. Thank you!', 'success')
        return redirect(url_for('seller.dashboard'))
    return render_template('submit_car.html', title='Submit Your Car', form=form)

@seller_bp.route('/edit_car/<int:car_id>', methods=['GET', 'POST'])
@login_required
def edit_car(car_id):
    car = Car.query.get_or_404(car_id)
    auction = car.auction

    # Security checks
    if car.owner_id != current_user.id:
        flash("You do not have permission to edit this car.", "danger")
        return redirect(url_for('seller.dashboard'))
    
    if car.is_approved:
        flash("You cannot edit a car that has already been approved.", "warning")
        return redirect(url_for('seller.dashboard'))

    form = CarSubmissionForm(obj=car)
    form.submit.label.text = 'Update Submission'

    # Dynamically set choices based on user role
    if not current_user.is_rental_company:
        form.listing_type.choices = [('auction', 'Auction'), ('sale', 'For Sale (Fixed Price)')]

    if request.method == 'GET':
        # Pre-populate auction-specific fields
        if auction:
            form.start_price.data = auction.start_price
            form.end_time.data = auction.end_time

    if form.validate_on_submit():
        # Update Car details
        car.make = form.make.data
        car.model = form.model.data
        car.year = form.year.data
        car.description = form.description.data
        car.condition = form.condition.data
        car.body_type = form.body_type.data
        car.mileage = form.mileage.data
        car.transmission = form.transmission.data
        car.drivetrain = form.drivetrain.data
        car.fuel_type = form.fuel_type.data

        # Update Auction details
        if auction:
            auction.start_price = form.start_price.data
            auction.current_price = form.start_price.data # Reset current price to new start price
            auction.end_time = form.end_time.data

        # Update equipment - THIS BLOCK WAS MISSING
        car.equipment.clear() # Clear old features
        for item_name in form.equipment.data: # Add new features
            equipment_item = Equipment.query.filter_by(name=item_name).first()
            if equipment_item:
                car.equipment.append(equipment_item)

        # If new images are uploaded, replace the old ones.
        if form.images.data and form.images.data[0].filename:
            CarImage.query.filter_by(car_id=car.id).delete()
            for image_file in form.images.data:
                image_url = save_seller_document(image_file)
                if image_url:
                    new_image = CarImage(image_url=image_url, car_id=car.id)
                    db.session.add(new_image)

        db.session.commit()
        flash('Your submission has been updated.', 'success')
        return redirect(url_for('seller.dashboard'))

    return render_template('submit_car.html', title=f'Edit Submission: {car.year} {car.make}', form=form)

@seller_bp.route('/delete_car/<int:car_id>', methods=['POST'])
@login_required
def delete_car(car_id):
    """Allows a seller or dealer to delete their own car listing."""
    car = Car.query.get_or_404(car_id)

    # Security check: ensure the current user owns this car
    if car.owner_id != current_user.id:
        from flask import abort
        abort(403)

    # Optional: Add logic here to prevent deletion under certain conditions,
        # e.g., if an auction has active bids. For now, we allow deletion.

    db.session.delete(car)
    db.session.commit()

    flash(f'Your listing for the "{car.year} {car.make} {car.model}" has been removed.', 'success')
    return redirect(url_for('dealer.dashboard'))

@seller_bp.route('/toggle_active/<int:car_id>', methods=['POST'])
@login_required
def toggle_active(car_id):
    """Toggles the active/visible status of a listing."""
    car = Car.query.get_or_404(car_id)

    # Security check: only owner or admin can toggle
    if car.owner_id != current_user.id and not current_user.is_admin:
        return jsonify({'status': 'error', 'message': 'Permission denied.'}), 403

    car.is_active = not car.is_active
    db.session.commit()

    status_text = 'Active' if car.is_active else 'Inactive'
    flash(f'Listing for "{car.year} {car.make} {car.model}" is now {status_text.lower()}.', 'success')
    return jsonify({'status': 'success', 'is_active': car.is_active, 'status_text': status_text})