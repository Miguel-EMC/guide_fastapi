# Error Handling (Part 2)

## Custom Exceptions

Let's create custom exceptions for more specific error handling.

### Creating Custom Exception Classes

```python
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.requests import Request
from typing import Any, Dict, Optional

class InsufficientFundsException(Exception):
    def __init__(
        self,
        balance: float,
        required_amount: float,
        detail: str = "Insufficient funds"
    ):
        self.balance = balance
        self.required_amount = required_amount
        self.detail = detail
        super().__init__(self.detail)

class ResourceNotFoundException(Exception):
    def __init__(
        self,
        resource_type: str,
        resource_id: Any,
        detail: Optional[str] = None
    ):
        self.resource_type = resource_type
        self.resource_id = resource_id
        self.detail = detail or f"{resource_type} with id {resource_id} not found"
        super().__init__(self.detail)

app = FastAPI()

# Exception handler for InsufficientFundsException
@app.exception_handler(InsufficientFundsException)
async def insufficient_funds_exception_handler(
    request: Request,
    exc: InsufficientFundsException
):
    return JSONResponse(
        status_code=402, # Payment Required
        content={
            "detail": exc.detail,
            "balance": exc.balance,
            "required_amount": exc.required_amount,
            "missing_amount": exc.required_amount - exc.balance
        }
    )

# Exception handler for ResourceNotFoundException
@app.exception_handler(ResourceNotFoundException)
async def resource_not_found_exception_handler(
    request: Request,
    exc: ResourceNotFoundException
):
    return JSONResponse(
        status_code=404,
        content={
            "detail": exc.detail,
            "resource_type": exc.resource_type,
            "resource_id": exc.resource_id
        }
    )

@app.get("/accounts/{account_id}/withdraw")
async def withdraw(account_id: int, amount: float):
    # Simulating account balance check
    account_balance = 100.0 if account_id == 1 else 500.0

    if account_id not in [1, 2]:
        raise ResourceNotFoundException(
            resource_type="Account",
            resource_id=account_id
        )
    if amount > account_balance:
        raise InsufficientFundsException(
            balance=account_balance,
            required_amount=amount
        )
    return {
        "account_id": account_id,
        "new_balance": account_balance - amount,
        "withdrawn": amount
    }
```

This example demonstrates:

-   Creating custom exception classes with additional context data
-   Registering exception handlers with `@app.exception_handler`
-   Returning structured error responses with appropriate HTTP status codes

## Global Exception Handlers

Sometimes you want to handle specific types of exceptions across your entire application.

### Creating Global Exception Handlers

```python
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import traceback
import logging

logger = logging.getLogger(__name__)
app = FastAPI()

# Override the default HTTPException handler
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "status_code": exc.status_code,
                "detail": exc.detail,
                "headers": exc.headers
            }
        }
    )

# Override the default validation exception handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Log detailed validation error
    logger.error(f"Validation error: {exc}")
    # Create user-friendly error messages
    user_friendly_errors = []
    for error in exc.errors():
        loc = " -> ".join(str(loc) for loc in error["loc"] if loc != "body")
        msg = error["msg"]
        user_friendly_errors.append(f"{loc}: {msg}")
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "status_code": 422,
                "type": "validation_error",
                "detail": user_friendly_errors,
                "body": exc.body
            }
        }
    )

# Catch-all exception handler for unexpected errors
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    # Log the full error with traceback
    logger.error(f"Unhandled exception: {exc}")
    logger.error(traceback.format_exc())

    # Return a generic error to the client
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "status_code": 500,
                "type": "internal_server_error",
                "detail": "An unexpected error occurred"
            }
        }
    )

@app.get("/test-global-handlers/{item_id}")
async def test_global_handlers(item_id: int):
    if item_id == 0:
        # This will be caught by the http_exception_handler
        raise HTTPException(status_code=400, detail="Invalid item ID")
    elif item_id < 0:
        # This will be caught by the unhandled_exception_handler
        raise ValueError("Item ID cannot be negative")
    return {"item_id": item_id}
```

The example shows:

-   Overriding the default exception handlers
-   Creating a catch-all handler for unexpected exceptions
-   Proper error logging
-   Formatting user-friendly error messages