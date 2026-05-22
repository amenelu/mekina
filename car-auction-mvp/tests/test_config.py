import pytest

from app import create_app
from config import ProductionConfig, StagingConfig


@pytest.mark.parametrize("config_class", (ProductionConfig, StagingConfig))
def test_deployed_config_requires_release_environment(monkeypatch, config_class):
    for name in ("SECRET_KEY", "DATABASE_URL", "CORS_ALLOWED_ORIGINS"):
        monkeypatch.delenv(name, raising=False)

    with pytest.raises(RuntimeError) as exc_info:
        create_app(config_class)

    message = str(exc_info.value)
    assert "SECRET_KEY" in message
    assert "DATABASE_URL" in message
    assert "CORS_ALLOWED_ORIGINS" in message


@pytest.mark.parametrize("config_class", (ProductionConfig, StagingConfig))
def test_deployed_config_accepts_required_release_environment(monkeypatch, config_class):
    monkeypatch.setenv("SECRET_KEY", "test-secret")
    monkeypatch.setenv("DATABASE_URL", "sqlite:///:memory:")
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", "https://web.example.test")

    app = create_app(config_class)

    assert app.config["SESSION_COOKIE_SECURE"] is True
    assert app.config["SQLALCHEMY_DATABASE_URI"] == "sqlite:///:memory:"
