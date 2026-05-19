from extensions import db
from datetime import date
from models.car import Car
from models.car_image import CarImage
from models.car_request import CarRequest
from models.chat_message import ChatMessage
from models.conversation import Conversation
from models.dealer_bid import DealerBid
from models.dealer_point_request import DealerPointRequest
from models.notification import Notification
from models.point_transaction import PointTransaction
from models.request_question import RequestQuestion
from models.rental_listing import RentalListing
from models.trade_in import TradeInRequest
from models.user import User


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


def test_only_dealers_can_request_more_points(client):
    admin = create_user("points_admin", "points-admin@example.com", is_admin=True)
    buyer = create_user("points_buyer", "points-buyer@example.com")
    rental = create_user(
        "points_rental",
        "points-rental@example.com",
        is_rental_company=True,
    )
    dealer = create_user("points_dealer", "points-dealer@example.com", is_dealer=True)
    db.session.commit()

    for user in (admin, buyer, rental):
        response = client.post(
            "/dealer/api/points/request",
            headers=login_headers(client, user.username),
            json={"requested_points": 10},
        )
        assert response.status_code == 403
        assert response.get_json()["message"] == "Only dealers can request more points."

    response = client.post(
        "/dealer/api/points/request",
        headers=login_headers(client, dealer.username),
        json={"requested_points": 10, "reason": "Need to bid"},
    )

    assert response.status_code == 200
    assert DealerPointRequest.query.filter_by(dealer_id=dealer.id).count() == 1
    assert Notification.query.filter_by(user_id=admin.id, is_read=False).count() == 1


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
        == "Point requests can only be resolved for dealers."
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
    assert payload["pending_approval_count"] == 1
    assert payload["pending_approvals"][0]["id"] == pending_car.id
    assert len(payload["requests"]) == 1
    assert payload["requests"][0]["make"] == "Toyota"


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
    assert Notification.query.filter_by(user_id=buyer.id, is_read=False).count() == 1

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
