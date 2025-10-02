from functools import wraps
from flask import Blueprint, render_template, flash, redirect, url_for, abort
from flask_login import login_required, current_user
from models.car import Car
from app import db

admin_bp = Blueprint('admin', __name__)

# Custom decorator to check for admin privileges
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin:
            abort(403) # Forbidden
        return f(*args, **kwargs)
    return decorated_function

@admin_bp.route('/dashboard')
@login_required
@admin_required
def dashboard():
    unapproved_cars = Car.query.filter_by(is_approved=False).all()
    return render_template('dashboard.html', cars=unapproved_cars)

@admin_bp.route('/approve_car/<int:car_id>', methods=['POST'])
@login_required
@admin_required
def approve_car(car_id):
    car = Car.query.get_or_404(car_id)
    car.is_approved = True
    db.session.commit()
    flash(f'The car "{car.year} {car.make} {car.model}" has been approved.', 'success')
    return redirect(url_for('admin.dashboard'))