# Views and ViewSets

DRF provides several ways to build API views: function-based views, class-based views, generic views, and ViewSets.

## Function-Based Views

### Basic Function View

```python
# doctors/views.py
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import Doctor
from .serializers import DoctorSerializer

@api_view(['GET', 'POST'])
def doctor_list(request):
    if request.method == 'GET':
        doctors = Doctor.objects.all()
        serializer = DoctorSerializer(doctors, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = DoctorSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
def doctor_detail(request, pk):
    try:
        doctor = Doctor.objects.get(pk=pk)
    except Doctor.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = DoctorSerializer(doctor)
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = DoctorSerializer(doctor, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        doctor.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
```

## Class-Based Views (APIView)

### Basic APIView

```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Doctor
from .serializers import DoctorSerializer

class DoctorListView(APIView):
    """List all doctors or create a new doctor."""

    def get(self, request):
        doctors = Doctor.objects.all()
        serializer = DoctorSerializer(doctors, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = DoctorSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DoctorDetailView(APIView):
    """Retrieve, update or delete a doctor."""

    def get_object(self, pk):
        try:
            return Doctor.objects.get(pk=pk)
        except Doctor.DoesNotExist:
            raise Http404

    def get(self, request, pk):
        doctor = self.get_object(pk)
        serializer = DoctorSerializer(doctor)
        return Response(serializer.data)

    def put(self, request, pk):
        doctor = self.get_object(pk)
        serializer = DoctorSerializer(doctor, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        doctor = self.get_object(pk)
        doctor.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
```

## Generic Views

DRF provides pre-built generic views for common patterns:

### Generic View Classes

| Class | Methods | Description |
|-------|---------|-------------|
| `CreateAPIView` | POST | Create a resource |
| `ListAPIView` | GET | List resources |
| `RetrieveAPIView` | GET | Retrieve single resource |
| `DestroyAPIView` | DELETE | Delete a resource |
| `UpdateAPIView` | PUT, PATCH | Update a resource |
| `ListCreateAPIView` | GET, POST | List and create |
| `RetrieveUpdateAPIView` | GET, PUT, PATCH | Retrieve and update |
| `RetrieveDestroyAPIView` | GET, DELETE | Retrieve and delete |
| `RetrieveUpdateDestroyAPIView` | GET, PUT, PATCH, DELETE | Full CRUD on single resource |

### Using Generic Views

```python
# doctors/views.py
from rest_framework import generics
from .models import Doctor, Department, DoctorAvailability
from .serializers import (
    DoctorSerializer,
    DepartmentSerializer,
    DoctorAvailabilitySerializer
)

# List and Create
class ListDoctorView(generics.ListCreateAPIView):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer

# Retrieve, Update, Delete
class DetailDoctorView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer

# List only
class ListDepartmentView(generics.ListAPIView):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer

# Create only
class CreateDoctorView(generics.CreateAPIView):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
```

### Combining Generic Views

```python
# patients/views.py
from rest_framework import generics
from .models import Patient
from .serializers import PatientSerializer

class ListPatientsView(generics.ListAPIView, generics.CreateAPIView):
    """
    GET: List all patients
    POST: Create a new patient
    """
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer


class DetailPatientView(
    generics.RetrieveAPIView,
    generics.UpdateAPIView,
    generics.DestroyAPIView
):
    """
    GET: Retrieve a patient
    PUT/PATCH: Update a patient
    DELETE: Delete a patient
    """
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
```

### Customizing Generic Views

```python
class ListDoctorView(generics.ListCreateAPIView):
    serializer_class = DoctorSerializer

    def get_queryset(self):
        """Filter doctors based on query params."""
        queryset = Doctor.objects.all()

        # Filter by vacation status
        on_vacation = self.request.query_params.get('on_vacation')
        if on_vacation is not None:
            queryset = queryset.filter(is_on_vacation=on_vacation == 'true')

        # Search by name
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)
            )

        return queryset

    def perform_create(self, serializer):
        """Custom create logic."""
        serializer.save(created_by=self.request.user)
```

## ViewSets

ViewSets combine multiple view actions into a single class:

### Basic ViewSet

```python
# doctors/viewsets.py
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import Doctor
from .serializers import DoctorSerializer

class DoctorViewSet(viewsets.ModelViewSet):
    """
    A viewset for viewing and editing doctor instances.

    Provides: list, create, retrieve, update, partial_update, destroy
    """
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
```

### ViewSet Types

| ViewSet | Included Actions |
|---------|-----------------|
| `ViewSet` | Base class, no actions |
| `GenericViewSet` | Generic view behavior, no actions |
| `ModelViewSet` | Full CRUD: list, create, retrieve, update, partial_update, destroy |
| `ReadOnlyModelViewSet` | Read-only: list, retrieve |

### Custom Actions

```python
# doctors/viewsets.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Doctor
from .serializers import DoctorSerializer
from bookings.models import Appointment
from bookings.serializers import AppointmentSerializer

class DoctorViewSet(viewsets.ModelViewSet):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer

    @action(detail=True, methods=['post'])
    def set_on_vacation(self, request, pk=None):
        """Mark doctor as on vacation."""
        doctor = self.get_object()
        doctor.is_on_vacation = True
        doctor.save()
        return Response({'status': 'Doctor is now on vacation'})

    @action(detail=True, methods=['post'])
    def set_off_vacation(self, request, pk=None):
        """Mark doctor as off vacation."""
        doctor = self.get_object()
        doctor.is_on_vacation = False
        doctor.save()
        return Response({'status': 'Doctor is now available'})

    @action(detail=True, methods=['get', 'post'])
    def appointments(self, request, pk=None):
        """Get or create appointments for this doctor."""
        doctor = self.get_object()

        if request.method == 'GET':
            appointments = Appointment.objects.filter(doctor=doctor)
            serializer = AppointmentSerializer(appointments, many=True)
            return Response(serializer.data)

        elif request.method == 'POST':
            serializer = AppointmentSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save(doctor=doctor)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def available(self, request):
        """List all available (not on vacation) doctors."""
        doctors = Doctor.objects.filter(is_on_vacation=False)
        serializer = self.get_serializer(doctors, many=True)
        return Response(serializer.data)
```

### Custom Action Decorators

```python
from rest_framework.decorators import action

# Detail action (operates on single object)
@action(detail=True, methods=['post'])
def activate(self, request, pk=None):
    pass

# List action (operates on collection)
@action(detail=False, methods=['get'])
def recent(self, request):
    pass

# Custom URL path
@action(detail=True, methods=['post'], url_path='mark-complete')
def mark_complete(self, request, pk=None):
    pass

# Different serializer for action
@action(detail=True, methods=['get'], serializer_class=DetailedDoctorSerializer)
def detailed(self, request, pk=None):
    pass
```

## Mixins

Create custom ViewSets with specific actions:

```python
from rest_framework import viewsets, mixins

# Read-only viewset (list + retrieve)
class ReadOnlyDoctorViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet
):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer

# Create and List only
class CreateListDoctorViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet
):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
```

### Available Mixins

| Mixin | Action | Method |
|-------|--------|--------|
| `CreateModelMixin` | create | POST |
| `ListModelMixin` | list | GET |
| `RetrieveModelMixin` | retrieve | GET |
| `UpdateModelMixin` | update, partial_update | PUT, PATCH |
| `DestroyModelMixin` | destroy | DELETE |

## Response and Status Codes

```python
from rest_framework.response import Response
from rest_framework import status

# Success responses
Response(data, status=status.HTTP_200_OK)          # 200
Response(data, status=status.HTTP_201_CREATED)     # 201
Response(status=status.HTTP_204_NO_CONTENT)        # 204

# Client error responses
Response(errors, status=status.HTTP_400_BAD_REQUEST)    # 400
Response(status=status.HTTP_401_UNAUTHORIZED)           # 401
Response(status=status.HTTP_403_FORBIDDEN)              # 403
Response(status=status.HTTP_404_NOT_FOUND)              # 404
Response(status=status.HTTP_409_CONFLICT)               # 409

# Server error responses
Response(status=status.HTTP_500_INTERNAL_SERVER_ERROR)  # 500
```

## Complete Views Example

```python
# bookings/views.py
from rest_framework import generics, status
from rest_framework.response import Response
from .models import Appointment, MedicalNote
from .serializers import AppointmentSerializer, MedicalNoteSerializer


class ListAppointmentView(generics.ListAPIView, generics.CreateAPIView):
    """
    GET: List all appointments
    POST: Create a new appointment
    """
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by doctor
        doctor_id = self.request.query_params.get('doctor')
        if doctor_id:
            queryset = queryset.filter(doctor_id=doctor_id)

        # Filter by patient
        patient_id = self.request.query_params.get('patient')
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)

        # Filter by status
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)

        return queryset


class DetailAppointmentView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET: Retrieve appointment details
    PUT/PATCH: Update appointment
    DELETE: Cancel appointment
    """
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer

    def perform_destroy(self, instance):
        # Soft delete - change status instead of deleting
        instance.status = 'cancelled'
        instance.save()
```

---

## Next Steps

- [URLs and Routing](./05-urls-routing.md) - URL patterns and routers

---

[← Previous: Serializers](./03-serializers.md) | [Back to Index](./README.md) | [Next: URLs and Routing →](./05-urls-routing.md)
