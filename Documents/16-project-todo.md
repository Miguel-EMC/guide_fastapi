# Project: Todo List API

A complete Todo List API applying all concepts from this guide: authentication, CRUD, validation, testing, and production patterns.

## Features

- User registration and JWT authentication
- Create, read, update, delete todos
- Filter todos by status
- User-specific todos (data isolation)
- Complete test suite

## Project Structure

```
todo_api/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py
│   │   ├── database.py
│   │   └── security.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   └── todo.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   └── todo.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   └── todo.py
│   └── routers/
│       ├── __init__.py
│       ├── auth.py
│       └── todos.py
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_auth.py
│   └── test_todos.py
├── .env
├── requirements.txt
└── Dockerfile
```

## Installation

**requirements.txt**

```
fastapi[standard]>=0.109.0
sqlalchemy>=2.0.0
aiosqlite>=0.19.0
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4
pydantic-settings>=2.0.0
pytest>=7.4.0
pytest-asyncio>=0.21.0
httpx>=0.25.0
```

```bash
pip install -r requirements.txt
```

## Core Configuration

### config.py

```python
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "Todo API"
    debug: bool = False

    # Database
    database_url: str = "sqlite+aiosqlite:///./todos.db"

    # JWT
    secret_key: str = "change-this-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    class Config:
        env_file = ".env"


@lru_cache
def get_settings():
    return Settings()


settings = get_settings()
```

### database.py

```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from contextlib import asynccontextmanager
from app.core.config import settings

engine = create_async_engine(settings.database_url, echo=settings.debug)
async_session = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with async_session() as session:
        yield session


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
```

### security.py

```python
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.config import settings
from app.core.database import get_db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    from app.models.user import User
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception
    return user
```

## Models

### user.py

```python
from sqlalchemy import String, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(200))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    todos: Mapped[list["Todo"]] = relationship(back_populates="owner", cascade="all, delete")
```

### todo.py

```python
from sqlalchemy import String, Boolean, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.core.database import Base


class Todo(Base):
    __tablename__ = "todos"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"))

    owner: Mapped["User"] = relationship(back_populates="todos")
```

## Schemas

### user.py

```python
from pydantic import BaseModel, EmailStr, ConfigDict


class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
```

### todo.py

```python
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional


class TodoCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None


class TodoUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    completed: Optional[bool] = None


class TodoResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    completed: bool
    created_at: datetime
    owner_id: int

    model_config = ConfigDict(from_attributes=True)
```

## Services

### user.py

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException
from app.models.user import User
from app.schemas.user import UserCreate
from app.core.security import hash_password


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def create_user(db: AsyncSession, user_data: UserCreate) -> User:
    existing = await get_user_by_email(db, user_data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=user_data.email,
        hashed_password=hash_password(user_data.password)
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
```

### todo.py

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException
from app.models.todo import Todo
from app.models.user import User
from app.schemas.todo import TodoCreate, TodoUpdate


async def get_todos(
    db: AsyncSession,
    user: User,
    completed: bool | None = None
) -> list[Todo]:
    query = select(Todo).where(Todo.owner_id == user.id)
    if completed is not None:
        query = query.where(Todo.completed == completed)
    query = query.order_by(Todo.created_at.desc())
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_todo(db: AsyncSession, todo_id: int, user: User) -> Todo:
    result = await db.execute(
        select(Todo).where(Todo.id == todo_id, Todo.owner_id == user.id)
    )
    todo = result.scalar_one_or_none()
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    return todo


async def create_todo(db: AsyncSession, todo_data: TodoCreate, user: User) -> Todo:
    todo = Todo(**todo_data.model_dump(), owner_id=user.id)
    db.add(todo)
    await db.commit()
    await db.refresh(todo)
    return todo


async def update_todo(
    db: AsyncSession,
    todo_id: int,
    todo_data: TodoUpdate,
    user: User
) -> Todo:
    todo = await get_todo(db, todo_id, user)
    for field, value in todo_data.model_dump(exclude_unset=True).items():
        setattr(todo, field, value)
    await db.commit()
    await db.refresh(todo)
    return todo


async def delete_todo(db: AsyncSession, todo_id: int, user: User) -> None:
    todo = await get_todo(db, todo_id, user)
    await db.delete(todo)
    await db.commit()
```

## Routers

### auth.py

```python
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import timedelta
from app.core.database import get_db
from app.core.security import verify_password, create_access_token, get_current_user
from app.core.config import settings
from app.schemas.user import UserCreate, UserResponse, Token
from app.services import user as user_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    return await user_service.create_user(db, user_data)


@router.post("/token", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    user = await user_service.get_user_by_email(db, form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    access_token = create_access_token(
        data={"sub": user.id},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes)
    )
    return Token(access_token=access_token)


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user = Depends(get_current_user)):
    return current_user
```

### todos.py

```python
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.todo import TodoCreate, TodoUpdate, TodoResponse
from app.services import todo as todo_service

router = APIRouter(prefix="/todos", tags=["Todos"])


@router.get("/", response_model=list[TodoResponse])
async def list_todos(
    completed: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await todo_service.get_todos(db, current_user, completed)


@router.post("/", response_model=TodoResponse, status_code=status.HTTP_201_CREATED)
async def create_todo(
    todo_data: TodoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await todo_service.create_todo(db, todo_data, current_user)


@router.get("/{todo_id}", response_model=TodoResponse)
async def get_todo(
    todo_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await todo_service.get_todo(db, todo_id, current_user)


@router.patch("/{todo_id}", response_model=TodoResponse)
async def update_todo(
    todo_id: int,
    todo_data: TodoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await todo_service.update_todo(db, todo_id, todo_data, current_user)


@router.delete("/{todo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_todo(
    todo_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await todo_service.delete_todo(db, todo_id, current_user)
```

## Main Application

### main.py

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import init_db
from app.core.config import settings
from app.routers import auth, todos


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title=settings.app_name,
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(todos.router)


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

## Tests

### conftest.py

```python
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.main import app
from app.core.database import Base, get_db

TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(bind=engine)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db_session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def auth_headers(client):
    # Register user
    client.post("/auth/register", json={
        "email": "test@example.com",
        "password": "testpassword"
    })
    # Login
    response = client.post("/auth/token", data={
        "username": "test@example.com",
        "password": "testpassword"
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
```

### test_todos.py

```python
def test_create_todo(client, auth_headers):
    response = client.post(
        "/todos/",
        json={"title": "Test Todo", "description": "Test description"},
        headers=auth_headers
    )
    assert response.status_code == 201
    assert response.json()["title"] == "Test Todo"
    assert response.json()["completed"] is False


def test_list_todos(client, auth_headers):
    client.post("/todos/", json={"title": "Todo 1"}, headers=auth_headers)
    client.post("/todos/", json={"title": "Todo 2"}, headers=auth_headers)

    response = client.get("/todos/", headers=auth_headers)
    assert response.status_code == 200
    assert len(response.json()) == 2


def test_complete_todo(client, auth_headers):
    create_response = client.post(
        "/todos/",
        json={"title": "Complete me"},
        headers=auth_headers
    )
    todo_id = create_response.json()["id"]

    response = client.patch(
        f"/todos/{todo_id}",
        json={"completed": True},
        headers=auth_headers
    )
    assert response.status_code == 200
    assert response.json()["completed"] is True


def test_delete_todo(client, auth_headers):
    create_response = client.post(
        "/todos/",
        json={"title": "Delete me"},
        headers=auth_headers
    )
    todo_id = create_response.json()["id"]

    response = client.delete(f"/todos/{todo_id}", headers=auth_headers)
    assert response.status_code == 204
```

## Running the Project

```bash
# Run development server
uvicorn app.main:app --reload

# Run tests
pytest -v

# Run with coverage
pytest --cov=app
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/token` | Login and get token |
| GET | `/auth/me` | Get current user |
| GET | `/todos/` | List all todos |
| POST | `/todos/` | Create todo |
| GET | `/todos/{id}` | Get specific todo |
| PATCH | `/todos/{id}` | Update todo |
| DELETE | `/todos/{id}` | Delete todo |

## Summary

This project demonstrates:

- JWT authentication
- Async SQLAlchemy with proper session management
- Schema-Service-Router pattern
- Pydantic validation
- Dependency injection
- User data isolation
- Complete test coverage
- Modern lifespan events

## References

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy Async](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html)
- [Pydantic V2](https://docs.pydantic.dev/latest/)

---

[Previous: Deployment](./15-deployment.md) | [Back to Index](./README.md)
