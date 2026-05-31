from datetime import datetime, timedelta

from extensions import db
from models.dealer_bid import DealerBid
from models.dealer_lead_pipeline import DealerLeadPipeline
from models.request_intent_verification import RequestIntentVerification
from models.request_question import RequestQuestion
from models.chat_message import ChatMessage
from models.conversation import Conversation
from services.marketplace_intelligence import (
    get_dealer_quality_score,
    get_dealer_response_health,
    get_offer_price_position,
    rank_dealer_offers,
)


INTENT_TIMELINE_POINTS = {
    "immediate": 30,
    "this_week": 25,
    "this_month": 18,
    "researching": 6,
}

PIPELINE_STAGES = {
    "offer_sent",
    "buyer_viewed",
    "question_received",
    "follow_up_needed",
    "deal_accepted",
    "deal_completed",
    "lost",
}


def _clamp(value, minimum=0, maximum=100):
    return max(minimum, min(maximum, int(round(value))))


def _intent_level(score):
    if score >= 80:
        return "high_intent"
    if score >= 50:
        return "verified"
    return "basic"


def calculate_request_intent_score(car_request, verification=None):
    score = 10
    reasons = []

    if car_request.target_car_id:
        score += 15
        reasons.append("specific listing selected")
    if car_request.make:
        score += 8
        reasons.append("make provided")
    if car_request.model:
        score += 8
        reasons.append("model provided")
    if car_request.notes and len(car_request.notes.strip()) >= 30:
        score += 8
        reasons.append("detailed notes")
    if car_request.images:
        score += min(15, len(car_request.images) * 5)
        reasons.append(f"{len(car_request.images)} uploaded image(s)")

    if verification:
        if verification.contact_confirmed:
            score += 15
            reasons.append("contact confirmed")
        if verification.budget_confirmed:
            score += 12
            reasons.append("budget confirmed")
        if verification.financing_ready:
            score += 8
            reasons.append("financing readiness confirmed")
        if verification.trade_in_ready:
            score += 5
            reasons.append("trade-in readiness confirmed")
        timeline_points = INTENT_TIMELINE_POINTS.get(
            verification.purchase_timeline or "", 0
        )
        if timeline_points:
            score += timeline_points
            reasons.append(f"timeline: {verification.purchase_timeline}")

    final_score = _clamp(score)
    return {
        "score": final_score,
        "level": _intent_level(final_score),
        "reasons": reasons[:6],
    }


def get_or_create_request_intent(car_request):
    verification = car_request.intent_verification
    if not verification:
        verification = RequestIntentVerification(request_id=car_request.id)
        db.session.add(verification)
        db.session.flush()

    calculated = calculate_request_intent_score(car_request, verification)
    verification.score = calculated["score"]
    verification.level = calculated["level"]
    return verification, calculated["reasons"]


def update_request_intent(car_request, data):
    verification, _ = get_or_create_request_intent(car_request)

    for field in (
        "contact_confirmed",
        "budget_confirmed",
        "financing_ready",
        "trade_in_ready",
    ):
        if field in data:
            setattr(verification, field, bool(data.get(field)))

    if "purchase_timeline" in data:
        timeline = data.get("purchase_timeline")
        verification.purchase_timeline = timeline if timeline in INTENT_TIMELINE_POINTS else None
    if "notes" in data:
        verification.notes = (data.get("notes") or "").strip() or None

    verification.verified_at = datetime.utcnow()
    calculated = calculate_request_intent_score(car_request, verification)
    verification.score = calculated["score"]
    verification.level = calculated["level"]
    db.session.commit()
    return serialize_request_intent(car_request)


def serialize_request_intent(car_request):
    verification = car_request.intent_verification
    if verification:
        calculated = calculate_request_intent_score(car_request, verification)
        verification.score = calculated["score"]
        verification.level = calculated["level"]
        payload = verification.to_dict()
        reasons = calculated["reasons"]
    else:
        calculated = calculate_request_intent_score(car_request)
        payload = {
            "id": None,
            "request_id": car_request.id,
            "contact_confirmed": False,
            "budget_confirmed": False,
            "financing_ready": False,
            "trade_in_ready": False,
            "purchase_timeline": None,
            "notes": None,
            "score": calculated["score"],
            "level": calculated["level"],
            "verified_at": None,
            "updated_at": None,
        }
        reasons = calculated["reasons"]
    payload["reasons"] = reasons
    return payload


def ensure_pipeline_for_bid(bid):
    if bid.pipeline_entry:
        return bid.pipeline_entry

    car_request = bid.car_request
    if not car_request:
        return None
    stage = "offer_sent"
    if bid.status == "accepted":
        stage = (
            "deal_completed"
            if bid.deal and bid.deal.status == "completed"
            else "deal_accepted"
        )
    elif bid.status in {"rejected", "expired"}:
        stage = "lost"

    pipeline = DealerLeadPipeline(
        dealer_bid_id=bid.id,
        dealer_id=bid.dealer_id,
        buyer_id=car_request.user_id,
        request_id=bid.request_id,
        stage=stage,
        last_activity_at=bid.timestamp or datetime.utcnow(),
    )
    db.session.add(pipeline)
    db.session.flush()
    return pipeline


def ensure_dealer_pipeline_entries(dealer):
    created = 0
    bids = DealerBid.query.filter_by(dealer_id=dealer.id).all()
    for bid in bids:
        if not bid.pipeline_entry:
            pipeline = ensure_pipeline_for_bid(bid)
            if pipeline:
                created += 1
    return created


def update_pipeline_stage_for_bid(bid, stage, notes=None, next_follow_up_at=None):
    if stage not in PIPELINE_STAGES:
        raise ValueError("Invalid pipeline stage.")

    pipeline = ensure_pipeline_for_bid(bid)
    if not pipeline:
        raise ValueError("Could not create a pipeline entry for this offer.")
    pipeline.stage = stage
    pipeline.last_activity_at = datetime.utcnow()
    if notes is not None:
        pipeline.notes = notes.strip() or None
    if next_follow_up_at is not None:
        pipeline.next_follow_up_at = next_follow_up_at
    return pipeline


def mark_buyer_viewed_request(car_request):
    now = datetime.utcnow()
    changed = False
    for bid in car_request.dealer_bids.filter(DealerBid.status == "pending").all():
        pipeline = ensure_pipeline_for_bid(bid)
        if not pipeline.buyer_viewed_at:
            pipeline.buyer_viewed_at = now
            pipeline.stage = "buyer_viewed"
            pipeline.last_activity_at = now
            changed = True
    return changed


def mark_question_received(bid):
    pipeline = ensure_pipeline_for_bid(bid)
    if not pipeline:
        return None
    if pipeline.stage in {"offer_sent", "buyer_viewed"}:
        pipeline.stage = "question_received"
    pipeline.last_activity_at = datetime.utcnow()
    return pipeline


def mark_bid_accepted(bid):
    pipeline = ensure_pipeline_for_bid(bid)
    if not pipeline:
        return None
    pipeline.stage = "deal_accepted"
    pipeline.last_activity_at = datetime.utcnow()
    return pipeline


def mark_bid_lost(bid):
    pipeline = ensure_pipeline_for_bid(bid)
    if not pipeline:
        return None
    pipeline.stage = "lost"
    pipeline.last_activity_at = datetime.utcnow()
    return pipeline


def mark_dealer_pipeline_completed(deal):
    if deal.accepted_bid:
        pipeline = ensure_pipeline_for_bid(deal.accepted_bid)
        pipeline.stage = "deal_completed"
        pipeline.last_activity_at = datetime.utcnow()
        return pipeline
    return None


def serialize_pipeline_entry(entry):
    payload = entry.to_dict()
    if entry.next_follow_up_at:
        payload["follow_up_due"] = entry.next_follow_up_at <= datetime.utcnow()
    else:
        payload["follow_up_due"] = False
    return payload


def _is_winning_dealer_alternate_entry(entry):
    """Hide rejected alternate bids when the same dealer won the request."""
    car_request = entry.car_request
    accepted_bid = car_request.accepted_bid if car_request else None
    return bool(
        accepted_bid
        and accepted_bid.dealer_id == entry.dealer_id
        and accepted_bid.id != entry.dealer_bid_id
    )


def list_dealer_pipeline(dealer, stage=None):
    query = DealerLeadPipeline.query.filter_by(dealer_id=dealer.id)
    if stage:
        query = query.filter_by(stage=stage)
    return [
        serialize_pipeline_entry(entry)
        for entry in query.order_by(
            DealerLeadPipeline.last_activity_at.desc(),
            DealerLeadPipeline.created_at.desc(),
        ).all()
        if not _is_winning_dealer_alternate_entry(entry)
    ]


def get_dealer_pipeline_stage_counts(dealer):
    counts = {stage: 0 for stage in PIPELINE_STAGES}
    entries = DealerLeadPipeline.query.filter_by(dealer_id=dealer.id).all()
    for entry in entries:
        if _is_winning_dealer_alternate_entry(entry):
            continue
        counts[entry.stage] = counts.get(entry.stage, 0) + 1
    counts["all"] = sum(counts.values())
    return counts


def explain_offer(bid, offer_rank=None):
    price_position = get_offer_price_position(bid)
    dealer_quality = get_dealer_quality_score(bid.dealer)
    labels = []
    reasons = []

    if offer_rank and offer_rank.get("score", 0) >= 80:
        labels.append("Best overall value")
        reasons.append("This offer ranks strongly across price, car specs, and dealer quality.")
    if price_position.get("position") in {"below_market", "lowest"}:
        labels.append("Strong price")
        reasons.append(price_position.get("summary") or "This offer is priced competitively.")
    if bid.price_with_loan:
        labels.append("Loan option")
        reasons.append("The dealer included a bank-loan price option.")
    if bid.images:
        labels.append("Photos included")
        reasons.append("The dealer submitted vehicle photos with the offer.")
    if dealer_quality.get("score", 0) >= 75:
        labels.append("Reliable dealer")
        reasons.append("Dealer quality is strong based on platform activity and history.")
    if bid.mileage is not None and bid.mileage <= 25000:
        labels.append("Low mileage")
        reasons.append("The offered vehicle has relatively low mileage.")
    if bid.status == "expired":
        labels.append("Expired")
        reasons.append("This offer is no longer valid.")

    return {
        "labels": labels[:4],
        "primary_label": labels[0] if labels else "Offer available",
        "reasons": reasons[:4],
        "price_position": price_position,
    }


def explain_offers(bids):
    rankings = rank_dealer_offers(bids)
    return {bid.id: explain_offer(bid, rankings.get(bid.id)) for bid in bids}


def get_dealer_sla_status(dealer):
    minutes = dealer.response_sla_minutes or 1440
    response_health = get_dealer_response_health(dealer)
    avg_minutes = response_health.get("avg_first_response_minutes")
    meets_commitment = (
        bool(dealer.response_sla_enabled)
        and avg_minutes is not None
        and avg_minutes <= minutes
    )

    return {
        "enabled": bool(dealer.response_sla_enabled),
        "minutes": minutes,
        "label": _format_sla_label(minutes),
        "avg_first_response_minutes": avg_minutes,
        "meets_commitment": meets_commitment,
        "badge": "Fast responder" if meets_commitment else None,
    }


def update_dealer_sla(dealer, data):
    enabled = bool(data.get("enabled", dealer.response_sla_enabled))
    minutes = int(data.get("minutes", dealer.response_sla_minutes or 1440))
    if minutes < 30 or minutes > 10080:
        raise ValueError("SLA must be between 30 minutes and 7 days.")

    dealer.response_sla_enabled = enabled
    dealer.response_sla_minutes = minutes
    db.session.commit()
    return get_dealer_sla_status(dealer)


def _format_sla_label(minutes):
    if minutes < 60:
        return f"{minutes} min"
    if minutes % 1440 == 0:
        days = minutes // 1440
        return f"{days} day" if days == 1 else f"{days} days"
    if minutes % 60 == 0:
        hours = minutes // 60
        return f"{hours} hr" if hours == 1 else f"{hours} hrs"
    return f"{minutes} min"


def get_dealer_sla_sample(dealer):
    """Return recent first-response samples for future admin/debug screens."""
    samples = []
    conversations = Conversation.query.filter_by(dealer_id=dealer.id).all()
    for conversation in conversations:
        first_dealer_message = (
            ChatMessage.query.filter_by(
                conversation_id=conversation.id,
                sender_id=dealer.id,
            )
            .order_by(ChatMessage.timestamp.asc())
            .first()
        )
        if not first_dealer_message:
            continue
        minutes = round(
            (first_dealer_message.timestamp - conversation.created_at).total_seconds()
            / 60
        )
        samples.append(
            {
                "conversation_id": conversation.id,
                "response_minutes": minutes,
                "within_sla": minutes <= (dealer.response_sla_minutes or 1440),
            }
        )
    return samples


def suggest_follow_up_time(stage):
    if stage == "buyer_viewed":
        return datetime.utcnow() + timedelta(hours=4)
    if stage == "question_received":
        return datetime.utcnow() + timedelta(hours=1)
    if stage == "offer_sent":
        return datetime.utcnow() + timedelta(hours=24)
    return None
