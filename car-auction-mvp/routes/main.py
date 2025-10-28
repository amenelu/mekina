from flask import Blueprint, render_template, abort, jsonify, request, url_for
from flask_login import current_user, login_required
from models.car import Car
from models.notification import Notification
from models import db
from sqlalchemy import or_, func

def get_similar_cars(car, listing_type_filter):
    """
    Finds similar cars based on a hierarchy of criteria and returns them
    along with a descriptive reason for the similarity.
    """
    similar_cars_dict = {}
    base_query = Car.query.filter(
        Car.id != car.id,
        Car.is_approved == True,
        Car.listing_type == listing_type_filter,
        Car.is_active == True
    )

    def add_cars(cars_list):
        for c in cars_list:
            if len(similar_cars_dict) < 4 and c.id not in similar_cars_dict:
                similar_cars_dict[c.id] = c

    # 1. Same Make and Model
    add_cars(base_query.filter(Car.make == car.make, Car.model == car.model).all())
    if len(similar_cars_dict) > 0:
        return list(similar_cars_dict.values())[:4], f"More {car.make} {car.model} Models"

    # 2. Same Make and Body Type
    add_cars(base_query.filter(Car.make == car.make, Car.body_type == car.body_type).all())
    if len(similar_cars_dict) > 0:
        return list(similar_cars_dict.values())[:4], f"More {car.make} {car.body_type}s"

    # 3. Same Make
    add_cars(base_query.filter(Car.make == car.make).all())
    if len(similar_cars_dict) > 0:
        return list(similar_cars_dict.values())[:4], f"More from {car.make}"

    # 4. Fallback to any other random cars
    add_cars(base_query.order_by(func.random()).limit(4).all())
    return list(similar_cars_dict.values())[:4], "Other Available Listings"

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def home():
    featured_cars = Car.query.filter_by(is_featured=True, is_approved=True, is_active=True).all()
    return render_template('home.html', featured_cars=featured_cars)

@main_bp.route('/notifications')
@login_required
def notifications():
    """Displays a user's notifications and marks them as read."""
    # Mark all unread notifications as read when the user visits the page
    unread = Notification.query.filter_by(user_id=current_user.id, is_read=False)
    for notification in unread:
        notification.is_read = True
    db.session.commit()
    user_notifications = Notification.query.filter_by(user_id=current_user.id).order_by(Notification.timestamp.desc()).limit(50).all()
    return render_template('notifications.html', notifications=user_notifications)

@main_bp.route('/api/search_suggestions')
def search_suggestions():
    """Provides search suggestions for makes and models."""
    q = request.args.get('q', '').strip()
    if not q or len(q) < 2:
        return jsonify([])

    search_terms = q.lower().split()
    conditions = []
    for term in search_terms:
        conditions.append(Car.make.ilike(f"%{term}%"))
        conditions.append(Car.model.ilike(f"%{term}%"))
        if term.isdigit():
            conditions.append(Car.year == int(term))

    if not conditions:
        return jsonify([])

    # Find cars that match the search terms
    query = Car.query.filter(or_(*conditions))

    # Apply quick filters to the suggestions
    if condition := request.args.get('condition'):
        query = query.filter(Car.condition == condition)
    if fuel_type := request.args.get('fuel_type'):
        query = query.filter(Car.fuel_type == fuel_type)
    if body_type := request.args.get('body_type'):
        query = query.filter(Car.body_type == body_type)
    if max_price := request.args.get('max_price', type=float):
        # This filter needs to check both fixed_price and auction price
        query = query.outerjoin(Car.auction).filter(or_(Car.fixed_price <= max_price, Car.auction.current_price <= max_price))

    cars = query.limit(5).all()

    results = []
    for car in cars:
        detail_url = ''
        if car.listing_type == 'auction' and car.auction:
            detail_url = url_for('auctions.auction_detail', auction_id=car.auction.id)
        elif car.listing_type == 'sale':
            detail_url = url_for('main.car_detail', car_id=car.id)
        elif car.listing_type == 'rental' and car.rental_listing:
            detail_url = url_for('rentals.rental_detail', listing_id=car.rental_listing.id)

        results.append({
            'year': car.year,
            'make': car.make,
            'model': car.model,
            'image_url': car.primary_image_url or url_for('static', filename='img/default_car.png'),
            'detail_url': detail_url
        })

    return jsonify(results)

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

    similar_cars, similarity_reason = get_similar_cars(car, 'sale')

    return render_template(
        'car_detail_sale.html',
        car=car,
        similar_cars=similar_cars,
        similarity_reason=similarity_reason
    )