# Logging

Comprehensive logging configuration for Django REST Framework applications.

## Basic Configuration

```python
# settings.py
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'WARNING',
    },
}
```

---

## Production Logging Configuration

```python
# settings.py
import os

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,

    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {asctime} {message}',
            'style': '{',
        },
        'json': {
            '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
            'format': '%(asctime)s %(levelname)s %(name)s %(message)s',
        },
    },

    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse',
        },
        'require_debug_true': {
            '()': 'django.utils.log.RequireDebugTrue',
        },
    },

    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': os.path.join(BASE_DIR, 'logs', 'django.log'),
            'maxBytes': 1024 * 1024 * 5,  # 5 MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
        'error_file': {
            'level': 'ERROR',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': os.path.join(BASE_DIR, 'logs', 'error.log'),
            'maxBytes': 1024 * 1024 * 5,  # 5 MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
        'mail_admins': {
            'level': 'ERROR',
            'filters': ['require_debug_false'],
            'class': 'django.utils.log.AdminEmailHandler',
        },
    },

    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': True,
        },
        'django.request': {
            'handlers': ['error_file', 'mail_admins'],
            'level': 'ERROR',
            'propagate': False,
        },
        'django.security': {
            'handlers': ['error_file', 'mail_admins'],
            'level': 'ERROR',
            'propagate': False,
        },
        'doctors': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'api': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
```

---

## Using Loggers

### Basic Usage

```python
# doctors/views.py
import logging

logger = logging.getLogger(__name__)

class DoctorViewSet(viewsets.ModelViewSet):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer

    def create(self, request, *args, **kwargs):
        logger.info(f'Creating doctor: {request.data}')

        try:
            response = super().create(request, *args, **kwargs)
            logger.info(f'Doctor created: {response.data["id"]}')
            return response
        except Exception as e:
            logger.error(f'Error creating doctor: {e}', exc_info=True)
            raise

    def destroy(self, request, pk=None, *args, **kwargs):
        logger.warning(f'Deleting doctor: {pk}')
        return super().destroy(request, pk, *args, **kwargs)
```

### Log Levels

```python
import logging

logger = logging.getLogger('doctors')

# Debug - Detailed debugging information
logger.debug('Processing request with data: %s', data)

# Info - General operational messages
logger.info('Doctor %s created successfully', doctor.id)

# Warning - Something unexpected but handled
logger.warning('Doctor %s has no appointments', doctor.id)

# Error - Error occurred but handled
logger.error('Failed to send email to %s', email, exc_info=True)

# Critical - System failure
logger.critical('Database connection failed', exc_info=True)
```

### Structured Logging

```python
# doctors/views.py
import logging

logger = logging.getLogger('api')

class DoctorViewSet(viewsets.ModelViewSet):
    def create(self, request, *args, **kwargs):
        logger.info(
            'Doctor creation requested',
            extra={
                'user_id': request.user.id,
                'email': request.data.get('email'),
                'action': 'create_doctor',
            }
        )

        response = super().create(request, *args, **kwargs)

        logger.info(
            'Doctor created successfully',
            extra={
                'user_id': request.user.id,
                'doctor_id': response.data['id'],
                'action': 'create_doctor',
            }
        )

        return response
```

---

## Request Logging Middleware

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
        # Skip health checks
        if request.path == '/health/':
            return self.get_response(request)

        start_time = time.time()

        # Log request
        self.log_request(request)

        # Process request
        response = self.get_response(request)

        # Log response
        duration = time.time() - start_time
        self.log_response(request, response, duration)

        return response

    def log_request(self, request):
        logger.info(
            'Request received',
            extra={
                'method': request.method,
                'path': request.path,
                'user_id': getattr(request.user, 'id', None),
                'ip': self.get_client_ip(request),
                'user_agent': request.META.get('HTTP_USER_AGENT', ''),
            }
        )

    def log_response(self, request, response, duration):
        logger.info(
            'Response sent',
            extra={
                'method': request.method,
                'path': request.path,
                'status_code': response.status_code,
                'duration': f'{duration:.3f}s',
                'user_id': getattr(request.user, 'id', None),
            }
        )

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')
```

---

## JSON Logging

### Installation

```bash
pip install python-json-logger
```

### Configuration

```python
# settings.py
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'json': {
            '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
            'format': '%(asctime)s %(levelname)s %(name)s %(message)s',
        },
    },
    'handlers': {
        'json_file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': 'logs/app.json',
            'maxBytes': 1024 * 1024 * 10,
            'backupCount': 5,
            'formatter': 'json',
        },
    },
    'loggers': {
        'api': {
            'handlers': ['json_file'],
            'level': 'INFO',
        },
    },
}
```

### Custom JSON Formatter

```python
# doctors/logging.py
from pythonjsonlogger import jsonlogger
import datetime

class CustomJsonFormatter(jsonlogger.JsonFormatter):
    def add_fields(self, log_record, record, message_dict):
        super().add_fields(log_record, record, message_dict)

        # Add timestamp
        log_record['timestamp'] = datetime.datetime.utcnow().isoformat()

        # Add log level
        log_record['level'] = record.levelname

        # Add module info
        log_record['module'] = record.module
        log_record['function'] = record.funcName
        log_record['line'] = record.lineno

        # Add extra fields
        for key, value in record.__dict__.items():
            if key not in ['message', 'asctime', 'levelname', 'name']:
                if not key.startswith('_'):
                    log_record[key] = value
```

---

## Error Tracking with Sentry

### Installation

```bash
pip install sentry-sdk
```

### Configuration

```python
# settings.py
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration
from sentry_sdk.integrations.celery import CeleryIntegration
from sentry_sdk.integrations.redis import RedisIntegration

sentry_sdk.init(
    dsn=os.environ.get('SENTRY_DSN'),
    integrations=[
        DjangoIntegration(),
        CeleryIntegration(),
        RedisIntegration(),
    ],
    environment=os.environ.get('ENVIRONMENT', 'development'),
    traces_sample_rate=0.1,  # 10% of transactions
    send_default_pii=True,
)
```

### Custom Context

```python
# doctors/views.py
import sentry_sdk

class DoctorViewSet(viewsets.ModelViewSet):
    def create(self, request, *args, **kwargs):
        # Add context to Sentry
        sentry_sdk.set_user({
            'id': request.user.id,
            'email': request.user.email,
        })

        sentry_sdk.set_context('doctor_data', {
            'email': request.data.get('email'),
            'qualification': request.data.get('qualification'),
        })

        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            sentry_sdk.capture_exception(e)
            raise
```

---

## Audit Logging

```python
# doctors/models.py
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class AuditLog(models.Model):
    ACTION_CHOICES = [
        ('CREATE', 'Create'),
        ('UPDATE', 'Update'),
        ('DELETE', 'Delete'),
        ('VIEW', 'View'),
    ]

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=10, choices=ACTION_CHOICES)
    model_name = models.CharField(max_length=100)
    object_id = models.IntegerField()
    object_repr = models.CharField(max_length=200)
    changes = models.JSONField(default=dict)
    ip_address = models.GenericIPAddressField(null=True)
    user_agent = models.CharField(max_length=500, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f'{self.user} {self.action} {self.model_name} {self.object_id}'
```

```python
# doctors/audit.py
from .models import AuditLog

def log_action(request, action, instance, changes=None):
    """Log an audit action."""
    AuditLog.objects.create(
        user=request.user if request.user.is_authenticated else None,
        action=action,
        model_name=instance.__class__.__name__,
        object_id=instance.pk,
        object_repr=str(instance),
        changes=changes or {},
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
    )

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')
```

```python
# doctors/views.py
from .audit import log_action

class DoctorViewSet(viewsets.ModelViewSet):
    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        instance = Doctor.objects.get(pk=response.data['id'])
        log_action(request, 'CREATE', instance)
        return response

    def update(self, request, pk=None, *args, **kwargs):
        old_instance = self.get_object()
        old_data = DoctorSerializer(old_instance).data

        response = super().update(request, pk, *args, **kwargs)

        new_data = response.data
        changes = {
            k: {'old': old_data.get(k), 'new': v}
            for k, v in new_data.items()
            if old_data.get(k) != v
        }

        instance = self.get_object()
        log_action(request, 'UPDATE', instance, changes)
        return response

    def destroy(self, request, pk=None, *args, **kwargs):
        instance = self.get_object()
        log_action(request, 'DELETE', instance)
        return super().destroy(request, pk, *args, **kwargs)
```

---

## Log Aggregation

### Filebeat Configuration (ELK Stack)

```yaml
# filebeat.yml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/doctor_api/*.log
    json.keys_under_root: true
    json.add_error_key: true

output.elasticsearch:
  hosts: ["localhost:9200"]
  index: "doctor-api-%{+yyyy.MM.dd}"
```

### Fluentd Configuration

```xml
<source>
  @type tail
  path /var/log/doctor_api/*.log
  pos_file /var/log/td-agent/doctor_api.log.pos
  tag doctor.api
  <parse>
    @type json
  </parse>
</source>

<match doctor.**>
  @type elasticsearch
  host localhost
  port 9200
  index_name doctor_api
  type_name _doc
</match>
```

---

## Complete Logging Example

```python
# settings.py
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
LOG_DIR = BASE_DIR / 'logs'
LOG_DIR.mkdir(exist_ok=True)

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,

    'formatters': {
        'verbose': {
            'format': '[{asctime}] {levelname} {name} {module}.{funcName}:{lineno} - {message}',
            'style': '{',
        },
        'json': {
            '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
            'format': '%(asctime)s %(levelname)s %(name)s %(message)s',
        },
    },

    'handlers': {
        'console': {
            'level': 'DEBUG' if DEBUG else 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'app_file': {
            'level': 'INFO',
            'class': 'logging.handlers.TimedRotatingFileHandler',
            'filename': LOG_DIR / 'app.log',
            'when': 'midnight',
            'backupCount': 30,
            'formatter': 'verbose',
        },
        'error_file': {
            'level': 'ERROR',
            'class': 'logging.handlers.TimedRotatingFileHandler',
            'filename': LOG_DIR / 'error.log',
            'when': 'midnight',
            'backupCount': 30,
            'formatter': 'verbose',
        },
        'json_file': {
            'level': 'INFO',
            'class': 'logging.handlers.TimedRotatingFileHandler',
            'filename': LOG_DIR / 'app.json',
            'when': 'midnight',
            'backupCount': 30,
            'formatter': 'json',
        },
    },

    'loggers': {
        'django': {
            'handlers': ['console', 'app_file'],
            'level': 'INFO',
        },
        'django.request': {
            'handlers': ['error_file'],
            'level': 'ERROR',
            'propagate': False,
        },
        'doctors': {
            'handlers': ['console', 'app_file', 'json_file'],
            'level': 'DEBUG' if DEBUG else 'INFO',
            'propagate': False,
        },
        'api': {
            'handlers': ['console', 'app_file', 'json_file'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
```

---

## Best Practices

| Practice | Description |
|----------|-------------|
| Use appropriate levels | DEBUG for dev, INFO+ for prod |
| Structured logging | JSON format for parsing |
| Rotate log files | Prevent disk space issues |
| Don't log sensitive data | Mask passwords, tokens |
| Add context | User ID, request ID, etc. |
| Monitor errors | Use Sentry or similar |

---

## Next Steps

- [Security](./22-security.md) - Security best practices

---

[← Previous: Deployment](./20-deployment.md) | [Back to Index](./README.md) | [Next: Security →](./22-security.md)
