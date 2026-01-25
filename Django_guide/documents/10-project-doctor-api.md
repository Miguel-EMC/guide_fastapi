# Project: Doctor API

A complete healthcare management API built with Django REST Framework.

## Features

- Doctor management with vacation status
- Patient records with insurance
- Appointment booking system
- Medical notes and records
- Department organization
- Doctor availability scheduling
- API documentation with Swagger/ReDoc

## Project Structure

```
doctor_api/
├── doctorapp/              # Project configuration
│   ├── settings.py
│   ├── urls.py
│   ├── wsgi.py
│   └── asgi.py
├── doctors/                # Doctors app
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   ├── viewsets.py
│   ├── urls.py
│   ├── permissions.py
│   └── admin.py
├── patients/               # Patients app
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   ├── urls.py
│   └── admin.py
├── bookings/               # Bookings app
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   ├── urls.py
│   └── admin.py
├── docs/                   # API documentation
│   └── urls.py
├── manage.py
├── requirements.txt
└── db.sqlite3
```

---

## Models

### Doctor Models

```python
# doctors/models.py
from django.db import models

class Department(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name


class Doctor(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    qualification = models.CharField(max_length=200)
    contact_number = models.CharField(max_length=20)
    email = models.EmailField()
    address = models.TextField()
    biography = models.TextField(blank=True)
    is_on_vacation = models.BooleanField(default=False)

    class Meta:
        ordering = ['last_name', 'first_name']

    def __str__(self):
        return f"Dr. {self.first_name} {self.last_name}"

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}"


class DoctorAvailability(models.Model):
    doctor = models.ForeignKey(
        Doctor,
        on_delete=models.CASCADE,
        related_name='availabilities'
    )
    start_date = models.DateField()
    end_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()

    class Meta:
        verbose_name_plural = 'Doctor Availabilities'

    def __str__(self):
        return f"{self.doctor} - {self.start_date} to {self.end_date}"


class MedicalNote(models.Model):
    doctor = models.ForeignKey(
        Doctor,
        on_delete=models.CASCADE,
        related_name='medical_notes'
    )
    note = models.TextField()
    date = models.DateField()

    def __str__(self):
        return f"Note by {self.doctor} on {self.date}"
```

### Patient Models

```python
# patients/models.py
from django.db import models

class Patient(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    date_of_birth = models.DateField()
    contact_number = models.CharField(max_length=20)
    email = models.EmailField()
    address = models.TextField()
    medical_history = models.TextField(blank=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def age(self):
        from datetime import date
        today = date.today()
        born = self.date_of_birth
        return today.year - born.year - (
            (today.month, today.day) < (born.month, born.day)
        )


class Insurance(models.Model):
    patient = models.OneToOneField(
        Patient,
        on_delete=models.CASCADE,
        related_name='insurance'
    )
    provider = models.CharField(max_length=100)
    policy_number = models.CharField(max_length=50)
    expiration_date = models.DateField()

    def __str__(self):
        return f"{self.provider} - {self.policy_number}"


class MedicalRecord(models.Model):
    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name='medical_records'
    )
    date = models.DateField()
    diagnosis = models.TextField()
    treatment = models.TextField()
    follow_up_date = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.patient} - {self.date}"
```

### Booking Models

```python
# bookings/models.py
from django.db import models
from doctors.models import Doctor
from patients.models import Patient

class Appointment(models.Model):
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name='appointments'
    )
    doctor = models.ForeignKey(
        Doctor,
        on_delete=models.CASCADE,
        related_name='appointments'
    )
    appointment_date = models.DateField()
    appointment_time = models.TimeField()
    notes = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='scheduled'
    )

    class Meta:
        ordering = ['-appointment_date', '-appointment_time']

    def __str__(self):
        return f"{self.patient} with Dr. {self.doctor} on {self.appointment_date}"


class MedicalNote(models.Model):
    appointment = models.ForeignKey(
        Appointment,
        on_delete=models.CASCADE,
        related_name='medical_notes'
    )
    note = models.TextField()
    date = models.DateField()

    def __str__(self):
        return f"Note for {self.appointment}"
```

---

## Serializers

### Doctor Serializers

```python
# doctors/serializers.py
from rest_framework import serializers
from .models import Doctor, Department, DoctorAvailability, MedicalNote

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = '__all__'


class DoctorAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorAvailability
        fields = '__all__'

    def validate(self, data):
        if data['end_date'] < data['start_date']:
            raise serializers.ValidationError({
                'end_date': 'End date must be after start date'
            })
        return data


class MedicalNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicalNote
        fields = '__all__'


class DoctorSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    availabilities = DoctorAvailabilitySerializer(many=True, read_only=True)

    class Meta:
        model = Doctor
        fields = [
            'id', 'first_name', 'last_name', 'full_name',
            'qualification', 'email', 'contact_number',
            'address', 'biography', 'is_on_vacation', 'availabilities'
        ]

    def get_full_name(self, obj):
        return f"Dr. {obj.first_name} {obj.last_name}"

    def validate_email(self, value):
        if not value.endswith('@example.com'):
            raise serializers.ValidationError(
                'Email must be from @example.com domain'
            )
        return value.lower()

    def validate_contact_number(self, value):
        if self.instance and self.instance.is_on_vacation:
            raise serializers.ValidationError(
                'Cannot update contact while on vacation'
            )
        return value
```

### Patient Serializers

```python
# patients/serializers.py
from rest_framework import serializers
from .models import Patient, Insurance, MedicalRecord

class InsuranceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Insurance
        fields = '__all__'


class MedicalRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicalRecord
        fields = '__all__'


class PatientSerializer(serializers.ModelSerializer):
    age = serializers.SerializerMethodField()
    insurance = InsuranceSerializer(read_only=True)
    appointments = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = [
            'id', 'first_name', 'last_name', 'date_of_birth',
            'age', 'contact_number', 'email', 'address',
            'medical_history', 'insurance', 'appointments'
        ]

    def get_age(self, obj):
        return obj.age

    def get_appointments(self, obj):
        from bookings.serializers import AppointmentSerializer
        return AppointmentSerializer(
            obj.appointments.all()[:5],
            many=True
        ).data
```

### Booking Serializers

```python
# bookings/serializers.py
from rest_framework import serializers
from .models import Appointment, MedicalNote

class MedicalNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicalNote
        fields = '__all__'


class AppointmentSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(
        source='patient.__str__',
        read_only=True
    )
    doctor_name = serializers.CharField(
        source='doctor.__str__',
        read_only=True
    )

    class Meta:
        model = Appointment
        fields = [
            'id', 'patient', 'patient_name', 'doctor', 'doctor_name',
            'appointment_date', 'appointment_time', 'notes', 'status'
        ]

    def validate(self, data):
        from datetime import date, datetime

        # Check future date
        if data.get('appointment_date', date.today()) < date.today():
            raise serializers.ValidationError({
                'appointment_date': 'Date must be in the future'
            })

        # Check doctor availability
        doctor = data.get('doctor')
        if doctor and doctor.is_on_vacation:
            raise serializers.ValidationError({
                'doctor': 'Doctor is on vacation'
            })

        return data
```

---

## Views and ViewSets

### Doctor ViewSet

```python
# doctors/viewsets.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Doctor
from .serializers import DoctorSerializer
from .permissions import IsDoctor
from bookings.models import Appointment
from bookings.serializers import AppointmentSerializer

class DoctorViewSet(viewsets.ModelViewSet):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
    permission_classes = [IsAuthenticated, IsDoctor]

    @action(detail=True, methods=['post'])
    def set_on_vacation(self, request, pk=None):
        """Mark doctor as on vacation."""
        doctor = self.get_object()
        doctor.is_on_vacation = True
        doctor.save()
        return Response({
            'status': 'success',
            'message': f'Dr. {doctor.get_full_name()} is now on vacation'
        })

    @action(detail=True, methods=['post'])
    def set_off_vacation(self, request, pk=None):
        """Mark doctor as off vacation."""
        doctor = self.get_object()
        doctor.is_on_vacation = False
        doctor.save()
        return Response({
            'status': 'success',
            'message': f'Dr. {doctor.get_full_name()} is now available'
        })

    @action(detail=True, methods=['get', 'post'])
    def appointments(self, request, pk=None):
        """Get or create appointments for this doctor."""
        doctor = self.get_object()

        if request.method == 'GET':
            appointments = Appointment.objects.filter(doctor=doctor)
            serializer = AppointmentSerializer(appointments, many=True)
            return Response(serializer.data)

        elif request.method == 'POST':
            data = request.data.copy()
            data['doctor'] = doctor.id
            serializer = AppointmentSerializer(data=data)
            if serializer.is_valid():
                serializer.save()
                return Response(
                    serializer.data,
                    status=status.HTTP_201_CREATED
                )
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def available(self, request):
        """List all available doctors."""
        doctors = Doctor.objects.filter(is_on_vacation=False)
        serializer = self.get_serializer(doctors, many=True)
        return Response(serializer.data)
```

### Generic Views

```python
# doctors/views.py
from rest_framework import generics
from .models import Doctor, Department, DoctorAvailability, MedicalNote
from .serializers import (
    DoctorSerializer, DepartmentSerializer,
    DoctorAvailabilitySerializer, MedicalNoteSerializer
)

class ListDoctorView(generics.ListAPIView, generics.CreateAPIView):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer

class DetailDoctorView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer

class ListDepartmentView(generics.ListAPIView, generics.CreateAPIView):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer

class DetailDepartmentView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer

class ListDoctorAvailabilityView(generics.ListAPIView, generics.CreateAPIView):
    queryset = DoctorAvailability.objects.all()
    serializer_class = DoctorAvailabilitySerializer

class DetailDoctorAvailabilityView(generics.RetrieveUpdateDestroyAPIView):
    queryset = DoctorAvailability.objects.all()
    serializer_class = DoctorAvailabilitySerializer
```

---

## URLs

### Root URLs

```python
# doctorapp/urls.py
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('doctors.urls')),
    path('api/', include('patients.urls')),
    path('api/', include('bookings.urls')),
    path('api-auth/', include('rest_framework.urls')),
    path('', include('docs.urls')),
]
```

### App URLs

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
    path('departments/', views.ListDepartmentView.as_view()),
    path('departments/<int:pk>/', views.DetailDepartmentView.as_view()),
    path('doctoravailabilities/', views.ListDoctorAvailabilityView.as_view()),
    path('doctoravailabilities/<int:pk>/', views.DetailDoctorAvailabilityView.as_view()),
]
```

---

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/doctors/` | List all doctors |
| POST | `/api/doctors/` | Create doctor |
| GET | `/api/doctors/{id}/` | Get doctor |
| PUT | `/api/doctors/{id}/` | Update doctor |
| DELETE | `/api/doctors/{id}/` | Delete doctor |
| POST | `/api/doctors/{id}/set_on_vacation/` | Set vacation |
| POST | `/api/doctors/{id}/set_off_vacation/` | End vacation |
| GET | `/api/doctors/{id}/appointments/` | Doctor's appointments |
| GET | `/api/doctors/available/` | Available doctors |
| GET | `/api/departments/` | List departments |
| GET | `/api/patients/` | List patients |
| POST | `/api/patients/` | Create patient |
| GET | `/api/appointments/` | List appointments |
| POST | `/api/appointments/` | Create appointment |
| GET | `/api/schema/swagger-ui/` | Swagger UI |
| GET | `/api/schema/redoc/` | ReDoc |

---

## Running the Project

```bash
# Clone and setup
cd doctor_api
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run server
python manage.py runserver

# Access:
# - API: http://localhost:8000/api/
# - Admin: http://localhost:8000/admin/
# - Swagger: http://localhost:8000/api/schema/swagger-ui/
# - ReDoc: http://localhost:8000/api/schema/redoc/
```

---

## Summary

This Doctor API demonstrates:

1. **Django REST Framework** - Complete API implementation
2. **Models** - Related entities with proper relationships
3. **Serializers** - Data validation and transformation
4. **Views** - Generic views and ViewSets
5. **Custom Actions** - Vacation management
6. **Permissions** - Group-based access control
7. **API Documentation** - Swagger and ReDoc
8. **URL Routing** - Routers and manual patterns

---

[← Previous: Testing](./09-testing.md) | [Back to Index](./README.md)
