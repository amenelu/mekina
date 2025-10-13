from flask import Blueprint, render_template
from models.car import Car
from models.rental_listing import RentalListing

rentals_bp = Blueprint('rentals', __name__, url_prefix='/rentals')

@rentals_bp.route('/')
def list_rentals():
    """Displays a list of all available rental cars."""
    rental_cars = Car.query.join(RentalListing).filter(
        Car.is_approved == True,
        RentalListing.is_available == True
    ).order_by(Car.id.desc()).all()
    
    return render_template('rental_list.html', rentals=rental_cars)