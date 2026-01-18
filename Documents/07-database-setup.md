# Database Setup & Configuration

This guide covers SQLAlchemy integration, database connection management, and dependency injection in FastAPI.

## Overview

FastAPI is database-agnostic. You can use any database with appropriate drivers.

### Popular Choices

| Database | ORM | Use Case |
|----------|-----|----------|
| SQLite | SQLAlchemy | Development, small apps |
| PostgreSQL | SQLAlchemy, SQLModel | Production |
| MySQL | SQLAlchemy | Production |
| MongoDB | Motor, Beanie | NoSQL apps |

### ORM Comparison

| Feature | SQLAlchemy 2.0+ | SQLModel | Tortoise ORM |
|---------|----------------|----------|--------------|
| Async Support | Full | Full | Native |
| Community | Large | Growing | Medium |
| Type Safety | Good | Excellent | Good |
| Migrations | Alembic | Alembic | Aerich |

## Project Structure

```
project/
├── app/
│   ├── core/
│   │   ├── database.py    # Database connection
│   │   └── config.py      # Configuration
│   ├── models/
│   │   └── user.py        # Database models
│   ├── schemas/
│   │   └── user.py        # Pydantic schemas
│   └── main.py
├── .env                   # Environment variables
└── requirements.txt
```

## SQLAlchemy Setup

### Installation

```bash
pip install fastapi sqlalchemy aiosqlite
# For PostgreSQL: pip install asyncpg
# For MySQL: pip install aiomysql
```

### Database Configuration

**database.py**

```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

# SQLite (development)
DATABASE_URL = "sqlite+aiosqlite:///./app.db"

# PostgreSQL (production)
# DATABASE_URL = "postgresql+asyncpg://user:password@localhost/dbname"

engine = create_async_engine(DATABASE_URL, echo=True)
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

### Environment Variables

**.env**

```env
DATABASE_URL=sqlite+aiosqlite:///./app.db
# DATABASE_URL=postgresql+asyncpg://user:password@localhost/dbname
```

**config.py**

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///./app.db"

    class Config:
        env_file = ".env"


settings = Settings()
```

## Defining Models

### SQLAlchemy 2.0 Style

```python
from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50))
    email: Mapped[str] = mapped_column(String(100), unique=True, index=True)

    # Relationship
    items: Mapped[list["Item"]] = relationship(back_populates="owner")


class Item(Base):
    __tablename__ = "items"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(100), index=True)
    description: Mapped[str | None] = mapped_column(String(500))
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"))

    owner: Mapped["User"] = relationship(back_populates="items")
```

## Pydantic Schemas

```python
from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional


# Base schema
class UserBase(BaseModel):
    name: str
    email: EmailStr


# Create schema
class UserCreate(UserBase):
    password: str


# Response schema
class UserResponse(UserBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


# Item schemas
class ItemBase(BaseModel):
    title: str
    description: Optional[str] = None


class ItemCreate(ItemBase):
    pass


class ItemResponse(ItemBase):
    id: int
    owner_id: int

    model_config = ConfigDict(from_attributes=True)
```

## Dependency Injection

### Database Session

```python
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db


@app.get("/users/")
async def read_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User))
    return result.scalars().all()
```

### Reusable Dependencies

```python
from typing import Annotated

# Create type alias
DbSession = Annotated[AsyncSession, Depends(get_db)]


@app.get("/users/")
async def read_users(db: DbSession):
    result = await db.execute(select(User))
    return result.scalars().all()
```

## Database Initialization

### Lifespan Events (Recommended)

The modern way to handle startup/shutdown in FastAPI:

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.core.database import init_db, engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: runs before accepting requests
    await init_db()
    print("Database initialized")
    yield
    # Shutdown: runs when application stops
    await engine.dispose()
    print("Database connections closed")


app = FastAPI(lifespan=lifespan)
```

> **Note**: The `@app.on_event("startup")` decorator is **deprecated** since FastAPI 0.103. Always use `lifespan` for new projects.

## Basic CRUD Operations

### Complete Example

```python
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db, init_db
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(lifespan=lifespan)


@app.post("/users/", response_model=UserResponse, status_code=201)
async def create_user(user: UserCreate, db: AsyncSession = Depends(get_db)):
    db_user = User(name=user.name, email=user.email)
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user


@app.get("/users/", response_model=list[UserResponse])
async def read_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User))
    return result.scalars().all()


@app.get("/users/{user_id}", response_model=UserResponse)
async def read_user(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.delete("/users/{user_id}", status_code=204)
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.delete(user)
    await db.commit()
```

## Synchronous Alternative

For simpler applications:

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

DATABASE_URL = "sqlite:///./app.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

## Best Practices

### Connection Management

```python
# Use connection pooling for production
engine = create_async_engine(
    DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True
)
```

### Error Handling

```python
from sqlalchemy.exc import IntegrityError

@app.post("/users/")
async def create_user(user: UserCreate, db: AsyncSession = Depends(get_db)):
    try:
        db_user = User(**user.model_dump())
        db.add(db_user)
        await db.commit()
        return db_user
    except IntegrityError:
        await db.rollback()
        raise HTTPException(400, "Email already exists")
```

### Indexing

```python
# Add indexes for frequently queried columns
email: Mapped[str] = mapped_column(String(100), unique=True, index=True)
```

## Summary

| Component | Purpose |
|-----------|---------|
| `engine` | Database connection |
| `async_session` | Session factory |
| `Base` | Model base class |
| `get_db` | Dependency for sessions |
| `Depends(get_db)` | Inject session into routes |

## Next Steps

- [CRUD Operations](./08-crud-operations.md) - Standard database patterns
- [Database Relationships](./09-database-relationships.md) - Model relationships

---

[Previous: Error Handling](./06-error-handling.md) | [Back to Index](./README.md) | [Next: CRUD Operations](./08-crud-operations.md)
