# Error Handling

This guide covers HTTPException, custom exceptions, global handlers, and error handling best practices in FastAPI.

## HTTPException

The primary way to return HTTP errors in FastAPI.

### Basic Usage

```python
from fastapi import FastAPI, HTTPException

app = FastAPI()

@app.get("/items/{item_id}")
async def read_item(item_id: int):
    items = {1: "Foo", 2: "Bar"}

    if item_id not in items:
        raise HTTPException(
            status_code=404,
            detail=f"Item {item_id} not found"
        )

    return {"item": items[item_id]}
```

**Response for `/items/99`:**

```json
{
    "detail": "Item 99 not found"
}
```

### HTTPException with Headers

```python
@app.get("/users/{user_id}")
async def read_user(user_id: int):
    if user_id < 0:
        raise HTTPException(
            status_code=400,
            detail="User ID cannot be negative",
            headers={"X-Error": "Invalid ID"}
        )
    return {"user_id": user_id}
```

### Structured Detail

```python
@app.get("/items/{item_id}")
async def read_item(item_id: int):
    if item_id > 100:
        raise HTTPException(
            status_code=404,
            detail={
                "message": "Item not found",
                "item_id": item_id,
                "hint": "Valid IDs are 1-100"
            }
        )
    return {"id": item_id}
```

## Common Status Codes

| Code | Name | Usage |
|------|------|-------|
| `400` | Bad Request | Invalid input |
| `401` | Unauthorized | Authentication required |
| `403` | Forbidden | Not authorized |
| `404` | Not Found | Resource not found |
| `409` | Conflict | Duplicate resource |
| `422` | Unprocessable Entity | Validation error |
| `500` | Internal Server Error | Server error |

### Using Status Constants

```python
from fastapi import status

raise HTTPException(
    status_code=status.HTTP_404_NOT_FOUND,
    detail="Not found"
)

raise HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid credentials"
)
```

## Validation Errors

FastAPI automatically handles validation errors.

### Parameter Validation

```python
from fastapi import Path, Query

@app.get("/products/{product_id}")
async def read_product(
    product_id: int = Path(gt=0, le=1000),
    q: str = Query(min_length=3, max_length=50)
):
    return {"product_id": product_id, "query": q}
```

**Invalid request response:**

```json
{
    "detail": [
        {
            "loc": ["path", "product_id"],
            "msg": "ensure this value is greater than 0",
            "type": "value_error.number.not_gt"
        }
    ]
}
```

### Request Body Validation

```python
from pydantic import BaseModel, Field, field_validator

class Item(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    price: float = Field(gt=0)
    tags: list[str] = []

    @field_validator('tags')
    @classmethod
    def validate_tags(cls, v):
        if len(v) > 5:
            raise ValueError('Maximum 5 tags allowed')
        return v

@app.post("/items/")
async def create_item(item: Item):
    return item
```

## Custom Exceptions

Create specific exception types for your domain.

### Defining Custom Exceptions

```python
class ResourceNotFoundException(Exception):
    def __init__(self, resource_type: str, resource_id: int):
        self.resource_type = resource_type
        self.resource_id = resource_id
        self.detail = f"{resource_type} with id {resource_id} not found"

class InsufficientFundsException(Exception):
    def __init__(self, balance: float, amount: float):
        self.balance = balance
        self.amount = amount
        self.detail = "Insufficient funds"
```

### Registering Exception Handlers

```python
from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(ResourceNotFoundException)
async def resource_not_found_handler(request: Request, exc: ResourceNotFoundException):
    return JSONResponse(
        status_code=404,
        content={
            "error": "not_found",
            "message": exc.detail,
            "resource_type": exc.resource_type,
            "resource_id": exc.resource_id
        }
    )

@app.exception_handler(InsufficientFundsException)
async def insufficient_funds_handler(request: Request, exc: InsufficientFundsException):
    return JSONResponse(
        status_code=402,
        content={
            "error": "insufficient_funds",
            "message": exc.detail,
            "balance": exc.balance,
            "required": exc.amount
        }
    )
```

### Using Custom Exceptions

```python
@app.get("/accounts/{account_id}/withdraw")
async def withdraw(account_id: int, amount: float):
    account = get_account(account_id)

    if not account:
        raise ResourceNotFoundException("Account", account_id)

    if amount > account.balance:
        raise InsufficientFundsException(account.balance, amount)

    return {"new_balance": account.balance - amount}
```

## Global Exception Handlers

Handle exceptions across your entire application.

### Override Default Handlers

```python
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import logging

logger = logging.getLogger(__name__)

# Override HTTP exception handler
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "code": f"http_{exc.status_code}",
            "message": exc.detail
        }
    )

# Override validation error handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for error in exc.errors():
        field = ".".join(str(loc) for loc in error["loc"] if loc != "body")
        errors.append({
            "field": field,
            "message": error["msg"]
        })

    return JSONResponse(
        status_code=422,
        content={
            "status": "error",
            "code": "validation_error",
            "errors": errors
        }
    )

# Catch-all handler
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)

    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "code": "internal_error",
            "message": "An unexpected error occurred"
        }
    )
```

## Centralized Error Handling

Create a reusable error handling module.

### errors.py

```python
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

class AppException(Exception):
    def __init__(self, status_code: int, code: str, message: str):
        self.status_code = status_code
        self.code = code
        self.message = message

class BadRequest(AppException):
    def __init__(self, message: str = "Bad request"):
        super().__init__(400, "bad_request", message)

class NotFound(AppException):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(404, "not_found", message)

class Unauthorized(AppException):
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(401, "unauthorized", message)

class Forbidden(AppException):
    def __init__(self, message: str = "Forbidden"):
        super().__init__(403, "forbidden", message)

class Conflict(AppException):
    def __init__(self, message: str = "Resource conflict"):
        super().__init__(409, "conflict", message)

def register_exception_handlers(app: FastAPI):
    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "status": "error",
                "code": exc.code,
                "message": exc.message
            }
        )
```

### Using Centralized Errors

```python
from fastapi import FastAPI
from errors import register_exception_handlers, NotFound, Conflict

app = FastAPI()
register_exception_handlers(app)

@app.get("/users/{user_id}")
async def get_user(user_id: int):
    user = find_user(user_id)
    if not user:
        raise NotFound(f"User {user_id} not found")
    return user

@app.post("/users/")
async def create_user(username: str):
    if user_exists(username):
        raise Conflict(f"Username '{username}' already exists")
    return create_new_user(username)
```

## Error Response Format

Use consistent error response structure:

```json
{
    "status": "error",
    "code": "error_type",
    "message": "Human-readable message",
    "errors": [
        {
            "field": "email",
            "message": "Invalid email format"
        }
    ]
}
```

### Structured Error Response Model

```python
from pydantic import BaseModel
from typing import List, Optional

class ErrorDetail(BaseModel):
    field: str
    message: str

class ErrorResponse(BaseModel):
    status: str = "error"
    code: str
    message: str
    errors: Optional[List[ErrorDetail]] = None
```

## Best Practices

### 1. Use Appropriate Status Codes

```python
# Creation
@app.post("/items/", status_code=201)
async def create(): ...

# Deletion
@app.delete("/items/{id}", status_code=204)
async def delete(): ...

# Not found
raise HTTPException(status_code=404)

# Validation error
raise HTTPException(status_code=422)
```

### 2. Log Errors Server-Side

```python
import logging

logger = logging.getLogger(__name__)

@app.exception_handler(Exception)
async def handler(request: Request, exc: Exception):
    # Log full details
    logger.error(f"Error: {exc}", exc_info=True)

    # Return safe message to client
    return JSONResponse(
        status_code=500,
        content={"message": "Internal error"}
    )
```

### 3. User-Friendly Validation Messages

```python
ERROR_MESSAGES = {
    "value_error.missing": "This field is required",
    "value_error.email": "Invalid email format",
    "value_error.number.not_gt": "Must be greater than {limit_value}"
}

@app.exception_handler(RequestValidationError)
async def handler(request: Request, exc: RequestValidationError):
    errors = []
    for error in exc.errors():
        msg = ERROR_MESSAGES.get(error["type"], error["msg"])
        errors.append({"field": error["loc"][-1], "message": msg})

    return JSONResponse(status_code=422, content={"errors": errors})
```

### 4. Don't Expose Sensitive Information

```python
# Bad - exposes internal details
raise HTTPException(500, detail=f"Database error: {str(db_error)}")

# Good - generic message
logger.error(f"Database error: {db_error}")
raise HTTPException(500, detail="An error occurred")
```

## Summary

| Approach | Use Case |
|----------|----------|
| `HTTPException` | Simple HTTP errors |
| Custom exceptions | Domain-specific errors |
| Exception handlers | Custom response format |
| Global handlers | Catch-all error handling |
| Centralized module | Large applications |

## Next Steps

- [Database Setup](./07-database-setup.md) - Connect to databases
- [CRUD Operations](./08-crud-operations.md) - Database operations

---

[Previous: Response Models](./05-response-models.md) | [Back to Index](./README.md) | [Next: Database Setup](./07-database-setup.md)
