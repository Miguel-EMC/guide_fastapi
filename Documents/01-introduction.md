# Introduction & Setup

This guide covers FastAPI fundamentals, installation, and creating your first application.

## What is FastAPI?

FastAPI is a modern, high-performance web framework for building APIs with Python based on standard Python type hints. It's one of the fastest Python frameworks available.

### Key Features

| Feature | Description |
|---------|-------------|
| **High Performance** | Built on Starlette and Pydantic, comparable to Node.js and Go |
| **Type Safety** | Leverages Python type hints for validation and documentation |
| **Auto Documentation** | Swagger UI and ReDoc generated automatically |
| **Async Support** | Full async/await support for concurrent requests |
| **Standards Based** | Built on OpenAPI and JSON Schema standards |

### Why Choose FastAPI?

1. **Performance**: One of the fastest Python frameworks
2. **Developer Experience**: Intuitive API, excellent IDE support
3. **Automatic Validation**: Request data validated automatically
4. **Interactive Docs**: Test your API directly in the browser
5. **Modern Python**: Uses type hints and async/await

## Prerequisites

Before starting, ensure you have:

- Python 3.10+ installed
- Basic Python knowledge
- A code editor (VS Code recommended)
- Terminal/command line access

## Installation

### Step 1: Create Virtual Environment

Always use virtual environments to avoid dependency conflicts.

**Linux / macOS:**

```bash
python3 -m venv venv
source venv/bin/activate
```

**Windows:**

```bash
python -m venv venv
venv\Scripts\activate
```

### Step 2: Install FastAPI

**Standard Installation:**

```bash
pip install fastapi uvicorn
```

**Full Installation (Recommended):**

```bash
pip install "fastapi[standard]"
```

This includes:
- `uvicorn` - ASGI server
- `pydantic` - Data validation
- `python-multipart` - Form data support
- Additional utilities

### Step 3: Verify Installation

Create `check_install.py`:

```python
import fastapi
import uvicorn
import pydantic

print(f"FastAPI version: {fastapi.__version__}")
print(f"Uvicorn version: {uvicorn.__version__}")
print(f"Pydantic version: {pydantic.__version__}")
```

Run:

```bash
python check_install.py
```

Expected output:

```
FastAPI version: 0.100.x
Uvicorn version: 0.23.x
Pydantic version: 2.x.x
```

## Your First Application

### Step 1: Create Basic App

Create `main.py`:

```python
from fastapi import FastAPI

# Create FastAPI instance
app = FastAPI()

# Define root endpoint
@app.get("/")
def read_root():
    return {"message": "Hello, World!"}

# Define path parameter endpoint
@app.get("/items/{item_id}")
def read_item(item_id: int):
    return {"item_id": item_id}
```

**Code Breakdown:**

| Element | Description |
|---------|-------------|
| `FastAPI()` | Creates the application instance |
| `@app.get("/")` | Decorator defining GET endpoint at root path |
| `item_id: int` | Type hint that validates and converts the parameter |

### Step 2: Run the Server

```bash
uvicorn main:app --reload
```

**Command explanation:**

| Part | Meaning |
|------|---------|
| `main` | The file `main.py` |
| `app` | The FastAPI instance in the file |
| `--reload` | Auto-restart on code changes (development only) |

### Step 3: Test Your API

Open your browser:

- `http://127.0.0.1:8000/` - Returns: `{"message": "Hello, World!"}`
- `http://127.0.0.1:8000/items/5` - Returns: `{"item_id": 5}`
- `http://127.0.0.1:8000/items/abc` - Returns: 422 validation error

### Step 4: Explore Documentation

FastAPI generates interactive documentation automatically:

| URL | Documentation Type |
|-----|-------------------|
| `http://127.0.0.1:8000/docs` | Swagger UI - Interactive testing |
| `http://127.0.0.1:8000/redoc` | ReDoc - Clean, readable format |

**Features:**
- View all endpoints
- See expected parameters
- Test API directly
- View response schemas

## Adding Request Body

Enhance your app with POST endpoints:

```python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

# Define request model
class Item(BaseModel):
    name: str
    price: float
    is_offer: bool = False

@app.get("/")
def read_root():
    return {"message": "Hello, World!"}

@app.get("/items/{item_id}")
def read_item(item_id: int, q: str = None):
    return {"item_id": item_id, "q": q}

@app.post("/items/")
def create_item(item: Item):
    return item

@app.put("/items/{item_id}")
def update_item(item_id: int, item: Item):
    return {"item_id": item_id, **item.model_dump()}
```

**Model Fields:**

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `name` | `str` | Yes | - |
| `price` | `float` | Yes | - |
| `is_offer` | `bool` | No | `False` |

## Application Configuration

Add metadata to improve documentation:

```python
from fastapi import FastAPI

app = FastAPI(
    title="My API",
    description="A sample API built with FastAPI",
    version="1.0.0",
    docs_url="/docs",        # Swagger UI path
    redoc_url="/redoc",      # ReDoc path
    openapi_url="/openapi.json"  # OpenAPI schema
)
```

**Configuration Options:**

| Parameter | Description | Default |
|-----------|-------------|---------|
| `title` | API name in docs | "FastAPI" |
| `description` | API description | "" |
| `version` | API version | "0.1.0" |
| `docs_url` | Swagger UI URL | "/docs" |
| `redoc_url` | ReDoc URL | "/redoc" |
| `openapi_url` | OpenAPI JSON URL | "/openapi.json" |

## Project Structure

For simple projects:

```
my_project/
├── main.py           # Application entry
├── requirements.txt  # Dependencies
└── .env             # Environment variables
```

For larger projects, see [Project Architecture](./13-architecture.md).

## Common Issues

### Port Already in Use

```bash
# Find process using port 8000
lsof -i :8000  # Linux/macOS
netstat -ano | findstr :8000  # Windows

# Use different port
uvicorn main:app --reload --port 8001
```

### Module Not Found

```bash
# Ensure virtual environment is activated
source venv/bin/activate

# Reinstall dependencies
pip install "fastapi[standard]"
```

### Type Hints Not Working

Ensure Python 3.10+ or use:

```python
from typing import Optional, List, Union
```

## Summary

You learned:

- What FastAPI is and its advantages
- How to install FastAPI and dependencies
- Creating your first API endpoint
- Using path parameters with type hints
- Working with request bodies (Pydantic models)
- Accessing automatic documentation

## Next Steps

- [Routing & Endpoints](./02-routing.md) - Learn about HTTP methods and parameters
- [Data Validation](./03-data-validation.md) - Master Pydantic validation

---

[Back to Index](./README.md) | [Next: Routing & Endpoints](./02-routing.md)
