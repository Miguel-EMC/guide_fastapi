# Basic API Development Tutorial

## 1. Project Planning

### 1.1 Requirements Gathering

We’ll build a simple Book Management API to perform CRUD operations.

Each book will have:

-   `id`: UUID
-   `title`: string (required)
-   `author`: string (required)
-   `year`: integer (required)
-   `description`: optional string

**Functional Requirements:**

-   Add new books
-   Get all books or a single book by ID
-   Update existing books
-   Delete books

### 1.2 API Design and Endpoint Planning

| Method | Endpoint     | Description            |
| :----- | :----------- | :--------------------- |
| GET    | `/books`     | List all books         |
| GET    | `/books/{id}`| Get a book by ID       |
| POST   | `/books`     | Add a new book         |
| PUT    | `/books/{id}`| Update an existing book|
| DELETE | `/books/{id}`| Delete a book          |

### 1.3 Data Model Design (Pydantic V2)

We’ll use Pydantic V2 to define the book schema:

```bash
pip install "fastapi[all]" pydantic
```

**models.py**

```python
from pydantic import BaseModel, Field
from uuid import UUID
from typing import Optional

class Book(BaseModel):
    id: UUID
    title: str
    author: str
    year: int
    description: Optional[str] = None

class BookCreate(BaseModel):
    title: str = Field(..., min_length=1)
    author: str = Field(..., min_length=1)
    year: int = Field(..., ge=0, le=2100)
    description: Optional[str] = Field(None, max_length=300)
```

### 1.4 Documentation Planning

FastAPI provides automatic documentation:

-   **Swagger UI**: `http://localhost:8000/docs`
-   **Redoc**: `http://localhost:8000/redoc`

We’ll improve docs with:

-   Clear parameter types
-   Descriptive response models
-   Proper HTTP status codes

## 2. Implementation

### 2.1 Building the RESTful API

Folder structure:

```
book_api/
│
├── main.py
├── models.py
└── data.py
```

**data.py — In-Memory Database**

```python
from models import Book
from uuid import uuid4

fake_db = {}

# Add one book to start
book_id = uuid4()
fake_db[book_id] = Book(
    id=book_id,
    title="1984",
    author="George Orwell",
    year=1949,
    description="Dystopian novel"
)
```

**main.py — FastAPI Core Logic**

```python
from fastapi import FastAPI, HTTPException
from uuid import UUID, uuid4
from typing import List
from models import Book, BookCreate
from data import fake_db

app = FastAPI()

@app.get("/books", response_model=List[Book])
def get_books():
    return list(fake_db.values())

@app.get("/books/{book_id}", response_model=Book)
def get_book(book_id: UUID):
    book = fake_db.get(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return book

@app.post("/books", response_model=Book, status_code=201)
def create_book(book: BookCreate):
    book_id = uuid4()
    new_book = Book(id=book_id, **book.model_dump())
    fake_db[book_id] = new_book
    return new_book

@app.put("/books/{book_id}", response_model=Book)
def update_book(book_id: UUID, book_data: BookCreate):
    if book_id not in fake_db:
        raise HTTPException(status_code=404, detail="Book not found")
    updated_book = Book(id=book_id, **book_data.model_dump())
    fake_db[book_id] = updated_book
    return updated_book

@app.delete("/books/{book_id}", status_code=204)
def delete_book(book_id: UUID):
    if book_id not in fake_db:
        raise HTTPException(status_code=404, detail="Book not found")
    del fake_db[book_id]
```

### 2.2 Implementing Validation

Already handled by Pydantic in `BookCreate`:

```python
title: str = Field(..., min_length=1)
year: int = Field(..., ge=0, le=2100)
```

Example error:

```json
{
    "detail": [
        {
            "type": "string_too_short",
            "msg": "String should have at least 1 characters"
        }
    ]
}
```

### Error Handling Strategies

We use `HTTPException(status_code=XXX, detail="...")` for:

-   Not found (404)
-   Validation errors (400 - automatic by FastAPI)
-   Unauthorized (401), Forbidden (403), etc., if added later

## Testing Endpoints via Swagger UI

Run the app:

```bash
uvicorn main:app --reload
```

Visit: `http://localhost:8000/docs`

Test:

-   **POST /books**: Create a book
-   **GET /books**: View all books
-   **PUT /books/{id}**: Update
-   **DELETE /books/{id}**: Delete

## Summary

You’ve now:

-   Planned and built a FastAPI app
-   Designed models with Pydantic V2
-   Created CRUD endpoints
-   Handled validation and errors
-   Tested with Swagger UI