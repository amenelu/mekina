from flask import (
    Blueprint,
    render_template,
    redirect,
    url_for,
    flash,
    request,
    abort,
    current_app,
    jsonify,
)
from flask_login import login_required, current_user, AnonymousUserMixin
from models.car_request import CarRequest
from werkzeug.utils import secure_filename
from models.dealer_bid import DealerBid
from models.car import Car
from models.car_image import CarImage
from models.dealer_bid_image import DealerBidImage
from models.user import User
from models.request_question import RequestQuestion
from models.question import Question
from models.auction import Auction
from models.conversation import Conversation
import os  # Import the os module
from models.chat_message import ChatMessage
from models.notification import Notification
from models.dealer_point_request import DealerPointRequest
from models.dealer_rating import DealerRating
from models.dealer_request_view import DealerRequestView
from models.search_query import SearchQuery
from models.point_transaction import PointTransaction
from models.user_favorite import UserFavorite
from extensions import db, socketio
from sqlalchemy import func, or_
from functools import wraps
from datetime import datetime
from datetime import datetime, timedelta
from flask_wtf import FlaskForm  # Import timedelta
from wtforms import (
    StringField,
    IntegerField,
    TextAreaField,
    SelectField,
    DateField,
    FloatField,
    SubmitField,
)
from wtforms.validators import (
    DataRequired,
    NumberRange,
    Optional,
    Length,
    ValidationError,
)  # Import FileField and FileAllowed
from wtforms import FileField, MultipleFileField
from flask_wtf.file import FileAllowed
from routes.main import mark_notification_as_read
from routes.seller import save_base64_image, token_required
from routes.main import send_push_notification
from routes.auth import verify_jwt

dealer_bp = Blueprint("dealer", __name__, url_prefix="/dealer")


# Custom decorator to check for dealer privileges
def dealer_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Admins should also have access to dealer pages
        if not current_user.is_authenticated or not (
            current_user.is_dealer or current_user.is_admin
        ):
            abort(403)  # Forbidden
        # A non-admin dealer should not be able to access other dealers' pages if they guess the URL
        if (
            not current_user.is_admin
            and "dealer_id" in kwargs
            and kwargs["dealer_id"] != current_user.id
        ):
            abort(403)
        return f(*args, **kwargs)

    return decorated_function


class DealerBidForm(FlaskForm):
    price = FloatField(
        "Cash Offer Price (ETB)", validators=[DataRequired(), NumberRange(min=1)]
    )
    price_with_loan = FloatField(
        "Offer Price with Bank Loan (ETB)", validators=[Optional(), NumberRange(min=1)]
    )
    make = StringField("Car Make", validators=[DataRequired()])
    model = StringField("Car Model", validators=[DataRequired()])
    car_year = IntegerField(
        "Car Year",
        validators=[DataRequired(), NumberRange(min=1900, max=datetime.now().year + 1)],
    )
    condition = SelectField(
        "Condition",
        choices=[("New", "New"), ("Used", "Used")],
        validators=[DataRequired()],
    )
    mileage = IntegerField("Mileage (km)", validators=[Optional(), NumberRange(min=0)])
    availability = SelectField(
        "Availability",
        choices=[
            ("In Stock", "In Stock"),
            ("Available on Order", "Available on Order"),
        ],
        validators=[DataRequired()],
    )
    valid_until = DateField(
        "Offer Valid Until", format="%Y-%m-%d", validators=[DataRequired()]
    )
    extras = TextAreaField(
        "Extras (e.g., free service, floor mats)",
        validators=[Optional(), Length(max=500)],
    )
    message = TextAreaField(
        "Message to Customer (Optional)", validators=[Optional(), Length(max=1000)]
    )
    photos = MultipleFileField(
        "Car Photos (Optional)",
        validators=[FileAllowed(["jpg", "png", "jpeg", "gif"], "Images only!")],
    )  # New photo field
    submit = SubmitField("Submit Offer")

    def validate_valid_until(self, field):
        """Custom validator to ensure 'Offer Valid Until' is not a past date."""
        if field.data and field.data < datetime.utcnow().date():
            raise ValidationError("The offer valid until date cannot be in the past.")

    def validate_mileage(self, field):
        """Custom validator to make mileage required only for used cars."""
        if self.condition.data == "Used" and field.data is None:
            raise ValidationError("Mileage is required for used cars.")


# Define the grace period for free edits (e.g., 30 minutes)
EDIT_GRACE_PERIOD_MINUTES = 30
BID_PHOTO_UPLOAD_FOLDER = "static/uploads/dealer_bids"  # Define upload folder
BID_FREE_EDIT_WINDOW_SECONDS = 5 * 60


def _bid_free_edit_expires_at(bid):
    return bid.timestamp + timedelta(seconds=BID_FREE_EDIT_WINDOW_SECONDS)


def _bid_is_in_free_edit_window(bid):
    return datetime.utcnow() <= _bid_free_edit_expires_at(bid)


def _parse_bid_payload(data):
    try:
        price = float(data.get("price"))
        car_year = int(data.get("car_year"))
        mileage = int(data.get("mileage")) if data.get("mileage") else 0
        valid_until = datetime.strptime(data.get("valid_until"), "%Y-%m-%d").date()
        price_with_loan = (
            float(data.get("price_with_loan"))
            if data.get("price_with_loan") not in {None, ""}
            else None
        )
    except (ValueError, TypeError):
        raise ValueError("Invalid data format for price, year, mileage, or valid_until.")

    if price <= 0:
        raise ValueError("Bid price must be positive.")

    return {
        "price": price,
        "price_with_loan": price_with_loan,
        "make": data.get("make"),
        "model": data.get("model"),
        "car_year": car_year,
        "mileage": mileage,
        "condition": data.get("condition"),
        "availability": data.get("availability"),
        "valid_until": valid_until,
        "extras": data.get("extras"),
        "message": data.get("message"),
    }


def _collect_bid_images_from_payload(data, car_request_id):
    uploaded_images = []
    if data.get("images_base64"):
        for img_b64 in data["images_base64"]:
            fname = save_base64_image(
                img_b64, filename_prefix=f"dealer_bid_{car_request_id}"
            )
            if fname:
                uploaded_images.append(fname)
    elif data.get("image_base64"):
        photo_filename = save_base64_image(
            data["image_base64"], filename_prefix=f"dealer_bid_{car_request_id}"
        )
        if photo_filename:
            uploaded_images.append(photo_filename)
    elif data.get("image_url"):
        uploaded_images.append(data["image_url"])
    return uploaded_images


class RequestAnswerForm(FlaskForm):
    answer_text = TextAreaField(
        "Your Answer", validators=[DataRequired(), Length(min=5)]
    )
    submit = SubmitField("Post Answer")


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


def calculate_request_score(req):
    """Calculates a score (0-100) representing the detail level of a request."""
    score = 10

    # Specificity: Make, Model, Year, Mileage
    if req.make and req.model:
        score += 45
    elif req.make:
        score += 20

    if req.min_year:
        score += 10

    if req.max_mileage:
        score += 10
    elif req.min_year and req.min_year >= datetime.utcnow().year - 1:
        score += 10

    # Clarity: Notes
    if req.notes:
        if "Customer is looking for a car" in req.notes:  # Guided flow requests
            score += 20  # Base score for a guided request
            if "- Budget:" in req.notes and "Not specified" not in req.notes:
                score += 10
            if "- Body Type:" in req.notes and "Not specified" not in req.notes:
                score += 5
            if "- Fuel Type:" in req.notes and "Not specified" not in req.notes:
                score += 5
            if "- Important Features:" in req.notes and "None" not in req.notes:
                score += 5
        elif len(req.notes) > 50:
            score += 20
        elif len(req.notes) > 5:
            score += 10

    # Visuals: Images
    image_count = (
        len(req.images) if hasattr(req.images, "__len__") else req.images.count()
    )
    if image_count > 0:
        score += 10
    if image_count > 2:
        score += 5

    return min(score, 100)


@dealer_bp.route("/dashboard")
@login_required
@dealer_required
def dashboard():
    # Get filter from request args
    filter_new = request.args.get("filter_new", "false").lower() == "true"

    # --- Dealer Functionality: Fetch customer requests ---
    # OPTIMIZATION: Use a single query with subqueries to avoid the N+1 problem.
    # This calculates bid counts and lowest offers in the database, not in a Python loop.
    bid_count_subquery = (
        db.session.query(
            DealerBid.request_id, func.count(DealerBid.id).label("bid_count")
        )
        .group_by(DealerBid.request_id)
        .subquery()
    )

    lowest_offer_subquery = (
        db.session.query(
            DealerBid.request_id, func.min(DealerBid.price).label("lowest_offer")
        )
        .group_by(DealerBid.request_id)
        .subquery()
    )

    # Subquery to get all request IDs that the current dealer has already viewed.
    viewed_requests_subquery = (
        db.session.query(DealerRequestView.request_id)
        .filter(DealerRequestView.dealer_id == current_user.id)
        .subquery()
    )

    query = (
        db.session.query(
            CarRequest,
            bid_count_subquery.c.bid_count,
            lowest_offer_subquery.c.lowest_offer,
            # This will be True if the request has been viewed, otherwise False.
            (CarRequest.id.in_(db.select(viewed_requests_subquery))).label(
                "has_been_viewed"
            ),
        )
        .outerjoin(bid_count_subquery, CarRequest.id == bid_count_subquery.c.request_id)
        .outerjoin(
            lowest_offer_subquery, CarRequest.id == lowest_offer_subquery.c.request_id
        )
        .filter(CarRequest.status == "active")
    )

    # Apply the filter if requested
    if filter_new:
        query = query.filter(CarRequest.id.notin_(db.select(viewed_requests_subquery)))

    active_requests = query.order_by(CarRequest.created_at.desc()).all()
    # --- Seller Functionality: Fetch dealer's own listings and questions ---
    my_cars = (
        Car.query.filter_by(owner_id=current_user.id).order_by(Car.id.desc()).all()
    )
    my_car_ids = [car.id for car in my_cars]
    my_auctions = Auction.query.filter(Auction.car_id.in_(my_car_ids)).all()
    my_auction_ids = [auction.id for auction in my_auctions]
    unanswered_questions = (
        Question.query.filter(
            Question.auction_id.in_(my_auction_ids), Question.answer_text == None
        )
        .order_by(Question.timestamp.desc())
        .all()
    )

    # --- New: Fetch unanswered questions on dealer's offers ---
    unanswered_request_questions = (
        RequestQuestion.query.join(DealerBid)
        .filter(
            DealerBid.dealer_id == current_user.id, RequestQuestion.answer_text == None
        )
        .order_by(RequestQuestion.timestamp.desc())
        .all()
    )

    pending_approval_count = Car.query.filter_by(
        owner_id=current_user.id, is_approved=False
    ).count()

    return render_template(
        "dealer_dashboard.html",
        requests=active_requests,
        my_cars=my_cars,
        unanswered_questions=unanswered_questions,
        unanswered_request_questions=unanswered_request_questions,
        now=datetime.utcnow(),
        filter_new=filter_new,
        pending_approval_count=pending_approval_count,
    )


@dealer_bp.route("/api/dashboard")
@token_required
def api_dealer_dashboard(current_user):
    """API endpoint for dealer dashboard data."""
    if not (current_user.is_dealer or current_user.is_admin):
        return jsonify({"message": "Dealer access required."}), 403

    filter_new = request.args.get("filter_new", "false").lower() == "true"

    bid_count_subquery = (
        db.session.query(
            DealerBid.request_id, func.count(DealerBid.id).label("bid_count")
        )
        .group_by(DealerBid.request_id)
        .subquery()
    )

    lowest_offer_subquery = (
        db.session.query(
            DealerBid.request_id, func.min(DealerBid.price).label("lowest_offer")
        )
        .group_by(DealerBid.request_id)
        .subquery()
    )

    viewed_requests_subquery = (
        db.session.query(DealerRequestView.request_id)
        .filter(DealerRequestView.dealer_id == current_user.id)
        .subquery()
    )

    query = (
        db.session.query(
            CarRequest,
            bid_count_subquery.c.bid_count,
            lowest_offer_subquery.c.lowest_offer,
            (CarRequest.id.in_(db.select(viewed_requests_subquery))).label(
                "has_been_viewed"
            ),
        )
        .outerjoin(bid_count_subquery, CarRequest.id == bid_count_subquery.c.request_id)
        .outerjoin(
            lowest_offer_subquery, CarRequest.id == lowest_offer_subquery.c.request_id
        )
        .filter(CarRequest.status == "active")
    )

    if filter_new:
        query = query.filter(CarRequest.id.notin_(db.select(viewed_requests_subquery)))

    active_requests_data = []
    for req, bid_count, lowest_offer, has_been_viewed in query.order_by(
        CarRequest.created_at.desc()
    ).all():
        req_dict = req.to_dict()
        req_dict["bid_count"] = bid_count or 0
        req_dict["lowest_offer"] = lowest_offer
        req_dict["has_been_viewed"] = has_been_viewed
        req_dict["detail_score"] = calculate_request_score(req)
        active_requests_data.append(req_dict)

    my_cars = (
        Car.query.filter_by(owner_id=current_user.id).order_by(Car.id.desc()).all()
    )
    my_car_ids = [car.id for car in my_cars]
    my_auctions = Auction.query.filter(Auction.car_id.in_(my_car_ids)).all()
    my_auction_ids = [auction.id for auction in my_auctions]
    unanswered_questions = (
        Question.query.filter(
            Question.auction_id.in_(my_auction_ids), Question.answer_text == None
        )
        .order_by(Question.timestamp.desc())
        .all()
    )
    unanswered_request_questions = (
        RequestQuestion.query.join(DealerBid)
        .filter(
            DealerBid.dealer_id == current_user.id, RequestQuestion.answer_text == None
        )
        .order_by(RequestQuestion.timestamp.desc())
        .all()
    )

    pending_approvals = (
        Car.query.filter_by(owner_id=current_user.id, is_approved=False)
        .order_by(Car.id.desc())
        .all()
    )

    # Fetch recent conversations using the robust to_dict method
    recent_conversations = (
        Conversation.query.filter_by(dealer_id=current_user.id)
        .order_by(Conversation.created_at.desc())
        .limit(5)  # Limit to a few recent ones for the dashboard
        .all()
    )

    return jsonify(
        requests=active_requests_data,
        my_cars=[car.to_dict() for car in my_cars],
        unanswered_questions=[q.to_dict() for q in unanswered_questions],
        unanswered_request_questions=[
            _request_question_to_api_dict(q) for q in unanswered_request_questions
        ],
        conversations=[conv.to_dict(current_user.id) for conv in recent_conversations],
        now=datetime.utcnow().isoformat() + "Z",
        user_points=current_user.points,
        pending_approval_count=len(pending_approvals),
        pending_approvals=[car.to_dict() for car in pending_approvals],
    )


def _request_question_to_api_dict(question):
    bid = question.dealer_bid
    car_request = bid.car_request if bid else None
    buyer = User.query.get(question.user_id) if question.user_id else None
    return {
        **question.to_dict(),
        "request_id": car_request.id if car_request else None,
        "request_title": (
            f"{car_request.make or 'Any Make'} {car_request.model or ''}".strip()
            if car_request
            else "Customer Request"
        ),
        "bid_id": bid.id if bid else None,
        "bid_price": bid.price if bid else None,
        "bid_vehicle": (
            f"{bid.car_year} {bid.make} {bid.model}".strip() if bid else None
        ),
        "buyer": (
            {
                "id": buyer.id,
                "username": buyer.username,
            }
            if buyer
            else None
        ),
    }


@dealer_bp.route("/api/request-questions/unanswered")
@token_required
def api_unanswered_request_questions(current_user):
    if not current_user.is_dealer:
        return jsonify({"message": "Dealer access required."}), 403

    questions = (
        RequestQuestion.query.join(DealerBid)
        .filter(
            DealerBid.dealer_id == current_user.id,
            RequestQuestion.answer_text == None,
        )
        .order_by(RequestQuestion.timestamp.desc())
        .all()
    )
    return jsonify(
        questions=[_request_question_to_api_dict(question) for question in questions]
    )


@dealer_bp.route("/api/request-questions/<int:question_id>/answer", methods=["POST"])
@token_required
def api_answer_request_question(current_user, question_id):
    if not current_user.is_dealer:
        return jsonify({"message": "Dealer access required."}), 403

    question = RequestQuestion.query.get_or_404(question_id)
    bid = question.dealer_bid
    if not bid or bid.dealer_id != current_user.id:
        return jsonify({"message": "Permission denied."}), 403

    data = request.get_json(silent=True) or {}
    answer_text = (data.get("answer_text") or "").strip()
    if len(answer_text) < 2:
        return jsonify({"message": "Answer text is required."}), 400

    question.answer_text = answer_text
    question.answered_at = datetime.utcnow()

    notification = Notification(
        user_id=question.user_id,
        message=(
            "The dealer answered your question about their offer "
            f"for request #{bid.car_request.id}."
        ),
        link=f"/request/{bid.car_request.id}?bid_id={bid.id}",
    )
    db.session.add(notification)
    db.session.commit()

    unread_count = Notification.query.filter_by(
        user_id=question.user_id, is_read=False
    ).count()
    socketio.emit(
        "new_notification",
        {
            "message": notification.message,
            "link": notification.link,
            "timestamp": notification.timestamp.isoformat() + "Z",
            "count": unread_count,
        },
        room=str(question.user_id),
    )
    send_push_notification(question.user_id, notification.message)

    return jsonify(
        {
            "status": "success",
            "message": "Your answer has been sent.",
            "question": _request_question_to_api_dict(question),
        }
    )


@dealer_bp.route("/api/analytics/popular-requests")
@token_required
def api_popular_requests(current_user):
    """Provides analytics on popular car requests."""
    if not (current_user.is_dealer or current_user.is_admin):
        abort(403)

    thirty_days_ago = datetime.utcnow() - timedelta(days=30)

    # Aggregate popular makes
    popular_makes = (
        db.session.query(CarRequest.make, func.count(CarRequest.make).label("count"))
        .filter(
            CarRequest.make.isnot(None),
            CarRequest.make != "",
            CarRequest.created_at >= thirty_days_ago,
        )
        .group_by(CarRequest.make)
        .order_by(func.count(CarRequest.make).desc())
        .limit(10)
        .all()
    )

    # Aggregate popular models
    popular_models = (
        db.session.query(
            CarRequest.make,
            CarRequest.model,
            func.count(CarRequest.model).label("count"),
        )
        .filter(
            CarRequest.model.isnot(None),
            CarRequest.model != "",
            CarRequest.created_at >= thirty_days_ago,
        )
        .group_by(CarRequest.make, CarRequest.model)
        .order_by(func.count(CarRequest.model).desc())
        .limit(10)
        .all()
    )

    return jsonify(
        {
            "popular_makes": [
                {"make": make, "count": count} for make, count in popular_makes
            ],
            "popular_models": [
                {"make": make, "model": model, "count": count}
                for make, model, count in popular_models
            ],
        }
    )


@dealer_bp.route("/api/analytics/popular-searches")
@token_required
def api_popular_searches(current_user):
    """Provides analytics on popular search terms."""
    if not (current_user.is_dealer or current_user.is_admin):
        abort(403)

    thirty_days_ago = datetime.utcnow() - timedelta(days=30)

    popular_searches = (
        db.session.query(
            SearchQuery.query_text, func.count(SearchQuery.query_text).label("count")
        )
        .filter(SearchQuery.timestamp >= thirty_days_ago)
        .group_by(SearchQuery.query_text)
        .order_by(func.count(SearchQuery.query_text).desc())
        .limit(20)
        .all()
    )

    return jsonify(
        {
            "popular_searches": [
                {"term": term, "count": count} for term, count in popular_searches
            ]
        }
    )


@dealer_bp.route("/api/analytics/most-liked-cars")
@token_required
def api_most_liked_cars(current_user):
    """Shows which of this dealer's listings buyers have favorited most."""
    if not (current_user.is_dealer or current_user.is_admin):
        abort(403)

    favorites_count = func.count(UserFavorite.id).label("favorite_count")
    query = (
        db.session.query(Car, favorites_count)
        .join(UserFavorite, UserFavorite.car_id == Car.id)
        .filter(Car.is_active == True, Car.is_approved == True)
    )

    if current_user.is_dealer and not current_user.is_admin:
        query = query.filter(Car.owner_id == current_user.id)

    rows = (
        query.group_by(Car.id)
        .order_by(favorites_count.desc(), Car.id.asc())
        .limit(10)
        .all()
    )

    return jsonify(
        {
            "most_liked_cars": [
                {
                    "id": car.id,
                    "make": car.make,
                    "model": car.model,
                    "year": car.year,
                    "listing_type": car.listing_type,
                    "price_display": car.get_price_display(),
                    "primary_image_url": car.primary_image_url,
                    "favorite_count": int(favorite_count or 0),
                }
                for car, favorite_count in rows
            ]
        }
    )


@dealer_bp.route("/api/points/request", methods=["POST"])
@token_required
def api_request_more_points(current_user):
    if not (current_user.is_dealer or current_user.is_rental_company):
        return (
            jsonify(
                {
                    "message": "Only dealers and rental companies can request more points."
                }
            ),
            403,
        )

    data = request.get_json() or {}
    requested_points = data.get("requested_points")
    reason = (data.get("reason") or "").strip()

    try:
        requested_points = int(requested_points)
    except (TypeError, ValueError):
        return jsonify({"message": "Requested points must be a whole number."}), 400

    if requested_points <= 0:
        return jsonify({"message": "Requested points must be greater than zero."}), 400

    admins = User.query.filter_by(is_admin=True).all()
    if not admins:
        return jsonify({"message": "No admin accounts are available right now."}), 500

    requester_label = "Rental company" if current_user.is_rental_company else "Dealer"
    message = f"{requester_label} {current_user.username} requested {requested_points} more points."
    if reason:
        message += f" Reason: {reason}"

    link = "/(admin)/dealers"

    point_request = DealerPointRequest(
        dealer_id=current_user.id,
        requested_points=requested_points,
        reason=reason or None,
    )
    db.session.add(point_request)

    for admin in admins:
        notification = Notification(user_id=admin.id, message=message, link=link)
        db.session.add(notification)

    db.session.commit()

    for admin in admins:
        unread_count = Notification.query.filter_by(
            user_id=admin.id, is_read=False
        ).count()
        socketio.emit(
            "new_notification",
            {"count": unread_count, "message": message, "link": link},
            room=str(admin.id),
        )

    current_app.logger.info(
        "Dealer points request submitted by user_id=%s for %s points.",
        current_user.id,
        requested_points,
    )

    return jsonify(
        {
            "status": "success",
            "message": "Your request has been sent to the admin.",
        }
    )


@dealer_bp.route("/api/points/history")
@token_required
def api_points_history(current_user):
    """API endpoint to get point transaction history for the authenticated dealer/rental company."""
    if not (current_user.is_dealer or current_user.is_rental_company):
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "Only dealers and rental companies can access point history.",
                }
            ),
            403,
        )

    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)

    pagination = (
        PointTransaction.query.filter_by(user_id=current_user.id)
        .order_by(PointTransaction.created_at.desc())
        .paginate(page=page, per_page=per_page, error_out=False)
    )

    return jsonify(
        {
            "current_points": current_user.points or 0,
            "transactions": [
                {
                    "id": t.id,
                    "amount": t.amount,
                    "transaction_type": t.transaction_type,
                    "description": t.description,
                    "timestamp": t.created_at.isoformat() + "Z",
                }
                for t in pagination.items
            ],
            "pagination": _pagination_meta(pagination),
        }
    )


@dealer_bp.route("/api/analytics/advanced")
@token_required
def api_advanced_analytics(current_user):
    """Provides advanced analytics for the dealer dashboard if spending thresholds are met."""
    if not (current_user.is_dealer or current_user.is_admin):
        abort(403)

    # --- Check Spending Thresholds ---
    WEEKLY_THRESHOLD = 5
    MONTHLY_THRESHOLD = 20

    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    spent_week = abs(
        db.session.query(func.sum(PointTransaction.amount))
        .filter(
            PointTransaction.user_id == current_user.id,
            PointTransaction.amount < 0,
            PointTransaction.created_at >= week_ago,
        )
        .scalar()
        or 0
    )
    spent_month = abs(
        db.session.query(func.sum(PointTransaction.amount))
        .filter(
            PointTransaction.user_id == current_user.id,
            PointTransaction.amount < 0,
            PointTransaction.created_at >= month_ago,
        )
        .scalar()
        or 0
    )

    if spent_week < WEEKLY_THRESHOLD and spent_month < MONTHLY_THRESHOLD:
        return jsonify(
            {
                "is_locked": True,
                "spent_week": spent_week,
                "spent_month": spent_month,
                "threshold_week": WEEKLY_THRESHOLD,
                "threshold_month": MONTHLY_THRESHOLD,
                "message": f"Unlock advanced market insights by spending {WEEKLY_THRESHOLD} credits/week or {MONTHLY_THRESHOLD} credits/month.",
            }
        )

    # --- Analytics Generation (Existing Code) ---
    # 1. Market Demand (Budget Distribution from Requests)
    budget_counts = {"Under 1M": 0, "1M - 3M": 0, "3M - 5M": 0, "Over 5M": 0}

    # Analyze last 100 requests for budget trends
    recent_requests = (
        CarRequest.query.order_by(CarRequest.created_at.desc()).limit(100).all()
    )

    for req in recent_requests:
        if not req.notes:
            continue
        note_lower = req.notes.lower()
        if "under 1,000,000" in note_lower or "under 1m" in note_lower:
            budget_counts["Under 1M"] += 1
        elif "1m - 3m" in note_lower or "1,000,000 - 3,000,000" in note_lower:
            budget_counts["1M - 3M"] += 1
        elif "3m - 5m" in note_lower or "3,000,000 - 5,000,000" in note_lower:
            budget_counts["3M - 5M"] += 1
        elif "over 5,000,000" in note_lower or "over 5m" in note_lower:
            budget_counts["Over 5M"] += 1

    market_demand = [{"label": k, "value": v} for k, v in budget_counts.items()]

    # 2. Pricing Intelligence (Avg Price of Top Makes)
    top_makes = (
        db.session.query(Car.make, func.count(Car.id))
        .filter(Car.listing_type == "sale")
        .group_by(Car.make)
        .order_by(func.count(Car.id).desc())
        .limit(5)
        .all()
    )
    pricing_intel = []
    for make, _ in top_makes:
        avg_price = (
            db.session.query(func.avg(Car.fixed_price))
            .filter(Car.make == make, Car.listing_type == "sale", Car.fixed_price > 0)
            .scalar()
        )
        if avg_price:
            pricing_intel.append({"make": make, "avg_price": round(float(avg_price))})

    # 3. Inventory Performance
    my_listings_count = Car.query.filter_by(
        owner_id=current_user.id, is_active=True
    ).count()
    my_bids_count = DealerBid.query.filter_by(dealer_id=current_user.id).count()
    my_wins_count = DealerBid.query.filter_by(
        dealer_id=current_user.id, status="accepted"
    ).count()
    my_closed_deals_count = current_user.get_closed_deal_count()
    my_win_rate = (my_wins_count / my_bids_count * 100) if my_bids_count > 0 else 0

    # 4. Competitive Benchmarking
    global_avg_rating = db.session.query(func.avg(DealerRating.rating)).scalar() or 0
    my_avg_rating = current_user.get_average_rating() or 0

    total_bids = DealerBid.query.count()
    total_wins = DealerBid.query.filter_by(status="accepted").count()
    global_win_rate = (total_wins / total_bids * 100) if total_bids > 0 else 0

    # 5. Buyer Behaviour (Body Types from Search)
    body_types = ["suv", "sedan", "hatchback", "pickup", "coupe"]
    buyer_behaviour = []
    for bt in body_types:
        count = SearchQuery.query.filter(
            SearchQuery.query_text.ilike(f"%{bt}%")
        ).count()
        buyer_behaviour.append({"type": bt.capitalize(), "count": count})

    buyer_behaviour.sort(key=lambda x: x["count"], reverse=True)

    # 6. Drivetrain Preferences (from SearchQuery)
    drivetrain_types = ["awd", "fwd", "rwd", "4wd"]
    drivetrain_demand = []
    for dt in drivetrain_types:
        count = SearchQuery.query.filter(
            SearchQuery.query_text.ilike(f"%{dt}%")
        ).count()
        drivetrain_demand.append({"type": dt.upper(), "count": count})

    drivetrain_demand.sort(key=lambda x: x["count"], reverse=True)

    return jsonify(
        {
            "is_locked": False,
            "market_demand": market_demand,
            "pricing_intelligence": pricing_intel,
            "inventory_performance": {
                "active_listings": my_listings_count,
                "bids_placed": my_bids_count,
                "bids_won": my_wins_count,
                "closed_deals": my_closed_deals_count,
                "win_rate": round(my_win_rate, 1),
            },
            "competitive_benchmarking": {
                "my_rating": round(my_avg_rating, 1),
                "market_avg_rating": round(float(global_avg_rating), 1),
                "my_win_rate": round(my_win_rate, 1),
                "market_win_rate": round(global_win_rate, 1),
            },
            "buyer_behaviour": buyer_behaviour,
            "drivetrain_demand": drivetrain_demand,
        }
    )


@dealer_bp.route("/api/dealers/<int:dealer_id>/profile")
def api_dealer_profile(dealer_id):
    """API endpoint for a dealer's public profile, listings, and ratings."""
    # Handle optional token authentication for mobile users
    user = current_user
    if not user.is_authenticated:
        auth_header = request.headers.get("Authorization")
        if auth_header:
            try:
                token = auth_header.split(" ")[1]
                jwt_user = verify_jwt(token)
                if jwt_user:
                    user = jwt_user
            except (IndexError, ValueError, Exception):
                pass

    dealer = User.query.filter_by(id=dealer_id, is_dealer=True).first_or_404()

    active_listings = (
        Car.query.filter_by(owner_id=dealer.id, is_approved=True, is_active=True)
        .order_by(Car.id.desc())
        .all()
    )

    ratings = dealer.ratings_received.order_by(DealerRating.timestamp.desc()).all()
    avg_rating = 0
    if ratings:
        avg_rating = sum(r.rating for r in ratings) / len(ratings)

    # Determine if the current user can view the phone number (for API, this might be handled client-side)
    can_view_phone = user.is_authenticated and (
        user.id == dealer.id or getattr(user, "is_admin", False)
    )

    return jsonify(
        dealer={
            **dealer.to_dict(detail_level="owner" if can_view_phone else "public"),
            "closed_deal_count": dealer.get_closed_deal_count(),
        },
        listings=[car.to_dict() for car in active_listings],
        ratings=[r.to_dict() for r in ratings],
        avg_rating=round(avg_rating, 2),
        review_count=len(ratings),
    )


@dealer_bp.route("/messages")
@login_required
@dealer_required
def list_messages():
    """Lists all conversations for the dealer."""
    # Use joinedload to efficiently fetch the related lead_score, buyer, and car objects
    conversations = (
        Conversation.query.options(
            db.joinedload(Conversation.lead_score),
            db.joinedload(Conversation.buyer),
            db.joinedload(Conversation.car),
        )
        .filter_by(dealer_id=current_user.id)
        .order_by(Conversation.created_at.desc())
        .all()
    )
    return render_template("dealer_messages.html", conversations=conversations)


@dealer_bp.route("/profile/<int:dealer_id>")
def profile(dealer_id):
    """Displays a dealer's public profile, listings, and ratings."""
    dealer = User.query.filter_by(id=dealer_id, is_dealer=True).first_or_404()

    # Get the dealer's active listings
    active_listings = (
        Car.query.filter_by(owner_id=dealer.id, is_approved=True, is_active=True)
        .order_by(Car.id.desc())
        .all()
    )

    # Calculate average rating
    ratings = dealer.ratings_received.order_by(DealerRating.timestamp.desc()).all()
    avg_rating = 0
    if ratings:
        avg_rating = sum(r.rating for r in ratings) / len(ratings)

    is_profile_owner = current_user.is_authenticated and current_user.id == dealer.id
    can_view_phone = is_profile_owner or (
        current_user.is_authenticated and current_user.is_admin
    )

    return render_template(
        "dealer_profile.html",
        dealer=dealer,
        listings=active_listings,
        ratings=ratings,
        avg_rating=avg_rating,
        can_view_phone=can_view_phone,
    )


@dealer_bp.route("/toggle_verification/<int:dealer_id>", methods=["POST"])
@login_required
def toggle_verification(dealer_id):
    """Allows an admin to verify or un-verify a dealer."""
    # This is a critical admin function, so we must check for admin status explicitly.
    if not current_user.is_admin:
        abort(403)

    dealer = User.query.get_or_404(dealer_id)
    if not dealer.is_dealer:
        flash("This user is not a dealer.", "warning")
        return redirect(url_for("admin.dealer_management"))

    dealer.is_verified = not dealer.is_verified
    db.session.commit()

    status = "verified" if dealer.is_verified else "un-verified"
    flash(f"Dealer '{dealer.username}' has been {status}.", "success")
    return redirect(url_for("dealer.profile", dealer_id=dealer.id))


@dealer_bp.route("/api/messages/<int:conversation_id>/unlock", methods=["POST"])
@token_required
def api_unlock_conversation(current_user, conversation_id):
    """API endpoint for a dealer to spend a point to unlock a conversation."""
    if not current_user.is_dealer:
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "Only dealers can unlock conversations.",
                }
            ),
            403,
        )

    conversation = Conversation.query.get_or_404(conversation_id)

    if conversation.dealer_id != current_user.id:
        return jsonify({"status": "error", "message": "Permission denied."}), 403

    if current_user.points <= 0:
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "You do not have enough credits to unlock this conversation.",
                }
            ),
            400,
        )

    if not conversation.is_unlocked:
        current_user.points -= 1
        conversation.is_unlocked = True
        # Log Transaction
        txn = PointTransaction(
            user_id=current_user.id,
            amount=-1,
            transaction_type="unlock_chat",
            description=f"Unlocked conversation #{conversation.id}",
        )
        db.session.add(txn)

        # Masked messages need to be unmasked for the dealer
        for msg in conversation.messages.filter(
            ChatMessage.sender_id == conversation.buyer_id
        ):
            if msg.original_body:
                msg.body = msg.original_body  # Restore original message
        db.session.commit()
        messages = conversation.messages.order_by(ChatMessage.timestamp.asc()).all()
        return (
            jsonify(
                {
                    "status": "success",
                    "message": "Conversation unlocked!",
                    "dealer_points": current_user.points,
                    "conversation": conversation.to_dict(current_user.id),
                    "messages": [msg.to_dict() for msg in messages],
                }
            ),
            200,
        )
    messages = conversation.messages.order_by(ChatMessage.timestamp.asc()).all()
    return (
        jsonify(
            {
                "status": "info",
                "message": "This conversation is already unlocked.",
                "dealer_points": current_user.points,
                "conversation": conversation.to_dict(current_user.id),
                "messages": [msg.to_dict() for msg in messages],
            }
        ),
        200,
    )


@dealer_bp.route("/messages/<int:conversation_id>", methods=["GET", "POST"])
@login_required
@dealer_required
def view_conversation(conversation_id):
    """Displays a single conversation and allows the dealer to reply."""
    conversation = Conversation.query.get_or_404(conversation_id)

    # Security check: ensure dealer is part of this conversation
    if conversation.dealer_id != current_user.id:
        abort(403)

    # The logic to mark messages as read is now handled by the API endpoint.

    return render_template("dealer_conversation_detail.html", conversation=conversation)


@dealer_bp.route("/messages/<int:conversation_id>/unlock", methods=["POST"])
@login_required
@dealer_required
def unlock_conversation(conversation_id):
    """Allows a dealer to spend a point to unlock a conversation."""
    conversation = Conversation.query.get_or_404(conversation_id)

    # Security check
    if conversation.dealer_id != current_user.id:
        abort(403)

    # Point system check
    if current_user.points <= 0:
        flash("You do not have enough credits to unlock this conversation.", "danger")
        return redirect(
            url_for("dealer.view_conversation", conversation_id=conversation.id)
        )

    if not conversation.is_unlocked:
        # Deduct point and unlock
        current_user.points -= 1
        conversation.is_unlocked = True
        # Log Transaction
        txn = PointTransaction(
            user_id=current_user.id,
            amount=-1,
            transaction_type="unlock_chat",
            description=f"Unlocked conversation #{conversation.id}",
        )
        db.session.add(txn)
        db.session.commit()
        flash(
            "Conversation unlocked! You can now see the buyer's full messages.",
            "success",
        )
    else:
        flash("This conversation is already unlocked.", "info")

    return redirect(
        url_for("dealer.view_conversation", conversation_id=conversation.id)
    )


@dealer_bp.route("/request/<int:request_id>/bid", methods=["GET", "POST"])
@login_required
@dealer_required
def place_bid(request_id):
    car_request = CarRequest.query.get_or_404(request_id)

    # --- Mark the request as viewed by the dealer ---
    # This is idempotent due to the unique constraint on the model.
    view_exists = DealerRequestView.query.filter_by(
        dealer_id=current_user.id, request_id=car_request.id
    ).first()
    if not view_exists:
        new_view = DealerRequestView(
            dealer_id=current_user.id, request_id=car_request.id
        )
        db.session.add(new_view)
        db.session.commit()
    # Get existing bids to show the history
    existing_bids = car_request.dealer_bids.order_by(DealerBid.price.asc()).all()

    form = DealerBidForm()

    if form.validate_on_submit():
        # --- Point System Logic ---
        # Handle photo upload
        uploaded_images = []
        if form.photos.data:
            for file in form.photos.data:
                if not file or not file.filename:
                    continue
                filename = secure_filename(file.filename)
                # Construct the absolute path to the upload directory
                upload_dir_abs = os.path.join(
                    current_app.root_path, BID_PHOTO_UPLOAD_FOLDER
                )
                os.makedirs(
                    upload_dir_abs, exist_ok=True
                )  # Ensure the directory exists

                # Construct the full absolute path to save the file
                file_path_abs = os.path.join(upload_dir_abs, filename)
                file.save(file_path_abs)
                photo_filename = os.path.join(
                    "/", BID_PHOTO_UPLOAD_FOLDER, filename
                ).replace(
                    os.sep, "/"
                )  # Store relative path for web access, ensure forward slashes
                uploaded_images.append(photo_filename)

        # Check if the dealer has enough points to place a bid.
        if current_user.points <= 0:
            flash(
                "You do not have enough points to place an offer. Please purchase more points.",
                "danger",
            )
            return redirect(url_for("dealer.dashboard"))

        new_bid = DealerBid(
            price=form.price.data,
            price_with_loan=form.price_with_loan.data,
            make=form.make.data,
            model=form.model.data,
            car_year=form.car_year.data,
            mileage=form.mileage.data
            or 0,  # Default to 0 if condition is 'New' and mileage is empty
            condition=form.condition.data,
            availability=form.availability.data,
            valid_until=form.valid_until.data,
            extras=form.extras.data,
            message=form.message.data,
            dealer_id=current_user.id,
            request_id=car_request.id,
        )
        db.session.add(new_bid)

        # If a photo was uploaded, create a DealerBidImage and associate it
        for img_url in uploaded_images:
            new_image = DealerBidImage(image_url=img_url)
            new_bid.images.append(new_image)

        # Deduct one point from the dealer's account
        current_user.points -= 1
        # Log Transaction
        txn = PointTransaction(
            user_id=current_user.id,
            amount=-1,
            transaction_type="bid",
            description=f"Bid on request #{car_request.id}",
        )
        db.session.add(txn)

        # --- Notify the customer who made the request ---
        request_description = (
            f"'{car_request.make} {car_request.model}'"
            if car_request.make
            else f"request #{car_request.id}"
        )
        notification_message = (
            f"A dealer has placed an offer on your {request_description}."
        )
        notification = Notification(
            user_id=car_request.user_id, message=notification_message
        )
        db.session.add(notification)
        db.session.flush()  # Flush to get the notification ID

        # Now update the link with the notification ID
        notification.link = url_for(
            "request.request_detail",
            request_id=car_request.id,
            notification_id=notification.id,
        )
        db.session.commit()

        # --- Real-time Notification (send *after* commit) ---
        # Get the new unread count for the customer
        unread_count = Notification.query.filter_by(
            user_id=car_request.user_id, is_read=False
        ).count()

        # Create a dictionary with the notification data to send to the client
        notification_data = {
            "message": notification.message,
            "link": notification.link,
            "timestamp": notification.timestamp.isoformat()
            + "Z",  # Use ISO format for JavaScript
            "count": unread_count,
        }
        socketio.emit(
            "new_notification", notification_data, room=str(car_request.user_id)
        )
        send_push_notification(car_request.user_id, notification.message)

        flash(
            f"Your offer of {form.price.data:,.2f} ETB has been sent to the customer!",
            "success",
        )
        return redirect(url_for("dealer.dashboard"))

    return render_template(
        "place_dealer_bid.html",
        form=form,
        car_request=car_request,
        bids=existing_bids,
        now=datetime.utcnow(),
    )


@dealer_bp.route("/api/requests/<int:request_id>/bids", methods=["GET", "POST"])
@token_required
def api_place_dealer_bid(current_user, request_id):
    """API endpoint for getting existing bids or placing a new bid on a car request."""
    car_request = CarRequest.query.get_or_404(request_id)

    view_exists = DealerRequestView.query.filter_by(
        dealer_id=current_user.id, request_id=car_request.id
    ).first()
    if not view_exists:
        new_view = DealerRequestView(
            dealer_id=current_user.id, request_id=car_request.id
        )
        db.session.add(new_view)
        db.session.commit()

    if request.method == "GET":
        existing_bids = car_request.dealer_bids.order_by(DealerBid.price.asc()).all()
        return jsonify(
            car_request=car_request.to_dict(),
            existing_bids=[
                {**bid.to_dict(), "dealer_id": bid.dealer_id} for bid in existing_bids
            ],
        )

    elif request.method == "POST":
        data = request.get_json()
        if not data:
            return jsonify({"status": "error", "message": "Invalid JSON payload."}), 400

        # Basic validation
        required_fields = [
            "price",
            "make",
            "model",
            "car_year",
            "condition",
            "availability",
            "valid_until",
        ]
        if not all(field in data for field in required_fields):
            return (
                jsonify(
                    {"status": "error", "message": "Missing required bid details."}
                ),
                400,
            )

        try:
            bid_payload = _parse_bid_payload(data)
        except ValueError as exc:
            return (
                jsonify({"status": "error", "message": str(exc)}),
                400,
            )

        # Check if the dealer has enough points
        if current_user.points <= 0:
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "You do not have enough points to place an offer.",
                    }
                ),
                400,
            )

        uploaded_images = _collect_bid_images_from_payload(data, car_request.id)

        new_bid = DealerBid(
            **bid_payload,
            dealer_id=current_user.id,
            request_id=car_request.id,
        )
        db.session.add(new_bid)

        # If a photo was uploaded, create a DealerBidImage and associate it
        for img_url in uploaded_images:
            new_image = DealerBidImage(image_url=img_url)
            new_bid.images.append(new_image)

        current_user.points -= 1  # Deduct point
        # Log Transaction
        txn = PointTransaction(
            user_id=current_user.id,
            amount=-1,
            transaction_type="bid",
            description=f"Bid on request #{car_request.id}",
        )
        db.session.add(txn)
        db.session.commit()

        # Notify the customer
        request_description = (
            f"'{car_request.make} {car_request.model}'"
            if car_request.make
            else f"request #{car_request.id}"
        )
        notification_message = (
            f"A dealer has placed an offer on your {request_description}."
        )
        notification = Notification(
            user_id=car_request.user_id, message=notification_message
        )
        db.session.add(notification)
        db.session.flush()
        notification.link = url_for(
            "request.request_detail",
            request_id=car_request.id,
            notification_id=notification.id,
        )
        db.session.commit()

        # Real-time Notification
        unread_count = Notification.query.filter_by(
            user_id=car_request.user_id, is_read=False
        ).count()
        notification_data = {
            "message": notification.message,
            "link": notification.link,
            "timestamp": notification.timestamp.isoformat() + "Z",
            "count": unread_count,
        }
        socketio.emit(
            "new_notification", notification_data, room=str(car_request.user_id)
        )
        send_push_notification(car_request.user_id, notification.message)

        # --- Real-time Dashboard Update for ALL Dealers ---
        # After a bid is placed, we need to update the stats for this request
        # and broadcast it to all connected dealers.
        updated_bid_count = (
            db.session.query(func.count(DealerBid.id))
            .filter(DealerBid.request_id == car_request.id)
            .scalar()
        )
        updated_lowest_offer = (
            db.session.query(func.min(DealerBid.price))
            .filter(DealerBid.request_id == car_request.id)
            .scalar()
        )
        update_data = {
            "request_id": car_request.id,
            "bid_count": updated_bid_count,
            "lowest_offer": updated_lowest_offer,
        }
        # Emit to all clients (or a 'dealers' room if you have one)
        socketio.emit("request_updated", update_data)

        return (
            jsonify(
                {
                    "status": "success",
                    "message": "Your offer has been sent to the customer!",
                    "bid": {
                        **new_bid.to_dict(),
                        "dealer_id": new_bid.dealer_id,
                    },
                }
            ),
            201,
        )


@dealer_bp.route("/api/bids/<int:bid_id>", methods=["PUT"])
@token_required
def api_update_dealer_bid(current_user, bid_id):
    bid = DealerBid.query.get_or_404(bid_id)

    if bid.dealer_id != current_user.id and not current_user.is_admin:
        return jsonify({"status": "error", "message": "Permission denied."}), 403

    if bid.car_request.status != "active":
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "This request is closed and offers can no longer be edited.",
                }
            ),
            400,
        )

    if bid.status != "pending":
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "Only pending offers can be edited.",
                }
            ),
            400,
        )

    if not _bid_is_in_free_edit_window(bid):
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "The free edit window has expired.",
                }
            ),
            400,
        )

    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "message": "Invalid JSON payload."}), 400

    required_fields = [
        "price",
        "make",
        "model",
        "car_year",
        "condition",
        "availability",
        "valid_until",
    ]
    if not all(field in data for field in required_fields):
        return (
            jsonify({"status": "error", "message": "Missing required bid details."}),
            400,
        )

    try:
        bid_payload = _parse_bid_payload(data)
    except ValueError as exc:
        return jsonify({"status": "error", "message": str(exc)}), 400

    for field, value in bid_payload.items():
        setattr(bid, field, value)

    uploaded_images = _collect_bid_images_from_payload(data, bid.request_id)
    for img_url in uploaded_images:
        bid.images.append(DealerBidImage(image_url=img_url))

    db.session.commit()

    return jsonify(
        {
            "status": "success",
            "message": "Your offer has been updated.",
            "bid": {**bid.to_dict(), "dealer_id": bid.dealer_id},
        }
    )


@dealer_bp.route("/api/cars/<int:car_id>/update", methods=["PUT"])
@token_required
def api_update_car(current_user, car_id):
    """API endpoint for a dealer to update their own car listing."""
    car = Car.query.get_or_404(car_id)

    # Security Check: Ensure the current user owns this car
    if car.owner_id != current_user.id:
        return jsonify({"status": "error", "message": "Permission denied."}), 403

    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "message": "Invalid JSON payload."}), 400

    # --- Track Changes for Admin Highlighting ---
    changed_fields = []
    if data.get("make") and data.get("make") != car.make:
        changed_fields.append("make")
    if data.get("model") and data.get("model") != car.model:
        changed_fields.append("model")
    if data.get("year") and int(data.get("year")) != car.year:
        changed_fields.append("year")
    if data.get("price") and float(data.get("price")) != car.fixed_price:
        changed_fields.append("fixed_price")
    if data.get("description") and data.get("description") != car.description:
        changed_fields.append("description")
    primary_image_id = data.get("primary_image_id")
    if primary_image_id:
        try:
            primary_image_id = int(primary_image_id)
        except (TypeError, ValueError):
            return (
                jsonify(
                    {"status": "error", "message": "Invalid primary image selected."}
                ),
                400,
            )
        selected_image = CarImage.query.filter_by(
            id=primary_image_id, car_id=car.id
        ).first()
        if not selected_image:
            return (
                jsonify(
                    {"status": "error", "message": "Selected image was not found."}
                ),
                400,
            )
        if selected_image.order != 0:
            changed_fields.append("display_picture")

    if not changed_fields:
        return jsonify(
            {
                "status": "success",
                "message": "No changes detected.",
                "car": car.to_dict(),
            }
        )

    # Determine if re-approval is needed. Only major fields trigger re-approval.
    # Swapping the display image among existing photos is a minor preference change.
    requires_reapproval = any(f != "display_picture" for f in changed_fields)
    success_message = "Listing updated successfully."

    if requires_reapproval:
        # --- Point Deduction Logic for Major Edits ---
        last_update = getattr(car, "updated_at", None) or getattr(
            car, "created_at", datetime.utcnow()
        )
        time_since_last_update = datetime.utcnow() - last_update

        if time_since_last_update > timedelta(hours=1):
            if current_user.points <= 0:
                return (
                    jsonify(
                        {
                            "status": "error",
                            "message": "You do not have enough points to edit core details after one hour.",
                        }
                    ),
                    402,
                )
            current_user.points -= 1
            txn = PointTransaction(
                user_id=current_user.id,
                amount=-1,
                transaction_type="edit_listing",
                description=f"Updated listing #{car.id}",
            )
            db.session.add(txn)
            success_message = (
                "Listing updated and sent for re-approval. 1 point was deducted."
            )
        else:
            success_message = "Listing updated and sent for re-approval."

        car.is_approved = False
        car.last_changes = ",".join(changed_fields)

    # --- Update Car Details & Require Re-approval ---
    car.make = data.get("make", car.make)
    car.model = data.get("model", car.model)
    car.year = int(data.get("year", car.year))
    car.fixed_price = float(data.get("price", car.fixed_price))
    car.description = data.get("description", car.description)
    if primary_image_id:
        images = sorted(car.images, key=lambda image: image.order)
        selected_image = next(
            (image for image in images if image.id == primary_image_id), None
        )
        if selected_image:
            selected_image.order = 0
            next_order = 1
            for image in images:
                if image.id == selected_image.id:
                    continue
                image.order = next_order
                next_order += 1

    car.updated_at = datetime.utcnow()  # Manually update the timestamp
    db.session.commit()

    return jsonify(
        {"status": "success", "message": success_message, "car": car.to_dict()}
    )


@dealer_bp.route("/bid/<int:bid_id>/edit", methods=["GET", "POST"])
@login_required
@dealer_required
def edit_bid(bid_id):
    """Allows a dealer to edit their own existing bid."""
    bid = DealerBid.query.get_or_404(bid_id)

    # --- Security Checks ---
    if bid.dealer_id != current_user.id:
        abort(403)  # Can't edit another dealer's bid
    if bid.car_request.status != "active":
        flash("This request is closed and offers can no longer be edited.", "warning")
        return redirect(url_for("dealer.dashboard"))
    if not _bid_is_in_free_edit_window(bid):
        flash("The free edit window for this offer has expired.", "warning")
        return redirect(url_for("dealer.place_bid", request_id=bid.request_id))

    # Pre-populate the form with the existing bid's data
    form = DealerBidForm(obj=bid)
    form.submit.label.text = "Update Offer"  # Change button text

    if form.validate_on_submit():
        # Handle photo upload on edit
        if form.photos.data:
            for file in form.photos.data:
                if not file or not file.filename:
                    continue
                filename = secure_filename(file.filename)
                upload_dir_abs = os.path.join(
                    current_app.root_path, BID_PHOTO_UPLOAD_FOLDER
                )
                os.makedirs(upload_dir_abs, exist_ok=True)

                file_path_abs = os.path.join(upload_dir_abs, filename)
                file.save(file_path_abs)

                photo_filename = os.path.join(
                    "/", BID_PHOTO_UPLOAD_FOLDER, filename
                ).replace(os.sep, "/")
                new_image = DealerBidImage(image_url=photo_filename)
                bid.images.append(new_image)

        # Update the bid object with the new form data
        form.populate_obj(bid)
        db.session.commit()
        flash("Your offer has been updated successfully!", "success")
        # Redirect back to the request detail page for the customer
        return redirect(url_for("dealer.place_bid", request_id=bid.request_id))

    return render_template(
        "place_dealer_bid.html",
        form=form,
        car_request=bid.car_request,
        bids=bid.car_request.dealer_bids.order_by(DealerBid.price.asc()).all(),
        now=datetime.utcnow(),  # Pass now for the edit button logic
    )


@dealer_bp.route("/request_question/<int:question_id>/answer", methods=["GET", "POST"])
@login_required
@dealer_required
@mark_notification_as_read
def answer_request_question(question_id):
    question = RequestQuestion.query.get_or_404(question_id)
    bid = question.dealer_bid

    # Security check: ensure the current user is the dealer who received the question
    if bid.dealer_id != current_user.id:
        flash("You do not have permission to answer this question.", "danger")
        return redirect(url_for("dealer.dashboard"))

    # --- Fetch all of the dealer's bids for this request to show context ---
    my_bids_for_this_request = (
        DealerBid.query.filter_by(dealer_id=current_user.id, request_id=bid.request_id)
        .order_by(DealerBid.price.asc())
        .all()
    )

    form = RequestAnswerForm()
    if form.validate_on_submit():
        question.answer_text = form.answer_text.data
        question.answered_at = datetime.utcnow()

        # Notify the buyer that their question was answered
        notification_message = f"The dealer has answered your question regarding their offer for request #{bid.car_request.id}."
        notification = Notification(
            user_id=question.user_id, message=notification_message
        )
        db.session.add(notification)
        db.session.flush()  # Get ID

        notification.link = url_for(
            "request.request_detail",
            request_id=bid.car_request.id,
            bid_id=bid.id,
            _anchor=f"qna-for-bid-{bid.id}",
            notification_id=notification.id,
        )
        db.session.commit()

        # --- Real-time Notification ---
        unread_count = Notification.query.filter_by(
            user_id=question.user_id, is_read=False
        ).count()
        notification_data = {
            "message": notification.message,
            "link": notification.link,
            "timestamp": notification.timestamp.isoformat() + "Z",
            "count": unread_count,
        }
        socketio.emit("new_notification", notification_data, room=str(question.user_id))
        send_push_notification(question.user_id, notification.message)

        flash("Your answer has been posted.", "success")
        # Redirect back to the dealer dashboard, which is a more logical flow.
        return redirect(url_for("dealer.dashboard"))

    return render_template(
        "answer_request_question.html",
        form=form,
        question=question,
        my_bids=my_bids_for_this_request,
    )
