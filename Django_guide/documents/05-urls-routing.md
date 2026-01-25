# URLs and Routing

Django REST Framework provides flexible URL routing through standard Django URL patterns and automatic routing with Routers for ViewSets.

## Basic URL Patterns

### Standard Django URLs

```python
# doctors/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('doctors/', views.ListDoctorView.as_view(), name='doctor-list'),
    path('doctors/<int:pk>/', views.DetailDoctorView.as_view(), name='doctor-detail'),
    path('departments/', views.ListDepartmentView.as_view(), name='department-list'),
    path('departments/<int:pk>/', views.DetailDepartmentView.as_view(), name='department-detail'),
]
```

### URL Parameters

```python
from django.urls import path

urlpatterns = [
    # Integer parameter
    path('doctors/<int:pk>/', views.DoctorDetailView.as_view()),

    # String parameter
    path('doctors/<str:slug>/', views.DoctorBySlugView.as_view()),

    # UUID parameter
    path('doctors/<uuid:id>/', views.DoctorByUUIDView.as_view()),

    # Multiple parameters
    path('doctors/<int:doctor_id>/appointments/<int:appointment_id>/',
         views.DoctorAppointmentDetailView.as_view()),
]
```

### Root URL Configuration

```python
# doctorapp/urls.py
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('doctors.urls')),
    path('api/', include('patients.urls')),
    path('api/', include('bookings.urls')),
    path('api-auth/', include('rest_framework.urls')),  # DRF login/logout
]
```

## Routers for ViewSets

Routers automatically generate URL patterns for ViewSets.

### SimpleRouter

```python
# doctors/urls.py
from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .viewsets import DoctorViewSet

router = SimpleRouter()
router.register(r'doctors', DoctorViewSet, basename='doctor')

urlpatterns = [
    path('', include(router.urls)),
]
```

Generated URLs:
| URL | Method | Action | Name |
|-----|--------|--------|------|
| `/doctors/` | GET | list | doctor-list |
| `/doctors/` | POST | create | doctor-list |
| `/doctors/{pk}/` | GET | retrieve | doctor-detail |
| `/doctors/{pk}/` | PUT | update | doctor-detail |
| `/doctors/{pk}/` | PATCH | partial_update | doctor-detail |
| `/doctors/{pk}/` | DELETE | destroy | doctor-detail |

### DefaultRouter

Includes API root view and format suffixes:

```python
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'doctors', DoctorViewSet, basename='doctor')
router.register(r'patients', PatientViewSet, basename='patient')
router.register(r'appointments', AppointmentViewSet, basename='appointment')

urlpatterns = [
    path('', include(router.urls)),
]
```

Additional URLs with DefaultRouter:
- `/` - API root (lists all endpoints)
- `/doctors.json` - Format suffix support
- `/doctors/{pk}.json`

### Custom Actions URLs

When using `@action` decorator in ViewSets:

```python
# doctors/viewsets.py
class DoctorViewSet(viewsets.ModelViewSet):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer

    @action(detail=True, methods=['post'])
    def set_on_vacation(self, request, pk=None):
        pass

    @action(detail=True, methods=['get', 'post'])
    def appointments(self, request, pk=None):
        pass

    @action(detail=False, methods=['get'])
    def available(self, request):
        pass
```

Generated URLs:
| URL | Method | Action |
|-----|--------|--------|
| `/doctors/{pk}/set_on_vacation/` | POST | set_on_vacation |
| `/doctors/{pk}/appointments/` | GET, POST | appointments |
| `/doctors/available/` | GET | available |

### Custom URL Path for Actions

```python
@action(detail=True, methods=['post'], url_path='mark-as-vacation')
def set_on_vacation(self, request, pk=None):
    pass
# URL: /doctors/{pk}/mark-as-vacation/

@action(detail=True, methods=['get'], url_path='appointments/upcoming')
def upcoming_appointments(self, request, pk=None):
    pass
# URL: /doctors/{pk}/appointments/upcoming/
```

## Multiple Routers

```python
# doctors/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .viewsets import DoctorViewSet, DepartmentViewSet

router = DefaultRouter()
router.register(r'doctors', DoctorViewSet)
router.register(r'departments', DepartmentViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
```

## Combining Router URLs with Regular URLs

```python
# doctors/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .viewsets import DoctorViewSet

router = DefaultRouter()
router.register(r'doctors', DoctorViewSet)

urlpatterns = [
    # Router URLs
    path('', include(router.urls)),

    # Additional regular URLs
    path('departments/', views.ListDepartmentView.as_view(), name='department-list'),
    path('departments/<int:pk>/', views.DetailDepartmentView.as_view(), name='department-detail'),
    path('availabilities/', views.ListDoctorAvailabilityView.as_view(), name='availability-list'),
]
```

## Nested Routes

For nested resources like `/doctors/{id}/appointments/`:

### Manual Nested URLs

```python
# doctors/urls.py
urlpatterns = [
    path('doctors/', views.DoctorListView.as_view()),
    path('doctors/<int:pk>/', views.DoctorDetailView.as_view()),
    path('doctors/<int:doctor_pk>/appointments/',
         views.DoctorAppointmentsView.as_view()),
    path('doctors/<int:doctor_pk>/appointments/<int:pk>/',
         views.DoctorAppointmentDetailView.as_view()),
]

# doctors/views.py
class DoctorAppointmentsView(generics.ListCreateAPIView):
    serializer_class = AppointmentSerializer

    def get_queryset(self):
        doctor_pk = self.kwargs['doctor_pk']
        return Appointment.objects.filter(doctor_id=doctor_pk)

    def perform_create(self, serializer):
        doctor_pk = self.kwargs['doctor_pk']
        doctor = get_object_or_404(Doctor, pk=doctor_pk)
        serializer.save(doctor=doctor)
```

### Using drf-nested-routers (Optional)

```bash
pip install drf-nested-routers
```

```python
from rest_framework_nested import routers

router = routers.DefaultRouter()
router.register(r'doctors', DoctorViewSet)

# Nested router for appointments under doctors
doctors_router = routers.NestedDefaultRouter(router, r'doctors', lookup='doctor')
doctors_router.register(r'appointments', DoctorAppointmentViewSet, basename='doctor-appointments')

urlpatterns = [
    path('', include(router.urls)),
    path('', include(doctors_router.urls)),
]
# URLs: /doctors/{doctor_pk}/appointments/
```

## URL Namespacing

```python
# doctors/urls.py
app_name = 'doctors'  # Namespace

urlpatterns = [
    path('doctors/', views.DoctorListView.as_view(), name='list'),
    path('doctors/<int:pk>/', views.DoctorDetailView.as_view(), name='detail'),
]

# Usage in code:
from django.urls import reverse
url = reverse('doctors:list')  # '/api/doctors/'
url = reverse('doctors:detail', kwargs={'pk': 1})  # '/api/doctors/1/'
```

## Format Suffixes

Enable format suffix patterns (`.json`, `.api`):

```python
# doctors/urls.py
from rest_framework.urlpatterns import format_suffix_patterns

urlpatterns = [
    path('doctors/', views.DoctorListView.as_view()),
    path('doctors/<int:pk>/', views.DoctorDetailView.as_view()),
]

urlpatterns = format_suffix_patterns(urlpatterns)
# Allows: /doctors.json, /doctors/1.json
```

In views:
```python
class DoctorListView(generics.ListAPIView):
    def get(self, request, format=None):
        # format parameter available
        pass
```

## Complete URL Configuration

```python
# doctorapp/urls.py
from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),

    # API endpoints
    path('api/', include('doctors.urls')),
    path('api/', include('patients.urls')),
    path('api/', include('bookings.urls')),

    # DRF authentication views
    path('api-auth/', include('rest_framework.urls')),

    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/schema/swagger-ui/',
         SpectacularSwaggerView.as_view(url_name='schema'),
         name='swagger-ui'),
    path('api/schema/redoc/',
         SpectacularRedocView.as_view(url_name='schema'),
         name='redoc'),
]
```

```python
# doctors/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .viewsets import DoctorViewSet

router = DefaultRouter()
router.register(r'doctors', DoctorViewSet, basename='doctor')

urlpatterns = [
    path('', include(router.urls)),
    path('departments/', views.ListDepartmentView.as_view(), name='department-list'),
    path('departments/<int:pk>/', views.DetailDepartmentView.as_view(), name='department-detail'),
    path('doctoravailabilities/', views.ListDoctorAvailabilityView.as_view(), name='availability-list'),
    path('doctoravailabilities/<int:pk>/', views.DetailDoctorAvailabilityView.as_view(), name='availability-detail'),
    path('medicalnotes/', views.ListMedicalNoteView.as_view(), name='medicalnote-list'),
    path('medicalnotes/<int:pk>/', views.DetailMedicalNoteView.as_view(), name='medicalnote-detail'),
]
```

## URL Best Practices

| Practice | Example |
|----------|---------|
| Use lowercase | `/doctors/` not `/Doctors/` |
| Use hyphens | `/medical-notes/` not `/medical_notes/` |
| Use plural nouns | `/doctors/` not `/doctor/` |
| Version your API | `/api/v1/doctors/` |
| Keep it simple | Avoid deep nesting |
| Use meaningful names | Clear, descriptive URLs |

---

## Next Steps

- [Authentication and Permissions](./06-authentication-permissions.md) - Securing your API

---

[← Previous: Views and ViewSets](./04-views-viewsets.md) | [Back to Index](./README.md) | [Next: Authentication and Permissions →](./06-authentication-permissions.md)
