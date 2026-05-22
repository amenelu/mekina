import os
from dotenv import load_dotenv

load_dotenv()

basedir = os.path.abspath(os.path.dirname(__file__))


def _env_bool(name, default=False):
    return os.environ.get(name, str(default)).lower() in ("true", "1", "t", "yes")


def _database_uri():
    uri = os.environ.get("DATABASE_URL")
    if not uri:
        return "sqlite:///" + os.path.join(basedir, "database.db")

    if uri == "sqlite:///:memory:":
        return uri

    if uri.startswith("sqlite:///") and not uri.startswith("sqlite:////"):
        path = uri.removeprefix("sqlite:///")
        if path and not os.path.isabs(path):
            return "sqlite:///" + os.path.join(basedir, path).replace("\\", "/")

    return uri


class Config:
    """Base Flask configuration."""

    SECRET_KEY = os.environ.get("SECRET_KEY") or "dev-only-change-me"
    FLASK_APP = os.environ.get("FLASK_APP", "app.py")
    FLASK_DEBUG = _env_bool("FLASK_DEBUG", False)
    TESTING = False

    SQLALCHEMY_DATABASE_URI = _database_uri()
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


class StagingConfig(ProductionConfig):
    """Staging should behave like production while using staging services."""


config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "staging": StagingConfig,
    "production": ProductionConfig,
    "default": Config,
}
