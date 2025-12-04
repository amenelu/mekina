from flask import Blueprint, render_template, redirect, url_for, flash, abort, request, jsonify
from flask_login import login_required, current_user
from extensions import db, socketio
from sqlalchemy import func, or_
from models.rental_listing import RentalListing
from models.user import User
from models.car import Car
from models.auction import Auction
from models.notification import Notification
from models.equipment import Equipment
from models.dealer_review import DealerReview
from models.car_image import CarImage
from routes.seller import CarSubmissionForm, save_seller_document
from routes.auth import admin_token_required
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

@admin_bp.route('/api/dashboard')
@admin_token_required
def api_admin_dashboard(current_user):
    """API endpoint for admin dashboard statistics and pending approvals."""
    stats = {
        'user_count': User.query.count(),
        'active_auction_count': Auction.query.filter(Auction.end_time > db.func.now()).count(),
        'pending_approval_count': Car.query.filter_by(is_approved=False).count(),
        'for_sale_count': Car.query.filter_by(listing_type='sale', is_approved=True).count(),
        'for_rent_count': Car.query.filter_by(listing_type='rental', is_approved=True).count(),
    }
    cars_pending_approval = Car.query.filter_by(is_approved=False).order_by(Car.id.desc()).all()
    return jsonify(
        stats=stats,
        pending_approvals=[car.to_dict(include_owner=True) for car in cars_pending_approval]
    )


@admin_bp.route('/users')
@login_required
@admin_required
def user_management():
    """Displays a list of all non-dealer users for the admin."""
    query = request.args.get('q', '')
    page = request.args.get('page', 1, type=int)

    users_query = User.query.filter_by(is_dealer=False).order_by(User.id.asc())

    if query:
        search_term = f"%{query}%"
        users_query = users_query.filter(
            or_(User.username.ilike(search_term), User.email.ilike(search_term))
        )

    paginated_users = users_query.paginate(page=page, per_page=20)
    return render_template('user_management.html', users=paginated_users)

@admin_bp.route('/api/users')
@admin_token_required
def api_admin_list_users(current_user):
    """API endpoint for admin to search/filter all non-dealer users."""
    query = request.args.get('q', '')
    page = request.args.get('page', 1, type=int)

    users_query = User.query.filter_by(is_dealer=False).order_by(User.id.asc())

    if query:
        search_term = f"%{query}%"
        users_query = users_query.filter(
            or_(User.username.ilike(search_term), User.email.ilike(search_term))
        )

    paginated_users = users_query.paginate(page=page, per_page=20)

    users_data = [{
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'is_rental_company': user.is_rental_company,
        'is_admin': user.is_admin,
        'points': user.points or 0,
        'edit_url': url_for('admin.edit_user', user_id=user.id)
    } for user in paginated_users.items]

    return jsonify({
        'users': users_data,
        'pagination': { 'page': paginated_users.page, 'pages': paginated_users.pages, 'has_prev': paginated_users.has_prev, 'prev_num': paginated_users.prev_num, 'has_next': paginated_users.has_next, 'next_num': paginated_users.next_num }
    })


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

        # If the user is a dealer, redirect to their profile. Otherwise, go to the user list.
        if user_to_edit.is_dealer:
            return redirect(url_for('dealer.profile', dealer_id=user_to_edit.id))
        return redirect(url_for('admin.user_management'))

    return render_template('edit_user.html', form=form, user=user_to_edit)

@admin_bp.route('/api/users/<int:user_id>', methods=['GET', 'PUT', 'DELETE'])
@admin_token_required
def api_manage_user(current_user, user_id):
    """API endpoint for an admin to manage a single user (GET, PUT, DELETE)."""
    user = User.query.get_or_404(user_id)

    if request.method == 'GET':
        return jsonify(user=user.to_dict(detail_level='owner'))

    elif request.method == 'PUT':
        data = request.get_json()
        if not data:
            return jsonify({'status': 'error', 'message': 'Invalid JSON payload.'}), 400

        # Prevent admin from accidentally removing their own admin status
        if user.id == current_user.id and not data.get('is_admin', user.is_admin):
            return jsonify({'status': 'error', 'message': 'You cannot remove your own admin status.'}), 403

        # Update fields from payload
        user.username = data.get('username', user.username)
        user.email = data.get('email', user.email)
        user.is_dealer = data.get('is_dealer', user.is_dealer)
        user.is_rental_company = data.get('is_rental_company', user.is_rental_company)
        user.is_admin = data.get('is_admin', user.is_admin)
        user.points = data.get('points', user.points)

        # Validate to prevent duplicates if username/email changed
        if 'username' in data and User.query.filter(User.username == user.username, User.id != user.id).first():
            return jsonify({'status': 'error', 'message': 'Username already exists.'}), 409
        if 'email' in data and User.query.filter(User.email == user.email, User.id != user.id).first():
            return jsonify({'status': 'error', 'message': 'Email already exists.'}), 409

        db.session.commit()
        return jsonify({'status': 'success', 'message': 'User updated successfully.', 'user': user.to_dict(detail_level='admin')})

    elif request.method == 'DELETE':
        if user.id == current_user.id:
            return jsonify({'status': 'error', 'message': 'You cannot delete your own account.'}), 403
        
        # Add any other pre-delete checks here (e.g., reassigning listings)
        
        db.session.delete(user)
        db.session.commit()
        return jsonify({'status': 'success', 'message': 'User deleted successfully.'})


# --- Dummy routes from your templates that need to exist ---
# You can fill these in later.

@admin_bp.route('/add_car')
@login_required
@admin_required
def add_car():
    flash('Add car functionality not implemented yet.', 'info')
    return redirect(url_for('admin.dashboard'))

@admin_bp.route('/dealers')
@login_required
@admin_required
def dealer_management():
    """Displays a list of all dealers with statistics."""
    # Subquery for active listings count per dealer
    active_listings_sub = db.session.query(
        Car.owner_id, func.count(Car.id).label('active_listings')
    ).filter(Car.is_active == True, Car.is_approved == True).group_by(Car.owner_id).subquery()

    # Subquery for review stats per dealer
    review_stats_sub = db.session.query(
        DealerReview.dealer_id,
        func.avg(DealerReview.rating).label('avg_rating'),
        func.count(DealerReview.id).label('review_count')
    ).group_by(DealerReview.dealer_id).subquery()

    dealers_with_stats = db.session.query(
        User,
        func.coalesce(active_listings_sub.c.active_listings, 0).label('active_listings'),
        func.coalesce(review_stats_sub.c.avg_rating, 0).label('avg_rating'),
        func.coalesce(review_stats_sub.c.review_count, 0).label('review_count')
    ).outerjoin(active_listings_sub, User.id == active_listings_sub.c.owner_id)\
     .outerjoin(review_stats_sub, User.id == review_stats_sub.c.dealer_id)\
     .filter(User.is_dealer == True).order_by(User.username).all()

    return render_template('dealer_management.html', dealers_with_stats=dealers_with_stats)

@admin_bp.route('/api/dealers')
@admin_token_required
def api_admin_list_dealers(current_user):
    """API endpoint for admin to search/filter all dealer users with stats."""
    query = request.args.get('q', '')
    page = request.args.get('page', 1, type=int)

    # Subquery for active listings count per dealer
    active_listings_sub = db.session.query(
        Car.owner_id, func.count(Car.id).label('active_listings')
    ).filter(Car.is_active == True, Car.is_approved == True).group_by(Car.owner_id).subquery()

    # Subquery for review stats per dealer
    review_stats_sub = db.session.query(
        DealerReview.dealer_id,
        func.avg(DealerReview.rating).label('avg_rating'),
        func.count(DealerReview.id).label('review_count')
    ).group_by(DealerReview.dealer_id).subquery()

    # Base query for dealers
    dealers_query = db.session.query(
        User,
        func.coalesce(active_listings_sub.c.active_listings, 0).label('active_listings'),
        func.coalesce(review_stats_sub.c.avg_rating, 0).label('avg_rating'),
        func.coalesce(review_stats_sub.c.review_count, 0).label('review_count')
    ).outerjoin(active_listings_sub, User.id == active_listings_sub.c.owner_id)\
     .outerjoin(review_stats_sub, User.id == review_stats_sub.c.dealer_id)\
     .filter(User.is_dealer == True)

    if query:
        search_term = f"%{query}%"
        dealers_query = dealers_query.filter(
            or_(User.username.ilike(search_term), User.email.ilike(search_term))
        )

    paginated_dealers = dealers_query.order_by(User.username).paginate(page=page, per_page=15)

    dealers_data = [{
        'id': dealer.id,
        'username': dealer.username,
        'email': dealer.email,
        'active_listings': active_listings,
        'avg_rating': float(avg_rating) if avg_rating else 0,
        'review_count': review_count,
        'profile_url': url_for('dealer.profile', dealer_id=dealer.id)
    } for dealer, active_listings, avg_rating, review_count in paginated_dealers.items]

    return jsonify({
        'dealers': dealers_data,
        'pagination': { 'page': paginated_dealers.page, 'pages': paginated_dealers.pages, 'has_prev': paginated_dealers.has_prev, 'prev_num': paginated_dealers.prev_num, 'has_next': paginated_dealers.has_next, 'next_num': paginated_dealers.next_num }
    })

@admin_bp.route('/rentals')
@login_required
@admin_required
def rental_management():
    """Displays a list of all rental cars for management."""
    page = request.args.get('page', 1, type=int)
    rental_cars = Car.query.filter_by(listing_type='rental').order_by(Car.id.desc()).paginate(page=page, per_page=15)
    return render_template('rental_management.html', cars=rental_cars)

@admin_bp.route('/api/rentals')
@admin_token_required
def api_admin_list_rentals(current_user):
    """API endpoint for admin to search/filter all rental listings."""
    query = request.args.get('q', '')
    page = request.args.get('page', 1, type=int)

    # Base query for rental cars
    cars_query = Car.query.filter_by(listing_type='rental').order_by(Car.id.desc())

    if query:
        search_term = f"%{query}%"
        # Join with User to search by owner username
        cars_query = cars_query.join(User).filter(
            or_(
                Car.make.ilike(search_term),
                Car.model.ilike(search_term),
                Car.year.like(search_term),
                User.username.ilike(search_term)
            )
        )

    paginated_cars = cars_query.paginate(page=page, per_page=15)

    cars_data = [{
        'id': car.id,
        'year': car.year,
        'make': car.make,
        'model': car.model,
        'owner_username': car.owner.username,
        'price_per_day': '{:,.2f}'.format(car.rental_listing.price_per_day) if car.rental_listing and car.rental_listing.price_per_day is not None else 'N/A',
        'is_approved': car.is_approved,
        'is_active': car.is_active,
        'edit_url': url_for('admin.edit_listing', car_id=car.id),
        'delete_url': url_for('admin.delete_listing', car_id=car.id)
    } for car in paginated_cars.items]

    return jsonify({
        'cars': cars_data,
        'pagination': { 'page': paginated_cars.page, 'pages': paginated_cars.pages, 'has_prev': paginated_cars.has_prev, 'prev_num': paginated_cars.prev_num, 'has_next': paginated_cars.has_next, 'next_num': paginated_cars.next_num }
    })

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

@admin_bp.route('/api/listings', methods=['POST'])
@admin_token_required
def api_create_listing(current_user):
    """API endpoint for an admin to create a new car listing."""
    data = request.get_json()
    if not data:
        return jsonify({'status': 'error', 'message': 'Invalid JSON payload.'}), 400

    # Basic validation
    required_fields = ['make', 'model', 'year', 'description', 'listing_type', 'owner_id']
    if not all(field in data for field in required_fields):
        return jsonify({'status': 'error', 'message': 'Missing required fields.'}), 400

    # Create the car object
    new_car = Car(
        make=data['make'],
        model=data['model'],
        year=data['year'],
        description=data['description'],
        listing_type=data['listing_type'],
        owner_id=data['owner_id'],
        is_approved=data.get('is_approved', True), # Admins can create approved listings directly
        is_active=data.get('is_active', True),
        is_featured=data.get('is_featured', False),
        condition=data.get('condition'),
        body_type=data.get('body_type'),
        mileage=data.get('mileage'),
        transmission=data.get('transmission'),
        drivetrain=data.get('drivetrain'),
        fuel_type=data.get('fuel_type')
    )
    db.session.add(new_car)

    # Create associated listing type
    if new_car.listing_type == 'auction':
        new_car.auction = Auction(start_price=data.get('start_price', 0), current_price=data.get('start_price', 0), end_time=datetime.fromisoformat(data['end_time']))
    elif new_car.listing_type == 'sale':
        new_car.fixed_price = data.get('fixed_price')
    elif new_car.listing_type == 'rental':
        new_car.rental_listing = RentalListing(price_per_day=data.get('price_per_day'))

    db.session.commit()
    return jsonify({'status': 'success', 'message': 'New listing created successfully.', 'car': new_car.to_dict()}), 201

@admin_bp.route('/api/listings/<int:car_id>', methods=['GET', 'PUT', 'POST', 'DELETE'])
@admin_token_required
def api_manage_listing(current_user, car_id):
    """Comprehensive API endpoint for an admin to manage a single car listing."""
    car = Car.query.get_or_404(car_id)

    if request.method == 'GET':
        # Manually construct the dictionary to handle potential missing relationships safely
        car_data = {
            'id': car.id,
            'make': car.make,
            'model': car.model,
            'year': car.year,
            'description': car.description,
            'listing_type': car.listing_type,
            'fixed_price': car.fixed_price,
            'is_approved': car.is_approved,
            'is_active': car.is_active,
            'owner': {'username': car.owner.username} if car.owner else None,
            'auction': {
                'current_price': car.auction.current_price,
                'end_time': car.auction.end_time.isoformat() if car.auction.end_time else None
            } if car.auction else None,
            'rental_listing': {'price_per_day': car.rental_listing.price_per_day} if car.rental_listing else None
        }
        return jsonify(car=car_data)

    elif request.method == 'PUT':
        # Update the listing from JSON data
        data = request.get_json()
        if not data:
            return jsonify({'status': 'error', 'message': 'Invalid JSON payload.'}), 400

        # Update basic car fields
        for field in ['make', 'model', 'year', 'description', 'condition', 'body_type', 'mileage', 'transmission', 'drivetrain', 'fuel_type', 'is_featured']:
            if field in data:
                setattr(car, field, data[field])

        # Handle listing type and price changes
        if 'listing_type' in data and data['listing_type'] != car.listing_type:
            # Clear old listing data
            if car.auction: db.session.delete(car.auction)
            if car.rental_listing: db.session.delete(car.rental_listing)
            car.fixed_price = None
            # Set new listing type
            car.listing_type = data['listing_type']

        if car.listing_type == 'auction':
            if not car.auction: car.auction = Auction(car_id=car.id)
            car.auction.start_price = data.get('start_price', car.auction.start_price)
            if not car.auction.bids: car.auction.current_price = car.auction.start_price
            if 'end_time' in data: car.auction.end_time = datetime.fromisoformat(data['end_time'])
        elif car.listing_type == 'sale':
            car.fixed_price = data.get('fixed_price', car.fixed_price)
        elif car.listing_type == 'rental':
            if not car.rental_listing: car.rental_listing = RentalListing(car_id=car.id)
            car.rental_listing.price_per_day = data.get('price_per_day', car.rental_listing.price_per_day)

        db.session.commit()
        return jsonify({'status': 'success', 'message': 'Listing updated successfully.', 'car': car.to_dict()})

    elif request.method == 'POST':
        # Handle actions like 'approve'
        data = request.get_json()
        action = data.get('action')

        if action == 'approve':
            car.is_approved = True
            # Logic to notify the seller
            message = f"Congratulations! Your listing for the {car.year} {car.make} {car.model} has been approved and is now live."
            notification = Notification(user_id=car.owner_id, message=message)
            db.session.add(notification)
            db.session.flush()
            notification.link = url_for('auctions.auction_detail', auction_id=car.auction.id, notification_id=notification.id) if car.auction else url_for('main.car_detail', car_id=car.id)
            db.session.commit()
            # Emit real-time notification
            unread_count = Notification.query.filter_by(user_id=car.owner_id, is_read=False).count()
            socketio.emit('new_notification', {'message': notification.message, 'link': notification.link, 'timestamp': notification.timestamp.isoformat() + 'Z', 'count': unread_count}, room=str(car.owner_id))
            return jsonify({'status': 'success', 'message': 'Car has been approved.'})
        
        return jsonify({'status': 'error', 'message': 'Invalid action.'}), 400

    elif request.method == 'DELETE':
        # Permanently delete the listing
        db.session.delete(car)
        db.session.commit()
        return jsonify({'status': 'success', 'message': 'Listing has been permanently deleted.'})

    return jsonify({'status': 'error', 'message': 'Method not supported.'}), 405