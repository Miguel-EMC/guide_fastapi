# Deployment

Guide for deploying Django REST Framework applications to production.

## Production Checklist

```python
# settings.py

# Security
DEBUG = False
SECRET_KEY = os.environ.get('SECRET_KEY')
ALLOWED_HOSTS = ['yourdomain.com', 'www.yourdomain.com']

# HTTPS
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Security headers
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
```

---

## Environment Configuration

### Using python-dotenv

```bash
pip install python-dotenv
```

```python
# settings.py
from dotenv import load_dotenv
import os

load_dotenv()

SECRET_KEY = os.environ.get('SECRET_KEY')
DEBUG = os.environ.get('DEBUG', 'False').lower() == 'true'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME'),
        'USER': os.environ.get('DB_USER'),
        'PASSWORD': os.environ.get('DB_PASSWORD'),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}
```

```env
# .env
SECRET_KEY=your-super-secret-key-here
DEBUG=False
DB_NAME=doctor_api
DB_USER=postgres
DB_PASSWORD=your-db-password
DB_HOST=localhost
DB_PORT=5432

REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0

AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_STORAGE_BUCKET_NAME=your-bucket
```

### Split Settings

```python
# settings/base.py
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

INSTALLED_APPS = [...]
MIDDLEWARE = [...]
# Common settings

# settings/development.py
from .base import *

DEBUG = True
ALLOWED_HOSTS = ['localhost', '127.0.0.1']

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# settings/production.py
from .base import *

DEBUG = False
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '').split(',')

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME'),
        'USER': os.environ.get('DB_USER'),
        'PASSWORD': os.environ.get('DB_PASSWORD'),
        'HOST': os.environ.get('DB_HOST'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}

# Security settings
SECURE_SSL_REDIRECT = True
...
```

---

## WSGI Server (Gunicorn)

### Installation

```bash
pip install gunicorn
```

### Configuration

```python
# gunicorn.conf.py
import multiprocessing

# Server socket
bind = '0.0.0.0:8000'
backlog = 2048

# Workers
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = 'sync'
worker_connections = 1000
timeout = 30
keepalive = 2

# Process naming
proc_name = 'doctor_api'

# Logging
accesslog = '/var/log/gunicorn/access.log'
errorlog = '/var/log/gunicorn/error.log'
loglevel = 'info'

# Server mechanics
daemon = False
pidfile = '/var/run/gunicorn/doctor_api.pid'
user = 'www-data'
group = 'www-data'
```

### Running

```bash
# Development
gunicorn doctorapp.wsgi:application

# Production with config
gunicorn -c gunicorn.conf.py doctorapp.wsgi:application
```

---

## Nginx Configuration

```nginx
# /etc/nginx/sites-available/doctor_api
upstream doctor_api {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;

    # Logging
    access_log /var/log/nginx/doctor_api_access.log;
    error_log /var/log/nginx/doctor_api_error.log;

    # Max upload size
    client_max_body_size 10M;

    # Static files
    location /static/ {
        alias /var/www/doctor_api/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Media files
    location /media/ {
        alias /var/www/doctor_api/media/;
        expires 7d;
    }

    # API
    location / {
        proxy_pass http://doctor_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support (if needed)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Health check
    location /health/ {
        proxy_pass http://doctor_api;
        access_log off;
    }
}
```

---

## Docker Deployment

### Dockerfile

```dockerfile
# Dockerfile
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set work directory
WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Collect static files
RUN python manage.py collectstatic --noinput

# Run gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "doctorapp.wsgi:application"]
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    build: .
    command: gunicorn doctorapp.wsgi:application --bind 0.0.0.0:8000
    volumes:
      - static_volume:/app/static
      - media_volume:/app/media
    expose:
      - 8000
    environment:
      - DEBUG=False
      - SECRET_KEY=${SECRET_KEY}
      - DB_HOST=db
      - DB_NAME=doctor_api
      - DB_USER=postgres
      - DB_PASSWORD=${DB_PASSWORD}
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis

  db:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=doctor_api
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=${DB_PASSWORD}

  redis:
    image: redis:alpine
    volumes:
      - redis_data:/data

  celery-worker:
    build: .
    command: celery -A doctorapp worker -l info
    environment:
      - DEBUG=False
      - SECRET_KEY=${SECRET_KEY}
      - DB_HOST=db
      - DB_NAME=doctor_api
      - DB_USER=postgres
      - DB_PASSWORD=${DB_PASSWORD}
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis

  celery-beat:
    build: .
    command: celery -A doctorapp beat -l info
    environment:
      - DEBUG=False
      - SECRET_KEY=${SECRET_KEY}
      - DB_HOST=db
      - DB_NAME=doctor_api
      - DB_USER=postgres
      - DB_PASSWORD=${DB_PASSWORD}
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - static_volume:/var/www/static
      - media_volume:/var/www/media
      - ./certs:/etc/nginx/certs
    depends_on:
      - web

volumes:
  postgres_data:
  redis_data:
  static_volume:
  media_volume:
```

### Docker Commands

```bash
# Build and run
docker-compose up -d --build

# View logs
docker-compose logs -f web

# Run migrations
docker-compose exec web python manage.py migrate

# Create superuser
docker-compose exec web python manage.py createsuperuser

# Scale workers
docker-compose up -d --scale celery-worker=3
```

---

## Systemd Services

### Gunicorn Service

```ini
# /etc/systemd/system/doctor_api.service
[Unit]
Description=Doctor API Gunicorn Daemon
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/doctor_api
ExecStart=/var/www/doctor_api/venv/bin/gunicorn \
    --workers 3 \
    --bind unix:/run/gunicorn/doctor_api.sock \
    doctorapp.wsgi:application
Restart=always

[Install]
WantedBy=multi-user.target
```

### Celery Service

```ini
# /etc/systemd/system/celery.service
[Unit]
Description=Celery Worker
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/doctor_api
ExecStart=/var/www/doctor_api/venv/bin/celery \
    -A doctorapp worker -l info
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start services
sudo systemctl enable doctor_api
sudo systemctl start doctor_api
sudo systemctl enable celery
sudo systemctl start celery
```

---

## Database Migrations in Production

```bash
# Backup database before migration
pg_dump doctor_api > backup_$(date +%Y%m%d).sql

# Run migrations
python manage.py migrate --plan  # Preview
python manage.py migrate         # Execute

# Docker
docker-compose exec web python manage.py migrate
```

---

## Static Files

```python
# settings.py
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# For WhiteNoise
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # Add after SecurityMiddleware
    ...
]

STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
```

```bash
# Collect static files
python manage.py collectstatic --noinput
```

---

## Health Check Endpoint

```python
# doctors/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import connection

class HealthCheckView(APIView):
    permission_classes = []

    def get(self, request):
        # Check database
        try:
            with connection.cursor() as cursor:
                cursor.execute('SELECT 1')
            db_status = 'healthy'
        except Exception as e:
            db_status = f'unhealthy: {e}'

        # Check Redis
        try:
            from django.core.cache import cache
            cache.set('health_check', 'ok', 10)
            cache.get('health_check')
            cache_status = 'healthy'
        except Exception as e:
            cache_status = f'unhealthy: {e}'

        status = 'healthy' if db_status == 'healthy' and cache_status == 'healthy' else 'unhealthy'

        return Response({
            'status': status,
            'database': db_status,
            'cache': cache_status,
        })
```

```python
# urls.py
from doctors.views import HealthCheckView

urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='health-check'),
    ...
]
```

---

## Deployment Checklist

| Task | Command/Action |
|------|----------------|
| Set DEBUG=False | Environment variable |
| Set SECRET_KEY | Strong random key |
| Configure ALLOWED_HOSTS | Domain names |
| Enable HTTPS | SSL certificates |
| Collect static files | `collectstatic` |
| Run migrations | `migrate` |
| Create superuser | `createsuperuser` |
| Configure logging | File-based logging |
| Set up monitoring | Health checks |
| Configure backups | Database backups |

---

## Next Steps

- [Logging](./21-logging.md) - Application logging

---

[← Previous: Admin Customization](./19-admin-customization.md) | [Back to Index](./README.md) | [Next: Logging →](./21-logging.md)
