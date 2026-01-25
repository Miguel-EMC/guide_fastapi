# Security

Security best practices for Django REST Framework applications.

## Django Security Settings

```python
# settings.py

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('SECRET_KEY')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = False

ALLOWED_HOSTS = ['yourdomain.com', 'www.yourdomain.com']

# HTTPS Settings
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Session Security
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_EXPIRE_AT_BROWSER_CLOSE = True

# CSRF Security
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = 'Lax'

# HSTS (HTTP Strict Transport Security)
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Content Security
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_BROWSER_XSS_FILTER = True

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 12}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]
```

---

## CORS Configuration

```python
# settings.py
INSTALLED_APPS = [
    ...
    'corsheaders',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    ...
]

# Strict CORS (recommended)
CORS_ALLOWED_ORIGINS = [
    'https://yourdomain.com',
    'https://app.yourdomain.com',
]

# Or with regex
CORS_ALLOWED_ORIGIN_REGEXES = [
    r'^https://\w+\.yourdomain\.com$',
]

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
]

# Never use in production:
# CORS_ALLOW_ALL_ORIGINS = True
```

---

## Authentication Security

### Token Authentication

```python
# settings.py
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}
```

### JWT with Short Expiry

```python
# settings.py
from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
}
```

### Password Hashing

```python
# settings.py
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.Argon2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher',
]
```

```bash
pip install argon2-cffi
```

---

## Input Validation

### Serializer Validation

```python
# doctors/serializers.py
from rest_framework import serializers
import re

class DoctorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Doctor
        fields = '__all__'

    def validate_email(self, value):
        # Normalize and validate email
        value = value.lower().strip()
        if not re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', value):
            raise serializers.ValidationError('Invalid email format')
        return value

    def validate_contact_number(self, value):
        # Allow only numbers and common phone characters
        if not re.match(r'^[\d\+\-\(\)\s]+$', value):
            raise serializers.ValidationError('Invalid phone number format')
        return value

    def validate_biography(self, value):
        # Sanitize HTML/scripts
        import bleach
        return bleach.clean(value, tags=[], strip=True)
```

### SQL Injection Prevention

```python
# GOOD - Using ORM
Doctor.objects.filter(email=email)

# GOOD - Using parameterized queries
from django.db import connection
with connection.cursor() as cursor:
    cursor.execute("SELECT * FROM doctors WHERE email = %s", [email])

# BAD - Never do this!
# cursor.execute(f"SELECT * FROM doctors WHERE email = '{email}'")
```

### XSS Prevention

```python
# Install bleach
pip install bleach
```

```python
# doctors/serializers.py
import bleach

class DoctorSerializer(serializers.ModelSerializer):
    def validate_biography(self, value):
        # Allow only safe HTML tags
        allowed_tags = ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li']
        return bleach.clean(value, tags=allowed_tags, strip=True)

    def validate_first_name(self, value):
        # Strip all HTML
        return bleach.clean(value, tags=[], strip=True)
```

---

## Rate Limiting

```python
# settings.py
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour',
        'login': '5/minute',
    }
}
```

```python
# doctors/views.py
from rest_framework.throttling import ScopedRateThrottle

class LoginView(APIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

    def post(self, request):
        # Login logic
        pass
```

---

## Sensitive Data Protection

### Environment Variables

```python
# settings.py
import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.environ.get('SECRET_KEY')
DATABASE_PASSWORD = os.environ.get('DB_PASSWORD')
API_KEY = os.environ.get('API_KEY')

# Never commit secrets to version control
# Add .env to .gitignore
```

### Masking Sensitive Fields

```python
# doctors/serializers.py
class PatientSerializer(serializers.ModelSerializer):
    ssn = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = ['id', 'name', 'ssn', 'email']

    def get_ssn(self, obj):
        # Mask SSN: show only last 4 digits
        if obj.ssn:
            return f'***-**-{obj.ssn[-4:]}'
        return None


class DoctorSerializer(serializers.ModelSerializer):
    contact_number = serializers.SerializerMethodField()

    def get_contact_number(self, obj):
        # Mask phone number
        if obj.contact_number:
            return f'***-***-{obj.contact_number[-4:]}'
        return None
```

### Encryption at Rest

```python
# Install django-encrypted-model-fields
pip install django-encrypted-model-fields
```

```python
# settings.py
FIELD_ENCRYPTION_KEY = os.environ.get('FIELD_ENCRYPTION_KEY')
```

```python
# patients/models.py
from encrypted_model_fields.fields import EncryptedCharField

class Patient(models.Model):
    name = models.CharField(max_length=100)
    ssn = EncryptedCharField(max_length=11)  # Encrypted
    medical_history = EncryptedCharField(max_length=5000)  # Encrypted
```

---

## Security Headers Middleware

```python
# doctors/middleware.py
class SecurityHeadersMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Content Security Policy
        response['Content-Security-Policy'] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self'; "
            "frame-ancestors 'none'; "
        )

        # Other security headers
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response['Permissions-Policy'] = (
            'geolocation=(), microphone=(), camera=()'
        )

        return response
```

---

## Audit Logging

```python
# doctors/middleware.py
import logging

security_logger = logging.getLogger('security')

class SecurityAuditMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Log authentication attempts
        if request.path == '/api/auth/login/':
            if response.status_code == 200:
                security_logger.info(
                    f'Successful login: {request.data.get("username")} '
                    f'from {self.get_client_ip(request)}'
                )
            elif response.status_code == 401:
                security_logger.warning(
                    f'Failed login attempt: {request.data.get("username")} '
                    f'from {self.get_client_ip(request)}'
                )

        # Log permission denied
        if response.status_code == 403:
            security_logger.warning(
                f'Permission denied: {request.user} '
                f'accessing {request.path} '
                f'from {self.get_client_ip(request)}'
            )

        return response

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')
```

---

## File Upload Security

```python
# doctors/validators.py
import magic
from django.core.exceptions import ValidationError

ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
]

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

def validate_file(file):
    # Check file size
    if file.size > MAX_FILE_SIZE:
        raise ValidationError(f'File size cannot exceed {MAX_FILE_SIZE // (1024*1024)}MB')

    # Check MIME type using magic numbers (not extension)
    mime_type = magic.from_buffer(file.read(1024), mime=True)
    file.seek(0)

    if mime_type not in ALLOWED_MIME_TYPES:
        raise ValidationError(f'File type {mime_type} is not allowed')

    return file
```

```python
# doctors/serializers.py
from .validators import validate_file

class DoctorDocumentSerializer(serializers.ModelSerializer):
    file = serializers.FileField(validators=[validate_file])

    class Meta:
        model = DoctorDocument
        fields = '__all__'
```

---

## Brute Force Protection

```python
# doctors/views.py
from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

class LoginView(APIView):
    MAX_ATTEMPTS = 5
    LOCKOUT_TIME = 900  # 15 minutes

    def post(self, request):
        username = request.data.get('username')
        ip = self.get_client_ip(request)

        # Check if locked out
        lock_key = f'login_lockout_{ip}_{username}'
        if cache.get(lock_key):
            return Response(
                {'error': 'Account temporarily locked. Try again later.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        # Attempt authentication
        user = authenticate(
            username=username,
            password=request.data.get('password')
        )

        if user is None:
            # Track failed attempts
            attempts_key = f'login_attempts_{ip}_{username}'
            attempts = cache.get(attempts_key, 0) + 1
            cache.set(attempts_key, attempts, self.LOCKOUT_TIME)

            if attempts >= self.MAX_ATTEMPTS:
                cache.set(lock_key, True, self.LOCKOUT_TIME)
                return Response(
                    {'error': 'Too many failed attempts. Account locked.'},
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )

            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Clear attempts on successful login
        cache.delete(f'login_attempts_{ip}_{username}')

        # Generate token and return
        token = Token.objects.get_or_create(user=user)[0]
        return Response({'token': token.key})

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')
```

---

## Security Checklist

| Category | Check |
|----------|-------|
| **Configuration** | DEBUG = False in production |
| | SECRET_KEY from environment |
| | ALLOWED_HOSTS configured |
| **HTTPS** | SECURE_SSL_REDIRECT = True |
| | HSTS enabled |
| | Secure cookies |
| **Authentication** | Strong password requirements |
| | Rate limiting on login |
| | Token expiration |
| **Input** | Validate all user input |
| | Sanitize HTML/scripts |
| | Use ORM for database queries |
| **Headers** | CSP configured |
| | X-Frame-Options set |
| | X-Content-Type-Options set |
| **Data** | Encrypt sensitive data |
| | Mask PII in responses |
| | Audit logging enabled |
| **Files** | Validate MIME types |
| | Size limits enforced |
| | Store outside web root |

---

## Security Testing

```bash
# Check Django security
python manage.py check --deploy

# Check for vulnerabilities
pip install safety
safety check

# Security headers check
pip install securityheaders
securityheaders https://yourdomain.com
```

---

## Summary

This completes the Django REST Framework documentation covering all professional backend topics from basic setup to production security.

---

[← Previous: Logging](./21-logging.md) | [Back to Index](./README.md)
