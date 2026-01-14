from fastapi import FastAPI
from pydantic import BaseModel

# Create an instance of the FastAPI class
app = FastAPI(
    title="Sample FastAPI Application",
    description="This is a sample FastAPI application demonstrating basic features.",
    version="1.0.0",
    contact={
        "name": "API Support",
        "url": "http://www.example.com/support",
        "email": "emc.muzo@gmail.com",
    },
    license_info={
        "name": "MIT License",
        "url": "https://opensource.org/licenses/MIT",
    },
)


# Define a Pydantic model for request body validation
class Item(BaseModel):
    name: str
    description: str = None
    price: float
    tax: float = None
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
