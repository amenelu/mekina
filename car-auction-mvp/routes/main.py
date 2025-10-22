from flask import Blueprint, render_template, abort
from flask_login import current_user
from models.car import Car
from models.notification import Notification
from sqlalchemy import or_

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def home():
    featured_cars = Car.query.filter_by(is_featured=True, is_approved=True).all()
    return render_template('home.html', featured_cars=featured_cars)

@main_bp.route('/notifications')
def notifications():
    # A placeholder for a future notifications page
    user_notifications = Notification.query.filter_by(user_id=current_user.id).order_by(Notification.timestamp.desc()).all()
    return render_template('notifications.html', notifications=user_notifications)

@main_bp.route('/how-it-works')
def how_it_works():
    """Displays the 'How It Works' informational page."""
    return render_template('how_it_works.html')

@main_bp.route('/all-listings')
def all_listings():
    """Displays a page with all types of listings, filterable via JS."""
    return render_template('all_listings.html')

@main_bp.route('/car/<int:car_id>')
def car_detail(car_id):
    """Displays details for a car that is for fixed-price sale."""
    car = Car.query.get_or_404(car_id)

    # Security check: Only show approved cars that are for sale
    if (not car.is_approved and not (current_user.is_authenticated and current_user.is_admin)) or car.listing_type != 'sale':
        abort(404)

    # --- Similar Cars Logic ---
    similar_cars = []
    similarity_reason = ""
    base_query = Car.query.filter(
        Car.id != car_id,
        Car.is_approved == True,
        Car.listing_type == 'sale'
    )

    # 1. Try same Make and Model
    similar_cars = base_query.filter(Car.make == car.make, Car.model == car.model).limit(4).all()
    if similar_cars:
        similarity_reason = f"More {car.make} {car.model} Models"

    # 2. If not enough, try same Make
    if not similar_cars:
        similar_cars = base_query.filter(Car.make == car.make).limit(4).all()
        if similar_cars:
            similarity_reason = f"More from {car.make}"

    # 3. As a last resort, show any other cars for sale
    if not similar_cars:
        similar_cars = base_query.limit(4).all()
        if similar_cars:
            similarity_reason = "Other Cars For Sale"

    return render_template(
        'car_detail_sale.html',
        car=car,
        similar_cars=similar_cars,
        similarity_reason=similarity_reason
    )