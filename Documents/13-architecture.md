# Project Architecture & Advanced Patterns

This guide covers async/sync patterns, middleware, CORS, background tasks, logging, caching, and production architecture.

## Async vs Sync

Understanding when to use async is crucial for FastAPI performance.

### The Golden Rule

| Task Type | Use | Example |
|-----------|-----|---------|
| **I/O Bound** | `async def` | Database, HTTP requests, file I/O |
| **CPU Bound** | `def` (sync) | Image processing, calculations |
| **Blocking Libraries** | `def` (sync) | Some database drivers |

### How FastAPI Handles Routes

```python
# Async route: runs in the main event loop
@app.get("/async")
async def async_route():
    await some_async_operation()  # Non-blocking
    return {"type": "async"}

# Sync route: runs in a thread pool
@app.get("/sync")
def sync_route():
    some_blocking_operation()  # Runs in separate thread
    return {"type": "sync"}
```

### Common Mistakes

```python
# BAD: Blocking call in async function
@app.get("/bad")
async def bad_route():
    time.sleep(5)  # BLOCKS THE ENTIRE EVENT LOOP!
    return {"status": "done"}

# GOOD: Use async sleep
@app.get("/good")
async def good_route():
    await asyncio.sleep(5)  # Non-blocking
    return {"status": "done"}

# GOOD: Use sync function for blocking operations
@app.get("/also-good")
def sync_route():
    time.sleep(5)  # Runs in thread pool, doesn't block
    return {"status": "done"}
```

### When to Use Each

```python
import asyncio
import httpx
from sqlalchemy.ext.asyncio import AsyncSession

# I/O Bound: Use async
@app.get("/fetch-data")
async def fetch_external_data():
    async with httpx.AsyncClient() as client:
        response = await client.get("https://api.example.com/data")
    return response.json()

# Database with async driver: Use async
@app.get("/users")
async def get_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User))
    return result.scalars().all()

# CPU Bound: Use sync (or offload to worker)
@app.post("/process-image")
def process_image(file: UploadFile):
    # CPU-intensive work runs in thread pool
    image_data = process_heavy_computation(file)
    return {"processed": True}
```

### CPU-Bound Tasks with Workers

For heavy CPU tasks, use background workers:

```python
from celery import Celery

celery_app = Celery("tasks", broker="redis://localhost:6379")

@celery_app.task
def heavy_computation(data):
    # Runs in separate Celery worker process
    result = perform_expensive_calculation(data)
    return result

@app.post("/compute")
async def compute(data: dict):
    task = heavy_computation.delay(data)
    return {"task_id": task.id}
```

## Middleware

Middleware runs before/after every request.

### Basic Middleware

```python
from fastapi import FastAPI, Request
import time

app = FastAPI()

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response
```

### Logging Middleware

```python
import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        logger.info(f"Request: {request.method} {request.url}")

        response = await call_next(request)

        logger.info(f"Response: {response.status_code}")
        return response

app.add_middleware(LoggingMiddleware)
```

### Request ID Middleware

```python
import uuid
from starlette.middleware.base import BaseHTTPMiddleware

class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id

        return response
```

## CORS Configuration

Cross-Origin Resource Sharing for frontend access.

```python
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",      # React dev
        "https://myapp.com",          # Production
    ],
    allow_credentials=True,
    allow_methods=["*"],              # Or ["GET", "POST", "PUT", "DELETE"]
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)
```

### CORS Options

| Option | Description | Example |
|--------|-------------|---------|
| `allow_origins` | Allowed origin URLs | `["https://example.com"]` |
| `allow_credentials` | Allow cookies/auth | `True` |
| `allow_methods` | Allowed HTTP methods | `["GET", "POST"]` |
| `allow_headers` | Allowed request headers | `["Authorization"]` |
| `expose_headers` | Headers client can access | `["X-Custom"]` |
| `max_age` | Preflight cache duration | `600` |

## Background Tasks

Run tasks after returning response.

### Simple Background Task

```python
from fastapi import BackgroundTasks

def send_email(email: str, message: str):
    # Simulated email sending
    print(f"Sending email to {email}: {message}")

@app.post("/register")
async def register(
    email: str,
    background_tasks: BackgroundTasks
):
    # User registration logic...

    # Schedule email to send after response
    background_tasks.add_task(send_email, email, "Welcome!")

    return {"message": "User registered"}
```

### Multiple Background Tasks

```python
@app.post("/order")
async def create_order(
    order: OrderCreate,
    background_tasks: BackgroundTasks
):
    # Create order...

    background_tasks.add_task(send_confirmation_email, order.email)
    background_tasks.add_task(notify_warehouse, order.id)
    background_tasks.add_task(update_analytics, "new_order")

    return {"order_id": order.id}
```

### When to Use What

| Task | Solution |
|------|----------|
| Send email after response | `BackgroundTasks` |
| Quick notifications | `BackgroundTasks` |
| Heavy processing (>30s) | Celery/RQ |
| Scheduled tasks | Celery Beat |
| Long-running jobs | Celery workers |

## Structured Logging

Production-ready logging setup.

### Basic Configuration

```python
import logging
import sys

def setup_logging():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )

setup_logging()
logger = logging.getLogger(__name__)
```

### JSON Logging (Production)

```python
import json
import logging
from datetime import datetime

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
        }
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_data)

# Setup
handler = logging.StreamHandler()
handler.setFormatter(JSONFormatter())
logger = logging.getLogger(__name__)
logger.addHandler(handler)
logger.setLevel(logging.INFO)
```

### Using structlog (Recommended)

```bash
pip install structlog
```

```python
import structlog

structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
)

logger = structlog.get_logger()

@app.get("/users/{user_id}")
async def get_user(user_id: int):
    logger.info("fetching_user", user_id=user_id)
    # ...
```

## Rate Limiting

Protect your API from abuse.

```bash
pip install slowapi
```

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.get("/api/resource")
@limiter.limit("5/minute")
async def get_resource(request: Request):
    return {"data": "limited resource"}

@app.post("/api/expensive")
@limiter.limit("1/minute")
async def expensive_operation(request: Request):
    return {"status": "done"}
```

## Caching

Improve performance with caching.

### In-Memory Cache (Simple)

```python
from functools import lru_cache
from cachetools import TTLCache

# TTL Cache (expires after time)
cache = TTLCache(maxsize=100, ttl=300)  # 5 minutes

@app.get("/config")
async def get_config():
    if "config" not in cache:
        cache["config"] = load_config_from_db()
    return cache["config"]
```

### Redis Cache (Production)

```bash
pip install redis
```

```python
import redis
import json

redis_client = redis.Redis(host='localhost', port=6379, db=0)

async def get_cached_user(user_id: int):
    cache_key = f"user:{user_id}"

    # Try cache first
    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    # Fetch from database
    user = await fetch_user_from_db(user_id)

    # Store in cache (expire in 1 hour)
    redis_client.setex(cache_key, 3600, json.dumps(user))

    return user
```

## API Versioning

### URL Path Versioning

```python
from fastapi import APIRouter

v1_router = APIRouter(prefix="/api/v1")
v2_router = APIRouter(prefix="/api/v2")

@v1_router.get("/users")
def get_users_v1():
    return {"version": "1", "users": []}

@v2_router.get("/users")
def get_users_v2():
    return {"version": "2", "users": [], "pagination": {}}

app.include_router(v1_router)
app.include_router(v2_router)
```

### Header Versioning

```python
from fastapi import Header, HTTPException

@app.get("/users")
async def get_users(api_version: str = Header(default="1")):
    if api_version == "1":
        return {"users": []}
    elif api_version == "2":
        return {"users": [], "meta": {}}
    else:
        raise HTTPException(400, "Unsupported API version")
```

## Production Project Structure

```
project/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app instance
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py           # Settings
│   │   ├── database.py         # DB connection
│   │   ├── security.py         # Auth utilities
│   │   └── logging.py          # Logging setup
│   ├── middleware/
│   │   ├── __init__.py
│   │   ├── logging.py
│   │   └── request_id.py
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── __init__.py
│   │   │   ├── router.py
│   │   │   ├── schemas.py
│   │   │   ├── service.py
│   │   │   └── models.py
│   │   └── users/
│   │       ├── __init__.py
│   │       ├── router.py
│   │       ├── schemas.py
│   │       ├── service.py
│   │       └── models.py
│   └── utils/
│       ├── __init__.py
│       └── helpers.py
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   └── test_users.py
├── alembic/                    # Database migrations
├── .env
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── pyproject.toml
└── README.md
```

## Summary

| Topic | Key Point |
|-------|-----------|
| Async/Sync | Use async for I/O, sync for CPU-bound |
| Middleware | Process-time, logging, request IDs |
| CORS | Configure for frontend access |
| Background Tasks | Post-response processing |
| Logging | Use structured JSON logging |
| Rate Limiting | Protect against abuse |
| Caching | Redis for production |
| Versioning | URL path is most common |

## References

- [FastAPI Async Documentation](https://fastapi.tiangolo.com/async/)
- [FastAPI Middleware](https://fastapi.tiangolo.com/tutorial/middleware/)
- [FastAPI Best Practices - GitHub](https://github.com/zhanymkanov/fastapi-best-practices)
- [Starlette Middleware](https://www.starlette.io/middleware/)
- [structlog Documentation](https://www.structlog.org/)

## Next Steps

- [Testing](./14-testing.md) - Test your application
- [Deployment](./15-deployment.md) - Production deployment

---

[Previous: RBAC](./12-rbac.md) | [Back to Index](./README.md) | [Next: Testing](./14-testing.md)
