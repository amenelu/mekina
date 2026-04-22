import os
from dotenv import load_dotenv

load_dotenv()

basedir = os.path.abspath(os.path.dirname(__file__))


def _env_bool(name, default=False):
    return os.environ.get(name, str(default)).lower() in ("true", "1", "t", "yes")


class Config:
    """Base Flask configuration."""

    SECRET_KEY = os.environ.get("SECRET_KEY") or "dev-only-change-me"
    FLASK_APP = os.environ.get("FLASK_APP", "app.py")
    FLASK_DEBUG = _env_bool("FLASK_DEBUG", False)
    TESTING = False

    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL") or "sqlite:///" + os.path.join(
        basedir, "database.db"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    MAX_CONTENT_LENGTH = int(os.environ.get("MAX_CONTENT_LENGTH", 16 * 1024 * 1024))
    JWT_EXPIRATION_DAYS = int(os.environ.get("JWT_EXPIRATION_DAYS", 30))

    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = os.environ.get("SESSION_COOKIE_SAMESITE", "Lax")
    SESSION_COOKIE_SECURE = _env_bool("SESSION_COOKIE_SECURE", False)


class DevelopmentConfig(Config):
    FLASK_DEBUG = True


class TestingConfig(Config):
    TESTING = True
    WTF_CSRF_ENABLED = False
    SQLALCHEMY_DATABASE_URI = os.environ.get("TEST_DATABASE_URL", "sqlite:///:memory:")


class ProductionConfig(Config):
    SESSION_COOKIE_SECURE = True

    if not os.environ.get("SECRET_KEY"):
        raise RuntimeError("SECRET_KEY must be set in production.")


config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
    "default": Config,
}
