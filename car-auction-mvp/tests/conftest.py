import pytest

from app import create_app
from config import TestingConfig
from extensions import db


@pytest.fixture()
def app():
    app = create_app(TestingConfig)

    with app.app_context():
        import models  # noqa: F401

        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()
