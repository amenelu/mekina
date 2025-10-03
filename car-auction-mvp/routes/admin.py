from functools import wraps
from flask import Blueprint, render_template, flash, redirect, url_for, abort
from flask_login import login_required, current_user
from models.car import Car
from models.user import User
from models.auction import Auction
from app import db
from datetime import datetime

from flask_wtf import FlaskForm
from wtforms import StringField, IntegerField, TextAreaField, FloatField, DateTimeLocalField, SubmitField
from wtforms.validators import DataRequired, NumberRange

admin_bp = Blueprint('admin', __name__)

# Custom decorator to check for admin privileges
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin:
            abort(403) # Forbidden
        return f(*args, **kwargs)
    return decorated_function

class AddCarForm(FlaskForm):
    make = StringField('Make', validators=[DataRequired()])
    model = StringField('Model', validators=[DataRequired()])
    year = IntegerField('Year', validators=[DataRequired(), NumberRange(min=1900, max=2100)])
    description = TextAreaField('Description')
    image_url = StringField('Image URL')
    start_price = FloatField('Starting Price (ETB)', validators=[DataRequired(), NumberRange(min=0)])
    end_time = DateTimeLocalField('Auction End Time', format='%Y-%m-%dT%H:%M', validators=[DataRequired()])
    submit = SubmitField('Add Car and Create Auction')

@admin_bp.route('/dashboard')
@login_required
@admin_required
def dashboard():
    unapproved_cars = Car.query.filter_by(is_approved=False).all()

    # Gather platform statistics
    stats = {
        'user_count': User.query.count(),
        'active_auction_count': Auction.query.join(Car).filter(Car.is_approved == True, Auction.end_time > datetime.utcnow()).count(),
        'pending_approval_count': len(unapproved_cars)
    }

    return render_template('dashboard.html', cars=unapproved_cars, stats=stats)

@admin_bp.route('/approve_car/<int:car_id>', methods=['POST'])
@login_required
@admin_required
def approve_car(car_id):
    car = Car.query.get_or_404(car_id)
    car.is_approved = True
    db.session.commit()
    flash(f'The car "{car.year} {car.make} {car.model}" has been approved.', 'success')
    return redirect(url_for('admin.dashboard'))

@admin_bp.route('/add_car', methods=['GET', 'POST'])
@login_required
@admin_required
def add_car():
    form = AddCarForm()
    if form.validate_on_submit():
        # Create new Car, automatically approved
        new_car = Car(
            make=form.make.data,
            model=form.model.data,
            year=form.year.data,
            description=form.description.data,
            image_url=form.image_url.data,
            owner_id=current_user.id, # Admin is the owner
            is_approved=True
        )
        db.session.add(new_car)
        db.session.commit() # Commit to get the new_car.id

        # Create new Auction for the car
        new_auction = Auction(start_time=datetime.utcnow(), end_time=form.end_time.data, start_price=form.start_price.data, current_price=form.start_price.data, car_id=new_car.id)
        db.session.add(new_auction)
        db.session.commit()
        flash(f'Successfully added {new_car.year} {new_car.make} {new_car.model} for auction.', 'success')
        return redirect(url_for('admin.dashboard'))
    return render_template('admin/add_car.html', title='Add New Car', form=form)