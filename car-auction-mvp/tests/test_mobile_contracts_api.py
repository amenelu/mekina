from datetime import datetime, timedelta

from extensions import db
from models.auction import Auction
from models.car import Car
from models.car_image import CarImage
from models.rental_listing import RentalListing
from models.user import User


def create_user(username, email, **kwargs):
    user = User(username=username, email=email, **kwargs)
    user.set_password("secret123")
    db.session.add(user)
    db.session.flush()
    return user


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


def login_headers(client, username, password="secret123"):
    response = client.post(
        "/auth/api/login",
        json={"login": username, "password": password},
    )

    assert response.status_code == 200
    token = response.get_json()["token"]
    return {"Authorization": f"Bearer {token}"}


def test_api_listings_limit_and_default_excludes_rentals(client):
    dealer = create_user("dealer", "dealer@example.com", is_dealer=True)
    rental_owner = create_user(
        "rentalco",
        "rental@example.com",
        is_rental_company=True,
    )

    newest_sale = create_car(
        dealer,
        listing_type="sale",
        model="Yaris",
        fixed_price=2_100_000,
    )
    older_sale = create_car(
        dealer,
        listing_type="sale",
        model="Vitz",
        fixed_price=1_600_000,
        is_featured=True,
    )
    rental_car = create_car(
        rental_owner,
        listing_type="rental",
        model="Rav4",
        fixed_price=None,
    )
    db.session.add(RentalListing(car_id=rental_car.id, price_per_day=9500, is_available=True))
    db.session.commit()

    response = client.get("/api/listings?limit=1")

    assert response.status_code == 200
    payload = response.get_json()
    assert isinstance(payload, list)
    assert len(payload) == 1

    listing = payload[0]
    assert listing["id"] == older_sale.id
    assert listing["listing_type"] != "rental"
    assert listing["price_display"] == "1,600,000 ETB"
    assert listing["image_url"].endswith("/static/uploads/test-car.jpg")
    assert listing["detail_url"].endswith(f"/car/{older_sale.id}")
    assert listing["owner_role"] == "Dealer"

    assert newest_sale.id != rental_car.id


def test_api_listings_rental_shape_for_mobile(client):
    rental_owner = create_user(
        "rentowner",
        "rentowner@example.com",
        is_rental_company=True,
    )
    rental_car = create_car(
        rental_owner,
        listing_type="rental",
        make="Suzuki",
        model="Jimny",
        fixed_price=None,
    )
    db.session.add(
        RentalListing(car_id=rental_car.id, price_per_day=7200, is_available=True)
    )
    db.session.commit()

    response = client.get("/api/listings?listing_type=rental")

    assert response.status_code == 200
    payload = response.get_json()
    assert "rentals" in payload
    assert len(payload["rentals"]) == 1

    listing = payload["rentals"][0]
    assert listing["id"] == rental_car.id
    assert listing["listing_type"] == "rental"
    assert listing["price_display"] == "7,200 ETB/day"
    assert listing["time_left"] == ""
    assert listing["detail_url"].endswith(f"/rentals/{rental_car.id}")
    assert listing["owner_role"] == "Rental"


def test_api_compare_returns_mobile_friendly_fields(client):
    dealer = create_user("comparedealer", "comparedealer@example.com", is_dealer=True)
    sale_car = create_car(
        dealer,
        listing_type="sale",
        model="Hilux",
        year=2019,
        mileage=65000,
        fixed_price=2_700_000,
    )
    auction_car = create_car(
        dealer,
        listing_type="auction",
        model="Prado",
        year=2022,
        mileage=18000,
        fixed_price=None,
    )
    db.session.add(
        Auction(
            car_id=auction_car.id,
            start_time=datetime.utcnow() - timedelta(days=1),
            end_time=datetime.utcnow() + timedelta(days=2),
            start_price=3_000_000,
            current_price=3_250_000,
        )
    )
    db.session.commit()

    response = client.get(f"/api/compare?ids={sale_car.id},{auction_car.id}")

    assert response.status_code == 200
    payload = response.get_json()
    assert len(payload["cars"]) == 2

    sale_payload, auction_payload = payload["cars"]
    assert sale_payload["id"] == sale_car.id
    assert sale_payload["price_display"] == "2,700,000 ETB"
    assert sale_payload["image_url"].endswith("/static/uploads/test-car.jpg")
    assert sale_payload["is_best_price"] is True

    assert auction_payload["id"] == auction_car.id
    assert auction_payload["price_display"] == "3,250,000 ETB"
    assert auction_payload["is_best_year"] is True

    best_values = payload["best_values"]
    assert best_values["price"]["value"] == 2700000
    assert best_values["price"]["ids"] == [sale_car.id]
    assert best_values["year"]["value"] == 2022
    assert best_values["year"]["ids"] == [auction_car.id]
    assert best_values["mileage"]["value"] == 18000
    assert best_values["mileage"]["ids"] == [auction_car.id]


def test_trade_in_api_requires_token(client):
    response = client.post(
        "/trade-in/api",
        json={
            "make": "Toyota",
            "model": "Vitz",
            "year": 2016,
            "mileage": 90000,
            "condition": "Good",
            "images": ["data:image/jpeg;base64,ZmFrZQ=="],
        },
    )

    assert response.status_code == 401
    assert response.get_json()["message"] == "Token is missing!"


def test_trade_in_api_accepts_valid_authenticated_payload(client):
    user = create_user("tradebuyer", "tradebuyer@example.com")
    db.session.commit()
    headers = login_headers(client, user.username)

    response = client.post(
        "/trade-in/api",
        headers=headers,
        json={
            "make": "Honda",
            "model": "Fit",
            "year": 2015,
            "mileage": 110000,
            "condition": "Good",
            "targetCar": "Toyota Yaris",
            "comments": "Well maintained commuter.",
            "images": ["data:image/jpeg;base64,ZmFrZQ=="],
        },
    )

    assert response.status_code == 201
    payload = response.get_json()
    assert payload["status"] == "success"
    assert payload["request"]["make"] == "Honda"
    assert payload["request"]["offer_count"] == 0
    assert len(payload["request"]["photos"]) == 1


def test_api_listings_multi_word_search_requires_all_terms(client):
    dealer = create_user("searchdealer", "searchdealer@example.com", is_dealer=True)
    matching_car = create_car(
        dealer,
        listing_type="sale",
        make="Toyota",
        model="Corolla",
        fixed_price=2_000_000,
    )
    create_car(
        dealer,
        listing_type="sale",
        make="Toyota",
        model="Yaris",
        fixed_price=1_700_000,
    )
    create_car(
        dealer,
        listing_type="sale",
        make="Honda",
        model="Corolla",
        fixed_price=1_900_000,
    )
    db.session.commit()

    response = client.get("/api/listings?q=Toyota Corolla")

    assert response.status_code == 200
    payload = response.get_json()
    assert [listing["id"] for listing in payload] == [matching_car.id]
