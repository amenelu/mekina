from extensions import db
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


def test_admin_can_generate_temporary_password(client):
    admin = create_user("admin", "admin@example.test", is_admin=True)
    buyer = create_user("buyer", "buyer@example.test")
    db.session.commit()

    response = client.post(
        f"/admin/api/users/{buyer.id}/password-reset",
        headers=login_headers(client, admin.username),
    )

    assert response.status_code == 200
    temporary_password = response.get_json()["temporary_password"]
    assert temporary_password
    assert len(temporary_password) >= 14

    old_login = client.post(
        "/auth/api/login",
        json={"login": buyer.username, "password": "secret123"},
    )
    assert old_login.status_code == 401

    new_login = client.post(
        "/auth/api/login",
        json={"login": buyer.username, "password": temporary_password},
    )
    assert new_login.status_code == 200


def test_non_admin_cannot_generate_temporary_password(client):
    buyer = create_user("buyer", "buyer@example.test")
    other = create_user("other", "other@example.test")
    db.session.commit()

    response = client.post(
        f"/admin/api/users/{buyer.id}/password-reset",
        headers=login_headers(client, other.username),
    )

    assert response.status_code == 403


def test_admin_cannot_reset_own_password_from_user_page(client):
    admin = create_user("admin", "admin@example.test", is_admin=True)
    db.session.commit()

    response = client.post(
        f"/admin/api/users/{admin.id}/password-reset",
        headers=login_headers(client, admin.username),
    )

    assert response.status_code == 403
