from datetime import datetime
from flask import (
    Blueprint,
    render_template,
    redirect,
    url_for,
    flash,
    abort,
    request,
    jsonify,
    current_app,
)
from flask_login import login_required, current_user
from extensions import db, socketio
from sqlalchemy import func, or_
from sqlalchemy.orm import aliased
from models.rental_listing import RentalListing
from models.user import User
from models.car import Car
from models.auction import Auction
from models.notification import Notification
from models.dealer_point_request import DealerPointRequest
from models.point_transaction import PointTransaction
from models.equipment import Equipment
from models.dealer_rating import DealerRating
from models.car_request import CarRequest
from models.deal import Deal
from models.dealer_bid import DealerBid
from models.car_image import CarImage
from models.trade_in import TradeInOffer, TradeInRequest
from models.conversation import Conversation
from models.chat_message import ChatMessage
from routes.seller import CarSubmissionForm, save_seller_document
from routes.auth import admin_token_required
from routes.main import send_push_notification
from functools import wraps

from flask_wtf import FlaskForm
from wtforms import StringField, BooleanField, SubmitField, IntegerField
from wtforms.validators import DataRequired, Email, Optional, NumberRange
import secrets
import string

admin_bp = Blueprint("admin", __name__, url_prefix="/admin")


# Custom decorator to check for admin privileges
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin:
            abort(403)  # Forbidden
        return f(*args, **kwargs)

    return decorated_function


class EditUserForm(FlaskForm):
    username = StringField("Username", validators=[DataRequired()])
    email = StringField("Email", validators=[DataRequired(), Email()])
    is_dealer = BooleanField("Is Dealer")
    is_rental_company = BooleanField("Is Rental Company")
    is_admin = BooleanField("Is Admin")
    points = IntegerField("Points", validators=[Optional(), NumberRange(min=0)])
    submit = SubmitField("Update User")


def _pending_point_request_summary_by_user():
    summaries = {}
    pending_requests = (
        DealerPointRequest.query.filter_by(status="pending")
        .order_by(DealerPointRequest.created_at.desc())
        .all()
    )
    for point_request in pending_requests:
        summary = summaries.setdefault(
            point_request.dealer_id,
            {
                "requested_points": 0,
                "request_count": 0,
                "latest_request_id": point_request.id,
            },
        )
        summary["requested_points"] += point_request.requested_points
        summary["request_count"] += 1
    return summaries


def _pagination_args(default_per_page=50, max_per_page=100):
    page = max(request.args.get("page", 1, type=int) or 1, 1)
    per_page = request.args.get("per_page", default_per_page, type=int)
    per_page = min(max(per_page or default_per_page, 1), max_per_page)
    return page, per_page


def _pagination_meta(pagination):
    return {
        "page": pagination.page,
        "per_page": pagination.per_page,
        "total": pagination.total,
        "pages": pagination.pages,
        "has_prev": pagination.has_prev,
        "prev_num": pagination.prev_num,
        "has_next": pagination.has_next,
        "next_num": pagination.next_num,
    }


def _metric(label, value, helper=None):
    return {"label": label, "value": value or 0, "helper": helper}


def _format_rate(numerator, denominator):
    if not denominator:
        return 0
    return round((float(numerator or 0) / float(denominator)) * 100, 1)


def _format_money(value):
    return round(float(value or 0), 2)


def _count_by_column(model, column, filters=None, limit=6):
    query = db.session.query(column, func.count(model.id))
    if filters:
        for filter_clause in filters:
            query = query.filter(filter_clause)
    rows = (
        query.filter(column.isnot(None), column != "")
        .group_by(column)
        .order_by(func.count(model.id).desc())
        .limit(limit)
        .all()
    )
    return [{"label": str(label), "value": count} for label, count in rows]


def _admin_analytics_payload():
    buyers_count = User.query.filter(
        User.is_admin.is_(False),
        User.is_dealer.is_(False),
        User.is_rental_company.is_(False),
    ).count()
    dealers_count = User.query.filter_by(is_dealer=True).count()
    rental_company_count = User.query.filter_by(is_rental_company=True).count()
    admin_count = User.query.filter_by(is_admin=True).count()

    total_requests = CarRequest.query.count()
    active_requests = CarRequest.query.filter_by(status="active").count()
    completed_requests = CarRequest.query.filter_by(status="completed").count()
    image_requests = CarRequest.query.filter_by(request_source="image_based").count()
    specific_requests = CarRequest.query.filter(CarRequest.target_car_id.isnot(None)).count()
    general_requests = CarRequest.query.filter_by(request_source="general").count()

    total_offers = DealerBid.query.count()
    accepted_offers = DealerBid.query.filter_by(status="accepted").count()
    pending_offers = DealerBid.query.filter_by(status="pending").count()

    total_deals = Deal.query.count()
    completed_deals = Deal.query.filter_by(status="completed").count()
    accepted_deals = Deal.query.filter_by(status="accepted").count()
    total_deal_value = (
        db.session.query(func.sum(Deal.final_price)).filter(Deal.final_price.isnot(None)).scalar()
    )
    average_deal_value = (
        db.session.query(func.avg(Deal.final_price)).filter(Deal.final_price.isnot(None)).scalar()
    )
    reward_points_awarded = (
        db.session.query(func.sum(Deal.reward_points_amount))
        .filter(Deal.reward_points_awarded.is_(True))
        .scalar()
    )

    pending_point_requests = DealerPointRequest.query.filter_by(status="pending").count()
    approved_point_requests = DealerPointRequest.query.filter_by(status="accepted").count()
    denied_point_requests = DealerPointRequest.query.filter_by(status="denied").count()
    points_requested_pending = (
        db.session.query(func.sum(DealerPointRequest.requested_points))
        .filter_by(status="pending")
        .scalar()
    )
    points_added = (
        db.session.query(func.sum(PointTransaction.amount))
        .filter(PointTransaction.amount > 0)
        .scalar()
    )
    points_spent = (
        db.session.query(func.sum(PointTransaction.amount))
        .filter(PointTransaction.amount < 0)
        .scalar()
    )
    live_point_balances = db.session.query(func.sum(User.points)).scalar()

    total_conversations = Conversation.query.count()
    unlocked_conversations = Conversation.query.filter_by(is_unlocked=True).count()
    total_messages = ChatMessage.query.count()
    masked_messages = ChatMessage.query.filter(
        ChatMessage.original_body.isnot(None),
        ChatMessage.original_body != ChatMessage.body,
    ).count()

    total_listings = Car.query.count()
    active_listings = Car.query.filter_by(is_active=True, is_approved=True).count()
    pending_listings = Car.query.filter_by(is_approved=False).count()
    featured_listings = Car.query.filter_by(is_featured=True).count()
    sale_listings = Car.query.filter_by(listing_type="sale", is_approved=True).count()
    rental_listings = Car.query.filter_by(listing_type="rental", is_approved=True).count()

    trade_in_requests = TradeInRequest.query.count()
    pending_trade_ins = TradeInRequest.query.filter_by(status="pending").count()
    trade_in_offers = TradeInOffer.query.count()
    accepted_trade_in_offers = TradeInOffer.query.filter_by(status="accepted").count()

    top_dealers = (
        db.session.query(
            User.id,
            User.username,
            func.count(Deal.id).label("completed_count"),
            func.sum(Deal.final_price).label("deal_value"),
        )
        .join(Deal, Deal.dealer_id == User.id)
        .filter(Deal.status == "completed")
        .group_by(User.id, User.username)
        .order_by(func.count(Deal.id).desc(), func.sum(Deal.final_price).desc())
        .limit(5)
        .all()
    )

    return {
        "groups": [
            {
                "title": "Users",
                "metrics": [
                    _metric("Total users", User.query.count()),
                    _metric("Buyers", buyers_count),
                    _metric("Dealers", dealers_count),
                    _metric("Rental companies", rental_company_count),
                    _metric("Admins", admin_count),
                ],
            },
            {
                "title": "Requests & Offers",
                "metrics": [
                    _metric("Requests sent", total_requests),
                    _metric("Active requests", active_requests),
                    _metric("Completed requests", completed_requests),
                    _metric("Dealer offers", total_offers),
                    _metric("Accepted offers", accepted_offers),
                    _metric("Offer acceptance", _format_rate(accepted_offers, total_offers), "%"),
                ],
                "breakdowns": [
                    {
                        "title": "Request types",
                        "items": [
                            {"label": "General", "value": general_requests},
                            {"label": "Specific car", "value": specific_requests},
                            {"label": "Image based", "value": image_requests},
                        ],
                    },
                    {
                        "title": "Top requested makes",
                        "items": _count_by_column(CarRequest, CarRequest.make),
                    },
                ],
            },
            {
                "title": "Deals",
                "metrics": [
                    _metric("Deals accepted", accepted_deals),
                    _metric("Deals completed", completed_deals),
                    _metric("Completion rate", _format_rate(completed_deals, total_deals), "%"),
                    _metric("Total deal value", _format_money(total_deal_value), "ETB"),
                    _metric("Average deal value", _format_money(average_deal_value), "ETB"),
                    _metric("Reward points awarded", reward_points_awarded),
                ],
                "breakdowns": [
                    {
                        "title": "Top closing dealers",
                        "items": [
                            {
                                "label": dealer.username,
                                "value": dealer.completed_count,
                                "helper": f"{_format_money(dealer.deal_value):,.0f} ETB",
                            }
                            for dealer in top_dealers
                        ],
                    }
                ],
            },
            {
                "title": "Points",
                "metrics": [
                    _metric("Live point balances", live_point_balances),
                    _metric("Points added", points_added),
                    _metric("Points spent", abs(points_spent or 0)),
                    _metric("Pending point requests", pending_point_requests),
                    _metric("Pending requested points", points_requested_pending),
                    _metric("Approved / denied", f"{approved_point_requests} / {denied_point_requests}"),
                ],
                "breakdowns": [
                    {
                        "title": "Point transaction types",
                        "items": _count_by_column(
                            PointTransaction,
                            PointTransaction.transaction_type,
                            limit=5,
                        ),
                    }
                ],
            },
            {
                "title": "Messages",
                "metrics": [
                    _metric("Conversations", total_conversations),
                    _metric("Unlocked conversations", unlocked_conversations),
                    _metric("Unlock rate", _format_rate(unlocked_conversations, total_conversations), "%"),
                    _metric("Messages sent", total_messages),
                    _metric("Masked messages", masked_messages),
                    _metric("Contact-risk rate", _format_rate(masked_messages, total_messages), "%"),
                ],
            },
            {
                "title": "Inventory",
                "metrics": [
                    _metric("Total listings", total_listings),
                    _metric("Active listings", active_listings),
                    _metric("Pending approval", pending_listings),
                    _metric("Featured listings", featured_listings),
                    _metric("For sale", sale_listings),
                    _metric("For rent", rental_listings),
                ],
                "breakdowns": [
                    {"title": "Body type", "items": _count_by_column(Car, Car.body_type)},
                    {"title": "Drivetrain", "items": _count_by_column(Car, Car.drivetrain)},
                ],
            },
            {
                "title": "Trade-ins",
                "metrics": [
                    _metric("Trade-in requests", trade_in_requests),
                    _metric("Pending trade-ins", pending_trade_ins),
                    _metric("Dealer trade-in offers", trade_in_offers),
                    _metric("Accepted trade-in offers", accepted_trade_in_offers),
                    _metric(
                        "Trade-in offer acceptance",
                        _format_rate(accepted_trade_in_offers, trade_in_offers),
                        "%",
                    ),
                ],
            },
        ]
    }


@admin_bp.route("/dashboard")
@login_required
@admin_required
def dashboard():
    stats = {
        "user_count": User.query.count(),
        "active_auction_count": Auction.query.filter(
            Auction.end_time > db.func.now()
        ).count(),
        "pending_approval_count": Car.query.filter_by(is_approved=False).count(),
        "for_sale_count": Car.query.filter_by(
            listing_type="sale", is_approved=True
        ).count(),
        "for_rent_count": Car.query.filter_by(
            listing_type="rental", is_approved=True
        ).count(),
        "pending_trade_in_count": TradeInRequest.query.filter_by(
            status="pending"
        ).count(),
        "pending_point_request_count": DealerPointRequest.query.filter_by(
            status="pending"
        ).count(),
    }
    cars_pending_approval = (
        Car.query.filter_by(is_approved=False).order_by(Car.id.desc()).all()
    )
    pending_trade_ins = (
        TradeInRequest.query.filter_by(status="pending")
        .order_by(TradeInRequest.created_at.desc())
        .all()
    )
    return render_template(
        "dashboard.html",
        stats=stats,
        cars=cars_pending_approval,
        trade_ins=pending_trade_ins,
    )


@admin_bp.route("/api/dashboard")
@admin_token_required
def api_admin_dashboard(current_user):
    """API endpoint for admin dashboard statistics and pending approvals."""
    stats = {
        "user_count": User.query.count(),
        "active_auction_count": Auction.query.filter(
            Auction.end_time > db.func.now()
        ).count(),
        "pending_approval_count": Car.query.filter_by(is_approved=False).count(),
        "for_sale_count": Car.query.filter_by(
            listing_type="sale", is_approved=True
        ).count(),
        "for_rent_count": Car.query.filter_by(
            listing_type="rental", is_approved=True
        ).count(),
        "pending_trade_in_count": TradeInRequest.query.filter_by(
            status="pending"
        ).count(),
        "pending_point_request_count": DealerPointRequest.query.filter_by(
            status="pending"
        ).count(),
    }
    cars_pending_approval = (
        Car.query.filter_by(is_approved=False).order_by(Car.id.desc()).all()
    )
    pending_trade_ins = (
        TradeInRequest.query.filter_by(status="pending")
        .order_by(TradeInRequest.created_at.desc())
        .all()
    )
    return jsonify(
        stats=stats,
        analytics=_admin_analytics_payload(),
        pending_approvals=[
            car.to_dict(include_owner=True) for car in cars_pending_approval
        ],
        pending_trade_ins=[req.to_dict() for req in pending_trade_ins],
    )


@admin_bp.route("/api/point-requests")
@admin_token_required
def api_point_requests(current_user):
    status = request.args.get("status", "pending")
    query = DealerPointRequest.query
    if status != "all":
        query = query.filter_by(status=status)

    point_requests = query.order_by(DealerPointRequest.created_at.desc()).all()
    return jsonify(point_requests=[req.to_dict() for req in point_requests])


@admin_bp.route("/api/dealers/<int:dealer_id>/point-requests", methods=["POST"])
@admin_token_required
def api_resolve_dealer_point_requests(current_user, dealer_id):
    dealer = User.query.get_or_404(dealer_id)
    if not (dealer.is_dealer or dealer.is_rental_company):
        return (
            jsonify(
                {
                    "message": "Point requests can only be resolved for dealers or rental companies."
                }
            ),
            400,
        )

    data = request.get_json() or {}
    action = data.get("action")
    if action not in {"accept", "deny"}:
        return jsonify({"message": "Action must be accept or deny."}), 400

    pending_requests = DealerPointRequest.query.filter_by(
        dealer_id=dealer.id, status="pending"
    ).all()
    if not pending_requests:
        return jsonify({"message": "No pending point requests found."}), 404

    total_points = sum(req.requested_points for req in pending_requests)
    reviewed_at = datetime.utcnow()

    for point_request in pending_requests:
        point_request.status = "accepted" if action == "accept" else "denied"
        point_request.reviewed_at = reviewed_at

    if action == "accept":
        dealer.points = (dealer.points or 0) + total_points
        db.session.add(
            PointTransaction(
                user_id=dealer.id,
                amount=total_points,
                transaction_type="admin_point_request",
                description=f"Admin approved {total_points} requested points.",
            )
        )

    message = (
        f"Your request for {total_points} points was approved."
        if action == "accept"
        else f"Your request for {total_points} points was denied."
    )
    db.session.add(Notification(user_id=dealer.id, message=message))
    db.session.commit()

    unread_count = Notification.query.filter_by(
        user_id=dealer.id, is_read=False
    ).count()
    socketio.emit(
        "new_notification",
        {"count": unread_count, "message": message},
        room=str(dealer.id),
    )

    return jsonify(
        {
            "status": "success",
            "message": (
                "Point request accepted."
                if action == "accept"
                else "Point request denied."
            ),
            "dealer_points": dealer.points,
        }
    )


@admin_bp.route("/users")
@login_required
@admin_required
def user_management():
    """Displays a list of all non-dealer users for the admin."""
    query = request.args.get("q", "")
    page = request.args.get("page", 1, type=int)

    users_query = User.query.filter_by(is_dealer=False).order_by(User.id.asc())

    if query:
        search_term = f"%{query}%"
        users_query = users_query.filter(
            or_(User.username.ilike(search_term), User.email.ilike(search_term))
        )

    paginated_users = users_query.paginate(page=page, per_page=20)
    return render_template("user_management.html", users=paginated_users)


@admin_bp.route("/api/users")
@admin_token_required
def api_admin_list_users(current_user):
    """API endpoint for admin to search/filter all non-dealer users."""
    query = request.args.get("q", "")
    page, per_page = _pagination_args()

    users_query = User.query.filter_by(is_dealer=False).order_by(User.id.asc())

    if query:
        search_term = f"%{query}%"
        users_query = users_query.filter(
            or_(User.username.ilike(search_term), User.email.ilike(search_term))
        )

    paginated_users = users_query.paginate(
        page=page, per_page=per_page, error_out=False
    )

    users_data = [
        {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "is_rental_company": user.is_rental_company,
            "is_admin": user.is_admin,
            "points": user.points or 0,
            "edit_url": url_for("admin.edit_user", user_id=user.id),
        }
        for user in paginated_users.items
    ]

    return jsonify(
        {
            "users": users_data,
            "pagination": _pagination_meta(paginated_users),
        }
    )


def _admin_conversation_summary(conversation):
    last_message = conversation.messages.order_by(ChatMessage.timestamp.desc()).first()
    message_count = conversation.messages.count()
    flagged_count = conversation.messages.filter(
        ChatMessage.original_body.isnot(None),
        ChatMessage.original_body != ChatMessage.body,
    ).count()

    return {
        "id": conversation.id,
        "car": conversation.car.to_dict() if conversation.car else None,
        "buyer": conversation.buyer.to_dict(detail_level="owner")
        if conversation.buyer
        else None,
        "dealer": conversation.dealer.to_dict(detail_level="owner")
        if conversation.dealer
        else None,
        "is_unlocked": conversation.is_unlocked,
        "message_count": message_count,
        "flagged_message_count": flagged_count,
        "lead_score": conversation.lead_score.score if conversation.lead_score else 0,
        "last_message_body": last_message.body if last_message else "No messages yet.",
        "last_message_original_body": last_message.original_body
        if last_message
        else None,
        "last_message_timestamp": last_message.timestamp.isoformat() + "Z"
        if last_message
        else conversation.created_at.isoformat() + "Z",
    }


def _admin_message_payload(message):
    original_body = message.original_body or message.body
    return {
        "id": message.id,
        "body": message.body,
        "original_body": original_body,
        "was_masked": original_body != message.body,
        "timestamp": message.timestamp.isoformat() + "Z",
        "is_read": message.is_read,
        "sender": message.sender.to_dict(detail_level="owner")
        if message.sender
        else None,
    }


@admin_bp.route("/api/messages")
@admin_token_required
def api_admin_messages(current_user):
    """Read-only admin oversight of buyer/dealer conversations."""
    query = (request.args.get("q") or "").strip()
    page, per_page = _pagination_args()

    conversations_query = Conversation.query.join(
        Car, Conversation.car_id == Car.id
    ).order_by(Conversation.created_at.desc())

    if query:
        search_term = f"%{query}%"
        Buyer = aliased(User)
        Dealer = aliased(User)
        conversations_query = (
            conversations_query.join(Buyer, Conversation.buyer_id == Buyer.id)
            .join(Dealer, Conversation.dealer_id == Dealer.id)
            .filter(
                or_(
                    Car.make.ilike(search_term),
                    Car.model.ilike(search_term),
                    Buyer.username.ilike(search_term),
                    Buyer.email.ilike(search_term),
                    Dealer.username.ilike(search_term),
                    Dealer.email.ilike(search_term),
                )
            )
        )

    paginated_conversations = conversations_query.paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify(
        {
            "conversations": [
                _admin_conversation_summary(conversation)
                for conversation in paginated_conversations.items
            ],
            "pagination": _pagination_meta(paginated_conversations),
        }
    )


@admin_bp.route("/api/messages/<int:conversation_id>")
@admin_token_required
def api_admin_message_detail(current_user, conversation_id):
    """Read-only admin detail view for one buyer/dealer conversation."""
    conversation = Conversation.query.get_or_404(conversation_id)
    messages = conversation.messages.order_by(ChatMessage.timestamp.asc()).all()

    return jsonify(
        {
            "conversation": _admin_conversation_summary(conversation),
            "messages": [_admin_message_payload(message) for message in messages],
        }
    )


@admin_bp.route("/users/edit/<int:user_id>", methods=["GET", "POST"])
@login_required
@admin_required
def edit_user(user_id):
    """Allows an admin to edit a user's roles and points."""
    user_to_edit = User.query.get_or_404(user_id)
    form = EditUserForm(obj=user_to_edit)

    if form.validate_on_submit():
        # Prevent admin from accidentally removing their own admin status
        if user_to_edit.id == current_user.id and not form.is_admin.data:
            flash("You cannot remove your own admin status.", "danger")
            return redirect(url_for("admin.edit_user", user_id=user_id))

        user_to_edit.username = form.username.data
        user_to_edit.email = form.email.data
        user_to_edit.is_dealer = form.is_dealer.data
        user_to_edit.is_rental_company = form.is_rental_company.data
        user_to_edit.is_admin = form.is_admin.data
        user_to_edit.points = form.points.data

        db.session.commit()
        flash(f"User {user_to_edit.username} has been updated.", "success")

        # If the user is a dealer, redirect to their profile. Otherwise, go to the user list.
        if user_to_edit.is_dealer:
            return redirect(url_for("dealer.profile", dealer_id=user_to_edit.id))
        return redirect(url_for("admin.user_management"))

    return render_template("edit_user.html", form=form, user=user_to_edit)


@admin_bp.route("/api/users/<int:user_id>", methods=["GET", "PUT", "DELETE"])
@admin_token_required
def api_manage_user(current_user, user_id):
    """API endpoint for an admin to manage a single user (GET, PUT, DELETE)."""
    user = User.query.get_or_404(user_id)

    if request.method == "GET":
        return jsonify(user=user.to_dict(detail_level="owner"))

    elif request.method == "PUT":
        data = request.get_json()
        if not data:
            return jsonify({"status": "error", "message": "Invalid JSON payload."}), 400

        # Prevent admin from accidentally removing their own admin status
        if user.id == current_user.id and not data.get("is_admin", user.is_admin):
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "You cannot remove your own admin status.",
                    }
                ),
                403,
            )

        # Update fields from payload
        user.username = data.get("username", user.username)
        user.email = data.get("email", user.email)
        user.is_dealer = data.get("is_dealer", user.is_dealer)
        user.is_rental_company = data.get("is_rental_company", user.is_rental_company)
        user.is_admin = data.get("is_admin", user.is_admin)
        user.points = data.get("points", user.points)

        # Validate to prevent duplicates if username/email changed
        if (
            "username" in data
            and User.query.filter(
                User.username == user.username, User.id != user.id
            ).first()
        ):
            return (
                jsonify({"status": "error", "message": "Username already exists."}),
                409,
            )
        if (
            "email" in data
            and User.query.filter(User.email == user.email, User.id != user.id).first()
        ):
            return jsonify({"status": "error", "message": "Email already exists."}), 409

        db.session.commit()
        return jsonify(
            {
                "status": "success",
                "message": "User updated successfully.",
                "user": user.to_dict(detail_level="admin"),
            }
        )

    elif request.method == "DELETE":
        if user.id == current_user.id:
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "You cannot delete your own account.",
                    }
                ),
                403,
            )

        # Add any other pre-delete checks here (e.g., reassigning listings)

        db.session.delete(user)
        db.session.commit()
        return jsonify({"status": "success", "message": "User deleted successfully."})


def _generate_temporary_password(length=14):
    alphabet = string.ascii_letters + string.digits
    while True:
        password = "".join(secrets.choice(alphabet) for _ in range(length))
        if (
            any(char.islower() for char in password)
            and any(char.isupper() for char in password)
            and any(char.isdigit() for char in password)
        ):
            return password


@admin_bp.route("/api/users/<int:user_id>/password-reset", methods=["POST"])
@admin_token_required
def api_admin_reset_user_password(current_user, user_id):
    """Admin-assisted password reset for users who cannot receive email."""
    user = User.query.get_or_404(user_id)

    if user.id == current_user.id:
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "You cannot reset your own password from this page.",
                }
            ),
            403,
        )

    temporary_password = _generate_temporary_password()
    user.set_password(temporary_password)
    db.session.commit()

    return jsonify(
        {
            "status": "success",
            "message": (
                "Temporary password generated. Share it with the user through a "
                "trusted channel and ask them to change it after logging in."
            ),
            "temporary_password": temporary_password,
        }
    )


# --- Dummy routes from your templates that need to exist ---
# You can fill these in later.


@admin_bp.route("/add_car")
@login_required
@admin_required
def add_car():
    flash("Add car functionality not implemented yet.", "info")
    return redirect(url_for("admin.dashboard"))


@admin_bp.route("/dealers")
@login_required
@admin_required
def dealer_management():
    """Displays a list of all dealers with statistics."""
    # Subquery for active listings count per dealer
    active_listings_sub = (
        db.session.query(Car.owner_id, func.count(Car.id).label("active_listings"))
        .filter(Car.is_active == True, Car.is_approved == True)
        .group_by(Car.owner_id)
        .subquery()
    )

    # Subquery for review stats per dealer
    review_stats_sub = (
        db.session.query(
            DealerRating.dealer_id,
            func.avg(DealerRating.rating).label("avg_rating"),
            func.count(DealerRating.id).label("review_count"),
        )
        .group_by(DealerRating.dealer_id)
        .subquery()
    )

    dealers_with_stats = (
        db.session.query(
            User,
            func.coalesce(active_listings_sub.c.active_listings, 0).label(
                "active_listings"
            ),
            func.coalesce(review_stats_sub.c.avg_rating, 0).label("avg_rating"),
            func.coalesce(review_stats_sub.c.review_count, 0).label("review_count"),
        )
        .outerjoin(active_listings_sub, User.id == active_listings_sub.c.owner_id)
        .outerjoin(review_stats_sub, User.id == review_stats_sub.c.dealer_id)
        .filter(User.is_dealer == True)
        .order_by(User.username)
        .all()
    )

    return render_template(
        "dealer_management.html", dealers_with_stats=dealers_with_stats
    )


@admin_bp.route("/api/dealers")
@admin_token_required
def api_admin_list_dealers(current_user):
    """API endpoint for admin to search/filter all dealer users with stats."""
    query = request.args.get("q", "")
    page, per_page = _pagination_args()
    pending_point_requests = _pending_point_request_summary_by_user()

    # Subquery for active listings count per dealer
    active_listings_sub = (
        db.session.query(Car.owner_id, func.count(Car.id).label("active_listings"))
        .filter(Car.is_active == True, Car.is_approved == True)
        .group_by(Car.owner_id)
        .subquery()
    )

    # Subquery for review stats per dealer
    review_stats_sub = (
        db.session.query(
            DealerRating.dealer_id,
            func.avg(DealerRating.rating).label("avg_rating"),
            func.count(DealerRating.id).label("review_count"),
        )
        .group_by(DealerRating.dealer_id)
        .subquery()
    )

    # Base query for businesses that can spend/request points.
    dealers_query = (
        db.session.query(
            User,
            func.coalesce(active_listings_sub.c.active_listings, 0).label(
                "active_listings"
            ),
            func.coalesce(review_stats_sub.c.avg_rating, 0).label("avg_rating"),
            func.coalesce(review_stats_sub.c.review_count, 0).label("review_count"),
        )
        .outerjoin(active_listings_sub, User.id == active_listings_sub.c.owner_id)
        .outerjoin(review_stats_sub, User.id == review_stats_sub.c.dealer_id)
        .filter(or_(User.is_dealer == True, User.is_rental_company == True))
    )

    if query:
        search_term = f"%{query}%"
        dealers_query = dealers_query.filter(
            or_(User.username.ilike(search_term), User.email.ilike(search_term))
        )

    paginated_dealers = dealers_query.order_by(User.username).paginate(
        page=page, per_page=per_page, error_out=False
    )

    dealers_data = [
        {
            "id": dealer.id,
            "username": dealer.username,
            "email": dealer.email,
            "is_dealer": dealer.is_dealer,
            "is_rental_company": dealer.is_rental_company,
            "account_type": (
                "Rental Company" if dealer.is_rental_company else "Dealer"
            ),
            "active_listings": active_listings,
            "avg_rating": float(avg_rating) if avg_rating else 0,
            "review_count": review_count,
            "pending_point_request": pending_point_requests.get(dealer.id),
            "profile_url": url_for("dealer.profile", dealer_id=dealer.id),
        }
        for dealer, active_listings, avg_rating, review_count in paginated_dealers.items
    ]

    return jsonify(
        {
            "dealers": dealers_data,
            "pagination": _pagination_meta(paginated_dealers),
        }
    )


@admin_bp.route("/rentals")
@login_required
@admin_required
def rental_management():
    """Displays a list of all rental cars for management."""
    page = request.args.get("page", 1, type=int)
    rental_cars = (
        Car.query.filter_by(listing_type="rental")
        .order_by(Car.id.desc())
        .paginate(page=page, per_page=15)
    )
    return render_template("rental_management.html", cars=rental_cars)


@admin_bp.route("/api/rentals")
@admin_token_required
def api_admin_list_rentals(current_user):
    """API endpoint for admin to search/filter all rental listings."""
    query = request.args.get("q", "")
    page, per_page = _pagination_args()
    pending_point_requests = _pending_point_request_summary_by_user()

    # Base query for rental cars
    cars_query = Car.query.filter_by(listing_type="rental").order_by(Car.id.desc())

    if query:
        search_term = f"%{query}%"
        # Join with User to search by owner username
        cars_query = cars_query.join(User).filter(
            or_(
                Car.make.ilike(search_term),
                Car.model.ilike(search_term),
                Car.year.like(search_term),
                User.username.ilike(search_term),
            )
        )

    paginated_cars = cars_query.paginate(
        page=page, per_page=per_page, error_out=False
    )

    cars_data = [
        {
            "id": car.id,
            "year": car.year,
            "make": car.make,
            "model": car.model,
            "owner_id": car.owner_id,
            "owner_username": car.owner.username,
            "owner_pending_point_request": pending_point_requests.get(car.owner_id),
            "price_per_day": (
                "{:,.2f}".format(car.rental_listing.price_per_day)
                if car.rental_listing and car.rental_listing.price_per_day is not None
                else "N/A"
            ),
            "is_approved": car.is_approved,
            "is_active": car.is_active,
            "edit_url": url_for("admin.edit_listing", car_id=car.id),
            "delete_url": url_for("admin.delete_listing", car_id=car.id),
        }
        for car in paginated_cars.items
    ]

    return jsonify(
        {
            "cars": cars_data,
            "pagination": _pagination_meta(paginated_cars),
        }
    )


@admin_bp.route("/listing/edit/<int:car_id>", methods=["GET", "POST"])
@login_required
@admin_required
def edit_listing(car_id):
    """Allows an admin to edit any car listing (auction, sale, or rental)."""
    car = Car.query.get_or_404(car_id)
    auction = car.auction
    rental = car.rental_listing

    form = CarSubmissionForm(obj=car)
    form.submit.label.text = "Update Listing"

    if request.method == "GET":
        # Pre-populate listing-type specific fields
        form.listing_type.data = car.listing_type
        if car.listing_type == "auction" and auction:
            form.start_price.data = auction.start_price
            form.end_time.data = auction.end_time
        elif car.listing_type == "sale":
            form.fixed_price.data = car.fixed_price
        elif car.listing_type == "rental" and rental:
            form.price_per_day.data = rental.price_per_day
        # Pre-populate equipment
        form.equipment.data = [e.name for e in car.equipment]

    if form.validate_on_submit():
        # Manually populate car fields to avoid errors with populate_obj
        car.make = form.make.data
        car.model = form.model.data
        car.year = form.year.data
        car.description = form.description.data
        car.condition = form.condition.data
        car.body_type = form.body_type.data
        car.mileage = form.mileage.data
        car.transmission = form.transmission.data
        car.drivetrain = form.drivetrain.data
        car.fuel_type = form.fuel_type.data

        car.is_featured = form.is_featured.data

        # Update listing-specific details
        original_listing_type = car.listing_type
        car.listing_type = form.listing_type.data

        if original_listing_type != car.listing_type:
            # Listing type has changed, we need to create/delete associated objects
            if original_listing_type == "auction" and auction:
                db.session.delete(auction)
            if original_listing_type == "rental" and rental:
                db.session.delete(rental)
            if original_listing_type == "sale":
                car.fixed_price = None

            if car.listing_type == "auction":
                from datetime import timedelta

                new_auction = Auction(
                    car_id=car.id,
                    start_price=form.start_price.data,
                    current_price=form.start_price.data,
                    end_time=form.end_time.data
                    or (datetime.utcnow() + timedelta(days=7)),
                )
                db.session.add(new_auction)
            elif car.listing_type == "sale":
                car.fixed_price = form.fixed_price.data
            elif car.listing_type == "rental":
                new_rental = RentalListing(
                    car_id=car.id, price_per_day=form.price_per_day.data
                )
                db.session.add(new_rental)
        else:
            # Listing type is the same, just update the values
            if car.listing_type == "auction" and auction:
                auction.start_price = form.start_price.data
                if not auction.bids and form.start_price.data:
                    auction.current_price = form.start_price.data
                auction.end_time = form.end_time.data
            elif car.listing_type == "sale":
                car.fixed_price = form.fixed_price.data
            elif car.listing_type == "rental" and rental:
                rental.price_per_day = form.price_per_day.data

        # Update equipment
        car.equipment.clear()
        for item_name in form.equipment.data:
            equipment_item = Equipment.query.filter_by(name=item_name).first()
            if equipment_item:
                car.equipment.append(equipment_item)

        # If new images are uploaded, replace the old ones
        if form.images.data and form.images.data[0].filename:
            CarImage.query.filter_by(car_id=car.id).delete()
            for image_file in form.images.data:
                image_url = save_seller_document(image_file)
                if image_url:
                    new_image = CarImage(image_url=image_url, car_id=car.id)
                    db.session.add(new_image)

        db.session.commit()
        flash(
            f'Listing for "{car.year} {car.make} {car.model}" has been updated successfully.',
            "success",
        )
        return redirect(url_for("auctions.list_auctions"))

    return render_template(
        "submit_car.html",
        title=f"Admin Edit: {car.year} {car.make} {car.model}",
        form=form,
    )


@admin_bp.route("/approve_car/<int:car_id>", methods=["POST"])
@login_required
@admin_required
def approve_car(car_id):
    car = Car.query.get_or_404(car_id)
    car.is_approved = True

    # --- Notify the seller ---
    if car.listing_type == "auction" and car.auction:
        link = url_for("auctions.auction_detail", auction_id=car.auction.id)
    elif car.listing_type == "sale":
        link = url_for("main.car_detail", car_id=car.id)
    elif car.listing_type == "rental" and car.rental_listing:
        link = url_for("rentals.rental_detail", listing_id=car.rental_listing.id)
    else:
        link = url_for("main.home")
    message = f"Congratulations! Your listing for the {car.year} {car.make} {car.model} has been approved and is now live."
    new_notification = Notification(user_id=car.owner_id, message=message)
    db.session.add(new_notification)
    db.session.flush()  # Get ID
    new_notification.link = (
        url_for(
            "auctions.auction_detail",
            auction_id=car.auction.id,
            notification_id=new_notification.id,
        )
        if car.auction
        else link
    )
    db.session.commit()

    # --- Real-time Notification ---
    unread_count = Notification.query.filter_by(
        user_id=car.owner_id, is_read=False
    ).count()
    notification_data = {
        "message": new_notification.message,
        "link": new_notification.link,
        "timestamp": new_notification.timestamp.isoformat() + "Z",
        "count": unread_count,
    }
    socketio.emit("new_notification", notification_data, room=str(car.owner_id))
    send_push_notification(car.owner_id, new_notification.message)

    flash(f"Car {car.make} {car.model} has been approved.", "success")
    return redirect(url_for("admin.dashboard"))


@admin_bp.route("/listing/delete/<int:car_id>", methods=["POST"])
@login_required
@admin_required
def delete_listing(car_id):
    """Allows an admin to delete a car and its associated listing."""
    car = Car.query.get_or_404(car_id)

    # The Car model's relationships have cascades to delete related items
    db.session.delete(car)
    db.session.commit()
    flash(
        f'The listing for "{car.year} {car.make} {car.model}" has been permanently deleted.',
        "success",
    )
    return redirect(url_for("auctions.list_auctions"))


@admin_bp.route("/api/listings", methods=["POST"])
@admin_token_required
def api_create_listing(current_user):
    """API endpoint for an admin to create a new car listing."""
    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "message": "Invalid JSON payload."}), 400

    # Basic validation
    required_fields = [
        "make",
        "model",
        "year",
        "description",
        "listing_type",
        "owner_id",
    ]
    if not all(field in data for field in required_fields):
        return jsonify({"status": "error", "message": "Missing required fields."}), 400

    # Create the car object
    new_car = Car(
        make=data["make"],
        model=data["model"],
        year=data["year"],
        description=data["description"],
        listing_type=data["listing_type"],
        owner_id=data["owner_id"],
        is_approved=data.get(
            "is_approved", True
        ),  # Admins can create approved listings directly
        is_active=data.get("is_active", True),
        is_featured=data.get("is_featured", False),
        condition=data.get("condition"),
        body_type=data.get("body_type"),
        mileage=data.get("mileage"),
        transmission=data.get("transmission"),
        drivetrain=data.get("drivetrain"),
        fuel_type=data.get("fuel_type"),
    )
    db.session.add(new_car)

    # Create associated listing type
    if new_car.listing_type == "auction":
        new_car.auction = Auction(
            start_price=data.get("start_price", 0),
            current_price=data.get("start_price", 0),
            end_time=datetime.fromisoformat(data["end_time"]),
        )
    elif new_car.listing_type == "sale":
        new_car.fixed_price = data.get("fixed_price")
    elif new_car.listing_type == "rental":
        new_car.rental_listing = RentalListing(price_per_day=data.get("price_per_day"))

    db.session.commit()
    return (
        jsonify(
            {
                "status": "success",
                "message": "New listing created successfully.",
                "car": new_car.to_dict(),
            }
        ),
        201,
    )


@admin_bp.route("/api/listings/<int:car_id>", methods=["GET", "PUT", "POST", "DELETE"])
@admin_token_required
def api_manage_listing(current_user, car_id):
    """Comprehensive API endpoint for an admin to manage a single car listing."""
    car = Car.query.get_or_404(car_id)

    if request.method == "GET":
        # Manually construct the dictionary to handle potential missing relationships safely
        car_data = {
            "id": car.id,
            "make": car.make,
            "model": car.model,
            "year": car.year,
            "description": car.description,
            "listing_type": car.listing_type,
            "fixed_price": car.fixed_price,
            "is_approved": car.is_approved,
            "is_active": car.is_active,
            "condition": car.condition,
            "body_type": car.body_type,
            "mileage": car.mileage,
            "transmission": car.transmission,
            "drivetrain": car.drivetrain,
            "fuel_type": car.fuel_type,
            "is_featured": car.is_featured,
            "owner": {"username": car.owner.username} if car.owner else None,
            "auction": (
                {
                    "current_price": car.auction.current_price,
                    "end_time": (
                        car.auction.end_time.isoformat()
                        if car.auction.end_time
                        else None
                    ),
                }
                if car.auction
                else None
            ),
            "rental_listing": (
                {"price_per_day": car.rental_listing.price_per_day}
                if car.rental_listing
                else None
            ),
            "last_changes": (
                car.last_changes.split(",")
                if getattr(car, "last_changes", None)
                else []
            ),
            "images": [
                {
                    "id": img.id,
                    "image_url": url_for(
                        "static",
                        filename=img.image_url.split("/static/")[1],
                        _external=True,
                    ),
                    "order": img.order,
                }
                for img in sorted(car.images, key=lambda i: i.order)
                if img.image_url and "/static/" in img.image_url
            ],
        }
        return jsonify(car=car_data)

    elif request.method == "PUT":
        # This now handles multipart/form-data for image uploads
        data = request.form.to_dict()
        files = request.files.getlist("images")
        current_app.logger.debug(
            "Admin listing update received for car_id=%s with %s uploaded files.",
            car_id,
            len([f for f in files if f.filename]),
        )

        # Update basic car fields
        for field in [
            "make",
            "model",
            "description",
            "condition",
            "body_type",
            "transmission",
            "drivetrain",
            "fuel_type",
        ]:
            if field in data:
                setattr(car, field, data[field])

        # Handle booleans, which come as strings from forms
        for field in ["is_approved", "is_active", "is_featured"]:
            if field in data:
                setattr(car, field, data[field].lower() in ["true", "1", "on"])

        # Handle numbers
        for field in ["year", "mileage", "fixed_price"]:
            if field in data and data[field]:
                try:
                    setattr(car, field, int(float(data[field])))
                except (ValueError, TypeError):
                    pass  # Ignore if conversion fails

        # Handle listing type and price changes
        if "listing_type" in data and data["listing_type"] != car.listing_type:
            # Clear old listing data
            if car.auction:
                db.session.delete(car.auction)
            if car.rental_listing:
                db.session.delete(car.rental_listing)
            car.fixed_price = None
            # Set new listing type
            car.listing_type = data["listing_type"]

        # Update listing-specific details based on the (potentially new) type
        if car.listing_type == "auction":
            if not car.auction:
                car.auction = Auction(car_id=car.id)
            car.auction.start_price = data.get("start_price", car.auction.start_price)
            if not car.auction.bids:
                car.auction.current_price = car.auction.start_price
            if "end_time" in data:
                car.auction.end_time = datetime.fromisoformat(data["end_time"])
        elif car.listing_type == "sale":
            car.fixed_price = data.get("fixed_price", car.fixed_price)
        elif car.listing_type == "rental":
            if not car.rental_listing:
                car.rental_listing = RentalListing(car_id=car.id)
            car.rental_listing.price_per_day = data.get(
                "price_per_day", car.rental_listing.price_per_day
            )

        # If new images are uploaded, replace the old ones
        if files and any(f.filename for f in files):
            current_app.logger.debug("Appending new images to car_id=%s.", car_id)
            # Find the highest current order number to append new images correctly
            highest_order = (
                db.session.query(func.max(CarImage.order))
                .filter_by(car_id=car.id)
                .scalar()
                or -1
            )

            for image_file in files:
                image_url = save_seller_document(image_file)
                if image_url:
                    highest_order += 1
                    new_image = CarImage(
                        image_url=image_url, car_id=car.id, order=highest_order
                    )
                    db.session.add(new_image)

        db.session.commit()
        # Manually construct the response to include detailed image data for the mobile app
        car_data = car.to_dict(include_owner=True)
        car_data["images"] = [
            {
                "id": img.id,
                "image_url": url_for(
                    "static",
                    filename=img.image_url.split("/static/")[1],
                    _external=True,
                ),
                "order": img.order,
            }
            for img in sorted(car.images, key=lambda i: i.order)
            if img.image_url and "/static/" in img.image_url
        ]
        return jsonify(
            {
                "status": "success",
                "message": "Listing updated successfully.",
                "car": car_data,
            }
        )

    elif request.method == "POST":
        # Handle actions like 'approve'
        data = request.get_json()
        action = data.get("action")

        if action == "approve":
            car.is_approved = True
            car.last_changes = None  # Clear the changes log upon approval
            # Logic to notify the seller
            message = f"Congratulations! Your listing for the {car.year} {car.make} {car.model} has been approved and is now live."
            notification = Notification(user_id=car.owner_id, message=message)
            db.session.add(notification)
            db.session.flush()
            notification.link = (
                url_for(
                    "auctions.auction_detail",
                    auction_id=car.auction.id,
                    notification_id=notification.id,
                )
                if car.auction
                else url_for("main.car_detail", car_id=car.id)
            )
            db.session.commit()
            # Emit real-time notification
            unread_count = Notification.query.filter_by(
                user_id=car.owner_id, is_read=False
            ).count()
            socketio.emit(
                "new_notification",
                {
                    "message": notification.message,
                    "link": notification.link,
                    "timestamp": notification.timestamp.isoformat() + "Z",
                    "count": unread_count,
                },
                room=str(car.owner_id),
            )
            send_push_notification(car.owner_id, notification.message)
            return jsonify({"status": "success", "message": "Car has been approved."})

        if action == "reject":
            car.is_approved = False
            car.is_active = False
            car.last_changes = None
            message = (
                f"Your listing for the {car.year} {car.make} {car.model} "
                "was rejected by the admin."
            )
            notification = Notification(
                user_id=car.owner_id,
                message=message,
                link=url_for("main.car_detail", car_id=car.id),
            )
            db.session.add(notification)
            db.session.commit()
            unread_count = Notification.query.filter_by(
                user_id=car.owner_id, is_read=False
            ).count()
            socketio.emit(
                "new_notification",
                {
                    "message": notification.message,
                    "link": notification.link,
                    "timestamp": notification.timestamp.isoformat() + "Z",
                    "count": unread_count,
                },
                room=str(car.owner_id),
            )
            send_push_notification(car.owner_id, notification.message)
            return jsonify({"status": "success", "message": "Car has been rejected."})

        return jsonify({"status": "error", "message": "Invalid action."}), 400

    elif request.method == "DELETE":
        # Permanently delete the listing
        db.session.delete(car)
        db.session.commit()
        return jsonify(
            {"status": "success", "message": "Listing has been permanently deleted."}
        )

    return jsonify({"status": "error", "message": "Method not supported."}), 405


@admin_bp.route("/api/listings/<int:car_id>/images/<int:image_id>", methods=["DELETE"])
@admin_token_required
def api_delete_image(current_user, car_id, image_id):
    """API endpoint for an admin to delete a single car image."""
    car = Car.query.get_or_404(car_id)
    image = CarImage.query.filter_by(id=image_id, car_id=car.id).first_or_404()

    # Optional: Delete the actual file from the server
    # import os
    # from flask import current_app
    # try:
    #     if '/static/' in image.image_url:
    #         filename = image.image_url.split('/static/')[1]
    #         file_path = os.path.join(current_app.root_path, 'static', filename)
    #         if os.path.exists(file_path):
    #             os.remove(file_path)
    # except Exception as e:
    #     current_app.logger.error(f"Error deleting image file {image.image_url}: {e}")

    db.session.delete(image)
    db.session.commit()
    return jsonify({"status": "success", "message": "Image deleted successfully."})


@admin_bp.route("/api/listings/<int:car_id>/images/reorder", methods=["POST"])
@admin_token_required
def api_reorder_images(current_user, car_id):
    """API endpoint for an admin to reorder car images."""
    data = request.get_json()
    image_ids = data.get("image_ids")
    if not image_ids or not isinstance(image_ids, list):
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "Invalid payload. `image_ids` must be a list.",
                }
            ),
            400,
        )

    for index, image_id in enumerate(image_ids):
        CarImage.query.filter_by(id=image_id, car_id=car_id).update({"order": index})

    db.session.commit()
    return jsonify({"status": "success", "message": "Image order updated."})
