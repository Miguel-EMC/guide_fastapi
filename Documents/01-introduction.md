# GUIDE FOR FastAPI

## Introduction to FastAPI and Its Advantages

FastAPI is a modern, high-performance web framework for building APIs with Python based on standard Python type hints.

### Key advantages of FastAPI

1. PERFORMANCE
   FastAPI lives up to its name by offering exceptional speed. Built on Starlette for the web parts and Pydantic for data validation, It's one of the fastest python frameworks available, comparable to Node.Js and GO.

2. TYPE HINTS AND VALIDATIONS
   FastAPI leverages python's type hints to:

- Reduce bugs by validating request data
- Convert incoming JSON to python objects
- Validate data constraints and generate detailed error messages
- Automatically document of API

3. AUTOMATIC DOCUMENTATION
   One of FastAPI's most praised features is its automatic interactive API documentation:

- Swagger UI (accessible at /docs) for interactive testing
- ReDoc (accessible at /redoc) for a more readable documentation
- Both are generated automatically based on your code and type hints

4. Developer Experience

- Detailed and intuitive error messages
- IDE autocompletion support
- Less code repetition
- Intuitive design that's easy to learn

5. Modern Python Features

- Fully supports async/await for handling concurrent requests
- Compatible with Python 3.6+ type hints
- Works with Python standard libraries

6. Standards-Based

- Built on open standards like OpenAPI and JSON Schema
- Easy integration with other tools that follow these standards

## Setting Up Development Environment

### Prerequisites

- Python 3.6+ installed on your system
- Basic knowledge of Python
- A code editor (VS Code, PyCharm, etc.)
- Command line/terminal access

# FastAPI Installation Guide

## Step 1: Create a Virtual Environment

It’s always recommended to use a virtual environment for Python projects to avoid dependency conflicts.

### macOS / Linux

```bash
python3 -m venv venv
source venv/bin/activate
```

### Windows

```bash
python -m venv venv
venv\Scripts\activate
```

## Step 2: Install FastAPI and Uvicorn

FastAPI requires a server to run. Uvicorn is a lightning-fast ASGI server implementation that works perfectly with FastAPI.

Standard Installation:

```bash
pip install fastapi uvicorn
```

Development Installation (Recommended): For development, it is often better to install the standard package, which includes Uvicorn, Pydantic, and other optional dependencies:

```bash
pip install "fastapi[standard]"
```

## Step 3: Verify Installation

To ensure everything is set up correctly, create a test file named check_install.py with the following content:

```Python
import fastapi
import uvicorn
import pydantic

print(f"FastAPI version: {fastapi.__version__}")
print(f"Uvicorn version: {uvicorn.__version__}")
print(f"Pydantic version: {pydantic.__version__}")
```

Run the verification script:

```bash
python check_install.py
```

Expected Output: You should see the installed version numbers for each package printed in your terminal.



4. Creating Your First FastAPI Application
### Step 1: Create a Basic Application

Create a new file named main.py:

```Python
from fastapi import FastAPI

# Create an instance of the FastAPI class
app = FastAPI()

# Define a root endpoint
@app.get("/")
def read_root():
 return {"message": "Hello World"}

# Define a path parameter endpoint
@app.get("/items/{item_id}")
def read_item(item_id: int):
    return {"item_id": item_id}
```

### Step 2: Run the Application
Run the server using Uvicorn:
```bash
uvicorn main:app --reload
```

This command means:
 * main: the file main.py
 * app: the app object created inside main.py --reload: restart the server when code changes (development only)


### Step 3: Test Your API
Open your browser and navigate to:
* http://127.0.0.1:8000/ - You should see: {"message": "Hello World"}
* http://127.0.0.1:8000/items/5 - You should see: {"item_id": 5}

### Step 4: Explore the Automatic Documentation
Navigate to:
* http://127.0.0.1:8000/docs - Swagger UI documentation
* http://127.0.0.1:8000/redoc - ReDoc documentation

The interactive documentation allows you to:
- See all available endpoints
- Understand the expected parameters
- Try out the API directly from the browser
- View response schemas




### Step 5: Enhance Your API with Request Body
Update your main.py to include a POST endpoint with a request body:

```Python
from fastapi import FastAPI
from pydantic import BaseModel

# Create an instance of the FastAPI class
app = FastAPI()

# Define a Pydantic model for request body validation
class Item(BaseModel):
name: str
price: float
is_offer: bool = None

# Define a root endpoint
@app.get("/")
def read_root():
   return {"message": "Hello World"}

# Define a path parameter endpoint
@app.get("/items/{item_id}")
def read_item(item_id: int, q: str = None):
   return {"item_id": item_id, "q": q}

# Define a POST endpoint with request body
@app.post("/items/")
def create_item(item: Item):
   return item
```

Restart the server (if not using --reload) and test the new endpoint using the Swagger UI at /docs.


### Step 6: Adding Basic Configuration
Enhance your FastAPI application with metadata and configuration:

```Python
from fastapi import FastAPI
from pydantic import BaseModel

# Create an instance with metadata
app = FastAPI(
title="My First API",
description="A simple API built with FastAPI",
version="0.1.0",
docs_url="/documentation", # Change the docs URL
redoc_url="/redoc"
)

```

# ... rest of your code
