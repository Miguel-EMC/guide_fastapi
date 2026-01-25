# Caching

Caching improves API performance by storing frequently accessed data.

## Cache Backends

### Configuration

```python
# settings.py

# Local memory cache (development)
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
    }
}

# Redis cache (production)
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'TIMEOUT': 300,  # 5 minutes default
    }
}

# Memcached
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.memcached.PyMemcacheCache',
        'LOCATION': '127.0.0.1:11211',
    }
}

# Database cache
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.db.DatabaseCache',
        'LOCATION': 'cache_table',
    }
}
```

### Redis Installation

```bash
pip install django-redis
```

---

## Low-Level Cache API

```python
from django.core.cache import cache

# Set cache
cache.set('my_key', 'my_value', timeout=300)  # 5 minutes

# Get cache
value = cache.get('my_key')
value = cache.get('my_key', default='default_value')

# Delete cache
cache.delete('my_key')

# Check existence
if cache.has_key('my_key'):
    pass

# Get or set
value = cache.get_or_set('my_key', 'default_value', timeout=300)

# Increment/Decrement
cache.set('counter', 0)
cache.incr('counter')
cache.decr('counter')

# Multiple keys
cache.set_many({'key1': 'value1', 'key2': 'value2'})
values = cache.get_many(['key1', 'key2'])
cache.delete_many(['key1', 'key2'])

# Clear all
cache.clear()
```

---

## View-Level Caching

### cache_page Decorator

```python
# doctors/views.py
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator
from rest_framework import generics
from .models import Doctor
from .serializers import DoctorSerializer

class DoctorListView(generics.ListAPIView):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer

    @method_decorator(cache_page(60 * 15))  # 15 minutes
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
```

### vary_on_headers

```python
from django.views.decorators.vary import vary_on_headers

class DoctorListView(generics.ListAPIView):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer

    @method_decorator(cache_page(60 * 15))
    @method_decorator(vary_on_headers('Authorization'))
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
```

---

## Custom Caching in Views

```python
# doctors/views.py
from django.core.cache import cache
from rest_framework import generics
from rest_framework.response import Response
from .models import Doctor
from .serializers import DoctorSerializer

class DoctorListView(generics.ListAPIView):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer

    def get(self, request, *args, **kwargs):
        cache_key = 'doctor_list'

        # Try to get from cache
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return Response(cached_data)

        # Get from database
        response = super().get(request, *args, **kwargs)

        # Store in cache
        cache.set(cache_key, response.data, timeout=300)

        return response


class DoctorDetailView(generics.RetrieveAPIView):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer

    def get(self, request, pk, *args, **kwargs):
        cache_key = f'doctor_{pk}'

        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return Response(cached_data)

        response = super().get(request, pk, *args, **kwargs)
        cache.set(cache_key, response.data, timeout=300)

        return response
```

---

## Cache Invalidation

### Manual Invalidation

```python
# doctors/views.py
from django.core.cache import cache
from rest_framework import generics, status
from rest_framework.response import Response

class DoctorCreateView(generics.CreateAPIView):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)

        # Invalidate list cache
        cache.delete('doctor_list')

        return response


class DoctorUpdateView(generics.UpdateAPIView):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer

    def update(self, request, pk, *args, **kwargs):
        response = super().update(request, pk, *args, **kwargs)

        # Invalidate caches
        cache.delete(f'doctor_{pk}')
        cache.delete('doctor_list')

        return response
```

### Signal-Based Invalidation

```python
# doctors/signals.py
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache
from .models import Doctor

@receiver(post_save, sender=Doctor)
def invalidate_doctor_cache_on_save(sender, instance, **kwargs):
    cache.delete(f'doctor_{instance.pk}')
    cache.delete('doctor_list')
    cache.delete('available_doctors')

@receiver(post_delete, sender=Doctor)
def invalidate_doctor_cache_on_delete(sender, instance, **kwargs):
    cache.delete(f'doctor_{instance.pk}')
    cache.delete('doctor_list')
    cache.delete('available_doctors')
```

```python
# doctors/apps.py
from django.apps import AppConfig

class DoctorsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'doctors'

    def ready(self):
        import doctors.signals
```

---

## Cache Mixin

```python
# doctors/mixins.py
from django.core.cache import cache
from rest_framework.response import Response

class CacheMixin:
    cache_timeout = 300  # 5 minutes

    def get_cache_key(self, request, *args, **kwargs):
        """Generate cache key based on request."""
        path = request.path
        query = request.GET.urlencode()
        user_id = request.user.id if request.user.is_authenticated else 'anon'
        return f'{path}_{query}_{user_id}'

    def get(self, request, *args, **kwargs):
        cache_key = self.get_cache_key(request, *args, **kwargs)

        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return Response(cached_data)

        response = super().get(request, *args, **kwargs)

        if response.status_code == 200:
            cache.set(cache_key, response.data, timeout=self.cache_timeout)

        return response
```

```python
# doctors/views.py
from rest_framework import generics
from .mixins import CacheMixin
from .models import Doctor
from .serializers import DoctorSerializer

class CachedDoctorListView(CacheMixin, generics.ListAPIView):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
    cache_timeout = 600  # 10 minutes
```

---

## QuerySet Caching

```python
# doctors/managers.py
from django.db import models
from django.core.cache import cache

class CachedManager(models.Manager):
    def get_cached(self, pk, timeout=300):
        cache_key = f'{self.model.__name__.lower()}_{pk}'
        instance = cache.get(cache_key)

        if instance is None:
            instance = self.get(pk=pk)
            cache.set(cache_key, instance, timeout)

        return instance

    def list_cached(self, timeout=300):
        cache_key = f'{self.model.__name__.lower()}_list'
        queryset = cache.get(cache_key)

        if queryset is None:
            queryset = list(self.all())
            cache.set(cache_key, queryset, timeout)

        return queryset
```

```python
# doctors/models.py
from django.db import models
from .managers import CachedManager

class Doctor(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    # ... other fields

    objects = CachedManager()
```

Usage:
```python
# Get cached single object
doctor = Doctor.objects.get_cached(pk=1)

# Get cached list
doctors = Doctor.objects.list_cached()
```

---

## Conditional Caching

```python
# doctors/views.py
from django.core.cache import cache
from rest_framework import generics
from rest_framework.response import Response

class DoctorListView(generics.ListAPIView):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer

    def get(self, request, *args, **kwargs):
        # Don't cache if user is authenticated (personalized data)
        if request.user.is_authenticated:
            return super().get(request, *args, **kwargs)

        # Don't cache if query params present
        if request.query_params:
            return super().get(request, *args, **kwargs)

        cache_key = 'public_doctor_list'
        cached_data = cache.get(cache_key)

        if cached_data is not None:
            return Response(cached_data)

        response = super().get(request, *args, **kwargs)
        cache.set(cache_key, response.data, timeout=300)

        return response
```

---

## ETag and Last-Modified

```python
# doctors/views.py
from django.utils.http import quote_etag
from rest_framework import generics
from rest_framework.response import Response
import hashlib

class DoctorDetailView(generics.RetrieveAPIView):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer

    def get(self, request, pk, *args, **kwargs):
        doctor = self.get_object()

        # Generate ETag
        etag_data = f'{doctor.pk}_{doctor.updated_at}'
        etag = quote_etag(hashlib.md5(etag_data.encode()).hexdigest())

        # Check If-None-Match header
        if_none_match = request.META.get('HTTP_IF_NONE_MATCH')
        if if_none_match and if_none_match == etag:
            return Response(status=304)  # Not Modified

        response = super().get(request, pk, *args, **kwargs)
        response['ETag'] = etag
        response['Last-Modified'] = doctor.updated_at.strftime(
            '%a, %d %b %Y %H:%M:%S GMT'
        )

        return response
```

---

## Cache with Pagination

```python
# doctors/views.py
from django.core.cache import cache
from rest_framework import generics
from rest_framework.response import Response

class DoctorListView(generics.ListAPIView):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer

    def get(self, request, *args, **kwargs):
        page = request.query_params.get('page', 1)
        page_size = request.query_params.get('page_size', 10)
        cache_key = f'doctors_page_{page}_size_{page_size}'

        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return Response(cached_data)

        response = super().get(request, *args, **kwargs)
        cache.set(cache_key, response.data, timeout=300)

        return response
```

---

## Cache Patterns

### Cache Aside Pattern

```python
def get_doctor(pk):
    cache_key = f'doctor_{pk}'

    # Try cache first
    doctor = cache.get(cache_key)
    if doctor is not None:
        return doctor

    # Load from database
    doctor = Doctor.objects.get(pk=pk)

    # Store in cache
    cache.set(cache_key, doctor, timeout=300)

    return doctor
```

### Write-Through Pattern

```python
def update_doctor(pk, data):
    # Update database
    doctor = Doctor.objects.filter(pk=pk).update(**data)

    # Update cache
    cache_key = f'doctor_{pk}'
    updated_doctor = Doctor.objects.get(pk=pk)
    cache.set(cache_key, updated_doctor, timeout=300)

    return updated_doctor
```

---

## Complete Example

```python
# doctors/cache.py
from django.core.cache import cache
from functools import wraps
import hashlib

def cache_response(timeout=300, key_prefix=''):
    def decorator(func):
        @wraps(func)
        def wrapper(self, request, *args, **kwargs):
            # Build cache key
            path = request.path
            query = request.GET.urlencode()
            key_data = f'{key_prefix}_{path}_{query}'
            cache_key = hashlib.md5(key_data.encode()).hexdigest()

            # Try cache
            cached = cache.get(cache_key)
            if cached is not None:
                return cached

            # Execute view
            response = func(self, request, *args, **kwargs)

            # Cache successful responses
            if response.status_code == 200:
                cache.set(cache_key, response, timeout)

            return response
        return wrapper
    return decorator


def invalidate_cache_pattern(pattern):
    """Invalidate all keys matching pattern (Redis only)."""
    from django_redis import get_redis_connection
    redis = get_redis_connection('default')
    keys = redis.keys(pattern)
    if keys:
        redis.delete(*keys)
```

```python
# doctors/views.py
from rest_framework import generics
from .cache import cache_response
from .models import Doctor
from .serializers import DoctorSerializer

class DoctorListView(generics.ListAPIView):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer

    @cache_response(timeout=300, key_prefix='doctor_list')
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
```

---

## Best Practices

| Practice | Description |
|----------|-------------|
| Use Redis in production | Fast, supports patterns, TTL |
| Set appropriate TTL | Balance freshness vs performance |
| Invalidate on writes | Keep cache consistent |
| Cache expensive queries | Aggregations, joins |
| Monitor cache hit rate | Measure effectiveness |
| Use cache keys wisely | Include user/params when needed |

---

## Next Steps

- [Signals](./15-signals.md) - Django signals for events

---

[← Previous: Throttling](./13-throttling.md) | [Back to Index](./README.md) | [Next: Signals →](./15-signals.md)
