from flask import Blueprint, render_template, redirect, url_for, flash, abort
from flask_login import login_required, current_user
from models import db
from models.user import User
from models.car import Car
from models.auction import Auction
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
        'pending_approval_count': Car.query.filter_by(is_approved=False).count()
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

@admin_bp.route('/approve_car/<int:car_id>', methods=['POST'])
@login_required
@admin_required
def approve_car(car_id):
    car = Car.query.get_or_404(car_id)
    car.is_approved = True
    db.session.commit()
    flash(f'Car {car.make} {car.model} has been approved.', 'success')
    return redirect(url_for('admin.dashboard'))