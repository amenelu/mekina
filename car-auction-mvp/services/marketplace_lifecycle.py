import os
from datetime import date, datetime, timedelta

from extensions import db
from models.car_request import CarRequest
from models.dealer_bid import DealerBid


REQUEST_EXPIRY_DAYS = int(os.environ.get("CAR_REQUEST_EXPIRY_DAYS", "30"))


def _now():
    return datetime.utcnow()


def _today(reference_time=None):
    return reference_time.date() if reference_time else date.today()


def expire_stale_requests(reference_time=None):
    """Soft-expire active requests that are too old to keep in dealer queues."""
    reference_time = reference_time or _now()
    cutoff = reference_time - timedelta(days=REQUEST_EXPIRY_DAYS)
    stale_requests = CarRequest.query.filter(
        CarRequest.status == "active",
        CarRequest.created_at < cutoff,
        CarRequest.accepted_bid_id.is_(None),
    ).all()

    for car_request in stale_requests:
        car_request.status = "expired"

    return len(stale_requests)


def expire_expired_bids(reference_time=None):
    """Soft-expire pending dealer bids after their valid-until date passes."""
    today = _today(reference_time)
    expired_bids = DealerBid.query.filter(
        DealerBid.status == "pending",
        DealerBid.valid_until < today,
    ).all()

    for bid in expired_bids:
        bid.status = "expired"

    return len(expired_bids)


def refresh_marketplace_lifecycle(commit=True, reference_time=None):
    """Apply request and offer expiry rules before business decisions are made."""
    expired_requests = expire_stale_requests(reference_time)
    expired_bids = expire_expired_bids(reference_time)

    if commit and (expired_requests or expired_bids):
        db.session.commit()

    return {
        "expired_requests": expired_requests,
        "expired_bids": expired_bids,
        "request_expiry_days": REQUEST_EXPIRY_DAYS,
    }


def bid_has_expired(bid, reference_time=None):
    return bid.status == "expired" or bid.valid_until < _today(reference_time)
