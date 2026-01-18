# Data Validation with Pydantic

This guide covers Pydantic fundamentals, field validation, custom validators, and integration with FastAPI.

## What is Pydantic?

Pydantic is a data validation library that uses Python type annotations to:

| Feature | Description |
|---------|-------------|
| **Validate Data** | Enforce types and constraints at runtime |
| **Convert Types** | Automatically convert compatible types |
| **Generate Schemas** | Create JSON Schema for documentation |
| **IDE Support** | Full autocomplete and type checking |

## Basic Models

### Creating a Model

```python
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class User(BaseModel):
    id: int
    name: str
    email: str
    is_active: bool = True
    created_at: datetime = datetime.now()
    tags: list[str] = []
    profile_picture: Optional[str] = None
```

### Using the Model

```python
# Valid data - automatic type conversion
user = User(id="1", name="John", email="john@example.com")
print(user.id)  # 1 (converted to int)

# Access as dictionary
print(user.model_dump())

# Convert to JSON
print(user.model_dump_json())
```

### Validation Errors

```python
from pydantic import ValidationError

try:
    user = User(id="not-a-number", name=123, email="invalid")
except ValidationError as e:
    print(e.errors())
```

## Field Validation

### Using Field Constraints

```python
from pydantic import BaseModel, Field, EmailStr

class Product(BaseModel):
    id: int
    name: str = Field(min_length=2, max_length=100)
    price: float = Field(gt=0, description="Must be positive")
    quantity: int = Field(ge=0, le=1000)
    description: str = Field(default="", max_length=1000)
    email: EmailStr  # Requires email-validator package
```

### Field Constraint Reference

| Constraint | Type | Description | Example |
|------------|------|-------------|---------|
| `gt` | Numeric | Greater than | `Field(gt=0)` |
| `ge` | Numeric | Greater than or equal | `Field(ge=0)` |
| `lt` | Numeric | Less than | `Field(lt=100)` |
| `le` | Numeric | Less than or equal | `Field(le=100)` |
| `min_length` | String | Minimum length | `Field(min_length=1)` |
| `max_length` | String | Maximum length | `Field(max_length=50)` |
| `pattern` | String | Regex pattern | `Field(pattern="^[a-z]+$")` |
| `default` | Any | Default value | `Field(default="")` |
| `description` | Any | Documentation | `Field(description="...")` |

### Special Types

```python
from pydantic import BaseModel, EmailStr, HttpUrl, Field
from typing import Annotated

class Contact(BaseModel):
    email: EmailStr                    # Validated email
    website: HttpUrl                   # Validated URL
    phone: Annotated[str, Field(pattern=r"^\d{10}$")]  # 10 digits
```

## Custom Validators

### Field Validators

Validate individual fields:

```python
from pydantic import BaseModel, field_validator

class User(BaseModel):
    username: str
    password: str

    @field_validator('username')
    @classmethod
    def username_alphanumeric(cls, v: str) -> str:
        if not v.isalnum():
            raise ValueError('Username must be alphanumeric')
        return v.lower()  # Transform to lowercase

    @field_validator('password')
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain a digit')
        return v
```

### Model Validators

Validate across multiple fields:

```python
from pydantic import BaseModel, model_validator

class DateRange(BaseModel):
    start_date: datetime
    end_date: datetime

    @model_validator(mode='after')
    def check_dates(self) -> 'DateRange':
        if self.start_date >= self.end_date:
            raise ValueError('end_date must be after start_date')
        return self
```

### Validating with Dependencies

```python
from pydantic import BaseModel, field_validator

class SignupForm(BaseModel):
    password: str
    password_confirm: str

    @field_validator('password_confirm')
    @classmethod
    def passwords_match(cls, v: str, info) -> str:
        if 'password' in info.data and v != info.data['password']:
            raise ValueError('Passwords do not match')
        return v
```

## Nested Models

### Basic Nesting

```python
class Address(BaseModel):
    street: str
    city: str
    country: str
    zip_code: str

class User(BaseModel):
    id: int
    name: str
    address: Address  # Nested model
```

**JSON input:**

```json
{
  "id": 1,
  "name": "John",
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "country": "USA",
    "zip_code": "10001"
  }
}
```

### Lists of Models

```python
class OrderItem(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)
    unit_price: float = Field(gt=0)

class Order(BaseModel):
    id: int
    customer_id: int
    items: list[OrderItem]  # List of nested models
```

### Recursive Models

For self-referential structures:

```python
class Comment(BaseModel):
    id: int
    text: str
    replies: list['Comment'] = []  # Forward reference

# Required for recursive models in Pydantic v2
Comment.model_rebuild()
```

## Model Configuration

### Config Options

```python
from pydantic import BaseModel, ConfigDict

class User(BaseModel):
    model_config = ConfigDict(
        strict=True,              # No type coercion
        frozen=True,              # Immutable instances
        extra='forbid',           # Reject extra fields
        str_strip_whitespace=True # Strip whitespace from strings
    )

    name: str
    email: str
```

### Common Config Options

| Option | Description | Default |
|--------|-------------|---------|
| `strict` | No automatic type conversion | `False` |
| `frozen` | Make instances immutable | `False` |
| `extra` | Handle extra fields: `'allow'`, `'forbid'`, `'ignore'` | `'ignore'` |
| `str_strip_whitespace` | Strip whitespace from strings | `False` |
| `from_attributes` | Read from object attributes (for ORM) | `False` |

## Serialization

### Model to Dictionary

```python
user = User(id=1, name="John", email="john@example.com")

# All fields
data = user.model_dump()

# Exclude fields
data = user.model_dump(exclude={'password'})

# Include only specific fields
data = user.model_dump(include={'id', 'name'})

# Exclude unset fields (for partial updates)
data = user.model_dump(exclude_unset=True)
```

### Model to JSON

```python
json_str = user.model_dump_json()
json_str = user.model_dump_json(indent=2)  # Pretty print
```

### Dictionary to Model

```python
data = {"id": 1, "name": "John", "email": "john@example.com"}
user = User.model_validate(data)
```

## FastAPI Integration

### Request Validation

```python
from fastapi import FastAPI
from pydantic import BaseModel, Field, EmailStr

app = FastAPI()

class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8)

class UserResponse(BaseModel):
    id: int
    username: str
    email: str

@app.post("/users/", response_model=UserResponse)
async def create_user(user: UserCreate):
    # FastAPI automatically validates request body
    # Returns 422 if validation fails
    return UserResponse(id=1, username=user.username, email=user.email)
```

### Separate Input/Output Models

```python
# Base fields shared between models
class UserBase(BaseModel):
    username: str
    email: EmailStr

# For creating users (input)
class UserCreate(UserBase):
    password: str

# For updating users (all optional)
class UserUpdate(BaseModel):
    username: str | None = None
    email: EmailStr | None = None
    password: str | None = None

# For responses (output)
class UserResponse(UserBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
```

### ORM Mode

For SQLAlchemy/SQLModel integration:

```python
from pydantic import ConfigDict

class UserResponse(BaseModel):
    id: int
    username: str
    email: str

    model_config = ConfigDict(from_attributes=True)

# Now works with ORM objects
@app.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.id == user_id).first()
    return db_user  # Pydantic reads from object attributes
```

## Complete Example

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, EmailStr, field_validator
from datetime import datetime
from typing import Optional

app = FastAPI()

class OrderItem(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)
    unit_price: float = Field(gt=0)

class OrderCreate(BaseModel):
    customer_email: EmailStr
    items: list[OrderItem] = Field(min_length=1)
    notes: Optional[str] = Field(default=None, max_length=500)

    @field_validator('items')
    @classmethod
    def validate_items(cls, v):
        if len(v) > 100:
            raise ValueError('Maximum 100 items per order')
        return v

class OrderResponse(BaseModel):
    id: int
    customer_email: str
    items: list[OrderItem]
    total: float
    created_at: datetime

@app.post("/orders/", response_model=OrderResponse)
async def create_order(order: OrderCreate):
    total = sum(item.quantity * item.unit_price for item in order.items)

    return OrderResponse(
        id=1,
        customer_email=order.customer_email,
        items=order.items,
        total=total,
        created_at=datetime.now()
    )
```

## Best Practices

### Do's

```python
# Use separate models for input/output
class UserCreate(BaseModel): ...
class UserResponse(BaseModel): ...

# Add descriptive fields
name: str = Field(description="User's full name")

# Use EmailStr for emails
email: EmailStr

# Set sensible constraints
password: str = Field(min_length=8)
```

### Don'ts

```python
# Don't include passwords in responses
class UserResponse(BaseModel):
    password: str  # Security risk!

# Don't skip validation
name: str  # Add constraints: Field(min_length=1)

# Don't mix input/output concerns
class User(BaseModel):  # Split into UserCreate and UserResponse
    id: int
    password: str
```

## Summary

You learned:

- Creating Pydantic models with type annotations
- Field validation with constraints
- Custom validators for complex logic
- Nested and recursive models
- Serialization and deserialization
- FastAPI integration patterns

## Next Steps

- [Request Bodies](./04-request-bodies.md) - Handle JSON and form data
- [Response Models](./05-response-models.md) - Configure API responses

---

[Previous: Routing](./02-routing.md) | [Back to Index](./README.md) | [Next: Request Bodies](./04-request-bodies.md)
