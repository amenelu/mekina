from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_required, current_user
from models.auction import Auction
from models.car import Car
from models.bid import Bid
from app import db
from datetime import datetime

# Simple form for placing a bid
from flask_wtf import FlaskForm
from wtforms import FloatField, SubmitField
from wtforms.validators import DataRequired, NumberRange

auctions_bp = Blueprint('auctions', __name__)

class BidForm(FlaskForm):
    amount = FloatField('Bid Amount (ETB)', validators=[DataRequired(), NumberRange(min=0)])
    submit = SubmitField('Place Bid')

    def __init__(self, *args, min_bid=None, **kwargs):
        super(BidForm, self).__init__(*args, **kwargs)
        if min_bid is not None:
            self.amount.validators.append(NumberRange(min=min_bid, message=f'Bid must be higher than {min_bid-0.01:,.2f} ETB.'))

@auctions_bp.route('/')
def list_auctions():
    page = request.args.get('page', 1, type=int)

    if current_user.is_authenticated and current_user.is_admin:
        # Admin view: show all auctions, ordered by end time
        auctions = Auction.query.join(Car).order_by(Auction.end_time.desc()).paginate(page=page, per_page=10)
        return render_template('auction_management.html', auctions=auctions, now=datetime.utcnow())
    else:
        # Public view: Only show auctions for approved cars that haven't ended
        auctions = Auction.query.join(Car).filter(
            Car.is_approved == True,
            Auction.end_time > datetime.utcnow()
        ).order_by(Auction.end_time.asc()).paginate(page=page, per_page=10)
        return render_template('auction_list.html', auctions=auctions)


@auctions_bp.route('/<int:auction_id>', methods=['GET', 'POST'])
def auction_detail(auction_id):
    auction = Auction.query.join(Car).filter(Auction.id == auction_id).first_or_404()

    # Security check: Only show approved auctions to non-admins
    if not auction.car.is_approved and (not current_user.is_authenticated or not current_user.is_admin):
        from flask import abort
        abort(404)

    min_bid_amount = auction.current_price + 0.01
    form = BidForm(min_bid=min_bid_amount)

    if form.validate_on_submit():
        if not current_user.is_authenticated:
            flash('You must be logged in to place a bid.')
            return redirect(url_for('auth.login'))

        new_bid = Bid(amount=form.amount.data, user_id=current_user.id, auction_id=auction.id)
        auction.current_price = form.amount.data
        db.session.add(new_bid)
        db.session.commit()
        flash('Your bid has been placed successfully!')
        return redirect(url_for('auctions.auction_detail', auction_id=auction.id))

    highest_bid = Bid.query.filter_by(auction_id=auction.id).order_by(Bid.amount.desc()).first()

    return render_template('auction_detail.html', auction=auction, form=form, highest_bid=highest_bid)
