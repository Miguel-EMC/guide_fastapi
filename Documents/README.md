# FastAPI Complete Guide - From Beginner to Production

A comprehensive guide to building modern, scalable APIs with FastAPI, Pydantic, and SQLAlchemy.

## Table of Contents

### Getting Started

1. [Introduction & Setup](./01-introduction.md)
   - What is FastAPI and why use it
   - Installation and environment setup
   - Your first FastAPI application
   - Interactive documentation (Swagger UI & ReDoc)

2. [Routing & Endpoints](./02-routing.md)
   - HTTP methods and decorators
   - Path parameters with type hints
   - Query parameters and validation
   - Route ordering and precedence

### Data Handling

3. [Data Validation with Pydantic](./03-data-validation.md)
   - Pydantic models fundamentals
   - Field validation and constraints
   - Custom validators
   - Serialization and deserialization

4. [Request Bodies & Form Data](./04-request-bodies.md)
   - JSON request bodies
   - Form data handling
   - File uploads
   - Headers and cookies

5. [Response Models & Status Codes](./05-response-models.md)
   - Response model configuration
   - HTTP status codes
   - Response documentation
   - Multiple response types

### Error Management

6. [Error Handling](./06-error-handling.md)
   - HTTPException usage
   - Custom exception handlers
   - Validation error handling
   - Global error middleware

### Database Integration

7. [Database Setup & Configuration](./07-database-setup.md)
   - SQLAlchemy 2.0+ integration
   - Async database connections
   - Dependency injection
   - Lifespan events (modern approach)

8. [CRUD Operations](./08-crud-operations.md)
   - Create, Read, Update, Delete patterns
   - Pagination and filtering
   - Soft delete implementation
   - Transaction management

9. [Database Migrations](./09a-database-migrations.md)
   - Alembic setup and configuration
   - Auto-generating migrations
   - Running and rolling back migrations
   - Data migrations and best practices

10. [Database Relationships](./09-database-relationships.md)
   - One-to-One relationships
   - One-to-Many relationships
   - Many-to-Many relationships
   - Eager vs lazy loading

### Authentication & Security

11. [Basic Authentication](./10-authentication-basics.md)
    - HTTP Basic and API Key auth
    - OAuth2 password flow
    - Password hashing with bcrypt
    - Session management

12. [JWT Authentication](./11-jwt-authentication.md)
    - JWT token creation and validation
    - Access and refresh tokens
    - Protected routes
    - Token revocation

13. [Role-Based Access Control](./12-rbac.md)
    - User roles and permissions
    - Route protection by role
    - Permission-based access
    - Resource ownership

### Advanced Patterns

14. [Project Architecture](./13-architecture.md)
    - Async vs Sync (when to use each)
    - Middleware (logging, CORS, timing)
    - Background tasks
    - Rate limiting and caching
    - Structured logging
    - API versioning

15. [Testing](./14-testing.md)
    - pytest and TestClient setup
    - Async testing with httpx
    - Fixtures and mocking
    - Test organization and coverage

16. [Production Deployment](./15-deployment.md)
    - Gunicorn + Uvicorn configuration
    - Docker and docker-compose
    - Environment configuration
    - Cloud deployment (AWS, GCP, Railway)
    - Production checklist

### Practical Projects

17. [Project: Todo List API](./16-project-todo.md)
    - Complete application structure
    - Authentication integration
    - Full CRUD implementation
    - Test suite

## Technology Stack

| Technology | Purpose | Version |
|------------|---------|---------|
| **FastAPI** | Web framework | 0.109+ |
| **Pydantic** | Data validation | 2.0+ |
| **SQLAlchemy** | ORM | 2.0+ |
| **Alembic** | Database migrations | 1.13+ |
| **Uvicorn** | ASGI server | 0.25+ |
| **Python** | Programming language | 3.10+ |

## Quick Start

### Prerequisites

- Python 3.10 or higher
- pip or uv package manager
- Code editor (VS Code recommended)
- Basic Python knowledge

### Installation

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/macOS
# venv\Scripts\activate   # Windows

# Install FastAPI with all dependencies
pip install "fastapi[standard]"
```

### Hello World

```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Hello, World!"}
```

Run with:

```bash
uvicorn main:app --reload
```

Visit `http://localhost:8000/docs` for interactive documentation.

## Architecture Overview

This guide follows a **modular monolith** architecture:

```
project/
├── app/
│   ├── core/              # Core utilities
│   │   ├── config.py      # Settings (pydantic-settings)
│   │   ├── database.py    # Database connection
│   │   └── security.py    # Auth utilities
│   ├── models/            # SQLAlchemy models
│   ├── schemas/           # Pydantic schemas
│   ├── services/          # Business logic
│   ├── routers/           # API routes
│   └── main.py            # Application entry
├── tests/                 # Test files
├── .env                   # Environment variables
├── Dockerfile
└── requirements.txt
```

## Design Patterns

### Request Flow

```
Client Request
     ↓
Middleware (logging, CORS, auth)
     ↓
Router (router.py) → HTTP handling
     ↓
Schema (schemas.py) → Validation
     ↓
Service (service.py) → Business logic
     ↓
Model (models.py) → Database
     ↓
Response → JSON to client
```

### Layer Responsibilities

| Layer | File | Responsibility |
|-------|------|----------------|
| **Router** | `router.py` | HTTP endpoints, request/response |
| **Schema** | `schemas.py` | Data validation, serialization |
| **Service** | `service.py` | Business logic, queries |
| **Model** | `models.py` | Database tables |

## Best Practices Summary

### Performance

- Use `async def` for I/O-bound operations
- Use `def` (sync) for CPU-bound operations
- Implement pagination for list endpoints
- Use connection pooling for databases
- Add caching for frequently accessed data

### Security

- Always hash passwords (bcrypt)
- Use environment variables for secrets
- Validate all input with Pydantic
- Implement proper CORS
- Use HTTPS in production
- Add rate limiting

### Code Organization

- One module per feature
- Separate concerns (models, schemas, services, routers)
- Use dependency injection
- Keep business logic in services, not routers
- Write tests for all endpoints

### Modern FastAPI (2025+)

- Use `lifespan` instead of `@app.on_event` (deprecated)
- Use Pydantic V2 (`model_dump()`, `ConfigDict`)
- Use SQLAlchemy 2.0 (`Mapped`, async sessions)
- Use `httpx` for async HTTP testing

## Bibliography & References

### Official Documentation

- [FastAPI Official Documentation](https://fastapi.tiangolo.com/)
- [Pydantic V2 Documentation](https://docs.pydantic.dev/)
- [SQLAlchemy 2.0 Documentation](https://docs.sqlalchemy.org/)
- [Uvicorn Documentation](https://www.uvicorn.org/)
- [Starlette Documentation](https://www.starlette.io/)

### Best Practices & Guides

- [FastAPI Best Practices - Zhanymkanov (GitHub)](https://github.com/zhanymkanov/fastapi-best-practices)
- [FastAPI Production Deployment - Render](https://render.com/articles/fastapi-production-deployment-best-practices)
- [FastAPI Docker Best Practices - Better Stack](https://betterstack.com/community/guides/scaling-python/fastapi-docker-best-practices/)
- [FastAPI Deployment Guide 2025 - ZestMinds](https://www.zestminds.com/blog/fastapi-deployment-guide/)

### Security

- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [JWT Introduction - jwt.io](https://jwt.io/introduction)
- [OAuth 2.0 Simplified](https://aaronparecki.com/oauth-2-simplified/)

### Testing

- [pytest Documentation](https://docs.pytest.org/)
- [pytest-asyncio](https://pytest-asyncio.readthedocs.io/)
- [HTTPX Documentation](https://www.python-httpx.org/)

### Database & Migrations

- [Alembic Documentation](https://alembic.sqlalchemy.org/)
- [SQLAlchemy Migrations Guide](https://docs.sqlalchemy.org/en/20/core/metadata.html#altering-database-objects-through-migrations)

### Deployment & DevOps

- [Gunicorn Documentation](https://docs.gunicorn.org/)
- [Docker Best Practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- [12-Factor App Methodology](https://12factor.net/)

### Additional Resources

- [Real Python - FastAPI Tutorials](https://realpython.com/tutorials/fastapi/)
- [TestDriven.io - FastAPI](https://testdriven.io/blog/topics/fastapi/)
- [Full Stack FastAPI Template](https://github.com/tiangolo/full-stack-fastapi-template)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.1 | Jan 2026 | Added Alembic database migrations guide |
| 2.0 | Jan 2026 | Added testing, deployment, RBAC, async patterns |
| 1.0 | Jan 2026 | Initial comprehensive guide |

## Contributing

This guide is open for contributions:

- Report issues
- Suggest improvements
- Add new examples
- Fix errors

## License

This guide is provided for educational purposes.

---

**Start your journey:** [Introduction & Setup](./01-introduction.md)
