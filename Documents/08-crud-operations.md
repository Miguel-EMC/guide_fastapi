# CRUD Operations

This guide covers Create, Read, Update, Delete patterns, pagination, and transaction management in FastAPI.

## Standard CRUD Pattern

Every resource follows the same pattern:

| Operation | HTTP Method | Route | Status Code |
|-----------|-------------|-------|-------------|
| List | GET | `/resources` | 200 |
| Get One | GET | `/resources/{id}` | 200 |
| Create | POST | `/resources` | 201 |
| Update | PUT/PATCH | `/resources/{id}` | 200 |
| Delete | DELETE | `/resources/{id}` | 204 |

## Project Structure

```
app/
├── models/
│   └── book.py          # SQLAlchemy model
├── schemas/
│   └── book.py          # Pydantic schemas
├── services/
│   └── book.py          # Business logic
├── routers/
│   └── book.py          # API routes
└── main.py
```

## Defining Models

### SQLAlchemy Model

```python
# models/book.py
from sqlalchemy import String, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class Book(Base):
    __tablename__ = "books"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200), index=True)
    author: Mapped[str] = mapped_column(String(100))
    year: Mapped[int] = mapped_column(Integer)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
```

### Pydantic Schemas

```python
# schemas/book.py
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional


class BookBase(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    author: str = Field(min_length=1, max_length=100)
    year: int = Field(ge=0, le=2100)
    description: Optional[str] = Field(None, max_length=2000)


class BookCreate(BookBase):
    pass


class BookUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    author: Optional[str] = Field(None, min_length=1, max_length=100)
    year: Optional[int] = Field(None, ge=0, le=2100)
    description: Optional[str] = None


class BookResponse(BookBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
```

## Service Layer

```python
# services/book.py
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.models.book import Book
from app.schemas.book import BookCreate, BookUpdate


async def get_books(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100
) -> list[Book]:
    result = await db.execute(
        select(Book).offset(skip).limit(limit)
    )
    return list(result.scalars().all())


async def get_book_by_id(db: AsyncSession, book_id: int) -> Book | None:
    result = await db.execute(
        select(Book).where(Book.id == book_id)
    )
    return result.scalar_one_or_none()


async def create_book(db: AsyncSession, book_data: BookCreate) -> Book:
    book = Book(**book_data.model_dump())
    db.add(book)
    await db.commit()
    await db.refresh(book)
    return book


async def update_book(
    db: AsyncSession,
    book_id: int,
    book_data: BookUpdate
) -> Book:
    book = await get_book_by_id(db, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    # Only update provided fields
    update_data = book_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(book, field, value)

    await db.commit()
    await db.refresh(book)
    return book


async def delete_book(db: AsyncSession, book_id: int) -> None:
    book = await get_book_by_id(db, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    await db.delete(book)
    await db.commit()
```

## Router Layer

```python
# routers/book.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.book import BookCreate, BookUpdate, BookResponse
from app.services import book as book_service

router = APIRouter(prefix="/books", tags=["Books"])


@router.get("/", response_model=list[BookResponse])
async def list_books(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """List all books with pagination."""
    return await book_service.get_books(db, skip, limit)


@router.get("/{book_id}", response_model=BookResponse)
async def get_book(
    book_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific book by ID."""
    book = await book_service.get_book_by_id(db, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return book


@router.post("/", response_model=BookResponse, status_code=status.HTTP_201_CREATED)
async def create_book(
    book: BookCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new book."""
    return await book_service.create_book(db, book)


@router.put("/{book_id}", response_model=BookResponse)
async def update_book(
    book_id: int,
    book: BookUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update an existing book."""
    return await book_service.update_book(db, book_id, book)


@router.delete("/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_book(
    book_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete a book."""
    await book_service.delete_book(db, book_id)
```

## Pagination

### Basic Pagination

```python
@router.get("/")
async def list_items(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Item).offset(skip).limit(limit)
    )
    return result.scalars().all()
```

### Pagination with Total Count

```python
from pydantic import BaseModel
from sqlalchemy import func


class PaginatedResponse(BaseModel):
    items: list[BookResponse]
    total: int
    skip: int
    limit: int


@router.get("/", response_model=PaginatedResponse)
async def list_books(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    # Get total count
    count_result = await db.execute(select(func.count(Book.id)))
    total = count_result.scalar()

    # Get items
    result = await db.execute(
        select(Book).offset(skip).limit(limit)
    )
    items = result.scalars().all()

    return PaginatedResponse(
        items=items,
        total=total,
        skip=skip,
        limit=limit
    )
```

## Filtering and Search

```python
from typing import Optional


@router.get("/")
async def list_books(
    skip: int = 0,
    limit: int = 100,
    author: Optional[str] = None,
    year: Optional[int] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(Book)

    # Apply filters
    if author:
        query = query.where(Book.author == author)
    if year:
        query = query.where(Book.year == year)
    if search:
        query = query.where(Book.title.ilike(f"%{search}%"))

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()
```

## Transactions

### Automatic Transaction

SQLAlchemy sessions handle transactions automatically:

```python
async def create_book(db: AsyncSession, book_data: BookCreate) -> Book:
    book = Book(**book_data.model_dump())
    db.add(book)
    await db.commit()  # Transaction commits here
    await db.refresh(book)
    return book
```

### Manual Transaction Control

```python
async def create_order_with_items(
    db: AsyncSession,
    order_data: OrderCreate
) -> Order:
    try:
        # Create order
        order = Order(customer_id=order_data.customer_id)
        db.add(order)
        await db.flush()  # Get order.id without committing

        # Create order items
        for item in order_data.items:
            order_item = OrderItem(
                order_id=order.id,
                product_id=item.product_id,
                quantity=item.quantity
            )
            db.add(order_item)

        await db.commit()
        await db.refresh(order)
        return order

    except Exception:
        await db.rollback()
        raise HTTPException(500, "Failed to create order")
```

## Soft Delete

```python
# Model with soft delete
from datetime import datetime


class Book(Base):
    __tablename__ = "books"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    is_deleted: Mapped[bool] = mapped_column(default=False)
    deleted_at: Mapped[datetime | None] = mapped_column(nullable=True)


# Service with soft delete
async def get_books(db: AsyncSession) -> list[Book]:
    result = await db.execute(
        select(Book).where(Book.is_deleted == False)
    )
    return result.scalars().all()


async def soft_delete_book(db: AsyncSession, book_id: int) -> None:
    book = await get_book_by_id(db, book_id)
    if not book:
        raise HTTPException(404, "Book not found")

    book.is_deleted = True
    book.deleted_at = datetime.utcnow()
    await db.commit()
```

## Complex Queries

### Joins and Eager Loading

```python
from sqlalchemy.orm import selectinload


async def get_users_with_items(db: AsyncSession) -> list[User]:
    result = await db.execute(
        select(User).options(selectinload(User.items))
    )
    return result.scalars().all()
```

### Aggregations

```python
from sqlalchemy import func


async def get_books_per_author(db: AsyncSession):
    result = await db.execute(
        select(Book.author, func.count(Book.id).label("count"))
        .group_by(Book.author)
    )
    return [
        {"author": author, "count": count}
        for author, count in result.all()
    ]
```

## Main Application

```python
# main.py
from fastapi import FastAPI
from app.core.database import init_db
from app.routers import book

app = FastAPI(title="Book API")

app.include_router(book.router)


@app.on_event("startup")
async def startup():
    await init_db()
```

## Testing CRUD

```bash
# Create
curl -X POST http://localhost:8000/books/ \
  -H "Content-Type: application/json" \
  -d '{"title": "1984", "author": "George Orwell", "year": 1949}'

# List
curl http://localhost:8000/books/

# Get one
curl http://localhost:8000/books/1

# Update
curl -X PUT http://localhost:8000/books/1 \
  -H "Content-Type: application/json" \
  -d '{"title": "Nineteen Eighty-Four"}'

# Delete
curl -X DELETE http://localhost:8000/books/1
```

## Best Practices

### Separation of Concerns

| Layer | Responsibility |
|-------|----------------|
| Router | HTTP handling |
| Service | Business logic |
| Model | Database structure |
| Schema | Data validation |

### Error Handling

```python
from fastapi import HTTPException

async def get_book_or_404(db: AsyncSession, book_id: int) -> Book:
    book = await get_book_by_id(db, book_id)
    if not book:
        raise HTTPException(404, f"Book {book_id} not found")
    return book
```

### Input Validation

```python
# Use Pydantic for validation
class BookCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    year: int = Field(ge=0, le=2100)
```

## Summary

| Pattern | Purpose |
|---------|---------|
| Service layer | Business logic isolation |
| Pagination | Handle large datasets |
| Soft delete | Preserve data |
| Transactions | Data integrity |
| Eager loading | Avoid N+1 queries |

## Next Steps

- [Database Relationships](./09-database-relationships.md) - Model relationships
- [Database Migrations](./09a-database-migrations.md) - Manage schema changes with Alembic

---

[Previous: Database Setup](./07-database-setup.md) | [Back to Index](./README.md) | [Next: Database Migrations](./09a-database-migrations.md)
