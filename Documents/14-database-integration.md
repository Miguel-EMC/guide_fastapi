# FastAPI Database Integration

## 1. Introduction to Database with FastAPI

### 1.1. Overview of Database Options

FastAPI is database-agnostic. You can use any database with appropriate drivers:

-   **Relational Databases:**
    -   SQLite (local, file-based)
    -   PostgreSQL (production-ready, robust)
    -   MySQL / MariaDB
-   **NoSQL Databases:**
    -   MongoDB (with ODMs like Beanie)
    -   Redis (for cache/session storage)

**Popular ORMs with FastAPI:**

-   SQLAlchemy (most widely used, powerful for relational databases)
-   Tortoise ORM (easy and async-friendly)
-   Peewee, Gino, Encode/databases (older or less maintained)

### 1.2. SQLAlchemy vs. Tortoise ORM vs. Others

| Feature           | SQLAlchemy 2.0+               | Tortoise ORM    | Others (Peewee, Gino) |
| :---------------- | :---------------------------- | :-------------- | :-------------------- |
| Sync & Async      | (full async support)          | (async native)  | Limited / old-style   |
| Community Support | Huge & active                 | Medium          | Small                 |
| Feature Rich      | Yes                           | Limited         | Basic                 |
| Migrations        | Alembic                       | Aerich          | Varies                |
| Production-Ready  | Highly recommended            | Good            | Some limitations      |

We'll use **SQLAlchemy 2.0+** (Declarative with async support) in this tutorial.

### 1.3. Setting up Database Connection

We'll use SQLite here (easy to start with). You can later switch to PostgreSQL or MySQL.

**Install dependencies:**

```bash
pip install "fastapi[all]" sqlalchemy aiosqlite
```

## 2. SQLAlchemy (v2.0) Integration

### 2.1. SQLAlchemy (v2.0) Models

**models.py**

```python
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, Integer

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50))
    email: Mapped[str] = mapped_column(String(100), unique=True)

    def __init__(self, name: str, email: str):
        self.name = name
        self.email = email
```

### 2.2. Setting up the Database & Sessions

**database.py**

```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from models import Base

DATABASE_URL = "sqlite+aiosqlite:///./test.db"

engine = create_async_engine(DATABASE_URL, echo=True)
async_session = async_sessionmaker(engine, expire_on_commit=False)

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
```

### 2.3. Dependency Injection with Database

**deps.py**

```python
from typing import AsyncGenerator
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from database import async_session

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session
```

### 2.4. Basic CRUD Operations

**main.py**

```python
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models import User
from database import init_db
from deps import get_db
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI()

# Run this once at startup
@app.on_event("startup")
async def on_startup():
    await init_db()

# Pydantic Schemas
class UserCreate(BaseModel):
    name: str
    email: str

class UserRead(BaseModel):
    id: int
    name: str
    email: str

    class Config:
        from_attributes = True

# Create user
@app.post("/users/", response_model=UserRead)
async def create_user(user: UserCreate, db: AsyncSession = Depends(get_db)):
    db_user = User(name=user.name, email=user.email)
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

# Read users
@app.get("/users/", response_model=List[UserRead])
async def get_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User))
    return result.scalars().all()

# Get user by ID
@app.get("/users/{user_id}", response_model=UserRead)
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# Delete user
@app.delete("/users/{user_id}")
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    await db.delete(user)
    await db.commit()
    return {"message": "User deleted"}
```

## Run the App

```bash
uvicorn main:app --reload
```

Then open: `http://localhost:8000/docs`

## Summary

You now have:

-   A FastAPI app
-   SQLAlchemy 2.0+ async setup
-   SQLite connection
-   CRUD operations with dependency injection