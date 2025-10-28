from flask import Blueprint, render_template, abort, jsonify, request
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
    query = request.args.get('q', '').strip()
    if not query or len(query) < 2:
        return jsonify([])

    suggestions = set() # Use a set to automatically handle duplicates
    query_words = query.lower().split() # Split query into words for broader matching

    # Build dynamic OR conditions for make and model
    make_model_conditions = []
    for word in query_words:
        make_model_conditions.append(Car.make.ilike(f"%{word}%"))
        make_model_conditions.append(Car.model.ilike(f"%{word}%"))

    # 1. Prioritize exact make matches or makes starting with the query
    makes_starting = db.session.query(Car.make).filter(Car.make.ilike(f"{query}%")).distinct().limit(3).all()
    for make_tuple in makes_starting:
        suggestions.add(make_tuple[0])

    # 2. Find matching make + model combinations using word-based search
    cars = Car.query.filter(
        or_(*make_model_conditions)
    ).limit(15).all() # Increased limit to find more potential suggestions

    for car in cars:
        # Add just the make if it's a strong match
        if any(word in car.make.lower() for word in query_words):
            suggestions.add(car.make)
        
        # Add make + model if the model is a strong match
        if any(word in car.model.lower() for word in query_words):
            suggestions.add(f"{car.make} {car.model}")
        
        # Add make + model if both make and model contain parts of the query
        if any(word in car.make.lower() for word in query_words) and any(word in car.model.lower() for word in query_words):
            suggestions.add(f"{car.make} {car.model}")

    # Sort and limit results
    sorted_suggestions = sorted(list(suggestions), key=lambda x: (len(x), x)) # Sort by length then alphabetically
    
    return jsonify(sorted_suggestions[:8]) # Return up to 8 suggestions

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