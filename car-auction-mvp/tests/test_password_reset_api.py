from datetime import datetime, timedelta

from extensions import db
from models.password_reset_token import PasswordResetToken
from models.user import User


def _create_user(email="buyer@example.test", password="old-password"):
    user = User(username="buyer", email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return user


def test_password_reset_request_returns_generic_message_for_unknown_email(client):
    response = client.post(
        "/auth/api/password-reset/request",
        json={"email": "missing@example.test"},
    )

    assert response.status_code == 200
    assert "If an account exists" in response.get_json()["message"]


def test_password_reset_request_reports_missing_email_config_in_nonproduction(client):
    _create_user()

    response = client.post(
        "/auth/api/password-reset/request",
        json={"email": "buyer@example.test"},
    )

    assert response.status_code == 200
    data = response.get_json()
    assert data["email_sent"] is False
    assert "SMTP" in data["message"]


def test_password_reset_confirm_changes_password_and_uses_token_once(client):
    _create_user()

    request_response = client.post(
        "/auth/api/password-reset/request",
        json={"email": "buyer@example.test"},
    )
    assert request_response.status_code == 200

    reset_token = PasswordResetToken.query.one()
    raw_token = None
    # Tests should not depend on email delivery. Create a known token that maps
    # to the stored user and verifies the same confirm path.
    raw_token, known_token = PasswordResetToken.create_for_user(reset_token.user)
    reset_token.used_at = datetime.utcnow()
    db.session.add(known_token)
    db.session.commit()

    reset_response = client.post(
        "/auth/api/password-reset/confirm",
        json={
            "token": raw_token,
            "password": "new-password",
            "password2": "new-password",
        },
    )
    assert reset_response.status_code == 200

    old_login = client.post(
        "/auth/api/login",
        json={"login": "buyer@example.test", "password": "old-password"},
    )
    assert old_login.status_code == 401

    new_login = client.post(
        "/auth/api/login",
        json={"login": "buyer@example.test", "password": "new-password"},
    )
    assert new_login.status_code == 200

    second_use = client.post(
        "/auth/api/password-reset/confirm",
        json={
            "token": raw_token,
            "password": "another-password",
            "password2": "another-password",
        },
    )
    assert second_use.status_code == 400


def test_password_reset_confirm_rejects_expired_token(client):
    user = _create_user()
    raw_token, reset_token = PasswordResetToken.create_for_user(user)
    reset_token.expires_at = datetime.utcnow() - timedelta(minutes=1)
    db.session.add(reset_token)
    db.session.commit()

    response = client.post(
        "/auth/api/password-reset/confirm",
        json={
            "token": raw_token,
            "password": "new-password",
            "password2": "new-password",
        },
    )

    assert response.status_code == 400
    assert "invalid or expired" in response.get_json()["message"]


def test_authenticated_user_can_change_password(client):
    _create_user()
    login_response = client.post(
        "/auth/api/login",
        json={"login": "buyer@example.test", "password": "old-password"},
    )
    token = login_response.get_json()["token"]

    response = client.post(
        "/auth/api/change-password",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "current_password": "old-password",
            "new_password": "new-password",
            "new_password2": "new-password",
        },
    )

    assert response.status_code == 200

    old_login = client.post(
        "/auth/api/login",
        json={"login": "buyer@example.test", "password": "old-password"},
    )
    assert old_login.status_code == 401

    new_login = client.post(
        "/auth/api/login",
        json={"login": "buyer@example.test", "password": "new-password"},
    )
    assert new_login.status_code == 200


def test_change_password_requires_current_password(client):
    _create_user()
    login_response = client.post(
        "/auth/api/login",
        json={"login": "buyer@example.test", "password": "old-password"},
    )
    token = login_response.get_json()["token"]

    response = client.post(
        "/auth/api/change-password",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "current_password": "wrong-password",
            "new_password": "new-password",
            "new_password2": "new-password",
        },
    )

    assert response.status_code == 401
