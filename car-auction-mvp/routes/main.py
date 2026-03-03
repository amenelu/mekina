from flask import (
    Blueprint,
    flash,
    redirect,
    render_template,
    abort,
    jsonify,
    request,
    url_for,
)
from flask_login import current_user, login_required
from functools import wraps
import re
from routes.auth import token_required, verify_jwt
from flask_socketio import join_room
from models.car import Car
from models.notification import Notification
from models.conversation import Conversation
from models.chat_message import ChatMessage
from models.lead_score import LeadScore
from models.user_favorite import UserFavorite
from models.user import User
from extensions import db, socketio
from models.search_query import SearchQuery
from sqlalchemy import or_, func
from datetime import datetime, timedelta


def mark_notification_as_read(f):
    """
    A decorator that checks for a 'notification_id' in the request arguments.
    If found, it marks the corresponding notification as read for the current user.
    """

    @wraps(f)
    def decorated_function(*args, **kwargs):
        notification_id = request.args.get("notification_id", type=int)
        if notification_id and current_user.is_authenticated:
            notification = Notification.query.filter_by(
                id=notification_id, user_id=current_user.id
            ).first()
            if notification and not notification.is_read:
                notification.is_read = True
                db.session.commit()
        return f(*args, **kwargs)

    return decorated_function


def get_similar_cars(car, listing_type_filter):
    """
    Finds similar cars based on a hierarchy of criteria and returns them
    along with a descriptive reason for the similarity.
    """
    similar_cars_dict = {}
    base_query = Car.query.filter(
        Car.id != car.id,
        Car.is_approved == True,
        Car.listing_type == listing_type_filter,
        Car.is_active == True,
    )

    def add_cars(cars_list):
        for c in cars_list:
            if len(similar_cars_dict) < 4 and c.id not in similar_cars_dict:
                similar_cars_dict[c.id] = c

    # 1. Same Make and Model
    add_cars(base_query.filter(Car.make == car.make, Car.model == car.model).all())
    if len(similar_cars_dict) > 0:
        return (
            list(similar_cars_dict.values())[:4],
            f"More {car.make} {car.model} Models",
        )

    # 2. Same Make and Body Type
    add_cars(
        base_query.filter(Car.make == car.make, Car.body_type == car.body_type).all()
    )
    if len(similar_cars_dict) > 0:
        return list(similar_cars_dict.values())[:4], f"More {car.make} {car.body_type}s"

    # 3. Same Make
    add_cars(base_query.filter(Car.make == car.make).all())
    if len(similar_cars_dict) > 0:
        return list(similar_cars_dict.values())[:4], f"More from {car.make}"

    # 4. Fallback to any other random cars
    add_cars(base_query.order_by(func.random()).limit(4).all())
    return list(similar_cars_dict.values())[:4], "Other Available Listings"


def mask_contact_info(message):
    """
    Detects and masks phone numbers in a message.
    Returns the masked message and a boolean indicating if contact info was found.
    """
    # A list of patterns to detect various forms of contact information.
    patterns = [
        r"(?:\+251\s?|0)?9\d{2}\s?\d{3}\s?\d{3}",  # Ethiopian phone numbers with optional spaces
        r"https?://\S+",  # URLs (http, https)
        r"\b(WhatsApp|Telegram|Instagram|Facebook|fb\.com|t\.me)\b",  # Social media keywords
    ]

    # Combine all patterns into a single regex, separated by '|' (OR)
    combined_regex = "|".join(patterns)

    # Use re.IGNORECASE to catch variations like 'whatsapp' or 'FACEBOOK'
    masked_message, count = re.subn(
        combined_regex, "[Contact Info Hidden]", message, flags=re.IGNORECASE
    )
    found_contact_info = count > 0
    return masked_message, found_contact_info


def send_push_notification(user_id, message_body, data=None):
    """
    Sends a push notification to the user if they have an FCM token.
    This is a placeholder for actual Firebase/APNs integration.
    """
    try:
        user = User.query.get(user_id)
        if user and user.fcm_token:
            # TODO: Integrate Firebase Admin SDK here
            # send_to_fcm(user.fcm_token, title="Mekina", body=message_body, data=data)
            print(
                f"--- [MOCK PUSH] To User {user.username} (ID {user_id}): {message_body} ---"
            )
        else:
            print(f"--- [MOCK PUSH] Skipped for User ID {user_id}: No FCM token ---")
    except Exception as e:
        print(f"Error sending push notification: {e}")


main_bp = Blueprint("main", __name__)


def _get_featured_cars():
    """Helper function to fetch active, approved, featured cars."""
    return Car.query.filter_by(is_featured=True, is_approved=True, is_active=True).all()


@socketio.on("connect")
def handle_connect():
    token = request.args.get("token")
    if not token:
        return False
    user = verify_jwt(token)
    if user:
        join_room(str(user.id))
    else:
        return False


@socketio.on("join_conversation")
def handle_join_conversation(data):
    """Client joins a specific conversation room."""
    room = data.get("room")
    if room:
        join_room(room)


@main_bp.route("/api/users/push-token", methods=["POST"])
@token_required
def update_push_token(user):
    """Updates the FCM push token for the authenticated user."""
    data = request.get_json()
    token = data.get("token")
    if not token:
        return jsonify({"status": "error", "message": "Token is required"}), 400
    user.fcm_token = token
    db.session.commit()
    return jsonify({"status": "success", "message": "Push token updated"})


@main_bp.route("/")
def home():
    featured_cars = _get_featured_cars()
    return render_template("home.html", featured_cars=featured_cars)


@main_bp.route("/api/home")
def api_home():
    """API endpoint for home screen data."""
    return jsonify(featured_cars=[car.to_dict() for car in _get_featured_cars()])


@main_bp.route("/notifications")
@login_required
def notifications():
    """Displays a user's notifications and marks them as read."""
    # Fetch the list of unread notifications first
    unread = Notification.query.filter_by(user_id=current_user.id, is_read=False).all()

    # Mark only those specific notifications as read
    for notification in unread:
        notification.is_read = True
    db.session.commit()

    user_notifications = (
        Notification.query.filter_by(user_id=current_user.id)
        .order_by(Notification.timestamp.desc())
        .limit(50)
        .all()
    )
    return render_template("notifications.html", notifications=user_notifications)


@main_bp.route("/api/notifications")
@token_required
def api_notifications(user):
    """API endpoint to get user notifications and mark them as read."""
    # This endpoint both fetches and marks as read, simplifying client logic.
    unread_notifications = Notification.query.filter_by(
        user_id=user.id, is_read=False
    ).all()
    for notification in unread_notifications:
        notification.is_read = True
    db.session.commit()

    # Emit update to clear the badge for the user
    socketio.emit("notification_count_update", {"count": 0}, room=str(user.id))

    all_notifications = (
        Notification.query.filter_by(user_id=user.id)
        .order_by(Notification.timestamp.desc())
        .limit(50)
        .all()
    )
    return jsonify(notifications=[n.to_dict() for n in all_notifications])


@main_bp.route("/api/unread-counts")
@token_required
def api_unread_counts(user):
    """Returns the number of unread messages and notifications."""
    unread_notifications = Notification.query.filter_by(
        user_id=user.id, is_read=False
    ).count()

    unread_messages = (
        db.session.query(ChatMessage.id)
        .join(Conversation)
        .filter(
            or_(
                Conversation.buyer_id == user.id,
                Conversation.dealer_id == user.id,
            ),
            ChatMessage.sender_id != user.id,
            ChatMessage.is_read == False,
        )
        .count()
    )

    return jsonify(
        {
            "unread_notifications": unread_notifications,
            "unread_messages": unread_messages,
        }
    )


@main_bp.route("/my-messages")
@login_required
def my_messages():
    """Lists all conversations for the current buyer."""
    conversations = (
        Conversation.query.filter_by(buyer_id=current_user.id)
        .order_by(Conversation.created_at.desc())
        .all()
    )
    return render_template("buyer_messages.html", conversations=conversations)


@main_bp.route("/api/my-messages")
@token_required
def api_my_messages(user):
    """API endpoint to list all conversations for the current user (buyer or dealer)."""
    if user.is_dealer:
        conversations_query = Conversation.query.filter_by(dealer_id=user.id)
    else:
        conversations_query = Conversation.query.filter_by(buyer_id=user.id)

    conversations = conversations_query.order_by(Conversation.created_at.desc()).all()

    # The to_dict method is now robust enough to handle missing data,
    # so we don't need to filter here anymore.
    serialized_convos = []
    for convo in conversations:
        c_dict = convo.to_dict(user.id)
        if user.is_dealer and convo.lead_score:
            c_dict["lead_score"] = convo.lead_score.score
        serialized_convos.append(c_dict)

    return jsonify(conversations=serialized_convos)


@main_bp.route("/my-messages/<int:conversation_id>")
@login_required
@mark_notification_as_read
def view_buyer_conversation(conversation_id):
    """Displays a single conversation for the buyer."""
    conversation = Conversation.query.get_or_404(conversation_id)

    # Security check: ensure buyer is part of this conversation
    if conversation.buyer_id != current_user.id:
        from flask import abort

        abort(403)
    # The logic to mark messages as read is now handled by the API endpoint, which the frontend can call.

    return render_template("buyer_conversation_detail.html", conversation=conversation)


@main_bp.route("/api/my-messages/<int:conversation_id>")
@token_required
def api_view_buyer_conversation(user, conversation_id):
    """API endpoint for a single conversation's details and messages."""
    conversation = Conversation.query.get_or_404(conversation_id)

    # Security check: ensure user is part of this conversation
    if user.id not in [conversation.buyer_id, conversation.dealer_id]:
        return jsonify({"error": "Permission denied"}), 403

    # Mark messages from the other party as read and emit a real-time update
    other_party_id = (
        conversation.dealer_id
        if user.id == conversation.buyer_id
        else conversation.buyer_id
    )
    unread_messages = conversation.messages.filter_by(
        sender_id=other_party_id, is_read=False
    ).all()
    if unread_messages:
        for msg in unread_messages:
            msg.is_read = True
        db.session.commit()

        # Recalculate the total unread count for the current user and emit an update to sync the UI
        total_unread = (
            db.session.query(ChatMessage.id)
            .join(Conversation)
            .filter(
                or_(
                    Conversation.buyer_id == user.id,
                    Conversation.dealer_id == user.id,
                ),
                ChatMessage.sender_id != user.id,
                ChatMessage.is_read == False,
            )
            .count()
        )
        socketio.emit(
            "message_count_update", {"count": total_unread}, room=str(user.id)
        )

    messages = conversation.messages.order_by(ChatMessage.timestamp.asc()).all()
    return jsonify(
        conversation=conversation.to_dict(user.id),
        messages=[msg.to_dict() for msg in messages],
    )


@main_bp.route("/api/search_suggestions")
def search_suggestions():
    """Provides search suggestions for makes and models."""
    # Base query to exclude rentals and only show active, approved cars
    query = Car.query.filter(
        Car.listing_type != "rental", Car.is_approved == True, Car.is_active == True
    )

    q = request.args.get("q", "").strip()
    if q and len(q) >= 2:
        search_terms = q.lower().split()
        conditions = []
        for term in search_terms:
            conditions.append(Car.make.ilike(f"%{term}%"))
            conditions.append(Car.model.ilike(f"%{term}%"))
            if term.isdigit():
                conditions.append(Car.year == int(term))

        if conditions:
            query = query.filter(or_(*conditions))

    # Apply quick filters to the suggestions
    if condition := request.args.get("condition"):
        query = query.filter(Car.condition == condition)
    if fuel_type := request.args.get("fuel_type"):
        query = query.filter(Car.fuel_type == fuel_type)
    if body_type := request.args.get("body_type"):
        query = query.filter(Car.body_type == body_type)
    if max_price := request.args.get("max_price", type=float):
        # This filter needs to check both fixed_price and auction price
        query = query.outerjoin(Car.auction).filter(
            or_(Car.fixed_price <= max_price, Car.auction.current_price <= max_price)
        )

    # Limit results for suggestions, but maybe fetch more for a full listing page
    # For now, we'll keep the limit consistent.
    # A more advanced implementation might use pagination here.
    cars = query.order_by(Car.id.desc()).limit(50).all()

    results = []
    for car in cars:
        # Determine the correct price to display
        display_price = (
            car.fixed_price
            if car.listing_type == "sale"
            else (car.auction.current_price if car.auction else None)
        )

        # Determine the correct detail URL
        detail_url = ""
        if car.listing_type == "auction" and car.auction:
            detail_url = url_for("auctions.auction_detail", auction_id=car.auction.id)
        elif car.listing_type == "sale":
            detail_url = url_for("main.car_detail", car_id=car.id)

        results.append(
            {
                "id": car.id,
                "year": car.year,
                "make": car.make,
                "model": car.model,
                "image_url": car.primary_image_url
                or url_for("static", filename="img/default_car.png"),
                "detail_url": detail_url,
                "display_price": (
                    f"{display_price:,.0f} ETB" if display_price else "N/A"
                ),
                "listing_type": car.listing_type,
            }
        )

    return jsonify(results)


@main_bp.route("/api/trending-searches")
def api_trending_searches():
    """Returns top search terms for the public UI (last 7 days)."""
    seven_days_ago = datetime.utcnow() - timedelta(days=7)

    trending = (
        db.session.query(
            SearchQuery.query_text, func.count(SearchQuery.query_text).label("count")
        )
        .filter(SearchQuery.timestamp >= seven_days_ago)
        .group_by(SearchQuery.query_text)
        .order_by(func.count(SearchQuery.query_text).desc())
        .limit(8)
        .all()
    )

    return jsonify({"trending": [term for term, count in trending]})


@main_bp.route("/api/log-search", methods=["POST"])
def api_log_search():
    """Explicitly logs a search query."""
    data = request.get_json()
    q = data.get("q", "").strip()

    if q and len(q) >= 2:
        user_id = None
        auth_header = request.headers.get("Authorization")
        if auth_header:
            try:
                token = auth_header.split(" ")[1]
                user = verify_jwt(token)
                if user:
                    user_id = user.id
            except Exception:
                pass
        elif current_user.is_authenticated:
            user_id = current_user.id

        new_search = SearchQuery(query_text=q.lower(), user_id=user_id)
        db.session.add(new_search)
        db.session.commit()

    return jsonify({"status": "success"})


@main_bp.route("/api/seed-searches")
def seed_searches():
    """Temporary route to seed search data for testing."""
    import random

    terms = [
        "toyota",
        "corolla",
        "vitz",
        "yaris",
        "ford",
        "ranger",
        "isuzu",
        "hilux",
        "bmw",
        "mercedes",
    ]

    for _ in range(30):
        term = random.choice(terms)
        # Random time within last 5 days
        timestamp = datetime.utcnow() - timedelta(
            days=random.randint(0, 5), hours=random.randint(0, 23)
        )
        new_search = SearchQuery(query_text=term, timestamp=timestamp)
        db.session.add(new_search)

    db.session.commit()
    return jsonify({"message": "Seeded 30 search queries."})


@main_bp.route("/how-it-works")
def how_it_works():
    """Displays the 'How It Works' informational page."""
    return render_template("how_it_works.html")


@main_bp.route("/all-listings")
def all_listings():
    """Displays a page with all types of listings, filterable via JS."""
    return render_template("all_listings.html")


@main_bp.route("/car/<int:car_id>")
@mark_notification_as_read
def car_detail(car_id):
    """Displays details for a car that is for fixed-price sale."""
    car = Car.query.get_or_404(car_id)

    # Security check: Only show approved cars that are for sale
    if (
        not car.is_approved
        and not (current_user.is_authenticated and current_user.is_admin)
    ) or car.listing_type != "sale":
        abort(404)

    similar_cars, similarity_reason = get_similar_cars(car, "sale")

    return render_template(
        "car_detail_sale.html",
        car=car,
        similar_cars=similar_cars,
        similarity_reason=similarity_reason,
    )


@main_bp.route("/api/cars/<int:car_id>")
@mark_notification_as_read
def api_car_detail(car_id):
    """API endpoint for a single car's details."""
    # Optional authentication to check for favorites/ownership
    user = None
    if current_user.is_authenticated:
        user = current_user
    else:
        auth_header = request.headers.get("Authorization")
        if auth_header:
            try:
                token = auth_header.split(" ")[1]
                user = verify_jwt(token)
            except (IndexError, ValueError, Exception):
                pass

    car = Car.query.get_or_404(car_id)

    # Security check: Only show approved cars
    # For the API, we can be a bit more flexible and show any listing type,
    # not just 'sale', as the mobile app will handle the display logic.
    is_authenticated = user is not None
    is_owner = is_authenticated and car.owner_id == user.id
    is_admin = is_authenticated and getattr(user, "is_admin", False)

    if not car.is_approved and not is_admin and not is_owner:
        return jsonify({"error": "Listing not found or not approved"}), 404

    similar_cars, similarity_reason = get_similar_cars(car, car.listing_type)

    car_data = car.to_dict(include_owner=True)
    # Manually add the price_display field for consistency with other endpoints
    if car.listing_type == "rental" and car.rental_listing:
        car_data["price_display"] = f"{car.rental_listing.price_per_day:,.0f} ETB/day"
    else:
        car_data["price_display"] = car.get_price_display()

    # Check if favorited by the current user
    is_favorite = False
    if user:
        favorite = UserFavorite.query.filter_by(user_id=user.id, car_id=car.id).first()
        if favorite:
            is_favorite = True
    car_data["is_favorite"] = is_favorite

    similar_cars_data = []
    for c in similar_cars:
        c_dict = c.to_dict()
        if c.listing_type == "rental" and c.rental_listing:
            c_dict["price_display"] = f"{c.rental_listing.price_per_day:,.0f} ETB/day"
        else:
            c_dict["price_display"] = c.get_price_display()
        c_dict["image_url"] = c_dict["primary_image_url"]
        similar_cars_data.append(c_dict)

    return jsonify(
        car=car_data,
        similar_cars=similar_cars_data,
        similarity_reason=similarity_reason,
    )


@main_bp.route("/api/users/favorites")
@token_required
def api_user_favorites(user):
    """API endpoint to fetch the authenticated user's favorite cars."""
    # This is a more robust way to fetch favorites, using a direct join
    # instead of relying on a potentially misconfigured 'user.favorites' relationship.
    favorite_cars = (
        Car.query.join(UserFavorite).filter(UserFavorite.user_id == user.id).all()
    )

    favorites_data = []
    for car in favorite_cars:
        price_display = "N/A"
        if car.listing_type == "rental" and car.rental_listing:
            price_display = f"{car.rental_listing.price_per_day:,.0f} ETB/day"
        elif hasattr(car, "get_price_display"):
            price_display = car.get_price_display()

        favorites_data.append(
            {
                "id": car.id,
                "year": car.year,
                "make": car.make,
                "model": car.model,
                "price_display": price_display,
                "primary_image_url": car.primary_image_url or "",
                "mileage": car.mileage or 0,
                "listing_type": car.listing_type,
            }
        )
    return jsonify({"favorites": favorites_data})


@main_bp.route("/api/cars/<int:car_id>/toggle-favorite", methods=["POST"])
@token_required
def toggle_favorite(user, car_id):
    """Toggles a car's favorite status for the current user."""
    car = Car.query.get_or_404(car_id)

    favorite = UserFavorite.query.filter_by(user_id=user.id, car_id=car.id).first()

    if favorite:
        # Car is already a favorite, so remove it
        db.session.delete(favorite)
        db.session.commit()
        return jsonify(
            {
                "status": "success",
                "action": "removed",
                "message": "Removed from favorites.",
            }
        )
    else:
        # Car is not a favorite, so add it
        new_favorite = UserFavorite(user_id=user.id, car_id=car.id)
        db.session.add(new_favorite)
        db.session.commit()
        return jsonify(
            {
                "status": "success",
                "action": "added",
                "message": "Added to favorites.",
            }
        )


def _get_comparison_data(car_ids):
    """Helper function to fetch cars and calculate best comparison values."""
    from sqlalchemy.orm import joinedload

    # Use joinedload to prevent the N+1 query problem when to_dict() is called.
    # This fetches cars and their related images/auctions in a more efficient query.
    cars = (
        Car.query.options(
            joinedload(Car.images),
            joinedload(Car.auction),
            joinedload(Car.rental_listing),
        )
        .filter(Car.id.in_(car_ids))
        .all()
    )
    cars_dict = {car.id: car for car in cars}
    sorted_cars = [cars_dict.get(id) for id in car_ids if cars_dict.get(id)]

    best_values = {
        "price": {"value": float("inf"), "ids": []},
        "mileage": {"value": float("inf"), "ids": []},
        "year": {"value": float("-inf"), "ids": []},
    }

    if sorted_cars:
        for car in sorted_cars:
            price = float("inf")
            if car.listing_type == "sale":
                price = car.fixed_price
            elif car.listing_type == "auction" and car.auction:
                price = car.auction.current_price
            elif car.listing_type == "rental" and car.rental_listing:
                price = car.rental_listing.price_per_day

            # Ensure price is comparable (treat None as infinity)
            compare_price = price if price is not None else float("inf")
            car.display_price = (
                price if price != float("inf") else None
            )  # Attach for easy access in web template

            if compare_price < best_values["price"]["value"]:
                best_values["price"]["value"] = compare_price
                best_values["price"]["ids"] = [car.id]
            elif compare_price == best_values["price"][
                "value"
            ] and compare_price != float("inf"):
                best_values["price"]["ids"].append(car.id)

            mileage = car.mileage if car.mileage is not None else float("inf")
            if mileage < best_values["mileage"]["value"]:
                best_values["mileage"]["value"] = mileage
                best_values["mileage"]["ids"] = [car.id]
            elif mileage == best_values["mileage"]["value"]:
                best_values["mileage"]["ids"].append(car.id)

            year = car.year or float("-inf")
            if year > best_values["year"]["value"]:
                best_values["year"]["value"] = year
                best_values["year"]["ids"] = [car.id]
            elif year == best_values["year"]["value"]:
                best_values["year"]["ids"].append(car.id)

    return sorted_cars, best_values


@main_bp.route("/api/compare")
def api_compare():
    """API endpoint to get comparison data."""
    car_ids_str = request.args.get("ids")
    if not car_ids_str:
        return jsonify({"error": "No car IDs provided"}), 400
    try:
        car_ids = [int(id) for id in car_ids_str.split(",") if id.isdigit()]
    except ValueError:
        return jsonify({"error": "Invalid car IDs format"}), 400

    sorted_cars, best_values = _get_comparison_data(car_ids)

    # Sanitize best_values to remove Infinity, which breaks JSON parsing on mobile
    for key, data in best_values.items():
        if data["value"] == float("inf") or data["value"] == float("-inf"):
            data["value"] = None
            data["ids"] = []  # Clear IDs if no valid best value exists

    # Manually add the price_display to each car's dictionary without altering the model.
    cars_data = []
    for car in sorted_cars:
        car_dict = car.to_dict()
        car_dict["price_display"] = car.get_price_display()
        car_dict["image_url"] = car_dict["primary_image_url"]

        # Add flags to help frontend highlight best values
        car_dict["is_best_price"] = car.id in best_values["price"]["ids"]
        car_dict["is_best_offer"] = car_dict[
            "is_best_price"
        ]  # Alias for frontend convenience
        car_dict["is_best_value"] = car_dict["is_best_price"]
        car_dict["is_best_mileage"] = car.id in best_values["mileage"]["ids"]
        car_dict["is_best_year"] = car.id in best_values["year"]["ids"]

        cars_data.append(car_dict)

    return jsonify(cars=cars_data, best_values=best_values)


@main_bp.route("/api/listings")
def api_listings():
    """API endpoint to return filtered car data for sale/auction as JSON."""
    listing_type_filter = request.args.get("listing_type")

    if listing_type_filter == "rental":
        # If specifically asking for rentals, only get rentals.
        query = Car.query.options(db.joinedload(Car.rental_listing)).filter(
            Car.listing_type == "rental", Car.is_approved == True, Car.is_active == True
        )
    else:
        # Default behavior: get all listings *except* rentals.
        query = Car.query.options(db.joinedload(Car.auction)).filter(
            Car.listing_type != "rental", Car.is_approved == True, Car.is_active == True
        )

    # Generic search filter
    if q := request.args.get("q"):  # Use the same forgiving logic for main search
        search_terms = q.lower().split()
        conditions = []
        for term in search_terms:
            conditions.append(Car.make.ilike(f"%{term}%"))
            conditions.append(Car.model.ilike(f"%{term}%"))
            if term.isdigit():  # Allow searching by year if it's a number
                conditions.append(Car.year == int(term))
        if conditions:
            query = query.filter(or_(*conditions))

    # Specific attribute filters
    if condition := request.args.get("condition"):
        query = query.filter(Car.condition == condition)
    if transmission := request.args.get("transmission"):
        query = query.filter(Car.transmission == transmission)
    if fuel_type := request.args.get("fuel_type"):
        query = query.filter(Car.fuel_type == fuel_type)
    if body_type := request.args.get("body_type"):
        query = query.filter(Car.body_type == body_type)
    if max_price := request.args.get("max_price", type=float):
        # Correctly filter by price across different listing types
        from models.auction import Auction
        from models.rental_listing import RentalListing

        query = (
            query.outerjoin(Auction)
            .outerjoin(RentalListing)
            .filter(
                or_(
                    (Car.listing_type == "sale") & (Car.fixed_price <= max_price),
                    (Car.listing_type == "auction")
                    & (Auction.current_price <= max_price),
                    (Car.listing_type == "rental")
                    & (RentalListing.price_per_day <= max_price),
                )
            )
        )

    query = query.order_by(Car.is_featured.desc(), Car.id.desc())
    cars = query.all()

    results = []
    for car in cars:
        car_dict = car.to_dict()
        # Manually construct price_display and ensure primary_image_url is present for all types
        if car.listing_type == "rental" and car.rental_listing:
            car_dict["price_display"] = (
                f"{car.rental_listing.price_per_day:,.0f} ETB/day"
            )
        else:
            car_dict["price_display"] = car.get_price_display()
        # Ensure 'image_url' is present for mobile app consistency, using the absolute URL from to_dict()
        car_dict["image_url"] = car_dict["primary_image_url"]
        results.append(car_dict)

    # The mobile app's rental page expects a specific JSON structure.
    if listing_type_filter == "rental":
        return jsonify(rentals=results)

    return jsonify(results)


@main_bp.route("/compare")
def compare():
    """Displays a side-by-side comparison of selected cars."""
    car_ids_str = request.args.get("ids")
    if not car_ids_str:
        return redirect(url_for("main.all_listings"))
    try:
        car_ids = [int(id) for id in car_ids_str.split(",") if id.isdigit()]
    except ValueError:
        flash("Invalid comparison request.", "danger")
        return redirect(url_for("main.all_listings"))

    sorted_cars, best_values = _get_comparison_data(car_ids)

    # Sanitize best_values to ensure we don't highlight invalid values (like Infinity)
    for key, data in best_values.items():
        if data["value"] == float("inf") or data["value"] == float("-inf"):
            data["value"] = None
            data["ids"] = []

    # Inject flags into car objects for easier template rendering
    for car in sorted_cars:
        car.is_best_price = car.id in best_values["price"]["ids"]
        car.is_best_offer = car.is_best_price  # Alias
        car.is_best_value = car.is_best_price
        car.is_best_mileage = car.id in best_values["mileage"]["ids"]
        car.is_best_year = car.id in best_values["year"]["ids"]

    return render_template("compare.html", cars=sorted_cars, best_values=best_values)


@main_bp.route("/chat/send", methods=["POST"])
def send_chat_message():
    """Handles sending a new chat message."""
    from datetime import datetime

    # Hybrid Authentication: Support both Session (Web) and JWT (Mobile)
    user = None
    if current_user.is_authenticated:
        user = current_user
    else:
        # Check for JWT if no session user
        auth_header = request.headers.get("Authorization")
        if auth_header:
            try:
                token = auth_header.split(" ")[1]
                user = verify_jwt(token)
            except IndexError:
                pass

    if not user:
        return jsonify({"status": "error", "message": "Unauthorized"}), 401

    data = request.get_json()
    car_id = data.get("car_id")
    message_body = data.get("message")

    if not car_id or not message_body:
        return (
            jsonify({"status": "error", "message": "Missing car ID or message."}),
            400,
        )

    car = Car.query.get_or_404(car_id)
    dealer_id = car.owner_id

    # --- Refactored Conversation Logic ---
    # If the current user is the dealer, we need to find the conversation based on the car and a potential buyer.
    # Since the buyer initiates, we can assume a conversation exists if the dealer is replying.
    # A more robust solution would pass the buyer_id from the client, but for now we can infer it.
    if user.id == dealer_id:  # The dealer is replying
        # Find any conversation for this car. This is a simplification.
        # A better approach would be to know which buyer the dealer is talking to.
        # We'll find the first conversation for this car initiated by any buyer.
        conversation = Conversation.query.filter_by(car_id=car_id).first()
        if not conversation:
            return (
                jsonify({"status": "error", "message": "Conversation not found."}),
                404,
            )
    else:  # A buyer is sending a message
        conversation = Conversation.query.filter_by(
            car_id=car_id, buyer_id=user.id
        ).first()
        if not conversation:
            conversation = Conversation(
                car_id=car_id, buyer_id=user.id, dealer_id=dealer_id
            )
            # Explicitly create the LeadScore at the same time
            conversation.lead_score = LeadScore(score=0)
            db.session.add(conversation)

    # Ensure a lead score object exists for this conversation (for older conversations)
    if not conversation.lead_score:
        conversation.lead_score = LeadScore(score=0)
        db.session.add(conversation.lead_score)

    # --- Free Message Limit Logic ---
    FREE_MESSAGE_LIMIT = 3
    # Check individual message count for the current user
    user_message_count = ChatMessage.query.filter_by(
        conversation_id=conversation.id, sender_id=user.id
    ).count()
    if not conversation.is_unlocked and user_message_count >= FREE_MESSAGE_LIMIT:
        return jsonify(
            {
                "status": "limit_reached",
                "message": "Free message limit reached. The dealer must unlock the conversation to continue.",
            }
        )

    # --- Contact Info Masking & Filtering ---
    original_message = message_body
    is_serious = False
    # Only mask if the conversation is not already unlocked
    if not conversation.is_unlocked:
        # Mask for both buyer and dealer before unlock
        masked_body, is_serious = mask_contact_info(original_message)
        message_body = masked_body
        # Increment message count only for free messages
        conversation.message_count += 1

    # --- Lead Scoring Logic ---
    if is_serious:
        # Buyer attempted to share contact info
        conversation.lead_score.score += 30

    # Check for high-intent keywords to capture interest beyond just contact info
    intent_keywords = [
        "meet",
        "see",
        "location",
        "where",
        "cash",
        "bank",
        "pay",
        "buy",
        "price",
        "negotiable",
        "test drive",
        "financing",
        "loan",
        "appointment",
        "trade-in",
    ]
    if any(word in message_body.lower() for word in intent_keywords):
        conversation.lead_score.score += 5

    # [NEW] Message Length: Longer messages often indicate higher effort/interest
    if len(message_body) > 40:
        conversation.lead_score.score += 5

    # [NEW] Responsiveness: If replying to a dealer within 2 hours
    if user.id == conversation.buyer_id:
        last_dealer_msg = (
            ChatMessage.query.filter_by(
                conversation_id=conversation.id, sender_id=conversation.dealer_id
            )
            .order_by(ChatMessage.timestamp.desc())
            .first()
        )
        if last_dealer_msg:
            time_diff = datetime.utcnow() - last_dealer_msg.timestamp
            if time_diff.total_seconds() < 7200:  # 2 hours
                conversation.lead_score.score += 10

    # [NEW] Favorite Status: Interacting with a favorited item implies higher intent
    if UserFavorite.query.filter_by(user_id=user.id, car_id=car.id).first():
        conversation.lead_score.score += 5

    # Create and save the new message
    # We store the (potentially masked) body for display, and the original for when it's unlocked
    new_message = ChatMessage(
        body=message_body, original_body=original_message, sender_id=user.id
    )
    conversation.messages.append(new_message)
    # Flush the session to get the new_message.id and timestamp before creating the payload
    db.session.flush()

    # Construct a payload consistent with ChatMessage.to_dict()
    chat_message_data = {
        "id": new_message.id,
        "body": new_message.body,
        "timestamp": new_message.timestamp.isoformat() + "Z",
        "is_read": False,
        "sender": {"id": user.id, "username": user.username},
    }
    conversation_room = f"conversation_{conversation.id}"

    # --- Update Lead Score on Buyer Actions ---
    if user.id == conversation.buyer_id:
        # Check for message frequency to increase score
        from datetime import timedelta

        # Check if this is the 3rd message from the buyer in the last 24 hours
        if (
            conversation.messages.filter(
                ChatMessage.sender_id == user.id,
                ChatMessage.timestamp > datetime.utcnow() - timedelta(hours=24),
            ).count()
            == 3
        ):
            conversation.lead_score.score += 20

    db.session.commit()

    # --- Real-time Logic ---
    # 1. Emit the new chat message to the conversation room
    socketio.emit("new_chat_message", chat_message_data, room=conversation_room)

    # 2. Send a traditional notification to the *other* person in the chat
    if user.id == conversation.buyer_id:  # Buyer is sending
        recipient_id = conversation.dealer_id
        notification_message = (
            f"New message from {user.username} about your '{car.make} {car.model}'."
        )
        link_url = url_for("dealer.view_conversation", conversation_id=conversation.id)
    else:  # Dealer is sending
        recipient_id = conversation.buyer_id
        notification_message = (
            f"New reply from {user.username} about the '{car.make} {car.model}'."
        )
        link_url = url_for(
            "main.view_buyer_conversation", conversation_id=conversation.id
        )

    if recipient_id:
        # Emit a message count update to the recipient
        unread_messages_count = (
            db.session.query(ChatMessage.id)
            .join(Conversation)
            .filter(
                or_(
                    Conversation.buyer_id == recipient_id,
                    Conversation.dealer_id == recipient_id,
                ),
                ChatMessage.sender_id != recipient_id,
                ChatMessage.is_read == False,
            )
            .count()
        )
        socketio.emit(
            "message_count_update",
            {"count": unread_messages_count},
            room=str(recipient_id),
        )
        # Also emit an event to update the conversation list (e.g. move to top, show snippet)
        socketio.emit(
            "conversation_list_update",
            {"conversation_id": conversation.id},
            room=str(recipient_id),
        )
        send_push_notification(
            recipient_id,
            notification_message,
            data={"conversation_id": conversation.id},
        )

    # If contact info was found, emit a special event to the dealer's room
    if is_serious:
        socketio.emit(
            "serious_buyer_detected",
            {"conversation_id": conversation.id},
            room=str(dealer_id),
        )

    response_data = {"status": "success", "message": "Message sent!"}
    # If the buyer's message was masked, add a flag to the response for the UI
    if is_serious and user.id == conversation.buyer_id:
        response_data["buyer_action_required"] = "request_call"

    return jsonify(response_data)


@main_bp.route("/chat/history/<int:car_id>")
@token_required
def get_chat_history(user, car_id):
    """API endpoint to fetch the history of a conversation for a given car."""
    car = Car.query.get_or_404(car_id)
    conversation = None

    if user.id == car.owner_id:
        # The dealer is viewing the chat. A car can have multiple conversations.
        # For simplicity in the modal, we'll just load the first one.
        # A more advanced implementation might show a list of buyers to chat with.
        conversation = Conversation.query.filter_by(car_id=car_id).first()
    else:
        # A buyer is viewing the chat.
        conversation = Conversation.query.filter_by(
            car_id=car_id, buyer_id=user.id
        ).first()

    if not conversation:
        # No history yet, return an empty list but indicate no conversation exists
        return jsonify({"conversation_id": None, "messages": []})

    messages = (
        ChatMessage.query.filter_by(conversation_id=conversation.id)
        .order_by(ChatMessage.timestamp.asc())
        .all()
    )

    history = [
        {
            "body": msg.body,
            "sender_id": msg.sender_id,
            "timestamp": msg.timestamp.isoformat() + "Z",
        }
        for msg in messages
    ]
    return jsonify({"conversation_id": conversation.id, "messages": history})
