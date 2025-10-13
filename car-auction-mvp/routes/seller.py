import os
from flask import Blueprint, render_template, redirect, url_for, flash, request, current_app
from flask_login import login_required, current_user
from models.car import Car
from models.question import Question
from models.auction import Auction
from models.rental_listing import RentalListing
from models.equipment import Equipment
from models.car_image import CarImage
from app import db
from datetime import datetime
from werkzeug.utils import secure_filename

from flask_wtf import FlaskForm
from wtforms import StringField, IntegerField, TextAreaField, SubmitField, FloatField, SelectField, SelectMultipleField, widgets, RadioField
from wtforms.fields import DateTimeLocalField, MultipleFileField
from wtforms.validators import DataRequired, Length, NumberRange

seller_bp = Blueprint('seller', __name__, url_prefix='/seller')

class CarSubmissionForm(FlaskForm):
    make = StringField('Make', validators=[DataRequired()])
    model = StringField('Model', validators=[DataRequired()])
    year = IntegerField('Year', validators=[DataRequired(), NumberRange(min=1900, max=datetime.now().year + 1)])
    description = TextAreaField('Description', validators=[DataRequired()])
    images = MultipleFileField('Car Photos (select multiple)')
    condition = SelectField('Condition', choices=[('Used', 'Used'), ('New', 'New')], validators=[DataRequired()])
    body_type = SelectField('Body Type', choices=[('SUV', 'SUV'), ('Sedan', 'Sedan'), ('Hatchback', 'Hatchback'), ('Pickup', 'Pickup Truck')], validators=[DataRequired()])
    mileage = IntegerField('Mileage', validators=[DataRequired(), NumberRange(min=0)])
    transmission = SelectField('Transmission', choices=[('Automatic', 'Automatic'), ('Manual', 'Manual')], validators=[DataRequired()])
    drivetrain = SelectField('Drivetrain', choices=[('FWD', 'FWD'), ('RWD', 'RWD'), ('AWD', 'AWD'), ('4WD', '4WD')], validators=[DataRequired()])
    fuel_type = SelectField('Fuel Type', choices=[('Gasoline', 'Gasoline'), ('Diesel', 'Diesel'), ('Electric', 'Electric')], validators=[DataRequired()])
    equipment = SelectMultipleField('Features', choices=[
        ('sunroof', 'Sunroof'), ('leather_seats', 'Leather Seats'),
        ('apple_carplay', 'Apple CarPlay / Android Auto'), ('awd', 'All-Wheel Drive')
    ], widget=widgets.ListWidget(prefix_label=False), option_widget=widgets.CheckboxInput())
    listing_type = RadioField('Listing Type', choices=[('auction', 'Auction'), ('rental', 'Rental')], default='auction', validators=[DataRequired()])
    
    # Auction Details
    start_price = FloatField('Starting Price (ETB)', validators=[NumberRange(min=1)])
    end_time = DateTimeLocalField('Auction End Time', format='%Y-%m-%dT%H:%M')
    # Rental Details
    price_per_day = FloatField('Price Per Day (ETB)', validators=[NumberRange(min=1)])

    submit = SubmitField('Submit')

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

@seller_bp.route('/answer_question/<int:question_id>', methods=['GET', 'POST'])
@login_required
def answer_question(question_id):
    question = Question.query.get_or_404(question_id)
    auction = question.auction
    # Security check: ensure the current user owns the car in the auction
    if auction.car.owner_id != current_user.id:
        flash("You do not have permission to answer this question.", "danger")
        return redirect(url_for('seller.dashboard'))

    form = AnswerForm()
    if form.validate_on_submit():
        question.answer_text = form.answer_text.data
        question.answer_timestamp = datetime.utcnow()
        db.session.commit()

        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return jsonify({
                'status': 'success',
                'message': 'Your answer has been posted successfully!'
            })

        flash("Your answer has been posted.", "success")
        return redirect(url_for('auctions.auction_detail', auction_id=auction.id))

    return render_template('answer_question.html', form=form, question=question, auction=auction)

@seller_bp.route('/submit_car', methods=['GET', 'POST'])
@login_required
def submit_car():
    form = CarSubmissionForm()
    if form.validate_on_submit():
        # Create the Car object first
        new_car = Car(
            make=form.make.data,
            model=form.model.data,
            year=form.year.data,
            description=form.description.data,
            condition=form.condition.data,
            body_type=form.body_type.data,
            mileage=form.mileage.data,
            transmission=form.transmission.data,
            drivetrain=form.drivetrain.data,
            fuel_type=form.fuel_type.data,
            owner_id=current_user.id,
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
        if form.listing_type.data == 'auction':
            new_auction = Auction(
                start_price=form.start_price.data,
                current_price=form.start_price.data,
                end_time=form.end_time.data,
                car_id=new_car.id
            )
            db.session.add(new_auction)
        elif form.listing_type.data == 'rental':
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

    if request.method == 'GET':
        # Pre-populate auction-specific fields
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
        auction.start_price = form.start_price.data
        auction.current_price = form.start_price.data # Reset current price to new start price
        auction.end_time = form.end_time.data

        # Update equipment
        car.equipment.clear()
        for item_name in form.equipment.data:
            equipment_item = Equipment.query.filter_by(name=item_name).first()
            if equipment_item:
                car.equipment.append(equipment_item)

        # Add new images if any were uploaded
        for image_file in form.images.data:
            image_url = save_seller_document(image_file)
            if image_url:
                new_image = CarImage(image_url=image_url, car_id=car.id)
                db.session.add(new_image)

        db.session.commit()
        flash('Your submission has been updated.', 'success')
        return redirect(url_for('seller.dashboard'))

    return render_template('submit_car.html', title=f'Edit Submission: {car.year} {car.make}', form=form)