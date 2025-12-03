from flask import Blueprint, render_template, request, jsonify, url_for
from sqlalchemy import or_
from sqlalchemy.orm import joinedload
from models.car import Car
from extensions import db

rentals_bp = Blueprint('rentals', __name__, url_prefix='/rentals')

@rentals_bp.route('/')
def list_rentals():
    """Renders the main rental listings page with filters."""
    return render_template('rental_list.html')

@rentals_bp.route('/<int:listing_id>')
def rental_detail(listing_id):
    """
    Displays the detail page for a single rental listing.
    NOTE: This is a placeholder route. The actual car detail page might be
    handled by a different blueprint, but this is needed for url_for().
    """
    # You would typically have a dedicated template for rental details.
    # For now, we can redirect to the generic car detail page if it exists.
    from flask import redirect
    return redirect(url_for('main.car_detail', car_id=listing_id))

@rentals_bp.route('/api/car/<int:car_id>')
def api_rental_detail_by_car(car_id):
    """
    API endpoint to get rental details for a specific car ID.
    This is what the mobile app's detail screen will call.
    """
    car = Car.query.options(
        joinedload(Car.rental_listing),
        joinedload(Car.images)
    ).filter(
        Car.id == car_id,
        Car.listing_type == 'rental'
    ).first_or_404()

    # The mobile app expects a 'rental' key containing the car's data.
    rental_data = car.to_dict()
    # Add the price_display for consistency with the list view
    rental_data['price_display'] = f"{car.rental_listing.price_per_day:,.0f} ETB/day" if car.rental_listing else "N/A"

    return jsonify(rental=rental_data)

@rentals_bp.route('/api/filter')
def api_filter_rentals():
    """API endpoint to return filtered rental car data as JSON."""
    query = Car.query.filter(
        Car.is_approved == True,
        Car.is_active == True,
        Car.listing_type == 'rental',
    )

    # Apply filters from request arguments
    if q := request.args.get('q'):
        search_term = f"%{q}%"
        query = query.filter(or_(
            Car.make.ilike(search_term),
            Car.model.ilike(search_term),
            Car.year.like(search_term)
        ))

    if condition := request.args.get('condition'):
        query = query.filter(Car.condition == condition)
    if transmission := request.args.get('transmission'):
        query = query.filter(Car.transmission == transmission)
    if fuel_type := request.args.get('fuel_type'):
        query = query.filter(Car.fuel_type == fuel_type)
    if body_type := request.args.get('body_type'):
        query = query.filter(Car.body_type == body_type)
    if max_price := request.args.get('max_price', type=float):
        # Join with RentalListing to filter by price_per_day
        from models.rental_listing import RentalListing
        query = query.join(RentalListing).filter(RentalListing.price_per_day <= max_price)

    # Add sorting options if needed in the future
    query = query.order_by(Car.id.desc()).options(
        # Eager load the rental_listing to prevent N+1 queries
        joinedload(Car.rental_listing)
    )

    cars = query.all()

    results = [
        {
            'id': car.id,
            'year': car.year,
            'make': car.make,
            'model': car.model,
            'price_display': f"{car.rental_listing.price_per_day:,.2f} ETB/day" if car.rental_listing else "N/A",
            'image_url': car.primary_image_url or url_for('static', filename='img/default_car.png'),
            'detail_url': url_for('rentals.rental_detail', listing_id=car.id),
            'is_featured': car.is_featured,
            'listing_type': 'Rental'
        }
        for car in cars
    ]

    return jsonify(results)