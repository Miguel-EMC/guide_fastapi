# Response Models and Status Codes (Part 3)

## 4. Response Schemas and Documentation

### Documenting Responses with OpenAPI

FastAPI automatically generates OpenAPI documentation for your API, including response schemas:

```python
from fastapi import FastAPI, status
from pydantic import BaseModel
from typing import List, Dict, Any

app = FastAPI(
    title="My FastAPI Application",
    description="This is a sample FastAPI application demonstrating response models and status codes",
    version="0.1.0"
)

class Item(BaseModel):
    id: int
    name: str
    description: str

@app.get(
    "/items/{item_id}",
    response_model=Item,
    responses={
        200: {
            "description": "Item found successfully",
            "content": {
                "application/json": {
                    "example": {"id": 1, "name": "Example Item", "description": "This is an example item"}
                }
            }
        },
        404: {
            "description": "Item not found",
            "content": {
                "application/json": {
                    "example": {"detail": "Item not found"}
                }
            }
        }
    }
)
async def read_item(item_id: int):
    if item_id == 0:
        return {"detail": "Item not found"}, 404
    return {"id": item_id, "name": "Example Item", "description": "This is an example item"}
```

### Adding Examples to Response Schema

You can provide examples in your response documentation:

```python
from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import Dict, Any, List

app = FastAPI()

class Item(BaseModel):
    id: int
    name: str
    description: str

    # Pydantic V2 example
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": 1,
                    "name": "Smartphone",
                    "description": "Latest model smartphone with 5G capability"
                }
            ]
        }
    }

@app.get(
    "/items/",
    response_model=List[Item],
    description="Retrieve a list of items",
    summary="Get all items",
    response_description="List of available items"
)
async def read_items():
    return [
        {"id": 1, "name": "Item 1", "description": "Description 1"},
        {"id": 2, "name": "Item 2", "description": "Description 2"}
    ]
```

### Using Tags for Better Documentation

Organize your API documentation with tags:

```python
from fastapi import FastAPI, status
from pydantic import BaseModel

app = FastAPI()

class Item(BaseModel):
    id: int
    name: str

@app.get(
    "/items/",
    response_model=list[Item],
    status_code=status.HTTP_200_OK,
    tags=["items"],
    summary="Retrieve all items",
    description="Get a list of all available items in the system"
)
async def read_items():
    return [
        {"id": 1, "name": "Item 1"},
        {"id": 2, "name": "Item 2"}
    ]

@app.post(
    "/items/",
    response_model=Item,
    status_code=status.HTTP_201_CREATED,
    tags=["items"],
    summary="Create a new item",
    description="Create a new item with the provided details"
)
async def create_item(name: str):
    return {"id": 1, "name": name}
```

### Complete Documentation Example

Here's a more complete example showing how to document responses:

```python
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum
import uuid

app = FastAPI(
    title="Product API",
    description="API for managing products with detailed response documentation",
    version="1.0.0"
)

class Category(str, Enum):
    ELECTRONICS = "electronics"
    CLOTHING = "clothing"
    BOOKS = "books"
    OTHER = "other"

class ProductBase(BaseModel):
    name: str = Field(..., example="Smartphone X", description="Name of the product")
    price: float = Field(..., example=799.99, description="Price in USD")
    category: Category = Field(default=Category.OTHER, example=Category.ELECTRONICS, description="Product category")
    description: Optional[str] = Field(None, example="Latest model with advanced features", description="Detailed description")
    in_stock: bool = Field(default=True, example=True, description="Availability status")

class ProductCreate(ProductBase):
    pass

class Product(ProductBase):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, example="3fa85f64-5717-4562-b3fc-2c963f66afa6", description="Unique identifier")
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                    "name": "Smartphone X",
                    "price": 799.99,
                    "category": "electronics",
                    "description": "Latest model with advanced features",
                    "in_stock": True
                }
            ]
        }
    }

class ProductList(BaseModel):
    items: List[Product]
    count: int
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "items": [
                        {
                            "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                            "name": "Smartphone X",
                            "price": 799.99,
                            "category": "electronics",
                            "description": "Latest model with advanced features",
                            "in_stock": True
                        }
                    ],
                    "count": 1
                }
            ]
        }
    }

class ErrorResponse(BaseModel):
    detail: str
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "detail": "Product not found"
                }
            ]
        }
    }

@app.post(
    "/products/",
    response_model=Product,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new product",
    description="Add a new product to the database",
    response_description="The created product",
    tags=["products"],
    responses={
        201: {
            "description": "Product created successfully",
            "content": {
                "application/json": {
                    "example": {
                        "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                        "name": "Smartphone X",
                        "price": 799.99,
                        "category": "electronics",
                        "description": "Latest model with advanced features",
                        "in_stock": True
                    }
                }
            }
        },
        422: {
            "model": ErrorResponse,
            "description": "Validation Error"
        }
    }
)
async def create_product(product: ProductCreate):
    # In a real application, you'd add this to a database
    product_dict = product.model_dump()
    product_dict["id"] = uuid.uuid4()
    return product_dict

@app.get(
    "/products/",
    response_model=ProductList,
    status_code=status.HTTP_200_OK,
    summary="Get all products",
    description="Retrieve a list of all available products",
    response_description="List of products",
    tags=["products"],
    responses={
        200: {
            "description": "List of products retrieved successfully"
        },
        500: {
            "model": ErrorResponse,
            "description": "Internal server error"
        }
    }
)
async def read_products():
    # In a real application, you'd fetch this from a database
    return {
        "items": [
            {
                "id": uuid.uuid4(),
                "name": "Smartphone X",
                "price": 799.99,
                "category": "electronics",
                "description": "Latest model with advanced features",
                "in_stock": True
            }
        ],
        "count": 1
    }

@app.get(
    "/products/{product_id}",
    response_model=Product,
    status_code=status.HTTP_200_OK,
    summary="Get a specific product",
    description="Retrieve a specific product by ID",
    response_description="The requested product",
    tags=["products"],
    responses={
        200: {
            "description": "Product found successfully"
        },
        404: {
            "model": ErrorResponse,
            "description": "Product not found"
        }
    }
)
async def read_product(product_id: uuid.UUID):
    # This is an example - in a real application, check if product exists
    if product_id == uuid.UUID('00000000-0000-0000-0000-000000000000'):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
            headers={"X-Error-Code": "PRODUCT_NOT_FOUND"}
        )
    # In a real application, fetch this from a database
    return {
        "id": product_id,
        "name": "Smartphone X",
        "price": 799.99,
        "category": "electronics",
        "description": "Latest model with advanced features",
        "in_stock": True
    }
```

### Viewing Your API Documentation

Once your FastAPI application is running, you can access the automatically generated documentation:

-   **Swagger UI**: `http://localhost:8000/docs`
-   **ReDoc**: `http://localhost:8000/redoc`

These interactive documentation pages allow you to:

-   See all available endpoints
-   View request and response schemas
-   Test endpoints directly from the browser
-   See status codes and response examples
