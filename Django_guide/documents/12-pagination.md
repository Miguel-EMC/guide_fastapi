# Pagination

Pagination allows you to split large result sets into smaller, manageable pages.

## Global Configuration

```python
# settings.py
REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10,
}
```

---

## Pagination Styles

### PageNumberPagination

Standard page number pagination:

```python
# doctors/pagination.py
from rest_framework.pagination import PageNumberPagination

class StandardPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100
    page_query_param = 'page'
```

```python
# doctors/views.py
from rest_framework import generics
from .models import Doctor
from .serializers import DoctorSerializer
from .pagination import StandardPagination

class DoctorListView(generics.ListAPIView):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
    pagination_class = StandardPagination
```

Usage:
```bash
GET /api/doctors/                    # First page, 10 items
GET /api/doctors/?page=2             # Second page
GET /api/doctors/?page=2&page_size=20  # Page 2, 20 items per page
```

Response:
```json
{
    "count": 100,
    "next": "http://localhost:8000/api/doctors/?page=2",
    "previous": null,
    "results": [
        {"id": 1, "first_name": "John", ...},
        {"id": 2, "first_name": "Jane", ...}
    ]
}
```

### LimitOffsetPagination

Limit/offset style pagination:

```python
# doctors/pagination.py
from rest_framework.pagination import LimitOffsetPagination

class LimitOffsetPagination(LimitOffsetPagination):
    default_limit = 10
    limit_query_param = 'limit'
    offset_query_param = 'offset'
    max_limit = 100
```

Usage:
```bash
GET /api/doctors/?limit=10&offset=0   # First 10 items
GET /api/doctors/?limit=10&offset=10  # Items 11-20
GET /api/doctors/?limit=20&offset=40  # Items 41-60
```

Response:
```json
{
    "count": 100,
    "next": "http://localhost:8000/api/doctors/?limit=10&offset=10",
    "previous": null,
    "results": [...]
}
```

### CursorPagination

Cursor-based pagination for large datasets (most efficient):

```python
# doctors/pagination.py
from rest_framework.pagination import CursorPagination

class DoctorCursorPagination(CursorPagination):
    page_size = 10
    ordering = '-created_at'  # Required: must be unique or sequential
    cursor_query_param = 'cursor'
```

Usage:
```bash
GET /api/doctors/
GET /api/doctors/?cursor=cD0yMDI0LTAxLTE1
```

Response:
```json
{
    "next": "http://localhost:8000/api/doctors/?cursor=cD0yMDI0LTAxLTE1",
    "previous": null,
    "results": [...]
}
```

**Note:** CursorPagination doesn't provide `count` (more efficient for large datasets).

---

## Custom Pagination Classes

### Custom Response Format

```python
# doctors/pagination.py
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

class CustomPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response({
            'links': {
                'next': self.get_next_link(),
                'previous': self.get_previous_link()
            },
            'meta': {
                'total_count': self.page.paginator.count,
                'page_size': self.page_size,
                'current_page': self.page.number,
                'total_pages': self.page.paginator.num_pages,
            },
            'data': data
        })
```

Response:
```json
{
    "links": {
        "next": "http://localhost:8000/api/doctors/?page=2",
        "previous": null
    },
    "meta": {
        "total_count": 100,
        "page_size": 10,
        "current_page": 1,
        "total_pages": 10
    },
    "data": [...]
}
```

### Dynamic Page Size

```python
# doctors/pagination.py
from rest_framework.pagination import PageNumberPagination

class DynamicPageSizePagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_page_size(self, request):
        # Custom logic for page size
        if request.user.is_staff:
            self.max_page_size = 500  # Admin can get more
        return super().get_page_size(request)
```

### Pagination with Metadata

```python
# doctors/pagination.py
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from collections import OrderedDict

class EnhancedPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response(OrderedDict([
            ('count', self.page.paginator.count),
            ('total_pages', self.page.paginator.num_pages),
            ('current_page', self.page.number),
            ('page_size', self.get_page_size(self.request)),
            ('next', self.get_next_link()),
            ('previous', self.get_previous_link()),
            ('results', data),
        ]))

    def get_paginated_response_schema(self, schema):
        return {
            'type': 'object',
            'properties': {
                'count': {'type': 'integer', 'example': 100},
                'total_pages': {'type': 'integer', 'example': 10},
                'current_page': {'type': 'integer', 'example': 1},
                'page_size': {'type': 'integer', 'example': 10},
                'next': {'type': 'string', 'nullable': True},
                'previous': {'type': 'string', 'nullable': True},
                'results': schema,
            },
        }
```

---

## Per-View Pagination

### Different Pagination per View

```python
# doctors/views.py
from rest_framework import generics
from .models import Doctor, Appointment
from .serializers import DoctorSerializer, AppointmentSerializer
from .pagination import StandardPagination, LargePagination

class DoctorListView(generics.ListAPIView):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
    pagination_class = StandardPagination  # 10 per page


class AppointmentListView(generics.ListAPIView):
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer
    pagination_class = LargePagination  # 50 per page
```

### Disable Pagination

```python
class AllDoctorsView(generics.ListAPIView):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
    pagination_class = None  # No pagination
```

---

## ViewSet Pagination

```python
# doctors/viewsets.py
from rest_framework import viewsets
from .models import Doctor
from .serializers import DoctorSerializer
from .pagination import StandardPagination

class DoctorViewSet(viewsets.ModelViewSet):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
    pagination_class = StandardPagination
```

---

## Pagination with Filtering

```python
# doctors/views.py
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework import generics
from .models import Doctor
from .serializers import DoctorSerializer
from .pagination import StandardPagination

class DoctorListView(generics.ListAPIView):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
    pagination_class = StandardPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_on_vacation', 'qualification']
    search_fields = ['first_name', 'last_name']
    ordering_fields = ['created_at', 'last_name']
```

Usage:
```bash
GET /api/doctors/?is_on_vacation=false&search=john&page=1&page_size=20
```

---

## API Actions with Pagination

```python
# doctors/viewsets.py
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Doctor
from .serializers import DoctorSerializer
from .pagination import StandardPagination

class DoctorViewSet(viewsets.ModelViewSet):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
    pagination_class = StandardPagination

    @action(detail=False, methods=['get'])
    def available(self, request):
        """Get available doctors with pagination."""
        available_doctors = self.queryset.filter(is_on_vacation=False)

        # Apply pagination
        page = self.paginate_queryset(available_doctors)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(available_doctors, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def appointments(self, request, pk=None):
        """Get doctor's appointments with pagination."""
        doctor = self.get_object()
        appointments = doctor.appointments.all()

        page = self.paginate_queryset(appointments)
        if page is not None:
            from bookings.serializers import AppointmentSerializer
            serializer = AppointmentSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = AppointmentSerializer(appointments, many=True)
        return Response(serializer.data)
```

---

## Comparison Table

| Feature | PageNumber | LimitOffset | Cursor |
|---------|------------|-------------|--------|
| Jump to page | ✅ | ✅ | ❌ |
| Total count | ✅ | ✅ | ❌ |
| Performance | Medium | Medium | Best |
| Consistent results | ❌ | ❌ | ✅ |
| Use case | General | APIs | Real-time/Large data |

---

## Best Practices

| Practice | Description |
|----------|-------------|
| Set max_page_size | Prevent abuse with large requests |
| Use CursorPagination for large datasets | Better performance |
| Consistent ordering | Required for cursor pagination |
| Document pagination | Include in API docs |
| Consider caching | Cache paginated responses |

---

## Next Steps

- [Throttling](./13-throttling.md) - Rate limiting for APIs

---

[← Previous: Filtering and Search](./11-filtering-search.md) | [Back to Index](./README.md) | [Next: Throttling →](./13-throttling.md)
