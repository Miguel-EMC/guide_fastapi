# Basic Routing concepts in FastAPI

FastAPI is a modern, high-performance web framework for building APIs with python. At its core, FastAPI uses a decorator-based routing system that makes defining endpoints intuitive and type-safe.

## Creating routing concepts in FastAPI

```Python
from fastapi import FastAPI
app = FastAPI()
@app.get("/")
def read_root():
    return {"Hello": "World"}
```

In this example:
* We import **FastAPI** and create an application instance
* We use the **app.get("/")** decorator to define a router handle for GET request to the root path
* The function returns a JSON response automatically

## HTTP METHODS

FastAPI provides dedicated decorators for all standard HTTP methods:
```Python
@app.get("/items")
def read_items():():
    return {"items": ["items 1", "items 2"]}

@app.post("/items")
def create_item():
    return {"status": "item created"}

@app.put("/items/{item_id}")
def update_item(item_id: int):
    return {"status": f"item {item_id} updated"}

@app.delete("/items/{item_id}")
def delete_item(item_id: int):
    return {"status": f"item {item_id} deleted"}

@app.patch("/items/{item_id}")
def partial_update(item_id: int):
    return {"status": f"item {item_id} partially updated"}
```

## Route Order Matters
FastAPI evaluates routes in the order they're defined. If you have routes that could match the same path, the first one defined will be used:

```Python
@app.get("/users/me")
def read_current_user():
    return {"user_id": "the current user"}

@app.get("/users/{user_id}")
def read_user(user_id: str):
    return {"user_id": user_id}
```

In this case. a request to **/users/me** will be handled by first function, not the second, even though the second route pattern could math "me" as a **user_id**

# Path Parameters and type Hints
Path parameters are variable parts of a URL path that capture values from the request URL. In FastAPI, you define them using curly braces {} in the path and declare them as functions parameters.

### Basic path parameters

```Python
@app.get("/items/{item_id}")
def read_item(item_id: int):
    return {"item_id": item_id}
```

In this example:
* **{item_id}** in the path defines a path parameter
* The function parameters **item_id** captures the value
* The type annotation **int** tells FastAPI to:
 - Validate that the parameter can be converted to an integer
 - Convert the path value to an integer
 - Generate OpenAPI documentation with this type information
 - Provide automatic request validation


## Path Parameter Types
FastAPI supports various types for path parameters:

```Python
from uuid import UUID
from datetime import datetime, date

@app.get("/items/{item_id}")
def read_item(item_id: int): # Integer validation
    return {"item_id": item_id}

@app.get("/users/{user_id}")
def read_user(user_id: str): # String (default)
    return {"user_id": user_id}

@app.get("/files/{file_path: path}")
def read_file(file_path: str): # Path parameter containing slashes
    return {"file_path": file_path}

@app.get("/models/{model_uuid}")
def get_model(model_uuid: UUID): # UUID validation
    return {"model_uuid": model_uuid}

@app.get("/events/{event_date}")
def get_events(event_date: date): # Date validation (YYYY-MM-DD)
    return {"event_date": event_date}
```

## Path Parameter Validation
You can add additional validation using the Path class:

```Python
from fastapi import Path

@app.get("/items/{item_id}")
def read_item(item_id: int = Path(..., title="The ID of the item", ge=0, le=1000)):
    return {"item_id": item_id}
```

In this example:

* ... means the parameter is required
* title provides a description for documentation
* ge=0 specifies that the value must be greater than or equal to 0
* le=1000 specifies that the value must be less than or equal to 1000

## Predefined Values with Enum
You can restrict path parameters to specific values using Python's Enum:

```Python
from enum import Enum

class ModelName(str, Enum):
    alexnet = "alexnet"
    resnet = "resnet"
    lenet = "lenet"

@app.get("/models/{model_name}")
def get_model(model_name: ModelName):
    if model_name is ModelName.alexnet:
        return {"model_name": model_name, "message": "Deep Learning FTW!"}

    if model_name.value == "lenet":
        return {"model_name": model_name, "message": "LeCNN all the images"}

    return {"model_name": model_name, "message": "Have some residuals"}
```

# 3. Query Parameters
Query parameters are key-value pairs that appear after the **?** in a URL. In FastAPI, function parameters that aren't declared as path
parameters automatically become query parameters.

### Basic Query Parameters

```Python
@app.get("/items/")
def read_items(skip: int = 0, limit: int = 10):
    return {"skip": skip, "limit": limit}
```
This handles requests like **/items/?skip=20&limit=50** Both parameters are optional with default values.

### Optional and Required Query Parameters

```Python
from typing import Optional

@app.get("/items/")
def read_items(
required_query: str, # Required parameter (no default value)
optional_query: Optional[str] = None # Optional parameter
):
    results = {"required": required_query}
    if optional_query:
        results.update({"optional": optional_query})
    return results
```

## Query Parameter Validation
Use the Query class for additional validation:

```Python
from fastapi import Query

@app.get("/items/")
def read_items(
    q: Optional[str] = Query(
        None, # Default value
        min_length=3, # Minimum length
        max_length=50, # Maximum length
        regex="^[a-z]+$", # Regular expression pattern
        title="Query string", # Title for documentation
        description="Query string for filtering items" # Description for docs
    )
):
    results = {"items": [{"item_id": "Foo"}, {"item_id": "Bar"}]}
    if q:
        results.update({"q": q})
    return results
```

## Boolean Type Conversion
FastAPI automatically converts query parameters to booleans:

```Python
@app.get("/items/")
def read_items(featured: bool = False):
    if featured:
        return {"featured": "Get only featured items"}
    return {"featured": "Get all items"}
```
This handles:

* /items/?featured=true → featured = True
* /items/?featured=1 → featured = True
* /items/?featured=yes → featured = True
* /items/?featured=false → featured = False
* /items/?featured=0 → featured = False
* /items/?featured=no → featured = False

Multiple Values for the Same Parameter

```Python
from typing import List

@app.get("/items/")
def read_items(q: List[str] = Query(None)):
    return {"q": q}
```

This handles requests like **/items/?q=foo&q=bar&q=baz**, resulting in **q = ["foo", "bar", "baz"]**.


# 4. Request Body Parsing
Request bodies are data sent by the client to the API, typically in JSON format. FastAPI uses Pydantic models to declare and validate
request bodies.
```Python
from pydantic import BaseModel

class Item(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    tax: Optional[float] = None

@app.post("/items/")
def create_item(item: Item):
    return item
```
FastAPI will:
1. Read the request body as JSON
2. Convert the JSON to the Item model
3. Validate the data types
4. Provide the validated instance to your function
5. Document the model schema in OpenAPI

## Request Body + Path Parameters
You can combine path parameters with a request body:

```Python
@app.put("/items/{item_id}")
def update_item(item_id: int, item: Item):
    return {"item_id": item_id, **item.model_dump()}
```

## Request Body + Path + Query Parameters

```Python
@app.put("/items/{item_id}")
def update_item(
    item_id: int,
    item: Item,
    q: Optional[str] = None
):
    result = {"item_id": item_id, **item.model_dump()}
    if q:
        result.update({"q": q})
    return result
```

## Multiple Body Parameters

```Python
class User(BaseModel):
    username: str
    full_name: Optional[str] = None

@app.post("/items/")
def create_item(item: Item, user: User):
    return {"item": item, "user": user}
```
FastAPI will expect a JSON body with nested objects:

```JSON
{
    "item": {
        "name": "Foo",
        "description": "The pretender",
        "price": 42.0,
        "tax": 3.2
    },
    "user": {
        "username": "john_doe",
        "full_name": "John Doe"
    }
}
```
## Body in a Specific Field
If you want the entire JSON body assigned to a specific field, use the Body parameter:

```Python
from fastapi import Body

@app.post("/items/")
def create_item(
    item: Item,
    importance: int = Body(...)
):
    return {"item": item, "importance": importance}
```

```JSON
{
    "item": {
        "name": "Foo",
        "description": "The pretender",
        "price": 42.0
    },
    "importance": 5
}
```

## Nested Models
Pydantic models can be nested to represent complex data structures:

```Python
class Image(BaseModel):
    url: str
    name: str

class Item(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    tax: Optional[float] = None
    tags: List[str] = []
    image: Optional[Image] = None

@app.post("/items/")
def create_item(item: Item):
    return item
```
```JSON
{
    "name": "Foo",
    "description": "The pretender",
    "price": 42.0,
    "tax": 3.2,
    "tags": ["rock", "metal", "alternative"],
    "image": {
        "url": "http://example.com/image.jpg",
        "name": "The Foo album cover"
    }
}
```

# Advanced Validation with Pydantic
Pydantic provides advanced validation through the **Field** function:

```Python
from pydantic import BaseModel, Field

class Item(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = Field(None, max_length=300)
    price: float = Field(..., gt=0)
    tax: Optional[float] = Field(None, ge=0)

@app.post("/items/")
def create_item(item: Item):
    return item
```

You can also add custom validators to Pydantic models:

```Python
from pydantic import BaseModel, field_validator

class Item(BaseModel):
    name: str
    price: float
    quantity: int

@field_validator('quantity')
def quantity_must_be_positive(cls, v):
    if v <= 0:
        raise ValueError('Quantity must be positive')
    return v

@field_validator('price')
def price_must_be_positive(cls, v):
    if v <= 0:
        raise ValueError('Price must be positive')
    return v
```

