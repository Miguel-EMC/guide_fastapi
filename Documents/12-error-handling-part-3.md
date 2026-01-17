# Error Handling (Part 3)

## Combining Different Exception Handlers

Here's a complete example that combines all the error handling approaches:

```python
from fastapi import FastAPI, Request, HTTPException, Depends, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, Field, field_validator
from typing import Any, Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

# Define custom exceptions
class DatabaseException(Exception):
    def __init__(self, detail: str, operation: str, entity: str):
        self.detail = detail
        self.operation = operation
        self.entity = entity
        super().__init__(self.detail)

class AuthenticationException(Exception):
    def __init__(self, detail: str):
        self.detail = detail
        super().__init__(self.detail)

# Define models
class User(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
    age: int = Field(..., ge=18)

    @field_validator('username')
    def username_alphanumeric(cls, v):
        if not v.isalnum():
            raise ValueError('must be alphanumeric')
        return v

# Initialize FastAPI app
app = FastAPI()

# Exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for error in exc.errors():
        error_location = " -> ".join(str(loc) for loc in error["loc"])
        errors.append({
            "location": error_location,
            "message": error["msg"],
            "type": error["type"]
        })
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "status": "error",
            "code": "validation_error",
            "message": "Invalid input data",
            "errors": errors
        }
    )

@app.exception_handler(DatabaseException)
async def database_exception_handler(request: Request, exc: DatabaseException):
    logger.error(f"Database error: {exc.detail} during {exc.operation} on {exc.entity}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "status": "error",
            "code": "database_error",
            "message": exc.detail,
            "context": {
                "operation": exc.operation,
                "entity": exc.entity
            }
        }
    )

@app.exception_handler(AuthenticationException)
async def authentication_exception_handler(request: Request, exc: AuthenticationException):
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={
            "status": "error",
            "code": "authentication_error",
            "message": exc.detail
        },
        headers={"WWW-Authenticate": "Bearer"}
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "code": f"http_{exc.status_code}",
            "message": exc.detail
        },
        headers=exc.headers
    )

# Authentication dependency
async def verify_token(authorization: Optional[str] = None):
    if not authorization or not authorization.startswith("Bearer "):
        raise AuthenticationException("Invalid or missing authentication token")
    token = authorization.replace("Bearer ", "")
    # In a real app, validate the token here
    if token != "valid_token":
        raise AuthenticationException("Invalid or expired token")
    return {"user_id": 123}

# User database simulation
users_db = {
    1: {"username": "john", "email": "john@example.com", "age": 30},
    2: {"username": "jane", "email": "jane@example.com", "age": 25}
}

# Endpoints
@app.get("/users/{user_id}")
async def get_user(user_id: int, auth: Dict = Depends(verify_token)):
    if user_id not in users_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )
    try:
        # Simulate database operation
        user = users_db[user_id]
        return {"user": user, "authenticated_user_id": auth["user_id"]}
    except Exception as e:
        raise DatabaseException(
            detail="Failed to retrieve user data",
            operation="get",
            entity="users"
        )

@app.post("/users/", status_code=status.HTTP_201_CREATED)
async def create_user(user: User, auth: Dict = Depends(verify_token)):
    # Check if username already exists
    for existing_user in users_db.values():
        if existing_user["username"] == user.username:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username already exists"
            )
    try:
        # Simulate database operation
        new_user_id = max(users_db.keys()) + 1
        users_db[new_user_id] = user.dict()
        return {"id": new_user_id, **user.dict()}
    except Exception as e:
        raise DatabaseException(
            detail="Failed to create user",
            operation="create",
            entity="users"
        )

@app.delete("/users/{user_id}")
async def delete_user(user_id: int, auth: Dict = Depends(verify_token)):
    if user_id not in users_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )
    try:
        # Simulate database operation
        del users_db[user_id]
        return {"message": f"User with ID {user_id} deleted successfully"}
    except Exception as e:
        raise DatabaseException(
            detail="Failed to delete user",
            operation="delete",
            entity="users"
        )
```

## Best Practices

Here are some best practices for error handling in FastAPI:

### 1. Use Structured Error Responses

Use a consistent format for error responses, for example:

```json
{
    "status": "error",
    "code": "error_type",
    "message": "Human-readable message",
    "details": {
        "additional context-specific information"
    }
}
```

### 2. Use Appropriate Status Codes

Use the correct HTTP status codes for different error conditions:

-   **400 Bad Request**: Client error, malformed request syntax
-   **401 Unauthorized**: Authentication failure
-   **403 Forbidden**: Authentication succeeded but user doesn't have permissions
-   **404 Not Found**: Resource not found
-   **409 Conflict**: Request conflicts with current state of the target resource
-   **422 Unprocessable Entity**: Validation errors
-   **500 Internal Server Error**: Unexpected server errors

### 3. Centralize Error Handling

Create a central module for error handling to maintain consistency across your application:

**errors.py:**

```python
# errors.py
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

class AppExceptionCase(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail

class AppException:
    class BadRequest(AppExceptionCase):
        def __init__(self, detail: str = "Bad request"):
            super().__init__(status_code=400, detail=detail)

    class NotFound(AppExceptionCase):
        def __init__(self, detail: str = "Not found"):
            super().__init__(status_code=404, detail=detail)

    class Forbidden(AppExceptionCase):
        def __init__(self, detail: str = "Forbidden"):
            super().__init__(status_code=403, detail=detail)

def add_exception_handlers(app: FastAPI):
    @app.exception_handler(AppExceptionCase)
    async def app_exception_handler(request: Request, exc: AppExceptionCase):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "status": "error",
                "code": exc.__class__.__name__,
                "message": exc.detail
            }
        )
    # Add other handlers here
```

**main.py:**

```python
# main.py
from fastapi import FastAPI
from .errors import add_exception_handlers, AppException

app = FastAPI()
add_exception_handlers(app)

@app.get("/items/{item_id}")
async def read_item(item_id: int):
    if item_id < 0:
        raise AppException.BadRequest("Item ID cannot be negative")
    if item_id not in [1, 2, 3]:
        raise AppException.NotFound(f"Item with id {item_id} not found")
    return {"item_id": item_id}
```

### 4. Log Exception Details

Always log exception details for debugging purposes, but only return safe information to clients:

```python
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    # Log the detailed exception with full traceback
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    # Return a generic message to the client
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "message": "An unexpected error occurred"
        }
    )
```

### 5. Validation Error Handling

Make validation error messages user-friendly:

```python
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Map technical error messages to user-friendly messages
    error_mapping = {
        "value_error.missing": "This field is required",
        "value_error.email": "Invalid email format",
        "value_error.number.not_gt": "Value must be greater than {limit_value}",
        # Add more mappings as needed
    }
    errors = []
    for error in exc.errors():
        error_type = error["type"]
        field = " -> ".join([str(loc) for loc in error["loc"] if loc != "body"])
        # Get user-friendly message or fallback to the original
        message = error_mapping.get(error_type, error["msg"])

        # Replace placeholders if needed
        if "{limit_value}" in message and "ctx" in error and "limit_value" in error["ctx"]:
            message = message.replace("{limit_value}", str(error["ctx"]["limit_value"]))

        errors.append({
            "field": field,
            "message": message
        })
    return JSONResponse(
        status_code=422,
        content={
            "status": "error",
            "code": "validation_error",
            "errors": errors
        }
    )
```

This comprehensive guide should help you implement robust error handling in your FastAPI applications. By following these best practices, you can create a better user experience and make your API more maintainable.