from flask import (
    Blueprint,
    render_template,
    redirect,
    url_for,
    flash,
    request,
    current_app,
    jsonify,
    abort,
)
from flask_login import login_required, current_user
from flask_wtf import FlaskForm
from wtforms import (
    StringField,
    IntegerField,
    SelectField,
    TextAreaField,
    SubmitField,
    MultipleFileField,
)
from wtforms.validators import DataRequired, Length, NumberRange, Optional
from flask_wtf.file import FileAllowed
from werkzeug.utils import secure_filename
import os
from datetime import datetime, timedelta
import base64
import uuid

from extensions import db
from models.trade_in import TradeInRequest, TradeInPhoto, TradeInOffer
from routes.auth import token_required

tradein_bp = Blueprint("tradein", __name__, url_prefix="/trade-in")

TRADE_IN_UPLOAD_FOLDER = "static/uploads/trade_ins"


class TradeInForm(FlaskForm):
    """Form for users to submit their car for a trade-in valuation."""

    make = StringField("Car Make", validators=[DataRequired(), Length(max=50)])
    model = StringField("Car Model", validators=[DataRequired(), Length(max=50)])
    year = IntegerField(
        "Year",
        validators=[DataRequired(), NumberRange(min=1950, max=datetime.now().year)],
    )
    mileage = IntegerField(
        "Mileage (km)", validators=[DataRequired(), NumberRange(min=0)]
    )
    condition = SelectField(
        "Condition",
        choices=[
            ("Excellent", "Excellent"),
            ("Good", "Good"),
            ("Fair", "Fair"),
            ("Poor", "Poor"),
        ],
        validators=[DataRequired()],
    )
    vin = StringField(
        "VIN (Vehicle Identification Number)",
        validators=[Optional(), Length(min=17, max=17)],
    )
    target_car = StringField(
        "Target Car (Optional)", validators=[Optional(), Length(max=100)]
    )
    comments = TextAreaField(
        "Additional Comments (e.g., modifications, issues)",
        validators=[Optional(), Length(max=1000)],
    )
    images = MultipleFileField(
        "Upload Photos (up to 10)",
        validators=[
            FileAllowed(["jpg", "png", "jpeg"], "Images only!"),
            DataRequired(message="Please upload at least one photo of your car."),
        ],
    )
    submit = SubmitField("Get My Trade-in Offer")


def get_recent_trade_in_count(user_id):
    """Helper to count trade-in requests made by a user in the last 24 hours."""
    last_24h = datetime.utcnow() - timedelta(hours=24)
    return TradeInRequest.query.filter(
        TradeInRequest.user_id == user_id, TradeInRequest.created_at >= last_24h
    ).count()


@tradein_bp.context_processor
def inject_remaining_trade_ins():
    """Injects the remaining number of trade-in requests allowed for the day into templates."""
    if current_user.is_authenticated:
        count = get_recent_trade_in_count(current_user.id)
        return {"remaining_trade_ins": max(0, 3 - count)}
    return {}


def save_trade_in_photo(file):
    """Saves an uploaded photo for a trade-in and returns its web-accessible path."""
    if not file or file.filename == "":
        return None

    filename = secure_filename(file.filename)
    upload_dir = os.path.join(current_app.root_path, TRADE_IN_UPLOAD_FOLDER)
    os.makedirs(upload_dir, exist_ok=True)

    # Create a unique filename to avoid overwrites
    unique_filename = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}_{filename}"
    file_path = os.path.join(upload_dir, unique_filename)
    file.save(file_path)

    # Return the relative path for web access
    return os.path.join("/", TRADE_IN_UPLOAD_FOLDER, unique_filename).replace(
        os.sep, "/"
    )


def save_base64_image(base64_string, filename_prefix="trade_in"):
    """Decodes a base64 string and saves it as an image file, returning its web path."""
    if not base64_string:
        return None

    try:
        # Split the header from the data (e.g., "data:image/jpeg;base64,")
        header, encoded = base64_string.split(",", 1)
        image_data = base64.b64decode(encoded)

        # Create a unique filename
        unique_filename = f"{filename_prefix}_{uuid.uuid4().hex}.jpeg"
        upload_dir = os.path.join(current_app.root_path, TRADE_IN_UPLOAD_FOLDER)
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, unique_filename)
        with open(file_path, "wb") as f:
            f.write(image_data)
        return os.path.join("/", TRADE_IN_UPLOAD_FOLDER, unique_filename).replace(
            os.sep, "/"
        )
    except Exception as e:
        current_app.logger.error(f"Could not save base64 image: {e}")
        return None


@tradein_bp.route("/", methods=["GET", "POST"])
@login_required
def submit_trade_in():
    """Displays and processes the trade-in submission form."""
    form = TradeInForm()
    if form.validate_on_submit():
        if get_recent_trade_in_count(current_user.id) >= 3:
            flash(
                "You have reached the daily limit of 3 trade-in requests. Please try again later.",
                "danger",
            )
            return redirect(url_for("main.home"))

        # NOTE: The following lines are commented out as the models do not exist yet.
        # You would uncomment this when you create the TradeInRequest and TradeInPhoto models.

        new_request = TradeInRequest(
            user_id=current_user.id,
            make=form.make.data,
            model=form.model.data,
            year=form.year.data,
            mileage=form.mileage.data,
            condition=form.condition.data,
            vin=form.vin.data,
            target_car=form.target_car.data,
            comments=form.comments.data,
            status="pending",
        )
        db.session.add(new_request)
        db.session.flush()  # To get the ID for the new_request

        for image_file in form.images.data:
            image_url = save_trade_in_photo(image_file)
            if image_url:
                new_photo = TradeInPhoto(
                    image_url=image_url, trade_in_request_id=new_request.id
                )
                db.session.add(new_photo)

        db.session.commit()

        flash(
            "Thank you! Your trade-in request has been submitted. Our team will review it and get back to you shortly.",
            "success",
        )
        return redirect(url_for("main.home"))

    return render_template("trade_in_form.html", form=form, title="Trade-in Your Car")


@tradein_bp.route("/api", methods=["POST"])
@token_required
def api_submit_trade_in(current_user):
    """API endpoint for submitting a trade-in request (for mobile apps)."""
    if get_recent_trade_in_count(current_user.id) >= 3:
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "You have reached the daily limit of 3 trade-in requests.",
                }
            ),
            429,
        )

    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "message": "Invalid JSON payload."}), 400

    # --- Validation similar to the web form ---
    required_fields = ["make", "model", "year", "mileage", "condition", "images"]
    if not all(field in data for field in required_fields):
        return jsonify({"status": "error", "message": "Missing required fields."}), 400

    if not isinstance(data["images"], list) or not data["images"]:
        return (
            jsonify({"status": "error", "message": "At least one image is required."}),
            400,
        )

    # NOTE: The following lines are commented out as the models do not exist yet.
    new_request = TradeInRequest(
        user_id=current_user.id,
        make=data.get("make"),
        model=data.get("model"),
        year=data.get("year"),
        mileage=data.get("mileage"),
        condition=data.get("condition"),
        vin=data.get("vin"),
        target_car=data.get("targetCar"),
        comments=data.get("comments"),
        status="pending",
    )
    db.session.add(new_request)
    db.session.flush()

    # In a real API, you'd decode base64 images and save them.
    for image_data in data["images"]:
        image_url = save_base64_image(image_data)  # A helper function to handle base64
        if image_url:
            new_photo = TradeInPhoto(
                image_url=image_url, trade_in_request_id=new_request.id
            )
            db.session.add(new_photo)

    db.session.commit()

    return (
        jsonify(
            {
                "status": "success",
                "message": "Your trade-in request has been submitted successfully.",
                "request": new_request.to_dict(),
            }
        ),
        201,
    )


@tradein_bp.route("/api/requests/<int:request_id>", methods=["GET"])
@token_required
def api_get_my_trade_in_detail(current_user, request_id):
    """API endpoint for a user to get details of their own trade-in request."""
    print(
        f"DEBUG: api_get_my_trade_in_detail called for request {request_id} by user {current_user.id}"
    )
    req = TradeInRequest.query.get_or_404(request_id)

    print(
        f"DEBUG: Checking ownership. Request Owner ID: {req.user_id}, Current User ID: {current_user.id}"
    )
    is_owner = req.user_id == current_user.id
    is_admin = getattr(current_user, "is_admin", False)
    is_dealer = getattr(current_user, "is_dealer", False)

    if not (is_owner or is_admin or (is_dealer and req.status == "active")):
        print(
            f"DEBUG: Access denied. User ID: {current_user.id}, Owner ID: {req.user_id}, Status: {req.status}, IsAdmin: {is_admin}, IsDealer: {is_dealer}"
        )
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "Unauthorized: You are not the owner of this request.",
                }
            ),
            403,
        )

    response_data = req.to_dict()

    # Determine viewer role for frontend logic
    viewer_role = "buyer"
    if is_admin:
        viewer_role = "admin"
    elif is_dealer and not is_owner:
        viewer_role = "dealer"

    response_data["viewer_role"] = viewer_role

    # Include offers if the viewer is the owner or admin
    if is_owner or is_admin:
        response_data["offers"] = [offer.to_dict() for offer in req.offers]

    return jsonify({"request": response_data})


@tradein_bp.route("/api/requests/<int:request_id>/offer", methods=["POST"])
@token_required
def api_place_trade_in_offer(current_user, request_id):
    """API endpoint for dealers to place an offer on a trade-in request."""
    if not getattr(current_user, "is_dealer", False):
        return (
            jsonify({"status": "error", "message": "Only dealers can place offers."}),
            403,
        )

    req = TradeInRequest.query.get_or_404(request_id)
    if req.status != "active":
        return (
            jsonify({"status": "error", "message": "This request is not active."}),
            400,
        )

    data = request.get_json()
    amount = data.get("amount")
    notes = data.get("notes")

    if not amount:
        return jsonify({"status": "error", "message": "Offer amount is required."}), 400

    offer = TradeInOffer(
        trade_in_request_id=req.id,
        dealer_id=current_user.id,
        amount=amount,
        notes=notes,
    )
    db.session.add(offer)
    db.session.commit()

    return (
        jsonify(
            {
                "status": "success",
                "message": "Offer placed successfully.",
                "offer": offer.to_dict(),
            }
        ),
        201,
    )


@tradein_bp.route("/admin/requests")
@login_required
def admin_trade_in_requests():
    """Displays all trade-in requests for the admin."""
    if not current_user.is_admin:
        abort(403)
    requests = TradeInRequest.query.order_by(TradeInRequest.created_at.desc()).all()
    return render_template("admin_trade_ins.html", requests=requests)


@tradein_bp.route("/admin/requests/<int:request_id>/status", methods=["POST"])
@login_required
def admin_update_trade_in_status(request_id):
    """Updates the status of a trade-in request."""
    if not current_user.is_admin:
        abort(403)

    req = TradeInRequest.query.get_or_404(request_id)
    new_status = request.form.get("status")
    if new_status:
        req.status = new_status
        db.session.commit()
        flash(f"Trade-in request #{req.id} status updated to {new_status}.", "success")

    return redirect(url_for("tradein.admin_trade_in_requests"))


@tradein_bp.route("/api/admin/requests/<int:request_id>", methods=["GET"])
@token_required
def api_admin_get_trade_in(current_user, request_id):
    """API endpoint for admin to get details of a specific trade-in request."""
    if not current_user.is_admin:
        print(f"DEBUG: Admin access denied for user {current_user.id}")
        return (
            jsonify(
                {"status": "error", "message": "Unauthorized: Admin access required."}
            ),
            403,
        )
    req = TradeInRequest.query.get_or_404(request_id)
    data = req.to_dict()
    # Add user details manually
    data["user"] = {
        "id": req.user.id,
        "username": req.user.username,
        "email": req.user.email,
    }
    return jsonify({"request": data})


@tradein_bp.route("/api/admin/requests/<int:request_id>/status", methods=["POST"])
@token_required
def api_admin_update_trade_in_status(current_user, request_id):
    """API endpoint for admin to update status of a trade-in request."""
    if not current_user.is_admin:
        return jsonify({"status": "error", "message": "Unauthorized"}), 403

    req = TradeInRequest.query.get_or_404(request_id)
    data = request.get_json()
    new_status = data.get("status")

    if new_status:
        req.status = new_status
        db.session.commit()
        return jsonify(
            {"status": "success", "message": f"Status updated to {new_status}"}
        )

    return jsonify({"status": "error", "message": "Status is required."}), 400


@tradein_bp.route("/api/active", methods=["GET"])
@token_required
def api_get_active_trade_ins(current_user):
    """API endpoint for dealers to get active trade-in requests."""
    if not getattr(current_user, "is_dealer", False):
        return jsonify({"status": "error", "message": "Unauthorized"}), 403

    requests = (
        TradeInRequest.query.filter_by(status="active")
        .order_by(TradeInRequest.created_at.desc())
        .all()
    )
    return jsonify({"requests": [req.to_dict() for req in requests]})


@tradein_bp.route(
    "/api/requests/<int:request_id>/offers/<int:offer_id>/accept", methods=["POST"]
)
@token_required
def api_accept_trade_in_offer(current_user, request_id, offer_id):
    """API endpoint for a user to accept a trade-in offer."""
    req = TradeInRequest.query.get_or_404(request_id)
    offer = TradeInOffer.query.get_or_404(offer_id)

    if req.user_id != current_user.id:
        return jsonify({"status": "error", "message": "Unauthorized"}), 403

    if req.status != "active":
        return jsonify({"status": "error", "message": "Request is not active."}), 400

    if offer.trade_in_request_id != req.id:
        return jsonify({"status": "error", "message": "Invalid offer."}), 400

    # Update statuses
    offer.status = "accepted"
    req.status = "completed"

    db.session.commit()

    return jsonify({"status": "success", "message": "Offer accepted successfully."})
