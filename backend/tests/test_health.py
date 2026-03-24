"""Basic smoke tests to verify the app initializes correctly."""


def test_app_imports():
    """Verify the FastAPI app can be imported without errors."""
    from app.main import app

    assert app is not None
    assert app.title == "IntDesignERP"


def test_config_loads():
    """Verify settings load with defaults."""
    from app.core.config import settings

    assert settings.ALGORITHM == "HS256"
    assert settings.ACCESS_TOKEN_EXPIRE_MINUTES > 0
    assert settings.REFRESH_TOKEN_EXPIRE_DAYS > 0


def test_routes_registered():
    """Verify all major API route groups are registered."""
    from app.main import app

    route_paths = [r.path for r in app.routes]

    # Check key API prefixes exist
    assert any("/api/v1/auth" in p for p in route_paths)
    assert any("/api/v1/crm" in p for p in route_paths)
    assert any("/api/v1/quotes" in p for p in route_paths)
    assert any("/api/v1/projects" in p for p in route_paths)
    assert any("/api/v1/inventory" in p for p in route_paths)
    assert any("/api/v1/finance" in p for p in route_paths)
    assert any("/api/v1/labor" in p for p in route_paths)
    assert any("/api/v1/notifications" in p for p in route_paths)


def test_health_endpoint_exists():
    """Verify /health endpoint is registered."""
    from app.main import app

    route_paths = [r.path for r in app.routes]
    assert "/health" in route_paths
