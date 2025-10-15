from flask import Blueprint, render_template, redirect, url_for
from flask_login import current_user, login_required
from models.auction import Auction
from models.car import Car
from models.notification import Notification
from models import db

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
@main_bp.route('/home')
def home():
    # If the user is an admin, redirect them to the admin dashboard.
    if current_user.is_authenticated and current_user.is_admin:
        return redirect(url_for('admin.dashboard'))

    # The homepage now loads all data via JavaScript, so we don't need to pass auctions here.
    return render_template('home.html')

@main_bp.route('/listings')
def all_listings():
    return render_template('all_listings.html')

@main_bp.route('/notifications')
@login_required
def notifications():
    """Displays a user's notifications and marks them as read."""
    user_notifications = Notification.query.filter_by(user_id=current_user.id).order_by(Notification.timestamp.desc()).all()
    
    # Mark all unread notifications as read
    Notification.query.filter_by(user_id=current_user.id, is_read=False).update({'is_read': True})
    db.session.commit()
    
    return render_template('notifications.html', notifications=user_notifications)
