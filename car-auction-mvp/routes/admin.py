from flask import Blueprint, render_template, redirect, url_for, flash, abort, request
from flask_login import login_required, current_user
from extensions import db, socketio
from models.rental_listing import RentalListing
from models.user import User
from models.car import Car
from models.auction import Auction
from models.notification import Notification
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
        'pending_approval_count': Car.query.filter_by(is_approved=False).count(),
        'for_sale_count': Car.query.filter_by(listing_type='sale', is_approved=True).count(),
        'for_rent_count': Car.query.filter_by(listing_type='rental', is_approved=True).count(),
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

@admin_bp.route('/rentals')
@login_required
@admin_required
def rental_management():
    """Displays a list of all rental cars for management."""
    page = request.args.get('page', 1, type=int)
    rental_cars = Car.query.filter_by(listing_type='rental').order_by(Car.id.desc()).paginate(page=page, per_page=15)
    return render_template('rental_management.html', cars=rental_cars)

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

        car.is_featured = form.is_featured.data

        # Update listing-specific details
        original_listing_type = car.listing_type
        car.listing_type = form.listing_type.data

        if original_listing_type != car.listing_type:
            # Listing type has changed, we need to create/delete associated objects
            if original_listing_type == 'auction' and auction: db.session.delete(auction)
            if original_listing_type == 'rental' and rental: db.session.delete(rental)
            if original_listing_type == 'sale': car.fixed_price = None

            if car.listing_type == 'auction':
                from datetime import timedelta
                new_auction = Auction(car_id=car.id, start_price=form.start_price.data, current_price=form.start_price.data, end_time=form.end_time.data or (datetime.utcnow() + timedelta(days=7)))
                db.session.add(new_auction)
            elif car.listing_type == 'sale':
                car.fixed_price = form.fixed_price.data
            elif car.listing_type == 'rental':
                new_rental = RentalListing(car_id=car.id, price_per_day=form.price_per_day.data)
                db.session.add(new_rental)
        else:
            # Listing type is the same, just update the values
            if car.listing_type == 'auction' and auction:
                auction.start_price = form.start_price.data
                if not auction.bids and form.start_price.data:
                     auction.current_price = form.start_price.data
                auction.end_time = form.end_time.data
            elif car.listing_type == 'sale':
                car.fixed_price = form.fixed_price.data
            elif car.listing_type == 'rental' and rental:
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

    # --- Notify the seller ---
    if car.listing_type == 'auction' and car.auction:
        link = url_for('auctions.auction_detail', auction_id=car.auction.id)
    elif car.listing_type == 'sale':
        link = url_for('main.car_detail', car_id=car.id)
    elif car.listing_type == 'rental' and car.rental_listing:
        link = url_for('rentals.rental_detail', listing_id=car.rental_listing.id)
    else:
        link = url_for('main.home')
    message = f"Congratulations! Your listing for the {car.year} {car.make} {car.model} has been approved and is now live."
    new_notification = Notification(user_id=car.owner_id, message=message)
    db.session.add(new_notification)
    db.session.flush() # Get ID
    new_notification.link = url_for('auctions.auction_detail', auction_id=car.auction.id, notification_id=new_notification.id) if car.auction else link
    db.session.commit()

    # --- Real-time Notification ---
    unread_count = Notification.query.filter_by(user_id=car.owner_id, is_read=False).count()
    notification_data = {
        'message': new_notification.message,
        'link': new_notification.link,
        'timestamp': new_notification.timestamp.isoformat() + 'Z',
        'count': unread_count
    }
    socketio.emit('new_notification', notification_data, room=str(car.owner_id))

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