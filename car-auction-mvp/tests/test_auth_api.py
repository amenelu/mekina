def test_api_ping(client):
    response = client.get("/auth/api/ping")

    assert response.status_code == 200
    assert response.get_json() == {"message": "pong"}


def test_api_register_and_login(client):
    register_response = client.post(
        "/auth/api/register",
        json={
            "username": "buyer",
            "email": "buyer@example.com",
            "phone_number": "0911000000",
            "password": "secret123",
            "password2": "secret123",
        },
    )

    assert register_response.status_code == 201
    assert register_response.get_json()["user_id"]

    login_response = client.post(
        "/auth/api/login",
        json={"login": "buyer", "password": "secret123"},
    )

    assert login_response.status_code == 200
    payload = login_response.get_json()
    assert payload["token"]
    assert payload["user"]["username"] == "buyer"
