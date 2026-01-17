# FastAPI Error Handling (Part 1)

FastAPI provides robust error handling capabilities that allow you to create clean, maintainable code while providing clear error responses to clients. This tutorial covers everything you need to know about error handling in FastAPI.

## Basic Exception Handling

Let's start with the simplest approach to handling exceptions in FastAPI.

### Setup

First, make sure you have FastAPI and Uvicorn installed:

```bash
pip install fastapi "uvicorn[standard]"
```

### Creating a Basic App

```python
from fastapi import FastAPI, HTTPException

app = FastAPI()

@app.get("/items/{item_id}")
async def read_item(item_id: int):
    items = {1: "Foo", 2: "Bar", 3: "Baz"}
    if item_id not in items:
        # Raise an HTTP exception when item is not found
        raise HTTPException(
            status_code=404,
            detail=f"Item with id {item_id} not found"
        )
    return {"item": items[item_id]}
```

Run the application:

```bash
uvicorn main:app --reload
```

If you visit `/items/1`, you'll get a successful response, but if you visit `/items/99`, you'll get a 404 error with a JSON response:

```json
{
    "detail": "Item with id 99 not found"
}
```

## HTTP Exceptions

FastAPI provides the `HTTPException` class to handle HTTP-specific errors.

### Advanced HTTP Exceptions

```python
from fastapi import FastAPI, HTTPException

app = FastAPI()

@app.get("/users/{user_id}")
async def read_user(user_id: int):
    # Simulating user authorization check
    if user_id < 0:
        raise HTTPException(
            status_code=400,
            detail="User ID cannot be negative",
            headers={"X-Error": "Invalid ID format"}, # Custom headers
        )
    # Simulating user not found
    if user_id > 100:
        raise HTTPException(
            status_code=404,
            detail={
                "message": "User not found",
                "user_id": user_id,
                "additional_info": "Users only exist with IDs between 1 and 100"
            } # You can return structured data
        )
    # Simulating unauthorized access
    if user_id == 50:
        raise HTTPException(
            status_code=403,
            detail="Access forbidden for this user"
        )
    return {"user_id": user_id, "name": f"User {user_id}"}
```

This example shows:

-   Custom headers in exceptions (useful for authentication errors)
-   Structured data in the `detail` field
-   Different status codes for different error conditions

## Validation Exceptions

FastAPI automatically handles validation errors for path parameters, query parameters, and request bodies.

### Path and Query Parameter Validation

```python
from fastapi import FastAPI, Query, Path
from pydantic import BaseModel, Field, ValidationError
from typing import Annotated

app = FastAPI()

@app.get("/products/{product_id}")
async def read_product(
    product_id: Annotated[int, Path(gt=0, le=1000)],
    q: Annotated[str, Query(min_length=3, max_length=50)] = None
):
    return {"product_id": product_id, "query": q}
```

If you visit `/products/0?q=a`, you'll get validation errors for both parameters.

### Request Body Validation

```python
from fastapi import FastAPI
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from datetime import date

class Item(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    price: float = Field(..., gt=0)
    description: Optional[str] = Field(None, max_length=1000)
    tags: List[str] = Field(default_factory=list)

    @field_validator('tags')
    def validate_tags(cls, v):
        if len(v) > 5:
            raise ValueError('A maximum of 5 tags is allowed')
        return v

app = FastAPI()

@app.post("/items/")
async def create_item(item: Item):
    return item
```

If you post invalid data, FastAPI will return a detailed validation error:

```json
{
    "detail": [
        {
            "loc": ["body", "price"],
            "msg": "ensure this value is greater than 0",
            "type": "value_error.number.not_gt",
            "ctx": {"limit_value": 0}
        }
    ]
}
```