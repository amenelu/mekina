from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_required, current_user
from models.auction import Auction
from models.bid import Bid
from app import db
from datetime import datetime

# Simple form for placing a bid
from flask_wtf import FlaskForm
from wtforms import FloatField, SubmitField
from wtforms.validators import DataRequired, NumberRange

auctions_bp = Blueprint('auctions', __name__)

class BidForm(FlaskForm):
    amount = FloatField('Bid Amount (ETB)', validators=[DataRequired()])
    submit = SubmitField('Place Bid')

@auctions_bp.route('/')
def list_auctions():
    page = request.args.get('page', 1, type=int)
    auctions = Auction.query.filter(Auction.end_time > datetime.utcnow()).paginate(page=page, per_page=10)
    return render_template('auction_list.html', auctions=auctions)

@auctions_bp.route('/<int:auction_id>', methods=['GET', 'POST'])
def auction_detail(auction_id):
    auction = Auction.query.get_or_404(auction_id)
    form = BidForm()

    if form.validate_on_submit():
        if not current_user.is_authenticated:
            flash('You must be logged in to place a bid.')
            return redirect(url_for('auth.login'))

        if form.amount.data <= auction.current_price:
            flash(f'Your bid must be higher than the current price of {auction.current_price:,.2f} ETB.')
        else:
            new_bid = Bid(amount=form.amount.data, user_id=current_user.id, auction_id=auction.id)
            auction.current_price = form.amount.data
            db.session.add(new_bid)
            db.session.commit()
            flash('Your bid has been placed successfully!')
            return redirect(url_for('auctions.auction_detail', auction_id=auction.id))

    # Set a minimum bid value for the form
    form.amount.validators.append(NumberRange(min=auction.current_price + 0.01))

    highest_bid = Bid.query.filter_by(auction_id=auction.id).order_by(Bid.amount.desc()).first()

    return render_template('auction_detail.html', auction=auction, form=form, highest_bid=highest_bid)
