# Middleware

Middleware processes requests and responses globally before they reach views or after views return.

## Middleware Architecture

```
Request → Middleware 1 → Middleware 2 → ... → View
Response ← Middleware 1 ← Middleware 2 ← ... ← View
```

---

## Built-in Middleware

```python
# settings.py
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',  # CORS (add before CommonMiddleware)
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]
```

---

## Custom Middleware

### Basic Structure

```python
# doctors/middleware.py

class SimpleMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        # One-time configuration

    def __call__(self, request):
        # Code before view (request phase)
        print(f'Request: {request.method} {request.path}')

        response = self.get_response(request)

        # Code after view (response phase)
        print(f'Response: {response.status_code}')

        return response
```

### Function-Based Middleware

```python
# doctors/middleware.py

def simple_middleware(get_response):
    # One-time configuration

    def middleware(request):
        # Before view
        response = get_response(request)
        # After view
        return response

    return middleware
```

---

## Practical Middleware Examples

### Request Logging

```python
# doctors/middleware.py
import logging
import time
import json

logger = logging.getLogger('api')

class RequestLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Start timer
        start_time = time.time()

        # Log request
        logger.info(f'Request: {request.method} {request.path}')

        # Get response
        response = self.get_response(request)

        # Calculate duration
        duration = time.time() - start_time

        # Log response
        logger.info(
            f'Response: {response.status_code} '
            f'Duration: {duration:.3f}s '
            f'Path: {request.path}'
        )

        return response
```

### Request ID Tracking

```python
# doctors/middleware.py
import uuid

class RequestIDMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Generate or get request ID
        request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
        request.request_id = request_id

        response = self.get_response(request)

        # Add to response headers
        response['X-Request-ID'] = request_id

        return response
```

### JSON Error Response

```python
# doctors/middleware.py
from django.http import JsonResponse

class JSONErrorMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        return response

    def process_exception(self, request, exception):
        """Convert exceptions to JSON responses."""
        return JsonResponse({
            'error': str(exception),
            'type': exception.__class__.__name__,
        }, status=500)
```

### API Version Middleware

```python
# doctors/middleware.py

class APIVersionMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Get API version from header
        api_version = request.headers.get('X-API-Version', 'v1')
        request.api_version = api_version

        response = self.get_response(request)

        # Add version to response
        response['X-API-Version'] = api_version

        return response
```

### Response Time Header

```python
# doctors/middleware.py
import time

class ResponseTimeMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start_time = time.time()

        response = self.get_response(request)

        duration = time.time() - start_time
        response['X-Response-Time'] = f'{duration:.3f}s'

        return response
```

### Maintenance Mode

```python
# doctors/middleware.py
from django.http import JsonResponse
from django.conf import settings

class MaintenanceModeMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if getattr(settings, 'MAINTENANCE_MODE', False):
            # Allow admin access
            if request.path.startswith('/admin/'):
                return self.get_response(request)

            # Allow health check
            if request.path == '/health/':
                return self.get_response(request)

            return JsonResponse({
                'error': 'Service is under maintenance',
                'retry_after': 3600,
            }, status=503)

        return self.get_response(request)
```

---

## CORS Configuration

### Installation

```bash
pip install django-cors-headers
```

### Configuration

```python
# settings.py
INSTALLED_APPS = [
    ...
    'corsheaders',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # Must be before CommonMiddleware
    'django.middleware.common.CommonMiddleware',
    ...
]

# CORS Settings
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:8080',
    'https://yourfrontend.com',
]

# Or allow all (development only)
CORS_ALLOW_ALL_ORIGINS = True

# Allow credentials
CORS_ALLOW_CREDENTIALS = True

# Allowed headers
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'x-api-version',
]

# Allowed methods
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

# Expose headers to frontend
CORS_EXPOSE_HEADERS = [
    'X-Request-ID',
    'X-Response-Time',
    'X-API-Version',
]
```

### Dynamic CORS

```python
# settings.py
CORS_ALLOWED_ORIGIN_REGEXES = [
    r'^https://\w+\.example\.com$',
]
```

---

## Authentication Middleware

### JWT Middleware (Custom)

```python
# doctors/middleware.py
import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from django.http import JsonResponse

User = get_user_model()

class JWTAuthenticationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Skip for public endpoints
        public_paths = ['/api/auth/login/', '/api/auth/register/', '/health/']
        if request.path in public_paths:
            return self.get_response(request)

        # Get token from header
        auth_header = request.headers.get('Authorization', '')

        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]

            try:
                payload = jwt.decode(
                    token,
                    settings.SECRET_KEY,
                    algorithms=['HS256']
                )
                user = User.objects.get(pk=payload['user_id'])
                request.user = user

            except jwt.ExpiredSignatureError:
                return JsonResponse({'error': 'Token expired'}, status=401)
            except jwt.InvalidTokenError:
                return JsonResponse({'error': 'Invalid token'}, status=401)
            except User.DoesNotExist:
                return JsonResponse({'error': 'User not found'}, status=401)

        return self.get_response(request)
```

---

## Rate Limiting Middleware

```python
# doctors/middleware.py
from django.core.cache import cache
from django.http import JsonResponse
import time

class RateLimitMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.rate_limit = 100  # requests
        self.time_window = 60  # seconds

    def __call__(self, request):
        # Get client identifier
        client_ip = self.get_client_ip(request)
        cache_key = f'rate_limit_{client_ip}'

        # Get current request count
        request_data = cache.get(cache_key, {'count': 0, 'start': time.time()})

        # Reset if window expired
        if time.time() - request_data['start'] > self.time_window:
            request_data = {'count': 0, 'start': time.time()}

        # Check rate limit
        if request_data['count'] >= self.rate_limit:
            return JsonResponse({
                'error': 'Rate limit exceeded',
                'retry_after': int(self.time_window - (time.time() - request_data['start']))
            }, status=429)

        # Increment counter
        request_data['count'] += 1
        cache.set(cache_key, request_data, self.time_window)

        response = self.get_response(request)

        # Add rate limit headers
        response['X-RateLimit-Limit'] = str(self.rate_limit)
        response['X-RateLimit-Remaining'] = str(self.rate_limit - request_data['count'])

        return response

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')
```

---

## Security Middleware

```python
# doctors/middleware.py
from django.http import JsonResponse

class SecurityHeadersMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Security headers
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        response['Content-Security-Policy'] = "default-src 'self'"
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'

        return response


class BlockSuspiciousRequestsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.blocked_user_agents = ['sqlmap', 'nikto', 'nmap']

    def __call__(self, request):
        user_agent = request.headers.get('User-Agent', '').lower()

        # Block suspicious user agents
        for blocked in self.blocked_user_agents:
            if blocked in user_agent:
                return JsonResponse({'error': 'Forbidden'}, status=403)

        # Block requests with suspicious paths
        suspicious_paths = ['.php', '.asp', 'wp-admin', 'phpmyadmin']
        for suspicious in suspicious_paths:
            if suspicious in request.path.lower():
                return JsonResponse({'error': 'Not Found'}, status=404)

        return self.get_response(request)
```

---

## Registering Middleware

```python
# settings.py
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',

    # Custom middleware
    'doctors.middleware.RequestIDMiddleware',
    'doctors.middleware.RequestLoggingMiddleware',
    'doctors.middleware.ResponseTimeMiddleware',
    'doctors.middleware.SecurityHeadersMiddleware',

    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]
```

---

## Middleware Order

| Order | Middleware | Purpose |
|-------|------------|---------|
| 1 | SecurityMiddleware | HTTPS, security headers |
| 2 | SessionMiddleware | Session handling |
| 3 | CorsMiddleware | CORS headers |
| 4 | CommonMiddleware | URL normalization |
| 5 | Custom logging | Request logging |
| 6 | CsrfViewMiddleware | CSRF protection |
| 7 | AuthenticationMiddleware | User authentication |
| 8 | Custom auth | Additional auth |
| 9 | MessageMiddleware | Flash messages |

---

## Best Practices

| Practice | Description |
|----------|-------------|
| Order matters | Security first, auth before views |
| Keep lightweight | Minimize processing time |
| Use caching | For rate limiting, etc. |
| Handle exceptions | Use process_exception |
| Log appropriately | Don't log sensitive data |
| Test thoroughly | Middleware affects all requests |

---

## Next Steps

- [Admin Customization](./19-admin-customization.md) - Django admin for APIs

---

[← Previous: Celery and Tasks](./17-celery-tasks.md) | [Back to Index](./README.md) | [Next: Admin Customization →](./19-admin-customization.md)
