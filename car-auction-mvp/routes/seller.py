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
import base64
from io import BytesIO

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

    # Bank Loan
    is_bank_loan_available = BooleanField('Available with Bank Loan')

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

def save_base64_image(base64_string, filename_prefix="img"):
    """Helper function to save a base64 encoded image."""
    if not base64_string:
        return None

    try:
        # Extract base64 data (remove data:image/jpeg;base64, prefix if present)
        if ';base64,' in base64_string:
            header, base64_data = base64_string.split(';base64,', 1)
            extension = header.split('/')[-1] # e.g., jpeg, png
        else:
            base64_data = base64_string
            extension = 'png' # Default to png if no header

        img_data = base64.b64decode(base64_data)
        filename = f"{filename_prefix}_{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}.{extension}"
        upload_path = os.path.join(current_app.root_path, 'static/uploads')
        os.makedirs(upload_path, exist_ok=True)
        file_path = os.path.join(upload_path, filename)
        with open(file_path, 'wb') as f:
            f.write(img_data)
        return url_for('static', filename=f'uploads/{filename}')
    except Exception as e:
        current_app.logger.error(f"Error saving base664 image: {e}")
        return None


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

@seller_bp.route('/api/dashboard')
@login_required
def api_seller_dashboard():
    """API endpoint for seller dashboard data."""
    my_cars = Car.query.filter_by(owner_id=current_user.id).order_by(Car.id.desc()).all()
    my_car_ids = [car.id for car in my_cars]
    
    my_auctions = Auction.query.filter(Auction.car_id.in_(my_car_ids)).all()
    my_auction_ids = [auction.id for auction in my_auctions]

    unanswered_questions = Question.query.filter(
        Question.auction_id.in_(my_auction_ids),
        Question.answer_text == None
    ).order_by(Question.timestamp.desc()).all()

    return jsonify(
        my_cars=[car.to_dict() for car in my_cars],
        unanswered_questions=[q.to_dict() for q in unanswered_questions],
        # You might want to add more stats here, like total listings, pending approvals, etc.
        # For now, just the core data.
    )


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
            is_bank_loan_available=form.is_bank_loan_available.data,
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

@seller_bp.route('/api/cars', methods=['POST'])
@login_required
def api_submit_car():
    """API endpoint for submitting a new car listing."""
    data = request.get_json()
    if not data:
        return jsonify({'status': 'error', 'message': 'Invalid JSON payload.'}), 400

    # Basic validation (more comprehensive validation would be needed)
    required_fields = ['make', 'model', 'year', 'condition', 'body_type', 'transmission', 'drivetrain', 'fuel_type', 'listing_type']
    if not all(field in data for field in required_fields):
        return jsonify({'status': 'error', 'message': 'Missing required car details.'}), 400

    listing_type = data.get('listing_type')
    if listing_type == 'auction' and (not data.get('start_price') or not data.get('end_time')):
        return jsonify({'status': 'error', 'message': 'Auction requires start price and end time.'}), 400
    if listing_type == 'sale' and not data.get('fixed_price'):
        return jsonify({'status': 'error', 'message': 'Fixed price sale requires a price.'}), 400
    if listing_type == 'rental' and not data.get('price_per_day'):
        return jsonify({'status': 'error', 'message': 'Rental requires price per day.'}), 400

    new_car = Car(
        make=data.get('make'),
        model=data.get('model'),
        year=data.get('year'),
        description=data.get('description'),
        condition=data.get('condition'),
        body_type=data.get('body_type'),
        mileage=data.get('mileage'),
        transmission=data.get('transmission'),
        drivetrain=data.get('drivetrain'),
        fuel_type=data.get('fuel_type'),
        owner_id=current_user.id,
        listing_type=listing_type,
        is_bank_loan_available=data.get('is_bank_loan_available', False),
        fixed_price=data.get('fixed_price') if listing_type == 'sale' else None,
        is_approved=False # All seller submissions must be approved
    )
    db.session.add(new_car)
    db.session.flush()

    # Add equipment
    for item_name in data.get('equipment', []):
        equipment_item = Equipment.query.filter_by(name=item_name).first()
        if equipment_item:
            new_car.equipment.append(equipment_item)

    # Handle images (expecting a list of base64 strings or URLs)
    image_urls = []
    for img_data in data.get('images', []):
        if img_data.startswith('data:image') or len(img_data) > 200: # Heuristic for base64
            image_url = save_base64_image(img_data, filename_prefix=f"car_{new_car.id}")
        else: # Assume it's already a URL
            image_url = img_data
        if image_url:
            new_image = CarImage(image_url=image_url, car_id=new_car.id)
            db.session.add(new_image)
            image_urls.append(image_url)

    if listing_type == 'auction':
        new_auction = Auction(
            start_price=data.get('start_price'), current_price=data.get('start_price'),
            end_time=datetime.fromisoformat(data['end_time'].replace('Z', '+00:00')), # Expect ISO format
            car_id=new_car.id
        )
        db.session.add(new_auction)
    elif listing_type == 'rental':
        new_rental = RentalListing(price_per_day=data.get('price_per_day'), car_id=new_car.id)
        db.session.add(new_rental)

    db.session.commit()
    return jsonify({'status': 'success', 'message': 'Car submitted for approval.', 'car': new_car.to_dict()}), 201

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
        car.is_bank_loan_available = form.is_bank_loan_available.data

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

@seller_bp.route('/api/cars/<int:car_id>', methods=['GET', 'PUT', 'DELETE'])
@login_required
def api_manage_car(car_id):
    """API endpoint for managing a single car listing (GET, PUT, DELETE)."""
    car = Car.query.get_or_404(car_id)

    # Security check: only owner or admin can manage
    if car.owner_id != current_user.id and not current_user.is_admin:
        return jsonify({'status': 'error', 'message': 'Permission denied.'}), 403

    if request.method == 'GET':
        return jsonify(car=car.to_dict())

    elif request.method == 'PUT':
        if car.is_approved and not current_user.is_admin:
            return jsonify({'status': 'error', 'message': 'Cannot edit an approved car.'}), 403

        data = request.get_json()
        if not data:
            return jsonify({'status': 'error', 'message': 'Invalid JSON payload.'}), 400

        # Update car fields
        car.make = data.get('make', car.make)
        car.model = data.get('model', car.model)
        car.year = data.get('year', car.year)
        car.description = data.get('description', car.description)
        car.condition = data.get('condition', car.condition)
        car.body_type = data.get('body_type', car.body_type)
        car.mileage = data.get('mileage', car.mileage)
        car.transmission = data.get('transmission', car.transmission)
        car.drivetrain = data.get('drivetrain', car.drivetrain)
        car.fuel_type = data.get('fuel_type', car.fuel_type)
        car.is_bank_loan_available = data.get('is_bank_loan_available', car.is_bank_loan_available)
        car.is_featured = data.get('is_featured', car.is_featured) # Admin only

        # Update listing-specific details
        listing_type = data.get('listing_type', car.listing_type)
        if listing_type != car.listing_type:
            # Handle change in listing type (delete old, create new)
            if car.auction: db.session.delete(car.auction)
            if car.rental_listing: db.session.delete(car.rental_listing)
            car.fixed_price = None

            if listing_type == 'auction':
                new_auction = Auction(car_id=car.id, start_price=data.get('start_price'), current_price=data.get('start_price'), end_time=datetime.fromisoformat(data['end_time'].replace('Z', '+00:00')))
                db.session.add(new_auction)
            elif listing_type == 'sale':
                car.fixed_price = data.get('fixed_price')
            elif listing_type == 'rental':
                new_rental = RentalListing(car_id=car.id, price_per_day=data.get('price_per_day'))
                db.session.add(new_rental)
        else:
            # Update existing listing details
            if car.listing_type == 'auction' and car.auction:
                car.auction.start_price = data.get('start_price', car.auction.start_price)
                if not car.auction.bids: car.auction.current_price = data.get('start_price', car.auction.current_price)
                car.auction.end_time = datetime.fromisoformat(data['end_time'].replace('Z', '+00:00')) if data.get('end_time') else car.auction.end_time
            elif car.listing_type == 'sale':
                car.fixed_price = data.get('fixed_price', car.fixed_price)
            elif car.listing_type == 'rental' and car.rental_listing:
                car.rental_listing.price_per_day = data.get('price_per_day', car.rental_listing.price_per_day)
        car.listing_type = listing_type

        # Update equipment
        if 'equipment' in data:
            car.equipment.clear()
            for item_name in data['equipment']:
                equipment_item = Equipment.query.filter_by(name=item_name).first()
                if equipment_item: car.equipment.append(equipment_item)

        # Handle images (clear existing, add new from base64 or URLs)
        if 'images' in data:
            CarImage.query.filter_by(car_id=car.id).delete()
            for img_data in data['images']:
                image_url = save_base64_image(img_data, filename_prefix=f"car_{car.id}_edit") if img_data.startswith('data:image') else img_data
                if image_url: db.session.add(CarImage(image_url=image_url, car_id=car.id))

        db.session.commit()
        return jsonify({'status': 'success', 'message': 'Listing updated successfully.', 'car': car.to_dict()})

    elif request.method == 'DELETE':
        if car.is_approved and not current_user.is_admin:
            return jsonify({'status': 'error', 'message': 'Cannot delete an approved car.'}), 403
        db.session.delete(car)
        db.session.commit()
        return jsonify({'status': 'success', 'message': 'Listing deleted successfully.'})

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