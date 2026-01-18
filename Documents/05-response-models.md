# Response Models & Status Codes

This guide covers response models, HTTP status codes, custom headers, and API documentation in FastAPI.

## Response Models

FastAPI uses Pydantic models to validate, serialize, and document API responses.

### Basic Response Model

```python
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional

app = FastAPI()

class Item(BaseModel):
    id: int
    name: str
    price: float
    description: Optional[str] = None

@app.get("/items/{item_id}", response_model=Item)
async def read_item(item_id: int):
    return {
        "id": item_id,
        "name": "Example Item",
        "price": 19.99,
        "description": "An example item"
    }
```

### Benefits of Response Models

| Benefit | Description |
|---------|-------------|
| **Validation** | Ensures response matches the model structure |
| **Filtering** | Only defined fields are included in output |
| **Type Conversion** | Automatic type conversion |
| **Documentation** | Auto-generated OpenAPI docs |
| **Security** | Prevents exposing sensitive fields |

### Separate Input/Output Models

Best practice: use different models for input and output.

```python
from pydantic import BaseModel, EmailStr, ConfigDict
from datetime import datetime

# Input model
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

# Output model (no password!)
class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

@app.post("/users/", response_model=UserResponse)
async def create_user(user: UserCreate):
    # Save to database...
    return {
        "id": 1,
        "username": user.username,
        "email": user.email,
        "created_at": datetime.now()
    }
```

### Including/Excluding Fields

Control which fields appear in responses:

```python
class User(BaseModel):
    id: int
    username: str
    email: str
    password: str  # Sensitive

# Exclude specific fields
@app.get("/users/me", response_model=User, response_model_exclude={"password"})
async def read_current_user():
    return {"id": 1, "username": "john", "email": "john@example.com", "password": "secret"}

# Include only specific fields
@app.get("/users/{id}", response_model=User, response_model_include={"id", "username"})
async def read_user(id: int):
    return {"id": id, "username": "john", "email": "john@example.com", "password": "secret"}

# Exclude unset values
@app.get("/items/", response_model=Item, response_model_exclude_unset=True)
async def read_items():
    return {"id": 1, "name": "Item"}  # Optional fields not returned
```

### Response Model Options

| Parameter | Description |
|-----------|-------------|
| `response_model` | Pydantic model for response |
| `response_model_include` | Fields to include |
| `response_model_exclude` | Fields to exclude |
| `response_model_exclude_unset` | Exclude fields not explicitly set |
| `response_model_exclude_defaults` | Exclude fields with default values |
| `response_model_exclude_none` | Exclude fields with None values |

### Multiple Response Types

```python
from typing import Union

class Item(BaseModel):
    id: int
    name: str

class Message(BaseModel):
    message: str

@app.get("/items/{item_id}", response_model=Union[Item, Message])
async def read_item(item_id: int):
    if item_id == 0:
        return Message(message="Item not found")
    return Item(id=item_id, name="Example")
```

### List Responses

```python
from typing import List

class Item(BaseModel):
    id: int
    name: str

@app.get("/items/", response_model=List[Item])
async def read_items():
    return [
        {"id": 1, "name": "Item 1"},
        {"id": 2, "name": "Item 2"}
    ]
```

## HTTP Status Codes

### Common Status Codes

| Code | Name | Usage |
|------|------|-------|
| `200` | OK | Successful GET, PUT, PATCH |
| `201` | Created | Successful POST |
| `204` | No Content | Successful DELETE |
| `400` | Bad Request | Invalid request |
| `401` | Unauthorized | Authentication required |
| `403` | Forbidden | Not authorized |
| `404` | Not Found | Resource not found |
| `422` | Unprocessable Entity | Validation error |
| `500` | Internal Server Error | Server error |

### Setting Status Codes

```python
from fastapi import FastAPI, status

app = FastAPI()

@app.post("/items/", status_code=status.HTTP_201_CREATED)
async def create_item(name: str):
    return {"name": name}

@app.delete("/items/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(id: int):
    return None

@app.get("/items/", status_code=200)  # Also valid
async def read_items():
    return []
```

### HTTPException

Raise exceptions with specific status codes:

```python
from fastapi import HTTPException, status

@app.get("/items/{item_id}")
async def read_item(item_id: int):
    if item_id == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found"
        )
    return {"id": item_id}
```

### Multiple Response Documentation

Document different possible responses:

```python
from fastapi import FastAPI, status
from pydantic import BaseModel

class Item(BaseModel):
    id: int
    name: str

class ErrorResponse(BaseModel):
    detail: str

@app.get(
    "/items/{item_id}",
    response_model=Item,
    responses={
        200: {"description": "Item found"},
        404: {"model": ErrorResponse, "description": "Item not found"},
        500: {"model": ErrorResponse, "description": "Server error"}
    }
)
async def read_item(item_id: int):
    if item_id == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"id": item_id, "name": "Example"}
```

## Custom Headers

### Adding Response Headers

```python
from fastapi import Response

@app.get("/items/")
async def read_items(response: Response):
    response.headers["X-Custom-Header"] = "custom-value"
    response.headers["Cache-Control"] = "max-age=3600"
    return {"items": []}
```

### Headers with Exceptions

```python
@app.get("/items/{item_id}")
async def read_item(item_id: int):
    if item_id == 0:
        raise HTTPException(
            status_code=404,
            detail="Item not found",
            headers={"X-Error-Code": "ITEM_NOT_FOUND"}
        )
    return {"id": item_id}
```

## Response Classes

### Built-in Response Types

```python
from fastapi.responses import (
    JSONResponse,
    PlainTextResponse,
    HTMLResponse,
    RedirectResponse,
    StreamingResponse,
    FileResponse
)

@app.get("/json")
async def get_json():
    return JSONResponse(
        content={"message": "Hello"},
        status_code=200,
        headers={"X-Custom": "value"}
    )

@app.get("/text")
async def get_text():
    return PlainTextResponse("Hello World")

@app.get("/html")
async def get_html():
    return HTMLResponse("<h1>Hello World</h1>")

@app.get("/redirect")
async def redirect():
    return RedirectResponse(url="/json")

@app.get("/file")
async def get_file():
    return FileResponse("path/to/file.pdf")
```

### Response Type Reference

| Class | Content-Type | Use Case |
|-------|--------------|----------|
| `JSONResponse` | `application/json` | JSON data (default) |
| `PlainTextResponse` | `text/plain` | Plain text |
| `HTMLResponse` | `text/html` | HTML content |
| `RedirectResponse` | - | URL redirects |
| `StreamingResponse` | varies | Large files, streams |
| `FileResponse` | varies | File downloads |

## OpenAPI Documentation

### Adding Examples

```python
from pydantic import BaseModel, Field

class Item(BaseModel):
    id: int = Field(example=1)
    name: str = Field(example="Smartphone")
    price: float = Field(example=799.99)

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": 1,
                    "name": "Smartphone",
                    "price": 799.99
                }
            ]
        }
    }
```

### Endpoint Documentation

```python
@app.get(
    "/items/{item_id}",
    response_model=Item,
    summary="Get item by ID",
    description="Retrieve a specific item by its unique identifier",
    response_description="The requested item",
    tags=["items"],
    responses={
        200: {
            "description": "Item found",
            "content": {
                "application/json": {
                    "example": {"id": 1, "name": "Example", "price": 9.99}
                }
            }
        },
        404: {
            "description": "Item not found",
            "content": {
                "application/json": {
                    "example": {"detail": "Item not found"}
                }
            }
        }
    }
)
async def read_item(item_id: int):
    """
    Get an item by ID.

    - **item_id**: Unique identifier of the item
    """
    return {"id": item_id, "name": "Example", "price": 9.99}
```

### Using Tags

```python
app = FastAPI()

@app.get("/items/", tags=["items"])
async def read_items():
    return []

@app.post("/items/", tags=["items"])
async def create_item():
    return {}

@app.get("/users/", tags=["users"])
async def read_users():
    return []
```

## Complete Example

```python
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import List, Optional

app = FastAPI(
    title="Products API",
    description="API for managing products",
    version="1.0.0"
)

# Models
class ProductBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    price: float = Field(gt=0)
    description: Optional[str] = None

class ProductCreate(ProductBase):
    pass

class ProductResponse(ProductBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ProductList(BaseModel):
    items: List[ProductResponse]
    total: int

class ErrorResponse(BaseModel):
    detail: str

# Endpoints
@app.post(
    "/products/",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["products"],
    summary="Create a product"
)
async def create_product(product: ProductCreate):
    return {
        "id": 1,
        "name": product.name,
        "price": product.price,
        "description": product.description,
        "created_at": datetime.now()
    }

@app.get(
    "/products/",
    response_model=ProductList,
    tags=["products"],
    summary="List all products"
)
async def list_products():
    return {
        "items": [
            {"id": 1, "name": "Product 1", "price": 9.99, "created_at": datetime.now()}
        ],
        "total": 1
    }

@app.get(
    "/products/{product_id}",
    response_model=ProductResponse,
    tags=["products"],
    responses={404: {"model": ErrorResponse}}
)
async def get_product(product_id: int):
    if product_id == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {
        "id": product_id,
        "name": "Product",
        "price": 9.99,
        "created_at": datetime.now()
    }
```

## Best Practices

### Do's

```python
# Separate input/output models
class UserCreate(BaseModel): ...
class UserResponse(BaseModel): ...

# Use appropriate status codes
@app.post("/", status_code=201)
@app.delete("/", status_code=204)

# Document responses
@app.get("/", responses={404: {"model": Error}})
```

### Don'ts

```python
# Don't expose sensitive data
class UserResponse(BaseModel):
    password: str  # Never include!

# Don't use wrong status codes
@app.post("/", status_code=200)  # Should be 201

# Don't skip documentation
@app.get("/")  # Add response_model and responses
```

## Summary

| Feature | Purpose |
|---------|---------|
| `response_model` | Define response structure |
| `status_code` | Set HTTP status |
| `responses` | Document multiple responses |
| `Response.headers` | Custom headers |
| Response classes | Different content types |

## Next Steps

- [Error Handling](./06-error-handling.md) - Handle errors gracefully
- [Database Setup](./07-database-setup.md) - Connect to databases

---

[Previous: Request Bodies](./04-request-bodies.md) | [Back to Index](./README.md) | [Next: Error Handling](./06-error-handling.md)
