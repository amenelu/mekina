from flask import Blueprint, render_template, redirect, url_for, flash, abort, request
from flask_login import login_required, current_user
from models import db
from models.rental_listing import RentalListing
from models.user import User
from models.car import Car
from models.auction import Auction
from models.equipment import Equipment
from models.car_image import CarImage
from routes.seller import CarSubmissionForm, save_seller_document
from datetime import datetime
from functools import wraps

from flask_wtf import FlaskForm
from wtforms import StringField, BooleanField, SubmitField, IntegerField
from wtforms.validators import DataRequired, Email, Optional, NumberRange

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

# Custom decorator to check for admin privileges
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin:
            abort(403) # Forbidden
        return f(*args, **kwargs)
    return decorated_function

class EditUserForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired()])
    email = StringField('Email', validators=[DataRequired(), Email()])
    is_dealer = BooleanField('Is Dealer')
    is_rental_company = BooleanField('Is Rental Company')
    is_admin = BooleanField('Is Admin')
    points = IntegerField('Points', validators=[Optional(), NumberRange(min=0)])
    submit = SubmitField('Update User')

@admin_bp.route('/dashboard')
@login_required
@admin_required
def dashboard():
    stats = {
        'user_count': User.query.count(),
        'active_auction_count': Auction.query.filter(Auction.end_time > db.func.now()).count(),
        'pending_approval_count': Car.query.filter_by(is_approved=False).count()
    }
    cars_pending_approval = Car.query.filter_by(is_approved=False).order_by(Car.id.desc()).all()
    return render_template('dashboard.html', stats=stats, cars=cars_pending_approval)


@admin_bp.route('/users')
@login_required
@admin_required
def user_management():
    """Displays a list of all users for the admin."""
    users = User.query.order_by(User.id.asc()).all()
    return render_template('user_management.html', users=users)


@admin_bp.route('/users/edit/<int:user_id>', methods=['GET', 'POST'])
@login_required
@admin_required
def edit_user(user_id):
    """Allows an admin to edit a user's roles and points."""
    user_to_edit = User.query.get_or_404(user_id)
    form = EditUserForm(obj=user_to_edit)

    if form.validate_on_submit():
        # Prevent admin from accidentally removing their own admin status
        if user_to_edit.id == current_user.id and not form.is_admin.data:
            flash('You cannot remove your own admin status.', 'danger')
            return redirect(url_for('admin.edit_user', user_id=user_id))

        user_to_edit.username = form.username.data
        user_to_edit.email = form.email.data
        user_to_edit.is_dealer = form.is_dealer.data
        user_to_edit.is_rental_company = form.is_rental_company.data
        user_to_edit.is_admin = form.is_admin.data
        user_to_edit.points = form.points.data

        db.session.commit()
        flash(f'User {user_to_edit.username} has been updated.', 'success')
        return redirect(url_for('admin.user_management'))

    return render_template('edit_user.html', form=form, user=user_to_edit)

# --- Dummy routes from your templates that need to exist ---
# You can fill these in later.

@admin_bp.route('/add_car')
@login_required
@admin_required
def add_car():
    flash('Add car functionality not implemented yet.', 'info')
    return redirect(url_for('admin.dashboard'))

@admin_bp.route('/listing/edit/<int:car_id>', methods=['GET', 'POST'])
@login_required
@admin_required
def edit_listing(car_id):
    """Allows an admin to edit any car listing (auction, sale, or rental)."""
    car = Car.query.get_or_404(car_id)
    auction = car.auction
    rental = car.rental_listing

    form = CarSubmissionForm(obj=car)
    form.submit.label.text = 'Update Listing'

    if request.method == 'GET':
        # Pre-populate listing-type specific fields
        form.listing_type.data = car.listing_type
        if car.listing_type == 'auction' and auction:
            form.start_price.data = auction.start_price
            form.end_time.data = auction.end_time
        elif car.listing_type == 'sale':
            form.fixed_price.data = car.fixed_price
        elif car.listing_type == 'rental' and rental:
            form.price_per_day.data = rental.price_per_day
        # Pre-populate equipment
        form.equipment.data = [e.name for e in car.equipment]

    if form.validate_on_submit():
        # Manually populate car fields to avoid errors with populate_obj
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

        # Update listing-specific details
        car.listing_type = form.listing_type.data
        if car.listing_type == 'auction' and auction:
            auction.start_price = form.start_price.data
            if not auction.bids and form.start_price.data:
                 auction.current_price = form.start_price.data
            auction.end_time = form.end_time.data
        elif car.listing_type == 'sale':
            # Ensure other listing types are nullified if they exist
            if auction: auction.start_price = None
            car.fixed_price = form.fixed_price.data
        elif car.listing_type == 'rental' and rental:
            # Ensure other listing types are nullified if they exist
            if auction: auction.start_price = None
            rental.price_per_day = form.price_per_day.data

        # Update equipment
        car.equipment.clear()
        for item_name in form.equipment.data:
            equipment_item = Equipment.query.filter_by(name=item_name).first()
            if equipment_item:
                car.equipment.append(equipment_item)

        # If new images are uploaded, replace the old ones
        if form.images.data and form.images.data[0].filename:
            CarImage.query.filter_by(car_id=car.id).delete()
            for image_file in form.images.data:
                image_url = save_seller_document(image_file)
                if image_url:
                    new_image = CarImage(image_url=image_url, car_id=car.id)
                    db.session.add(new_image)

        db.session.commit()
        flash(f'Listing for "{car.year} {car.make} {car.model}" has been updated successfully.', 'success')
        return redirect(url_for('auctions.list_auctions'))

    return render_template('submit_car.html', title=f'Admin Edit: {car.year} {car.make} {car.model}', form=form)

@admin_bp.route('/approve_car/<int:car_id>', methods=['POST'])
@login_required
@admin_required
def approve_car(car_id):
    car = Car.query.get_or_404(car_id)
    car.is_approved = True
    db.session.commit()
    flash(f'Car {car.make} {car.model} has been approved.', 'success')
    return redirect(url_for('admin.dashboard'))

@admin_bp.route('/listing/delete/<int:car_id>', methods=['POST'])
@login_required
@admin_required
def delete_listing(car_id):
    """Allows an admin to delete a car and its associated listing."""
    car = Car.query.get_or_404(car_id)

    # The Car model's relationships have cascades to delete related items
    db.session.delete(car)
    db.session.commit()
    flash(f'The listing for "{car.year} {car.make} {car.model}" has been permanently deleted.', 'success')
    return redirect(url_for('auctions.list_auctions'))