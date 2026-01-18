# Testing FastAPI Applications

This guide covers pytest setup, TestClient, async testing, fixtures, mocking, and test organization.

## Installation

```bash
pip install pytest pytest-asyncio httpx
```

| Package | Purpose |
|---------|---------|
| `pytest` | Testing framework |
| `pytest-asyncio` | Async test support |
| `httpx` | Async HTTP client for testing |

## Project Structure

```
project/
├── app/
│   ├── main.py
│   └── ...
├── tests/
│   ├── __init__.py
│   ├── conftest.py       # Shared fixtures
│   ├── test_users.py
│   ├── test_auth.py
│   └── test_items.py
├── pytest.ini            # Pytest configuration
└── pyproject.toml
```

## Pytest Configuration

**pytest.ini**

```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_functions = test_*
asyncio_mode = auto
filterwarnings =
    ignore::DeprecationWarning
```

**pyproject.toml** (alternative)

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"
```

## TestClient Basics

### Synchronous Testing

```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello World"}


def test_create_item():
    response = client.post(
        "/items/",
        json={"name": "Test Item", "price": 9.99}
    )
    assert response.status_code == 201
    assert response.json()["name"] == "Test Item"


def test_read_item_not_found():
    response = client.get("/items/999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()
```

### Async Testing

```python
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_read_users():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        response = await client.get("/users/")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
```

## Fixtures

### conftest.py

```python
import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient, ASGITransport
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db

# Test database URL
TEST_DATABASE_URL = "sqlite:///:memory:"


@pytest.fixture(scope="session")
def engine():
    """Create test database engine."""
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session(engine):
    """Create a new database session for each test."""
    TestingSessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=engine
    )
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture
def client(db_session):
    """Test client with database override."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
async def async_client(db_session):
    """Async test client."""
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        yield client

    app.dependency_overrides.clear()
```

### User Fixtures

```python
@pytest.fixture
def test_user(db_session):
    """Create a test user."""
    from app.models.user import User
    from app.core.security import hash_password

    user = User(
        email="test@example.com",
        hashed_password=hash_password("testpassword"),
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(client, test_user):
    """Get authentication headers for test user."""
    response = client.post(
        "/auth/token",
        data={"username": "test@example.com", "password": "testpassword"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
```

## Testing Patterns

### Testing CRUD Operations

```python
# tests/test_items.py

def test_create_item(client, auth_headers):
    response = client.post(
        "/items/",
        json={"name": "New Item", "price": 19.99},
        headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "New Item"
    assert data["price"] == 19.99
    assert "id" in data


def test_read_items(client, auth_headers):
    # Create items first
    client.post("/items/", json={"name": "Item 1", "price": 10}, headers=auth_headers)
    client.post("/items/", json={"name": "Item 2", "price": 20}, headers=auth_headers)

    response = client.get("/items/", headers=auth_headers)
    assert response.status_code == 200
    assert len(response.json()) >= 2


def test_update_item(client, auth_headers):
    # Create item
    create_response = client.post(
        "/items/",
        json={"name": "Original", "price": 10},
        headers=auth_headers
    )
    item_id = create_response.json()["id"]

    # Update item
    response = client.put(
        f"/items/{item_id}",
        json={"name": "Updated", "price": 15},
        headers=auth_headers
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Updated"


def test_delete_item(client, auth_headers):
    # Create item
    create_response = client.post(
        "/items/",
        json={"name": "To Delete", "price": 10},
        headers=auth_headers
    )
    item_id = create_response.json()["id"]

    # Delete item
    response = client.delete(f"/items/{item_id}", headers=auth_headers)
    assert response.status_code == 204

    # Verify deleted
    response = client.get(f"/items/{item_id}", headers=auth_headers)
    assert response.status_code == 404
```

### Testing Authentication

```python
# tests/test_auth.py

def test_register_user(client):
    response = client.post(
        "/auth/register",
        json={
            "email": "newuser@example.com",
            "password": "strongpassword123"
        }
    )
    assert response.status_code == 201
    assert response.json()["email"] == "newuser@example.com"
    assert "password" not in response.json()


def test_login_success(client, test_user):
    response = client.post(
        "/auth/token",
        data={"username": "test@example.com", "password": "testpassword"}
    )
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert response.json()["token_type"] == "bearer"


def test_login_wrong_password(client, test_user):
    response = client.post(
        "/auth/token",
        data={"username": "test@example.com", "password": "wrongpassword"}
    )
    assert response.status_code == 401


def test_protected_route_no_token(client):
    response = client.get("/users/me")
    assert response.status_code == 401


def test_protected_route_with_token(client, auth_headers):
    response = client.get("/users/me", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["email"] == "test@example.com"
```

### Testing Validation

```python
# tests/test_validation.py

def test_create_item_invalid_price(client, auth_headers):
    response = client.post(
        "/items/",
        json={"name": "Item", "price": -10},  # Negative price
        headers=auth_headers
    )
    assert response.status_code == 422


def test_create_item_missing_field(client, auth_headers):
    response = client.post(
        "/items/",
        json={"name": "Item"},  # Missing price
        headers=auth_headers
    )
    assert response.status_code == 422
    assert "price" in str(response.json())


def test_create_item_invalid_type(client, auth_headers):
    response = client.post(
        "/items/",
        json={"name": "Item", "price": "not a number"},
        headers=auth_headers
    )
    assert response.status_code == 422
```

## Mocking

### Mocking External Services

```python
from unittest.mock import patch, AsyncMock

def test_send_email(client, auth_headers):
    with patch("app.services.email.send_email") as mock_send:
        mock_send.return_value = True

        response = client.post(
            "/users/forgot-password",
            json={"email": "test@example.com"}
        )

        assert response.status_code == 200
        mock_send.assert_called_once()


@pytest.mark.asyncio
async def test_external_api_call(async_client):
    with patch("app.services.external.fetch_data", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = {"data": "mocked"}

        response = await async_client.get("/external-data")

        assert response.status_code == 200
        assert response.json()["data"] == "mocked"
```

### Mocking Database

```python
from unittest.mock import MagicMock

def test_database_error_handling(client, auth_headers):
    with patch("app.services.items.get_items") as mock_get:
        mock_get.side_effect = Exception("Database connection failed")

        response = client.get("/items/", headers=auth_headers)

        assert response.status_code == 500
```

## Async Database Testing

### Async Fixtures

```python
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def async_engine():
    engine = create_async_engine(TEST_DATABASE_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def async_db_session(async_engine):
    async_session = async_sessionmaker(
        async_engine,
        expire_on_commit=False
    )
    async with async_session() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def async_client(async_db_session):
    async def override_get_db():
        yield async_db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        yield client

    app.dependency_overrides.clear()
```

### Async Tests

```python
@pytest.mark.asyncio
async def test_create_user_async(async_client):
    response = await async_client.post(
        "/users/",
        json={"email": "async@test.com", "password": "password123"}
    )
    assert response.status_code == 201


@pytest.mark.asyncio
async def test_get_users_async(async_client):
    response = await async_client.get("/users/")
    assert response.status_code == 200
```

## Test Organization

### Parametrized Tests

```python
import pytest

@pytest.mark.parametrize("email,password,expected_status", [
    ("valid@email.com", "validpass123", 201),
    ("invalid-email", "validpass123", 422),
    ("valid@email.com", "short", 422),
    ("", "validpass123", 422),
])
def test_register_validation(client, email, password, expected_status):
    response = client.post(
        "/auth/register",
        json={"email": email, "password": password}
    )
    assert response.status_code == expected_status
```

### Test Classes

```python
class TestUserEndpoints:
    def test_create_user(self, client):
        response = client.post("/users/", json={"email": "new@test.com", "password": "pass123"})
        assert response.status_code == 201

    def test_get_user(self, client, test_user, auth_headers):
        response = client.get(f"/users/{test_user.id}", headers=auth_headers)
        assert response.status_code == 200

    def test_update_user(self, client, test_user, auth_headers):
        response = client.patch(
            f"/users/{test_user.id}",
            json={"email": "updated@test.com"},
            headers=auth_headers
        )
        assert response.status_code == 200
```

## Running Tests

```bash
# Run all tests
pytest

# Run with verbose output
pytest -v

# Run specific file
pytest tests/test_users.py

# Run specific test
pytest tests/test_users.py::test_create_user

# Run with coverage
pip install pytest-cov
pytest --cov=app --cov-report=html

# Run only async tests
pytest -m asyncio

# Run tests in parallel
pip install pytest-xdist
pytest -n auto
```

## Coverage Report

```bash
pytest --cov=app --cov-report=term-missing --cov-report=html
```

```
----------- coverage: -----------
Name                    Stmts   Miss  Cover   Missing
-----------------------------------------------------
app/main.py                15      0   100%
app/routers/users.py       45      3    93%   78-80
app/services/user.py       30      2    93%   45, 67
-----------------------------------------------------
TOTAL                      90      5    94%
```

## Best Practices

| Practice | Description |
|----------|-------------|
| Isolate tests | Each test should be independent |
| Use fixtures | Share setup code efficiently |
| Test edge cases | Empty inputs, boundaries, errors |
| Mock external services | Don't hit real APIs in tests |
| Use meaningful names | `test_create_user_with_invalid_email` |
| Keep tests fast | Aim for < 1 second per test |

## Summary

| Component | Purpose |
|-----------|---------|
| `TestClient` | Sync testing |
| `AsyncClient` | Async testing |
| `conftest.py` | Shared fixtures |
| `pytest.mark.asyncio` | Mark async tests |
| `dependency_overrides` | Override dependencies |
| `pytest-cov` | Coverage reports |

## References

- [FastAPI Testing Documentation](https://fastapi.tiangolo.com/tutorial/testing/)
- [pytest Documentation](https://docs.pytest.org/)
- [pytest-asyncio](https://pytest-asyncio.readthedocs.io/)
- [HTTPX Documentation](https://www.python-httpx.org/)

## Next Steps

- [Deployment](./15-deployment.md) - Deploy to production
- [Project: Todo API](./16-project-todo.md) - Complete project example

---

[Previous: Architecture](./13-architecture.md) | [Back to Index](./README.md) | [Next: Deployment](./15-deployment.md)
