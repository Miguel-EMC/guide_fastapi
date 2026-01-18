# Request Bodies & Form Data

This guide covers JSON request bodies, form data, file uploads, headers, and cookies in FastAPI.

## Prerequisites

Install required packages:

```bash
pip install fastapi uvicorn python-multipart
```

- `python-multipart` is required for form data and file uploads

## JSON Request Bodies

FastAPI uses Pydantic models to validate JSON request bodies automatically.

### Basic Example

```python
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional

app = FastAPI()

class Item(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    tax: Optional[float] = None
    tags: list[str] = []

@app.post("/items/")
async def create_item(item: Item):
    item_dict = item.model_dump()

    if item.tax:
        item_dict["price_with_tax"] = item.price + item.tax

    return item_dict
```

**Request:**

```bash
curl -X POST http://localhost:8000/items/ \
  -H "Content-Type: application/json" \
  -d '{"name": "Keyboard", "price": 59.99, "tax": 5.50}'
```

### How FastAPI Handles Request Bodies

| Step | Description |
|------|-------------|
| 1 | Reads request body as JSON |
| 2 | Validates against Pydantic model |
| 3 | Converts to Python object |
| 4 | Returns 422 if validation fails |

### Nested Models

```python
class Address(BaseModel):
    street: str
    city: str
    postal_code: str
    country: str = "USA"

class User(BaseModel):
    username: str
    email: str
    addresses: list[Address]

@app.post("/users/")
async def create_user(user: User):
    return user
```

**Request:**

```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "addresses": [
    {
      "street": "123 Main St",
      "city": "New York",
      "postal_code": "10001"
    }
  ]
}
```

### Multiple Body Parameters

```python
class Item(BaseModel):
    name: str
    price: float

class User(BaseModel):
    username: str
    email: str

@app.post("/orders/")
async def create_order(item: Item, user: User):
    return {"item": item, "user": user}
```

**Expected JSON structure:**

```json
{
  "item": {"name": "Product", "price": 29.99},
  "user": {"username": "john", "email": "john@example.com"}
}
```

### Embedding Single Body

Use `Body(embed=True)` to wrap a single model:

```python
from fastapi import Body

@app.post("/items/")
async def create_item(item: Item = Body(embed=True)):
    return item
```

**Expected JSON:**

```json
{
  "item": {"name": "Product", "price": 29.99}
}
```

## Form Data

For HTML forms and `multipart/form-data` requests.

### Basic Form

```python
from fastapi import FastAPI, Form

app = FastAPI()

@app.post("/login/")
async def login(
    username: str = Form(),
    password: str = Form()
):
    return {"username": username}
```

**Request:**

```bash
curl -X POST http://localhost:8000/login/ \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=johndoe&password=secret"
```

### Optional Form Fields

```python
from typing import Optional

@app.post("/profile/")
async def update_profile(
    username: str = Form(),
    full_name: Optional[str] = Form(None),
    bio: Optional[str] = Form(None)
):
    return {
        "username": username,
        "full_name": full_name,
        "bio": bio
    }
```

### Form vs JSON

| Feature | Form Data | JSON Body |
|---------|-----------|-----------|
| Content-Type | `application/x-www-form-urlencoded` | `application/json` |
| Declaration | `Form()` | Pydantic model |
| File upload | Supported | Not supported |
| Nested data | Manual parsing | Automatic |

## File Uploads

### Single File

```python
from fastapi import FastAPI, File, UploadFile

app = FastAPI()

@app.post("/upload/")
async def upload_file(file: UploadFile):
    content = await file.read()

    return {
        "filename": file.filename,
        "content_type": file.content_type,
        "size": len(content)
    }
```

**Request:**

```bash
curl -X POST http://localhost:8000/upload/ \
  -F "file=@/path/to/file.txt"
```

### UploadFile Attributes

| Attribute | Description |
|-----------|-------------|
| `filename` | Original filename |
| `content_type` | MIME type |
| `file` | SpooledTemporaryFile |

### UploadFile Methods

| Method | Description |
|--------|-------------|
| `await file.read()` | Read entire content |
| `await file.read(size)` | Read specific bytes |
| `await file.seek(offset)` | Move to position |
| `await file.write(data)` | Write data |
| `await file.close()` | Close file |

### Multiple Files

```python
@app.post("/upload-multiple/")
async def upload_files(files: list[UploadFile]):
    return [
        {
            "filename": file.filename,
            "size": len(await file.read())
        }
        for file in files
    ]
```

**Request:**

```bash
curl -X POST http://localhost:8000/upload-multiple/ \
  -F "files=@file1.txt" \
  -F "files=@file2.txt"
```

### File with Form Data

```python
@app.post("/upload-with-info/")
async def upload_with_info(
    file: UploadFile,
    description: str = Form(),
    category: str = Form()
):
    content = await file.read()
    return {
        "filename": file.filename,
        "size": len(content),
        "description": description,
        "category": category
    }
```

### Save Uploaded File

```python
import shutil
from pathlib import Path

@app.post("/save-file/")
async def save_file(file: UploadFile):
    upload_dir = Path("uploads")
    upload_dir.mkdir(exist_ok=True)

    file_path = upload_dir / file.filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"saved_to": str(file_path)}
```

## Headers

### Reading Headers

```python
from fastapi import Header
from typing import Optional

@app.get("/headers/")
async def read_headers(
    user_agent: Optional[str] = Header(None),
    x_token: Optional[str] = Header(None),
    accept_language: Optional[list[str]] = Header(None)
):
    return {
        "User-Agent": user_agent,
        "X-Token": x_token,
        "Accept-Language": accept_language
    }
```

### Header Name Conversion

| HTTP Header | Python Parameter |
|-------------|------------------|
| `User-Agent` | `user_agent` |
| `Accept-Language` | `accept_language` |
| `X-Custom-Header` | `x_custom_header` |

To disable conversion:

```python
x_token: str = Header(None, convert_underscores=False)
```

### Header Validation

```python
from fastapi import HTTPException, Depends

async def verify_token(x_token: str = Header()):
    if x_token != "valid-token":
        raise HTTPException(status_code=401, detail="Invalid token")
    return x_token

@app.get("/protected/")
async def protected_route(token: str = Depends(verify_token)):
    return {"message": "Access granted"}
```

## Cookies

### Reading Cookies

```python
from fastapi import Cookie
from typing import Optional

@app.get("/cookies/")
async def read_cookies(
    session_id: Optional[str] = Cookie(None),
    preferences: Optional[str] = Cookie(None)
):
    return {
        "session_id": session_id,
        "preferences": preferences
    }
```

### Setting Cookies

```python
from fastapi import Response

@app.post("/set-cookies/")
async def set_cookies(response: Response):
    response.set_cookie(
        key="session_id",
        value="abc123",
        max_age=3600,           # 1 hour
        httponly=True,          # Not accessible via JS
        secure=True,            # HTTPS only
        samesite="lax"          # CSRF protection
    )
    return {"message": "Cookie set"}
```

### Cookie Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `key` | Cookie name | Required |
| `value` | Cookie value | Required |
| `max_age` | Lifetime in seconds | Session |
| `expires` | Expiration datetime | None |
| `path` | Valid URL path | `/` |
| `domain` | Valid domain | Current |
| `secure` | HTTPS only | False |
| `httponly` | No JS access | False |
| `samesite` | `lax`, `strict`, `none` | `lax` |

### Deleting Cookies

```python
@app.post("/logout/")
async def logout(response: Response):
    response.delete_cookie("session_id")
    return {"message": "Logged out"}
```

## Combining Parameters

```python
@app.post("/complete-example/")
async def complete_example(
    # Path parameter
    item_id: int,
    # Query parameter
    q: Optional[str] = None,
    # Form data
    name: str = Form(),
    # File upload
    image: UploadFile = File(...),
    # Header
    x_token: str = Header(),
    # Cookie
    session_id: Optional[str] = Cookie(None)
):
    return {
        "item_id": item_id,
        "query": q,
        "name": name,
        "image": image.filename,
        "token": x_token,
        "session": session_id
    }
```

## Parameter Detection Rules

| Declaration | Type |
|-------------|------|
| In path `{param}` | Path parameter |
| `Form()` | Form data |
| `File()` or `UploadFile` | File upload |
| `Header()` | HTTP header |
| `Cookie()` | Cookie |
| Pydantic model | Request body |
| Simple type | Query parameter |

## Best Practices

### Security

```python
# Always validate file types
ALLOWED_TYPES = {"image/jpeg", "image/png", "application/pdf"}

@app.post("/upload-safe/")
async def upload_safe(file: UploadFile):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, "File type not allowed")
    # Process file...
```

### File Size Limits

```python
MAX_SIZE = 5 * 1024 * 1024  # 5MB

@app.post("/upload-limited/")
async def upload_limited(file: UploadFile):
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(413, "File too large")
    # Process file...
```

### Streaming Large Files

```python
@app.post("/upload-stream/")
async def upload_stream(file: UploadFile):
    chunk_size = 1024 * 1024  # 1MB chunks

    with open(f"uploads/{file.filename}", "wb") as buffer:
        while chunk := await file.read(chunk_size):
            buffer.write(chunk)

    return {"status": "uploaded"}
```

## Summary

| Data Type | Declaration | Use Case |
|-----------|-------------|----------|
| JSON Body | Pydantic model | API data |
| Form Data | `Form()` | HTML forms |
| Files | `UploadFile` | File uploads |
| Headers | `Header()` | Auth tokens |
| Cookies | `Cookie()` | Sessions |

## Next Steps

- [Response Models](./05-response-models.md) - Configure API responses
- [Error Handling](./06-error-handling.md) - Handle errors gracefully

---

[Previous: Data Validation](./03-data-validation.md) | [Back to Index](./README.md) | [Next: Response Models](./05-response-models.md)
