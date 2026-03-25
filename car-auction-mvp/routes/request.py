from flask import (
    Blueprint,
    render_template,
    redirect,
    url_for,
    flash,
    session,
    abort,
    request,
    jsonify,
    current_app,
)
from flask_login import login_required, current_user
from models.car_request import CarRequest
from models.dealer_bid import DealerBid
from models.car_request_image import CarRequestImage
from models.trade_in import TradeInRequest
from models.deal import Deal
from extensions import db, socketio
from models.dealer_rating import DealerRating
from models.notification import Notification
from models.request_question import RequestQuestion
from routes.main import mark_notification_as_read
from routes.seller import save_base64_image
from routes.main import send_push_notification
from routes.auth import token_required
from flask_wtf import FlaskForm
from wtforms import (
    StringField,
    IntegerField,
    TextAreaField,
    SubmitField,
    RadioField,
    SelectField,
    SelectMultipleField,
    MultipleFileField,
    widgets,
    validators,
)
from flask_wtf.file import FileAllowed
from werkzeug.utils import secure_filename
import os
from datetime import datetime, timedelta
from wtforms.validators import DataRequired, NumberRange, Optional, Length

request_bp = Blueprint("request", __name__, url_prefix="/requests")
REQUEST_UPLOAD_FOLDER = "static/uploads/requests"


# --- Initial Choice Form ---
class RequestStep0_Choice(FlaskForm):
    knows_what_they_want = RadioField(
        "Do you know which car you want?",
        choices=[("yes", "Yes, I know what I want"), ("no", "No, help me decide")],
        validators=[DataRequired()],
    )
    submit = SubmitField("Continue")


# --- "I know what I want" Path ---
class RequestStep1_Make(FlaskForm):
    make = StringField(
        "What make of car are you looking for?", validators=[DataRequired()]
    )
    submit = SubmitField("Next")


class RequestStep2_Model(FlaskForm):
    model = StringField("Great! And what model?", validators=[DataRequired()])
    submit = SubmitField("Next")


class RequestStep3_Year(FlaskForm):
    min_year = IntegerField(
        "What is the minimum year you would consider?",
        validators=[Optional(), NumberRange(min=1900, max=2100)],
    )
    submit = SubmitField("Next")


class RequestStep4_Notes(FlaskForm):
    notes = TextAreaField(
        "Any other details? (e.g., color, trim, condition)", validators=[Optional()]
    )
    images = MultipleFileField(
        "Upload photos of the car you want (Optional)",
        validators=[FileAllowed(["jpg", "png", "jpeg"], "Images only!")],
    )
    submit = SubmitField("Finish Request")


# --- "Help me decide" Path ---
class RequestGuided_Price(FlaskForm):
    price = RadioField(
        "What is your approximate budget?",
        choices=[
            ("under_1m", "Under 1,000,000 ETB"),
            ("1m_to_3m", "1M - 3M ETB"),
            ("3m_to_5m", "3M - 5M ETB"),
            ("over_5m", "Over 5,000,000 ETB"),
        ],
        validators=[DataRequired()],
    )
    submit = SubmitField("Next")


class RequestGuided_BodyType(FlaskForm):
    body_type = RadioField(
        "What type of car best fits your needs?",
        choices=[
            ("SUV", "SUV"),
            ("Sedan", "Sedan"),
            ("Hatchback", "Hatchback"),
            ("Pickup", "Pickup Truck"),
        ],
        validators=[DataRequired()],
    )
    submit = SubmitField("Next")


class RequestGuided_Fuel(FlaskForm):
    fuel_type = RadioField(
        "Any preference on fuel type?",
        choices=[
            ("Gasoline", "Gasoline"),
            ("Diesel", "Diesel"),
            ("Hybrid", "Hybrid"),
            ("Electric", "Electric"),
        ],
        validators=[DataRequired()],
    )
    submit = SubmitField("Next")


class RequestGuided_Brand(FlaskForm):
    brand = StringField(
        "Are you considering any specific brands? (Optional)", validators=[Optional()]
    )
    images = MultipleFileField(
        "Reference Photos (Optional)",
        validators=[FileAllowed(["jpg", "png", "jpeg"], "Images only!")],
    )
    submit = SubmitField("Finish Request")


class RequestGuided_Equipment(FlaskForm):
    equipment = SelectMultipleField(
        "Which features are important to you? (Optional)",
        choices=[
            ("sunroof", "Sunroof"),
            ("leather_seats", "Leather Seats"),
            ("apple_carplay", "Apple CarPlay / Android Auto"),
            ("awd", "All-Wheel Drive"),
        ],
        widget=widgets.ListWidget(prefix_label=False),
        option_widget=widgets.CheckboxInput(),
    )
    submit = SubmitField("Next")


class RequestQuestionForm(FlaskForm):
    question_text = TextAreaField(
        "Your Question", validators=[DataRequired(), validators.Length(min=10, max=500)]
    )
    submit_question = SubmitField("Ask Question")


class DealerRatingForm(FlaskForm):
    rating = RadioField(
        "Your Rating",
        choices=[(1, "1"), (2, "2"), (3, "3"), (4, "4"), (5, "5")],
        coerce=int,
        validators=[DataRequired()],
    )
    review_text = TextAreaField("Your Review (Optional)", validators=[Length(max=1000)])
    submit = SubmitField("Submit Review")


def get_recent_request_count(user_id):
    """Helper to count requests made by a user in the last 24 hours."""
    last_24h = datetime.utcnow() - timedelta(hours=24)
    return CarRequest.query.filter(
        CarRequest.user_id == user_id, CarRequest.created_at >= last_24h
    ).count()


@request_bp.context_processor
def inject_remaining_requests():
    """Injects the remaining number of requests allowed for the day into templates."""
    if current_user.is_authenticated:
        count = get_recent_request_count(current_user.id)
        return {"remaining_requests": max(0, 3 - count)}
    return {}


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


@request_bp.route("/start")
@login_required
def start_request():
    # Clear any previous request data from the session
    session.pop("car_request_data", None)
    return redirect(url_for("request.step0_choice"))


@request_bp.route("/step1_make", methods=["GET", "POST"])
@login_required
def step1_make():
    form = RequestStep1_Make()
    if form.validate_on_submit():
        session["car_request_data"] = {"make": form.make.data}
        return redirect(url_for("request.step2_model"))
    return render_template("request_step.html", form=form, title="Find a Car (1/4)")


@request_bp.route("/step2_model", methods=["GET", "POST"])
@login_required
def step2_model():
    if "car_request_data" not in session:
        return redirect(url_for("request.start_request"))
    form = RequestStep2_Model()
    if form.validate_on_submit():
        session["car_request_data"]["model"] = form.model.data
        session.modified = True
        return redirect(url_for("request.step3_year"))
    return render_template("request_step.html", form=form, title="Find a Car (2/4)")


@request_bp.route("/step3_year", methods=["GET", "POST"])
@login_required
def step3_year():
    if "model" not in session.get("car_request_data", {}):
        return redirect(url_for("request.start_request"))
    form = RequestStep3_Year()
    if form.validate_on_submit():
        session["car_request_data"]["min_year"] = form.min_year.data
        session.modified = True
        return redirect(url_for("request.step4_notes"))
    return render_template("request_step.html", form=form, title="Find a Car (3/4)")


@request_bp.route("/step4_notes", methods=["GET", "POST"])
@login_required
def step4_notes():
    if "min_year" not in session.get("car_request_data", {}):
        return redirect(url_for("request.start_request"))
    form = RequestStep4_Notes()
    if form.validate_on_submit():
        # Check daily request limit (3 per 24 hours)
        if get_recent_request_count(current_user.id) >= 3:
            flash(
                "You have reached the daily limit of 3 requests. Please try again later.",
                "danger",
            )
            return redirect(url_for("main.home"))

        data = session.get("car_request_data", {})
        new_req = CarRequest(
            make=data.get("make"),
            model=data.get("model"),
            min_year=data.get("min_year"),
            notes=form.notes.data,
            user_id=current_user.id,
        )
        db.session.add(new_req)
        db.session.flush()  # Flush to get ID

        # Handle images
        if form.images.data:
            for file in form.images.data:
                if not file or not file.filename:
                    continue
                filename = secure_filename(file.filename)
                upload_dir = os.path.join(current_app.root_path, REQUEST_UPLOAD_FOLDER)
                os.makedirs(upload_dir, exist_ok=True)
                file_path = os.path.join(upload_dir, filename)
                file.save(file_path)
                image_url = os.path.join("/", REQUEST_UPLOAD_FOLDER, filename).replace(
                    os.sep, "/"
                )

                new_img = CarRequestImage(image_url=image_url, request_id=new_req.id)
                db.session.add(new_img)

        db.session.commit()
        session.pop("car_request_data", None)

        # --- Check for matching cars and redirect ---
        filter_params = {
            "make": data.get("make"),
            "model": data.get("model"),
            "min_year": data.get("min_year"),
        }

        from models.car import Car

        query = Car.query.filter(
            Car.is_approved == True, Car.is_active == True, Car.listing_type != "rental"
        )
        if make := filter_params.get("make"):
            query = query.filter(Car.make.ilike(f"%{make}%"))
        if model := filter_params.get("model"):
            query = query.filter(Car.model.ilike(f"%{model}%"))
        if min_year := filter_params.get("min_year"):
            query = query.filter(Car.year >= min_year)

        if query.first():
            flash(
                "We've found some cars that match your preferences! Dealers will also be notified of your request.",
                "success",
            )
        else:
            flash(
                "Your request has been sent to our dealers! While we couldn't find an immediate match, they will contact you with offers soon.",
                "success",
            )

        filter_params["exclude_listing_type"] = "rental"
        return redirect(
            url_for(
                "main.all_listings", **{k: v for k, v in filter_params.items() if v}
            )
        )

    return render_template("request_step.html", form=form, title="Find a Car (4/4)")


# --- New Routes for Guided Path ---


@request_bp.route("/step0_choice", methods=["GET", "POST"])
@login_required
def step0_choice():
    form = RequestStep0_Choice()
    if form.validate_on_submit():
        session["car_request_data"] = {}
        if form.knows_what_they_want.data == "yes":
            return redirect(url_for("request.step1_make"))
        else:
            return redirect(url_for("request.step_guided_price"))
    return render_template(
        "request_step.html", form=form, title="Let's Find Your Next Car"
    )


@request_bp.route("/guided_price", methods=["GET", "POST"])
@login_required
def step_guided_price():
    form = RequestGuided_Price()
    if form.validate_on_submit():
        session["car_request_data"]["price"] = form.price.data
        session.modified = True
        return redirect(url_for("request.step_guided_body_type"))
    return render_template("request_step.html", form=form, title="Help Us Decide (1/5)")


@request_bp.route("/guided_body_type", methods=["GET", "POST"])
@login_required
def step_guided_body_type():
    if "price" not in session.get("car_request_data", {}):
        return redirect(url_for("request.start_request"))
    form = RequestGuided_BodyType()
    if form.validate_on_submit():
        session["car_request_data"]["body_type"] = form.body_type.data
        session.modified = True
        return redirect(url_for("request.step_guided_fuel"))
    return render_template("request_step.html", form=form, title="Help Us Decide (2/5)")


@request_bp.route("/guided_fuel", methods=["GET", "POST"])
@login_required
def step_guided_fuel():
    if "body_type" not in session.get("car_request_data", {}):
        return redirect(url_for("request.start_request"))
    form = RequestGuided_Fuel()
    if form.validate_on_submit():
        session["car_request_data"]["fuel_type"] = form.fuel_type.data
        session.modified = True
        return redirect(url_for("request.step_guided_equipment"))
    return render_template("request_step.html", form=form, title="Help Us Decide (3/5)")


@request_bp.route("/guided_equipment", methods=["GET", "POST"])
@login_required
def step_guided_equipment():
    if "fuel_type" not in session.get("car_request_data", {}):
        return redirect(url_for("request.start_request"))
    form = RequestGuided_Equipment()
    if form.validate_on_submit():
        session["car_request_data"]["equipment"] = form.equipment.data
        session.modified = True
        return redirect(url_for("request.step_guided_brand"))
    return render_template("request_step.html", form=form, title="Help Us Decide (4/5)")


@request_bp.route("/guided_brand", methods=["GET", "POST"])
@login_required
def step_guided_brand():
    if "equipment" not in session.get("car_request_data", {}):
        return redirect(url_for("request.start_request"))
    form = RequestGuided_Brand()
    if form.validate_on_submit():
        # Check daily request limit (3 per 24 hours)
        if get_recent_request_count(current_user.id) >= 3:
            flash(
                "You have reached the daily limit of 3 requests. Please try again later.",
                "danger",
            )
            return redirect(url_for("main.home"))

        data = session.get("car_request_data", {})
        notes = (
            f"Customer is looking for a car with the following preferences:\n"
            f"- Budget: {data.get('price', 'Not specified')}\n"
            f"- Body Type: {data.get('body_type', 'Not specified')}\n"
            f"- Fuel Type: {data.get('fuel_type', 'Not specified')}\n"
            f"- Important Features: {', '.join(data.get('equipment', [])) or 'None'}\n"
            f"- Preferred Brand(s): {form.brand.data or 'Any'}"
        )
        new_req = CarRequest(
            notes=notes,
            user_id=current_user.id,
            make=form.brand.data
            or None,  # Save the brand to the structured 'make' field
        )
        db.session.add(new_req)
        db.session.flush()  # Flush to get ID

        # Handle images
        if form.images.data:
            for file in form.images.data:
                if not file or not file.filename:
                    continue
                filename = secure_filename(file.filename)
                upload_dir = os.path.join(current_app.root_path, REQUEST_UPLOAD_FOLDER)
                os.makedirs(upload_dir, exist_ok=True)
                file_path = os.path.join(upload_dir, filename)
                file.save(file_path)
                image_url = os.path.join("/", REQUEST_UPLOAD_FOLDER, filename).replace(
                    os.sep, "/"
                )

                new_img = CarRequestImage(image_url=image_url, request_id=new_req.id)
                db.session.add(new_img)

        db.session.commit()
        session.pop("car_request_data", None)

        # Redirect to the filtered "All Listings" page, not just auctions
        filter_params = {
            "body_type": data.get("body_type"),
            "fuel_type": data.get("fuel_type"),
            "make": form.brand.data or data.get("brand"),
        }

        # --- Check for matching cars before flashing message ---
        from models.car import Car

        query = Car.query.filter(
            Car.is_approved == True, Car.is_active == True, Car.listing_type != "rental"
        )
        if body_type := filter_params.get("body_type"):
            query = query.filter(Car.body_type == body_type)
        if fuel_type := filter_params.get("fuel_type"):
            query = query.filter(Car.fuel_type == fuel_type)
        if make := filter_params.get("make"):
            query = query.filter(Car.make.ilike(f"%{make}%"))

        if query.first():
            flash(
                "We've found some cars that match your preferences! Dealers will also be notified of your request.",
                "success",
            )
        else:
            flash(
                "Your request has been sent to our dealers! While we couldn't find an immediate match, they will contact you with offers soon.",
                "success",
            )

        filter_params["exclude_listing_type"] = "rental"
        return redirect(
            url_for(
                "main.all_listings", **{k: v for k, v in filter_params.items() if v}
            )
        )
    return render_template("request_step.html", form=form, title="Help Us Decide (5/5)")


@request_bp.route("/my")
@login_required
def my_requests():
    requests = (
        CarRequest.query.filter_by(user_id=current_user.id)
        .order_by(CarRequest.created_at.desc())
        .all()
    )
    return render_template("my_requests.html", requests=requests)


@request_bp.route("/api/requests")
@token_required
def api_my_requests(current_user):
    """API endpoint to get the current user's car requests."""
    # This print statement confirms the function is being reached after the decorator.
    print(f"--- Executing api_my_requests for user: {current_user.username} ---")
    try:
        # Fetch Buy Requests
        buy_requests = CarRequest.query.filter_by(user_id=current_user.id).all()
        requests_data = []
        for req in buy_requests:
            d = req.to_dict()
            d["type"] = "buy"
            if "images" not in d:
                d["images"] = [{"image_url": img.image_url} for img in req.images]
            d["detail_score"] = calculate_request_score(req)
            requests_data.append(d)

        # Fetch Trade-in Requests
        trade_requests = TradeInRequest.query.filter_by(user_id=current_user.id).all()
        for req in trade_requests:
            d = req.to_dict()
            d["type"] = "trade-in"
            requests_data.append(d)

        # Sort combined list by created_at descending
        requests_data.sort(key=lambda x: x["created_at"], reverse=True)

        # This print statement shows you the exact data being sent back.
        print(
            f"--- Found {len(requests_data)} requests. Sending data: {requests_data} ---"
        )
        return jsonify(requests=requests_data)
    except Exception as e:
        print(f"!!! DATABASE ERROR in api_my_requests: {e} !!!")
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "A server error occurred while fetching requests.",
                }
            ),
            500,
        )


@request_bp.route("/api/requests/<int:request_id>", methods=["DELETE"])
@token_required
def api_delete_request(current_user, request_id):
    """API endpoint to delete a car request."""
    req = CarRequest.query.get_or_404(request_id)
    if req.user_id != current_user.id:
        return jsonify({"status": "error", "message": "Unauthorized"}), 403

    db.session.delete(req)
    db.session.commit()
    return jsonify({"status": "success", "message": "Request deleted successfully."})


@request_bp.route("/<int:request_id>")
@login_required
@mark_notification_as_read
def request_detail(request_id):
    car_request = CarRequest.query.get_or_404(request_id)
    # Security check: only the user who made the request or an admin can view it.
    if car_request.user_id != current_user.id and not current_user.is_admin:
        abort(403)

    # Get all bids for this request, lowest first
    bids = car_request.dealer_bids.order_by(DealerBid.price.asc()).all()

    # We can pass one form instance to the template and reuse it for each bid with JS
    question_form = RequestQuestionForm()

    return render_template(
        "request_detail.html",
        car_request=car_request,
        bids=bids,
        question_form=question_form,
    )


@request_bp.route("/api/requests/<int:request_id>")
@token_required
def api_request_detail(current_user, request_id):
    """API endpoint to get a single car request with all bids."""
    car_request = CarRequest.query.get_or_404(request_id)

    # Security check
    if car_request.user_id != current_user.id and not current_user.is_admin:
        return jsonify({"error": "Permission denied"}), 403

    all_bids = car_request.dealer_bids.all()

    req_data = car_request.to_dict()
    if "images" not in req_data:
        req_data["images"] = [
            {"image_url": img.image_url} for img in car_request.images
        ]

    if not all_bids:
        return jsonify({"request": req_data, "bids": []})

    # Find the lowest priced and newest bids
    lowest_bid = min(all_bids, key=lambda b: b.price)
    newest_bid = max(all_bids, key=lambda b: b.timestamp)

    # --- Calculate "Best Deal" Score ---
    # Factors: Price (40%), Year (30%), Mileage (20%), Dealer Rating (10%)
    best_deal_bid = None
    if all_bids:
        prices = [b.price for b in all_bids]
        years = [b.car_year for b in all_bids]
        mileages = [b.mileage for b in all_bids]

        min_price, max_price = min(prices), max(prices)
        min_year, max_year = min(years), max(years)
        min_mileage, max_mileage = min(mileages), max(mileages)

        highest_score = -1

        for bid in all_bids:
            score = 0
            # Price (Lower is better)
            if max_price > min_price:
                score += (1 - ((bid.price - min_price) / (max_price - min_price))) * 40
            else:
                score += 40
            # Year (Higher is better)
            if max_year > min_year:
                score += ((bid.car_year - min_year) / (max_year - min_year)) * 30
            else:
                score += 30
            # Mileage (Lower is better)
            if max_mileage > min_mileage:
                score += (
                    1 - ((bid.mileage - min_mileage) / (max_mileage - min_mileage))
                ) * 20
            else:
                score += 20
            # Rating (Higher is better)
            rating = bid.dealer.get_average_rating() or 0
            score += (rating / 5) * 10

            if score > highest_score:
                highest_score = score
                best_deal_bid = bid

    # Create a sorted list
    sorted_bids = []
    processed_bid_ids = set()

    # 1. Add the lowest bid
    sorted_bids.append(lowest_bid)
    processed_bid_ids.add(lowest_bid.id)

    # 2. Add the newest bid if it's not the same as the lowest
    if newest_bid.id not in processed_bid_ids:
        sorted_bids.append(newest_bid)
        processed_bid_ids.add(newest_bid.id)

    # 3. Add the rest of the bids, sorted by price
    remaining_bids = sorted(
        [b for b in all_bids if b.id not in processed_bid_ids], key=lambda b: b.price
    )
    sorted_bids.extend(remaining_bids)

    return jsonify(
        {
            "request": req_data,
            "bids": [
                bid.to_dict(
                    is_newest=(bid.id == newest_bid.id),
                    is_best_deal=(best_deal_bid and bid.id == best_deal_bid.id),
                )
                for bid in sorted_bids
            ],
        }
    )


@request_bp.route("/bids/compare")
@login_required
def compare_bids():
    """Displays a side-by-side comparison of selected dealer bids."""
    bid_ids_str = request.args.get("ids")
    if not bid_ids_str:
        flash("No bids selected for comparison.", "warning")
        return redirect(url_for("request.my_requests"))

    try:
        bid_ids = [int(id) for id in bid_ids_str.split(",") if id.isdigit()]
    except ValueError:
        abort(400)

    # Fetch bids ensuring they belong to the current user's requests
    bids = (
        DealerBid.query.join(CarRequest, DealerBid.request_id == CarRequest.id)
        .filter(DealerBid.id.in_(bid_ids), CarRequest.user_id == current_user.id)
        .all()
    )

    if not bids:
        flash("No valid bids found for comparison.", "danger")
        return redirect(url_for("request.my_requests"))

    # Calculate best values for highlighting
    best_values = {
        "price": {"value": float("inf"), "ids": []},
        "mileage": {"value": float("inf"), "ids": []},
        "year": {"value": float("-inf"), "ids": []},
    }

    for bid in bids:
        # Price (lower is better)
        if bid.price is not None and bid.price < best_values["price"]["value"]:
            best_values["price"]["value"] = bid.price
            best_values["price"]["ids"] = [bid.id]
        elif bid.price is not None and bid.price == best_values["price"]["value"]:
            best_values["price"]["ids"].append(bid.id)

        # Mileage (lower is better)
        if bid.mileage is not None and bid.mileage < best_values["mileage"]["value"]:
            best_values["mileage"]["value"] = bid.mileage
            best_values["mileage"]["ids"] = [bid.id]
        elif bid.mileage is not None and bid.mileage == best_values["mileage"]["value"]:
            best_values["mileage"]["ids"].append(bid.id)

        # Year (higher is better)
        if bid.car_year is not None and bid.car_year > best_values["year"]["value"]:
            best_values["year"]["value"] = bid.car_year
            best_values["year"]["ids"] = [bid.id]
        elif bid.car_year is not None and bid.car_year == best_values["year"]["value"]:
            best_values["year"]["ids"].append(bid.id)

    # Inject flags for template
    for bid in bids:
        bid.is_best_price = bid.id in best_values["price"]["ids"]
        bid.is_best_mileage = bid.id in best_values["mileage"]["ids"]
        bid.is_best_year = bid.id in best_values["year"]["ids"]

    return render_template("compare_bids.html", bids=bids)


@request_bp.route("/api/bids/compare")
@token_required
def api_compare_bids(current_user):
    """API endpoint to compare selected dealer bids."""
    bid_ids_str = request.args.get("ids")
    if not bid_ids_str:
        return jsonify({"status": "error", "message": "No bid IDs provided."}), 400

    try:
        bid_ids = [int(id) for id in bid_ids_str.split(",") if id.isdigit()]
    except ValueError:
        return jsonify({"status": "error", "message": "Invalid bid IDs."}), 400

    bids = (
        DealerBid.query.join(CarRequest, DealerBid.request_id == CarRequest.id)
        .filter(DealerBid.id.in_(bid_ids), CarRequest.user_id == current_user.id)
        .all()
    )

    if not bids:
        return jsonify({"status": "error", "message": "No valid bids found."}), 404

    # Determine best values (reusing logic logic for API consistency)
    best_values = {
        "price": {"value": float("inf"), "ids": []},
        "mileage": {"value": float("inf"), "ids": []},
        "year": {"value": float("-inf"), "ids": []},
    }

    for bid in bids:
        for key, val, op in [
            ("price", bid.price, lambda x, y: x < y),
            ("mileage", bid.mileage, lambda x, y: x < y),
            ("year", bid.car_year, lambda x, y: x > y),
        ]:
            current_best = best_values[key]["value"]
            if op(val, current_best):
                best_values[key]["value"] = val
                best_values[key]["ids"] = [bid.id]
            elif val == current_best:
                best_values[key]["ids"].append(bid.id)

    # Sanitize infinity for JSON response
    for k in best_values:
        if best_values[k]["value"] in [float("inf"), float("-inf")]:
            best_values[k]["value"] = None

    bids_data = []
    for bid in bids:
        b_dict = bid.to_dict()
        b_dict["is_best_price"] = bid.id in best_values["price"]["ids"]
        b_dict["is_best_mileage"] = bid.id in best_values["mileage"]["ids"]
        b_dict["is_best_year"] = bid.id in best_values["year"]["ids"]
        bids_data.append(b_dict)

    return jsonify({"bids": bids_data, "best_values": best_values})


@request_bp.route("/bid/<int:bid_id>/ask", methods=["POST"])
@login_required
def ask_dealer_question(bid_id):
    """Handles a buyer asking a question about a specific dealer bid."""
    bid = DealerBid.query.get_or_404(bid_id)
    car_request = bid.car_request

    # Security check: only the user who made the request can ask a question
    if car_request.user_id != current_user.id:
        abort(403)

    form = RequestQuestionForm()
    if form.validate_on_submit():
        new_question = RequestQuestion(
            question_text=form.question_text.data,
            user_id=current_user.id,
            dealer_bid_id=bid.id,
        )
        db.session.add(new_question)
        db.session.commit()

        # Notify the dealer
        notification_message = f"A customer asked a question about your offer for request #{car_request.id}."
        new_notification = Notification(
            user_id=bid.dealer_id, message=notification_message
        )
        db.session.add(new_notification)
        db.session.flush()  # Get ID

        new_notification.link = url_for(
            "dealer.answer_request_question",
            question_id=new_question.id,
            notification_id=new_notification.id,
        )
        db.session.commit()

        # --- Real-time Notification ---
        unread_count = Notification.query.filter_by(
            user_id=bid.dealer_id, is_read=False
        ).count()
        notification_data = {
            "message": new_notification.message,
            "link": new_notification.link,
            "timestamp": new_notification.timestamp.isoformat() + "Z",
            "count": unread_count,
        }
        socketio.emit("new_notification", notification_data, room=str(bid.dealer_id))
        send_push_notification(bid.dealer_id, new_notification.message)

        return jsonify(
            {
                "status": "success",
                "message": "Your question has been sent to the dealer.",
            }
        )

    return jsonify({"status": "error", "errors": form.errors})


def _accept_offer_logic(bid_id, user_id, payment_method):
    """
    Core service logic for accepting a dealer's offer.
    This is shared between the web route and the API route.
    """
    bid_to_accept = DealerBid.query.get_or_404(bid_id)
    car_request = bid_to_accept.car_request

    # Security & Business Logic Checks
    if car_request.user_id != user_id:
        raise PermissionError("User does not own this request.")
    if car_request.status != "active":
        raise ValueError("This request is already closed.")
    if payment_method == "loan" and not bid_to_accept.price_with_loan:
        raise ValueError("Invalid payment method for this offer.")

    final_price = (
        bid_to_accept.price_with_loan
        if payment_method == "loan"
        else bid_to_accept.price
    )

    # Transactional Logic
    bid_to_accept.status = "accepted"
    for other_bid in car_request.dealer_bids.filter(DealerBid.id != bid_to_accept.id):
        other_bid.status = "rejected"
    car_request.status = "completed"
    car_request.accepted_bid_id = bid_to_accept.id

    new_deal = Deal(
        final_price=final_price,
        customer_id=car_request.user_id,
        dealer_id=bid_to_accept.dealer_id,
        car_request_id=car_request.id,
        accepted_bid_id=bid_to_accept.id,
        payment_method=payment_method,
    )
    db.session.add(new_deal)
    db.session.commit()  # Commit here to get new_deal.id

    # Notify the dealer
    notification_message = (
        f"Congratulations! Your offer for request #{car_request.id} was accepted."
    )
    deal_notification = Notification(
        user_id=bid_to_accept.dealer_id,
        message=notification_message,
        link=url_for("request.deal_summary", deal_id=new_deal.id),
    )
    db.session.add(deal_notification)
    db.session.commit()
    return new_deal, deal_notification


@request_bp.route("/offer/<int:bid_id>/accept", methods=["POST"])
@login_required
def accept_offer(bid_id):
    """Handles the logic for a customer accepting a dealer's offer."""
    bid_to_accept = DealerBid.query.get_or_404(bid_id)
    car_request = bid_to_accept.car_request

    try:
        payment_method = request.form.get("payment_method", "cash")
        new_deal, deal_notification = _accept_offer_logic(
            bid_id, current_user.id, payment_method
        )

        # --- Real-time Notification ---
        unread_count = Notification.query.filter_by(
            user_id=bid_to_accept.dealer_id, is_read=False
        ).count()
        notification_data = {
            "message": deal_notification.message,
            "link": deal_notification.link,
            "timestamp": deal_notification.timestamp.isoformat() + "Z",
            "count": unread_count,
        }
        socketio.emit(
            "new_notification", notification_data, room=str(bid_to_accept.dealer_id)
        )
        send_push_notification(bid_to_accept.dealer_id, deal_notification.message)

        flash(
            "Offer accepted! The dealer has been notified and you can see the deal summary below.",
            "success",
        )
        return redirect(url_for("request.deal_summary", deal_id=new_deal.id))

    except (PermissionError, ValueError) as e:
        flash(str(e), "danger")
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error accepting offer: {e}")
        flash(f"An error occurred while accepting the offer: {e}", "danger")
    return redirect(url_for("request.request_detail", request_id=car_request.id))


@request_bp.route("/api/bid/<int:bid_id>/ask", methods=["POST"])
@token_required
def api_ask_dealer_question(current_user, bid_id):
    """API endpoint for a buyer to ask a question about a specific dealer bid."""
    bid = DealerBid.query.get_or_404(bid_id)
    car_request = bid.car_request

    # Security check
    if car_request.user_id != current_user.id:
        return jsonify({"status": "error", "message": "Permission denied."}), 403

    data = request.get_json()
    if not data or not data.get("question_text"):
        return (
            jsonify({"status": "error", "message": "Question text is required."}),
            400,
        )

    question_text = data.get("question_text")
    new_question = RequestQuestion(
        question_text=question_text,
        user_id=current_user.id,
        dealer_bid_id=bid.id,
    )
    db.session.add(new_question)
    db.session.commit()

    # Notify the dealer
    notification_message = (
        f"A customer asked a question about your offer for request #{car_request.id}."
    )
    new_notification = Notification(
        user_id=bid.dealer_id,
        message=notification_message,
        link=url_for("dealer.answer_request_question", question_id=new_question.id),
    )
    db.session.add(new_notification)
    db.session.commit()

    # --- Real-time Notification for web client ---
    unread_count = Notification.query.filter_by(
        user_id=bid.dealer_id, is_read=False
    ).count()
    notification_data = {
        "message": new_notification.message,
        "link": new_notification.link,
        "timestamp": new_notification.timestamp.isoformat() + "Z",
        "count": unread_count,
    }
    socketio.emit("new_notification", notification_data, room=str(bid.dealer_id))
    send_push_notification(bid.dealer_id, new_notification.message)

    return (
        jsonify({"status": "success", "message": "Your question has been sent."}),
        201,
    )


@request_bp.route("/api/offer/<int:bid_id>/accept", methods=["POST"])
@token_required
def api_accept_offer(current_user, bid_id):
    """API endpoint for a customer to accept a dealer's offer."""
    try:
        data = request.get_json() or {}
        payment_method = data.get("payment_method", "cash")

        new_deal, deal_notification = _accept_offer_logic(
            bid_id, current_user.id, payment_method
        )

        # --- Real-time Notification for web client ---
        unread_count = Notification.query.filter_by(
            user_id=new_deal.dealer_id, is_read=False
        ).count()
        notification_data = {
            "message": deal_notification.message,
            "link": deal_notification.link,
            "timestamp": deal_notification.timestamp.isoformat() + "Z",
            "count": unread_count,
        }
        socketio.emit(
            "new_notification", notification_data, room=str(new_deal.dealer_id)
        )
        send_push_notification(new_deal.dealer_id, deal_notification.message)

        return jsonify({"status": "success", "deal": new_deal.to_dict()}), 200

    except (PermissionError, ValueError) as e:
        return jsonify({"status": "error", "message": str(e)}), 400
    except Exception as e:
        return (
            jsonify({"status": "error", "message": "An internal error occurred."}),
            500,
        )


@request_bp.route("/deal/<int:deal_id>")
@login_required
@mark_notification_as_read
def deal_summary(deal_id):
    """Displays the final summary of a completed deal."""
    deal = Deal.query.get_or_404(deal_id)
    # Security check: only participants or an admin can view the deal
    if (
        current_user.id not in [deal.customer_id, deal.dealer_id]
        and not current_user.is_admin
    ):
        abort(403)

    # Check if a rating already exists for this deal
    existing_rating = DealerRating.query.filter_by(deal_id=deal.id).first()
    form = DealerRatingForm()
    return render_template(
        "deal_summary.html", deal=deal, rating=existing_rating, form=form
    )


@request_bp.route("/api/deals/<int:deal_id>")
@token_required
def api_deal_summary(current_user, deal_id):
    """API endpoint to get the details of a completed deal."""
    deal = Deal.query.get_or_404(deal_id)
    # Security check
    if (
        current_user.id not in [deal.customer_id, deal.dealer_id]
        and not current_user.is_admin
    ):
        return jsonify({"error": "Permission denied"}), 403

    deal_data = deal.to_dict()

    # Check if the current user (buyer) has already rated this deal
    if current_user.id == deal.customer_id:
        existing_rating = DealerRating.query.filter_by(deal_id=deal.id).first()
        deal_data["has_rated"] = True if existing_rating else False

    return jsonify(deal=deal_data)


@request_bp.route("/api/requests", methods=["POST"])
@token_required
def api_create_request(current_user):
    """
    API endpoint for creating a new car request from a mobile client.
    The client is expected to send all collected data in a single JSON payload.
    """
    # Check daily request limit (3 per 24 hours)
    last_24h = datetime.utcnow() - timedelta(hours=24)
    recent_requests_count = CarRequest.query.filter(
        CarRequest.user_id == current_user.id, CarRequest.created_at >= last_24h
    ).count()
    if recent_requests_count >= 3:
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "You have reached the daily limit of 3 requests.",
                }
            ),
            429,
        )

    # Handle both JSON and Multipart/Form-Data
    if request.content_type and "multipart/form-data" in request.content_type:
        data = request.form.to_dict()
        files = request.files.getlist("images")
    else:
        data = request.get_json()
        files = []

    if not data:
        return jsonify({"status": "error", "message": "Invalid payload."}), 400

    # --- Logic to handle both "I know what I want" and "Help me decide" paths ---
    is_guided_path = "price" in data or "body_type" in data

    if is_guided_path:
        # Define a mapping from the equipment values to human-readable labels
        equipment_map = {
            "sunroof": "Sunroof",
            "leather_seats": "Leather Seats",
            "apple_carplay": "Apple CarPlay / Android Auto",
            "awd": "All-Wheel Drive",
        }
        # Get the list of equipment values from the request
        if request.content_type and "multipart/form-data" in request.content_type:
            equipment_values = request.form.getlist("equipment")
        else:
            equipment_values = data.get("equipment", [])

        # Ensure equipment_values is a list to prevent iterating over a string (which yields characters)
        if isinstance(equipment_values, str):
            if "," in equipment_values:
                equipment_values = [e.strip() for e in equipment_values.split(",")]
            else:
                equipment_values = [equipment_values]

        # Map the values to their labels, defaulting to the value itself if not found
        equipment_labels = [equipment_map.get(val, val) for val in equipment_values]

        # Construct notes from guided path data, similar to the web route
        notes = (
            f"Customer is looking for a car with the following preferences:\n"
            f"- Budget: {data.get('price', 'Not specified')}\n"
            f"- Body Type: {data.get('body_type', 'Not specified')}\n"
            f"- Fuel Type: {data.get('fuel_type', 'Not specified')}\n"
            f"- Important Features: {', '.join(equipment_labels) or 'None'}\n"
            f"- Preferred Brand(s): {data.get('brand', 'Any')}"
        )
        new_req = CarRequest(
            notes=notes,
            user_id=current_user.id,
            make=data.get("brand") or None,  # Save brand to the structured 'make' field
        )
    else:  # "I know what I want" path
        if (
            not data.get("make")
            and not data.get("notes")
            and not files
            and not data.get("images_base64")
        ):
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "Either make/model, notes, or an image is required.",
                    }
                ),
                400,
            )
        new_req = CarRequest(
            make=data.get("make"),
            model=data.get("model"),
            min_year=data.get("min_year"),
            max_mileage=data.get("max_mileage"),
            notes=data.get("notes"),
            user_id=current_user.id,
        )

    db.session.add(new_req)
    db.session.flush()

    if data.get("images_base64"):
        for img_b64 in data["images_base64"]:
            image_url = save_base64_image(
                img_b64, filename_prefix=f"request_{new_req.id}"
            )
            if image_url:
                new_img = CarRequestImage(image_url=image_url, request_id=new_req.id)
                db.session.add(new_img)

    # Handle File uploads (Multipart)
    if files:
        for file in files:
            if not file or not file.filename:
                continue
            filename = secure_filename(file.filename)
            upload_dir = os.path.join(current_app.root_path, REQUEST_UPLOAD_FOLDER)
            os.makedirs(upload_dir, exist_ok=True)
            file_path = os.path.join(upload_dir, filename)
            file.save(file_path)
            image_url = os.path.join("/", REQUEST_UPLOAD_FOLDER, filename).replace(
                os.sep, "/"
            )
            new_img = CarRequestImage(image_url=image_url, request_id=new_req.id)
            db.session.add(new_img)

    db.session.commit()

    return (
        jsonify(
            {
                "status": "success",
                "message": "Your request has been submitted successfully!",
                "request": new_req.to_dict(),
            }
        ),
        201,
    )


@request_bp.route("/deal/<int:deal_id>/rate", methods=["POST"])
@login_required
def rate_dealer(deal_id):
    """Handles a buyer submitting a rating for a dealer after a deal."""
    deal = Deal.query.get_or_404(deal_id)

    # Security checks
    if deal.customer_id != current_user.id:
        abort(403)  # Only the buyer from the deal can rate
    if DealerRating.query.filter_by(deal_id=deal.id).first():
        flash("You have already submitted a review for this deal.", "warning")
        return redirect(url_for("request.deal_summary", deal_id=deal.id))

    form = DealerRatingForm()
    if form.validate_on_submit():
        new_rating = DealerRating(
            rating=form.rating.data,
            review_text=form.review_text.data,
            dealer_id=deal.dealer_id,
            buyer_id=deal.customer_id,
            deal_id=deal.id,
        )
        db.session.add(new_rating)
        db.session.commit()
        flash(
            "Thank you for your review! Your feedback helps our community.", "success"
        )
    else:
        flash(
            "There was an error with your submission. Please select a rating.", "danger"
        )

    return redirect(url_for("request.deal_summary", deal_id=deal.id))


@request_bp.route("/api/deals/<int:deal_id>/rate", methods=["POST"])
@token_required
def api_rate_dealer(current_user, deal_id):
    """API endpoint for a buyer to submit a rating for a dealer."""
    deal = Deal.query.get_or_404(deal_id)

    # Security checks
    if deal.customer_id != current_user.id:
        return jsonify({"status": "error", "message": "Permission denied."}), 403
    if DealerRating.query.filter_by(deal_id=deal.id).first():
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "You have already submitted a review for this deal.",
                }
            ),
            400,
        )

    data = request.get_json()
    if (
        not data
        or "rating" not in data
        or not isinstance(data.get("rating"), int)
        or not (1 <= data.get("rating") <= 5)
    ):
        return (
            jsonify(
                {"status": "error", "message": "A valid rating (1-5) is required."}
            ),
            400,
        )

    new_rating = DealerRating(
        rating=data.get("rating"),
        review_text=data.get("review_text") or None,
        dealer_id=deal.dealer_id,
        buyer_id=deal.customer_id,
        deal_id=deal.id,
    )
    db.session.add(new_rating)
    db.session.commit()

    return (
        jsonify(
            {
                "status": "success",
                "message": "Thank you for your review!",
                "rating": new_rating.to_dict(),
            }
        ),
        201,
    )
