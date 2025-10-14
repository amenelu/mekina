from flask import Blueprint, render_template, redirect, url_for
from flask_login import current_user
from models.auction import Auction
from models.car import Car

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
