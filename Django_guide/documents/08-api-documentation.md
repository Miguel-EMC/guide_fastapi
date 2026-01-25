# API Documentation

drf-spectacular generates OpenAPI 3.0 schemas for Django REST Framework, providing Swagger UI and ReDoc interfaces.

## Installation

```bash
pip install drf-spectacular
```

## Configuration

### Settings

```python
# settings.py
INSTALLED_APPS = [
    ...
    'drf_spectacular',
]

REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'Doctor API',
    'DESCRIPTION': 'Healthcare Management System API',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,

    # Contact information
    'CONTACT': {
        'name': 'API Support',
        'email': 'support@example.com',
    },

    # License
    'LICENSE': {
        'name': 'MIT License',
    },

    # Tags for grouping endpoints
    'TAGS': [
        {'name': 'doctors', 'description': 'Doctor management endpoints'},
        {'name': 'patients', 'description': 'Patient management endpoints'},
        {'name': 'appointments', 'description': 'Appointment booking endpoints'},
    ],

    # Security schemes
    'SECURITY': [{'bearerAuth': []}],

    # Schema customization
    'COMPONENT_SPLIT_REQUEST': True,
    'SORT_OPERATIONS': False,
}
```

### URL Configuration

```python
# docs/urls.py
from django.urls import path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)

urlpatterns = [
    # OpenAPI schema (JSON/YAML)
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),

    # Swagger UI
    path('api/schema/swagger-ui/',
         SpectacularSwaggerView.as_view(url_name='schema'),
         name='swagger-ui'),

    # ReDoc
    path('api/schema/redoc/',
         SpectacularRedocView.as_view(url_name='schema'),
         name='redoc'),
]
```

```python
# doctorapp/urls.py
from django.urls import path, include

urlpatterns = [
    ...
    path('', include('docs.urls')),
]
```

## Documenting Views

### extend_schema Decorator

```python
# doctors/views.py
from rest_framework import generics
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample
from .models import Doctor
from .serializers import DoctorSerializer

class ListDoctorView(generics.ListCreateAPIView):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer

    @extend_schema(
        summary="List all doctors",
        description="Returns a list of all doctors in the system.",
        tags=['doctors'],
        parameters=[
            OpenApiParameter(
                name='on_vacation',
                type=bool,
                location=OpenApiParameter.QUERY,
                description='Filter by vacation status',
            ),
            OpenApiParameter(
                name='search',
                type=str,
                location=OpenApiParameter.QUERY,
                description='Search by name',
            ),
        ],
        responses={
            200: DoctorSerializer(many=True),
            401: None,
        },
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(
        summary="Create a doctor",
        description="Create a new doctor record.",
        tags=['doctors'],
        request=DoctorSerializer,
        responses={
            201: DoctorSerializer,
            400: None,
        },
        examples=[
            OpenApiExample(
                'Create Doctor Example',
                value={
                    'first_name': 'John',
                    'last_name': 'Smith',
                    'email': 'john.smith@example.com',
                    'qualification': 'Cardiologist',
                    'contact_number': '+1234567890',
                },
                request_only=True,
            ),
        ],
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)
```

### Documenting ViewSets

```python
# doctors/viewsets.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiResponse

@extend_schema_view(
    list=extend_schema(
        summary="List doctors",
        tags=['doctors'],
    ),
    create=extend_schema(
        summary="Create doctor",
        tags=['doctors'],
    ),
    retrieve=extend_schema(
        summary="Get doctor details",
        tags=['doctors'],
    ),
    update=extend_schema(
        summary="Update doctor",
        tags=['doctors'],
    ),
    partial_update=extend_schema(
        summary="Partial update doctor",
        tags=['doctors'],
    ),
    destroy=extend_schema(
        summary="Delete doctor",
        tags=['doctors'],
    ),
)
class DoctorViewSet(viewsets.ModelViewSet):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer

    @extend_schema(
        summary="Set doctor on vacation",
        description="Mark a doctor as being on vacation.",
        tags=['doctors'],
        request=None,
        responses={
            200: OpenApiResponse(description='Success'),
            404: OpenApiResponse(description='Doctor not found'),
        },
    )
    @action(detail=True, methods=['post'])
    def set_on_vacation(self, request, pk=None):
        doctor = self.get_object()
        doctor.is_on_vacation = True
        doctor.save()
        return Response({'status': 'Doctor is now on vacation'})

    @extend_schema(
        summary="Get doctor's appointments",
        tags=['doctors', 'appointments'],
        responses={200: AppointmentSerializer(many=True)},
    )
    @action(detail=True, methods=['get'])
    def appointments(self, request, pk=None):
        doctor = self.get_object()
        appointments = Appointment.objects.filter(doctor=doctor)
        serializer = AppointmentSerializer(appointments, many=True)
        return Response(serializer.data)
```

## Documenting Serializers

### Serializer Documentation

```python
# doctors/serializers.py
from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from drf_spectacular.types import OpenApiTypes

class DoctorSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField(
        help_text="Doctor's full name with title"
    )
    age = serializers.SerializerMethodField()

    class Meta:
        model = Doctor
        fields = [
            'id', 'first_name', 'last_name', 'full_name',
            'email', 'qualification', 'is_on_vacation', 'age'
        ]
        extra_kwargs = {
            'first_name': {
                'help_text': 'Doctor\'s first name',
                'min_length': 2,
            },
            'last_name': {
                'help_text': 'Doctor\'s last name',
            },
            'email': {
                'help_text': 'Email must be from @example.com domain',
            },
        }

    @extend_schema_field(OpenApiTypes.STR)
    def get_full_name(self, obj):
        """Get doctor's full name with Dr. title."""
        return f"Dr. {obj.first_name} {obj.last_name}"

    @extend_schema_field(OpenApiTypes.INT)
    def get_age(self, obj):
        """Calculate doctor's age from birth date."""
        return 45  # Example
```

### Inline Serializers

```python
from drf_spectacular.utils import inline_serializer
from rest_framework import serializers

@extend_schema(
    request=inline_serializer(
        name='VacationRequest',
        fields={
            'start_date': serializers.DateField(),
            'end_date': serializers.DateField(),
            'reason': serializers.CharField(required=False),
        }
    ),
    responses={200: DoctorSerializer},
)
@action(detail=True, methods=['post'])
def set_vacation_period(self, request, pk=None):
    pass
```

## OpenAPI Parameters

### Query Parameters

```python
from drf_spectacular.utils import extend_schema, OpenApiParameter

@extend_schema(
    parameters=[
        OpenApiParameter(
            name='page',
            type=int,
            location=OpenApiParameter.QUERY,
            description='Page number',
            default=1,
        ),
        OpenApiParameter(
            name='page_size',
            type=int,
            location=OpenApiParameter.QUERY,
            description='Items per page',
            default=10,
        ),
        OpenApiParameter(
            name='status',
            type=str,
            location=OpenApiParameter.QUERY,
            description='Filter by status',
            enum=['scheduled', 'completed', 'cancelled'],
        ),
        OpenApiParameter(
            name='date_from',
            type=OpenApiTypes.DATE,
            location=OpenApiParameter.QUERY,
            description='Filter from date (YYYY-MM-DD)',
        ),
    ],
)
def get(self, request):
    pass
```

### Path Parameters

```python
@extend_schema(
    parameters=[
        OpenApiParameter(
            name='id',
            type=int,
            location=OpenApiParameter.PATH,
            description='Doctor ID',
        ),
    ],
)
def get(self, request, id):
    pass
```

### Header Parameters

```python
@extend_schema(
    parameters=[
        OpenApiParameter(
            name='X-Request-ID',
            type=str,
            location=OpenApiParameter.HEADER,
            description='Request tracking ID',
        ),
    ],
)
def get(self, request):
    pass
```

## Response Documentation

```python
from drf_spectacular.utils import extend_schema, OpenApiResponse

@extend_schema(
    responses={
        200: OpenApiResponse(
            response=DoctorSerializer,
            description='Doctor details'
        ),
        400: OpenApiResponse(
            description='Bad request - Invalid input'
        ),
        401: OpenApiResponse(
            description='Unauthorized - Authentication required'
        ),
        403: OpenApiResponse(
            description='Forbidden - Insufficient permissions'
        ),
        404: OpenApiResponse(
            description='Not found - Doctor does not exist'
        ),
    },
)
def get(self, request, pk):
    pass
```

## Examples

```python
from drf_spectacular.utils import extend_schema, OpenApiExample

@extend_schema(
    examples=[
        OpenApiExample(
            'Successful Response',
            value={
                'id': 1,
                'first_name': 'John',
                'last_name': 'Smith',
                'email': 'john.smith@example.com',
                'qualification': 'Cardiologist',
                'is_on_vacation': False,
            },
            response_only=True,
            status_codes=['200'],
        ),
        OpenApiExample(
            'Create Request',
            value={
                'first_name': 'John',
                'last_name': 'Smith',
                'email': 'john.smith@example.com',
                'qualification': 'Cardiologist',
            },
            request_only=True,
        ),
        OpenApiExample(
            'Error Response',
            value={
                'email': ['This email is already registered'],
            },
            response_only=True,
            status_codes=['400'],
        ),
    ],
)
def post(self, request):
    pass
```

## Tags and Grouping

```python
# settings.py
SPECTACULAR_SETTINGS = {
    'TAGS': [
        {'name': 'doctors', 'description': 'Doctor CRUD operations'},
        {'name': 'patients', 'description': 'Patient management'},
        {'name': 'appointments', 'description': 'Appointment scheduling'},
        {'name': 'auth', 'description': 'Authentication endpoints'},
    ],
}
```

```python
# In views
@extend_schema(tags=['doctors'])
class DoctorViewSet(viewsets.ModelViewSet):
    pass

# Or per method
@extend_schema(tags=['doctors', 'appointments'])
@action(detail=True, methods=['get'])
def appointments(self, request, pk=None):
    pass
```

## Security Schemes

```python
# settings.py
SPECTACULAR_SETTINGS = {
    'SECURITY': [
        {'bearerAuth': []},
    ],
    'APPEND_COMPONENTS': {
        'securitySchemes': {
            'bearerAuth': {
                'type': 'http',
                'scheme': 'bearer',
                'bearerFormat': 'JWT',
            },
            'basicAuth': {
                'type': 'http',
                'scheme': 'basic',
            },
            'apiKeyAuth': {
                'type': 'apiKey',
                'in': 'header',
                'name': 'X-API-Key',
            },
        },
    },
}
```

## Generate Schema File

```bash
# Generate OpenAPI schema
python manage.py spectacular --file schema.yml

# Or JSON format
python manage.py spectacular --file schema.json --format json
```

## Complete Documentation Example

```python
# bookings/views.py
from rest_framework import generics, status
from rest_framework.response import Response
from drf_spectacular.utils import (
    extend_schema,
    OpenApiParameter,
    OpenApiExample,
    OpenApiResponse,
)
from .models import Appointment
from .serializers import AppointmentSerializer


class ListAppointmentView(generics.ListAPIView, generics.CreateAPIView):
    """
    Appointment management endpoints.
    """
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer

    @extend_schema(
        summary="List appointments",
        description="Get a list of all appointments with optional filtering.",
        tags=['appointments'],
        parameters=[
            OpenApiParameter(
                name='doctor',
                type=int,
                location=OpenApiParameter.QUERY,
                description='Filter by doctor ID',
            ),
            OpenApiParameter(
                name='patient',
                type=int,
                location=OpenApiParameter.QUERY,
                description='Filter by patient ID',
            ),
            OpenApiParameter(
                name='status',
                type=str,
                location=OpenApiParameter.QUERY,
                description='Filter by appointment status',
                enum=['scheduled', 'completed', 'cancelled'],
            ),
            OpenApiParameter(
                name='date',
                type=str,
                location=OpenApiParameter.QUERY,
                description='Filter by date (YYYY-MM-DD)',
            ),
        ],
        responses={
            200: AppointmentSerializer(many=True),
        },
    )
    def get(self, request, *args, **kwargs):
        """Get list of appointments."""
        return super().get(request, *args, **kwargs)

    @extend_schema(
        summary="Create appointment",
        description="Schedule a new appointment.",
        tags=['appointments'],
        request=AppointmentSerializer,
        responses={
            201: AppointmentSerializer,
            400: OpenApiResponse(description='Validation error'),
        },
        examples=[
            OpenApiExample(
                'Schedule Appointment',
                value={
                    'patient': 1,
                    'doctor': 1,
                    'appointment_date': '2024-03-15',
                    'appointment_time': '10:00:00',
                    'notes': 'Regular checkup',
                },
                request_only=True,
            ),
        ],
    )
    def post(self, request, *args, **kwargs):
        """Create a new appointment."""
        return super().post(request, *args, **kwargs)
```

---

## Next Steps

- [Testing](./09-testing.md) - Unit and API tests

---

[← Previous: Validation](./07-validation.md) | [Back to Index](./README.md) | [Next: Testing →](./09-testing.md)
