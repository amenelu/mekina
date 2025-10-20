from flask import Blueprint, render_template, abort, jsonify
from flask_login import login_required, current_user
from models.rental_listing import RentalListing
from models.car import Car
from functools import wraps
from models import db

rentals_bp = Blueprint('rentals', __name__, url_prefix='/rentals')

# Custom decorator to check for rental company privileges
def rental_company_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_rental_company:
            abort(403) # Forbidden
        return f(*args, **kwargs)
    return decorated_function

@rentals_bp.route('/dashboard')
@login_required
@rental_company_required
def dashboard():
    """Dashboard for rental companies to see their listings."""
    my_rental_cars = Car.query.filter_by(owner_id=current_user.id, listing_type='rental').order_by(Car.id.desc()).all()
    return render_template('rental_dashboard.html', my_rental_cars=my_rental_cars)

@rentals_bp.route('/toggle_availability/<int:listing_id>', methods=['POST'])
@login_required
@rental_company_required
def toggle_availability(listing_id):
    """Toggles the availability of a rental listing."""
    listing = RentalListing.query.get_or_404(listing_id)

    # Security check: ensure the current user owns this listing
    if listing.car.owner_id != current_user.id:
        return jsonify({'status': 'error', 'message': 'Permission denied.'}), 403

    listing.is_available = not listing.is_available
    db.session.commit()

    return jsonify({'status': 'success', 'is_available': listing.is_available})


@rentals_bp.route('/')
def list_rentals():
    """Displays a list of all cars available for rent."""
    # This is a placeholder page. You can build a full-featured rental list later.
    listings = RentalListing.query.join(Car).filter(Car.is_approved == True).all()
    return render_template('rental_list.html', listings=listings)

@rentals_bp.route('/<int:listing_id>')
def rental_detail(listing_id):
    """Displays the detail page for a single rental listing."""
    listing = RentalListing.query.get_or_404(listing_id)
    if not listing.car.is_approved and not (current_user.is_authenticated and current_user.is_admin):
        abort(404)
    return render_template('rental_detail.html', listing=listing)