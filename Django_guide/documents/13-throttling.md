# Throttling

Throttling (rate limiting) controls the rate of requests that clients can make to your API.

## Global Configuration

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
    }
}
```

---

## Built-in Throttle Classes

### AnonRateThrottle

Limits unauthenticated users by IP address:

```python
# settings.py
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/day',
    }
}
```

### UserRateThrottle

Limits authenticated users by user ID:

```python
# settings.py
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'user': '1000/day',
    }
}
```

### Combined Throttling

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
    }
}
```

---

## Rate Formats

| Format | Description |
|--------|-------------|
| `10/second` | 10 requests per second |
| `100/minute` | 100 requests per minute |
| `1000/hour` | 1000 requests per hour |
| `10000/day` | 10000 requests per day |

Shorthand:
- `s` = second
- `m` = minute
- `h` = hour
- `d` = day

```python
'DEFAULT_THROTTLE_RATES': {
    'anon': '10/s',      # 10 per second
    'user': '100/m',     # 100 per minute
    'burst': '1000/h',   # 1000 per hour
    'sustained': '10000/d',  # 10000 per day
}
```

---

## Per-View Throttling

```python
# doctors/views.py
from rest_framework import generics
from rest_framework.throttling import UserRateThrottle, AnonRateThrottle
from .models import Doctor
from .serializers import DoctorSerializer

class DoctorListView(generics.ListAPIView):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
    throttle_classes = [UserRateThrottle]


class PublicDoctorListView(generics.ListAPIView):
    queryset = Doctor.objects.filter(is_on_vacation=False)
    serializer_class = DoctorSerializer
    throttle_classes = [AnonRateThrottle]
```

---

## ScopedRateThrottle

Different rates for different endpoints:

```python
# settings.py
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.ScopedRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'doctors': '100/hour',
        'appointments': '50/hour',
        'auth': '5/minute',
    }
}
```

```python
# doctors/views.py
from rest_framework import generics
from rest_framework.throttling import ScopedRateThrottle

class DoctorListView(generics.ListAPIView):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'doctors'


class AppointmentListView(generics.ListAPIView):
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'appointments'


class LoginView(generics.GenericAPIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'

    def post(self, request):
        # Login logic
        pass
```

---

## Custom Throttle Classes

### Role-Based Throttle

```python
# doctors/throttling.py
from rest_framework.throttling import UserRateThrottle

class PremiumUserThrottle(UserRateThrottle):
    """Higher rate for premium users."""
    scope = 'premium'

    def allow_request(self, request, view):
        if request.user.is_authenticated:
            if hasattr(request.user, 'profile') and request.user.profile.is_premium:
                self.rate = '10000/hour'
            else:
                self.rate = '1000/hour'
        return super().allow_request(request, view)


class StaffThrottle(UserRateThrottle):
    """No limit for staff users."""

    def allow_request(self, request, view):
        if request.user.is_staff:
            return True
        return super().allow_request(request, view)
```

### Burst and Sustained Throttle

```python
# doctors/throttling.py
from rest_framework.throttling import SimpleRateThrottle

class BurstRateThrottle(SimpleRateThrottle):
    """Short-term burst limit."""
    scope = 'burst'
    rate = '10/second'

    def get_cache_key(self, request, view):
        if request.user.is_authenticated:
            return f'throttle_burst_{request.user.pk}'
        return f'throttle_burst_{self.get_ident(request)}'


class SustainedRateThrottle(SimpleRateThrottle):
    """Long-term sustained limit."""
    scope = 'sustained'
    rate = '1000/day'

    def get_cache_key(self, request, view):
        if request.user.is_authenticated:
            return f'throttle_sustained_{request.user.pk}'
        return f'throttle_sustained_{self.get_ident(request)}'
```

```python
# Usage
class DoctorListView(generics.ListAPIView):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
    throttle_classes = [BurstRateThrottle, SustainedRateThrottle]
```

### Endpoint-Specific Throttle

```python
# doctors/throttling.py
from rest_framework.throttling import SimpleRateThrottle

class CreateAppointmentThrottle(SimpleRateThrottle):
    """Limit appointment creation."""
    scope = 'create_appointment'
    rate = '10/hour'

    def get_cache_key(self, request, view):
        if request.user.is_authenticated:
            return f'create_appointment_{request.user.pk}'
        return None  # Don't throttle unauthenticated (they can't create anyway)


class SearchThrottle(SimpleRateThrottle):
    """Limit search requests."""
    scope = 'search'
    rate = '30/minute'

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)
        return f'search_{ident}'
```

---

## ViewSet Throttling

```python
# doctors/viewsets.py
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.throttling import UserRateThrottle
from .throttling import CreateAppointmentThrottle

class DoctorViewSet(viewsets.ModelViewSet):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
    throttle_classes = [UserRateThrottle]

    def get_throttles(self):
        """Different throttles for different actions."""
        if self.action == 'create':
            return [CreateAppointmentThrottle()]
        return super().get_throttles()

    @action(detail=True, methods=['post'])
    def set_on_vacation(self, request, pk=None):
        # Uses default throttle
        pass
```

---

## Throttle Response

When throttled, DRF returns:

```json
{
    "detail": "Request was throttled. Expected available in 3600 seconds."
}
```

### Custom Throttle Response

```python
# doctors/throttling.py
from rest_framework.throttling import UserRateThrottle
from rest_framework.exceptions import Throttled

class CustomThrottle(UserRateThrottle):
    def throttle_failure(self):
        wait = self.wait()
        raise Throttled(
            detail={
                'message': 'Rate limit exceeded',
                'retry_after': int(wait),
                'limit': self.rate,
            },
            wait=wait
        )
```

### Exception Handler for Throttling

```python
# doctorapp/exceptions.py
from rest_framework.views import exception_handler
from rest_framework.exceptions import Throttled

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if isinstance(exc, Throttled):
        response.data = {
            'error': 'rate_limit_exceeded',
            'message': 'Too many requests',
            'retry_after': exc.wait,
        }

    return response
```

```python
# settings.py
REST_FRAMEWORK = {
    'EXCEPTION_HANDLER': 'doctorapp.exceptions.custom_exception_handler',
}
```

---

## Redis Cache Backend

For production, use Redis:

```bash
pip install django-redis
```

```python
# settings.py
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}
```

---

## Throttle Headers

Add rate limit headers to responses:

```python
# doctors/throttling.py
from rest_framework.throttling import UserRateThrottle

class HeaderUserRateThrottle(UserRateThrottle):
    def allow_request(self, request, view):
        allowed = super().allow_request(request, view)

        # Store rate info for middleware
        request.throttle_info = {
            'limit': self.num_requests,
            'remaining': max(0, self.num_requests - len(self.history)),
            'reset': self.duration,
        }

        return allowed
```

```python
# doctors/middleware.py
class ThrottleHeadersMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        if hasattr(request, 'throttle_info'):
            info = request.throttle_info
            response['X-RateLimit-Limit'] = info['limit']
            response['X-RateLimit-Remaining'] = info['remaining']
            response['X-RateLimit-Reset'] = info['reset']

        return response
```

```python
# settings.py
MIDDLEWARE = [
    ...
    'doctors.middleware.ThrottleHeadersMiddleware',
]
```

---

## Complete Example

```python
# doctors/throttling.py
from rest_framework.throttling import SimpleRateThrottle, UserRateThrottle

class AnonBurstThrottle(SimpleRateThrottle):
    scope = 'anon_burst'
    rate = '5/second'

    def get_cache_key(self, request, view):
        if request.user.is_authenticated:
            return None
        return f'anon_burst_{self.get_ident(request)}'


class AnonSustainedThrottle(SimpleRateThrottle):
    scope = 'anon_sustained'
    rate = '100/hour'

    def get_cache_key(self, request, view):
        if request.user.is_authenticated:
            return None
        return f'anon_sustained_{self.get_ident(request)}'


class UserBurstThrottle(UserRateThrottle):
    scope = 'user_burst'
    rate = '10/second'


class UserSustainedThrottle(UserRateThrottle):
    scope = 'user_sustained'
    rate = '1000/hour'


class WriteThrottle(SimpleRateThrottle):
    scope = 'write'
    rate = '50/hour'

    def get_cache_key(self, request, view):
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return None
        if request.user.is_authenticated:
            return f'write_{request.user.pk}'
        return f'write_{self.get_ident(request)}'
```

```python
# settings.py
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'doctors.throttling.AnonBurstThrottle',
        'doctors.throttling.AnonSustainedThrottle',
        'doctors.throttling.UserBurstThrottle',
        'doctors.throttling.UserSustainedThrottle',
        'doctors.throttling.WriteThrottle',
    ],
}
```

---

## Best Practices

| Practice | Description |
|----------|-------------|
| Use Redis in production | In-memory cache for distributed systems |
| Combine burst + sustained | Prevent both short and long term abuse |
| Different rates by role | Premium users get higher limits |
| Whitelist staff/admin | Don't throttle internal users |
| Add rate limit headers | Help clients manage their requests |
| Document rate limits | Include in API documentation |

---

## Next Steps

- [Caching](./14-caching.md) - Cache responses for performance

---

[← Previous: Pagination](./12-pagination.md) | [Back to Index](./README.md) | [Next: Caching →](./14-caching.md)
