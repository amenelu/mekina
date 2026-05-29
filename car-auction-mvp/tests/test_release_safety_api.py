from extensions import db
from datetime import date
from models.car import Car
from models.car_image import CarImage
from models.car_request import CarRequest
from models.car_request_image import CarRequestImage
from models.chat_message import ChatMessage
from models.conversation import Conversation
from models.dealer_bid import DealerBid
from models.dealer_bid_image import DealerBidImage
from models.dealer_point_request import DealerPointRequest
from models.notification import Notification
from models.point_transaction import PointTransaction
from models.request_question import RequestQuestion
from models.rental_listing import RentalListing
from models.trade_in import TradeInRequest
from models.user import User
from models.user_favorite import UserFavorite


def create_user(username, email, **kwargs):
    user = User(username=username, email=email, **kwargs)
    user.set_password("secret123")
    db.session.add(user)
    db.session.flush()
    return user


def login_headers(client, username, password="secret123"):
    response = client.post(
        "/auth/api/login",
        json={"login": username, "password": password},
    )

    assert response.status_code == 200
    token = response.get_json()["token"]
    return {"Authorization": f"Bearer {token}"}


def create_car(owner, listing_type="sale", image_url="/static/uploads/test-car.jpg", **kwargs):
    defaults = {
        "make": "Toyota",
        "model": "Corolla",
        "year": 2020,
        "owner_id": owner.id,
        "is_approved": True,
        "is_active": True,
        "condition": "Used",
        "mileage": 45000,
        "fuel_type": "Petrol",
        "transmission": "Automatic",
        "body_type": "Sedan",
        "listing_type": listing_type,
        "fixed_price": 1_800_000 if listing_type == "sale" else None,
    }
    defaults.update(kwargs)

    car = Car(**defaults)
    db.session.add(car)
    db.session.flush()
    db.session.add(CarImage(car_id=car.id, image_url=image_url, order=0))
    db.session.flush()
    return car


def create_request_with_bid(buyer, dealer):
    car_request = CarRequest(
        make="Toyota",
        model="RAV4",
        min_year=2020,
        notes="Looking for a clean SUV.",
        user_id=buyer.id,
    )
    db.session.add(car_request)
    db.session.flush()

    bid = DealerBid(
        price=2_500_000,
        make="Toyota",
        model="RAV4",
        car_year=2021,
        mileage=32000,
        condition="Used",
        availability="In Stock",
        valid_until=date(2026, 12, 31),
        dealer_id=dealer.id,
        request_id=car_request.id,
        message="Available for inspection.",
    )
    db.session.add(bid)
    db.session.flush()
    return car_request, bid


def test_admin_api_rejects_non_admin_roles(client):
    buyer = create_user("buyer_role", "buyer-role@example.com")
    dealer = create_user("dealer_role", "dealer-role@example.com", is_dealer=True)
    rental = create_user(
        "rental_role",
        "rental-role@example.com",
        is_rental_company=True,
    )
    db.session.commit()

    for user in (buyer, dealer, rental):
        response = client.get(
            "/admin/api/dashboard",
            headers=login_headers(client, user.username),
        )
        assert response.status_code == 403
        assert response.get_json()["message"] == "Admin access required!"


def test_dealer_and_rental_apis_reject_wrong_roles(client):
    buyer = create_user("buyer_wrong_role", "buyer-wrong@example.com")
    dealer = create_user("dealer_ok", "dealer-ok@example.com", is_dealer=True)
    rental = create_user(
        "rental_ok",
        "rental-ok@example.com",
        is_rental_company=True,
    )
    db.session.commit()

    buyer_headers = login_headers(client, buyer.username)
    dealer_headers = login_headers(client, dealer.username)
    rental_headers = login_headers(client, rental.username)

    assert client.get("/dealer/api/dashboard", headers=buyer_headers).status_code == 403
    assert client.get("/dealer/api/dashboard", headers=rental_headers).status_code == 403

    assert client.get("/seller/api/rental-dashboard", headers=buyer_headers).status_code == 403
    assert client.get("/seller/api/rental-dashboard", headers=dealer_headers).status_code == 403


def test_dealer_reply_uses_target_conversation_for_message_limit(client):
    dealer = create_user("chat_dealer", "chat-dealer@example.com", is_dealer=True)
    buyer_one = create_user("chat_buyer_one", "chat-buyer-one@example.com")
    buyer_two = create_user("chat_buyer_two", "chat-buyer-two@example.com")
    car = create_car(dealer)
    db.session.flush()

    first_conversation = Conversation(
        car_id=car.id, buyer_id=buyer_one.id, dealer_id=dealer.id
    )
    second_conversation = Conversation(
        car_id=car.id, buyer_id=buyer_two.id, dealer_id=dealer.id
    )
    db.session.add_all([first_conversation, second_conversation])
    db.session.flush()

    for index in range(3):
        db.session.add(
            ChatMessage(
                conversation_id=first_conversation.id,
                sender_id=dealer.id,
                body=f"Used free dealer message {index}",
            )
        )
    db.session.commit()

    response = client.post(
        "/chat/send",
        json={
            "conversation_id": second_conversation.id,
            "car_id": car.id,
            "message": "This reply should go to the second buyer.",
        },
        headers=login_headers(client, dealer.username),
    )

    assert response.status_code == 200
    assert response.get_json()["status"] == "success"
    sent_message = (
        ChatMessage.query.filter_by(conversation_id=second_conversation.id)
        .order_by(ChatMessage.id.desc())
        .first()
    )
    assert sent_message is not None
    assert sent_message.sender_id == dealer.id
    assert sent_message.body == "This reply should go to the second buyer."


def test_buyer_message_limit_and_dealer_unlock_flow(client):
    dealer = create_user(
        "unlock_dealer", "unlock-dealer@example.com", is_dealer=True, points=2
    )
    buyer = create_user("unlock_buyer", "unlock-buyer@example.com")
    car = create_car(dealer)
    conversation = Conversation(car_id=car.id, buyer_id=buyer.id, dealer_id=dealer.id)
    db.session.add(conversation)
    db.session.flush()

    for index in range(3):
        db.session.add(
            ChatMessage(
                conversation_id=conversation.id,
                sender_id=buyer.id,
                body=f"Buyer message {index}",
                original_body=f"Buyer message {index}",
            )
        )
    db.session.commit()

    limited_response = client.post(
        "/chat/send",
        json={
            "conversation_id": conversation.id,
            "car_id": car.id,
            "message": "Fourth buyer message should be blocked.",
        },
        headers=login_headers(client, buyer.username),
    )

    assert limited_response.status_code == 200
    assert limited_response.get_json()["status"] == "limit_reached"
    assert limited_response.get_json()["free_message_limit"] == 3

    dealer_reply_response = client.post(
        "/chat/send",
        json={
            "conversation_id": conversation.id,
            "car_id": car.id,
            "message": "Dealer can still reply before unlock.",
        },
        headers=login_headers(client, dealer.username),
    )

    assert dealer_reply_response.status_code == 200
    assert dealer_reply_response.get_json()["status"] == "success"

    unlock_response = client.post(
        f"/dealer/api/messages/{conversation.id}/unlock",
        headers=login_headers(client, dealer.username),
    )

    assert unlock_response.status_code == 200
    unlock_data = unlock_response.get_json()
    assert unlock_data["status"] == "success"
    assert unlock_data["dealer_points"] == 1
    assert unlock_data["conversation"]["is_unlocked"] is True
    assert PointTransaction.query.filter_by(
        user_id=dealer.id, amount=-1, transaction_type="unlock_chat"
    ).first()

    unlocked_response = client.post(
        "/chat/send",
        json={
            "conversation_id": conversation.id,
            "car_id": car.id,
            "message": "Buyer can continue after unlock.",
        },
        headers=login_headers(client, buyer.username),
    )

    assert unlocked_response.status_code == 200
    assert unlocked_response.get_json()["status"] == "success"


def test_specific_car_request_prefills_target_car_for_dealer_offer(client):
    dealer = create_user(
        "target_offer_dealer",
        "target-offer-dealer@example.com",
        is_dealer=True,
        points=2,
    )
    buyer = create_user("target_offer_buyer", "target-offer-buyer@example.com")
    car = create_car(
        dealer,
        make="Honda",
        model="Civic",
        year=2024,
        condition="New",
        mileage=0,
        fixed_price=2_700_000,
    )
    db.session.commit()

    response = client.post(
        "/requests/api/requests",
        json={
            "request_source": "specific",
            "target_car_id": car.id,
            "notes": "I am interested in this exact listing.",
        },
        headers=login_headers(client, buyer.username),
    )

    assert response.status_code == 201
    created_request = response.get_json()["request"]
    assert created_request["target_car_id"] == car.id
    assert created_request["target_car"]["make"] == "Honda"
    assert created_request["make"] == "Honda"
    assert created_request["model"] == "Civic"
    assert created_request["min_year"] == 2024

    dealer_response = client.get(
        f"/dealer/api/requests/{created_request['id']}/bids",
        headers=login_headers(client, dealer.username),
    )

    assert dealer_response.status_code == 200
    dealer_request = dealer_response.get_json()["car_request"]
    assert dealer_request["target_car"]["condition"] == "New"
    assert dealer_request["target_car"]["fixed_price"] == 2_700_000
    assert dealer_request["lead_quality"]["label"] in {"Medium", "High"}
    assert dealer_request["dealer_match"]["score"] > 0


def test_image_based_request_is_visible_to_dealer_with_images(client):
    dealer = create_user(
        "image_request_dealer",
        "image-request-dealer@example.com",
        is_dealer=True,
    )
    buyer = create_user("image_request_buyer", "image-request-buyer@example.com")
    image_request = CarRequest(
        user_id=buyer.id,
        notes="Please find this car from the photo.",
        request_source="image_based",
    )
    db.session.add_all([dealer, image_request])
    db.session.flush()
    db.session.add(
        CarRequestImage(
            request_id=image_request.id,
            image_url="/static/uploads/request-photo.jpg",
        )
    )
    db.session.commit()

    response = client.get(
        "/dealer/api/dashboard",
        headers=login_headers(client, dealer.username),
    )

    assert response.status_code == 200
    requests = response.get_json()["requests"]
    dealer_request = next(req for req in requests if req["id"] == image_request.id)
    assert dealer_request["request_source"] == "image_based"
    assert dealer_request["image_urls"]
    assert "request-photo.jpg" in dealer_request["image_urls"][0]

    details_response = client.get(
        f"/dealer/api/requests/{image_request.id}/bids",
        headers=login_headers(client, dealer.username),
    )
    assert details_response.status_code == 200
    details_request = details_response.get_json()["car_request"]
    assert details_request["request_source"] == "image_based"
    assert details_request["image_urls"]


def test_request_detail_returns_offer_ranking_and_lead_quality(client):
    buyer = create_user("rank_buyer", "rank-buyer@example.com")
    dealer = create_user("rank_dealer", "rank-dealer@example.com", is_dealer=True)
    car_request, bid = create_request_with_bid(buyer, dealer)
    db.session.commit()

    response = client.get(
        f"/requests/api/requests/{car_request.id}",
        headers=login_headers(client, buyer.username),
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["request"]["lead_quality"]["score"] > 0
    assert payload["bids"][0]["id"] == bid.id
    assert payload["bids"][0]["offer_rank"]["score"] > 0
    assert payload["bids"][0]["offer_rank"]["dealer_quality"]["score"] > 0
    assert payload["bids"][0]["is_best_deal"] is True


def test_compare_bids_includes_dealer_submitted_image(client):
    dealer = create_user("compare_image_dealer", "compare-image-dealer@example.com", is_dealer=True)
    buyer = create_user("compare_image_buyer", "compare-image-buyer@example.com")
    car_request = CarRequest(
        user_id=buyer.id,
        make="Toyota",
        model="Corolla",
        min_year=2021,
        notes="Need a clean sedan.",
    )
    db.session.add(car_request)
    db.session.flush()
    bid = DealerBid(
        price=2_100_000,
        make="Toyota",
        model="Corolla",
        car_year=2022,
        mileage=22000,
        condition="Used",
        availability="In Stock",
        valid_until=date(2026, 12, 31),
        dealer_id=dealer.id,
        request_id=car_request.id,
        message="Photo attached.",
    )
    db.session.add(bid)
    db.session.flush()
    db.session.add(
        DealerBidImage(
            dealer_bid_id=bid.id,
            image_url="/static/uploads/dealer-offer-photo.jpg",
        )
    )
    db.session.commit()

    response = client.get(
        f"/requests/api/bids/compare?ids={bid.id}",
        headers=login_headers(client, buyer.username),
    )

    assert response.status_code == 200
    compare_bid = response.get_json()["bids"][0]
    assert compare_bid["image_urls"]
    assert "dealer-offer-photo.jpg" in compare_bid["image_urls"][0]
    assert compare_bid["image_url"] == compare_bid["image_urls"][0]


def test_dealers_and_rentals_can_request_more_points(client):
    admin = create_user("points_admin", "points-admin@example.com", is_admin=True)
    buyer = create_user("points_buyer", "points-buyer@example.com")
    rental = create_user(
        "points_rental",
        "points-rental@example.com",
        is_rental_company=True,
    )
    dealer = create_user("points_dealer", "points-dealer@example.com", is_dealer=True)
    db.session.commit()

    for user in (admin, buyer):
        response = client.post(
            "/dealer/api/points/request",
            headers=login_headers(client, user.username),
            json={"requested_points": 10},
        )
        assert response.status_code == 403
        assert (
            response.get_json()["message"]
            == "Only dealers and rental companies can request more points."
        )

    response = client.post(
        "/dealer/api/points/request",
        headers=login_headers(client, dealer.username),
        json={"requested_points": 10, "reason": "Need to bid"},
    )

    assert response.status_code == 200
    assert DealerPointRequest.query.filter_by(dealer_id=dealer.id).count() == 1

    rental_response = client.post(
        "/dealer/api/points/request",
        headers=login_headers(client, rental.username),
        json={"requested_points": 6, "reason": "Need rental listing points"},
    )

    assert rental_response.status_code == 200
    assert DealerPointRequest.query.filter_by(dealer_id=rental.id).count() == 1
    assert Notification.query.filter_by(user_id=admin.id, is_read=False).count() == 2


def test_admin_accepting_point_request_grants_points_once(client):
    admin = create_user("accept_admin", "accept-admin@example.com", is_admin=True)
    dealer = create_user(
        "accept_dealer",
        "accept-dealer@example.com",
        is_dealer=True,
        points=5,
    )
    db.session.add(DealerPointRequest(dealer_id=dealer.id, requested_points=12))
    db.session.commit()

    headers = login_headers(client, admin.username)
    response = client.post(
        f"/admin/api/dealers/{dealer.id}/point-requests",
        headers=headers,
        json={"action": "accept"},
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["dealer_points"] == 17

    db.session.refresh(dealer)
    assert dealer.points == 17
    assert DealerPointRequest.query.filter_by(
        dealer_id=dealer.id,
        status="accepted",
    ).count() == 1
    assert PointTransaction.query.filter_by(
        user_id=dealer.id,
        amount=12,
        transaction_type="admin_point_request",
    ).count() == 1
    assert Notification.query.filter_by(user_id=dealer.id, is_read=False).count() == 1

    retry = client.post(
        f"/admin/api/dealers/{dealer.id}/point-requests",
        headers=headers,
        json={"action": "accept"},
    )
    assert retry.status_code == 404
    db.session.refresh(dealer)
    assert dealer.points == 17


def test_admin_denying_point_request_does_not_grant_points(client):
    admin = create_user("deny_admin", "deny-admin@example.com", is_admin=True)
    dealer = create_user(
        "deny_dealer",
        "deny-dealer@example.com",
        is_dealer=True,
        points=7,
    )
    db.session.add(DealerPointRequest(dealer_id=dealer.id, requested_points=9))
    db.session.commit()

    response = client.post(
        f"/admin/api/dealers/{dealer.id}/point-requests",
        headers=login_headers(client, admin.username),
        json={"action": "deny"},
    )

    assert response.status_code == 200
    db.session.refresh(dealer)
    assert dealer.points == 7
    assert DealerPointRequest.query.filter_by(
        dealer_id=dealer.id,
        status="denied",
    ).count() == 1
    assert PointTransaction.query.filter_by(user_id=dealer.id).count() == 0


def test_admin_accepting_rental_point_request_grants_points(client):
    admin = create_user("accept_rental_admin", "accept-rental-admin@example.com", is_admin=True)
    rental = create_user(
        "accept_rental",
        "accept-rental@example.com",
        is_rental_company=True,
        points=3,
    )
    db.session.add(DealerPointRequest(dealer_id=rental.id, requested_points=8))
    db.session.commit()

    response = client.post(
        f"/admin/api/dealers/{rental.id}/point-requests",
        headers=login_headers(client, admin.username),
        json={"action": "accept"},
    )

    assert response.status_code == 200
    db.session.refresh(rental)
    assert rental.points == 11
    assert DealerPointRequest.query.filter_by(
        dealer_id=rental.id,
        status="accepted",
    ).count() == 1


def test_point_request_resolution_validates_action_and_target_role(client):
    admin = create_user("resolve_admin", "resolve-admin@example.com", is_admin=True)
    buyer = create_user("resolve_buyer", "resolve-buyer@example.com")
    dealer = create_user("resolve_dealer", "resolve-dealer@example.com", is_dealer=True)
    db.session.commit()

    headers = login_headers(client, admin.username)

    invalid_action = client.post(
        f"/admin/api/dealers/{dealer.id}/point-requests",
        headers=headers,
        json={"action": "approve"},
    )
    assert invalid_action.status_code == 400
    assert invalid_action.get_json()["message"] == "Action must be accept or deny."

    invalid_target = client.post(
        f"/admin/api/dealers/{buyer.id}/point-requests",
        headers=headers,
        json={"action": "accept"},
    )
    assert invalid_target.status_code == 400
    assert (
        invalid_target.get_json()["message"]
        == "Point requests can only be resolved for dealers or rental companies."
    )


def test_admin_dashboard_counters_reflect_release_queues(client):
    admin = create_user("counter_admin", "counter-admin@example.com", is_admin=True)
    dealer = create_user("counter_dealer", "counter-dealer@example.com", is_dealer=True)
    rental = create_user(
        "counter_rental",
        "counter-rental@example.com",
        is_rental_company=True,
    )
    buyer = create_user("counter_buyer", "counter-buyer@example.com")
    create_car(dealer, listing_type="sale", is_approved=True)
    create_car(dealer, listing_type="sale", is_approved=False)
    rental_car = create_car(
        rental,
        listing_type="rental",
        fixed_price=None,
        is_approved=True,
    )
    db.session.add(RentalListing(car_id=rental_car.id, price_per_day=4000))
    db.session.add(
        TradeInRequest(
            user_id=buyer.id,
            make="Honda",
            model="Fit",
            year=2015,
            mileage=120000,
            condition="Good",
            status="pending",
        )
    )
    db.session.add(DealerPointRequest(dealer_id=dealer.id, requested_points=4))
    db.session.commit()

    response = client.get(
        "/admin/api/dashboard",
        headers=login_headers(client, admin.username),
    )

    assert response.status_code == 200
    stats = response.get_json()["stats"]
    assert stats["user_count"] == 4
    assert stats["for_sale_count"] == 1
    assert stats["for_rent_count"] == 1
    assert stats["pending_approval_count"] == 1
    assert stats["pending_trade_in_count"] == 1
    assert stats["pending_point_request_count"] == 1

    analytics = response.get_json()["analytics"]
    groups = {group["title"]: group for group in analytics["groups"]}
    assert {
        "Users",
        "Requests & Offers",
        "Deals",
        "Points",
        "Dealer Analytics",
        "Messages",
        "Inventory",
        "Trade-ins",
    }.issubset(groups.keys())

    users_metrics = {
        metric["label"]: metric["value"] for metric in groups["Users"]["metrics"]
    }
    assert users_metrics["Total users"] == 4
    assert users_metrics["Buyers"] == 1
    assert users_metrics["Dealers"] == 1
    assert users_metrics["Rental companies"] == 1

    points_metrics = {
        metric["label"]: metric["value"] for metric in groups["Points"]["metrics"]
    }
    assert points_metrics["Pending point requests"] == 1
    assert points_metrics["Pending requested points"] == 4

    dealer_analytics = groups["Dealer Analytics"]
    dealer_metrics = {
        metric["label"]: metric["value"] for metric in dealer_analytics["metrics"]
    }
    assert dealer_metrics["Registered dealers"] == 1
    assert dealer_metrics["Dealers with active listings"] == 1

    dealer_breakdowns = {
        breakdown["title"]: breakdown["items"]
        for breakdown in dealer_analytics["breakdowns"]
    }
    assert (
        dealer_breakdowns["Dealers requesting the most points"][0]["label"]
        == dealer.username
    )
    assert dealer_breakdowns["Dealers requesting the most points"][0]["value"] == 4
    assert (
        dealer_breakdowns["Most active dealers - activity score"][0]["label"]
        == dealer.username
    )

    inventory_breakdowns = {
        breakdown["title"]: breakdown["items"]
        for breakdown in groups["Inventory"]["breakdowns"]
    }
    assert inventory_breakdowns["Body type"][0]["label"] == "Sedan"


def test_dealer_dashboard_returns_release_payload_for_dealers(client):
    buyer = create_user("dash_buyer", "dash-buyer@example.com")
    dealer = create_user(
        "dash_dealer",
        "dash-dealer@example.com",
        is_dealer=True,
        points=11,
    )
    db.session.add(
        CarRequest(
            user_id=buyer.id,
            make="Toyota",
            model="Rav4",
            status="active",
            notes="Need a clean SUV.",
        )
    )
    pending_car = create_car(dealer, is_approved=False)
    db.session.commit()

    response = client.get(
        "/dealer/api/dashboard",
        headers=login_headers(client, dealer.username),
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["user_points"] == 11
    assert payload["dealer_quality"]["score"] > 0
    assert payload["point_economy"]["current_points"] == 11
    assert payload["pending_approval_count"] == 1
    assert payload["pending_approvals"][0]["id"] == pending_car.id
    assert len(payload["requests"]) == 1
    assert payload["requests"][0]["make"] == "Toyota"
    assert payload["requests"][0]["lead_quality"]["score"] > 0
    assert payload["requests"][0]["dealer_match"]["score"] > 0


def test_dealer_advanced_analytics_locked_and_unlocked_states(client):
    locked_dealer = create_user(
        "analytics_locked",
        "analytics-locked@example.com",
        is_dealer=True,
    )
    unlocked_dealer = create_user(
        "analytics_unlocked",
        "analytics-unlocked@example.com",
        is_dealer=True,
    )
    db.session.add(
        PointTransaction(
            user_id=unlocked_dealer.id,
            amount=-5,
            transaction_type="bid_fee",
            description="Spent enough this week to unlock analytics.",
        )
    )
    db.session.commit()

    locked_response = client.get(
        "/dealer/api/analytics/advanced",
        headers=login_headers(client, locked_dealer.username),
    )
    assert locked_response.status_code == 200
    locked_payload = locked_response.get_json()
    assert locked_payload["is_locked"] is True
    assert locked_payload["threshold_week"] == 5

    unlocked_response = client.get(
        "/dealer/api/analytics/advanced",
        headers=login_headers(client, unlocked_dealer.username),
    )
    assert unlocked_response.status_code == 200
    unlocked_payload = unlocked_response.get_json()
    assert unlocked_payload["is_locked"] is False
    assert "market_demand" in unlocked_payload
    assert "inventory_performance" in unlocked_payload


def test_dealer_analytics_shows_most_liked_own_cars(client):
    dealer = create_user("liked_dealer", "liked-dealer@example.com", is_dealer=True)
    other_dealer = create_user(
        "other_liked_dealer",
        "other-liked-dealer@example.com",
        is_dealer=True,
    )
    buyer_one = create_user("liked_buyer_one", "liked-buyer-one@example.com")
    buyer_two = create_user("liked_buyer_two", "liked-buyer-two@example.com")

    most_liked = create_car(
        dealer,
        make="Toyota",
        model="RAV4",
        fixed_price=2_200_000,
        listing_type="sale",
    )
    less_liked = create_car(
        dealer,
        make="Honda",
        model="Civic",
        fixed_price=1_400_000,
        listing_type="sale",
    )
    other_dealer_car = create_car(
        other_dealer,
        make="Nissan",
        model="Patrol",
        fixed_price=3_000_000,
        listing_type="sale",
    )

    db.session.add_all(
        [
            UserFavorite(user_id=buyer_one.id, car_id=most_liked.id),
            UserFavorite(user_id=buyer_two.id, car_id=most_liked.id),
            UserFavorite(user_id=buyer_one.id, car_id=less_liked.id),
            UserFavorite(user_id=buyer_one.id, car_id=other_dealer_car.id),
        ]
    )
    db.session.commit()

    response = client.get(
        "/dealer/api/analytics/most-liked-cars",
        headers=login_headers(client, dealer.username),
    )

    assert response.status_code == 200
    cars = response.get_json()["most_liked_cars"]
    assert [car["id"] for car in cars] == [most_liked.id, less_liked.id]
    assert cars[0]["favorite_count"] == 2
    assert cars[1]["favorite_count"] == 1
    assert cars[0]["price_display"] == "2,200,000 ETB"


def test_admin_can_review_buyer_dealer_messages_with_original_text(client):
    admin = create_user("message_admin", "message-admin@example.com", is_admin=True)
    buyer = create_user("message_buyer", "message-buyer@example.com")
    dealer = create_user("message_dealer", "message-dealer@example.com", is_dealer=True)
    car = create_car(dealer, make="Toyota", model="Vitz", listing_type="sale")
    conversation = Conversation(car_id=car.id, buyer_id=buyer.id, dealer_id=dealer.id)
    db.session.add(conversation)
    db.session.flush()
    db.session.add_all(
        [
            ChatMessage(
                conversation_id=conversation.id,
                sender_id=buyer.id,
                body="Call me at [contact hidden]",
                original_body="Call me at 0911223344",
            ),
            ChatMessage(
                conversation_id=conversation.id,
                sender_id=dealer.id,
                body="I can help with this car.",
                original_body="I can help with this car.",
            ),
        ]
    )
    db.session.commit()

    headers = login_headers(client, admin.username)
    list_response = client.get("/admin/api/messages", headers=headers)
    assert list_response.status_code == 200
    conversations = list_response.get_json()["conversations"]
    assert conversations[0]["id"] == conversation.id
    assert conversations[0]["flagged_message_count"] == 1

    detail_response = client.get(
        f"/admin/api/messages/{conversation.id}", headers=headers
    )
    assert detail_response.status_code == 200
    messages = detail_response.get_json()["messages"]
    assert messages[0]["was_masked"] is True
    assert messages[0]["original_body"] == "Call me at 0911223344"
    assert messages[1]["was_masked"] is False


def test_non_admin_cannot_review_messages(client):
    buyer = create_user("message_regular", "message-regular@example.com")
    db.session.commit()

    response = client.get(
        "/admin/api/messages",
        headers=login_headers(client, buyer.username),
    )

    assert response.status_code == 403


def test_buyer_request_limit_endpoint_blocks_when_daily_limit_reached(client):
    buyer = create_user("limit_buyer", "limit-buyer@example.com")
    for index in range(3):
        db.session.add(
            CarRequest(
                make="Toyota",
                model=f"Rav4 {index}",
                user_id=buyer.id,
                status="active",
            )
        )
    db.session.commit()

    headers = login_headers(client, buyer.username)
    status_response = client.get("/requests/api/request-limit", headers=headers)

    assert status_response.status_code == 200
    status_payload = status_response.get_json()
    assert status_payload["limit"] == 3
    assert status_payload["used"] == 3
    assert status_payload["remaining"] == 0
    assert status_payload["can_create_request"] is False
    assert "daily limit" in status_payload["message"]

    create_response = client.post(
        "/requests/api/requests",
        headers=headers,
        json={"make": "Honda", "model": "CR-V"},
    )

    assert create_response.status_code == 429
    payload = create_response.get_json()
    assert payload["request_limit"]["remaining"] == 0
    assert payload["message"] == status_payload["message"]


def test_notification_and_unread_count_lifecycle(client):
    buyer = create_user("unread_buyer", "unread-buyer@example.com")
    dealer = create_user("unread_dealer", "unread-dealer@example.com", is_dealer=True)
    car = create_car(dealer)
    conversation = Conversation(car_id=car.id, buyer_id=buyer.id, dealer_id=dealer.id)
    db.session.add(conversation)
    db.session.flush()
    db.session.add(
        ChatMessage(
            conversation_id=conversation.id,
            sender_id=dealer.id,
            body="Still available?",
            is_read=False,
        )
    )
    db.session.add(Notification(user_id=buyer.id, message="New offer", is_read=False))
    db.session.commit()

    headers = login_headers(client, buyer.username)
    counts = client.get("/api/unread-counts", headers=headers)
    assert counts.status_code == 200
    assert counts.get_json() == {"unread_messages": 1, "unread_notifications": 1}

    notifications = client.get("/api/notifications", headers=headers)
    assert notifications.status_code == 200
    counts_after_notifications = client.get("/api/unread-counts", headers=headers)
    assert counts_after_notifications.get_json()["unread_notifications"] == 0
    assert counts_after_notifications.get_json()["unread_messages"] == 1

    conversation_detail = client.get(
        f"/api/my-messages/{conversation.id}",
        headers=headers,
    )
    assert conversation_detail.status_code == 200
    final_counts = client.get("/api/unread-counts", headers=headers)
    assert final_counts.get_json() == {"unread_messages": 0, "unread_notifications": 0}


def test_buyer_question_can_be_answered_by_dealer_api(client):
    buyer = create_user("qa_buyer", "qa-buyer@example.com")
    dealer = create_user("qa_dealer", "qa-dealer@example.com", is_dealer=True)
    car_request, bid = create_request_with_bid(buyer, dealer)
    db.session.commit()

    ask_response = client.post(
        f"/requests/api/bid/{bid.id}/ask",
        headers=login_headers(client, buyer.username),
        json={"question_text": "Is service history available?"},
    )
    assert ask_response.status_code == 201
    question = RequestQuestion.query.filter_by(dealer_bid_id=bid.id).one()
    assert question.answer_text is None
    assert Notification.query.filter_by(user_id=dealer.id, is_read=False).count() == 1

    dashboard_response = client.get(
        "/dealer/api/dashboard",
        headers=login_headers(client, dealer.username),
    )
    assert dashboard_response.status_code == 200
    unanswered = dashboard_response.get_json()["unanswered_request_questions"]
    assert len(unanswered) == 1
    assert unanswered[0]["id"] == question.id
    assert unanswered[0]["request_id"] == car_request.id
    assert unanswered[0]["bid_price"] == bid.price

    answer_response = client.post(
        f"/dealer/api/request-questions/{question.id}/answer",
        headers=login_headers(client, dealer.username),
        json={"answer_text": "Yes, full service records are available."},
    )
    assert answer_response.status_code == 200
    db.session.refresh(question)
    assert question.answer_text == "Yes, full service records are available."
    assert question.answered_at is not None
    buyer_notification = Notification.query.filter_by(
        user_id=buyer.id, is_read=False
    ).one()
    assert buyer_notification.link == f"/request/{car_request.id}?bid_id={bid.id}"

    unanswered_response = client.get(
        "/dealer/api/request-questions/unanswered",
        headers=login_headers(client, dealer.username),
    )
    assert unanswered_response.status_code == 200
    assert unanswered_response.get_json()["questions"] == []

    detail_response = client.get(
        f"/requests/api/requests/{car_request.id}",
        headers=login_headers(client, buyer.username),
    )
    assert detail_response.status_code == 200
    bid_payload = detail_response.get_json()["bids"][0]
    assert bid_payload["questions"][0]["answer_text"] == question.answer_text


def test_dealer_question_answer_api_rejects_wrong_roles(client):
    buyer = create_user("qa_wrong_buyer", "qa-wrong-buyer@example.com")
    dealer = create_user("qa_wrong_dealer", "qa-wrong-dealer@example.com", is_dealer=True)
    other_dealer = create_user(
        "qa_other_dealer",
        "qa-other-dealer@example.com",
        is_dealer=True,
    )
    _, bid = create_request_with_bid(buyer, dealer)
    question = RequestQuestion(
        question_text="Can I inspect it today?",
        user_id=buyer.id,
        dealer_bid_id=bid.id,
    )
    db.session.add(question)
    db.session.commit()

    buyer_response = client.post(
        f"/dealer/api/request-questions/{question.id}/answer",
        headers=login_headers(client, buyer.username),
        json={"answer_text": "Trying as buyer."},
    )
    assert buyer_response.status_code == 403

    other_dealer_response = client.post(
        f"/dealer/api/request-questions/{question.id}/answer",
        headers=login_headers(client, other_dealer.username),
        json={"answer_text": "Trying as another dealer."},
    )
    assert other_dealer_response.status_code == 403

    db.session.refresh(question)
    assert question.answer_text is None


def test_admin_listing_approval_and_delete_flow(client):
    admin = create_user("listing_admin", "listing-admin@example.com", is_admin=True)
    dealer = create_user("listing_dealer", "listing-dealer@example.com", is_dealer=True)
    car = create_car(dealer, is_approved=False)
    db.session.commit()

    headers = login_headers(client, admin.username)
    approve_response = client.post(
        f"/admin/api/listings/{car.id}",
        headers=headers,
        json={"action": "approve"},
    )

    assert approve_response.status_code == 200
    db.session.refresh(car)
    assert car.is_approved is True
    assert Notification.query.filter_by(user_id=dealer.id, is_read=False).count() == 1

    delete_response = client.delete(f"/admin/api/listings/{car.id}", headers=headers)
    assert delete_response.status_code == 200
    assert Car.query.get(car.id) is None


def test_admin_listing_edit_flow_updates_release_fields(client):
    admin = create_user("edit_admin", "edit-admin@example.com", is_admin=True)
    dealer = create_user("edit_dealer", "edit-dealer@example.com", is_dealer=True)
    car = create_car(dealer, make="Toyota", model="Vitz", year=2016, fixed_price=900000)
    db.session.commit()

    response = client.put(
        f"/admin/api/listings/{car.id}",
        headers=login_headers(client, admin.username),
        data={
            "make": "Honda",
            "model": "Fit",
            "year": "2018",
            "fixed_price": "1200000",
            "is_active": "false",
            "is_featured": "true",
        },
    )

    assert response.status_code == 200
    db.session.refresh(car)
    assert car.make == "Honda"
    assert car.model == "Fit"
    assert car.year == 2018
    assert car.fixed_price == 1200000
    assert car.is_active is False
    assert car.is_featured is True


def test_admin_listing_rejection_flow_deactivates_listing(client):
    admin = create_user("reject_admin", "reject-admin@example.com", is_admin=True)
    dealer = create_user(
        "reject_dealer",
        "reject-dealer@example.com",
        is_dealer=True,
    )
    car = create_car(dealer, is_approved=True, is_active=True)
    db.session.commit()

    response = client.post(
        f"/admin/api/listings/{car.id}",
        headers=login_headers(client, admin.username),
        json={"action": "reject"},
    )

    assert response.status_code == 200
    db.session.refresh(car)
    assert car.is_approved is False
    assert car.is_active is False
    assert Notification.query.filter_by(user_id=dealer.id, is_read=False).count() == 1


def test_rental_company_cannot_manage_another_company_listing(client):
    owner = create_user(
        "rental_owner",
        "rental-owner@example.com",
        is_rental_company=True,
    )
    other = create_user(
        "rental_other",
        "rental-other@example.com",
        is_rental_company=True,
    )
    rental_car = create_car(
        owner,
        listing_type="rental",
        fixed_price=None,
        is_approved=True,
    )
    db.session.add(RentalListing(car_id=rental_car.id, price_per_day=5000))
    db.session.commit()

    headers = login_headers(client, other.username)

    assert (
        client.get(f"/seller/api/rental-cars/{rental_car.id}", headers=headers).status_code
        == 403
    )
    assert (
        client.put(
            f"/seller/api/rental-cars/{rental_car.id}",
            headers=headers,
            json={"price_per_day": 6000},
        ).status_code
        == 403
    )
    assert (
        client.post(
            f"/seller/api/rental-cars/{rental_car.id}/toggle-active",
            headers=headers,
        ).status_code
        == 403
    )


def test_admin_list_apis_return_paginated_results(client):
    admin = create_user("page_admin", "page-admin@example.com", is_admin=True)
    for index in range(3):
        create_user(f"page_buyer_{index}", f"page-buyer-{index}@example.com")
        create_user(
            f"page_dealer_{index}",
            f"page-dealer-{index}@example.com",
            is_dealer=True,
        )

    rental_owner = create_user(
        "page_rental_owner",
        "page-rental-owner@example.com",
        is_rental_company=True,
        points=2,
    )
    db.session.add(
        DealerPointRequest(dealer_id=rental_owner.id, requested_points=5)
    )
    for index in range(3):
        rental_car = create_car(
            rental_owner,
            listing_type="rental",
            model=f"PageRental{index}",
            fixed_price=None,
        )
        db.session.add(RentalListing(car_id=rental_car.id, price_per_day=3000 + index))
    db.session.commit()

    headers = login_headers(client, admin.username)

    users = client.get(
        "/admin/api/users?q=page_buyer&page=1&per_page=2",
        headers=headers,
    ).get_json()
    assert len(users["users"]) == 2
    assert users["pagination"]["total"] == 3
    assert users["pagination"]["pages"] == 2
    assert users["pagination"]["has_next"] is True

    dealers = client.get(
        "/admin/api/dealers?q=page_dealer&page=1&per_page=2",
        headers=headers,
    ).get_json()
    assert len(dealers["dealers"]) == 2
    assert dealers["pagination"]["total"] == 3

    rental_companies = client.get(
        "/admin/api/dealers?q=page_rental_owner&page=1&per_page=2",
        headers=headers,
    ).get_json()
    assert len(rental_companies["dealers"]) == 1
    assert rental_companies["pagination"]["total"] == 1
    assert rental_companies["dealers"][0]["account_type"] == "Rental Company"
    assert rental_companies["dealers"][0]["activity_score"] == 3
    assert "3 active listings" in rental_companies["dealers"][0][
        "activity_score_detail"
    ]
    assert rental_companies["dealers"][0]["pending_point_request"][
        "requested_points"
    ] == 5

    rentals = client.get(
        "/admin/api/rentals?q=PageRental&page=1&per_page=2",
        headers=headers,
    ).get_json()
    assert len(rentals["cars"]) == 2
    assert rentals["pagination"]["total"] == 3

    listings = client.get(
        "/auctions/api/admin/listings?q=PageRental&page=1&per_page=2",
        headers=headers,
    ).get_json()
    assert len(listings["cars"]) == 2
    assert listings["pagination"]["total"] == 3
