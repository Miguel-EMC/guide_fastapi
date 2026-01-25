# Filtering and Search

Django REST Framework provides powerful filtering capabilities to query and search your API data.

## Installation

```bash
pip install django-filter
```

```python
# settings.py
INSTALLED_APPS = [
    ...
    'django_filters',
]

REST_FRAMEWORK = {
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
}
```

---

## DjangoFilterBackend

### Basic Filtering

```python
# doctors/views.py
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics
from .models import Doctor
from .serializers import DoctorSerializer

class DoctorListView(generics.ListAPIView):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['is_on_vacation', 'qualification']
```

Usage:
```bash
GET /api/doctors/?is_on_vacation=true
GET /api/doctors/?qualification=Cardiologist
GET /api/doctors/?is_on_vacation=false&qualification=GP
```

### Custom FilterSet

```python
# doctors/filters.py
import django_filters
from .models import Doctor, Appointment

class DoctorFilter(django_filters.FilterSet):
    first_name = django_filters.CharFilter(lookup_expr='icontains')
    last_name = django_filters.CharFilter(lookup_expr='icontains')
    email = django_filters.CharFilter(lookup_expr='icontains')
    qualification = django_filters.CharFilter(lookup_expr='iexact')
    is_available = django_filters.BooleanFilter(
        field_name='is_on_vacation',
        exclude=True  # Inverts the filter
    )

    class Meta:
        model = Doctor
        fields = ['first_name', 'last_name', 'email', 'qualification', 'is_available']


class AppointmentFilter(django_filters.FilterSet):
    doctor = django_filters.NumberFilter()
    patient = django_filters.NumberFilter()
    status = django_filters.ChoiceFilter(choices=Appointment.STATUS_CHOICES)
    date_from = django_filters.DateFilter(
        field_name='appointment_date',
        lookup_expr='gte'
    )
    date_to = django_filters.DateFilter(
        field_name='appointment_date',
        lookup_expr='lte'
    )
    date = django_filters.DateFilter(field_name='appointment_date')

    class Meta:
        model = Appointment
        fields = ['doctor', 'patient', 'status', 'date_from', 'date_to', 'date']
```

```python
# doctors/views.py
from .filters import DoctorFilter

class DoctorListView(generics.ListAPIView):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = DoctorFilter
```

Usage:
```bash
GET /api/doctors/?first_name=john
GET /api/doctors/?is_available=true
GET /api/appointments/?date_from=2024-01-01&date_to=2024-12-31
GET /api/appointments/?status=scheduled&doctor=1
```

### Filter Lookup Expressions

| Lookup | Description | Example |
|--------|-------------|---------|
| `exact` | Exact match (default) | `name=John` |
| `iexact` | Case-insensitive exact | `name__iexact=john` |
| `contains` | Contains substring | `name__contains=oh` |
| `icontains` | Case-insensitive contains | `name__icontains=oh` |
| `gt`, `gte` | Greater than (or equal) | `age__gte=18` |
| `lt`, `lte` | Less than (or equal) | `price__lte=100` |
| `in` | In list | `status__in=active,pending` |
| `range` | Between two values | `date__range=2024-01-01,2024-12-31` |
| `isnull` | Is null check | `email__isnull=false` |

### Advanced Filters

```python
# doctors/filters.py
import django_filters
from django.db.models import Q

class DoctorFilter(django_filters.FilterSet):
    # Multiple choice filter
    qualification = django_filters.MultipleChoiceFilter(
        choices=[
            ('GP', 'General Practitioner'),
            ('Cardiologist', 'Cardiologist'),
            ('Neurologist', 'Neurologist'),
        ]
    )

    # Range filter
    created_after = django_filters.DateTimeFilter(
        field_name='created_at',
        lookup_expr='gte'
    )
    created_before = django_filters.DateTimeFilter(
        field_name='created_at',
        lookup_expr='lte'
    )

    # Custom method filter
    has_appointments = django_filters.BooleanFilter(method='filter_has_appointments')
    name = django_filters.CharFilter(method='filter_full_name')

    class Meta:
        model = Doctor
        fields = ['qualification', 'is_on_vacation']

    def filter_has_appointments(self, queryset, name, value):
        if value:
            return queryset.filter(appointments__isnull=False).distinct()
        return queryset.filter(appointments__isnull=True)

    def filter_full_name(self, queryset, name, value):
        return queryset.filter(
            Q(first_name__icontains=value) | Q(last_name__icontains=value)
        )
```

---

## SearchFilter

Full-text search across multiple fields:

```python
# doctors/views.py
from rest_framework.filters import SearchFilter

class DoctorListView(generics.ListAPIView):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
    filter_backends = [SearchFilter]
    search_fields = ['first_name', 'last_name', 'email', 'qualification']
```

Usage:
```bash
GET /api/doctors/?search=john
GET /api/doctors/?search=cardio
```

### Search Field Modifiers

```python
search_fields = [
    '=first_name',      # Exact match
    '^last_name',       # Starts with
    '$email',           # Regex search
    '@biography',       # Full-text search (PostgreSQL)
    'first_name',       # Contains (default)
]
```

| Prefix | Behavior |
|--------|----------|
| `^` | Starts with |
| `=` | Exact match |
| `@` | Full-text search (PostgreSQL) |
| `$` | Regex search |
| None | Contains (icontains) |

### Related Field Search

```python
class AppointmentListView(generics.ListAPIView):
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer
    filter_backends = [SearchFilter]
    search_fields = [
        'notes',
        'doctor__first_name',
        'doctor__last_name',
        'patient__first_name',
        'patient__last_name',
    ]
```

---

## OrderingFilter

Sort results by specified fields:

```python
# doctors/views.py
from rest_framework.filters import OrderingFilter

class DoctorListView(generics.ListAPIView):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
    filter_backends = [OrderingFilter]
    ordering_fields = ['first_name', 'last_name', 'created_at']
    ordering = ['last_name']  # Default ordering
```

Usage:
```bash
GET /api/doctors/?ordering=first_name
GET /api/doctors/?ordering=-created_at
GET /api/doctors/?ordering=last_name,first_name
```

### All Fields Ordering

```python
class DoctorListView(generics.ListAPIView):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
    filter_backends = [OrderingFilter]
    ordering_fields = '__all__'  # Allow ordering by any field
```

---

## Combining Filter Backends

```python
# doctors/views.py
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework import generics
from .models import Doctor
from .serializers import DoctorSerializer
from .filters import DoctorFilter

class DoctorListView(generics.ListAPIView):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = DoctorFilter
    search_fields = ['first_name', 'last_name', 'qualification']
    ordering_fields = ['first_name', 'last_name', 'created_at']
    ordering = ['last_name']
```

Usage:
```bash
GET /api/doctors/?is_on_vacation=false&search=john&ordering=-created_at
```

---

## ViewSet with Filters

```python
# doctors/viewsets.py
from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import Doctor
from .serializers import DoctorSerializer
from .filters import DoctorFilter

class DoctorViewSet(viewsets.ModelViewSet):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = DoctorFilter
    search_fields = ['first_name', 'last_name', 'email', 'qualification']
    ordering_fields = ['first_name', 'last_name', 'created_at']
    ordering = ['last_name']
```

---

## Custom Filter Backend

```python
# doctors/filters.py
from rest_framework.filters import BaseFilterBackend

class IsOwnerFilterBackend(BaseFilterBackend):
    """
    Filter that only allows users to see their own objects.
    """
    def filter_queryset(self, request, queryset, view):
        return queryset.filter(created_by=request.user)


class ActiveOnlyFilterBackend(BaseFilterBackend):
    """
    Filter to show only active records.
    """
    def filter_queryset(self, request, queryset, view):
        show_inactive = request.query_params.get('show_inactive', 'false')
        if show_inactive.lower() != 'true':
            return queryset.filter(is_active=True)
        return queryset
```

```python
# Usage
class DoctorListView(generics.ListAPIView):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
    filter_backends = [IsOwnerFilterBackend, DjangoFilterBackend]
```

---

## Filter with Swagger Documentation

```python
# doctors/filters.py
import django_filters
from drf_spectacular.utils import extend_schema_field
from drf_spectacular.types import OpenApiTypes

class DoctorFilter(django_filters.FilterSet):
    @extend_schema_field(OpenApiTypes.STR)
    def filter_full_name(self, queryset, name, value):
        return queryset.filter(
            Q(first_name__icontains=value) | Q(last_name__icontains=value)
        )

    name = django_filters.CharFilter(
        method='filter_full_name',
        help_text='Search by first or last name'
    )

    class Meta:
        model = Doctor
        fields = ['name', 'is_on_vacation']
```

---

## Complete Example

```python
# doctors/filters.py
import django_filters
from django.db.models import Q, Count
from .models import Doctor, Appointment

class DoctorFilter(django_filters.FilterSet):
    # Basic filters
    qualification = django_filters.CharFilter(lookup_expr='iexact')
    is_available = django_filters.BooleanFilter(
        field_name='is_on_vacation',
        exclude=True
    )

    # Search filter
    name = django_filters.CharFilter(method='filter_name')

    # Date range
    available_from = django_filters.DateFilter(
        method='filter_available_from'
    )
    available_to = django_filters.DateFilter(
        method='filter_available_to'
    )

    # Aggregation filter
    min_appointments = django_filters.NumberFilter(
        method='filter_min_appointments'
    )

    class Meta:
        model = Doctor
        fields = ['qualification', 'is_available', 'name']

    def filter_name(self, queryset, name, value):
        return queryset.filter(
            Q(first_name__icontains=value) | Q(last_name__icontains=value)
        )

    def filter_available_from(self, queryset, name, value):
        return queryset.filter(
            availabilities__start_date__lte=value,
            availabilities__end_date__gte=value
        ).distinct()

    def filter_available_to(self, queryset, name, value):
        return queryset.filter(
            availabilities__end_date__gte=value
        ).distinct()

    def filter_min_appointments(self, queryset, name, value):
        return queryset.annotate(
            appointment_count=Count('appointments')
        ).filter(appointment_count__gte=value)
```

```python
# doctors/views.py
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework import generics
from .models import Doctor
from .serializers import DoctorSerializer
from .filters import DoctorFilter

class DoctorListView(generics.ListAPIView):
    """
    List doctors with filtering, search, and ordering.

    Filters:
    - qualification: Filter by qualification (exact match)
    - is_available: Filter available doctors (not on vacation)
    - name: Search by first or last name
    - available_from: Filter by availability start date
    - min_appointments: Filter by minimum number of appointments

    Search:
    - search: Full-text search in name, email, qualification

    Ordering:
    - ordering: Sort by first_name, last_name, or created_at
    """
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = DoctorFilter
    search_fields = ['first_name', 'last_name', 'email', 'qualification']
    ordering_fields = ['first_name', 'last_name', 'created_at']
    ordering = ['last_name']
```

---

## Next Steps

- [Pagination](./12-pagination.md) - Paginate large result sets

---

[← Previous: Project Doctor API](./10-project-doctor-api.md) | [Back to Index](./README.md) | [Next: Pagination →](./12-pagination.md)
