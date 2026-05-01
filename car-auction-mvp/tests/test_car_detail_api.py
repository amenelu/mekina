from extensions import db
from models.car import Car
from models.user import User


def test_api_car_detail_returns_basic_listing_payload(client, app):
    with app.app_context():
        owner = User(
            username="dealer",
            email="dealer@example.com",
            is_dealer=True,
        )
        owner.set_password("secret123")
        db.session.add(owner)
        db.session.flush()

        car = Car(
            make="Toyota",
            model="Corolla",
            year=2020,
            description="Clean sedan.",
            owner_id=owner.id,
            is_approved=True,
            is_active=True,
            condition="Used",
            transmission="Automatic",
            fuel_type="Gasoline",
        )
        db.session.add(car)
        db.session.commit()
        car_id = car.id

    response = client.get(f"/api/cars/{car_id}")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["car"]["make"] == "Toyota"
    assert payload["car"]["model"] == "Corolla"
    assert payload["car"]["description"] == "Clean sedan."
    assert "manufacturer_specs" not in payload["car"]
