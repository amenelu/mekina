from flask import Blueprint, render_template, abort, jsonify, request, url_for
from flask_login import current_user, login_required
from functools import wraps
from models.car import Car
from models.notification import Notification
from models.conversation import Conversation
from models.chat_message import ChatMessage
from extensions import db, socketio
from sqlalchemy import or_, func

def mark_notification_as_read(f):
    """
    A decorator that checks for a 'notification_id' in the request arguments.
    If found, it marks the corresponding notification as read for the current user.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        notification_id = request.args.get('notification_id', type=int)
        if notification_id and current_user.is_authenticated:
            notification = Notification.query.filter_by(id=notification_id, user_id=current_user.id).first()
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
        Car.is_active == True
    )

    def add_cars(cars_list):
        for c in cars_list:
            if len(similar_cars_dict) < 4 and c.id not in similar_cars_dict:
                similar_cars_dict[c.id] = c

    # 1. Same Make and Model
    add_cars(base_query.filter(Car.make == car.make, Car.model == car.model).all())
    if len(similar_cars_dict) > 0:
        return list(similar_cars_dict.values())[:4], f"More {car.make} {car.model} Models"

    # 2. Same Make and Body Type
    add_cars(base_query.filter(Car.make == car.make, Car.body_type == car.body_type).all())
    if len(similar_cars_dict) > 0:
        return list(similar_cars_dict.values())[:4], f"More {car.make} {car.body_type}s"

    # 3. Same Make
    add_cars(base_query.filter(Car.make == car.make).all())
    if len(similar_cars_dict) > 0:
        return list(similar_cars_dict.values())[:4], f"More from {car.make}"

    # 4. Fallback to any other random cars
    add_cars(base_query.order_by(func.random()).limit(4).all())
    return list(similar_cars_dict.values())[:4], "Other Available Listings"

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def home():
    featured_cars = Car.query.filter_by(is_featured=True, is_approved=True, is_active=True).all()
    return render_template('home.html', featured_cars=featured_cars)

@main_bp.route('/notifications')
@login_required
def notifications():
    """Displays a user's notifications and marks them as read."""
    # Fetch the list of unread notifications first
    unread = Notification.query.filter_by(user_id=current_user.id, is_read=False).all()
    
    # Mark only those specific notifications as read
    for notification in unread:
        notification.is_read = True
    db.session.commit()

    user_notifications = Notification.query.filter_by(user_id=current_user.id).order_by(Notification.timestamp.desc()).limit(50).all()
    return render_template('notifications.html', notifications=user_notifications)

@main_bp.route('/my-messages')
@login_required
def my_messages():
    """Lists all conversations for the current buyer."""
    conversations = Conversation.query.filter_by(buyer_id=current_user.id).order_by(Conversation.created_at.desc()).all()
    return render_template('buyer_messages.html', conversations=conversations)

@main_bp.route('/my-messages/<int:conversation_id>')
@login_required
@mark_notification_as_read
def view_buyer_conversation(conversation_id):
    """Displays a single conversation for the buyer."""
    conversation = Conversation.query.get_or_404(conversation_id)

    # Security check: ensure buyer is part of this conversation
    if conversation.buyer_id != current_user.id:
        from flask import abort
        abort(403)

    return render_template('buyer_conversation_detail.html', conversation=conversation)

@main_bp.route('/api/search_suggestions')
def search_suggestions():
    """Provides search suggestions for makes and models."""
    q = request.args.get('q', '').strip()
    if not q or len(q) < 2:
        return jsonify([])

    search_terms = q.lower().split()
    conditions = []
    for term in search_terms:
        conditions.append(Car.make.ilike(f"%{term}%"))
        conditions.append(Car.model.ilike(f"%{term}%"))
        if term.isdigit():
            conditions.append(Car.year == int(term))

    if not conditions:
        return jsonify([])

    # Find cars that match the search terms
    query = Car.query.filter(or_(*conditions))

    # Apply quick filters to the suggestions
    if condition := request.args.get('condition'):
        query = query.filter(Car.condition == condition)
    if fuel_type := request.args.get('fuel_type'):
        query = query.filter(Car.fuel_type == fuel_type)
    if body_type := request.args.get('body_type'):
        query = query.filter(Car.body_type == body_type)
    if max_price := request.args.get('max_price', type=float):
        # This filter needs to check both fixed_price and auction price
        query = query.outerjoin(Car.auction).filter(or_(Car.fixed_price <= max_price, Car.auction.current_price <= max_price))

    cars = query.limit(5).all()

    results = []
    for car in cars:
        detail_url = ''
        if car.listing_type == 'auction' and car.auction:
            detail_url = url_for('auctions.auction_detail', auction_id=car.auction.id)
        elif car.listing_type == 'sale':
            detail_url = url_for('main.car_detail', car_id=car.id)
        elif car.listing_type == 'rental' and car.rental_listing:
            detail_url = url_for('rentals.rental_detail', listing_id=car.rental_listing.id)

        results.append({
            'year': car.year,
            'make': car.make,
            'model': car.model,
            'image_url': car.primary_image_url or url_for('static', filename='img/default_car.png'),
            'detail_url': detail_url
        })

    return jsonify(results)

@main_bp.route('/how-it-works')
def how_it_works():
    """Displays the 'How It Works' informational page."""
    return render_template('how_it_works.html')

@main_bp.route('/all-listings')
def all_listings():
    """Displays a page with all types of listings, filterable via JS."""
    return render_template('all_listings.html')

@main_bp.route('/car/<int:car_id>')
@mark_notification_as_read
def car_detail(car_id):
    """Displays details for a car that is for fixed-price sale."""
    car = Car.query.get_or_404(car_id)

    # Security check: Only show approved cars that are for sale
    if (not car.is_approved and not (current_user.is_authenticated and current_user.is_admin)) or car.listing_type != 'sale':
        abort(404)

    similar_cars, similarity_reason = get_similar_cars(car, 'sale')

    return render_template(
        'car_detail_sale.html',
        car=car,
        similar_cars=similar_cars,
        similarity_reason=similarity_reason
    )

@main_bp.route('/compare')
def compare():
    """Displays a side-by-side comparison of selected cars."""
    car_ids_str = request.args.get('ids')
    if not car_ids_str:
        return redirect(url_for('main.all_listings'))

    try:
        # Sanitize input and convert to integers
        car_ids = [int(id) for id in car_ids_str.split(',') if id.isdigit()]
    except ValueError:
        flash("Invalid comparison request.", "danger")
        return redirect(url_for('main.all_listings'))

    # Fetch cars from the database, preserving the order of IDs
    cars = Car.query.filter(Car.id.in_(car_ids)).all()
    # Create a dictionary for quick lookups
    cars_dict = {car.id: car for car in cars}
    # Sort the final list based on the original ID order
    sorted_cars = [cars_dict.get(id) for id in car_ids if cars_dict.get(id)]

    return render_template('compare.html', cars=sorted_cars)

@main_bp.route('/chat/send', methods=['POST'])
@login_required
def send_chat_message():
    """Handles sending a new chat message."""
    data = request.get_json()
    car_id = data.get('car_id')
    message_body = data.get('message')

    if not car_id or not message_body:
        return jsonify({'status': 'error', 'message': 'Missing car ID or message.'}), 400

    car = Car.query.get_or_404(car_id)
    dealer_id = car.owner_id

    # A user cannot start a conversation with themselves
    if current_user.id == dealer_id:
        return jsonify({'status': 'error', 'message': 'You cannot message yourself.'}), 403

    # Find existing conversation or create a new one
    conversation = Conversation.query.filter_by(
        car_id=car_id,
        buyer_id=current_user.id
    ).first()

    if not conversation:
        conversation = Conversation(
            car_id=car_id,
            buyer_id=current_user.id,
            dealer_id=dealer_id
        )
        db.session.add(conversation)

    # Create and save the new message
    new_message = ChatMessage(body=message_body, sender_id=current_user.id)
    conversation.messages.append(new_message)
    db.session.commit()

    # --- Real-time Notification to Dealer ---
    # Only send a notification if the buyer is sending the message
    if current_user.id == conversation.buyer_id:
        notification_message = f"New message from {current_user.username} about your '{car.make} {car.model}' listing."
        # Create notification without the link first
        new_notification = Notification(user_id=dealer_id, message=notification_message)
        db.session.add(new_notification)
        db.session.flush()  # Flush to get the new_notification.id
        # Now create the link with the ID and update the object
        new_notification.link = url_for('dealer.view_conversation', conversation_id=conversation.id, notification_id=new_notification.id)
        db.session.commit()

        unread_count = Notification.query.filter_by(user_id=dealer_id, is_read=False).count()
        notification_data = {'message': new_notification.message, 'link': new_notification.link, 'timestamp': new_notification.timestamp.isoformat() + 'Z', 'count': unread_count}
        socketio.emit('new_notification', notification_data, room=str(dealer_id))
    
    return jsonify({'status': 'success', 'message': 'Message sent!'})