# Introduction to Django & DRF

Django is a high-level Python web framework that encourages rapid development. Django REST Framework (DRF) extends Django to build powerful REST APIs.

## Why Django REST Framework?

| Feature | Benefit |
|---------|---------|
| Mature Ecosystem | Battle-tested, extensive documentation |
| Built-in Admin | Automatic admin interface for models |
| ORM | Powerful database abstraction |
| Security | CSRF protection, SQL injection prevention |
| Browsable API | Web interface for testing endpoints |
| Authentication | Multiple auth methods out of the box |
| Serialization | Automatic data conversion and validation |

## Installation

### Create Virtual Environment

```bash
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows
```

### Install Packages

```bash
pip install django
pip install djangorestframework
pip install drf-spectacular  # For API documentation
```

### Save Dependencies

```bash
pip freeze > requirements.txt
```

## Creating a Project

```bash
# Create Django project
django-admin startproject doctorapp .

# Create an app
python manage.py startapp doctors
python manage.py startapp patients
python manage.py startapp bookings
```

## Project Structure

```
doctor_api/
├── doctorapp/              # Project configuration
│   ├── __init__.py
│   ├── settings.py         # Configuration
│   ├── urls.py             # Root URLs
│   ├── wsgi.py             # WSGI config
│   └── asgi.py             # ASGI config
├── doctors/                # Doctors app
│   ├── __init__.py
│   ├── admin.py            # Admin registration
│   ├── apps.py             # App config
│   ├── models.py           # Database models
│   ├── serializers.py      # DRF serializers
│   ├── views.py            # API views
│   ├── viewsets.py         # ViewSets
│   ├── urls.py             # App URLs
│   ├── permissions.py      # Custom permissions
│   └── tests.py            # Tests
├── patients/               # Patients app
├── bookings/               # Bookings app
├── manage.py               # Django CLI
├── db.sqlite3              # SQLite database
└── requirements.txt        # Dependencies
```

## Configuration

### settings.py

```python
# doctorapp/settings.py

INSTALLED_APPS = [
    # Django built-in apps
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party apps
    'rest_framework',
    'drf_spectacular',

    # Local apps
    'doctors',
    'patients',
    'bookings',
]

# REST Framework configuration
REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.BasicAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10,
}

# drf-spectacular configuration
SPECTACULAR_SETTINGS = {
    'TITLE': 'Doctor API',
    'DESCRIPTION': 'Healthcare Management API',
    'VERSION': '1.0.0',
}
```

### Root URLs

```python
# doctorapp/urls.py
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('doctors.urls')),
    path('api/', include('patients.urls')),
    path('api/', include('bookings.urls')),
    path('api-auth/', include('rest_framework.urls')),
]
```

## Running the Application

### Database Migrations

```bash
# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate
```

### Create Superuser

```bash
python manage.py createsuperuser
```

### Run Development Server

```bash
python manage.py runserver
# Server starts at http://127.0.0.1:8000/
```

## Django Management Commands

| Command | Description |
|---------|-------------|
| `runserver` | Start development server |
| `migrate` | Apply database migrations |
| `makemigrations` | Create new migrations |
| `createsuperuser` | Create admin user |
| `shell` | Interactive Python shell |
| `test` | Run tests |
| `collectstatic` | Collect static files |
| `startapp` | Create new app |

## First API Endpoint

### Model

```python
# doctors/models.py
from django.db import models

class Doctor(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    qualification = models.CharField(max_length=200)

    def __str__(self):
        return f"Dr. {self.first_name} {self.last_name}"
```

### Serializer

```python
# doctors/serializers.py
from rest_framework import serializers
from .models import Doctor

class DoctorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Doctor
        fields = '__all__'
```

### View

```python
# doctors/views.py
from rest_framework import generics
from .models import Doctor
from .serializers import DoctorSerializer

class DoctorListView(generics.ListCreateAPIView):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer

class DoctorDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
```

### URLs

```python
# doctors/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('doctors/', views.DoctorListView.as_view(), name='doctor-list'),
    path('doctors/<int:pk>/', views.DoctorDetailView.as_view(), name='doctor-detail'),
]
```

## Admin Registration

```python
# doctors/admin.py
from django.contrib import admin
from .models import Doctor

@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    list_display = ['first_name', 'last_name', 'email', 'qualification']
    search_fields = ['first_name', 'last_name', 'email']
    list_filter = ['qualification']
```

## Request Flow

```
Client Request
      │
      ▼
┌─────────────────┐
│   URL Router    │  ─── Match URL pattern
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Authentication │  ─── Verify user identity
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Permissions   │  ─── Check access rights
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│      View       │  ─── Process request
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Serializer    │  ─── Validate/Transform data
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│     Model       │  ─── Database operations
└────────┬────────┘
         │
         ▼
    JSON Response
```

## Best Practices

| Practice | Description |
|----------|-------------|
| Use apps | Separate concerns into Django apps |
| Follow naming conventions | models.py, views.py, serializers.py |
| Register in admin | Easy data management |
| Use virtual environments | Isolate dependencies |
| Version control | Use git for code management |
| Environment variables | Never commit secrets |

---

## Next Steps

- [Models](./02-models.md) - Django ORM and relationships

---

[Back to Index](./README.md) | [Next: Models →](./02-models.md)
