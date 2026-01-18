# Basic Authentication

This guide covers HTTP Basic Auth, API Key authentication, session-based auth, and OAuth2 password flow in FastAPI.

## Authentication Methods

| Method | Use Case | Security Level |
|--------|----------|----------------|
| Basic Auth | Simple APIs, internal tools | Low |
| API Key | Server-to-server | Medium |
| Session | Web applications | Medium |
| JWT | APIs, mobile apps | High |

## HTTP Basic Authentication

Credentials sent as Base64-encoded `username:password` in every request.

### Implementation

```python
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
import secrets

app = FastAPI()
security = HTTPBasic()


def verify_credentials(credentials: HTTPBasicCredentials = Depends(security)):
    correct_username = secrets.compare_digest(credentials.username, "admin")
    correct_password = secrets.compare_digest(credentials.password, "secret")

    if not (correct_username and correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username


@app.get("/protected/")
def protected_route(username: str = Depends(verify_credentials)):
    return {"message": f"Hello, {username}!"}
```

### Testing

```bash
curl -u admin:secret http://localhost:8000/protected/
```

### Security Notes

- Use `secrets.compare_digest()` to prevent timing attacks
- Always use HTTPS in production
- Credentials sent with every request

## API Key Authentication

API key passed via headers, query parameters, or cookies.

### Header-Based API Key

```python
from fastapi import Header, HTTPException

API_KEY = "your-secret-api-key"


def verify_api_key(x_api_key: str = Header()):
    if x_api_key != API_KEY:
        raise HTTPException(
            status_code=401,
            detail="Invalid API key"
        )
    return x_api_key


@app.get("/api/data/")
def get_data(api_key: str = Depends(verify_api_key)):
    return {"data": "secret information"}
```

### Query Parameter API Key

```python
from fastapi import Query


def verify_api_key(api_key: str = Query()):
    if api_key != API_KEY:
        raise HTTPException(401, "Invalid API key")
    return api_key


@app.get("/api/data/")
def get_data(api_key: str = Depends(verify_api_key)):
    return {"data": "secret information"}
```

### Using FastAPI Security

```python
from fastapi.security import APIKeyHeader

api_key_header = APIKeyHeader(name="X-API-Key")


def verify_api_key(api_key: str = Depends(api_key_header)):
    if api_key != API_KEY:
        raise HTTPException(401, "Invalid API key")
    return api_key
```

### Testing

```bash
curl -H "X-API-Key: your-secret-api-key" http://localhost:8000/api/data/
```

## Session-Based Authentication

Traditional web application authentication with cookies.

### Implementation

```python
from fastapi import FastAPI, Request, Response, Form, Cookie, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse
import uuid

app = FastAPI()

# Simulated databases
users_db = {"admin": "secret123"}
sessions = {}


@app.get("/login", response_class=HTMLResponse)
def login_form():
    return """
    <form action="/login" method="post">
        <input name="username" placeholder="Username">
        <input name="password" type="password" placeholder="Password">
        <button type="submit">Login</button>
    </form>
    """


@app.post("/login")
def login(
    response: Response,
    username: str = Form(),
    password: str = Form()
):
    if users_db.get(username) != password:
        raise HTTPException(401, "Invalid credentials")

    session_id = str(uuid.uuid4())
    sessions[session_id] = {"username": username}

    response = RedirectResponse(url="/dashboard", status_code=302)
    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        max_age=3600  # 1 hour
    )
    return response


def get_current_user(session_id: str = Cookie(None)):
    if not session_id or session_id not in sessions:
        raise HTTPException(401, "Not authenticated")
    return sessions[session_id]


@app.get("/dashboard")
def dashboard(user: dict = Depends(get_current_user)):
    return {"message": f"Welcome, {user['username']}!"}


@app.post("/logout")
def logout(response: Response, session_id: str = Cookie(None)):
    if session_id and session_id in sessions:
        del sessions[session_id]

    response = RedirectResponse(url="/login", status_code=302)
    response.delete_cookie("session_id")
    return response
```

## OAuth2 Password Flow

The foundation for JWT authentication.

### Setup

```python
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel

app = FastAPI()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Simulated user database
fake_users = {
    "johndoe": {
        "username": "johndoe",
        "hashed_password": "fakehashedsecret",
        "email": "john@example.com"
    }
}


class User(BaseModel):
    username: str
    email: str


def fake_hash_password(password: str) -> str:
    return "fakehashed" + password


def get_user(username: str):
    if username in fake_users:
        return fake_users[username]
    return None


def authenticate_user(username: str, password: str):
    user = get_user(username)
    if not user:
        return None
    if user["hashed_password"] != fake_hash_password(password):
        return None
    return user


@app.post("/token")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # In real app, return a JWT token
    return {"access_token": user["username"], "token_type": "bearer"}


def get_current_user(token: str = Depends(oauth2_scheme)):
    user = get_user(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    return User(username=user["username"], email=user["email"])


@app.get("/users/me", response_model=User)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user
```

### Testing with Swagger UI

1. Open `http://localhost:8000/docs`
2. Click "Authorize" button
3. Enter username: `johndoe`, password: `secret`
4. Test protected endpoints

## Password Hashing

Always hash passwords before storing.

### Using bcrypt

```bash
pip install bcrypt
```

```python
import bcrypt


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode(), salt).decode()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode(),
        hashed_password.encode()
    )
```

### Using passlib

```bash
pip install passlib[bcrypt]
```

```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
```

## Complete Example

```python
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr

app = FastAPI()

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Database simulation
users_db = {}


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    username: str
    email: str


# Register
@app.post("/register", response_model=UserResponse, status_code=201)
def register(user: UserCreate):
    if user.username in users_db:
        raise HTTPException(400, "Username already exists")

    users_db[user.username] = {
        "username": user.username,
        "email": user.email,
        "hashed_password": pwd_context.hash(user.password)
    }
    return UserResponse(username=user.username, email=user.email)


# Login
@app.post("/token")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = users_db.get(form_data.username)
    if not user:
        raise HTTPException(401, "Invalid credentials")

    if not pwd_context.verify(form_data.password, user["hashed_password"]):
        raise HTTPException(401, "Invalid credentials")

    return {"access_token": user["username"], "token_type": "bearer"}


# Get current user
def get_current_user(token: str = Depends(oauth2_scheme)):
    user = users_db.get(token)
    if not user:
        raise HTTPException(401, "Invalid token")
    return UserResponse(username=user["username"], email=user["email"])


# Protected route
@app.get("/me", response_model=UserResponse)
def read_current_user(user: UserResponse = Depends(get_current_user)):
    return user
```

## Best Practices

### Security

| Practice | Description |
|----------|-------------|
| Hash passwords | Never store plain text |
| Use HTTPS | Encrypt all traffic |
| Timing attacks | Use `secrets.compare_digest()` |
| Token expiration | Limit token lifetime |
| Rate limiting | Prevent brute force |

### Implementation

```python
# Store secrets in environment variables
import os

SECRET_KEY = os.getenv("SECRET_KEY")
API_KEY = os.getenv("API_KEY")
```

## Summary

| Method | Best For | Token Storage |
|--------|----------|---------------|
| Basic Auth | Internal tools | None (per-request) |
| API Key | Server-to-server | Header |
| Session | Web apps | Cookie |
| OAuth2 | APIs, mobile | Bearer token |

## Next Steps

- [JWT Authentication](./11-jwt-authentication.md) - Secure token-based auth
- [Role-Based Access](./12-rbac.md) - Permission control

---

[Previous: Database Relationships](./09-database-relationships.md) | [Back to Index](./README.md) | [Next: JWT Authentication](./11-jwt-authentication.md)
