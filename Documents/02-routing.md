# Routing & Endpoints

This guide covers HTTP methods, path parameters, query parameters, and route organization in FastAPI.

## HTTP Methods

FastAPI provides decorators for all standard HTTP methods:

```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/items")           # Read resources
def get_items():
    return {"items": ["item1", "item2"]}

@app.post("/items")          # Create resources
def create_item():
    return {"status": "created"}

@app.put("/items/{id}")      # Full update
def update_item(id: int):
    return {"status": "updated", "id": id}

@app.patch("/items/{id}")    # Partial update
def patch_item(id: int):
    return {"status": "patched", "id": id}

@app.delete("/items/{id}")   # Delete resources
def delete_item(id: int):
    return {"status": "deleted", "id": id}
```

### HTTP Methods Reference

| Method | Purpose | Idempotent | Has Body |
|--------|---------|------------|----------|
| `GET` | Retrieve resources | Yes | No |
| `POST` | Create new resources | No | Yes |
| `PUT` | Replace resources completely | Yes | Yes |
| `PATCH` | Update resources partially | No | Yes |
| `DELETE` | Remove resources | Yes | No |

## Route Order

FastAPI evaluates routes in definition order. More specific routes must come first:

```python
# Correct order
@app.get("/users/me")        # Specific route first
def get_current_user():
    return {"user": "current_user"}

@app.get("/users/{user_id}") # Generic route second
def get_user(user_id: str):
    return {"user_id": user_id}
```

If reversed, `/users/me` would match `{user_id}` as "me".

## Path Parameters

Path parameters capture values from the URL path.

### Basic Usage

```python
@app.get("/items/{item_id}")
def read_item(item_id: int):
    return {"item_id": item_id}
```

**Request:** `GET /items/42`
**Response:** `{"item_id": 42}`

### Supported Types

| Type | Example Value | Validation |
|------|---------------|------------|
| `int` | `42` | Integer only |
| `str` | `"hello"` | Any string |
| `float` | `3.14` | Decimal numbers |
| `UUID` | `"550e8400-..."` | Valid UUID format |
| `date` | `"2024-01-15"` | YYYY-MM-DD format |

```python
from uuid import UUID
from datetime import date

@app.get("/items/{item_id}")
def get_item(item_id: int):
    return {"item_id": item_id}

@app.get("/models/{model_id}")
def get_model(model_id: UUID):
    return {"model_id": model_id}

@app.get("/events/{event_date}")
def get_event(event_date: date):
    return {"date": event_date}

@app.get("/files/{file_path:path}")  # Path with slashes
def get_file(file_path: str):
    return {"path": file_path}
```

### Path Validation

Use `Path` for additional validation:

```python
from fastapi import Path

@app.get("/items/{item_id}")
def read_item(
    item_id: int = Path(
        ...,                    # Required
        title="Item ID",        # Documentation
        description="The ID of the item to retrieve",
        ge=1,                   # Greater than or equal to 1
        le=1000                 # Less than or equal to 1000
    )
):
    return {"item_id": item_id}
```

**Validation Options:**

| Option | Description | Example |
|--------|-------------|---------|
| `...` | Required parameter | `Path(...)` |
| `ge` | Greater than or equal | `ge=0` |
| `gt` | Greater than | `gt=0` |
| `le` | Less than or equal | `le=100` |
| `lt` | Less than | `lt=100` |
| `title` | Documentation title | `title="ID"` |
| `description` | Documentation description | `description="..."` |

### Predefined Values with Enum

Restrict parameters to specific values:

```python
from enum import Enum

class ModelName(str, Enum):
    alexnet = "alexnet"
    resnet = "resnet"
    lenet = "lenet"

@app.get("/models/{model_name}")
def get_model(model_name: ModelName):
    if model_name is ModelName.alexnet:
        return {"model": model_name, "type": "image classification"}

    if model_name is ModelName.resnet:
        return {"model": model_name, "type": "deep residual"}

    return {"model": model_name, "type": "convolutional"}
```

**Valid requests:** `/models/alexnet`, `/models/resnet`, `/models/lenet`
**Invalid requests:** `/models/other` returns 422 validation error

## Query Parameters

Query parameters are key-value pairs after `?` in the URL.

### Basic Usage

```python
@app.get("/items/")
def read_items(skip: int = 0, limit: int = 10):
    return {"skip": skip, "limit": limit}
```

**Request:** `GET /items/?skip=20&limit=50`
**Response:** `{"skip": 20, "limit": 50}`

### Optional vs Required

```python
from typing import Optional

@app.get("/items/")
def read_items(
    required: str,                    # Required (no default)
    optional: Optional[str] = None    # Optional
):
    result = {"required": required}
    if optional:
        result["optional"] = optional
    return result
```

### Query Validation

```python
from fastapi import Query

@app.get("/items/")
def read_items(
    q: str = Query(
        default=None,           # Default value
        min_length=3,           # Minimum length
        max_length=50,          # Maximum length
        pattern="^[a-z]+$",     # Regex pattern (Pydantic v2)
        title="Search Query",
        description="Search string for filtering items"
    )
):
    return {"q": q}
```

**Validation Options:**

| Option | Description | Example |
|--------|-------------|---------|
| `default` | Default value | `default=None` |
| `min_length` | Minimum string length | `min_length=3` |
| `max_length` | Maximum string length | `max_length=50` |
| `pattern` | Regex pattern | `pattern="^[a-z]+$"` |
| `ge`, `gt`, `le`, `lt` | Numeric constraints | `ge=0` |
| `alias` | Alternative parameter name | `alias="item-query"` |

### Boolean Conversion

FastAPI automatically converts boolean query parameters:

```python
@app.get("/items/")
def read_items(featured: bool = False):
    return {"featured": featured}
```

**Truthy values:** `true`, `1`, `yes`, `on`
**Falsy values:** `false`, `0`, `no`, `off`

### Multiple Values

Accept multiple values for the same parameter:

```python
from typing import List

@app.get("/items/")
def read_items(q: List[str] = Query(default=[])):
    return {"q": q}
```

**Request:** `GET /items/?q=foo&q=bar&q=baz`
**Response:** `{"q": ["foo", "bar", "baz"]}`

## Combining Parameters

You can combine path, query, and body parameters:

```python
from pydantic import BaseModel

class Item(BaseModel):
    name: str
    price: float

@app.put("/items/{item_id}")
def update_item(
    item_id: int,                    # Path parameter
    q: Optional[str] = None,         # Query parameter
    item: Item = None                # Request body
):
    result = {"item_id": item_id}
    if q:
        result["q"] = q
    if item:
        result["item"] = item.model_dump()
    return result
```

**FastAPI Detection Rules:**

| Declaration | Parameter Type |
|-------------|----------------|
| In path string `{param}` | Path parameter |
| Singular type (`int`, `str`, etc.) | Query parameter |
| Pydantic model type | Request body |

## Router Organization

For larger applications, organize routes with `APIRouter`:

```python
# routers/items.py
from fastapi import APIRouter

router = APIRouter(
    prefix="/items",
    tags=["items"],
    responses={404: {"description": "Not found"}}
)

@router.get("/")
def list_items():
    return {"items": []}

@router.get("/{item_id}")
def get_item(item_id: int):
    return {"item_id": item_id}

@router.post("/")
def create_item():
    return {"created": True}
```

```python
# main.py
from fastapi import FastAPI
from routers import items

app = FastAPI()
app.include_router(items.router)
```

### Router Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `prefix` | URL prefix for all routes | `prefix="/items"` |
| `tags` | OpenAPI tags for documentation | `tags=["items"]` |
| `dependencies` | Dependencies for all routes | `dependencies=[Depends(verify_token)]` |
| `responses` | Default response documentation | `responses={404: {...}}` |

## Best Practices

### Naming Conventions

```python
# Resource-based naming
@app.get("/users")               # List users
@app.post("/users")              # Create user
@app.get("/users/{user_id}")     # Get specific user
@app.put("/users/{user_id}")     # Update user
@app.delete("/users/{user_id}")  # Delete user

# Nested resources
@app.get("/users/{user_id}/orders")           # User's orders
@app.get("/users/{user_id}/orders/{order_id}") # Specific order
```

### Status Codes

```python
from fastapi import status

@app.post("/items/", status_code=status.HTTP_201_CREATED)
def create_item():
    return {"created": True}

@app.delete("/items/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(id: int):
    return None
```

### Documentation

```python
@app.get(
    "/items/{item_id}",
    summary="Get a specific item",
    description="Retrieve item details by ID",
    response_description="The requested item",
    tags=["items"],
    deprecated=False
)
def get_item(item_id: int):
    """
    Get an item by ID.

    - **item_id**: The unique identifier of the item
    """
    return {"item_id": item_id}
```

## Summary

You learned:

- HTTP methods and their purposes
- Path parameters with type validation
- Query parameters with defaults and validation
- Combining different parameter types
- Organizing routes with `APIRouter`
- Best practices for route naming

## Next Steps

- [Data Validation](./03-data-validation.md) - Learn Pydantic validation
- [Request Bodies](./04-request-bodies.md) - Handle JSON and form data

---

[Previous: Introduction](./01-introduction.md) | [Back to Index](./README.md) | [Next: Data Validation](./03-data-validation.md)
