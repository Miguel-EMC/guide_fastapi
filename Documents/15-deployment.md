# Production Deployment

This guide covers Docker, Gunicorn, environment configuration, cloud deployment, and production best practices.

## Deployment Options

| Option | Best For | Complexity |
|--------|----------|------------|
| **Uvicorn** | Development, small apps | Low |
| **Gunicorn + Uvicorn** | Production servers | Medium |
| **Docker** | Containerized deployments | Medium |
| **Kubernetes** | Large scale, enterprise | High |

## Gunicorn + Uvicorn (Recommended)

The industry-standard stack for FastAPI in production.

### Installation

```bash
pip install gunicorn uvicorn[standard]
```

### Basic Command

```bash
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
```

| Flag | Description |
|------|-------------|
| `-w 4` | Number of workers (CPU cores) |
| `-k uvicorn.workers.UvicornWorker` | Async worker class |
| `-b 0.0.0.0:8000` | Bind address and port |

### Gunicorn Configuration File

**gunicorn.conf.py**

```python
import multiprocessing

# Server socket
bind = "0.0.0.0:8000"
backlog = 2048

# Worker processes
workers = multiprocessing.cpu_count()
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 1000
timeout = 30
keepalive = 2

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s"'

# Process naming
proc_name = "fastapi-app"

# Server hooks
def on_starting(server):
    print("Starting Gunicorn server...")

def on_exit(server):
    print("Shutting down Gunicorn server...")
```

Run with config:

```bash
gunicorn app.main:app -c gunicorn.conf.py
```

### Worker Calculation

```python
# For async workers (Uvicorn)
workers = cpu_count

# For sync workers (traditional)
workers = (2 * cpu_count) + 1
```

## Docker Deployment

### Dockerfile

```dockerfile
# Use official Python image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY ./app ./app

# Create non-root user
RUN adduser --disabled-password --gecos '' appuser && \
    chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["gunicorn", "app.main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "-b", "0.0.0.0:8000"]
```

### Multi-Stage Dockerfile (Optimized)

```dockerfile
# Build stage
FROM python:3.11-slim as builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends gcc

COPY requirements.txt .
RUN pip wheel --no-cache-dir --no-deps --wheel-dir /app/wheels -r requirements.txt

# Production stage
FROM python:3.11-slim

WORKDIR /app

# Copy wheels from builder
COPY --from=builder /app/wheels /wheels
RUN pip install --no-cache /wheels/*

# Copy application
COPY ./app ./app

# Non-root user
RUN adduser --disabled-password appuser
USER appuser

EXPOSE 8000

CMD ["gunicorn", "app.main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "-b", "0.0.0.0:8000"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/appdb
      - SECRET_KEY=${SECRET_KEY}
      - DEBUG=false
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: postgres:15
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=appdb
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d appdb"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### Docker Commands

```bash
# Build image
docker build -t fastapi-app .

# Run container
docker run -d -p 8000:8000 --name api fastapi-app

# With environment variables
docker run -d -p 8000:8000 \
  -e DATABASE_URL=postgresql://... \
  -e SECRET_KEY=your-secret \
  fastapi-app

# Docker Compose
docker-compose up -d
docker-compose logs -f api
docker-compose down
```

## Environment Configuration

### .env File

```env
# Application
DEBUG=false
SECRET_KEY=your-very-long-and-random-secret-key
ALLOWED_HOSTS=example.com,www.example.com

# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/dbname

# Redis
REDIS_URL=redis://localhost:6379/0

# External Services
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASSWORD=email-password

# Logging
LOG_LEVEL=INFO
```

### Settings with Pydantic

```python
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Application
    debug: bool = False
    secret_key: str
    allowed_hosts: list[str] = ["localhost"]

    # Database
    database_url: str

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # JWT
    access_token_expire_minutes: int = 30

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
```

## Health Checks

```python
from fastapi import FastAPI, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

app = FastAPI()


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.get("/health/ready")
async def readiness_check(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "ready", "database": "connected"}
    except Exception as e:
        return {"status": "not ready", "database": str(e)}


@app.get("/health/live")
async def liveness_check():
    return {"status": "alive"}
```

## HTTPS & Reverse Proxy

### Nginx Configuration

```nginx
upstream fastapi {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    location / {
        proxy_pass http://fastapi;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static {
        alias /var/www/static;
    }
}
```

### Traefik (Docker)

```yaml
# docker-compose.yml with Traefik
version: '3.8'

services:
  traefik:
    image: traefik:v2.10
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock

  api:
    build: .
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`api.example.com`)"
      - "traefik.http.routers.api.entrypoints=websecure"
      - "traefik.http.routers.api.tls.certresolver=letsencrypt"
```

## Cloud Deployment

### AWS (ECS/Fargate)

```yaml
# task-definition.json
{
  "family": "fastapi-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "your-ecr-repo/fastapi-app:latest",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "DATABASE_URL", "value": "..."}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/fastapi-app",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### Google Cloud Run

```bash
# Build and deploy
gcloud builds submit --tag gcr.io/PROJECT_ID/fastapi-app
gcloud run deploy fastapi-app \
  --image gcr.io/PROJECT_ID/fastapi-app \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### Railway / Render / Fly.io

**Procfile** (for Railway/Render):

```
web: gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:$PORT
```

**fly.toml** (for Fly.io):

```toml
app = "fastapi-app"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "8000"

[http_service]
  internal_port = 8000
  force_https = true

[[services.ports]]
  port = 80
  handlers = ["http"]

[[services.ports]]
  port = 443
  handlers = ["tls", "http"]
```

## Production Checklist

### Security

- [ ] Use HTTPS (TLS/SSL)
- [ ] Set secure headers (HSTS, CSP)
- [ ] Enable CORS properly
- [ ] Use environment variables for secrets
- [ ] Implement rate limiting
- [ ] Keep dependencies updated

### Performance

- [ ] Use Gunicorn with Uvicorn workers
- [ ] Configure appropriate worker count
- [ ] Enable gzip compression
- [ ] Implement caching (Redis)
- [ ] Use connection pooling
- [ ] Add database indexes

### Monitoring

- [ ] Health check endpoints
- [ ] Structured logging
- [ ] Error tracking (Sentry)
- [ ] Metrics (Prometheus)
- [ ] Uptime monitoring

### Database

- [ ] Use connection pooling
- [ ] Configure timeouts
- [ ] Regular backups
- [ ] Migration strategy (Alembic)

## Summary

| Component | Production Choice |
|-----------|------------------|
| Server | Gunicorn + Uvicorn |
| Container | Docker |
| Reverse Proxy | Nginx / Traefik |
| Database | PostgreSQL |
| Cache | Redis |
| Secrets | Environment variables |
| SSL | Let's Encrypt |

## References

- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
- [Gunicorn Documentation](https://docs.gunicorn.org/)
- [Docker Best Practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- [FastAPI Docker Best Practices](https://betterstack.com/community/guides/scaling-python/fastapi-docker-best-practices/)
- [Render FastAPI Deployment](https://render.com/articles/fastapi-production-deployment-best-practices)

## Next Steps

- [Project: Todo API](./16-project-todo.md) - Complete project example

---

[Previous: Testing](./14-testing.md) | [Back to Index](./README.md) | [Next: Project Todo](./16-project-todo.md)
