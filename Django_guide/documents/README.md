# Django REST Framework Backend Guide

A comprehensive guide for backend development with Django REST Framework (DRF), covering the Doctor API project implementation.

## Table of Contents

### Fundamentals
1. [Introduction to Django & DRF](./01-introduction.md) - Setup, project structure, and basics
2. [Models](./02-models.md) - Django ORM, relationships, and migrations
3. [Serializers](./03-serializers.md) - Data serialization and validation
4. [Views and ViewSets](./04-views-viewsets.md) - Class-based views, ViewSets, and Mixins

### Routing and Security
5. [URLs and Routing](./05-urls-routing.md) - URL patterns and routers
6. [Authentication and Permissions](./06-authentication-permissions.md) - Auth methods and custom permissions

### Advanced Topics
7. [Validation](./07-validation.md) - Field and object-level validation
8. [API Documentation](./08-api-documentation.md) - drf-spectacular, Swagger, ReDoc
9. [Testing](./09-testing.md) - Unit tests and API tests

### Project Implementation
10. [Project: Doctor API](./10-project-doctor-api.md) - Complete healthcare management API

---

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Django | 5.1.x | Web framework |
| Django REST Framework | 3.15.x | REST API toolkit |
| drf-spectacular | - | OpenAPI documentation |
| SQLite / PostgreSQL | - | Database |
| Python | 3.10+ | Programming language |

## Prerequisites

- Python >= 3.10
- pip
- Virtual environment (recommended)
- Basic Python knowledge

## Quick Start

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# Install dependencies
pip install django djangorestframework drf-spectacular

# Create project
django-admin startproject myproject
cd myproject

# Create app
python manage.py startapp myapp

# Run development server
python manage.py runserver
```

## Project Architecture

```
myproject/
├── myproject/              # Project configuration
│   ├── __init__.py
│   ├── settings.py         # Django settings
│   ├── urls.py             # Root URL configuration
│   ├── wsgi.py             # WSGI entry point
│   └── asgi.py             # ASGI entry point
├── myapp/                  # Application
│   ├── __init__.py
│   ├── admin.py            # Admin configuration
│   ├── apps.py             # App configuration
│   ├── models.py           # Database models
│   ├── serializers.py      # DRF serializers
│   ├── views.py            # API views
│   ├── urls.py             # App URLs
│   ├── permissions.py      # Custom permissions
│   └── tests.py            # Tests
├── manage.py               # Django CLI
└── requirements.txt        # Dependencies
```

## Django REST Framework Features

| Feature | Description |
|---------|-------------|
| Serializers | Convert complex data to JSON and validate input |
| ViewSets | Combine logic for multiple views in one class |
| Routers | Automatic URL routing for ViewSets |
| Authentication | Session, Token, JWT support |
| Permissions | Fine-grained access control |
| Browsable API | Interactive web interface for testing |
| Pagination | Built-in pagination support |
| Filtering | Filter querysets with query params |

## Comparison with Other Frameworks

| Aspect | Django REST | FastAPI | NestJS |
|--------|-------------|---------|--------|
| Language | Python | Python | TypeScript |
| ORM | Django ORM | SQLAlchemy | TypeORM |
| Validation | Serializers | Pydantic | class-validator |
| Docs | drf-spectacular | Auto (OpenAPI) | Swagger (manual) |
| Admin | Built-in | No | No |
| Async | Partial | Native | Native |

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01 | Initial documentation |

---

**Project:** Doctor API - Healthcare Management System
**Purpose:** Reference guide for Django REST Framework development
