# JWT Authentication

This guide covers JWT tokens, token creation and validation, refresh tokens, and protected routes in FastAPI.

## What is JWT?

JSON Web Token (JWT) is a compact, URL-safe way to represent claims between parties.

### Token Structure

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4ifQ.
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

| Part | Content |
|------|---------|
| Header | Algorithm and token type |
| Payload | User data (claims) |
| Signature | Verification signature |

## Installation

```bash
pip install fastapi "python-jose[cryptography]" passlib[bcrypt]
```

## Project Structure

```
app/
├── core/
│   ├── config.py      # Settings
│   └── security.py    # JWT functions
├── schemas/
│   └── auth.py        # Auth schemas
├── routers/
│   └── auth.py        # Auth routes
└── main.py
```

## Configuration

**config.py**

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    class Config:
        env_file = ".env"


settings = Settings()
```

## Security Module

**security.py**

```python
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None
) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm]
        )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
```

## Schemas

**schemas/auth.py**

```python
from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    username: str | None = None
```

## Authentication Routes

**routers/auth.py**

```python
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    oauth2_scheme
)
from app.schemas.auth import UserCreate, UserResponse, Token

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Simulated database
users_db = {}
user_id_counter = 1


@router.post("/register", response_model=UserResponse, status_code=201)
def register(user: UserCreate):
    global user_id_counter

    if user.username in users_db:
        raise HTTPException(400, "Username already registered")

    users_db[user.username] = {
        "id": user_id_counter,
        "username": user.username,
        "email": user.email,
        "hashed_password": hash_password(user.password)
    }
    user_id_counter += 1

    return UserResponse(
        id=users_db[user.username]["id"],
        username=user.username,
        email=user.email
    )


@router.post("/token", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = users_db.get(form_data.username)

    if not user:
        raise HTTPException(401, "Invalid credentials")

    if not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(401, "Invalid credentials")

    access_token = create_access_token(data={"sub": user["username"]})
    refresh_token = create_refresh_token(data={"sub": user["username"]})

    return Token(
        access_token=access_token,
        refresh_token=refresh_token
    )


@router.post("/refresh", response_model=Token)
def refresh_token(refresh_token: str):
    payload = decode_token(refresh_token)

    if payload.get("type") != "refresh":
        raise HTTPException(401, "Invalid token type")

    username = payload.get("sub")
    if not username or username not in users_db:
        raise HTTPException(401, "Invalid token")

    new_access_token = create_access_token(data={"sub": username})
    new_refresh_token = create_refresh_token(data={"sub": username})

    return Token(
        access_token=new_access_token,
        refresh_token=new_refresh_token
    )
```

## Protected Routes

### Get Current User Dependency

```python
from fastapi import Depends
from app.core.security import oauth2_scheme, decode_token


def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = decode_token(token)

    if payload.get("type") != "access":
        raise HTTPException(401, "Invalid token type")

    username = payload.get("sub")
    if not username:
        raise HTTPException(401, "Invalid token")

    user = users_db.get(username)
    if not user:
        raise HTTPException(401, "User not found")

    return UserResponse(
        id=user["id"],
        username=user["username"],
        email=user["email"]
    )


@router.get("/me", response_model=UserResponse)
def read_current_user(current_user: UserResponse = Depends(get_current_user)):
    return current_user
```

### Protecting Other Routes

```python
from app.routers.auth import get_current_user

@app.get("/items/")
def get_items(current_user: UserResponse = Depends(get_current_user)):
    # Only authenticated users can access
    return {"items": [], "user": current_user.username}
```

## Token Revocation

JWT tokens are stateless. For revocation, use a blacklist.

### Simple Blacklist

```python
# In-memory blacklist (use Redis in production)
revoked_tokens = set()


@router.post("/logout")
def logout(token: str = Depends(oauth2_scheme)):
    revoked_tokens.add(token)
    return {"message": "Successfully logged out"}


def get_current_user(token: str = Depends(oauth2_scheme)):
    if token in revoked_tokens:
        raise HTTPException(401, "Token has been revoked")

    payload = decode_token(token)
    # ... rest of validation
```

### Redis Blacklist (Production)

```python
import redis

redis_client = redis.Redis(host='localhost', port=6379, db=0)


def revoke_token(token: str, expires_in: int):
    redis_client.setex(f"revoked:{token}", expires_in, "1")


def is_token_revoked(token: str) -> bool:
    return redis_client.exists(f"revoked:{token}")
```

## Complete Example

**main.py**

```python
from fastapi import FastAPI, Depends
from app.routers import auth
from app.routers.auth import get_current_user
from app.schemas.auth import UserResponse

app = FastAPI(title="JWT Auth API")

app.include_router(auth.router)


@app.get("/")
def root():
    return {"message": "Welcome to the API"}


@app.get("/protected", response_model=dict)
def protected_route(current_user: UserResponse = Depends(get_current_user)):
    return {
        "message": "This is protected content",
        "user": current_user.username
    }
```

## Testing

### Register

```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "john", "email": "john@example.com", "password": "secret123"}'
```

### Login

```bash
curl -X POST http://localhost:8000/auth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=john&password=secret123"
```

### Access Protected Route

```bash
curl http://localhost:8000/protected \
  -H "Authorization: Bearer <access_token>"
```

### Refresh Token

```bash
curl -X POST http://localhost:8000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "<refresh_token>"}'
```

## Security Best Practices

### Token Security

| Practice | Description |
|----------|-------------|
| Short expiration | Access tokens: 15-30 minutes |
| Secure secret | Use strong, random secret key |
| HTTPS only | Never transmit tokens over HTTP |
| HttpOnly cookies | For web apps, store in HttpOnly cookies |

### Environment Variables

```python
# .env
SECRET_KEY=your-very-long-and-random-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### Token Storage (Client-Side)

| Storage | Security | Use Case |
|---------|----------|----------|
| Memory | High | SPA, short sessions |
| HttpOnly Cookie | High | Web applications |
| localStorage | Low | Not recommended |
| sessionStorage | Medium | Single tab sessions |

## Common Issues

### Token Expired

```python
from jose import ExpiredSignatureError

try:
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
except ExpiredSignatureError:
    raise HTTPException(401, "Token has expired")
```

### Invalid Token

```python
from jose import JWTError

try:
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
except JWTError:
    raise HTTPException(401, "Invalid token")
```

## Summary

| Component | Purpose |
|-----------|---------|
| Access Token | Short-lived authentication |
| Refresh Token | Get new access tokens |
| OAuth2PasswordBearer | Extract token from header |
| jwt.encode/decode | Create/validate tokens |
| Blacklist | Token revocation |

## Next Steps

- [Role-Based Access](./12-rbac.md) - Permission control
- [Project Architecture](./13-architecture.md) - Structuring large apps

---

[Previous: Basic Authentication](./10-authentication-basics.md) | [Back to Index](./README.md) | [Next: Role-Based Access](./12-rbac.md)
