import re
from datetime import datetime, timedelta

from extensions import db
from models.car import Car
from models.car_request import CarRequest
from models.chat_message import ChatMessage
from models.conversation import Conversation
from models.deal import Deal
from models.dealer_bid import DealerBid
from models.dealer_rating import DealerRating
from models.point_transaction import PointTransaction
from models.request_question import RequestQuestion


CONTACT_RISK_PATTERNS = [
    (r"(?:\+251\s?|0)?9\d{2}\s?\d{3}\s?\d{3}", "phone"),
    (r"[\w.+-]+@[\w-]+\.[\w.-]+", "email"),
    (r"https?://\S+", "link"),
    (r"\b(?:WhatsApp|Telegram|Instagram|Facebook|fb\.com|t\.me)\b", "social"),
    (r"\b(?:call me|text me|dm me|message me outside|contact me)\b", "contact_phrase"),
]


def _clamp(value, minimum=0, maximum=100):
    return max(minimum, min(maximum, round(value)))


def _label_for_score(score):
    if score >= 80:
        return "High"
    if score >= 50:
        return "Medium"
    return "Low"


def detect_contact_risk(message):
    """Detect contact-sharing attempts and return masked text plus risk metadata."""
    masked_message = message or ""
    categories = []
    total_matches = 0

    for pattern, category in CONTACT_RISK_PATTERNS:
        masked_message, count = re.subn(
            pattern, "[Contact Info Hidden]", masked_message, flags=re.IGNORECASE
        )
        if count:
            categories.append(category)
            total_matches += count

    return {
        "masked_message": masked_message,
        "has_contact_risk": total_matches > 0,
        "contact_risk_categories": sorted(set(categories)),
        "contact_risk_score": _clamp(total_matches * 35),
    }


def get_request_lead_quality(car_request):
    """Score how useful and serious a buyer request appears to be."""
    score = 15
    reasons = []

    if car_request.target_car_id:
        score += 20
        reasons.append("specific listing requested")
    if car_request.make:
        score += 12
        reasons.append("make provided")
    if car_request.model:
        score += 12
        reasons.append("model provided")
    if car_request.min_year:
        score += 8
        reasons.append("year preference provided")
    if car_request.max_mileage:
        score += 6
        reasons.append("mileage preference provided")
    if car_request.notes and len(car_request.notes.strip()) >= 20:
        score += 10
        reasons.append("detailed notes")
    if getattr(car_request, "images", None):
        image_count = len(car_request.images)
        if image_count:
            score += min(18, image_count * 6)
            reasons.append(f"{image_count} uploaded image(s)")

    buyer_completed_deals = Deal.query.filter_by(
        customer_id=car_request.user_id, status="completed"
    ).count()
    if buyer_completed_deals:
        score += min(15, buyer_completed_deals * 5)
        reasons.append("buyer has completed deals")

    offer_count = car_request.dealer_bids.count()
    if offer_count:
        score += min(10, offer_count * 2)
        reasons.append("dealers are already responding")

    age_days = 0
    if car_request.created_at:
        age_days = max(0, (datetime.utcnow() - car_request.created_at).days)
        if age_days <= 2:
            score += 7
            reasons.append("recent request")
        elif age_days >= 14:
            score -= 10
            reasons.append("older request")

    final_score = _clamp(score)
    return {
        "score": final_score,
        "label": _label_for_score(final_score),
        "reasons": reasons[:5],
        "age_days": age_days,
    }


def get_dealer_quality_score(dealer):
    """Score dealer reliability and marketplace contribution from existing behavior."""
    if not dealer:
        return {"score": 0, "label": "Unknown", "reasons": []}

    offers = DealerBid.query.filter_by(dealer_id=dealer.id).count()
    accepted_bids = DealerBid.query.filter_by(
        dealer_id=dealer.id, status="accepted"
    ).count()
    completed_deals = Deal.query.filter_by(dealer_id=dealer.id, status="completed").count()
    active_listings = Car.query.filter_by(
        owner_id=dealer.id, is_active=True, is_approved=True
    ).count()
    conversations = Conversation.query.filter_by(dealer_id=dealer.id).count()
    unanswered_questions = (
        RequestQuestion.query.join(DealerBid)
        .filter(
            DealerBid.dealer_id == dealer.id,
            RequestQuestion.answer_text.is_(None),
        )
        .count()
    )
    avg_rating = (
        db.session.query(db.func.avg(DealerRating.rating))
        .filter(DealerRating.dealer_id == dealer.id)
        .scalar()
        or 0
    )
    masked_messages = (
        ChatMessage.query.join(Conversation)
        .filter(
            Conversation.dealer_id == dealer.id,
            ChatMessage.original_body.isnot(None),
            ChatMessage.original_body != ChatMessage.body,
        )
        .count()
    )

    score = 35
    score += min(15, active_listings * 2)
    score += min(12, offers)
    score += min(10, conversations)
    score += min(18, completed_deals * 6)
    score += min(10, accepted_bids * 2)
    score += (float(avg_rating) / 5) * 15 if avg_rating else 0
    score -= min(12, unanswered_questions * 3)
    score -= min(15, masked_messages * 5)

    final_score = _clamp(score)
    reasons = [
        f"{active_listings} active listing(s)",
        f"{offers} offer(s)",
        f"{completed_deals} completed deal(s)",
        f"{float(avg_rating):.1f} average rating",
    ]
    if unanswered_questions:
        reasons.append(f"{unanswered_questions} unanswered question(s)")
    if masked_messages:
        reasons.append(f"{masked_messages} contact-risk message(s)")

    return {
        "score": final_score,
        "label": _label_for_score(final_score),
        "reasons": reasons,
        "metrics": {
            "offers": offers,
            "accepted_bids": accepted_bids,
            "completed_deals": completed_deals,
            "active_listings": active_listings,
            "conversations": conversations,
            "unanswered_questions": unanswered_questions,
            "average_rating": round(float(avg_rating), 1),
            "contact_risk_messages": masked_messages,
        },
    }


def get_dealer_request_match(dealer, car_request):
    """Score how well a dealer fits a buyer request."""
    if not dealer or not car_request:
        return {"score": 0, "label": "Low", "reasons": []}

    score = 10
    reasons = []
    dealer_cars = Car.query.filter_by(
        owner_id=dealer.id, is_active=True, is_approved=True
    ).all()

    request_make = (car_request.make or "").strip().lower()
    request_model = (car_request.model or "").strip().lower()
    target = car_request.target_car

    if target:
        request_make = request_make or (target.make or "").strip().lower()
        request_model = request_model or (target.model or "").strip().lower()

    if request_make:
        if any((car.make or "").strip().lower() == request_make for car in dealer_cars):
            score += 25
            reasons.append("dealer has matching make")
    if request_model:
        if any((car.model or "").strip().lower() == request_model for car in dealer_cars):
            score += 25
            reasons.append("dealer has matching model")

    if target and target.body_type:
        target_body = target.body_type.strip().lower()
        if any((car.body_type or "").strip().lower() == target_body for car in dealer_cars):
            score += 10
            reasons.append("dealer has matching body type")

    previous_matching_wins = (
        DealerBid.query.join(CarRequest, DealerBid.request_id == CarRequest.id)
        .filter(
            DealerBid.dealer_id == dealer.id,
            DealerBid.status == "accepted",
        )
        .all()
    )
    for bid in previous_matching_wins:
        if request_make and (bid.make or "").strip().lower() == request_make:
            score += 10
            reasons.append("dealer previously won similar make")
            break

    quality = get_dealer_quality_score(dealer)
    score += quality["score"] * 0.25
    reasons.append(f"{quality['label'].lower()} dealer quality")

    final_score = _clamp(score)
    return {
        "score": final_score,
        "label": _label_for_score(final_score),
        "reasons": reasons[:5],
    }


def rank_dealer_offers(bids):
    """Rank offers by price, vehicle fit, and dealer quality."""
    if not bids:
        return {}

    prices = [bid.price for bid in bids if bid.price is not None]
    years = [bid.car_year for bid in bids if bid.car_year is not None]
    mileages = [bid.mileage for bid in bids if bid.mileage is not None]
    min_price, max_price = min(prices), max(prices)
    min_year, max_year = min(years), max(years)
    min_mileage, max_mileage = min(mileages), max(mileages)

    def normalize_lower(value, min_value, max_value):
        if max_value <= min_value:
            return 1
        return 1 - ((value - min_value) / (max_value - min_value))

    def normalize_higher(value, min_value, max_value):
        if max_value <= min_value:
            return 1
        return (value - min_value) / (max_value - min_value)

    ranked = {}
    for bid in bids:
        quality = get_dealer_quality_score(bid.dealer)
        price_score = normalize_lower(bid.price, min_price, max_price) * 35
        year_score = normalize_higher(bid.car_year, min_year, max_year) * 20
        mileage_score = normalize_lower(bid.mileage, min_mileage, max_mileage) * 15
        dealer_score = quality["score"] * 0.2
        photo_score = 5 if bid.images else 0
        loan_score = 5 if bid.price_with_loan else 0
        total = _clamp(
            price_score
            + year_score
            + mileage_score
            + dealer_score
            + photo_score
            + loan_score
        )
        reasons = []
        if price_score >= 25:
            reasons.append("strong price")
        if year_score >= 14:
            reasons.append("newer vehicle")
        if mileage_score >= 10:
            reasons.append("lower mileage")
        if quality["score"] >= 75:
            reasons.append("high dealer quality")
        if bid.images:
            reasons.append("offer includes images")
        if bid.price_with_loan:
            reasons.append("loan price available")

        ranked[bid.id] = {
            "score": total,
            "label": _label_for_score(total),
            "reasons": reasons[:5],
            "dealer_quality": quality,
        }

    return ranked


def get_point_economy_summary(user):
    if not user:
        return {"current_points": 0, "earned_points": 0, "spent_points": 0}

    earned = (
        db.session.query(db.func.sum(PointTransaction.amount))
        .filter(PointTransaction.user_id == user.id, PointTransaction.amount > 0)
        .scalar()
        or 0
    )
    spent = (
        db.session.query(db.func.sum(PointTransaction.amount))
        .filter(PointTransaction.user_id == user.id, PointTransaction.amount < 0)
        .scalar()
        or 0
    )
    recent_spend_cutoff = datetime.utcnow() - timedelta(days=30)
    recent_spend = (
        db.session.query(db.func.sum(PointTransaction.amount))
        .filter(
            PointTransaction.user_id == user.id,
            PointTransaction.amount < 0,
            PointTransaction.created_at >= recent_spend_cutoff,
        )
        .scalar()
        or 0
    )

    return {
        "current_points": user.points or 0,
        "earned_points": int(earned or 0),
        "spent_points": abs(int(spent or 0)),
        "spent_points_30d": abs(int(recent_spend or 0)),
    }
