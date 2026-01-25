# Validation

DRF provides multiple levels of validation: field-level, object-level, and validators.

## Field-Level Validation

Validate individual fields using `validate_<fieldname>` methods:

```python
# doctors/serializers.py
from rest_framework import serializers
from .models import Doctor

class DoctorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Doctor
        fields = '__all__'

    def validate_email(self, value):
        """
        Validate that email is from allowed domain.
        """
        if not value.endswith('@example.com'):
            raise serializers.ValidationError(
                'Email must be from @example.com domain'
            )
        return value.lower()  # Normalize to lowercase

    def validate_contact_number(self, value):
        """
        Validate phone number format.
        """
        import re
        pattern = r'^\+?1?\d{9,15}$'
        if not re.match(pattern, value):
            raise serializers.ValidationError(
                'Phone number must be 9-15 digits'
            )
        return value

    def validate_qualification(self, value):
        """
        Validate qualification is not empty.
        """
        if not value or not value.strip():
            raise serializers.ValidationError(
                'Qualification cannot be empty'
            )
        return value.strip()
```

## Object-Level Validation

Validate multiple fields together using `validate` method:

```python
# doctors/serializers.py
class DoctorAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorAvailability
        fields = '__all__'

    def validate(self, data):
        """
        Validate that dates and times are consistent.
        """
        # Check date range
        if data['end_date'] < data['start_date']:
            raise serializers.ValidationError({
                'end_date': 'End date must be after start date'
            })

        # Check time range (for same day)
        if data['start_date'] == data['end_date']:
            if data['end_time'] <= data['start_time']:
                raise serializers.ValidationError({
                    'end_time': 'End time must be after start time'
                })

        # Check doctor is not on vacation
        doctor = data.get('doctor')
        if doctor and doctor.is_on_vacation:
            raise serializers.ValidationError(
                'Cannot set availability for doctor on vacation'
            )

        return data
```

```python
# bookings/serializers.py
class AppointmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = '__all__'

    def validate(self, data):
        """
        Validate appointment data.
        """
        from datetime import date, datetime

        # Check appointment is in the future
        appointment_datetime = datetime.combine(
            data['appointment_date'],
            data['appointment_time']
        )
        if appointment_datetime < datetime.now():
            raise serializers.ValidationError(
                'Appointment must be in the future'
            )

        # Check doctor availability
        doctor = data['doctor']
        if doctor.is_on_vacation:
            raise serializers.ValidationError({
                'doctor': 'Doctor is on vacation'
            })

        # Check for conflicting appointments
        existing = Appointment.objects.filter(
            doctor=doctor,
            appointment_date=data['appointment_date'],
            appointment_time=data['appointment_time'],
            status='scheduled'
        )

        # Exclude current instance on update
        if self.instance:
            existing = existing.exclude(pk=self.instance.pk)

        if existing.exists():
            raise serializers.ValidationError(
                'Doctor already has an appointment at this time'
            )

        return data
```

## Built-in Validators

### Field Validators

```python
from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from django.core.validators import MinValueValidator, MaxValueValidator

class PatientSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(
        validators=[
            UniqueValidator(
                queryset=Patient.objects.all(),
                message='A patient with this email already exists.'
            )
        ]
    )

    age = serializers.IntegerField(
        validators=[
            MinValueValidator(0, message='Age must be positive'),
            MaxValueValidator(150, message='Age must be realistic')
        ]
    )

    class Meta:
        model = Patient
        fields = '__all__'
```

### UniqueTogetherValidator

```python
from rest_framework.validators import UniqueTogetherValidator

class AppointmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = '__all__'
        validators = [
            UniqueTogetherValidator(
                queryset=Appointment.objects.all(),
                fields=['doctor', 'appointment_date', 'appointment_time'],
                message='This time slot is already booked'
            )
        ]
```

### UniqueForDateValidator

```python
from rest_framework.validators import UniqueForDateValidator

class MedicalNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicalNote
        fields = '__all__'
        validators = [
            UniqueForDateValidator(
                queryset=MedicalNote.objects.all(),
                field='doctor',
                date_field='date',
                message='Doctor already has a note for this date'
            )
        ]
```

## Custom Validators

### Function Validator

```python
# doctors/validators.py
from rest_framework import serializers
from datetime import date

def validate_future_date(value):
    """Ensure date is in the future."""
    if value < date.today():
        raise serializers.ValidationError(
            'Date must be in the future'
        )
    return value


def validate_business_hours(value):
    """Ensure time is within business hours (8 AM - 6 PM)."""
    from datetime import time
    if value < time(8, 0) or value > time(18, 0):
        raise serializers.ValidationError(
            'Time must be between 8:00 AM and 6:00 PM'
        )
    return value


def validate_not_weekend(value):
    """Ensure date is not on weekend."""
    if value.weekday() >= 5:  # Saturday = 5, Sunday = 6
        raise serializers.ValidationError(
            'Appointments cannot be scheduled on weekends'
        )
    return value
```

```python
# Usage in serializer
from .validators import validate_future_date, validate_business_hours

class AppointmentSerializer(serializers.ModelSerializer):
    appointment_date = serializers.DateField(
        validators=[validate_future_date, validate_not_weekend]
    )
    appointment_time = serializers.TimeField(
        validators=[validate_business_hours]
    )

    class Meta:
        model = Appointment
        fields = '__all__'
```

### Class-Based Validator

```python
# doctors/validators.py
class ValidEmailDomain:
    """Validate email belongs to allowed domain."""

    def __init__(self, allowed_domain):
        self.allowed_domain = allowed_domain

    def __call__(self, value):
        if not value.endswith(f'@{self.allowed_domain}'):
            raise serializers.ValidationError(
                f'Email must be from @{self.allowed_domain}'
            )

    def __repr__(self):
        return f'ValidEmailDomain({self.allowed_domain})'


class MaxAppointmentsPerDay:
    """Limit appointments per doctor per day."""

    def __init__(self, max_appointments=10):
        self.max_appointments = max_appointments

    def __call__(self, attrs):
        doctor = attrs.get('doctor')
        date = attrs.get('appointment_date')

        if doctor and date:
            count = Appointment.objects.filter(
                doctor=doctor,
                appointment_date=date,
                status='scheduled'
            ).count()

            if count >= self.max_appointments:
                raise serializers.ValidationError(
                    f'Doctor already has {self.max_appointments} appointments on this day'
                )

    def __repr__(self):
        return f'MaxAppointmentsPerDay({self.max_appointments})'
```

```python
# Usage
class DoctorSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(
        validators=[ValidEmailDomain('hospital.com')]
    )

class AppointmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = '__all__'
        validators = [MaxAppointmentsPerDay(max_appointments=8)]
```

## Conditional Validation

```python
class DoctorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Doctor
        fields = '__all__'

    def validate_contact_number(self, value):
        """
        Stricter validation when updating (instance exists).
        """
        if self.instance:  # Update
            if self.instance.is_on_vacation:
                raise serializers.ValidationError(
                    'Cannot change contact while on vacation'
                )
        return value

    def validate(self, data):
        """
        Different validation for create vs update.
        """
        if self.instance:  # Update
            # Don't allow changing email
            if 'email' in data and data['email'] != self.instance.email:
                raise serializers.ValidationError({
                    'email': 'Email cannot be changed'
                })
        else:  # Create
            # Require all fields
            required = ['first_name', 'last_name', 'email', 'qualification']
            for field in required:
                if not data.get(field):
                    raise serializers.ValidationError({
                        field: f'{field} is required'
                    })

        return data
```

## Validation in Views

```python
# doctors/views.py
from rest_framework import generics, status
from rest_framework.response import Response

class DoctorCreateView(generics.CreateAPIView):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)

        if not serializer.is_valid():
            # Custom error response format
            return Response({
                'success': False,
                'errors': serializer.errors,
                'message': 'Validation failed'
            }, status=status.HTTP_400_BAD_REQUEST)

        self.perform_create(serializer)
        return Response({
            'success': True,
            'data': serializer.data,
            'message': 'Doctor created successfully'
        }, status=status.HTTP_201_CREATED)
```

## Error Messages

### Custom Error Messages

```python
class DoctorSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(
        error_messages={
            'invalid': 'Enter a valid email address.',
            'blank': 'Email is required.',
            'required': 'Email field is required.',
        }
    )

    first_name = serializers.CharField(
        max_length=100,
        error_messages={
            'max_length': 'Name cannot exceed 100 characters.',
            'blank': 'Name cannot be empty.',
        }
    )

    class Meta:
        model = Doctor
        fields = '__all__'
```

### Raising Validation Errors

```python
# Single field error
raise serializers.ValidationError('Invalid value')

# Field-specific error
raise serializers.ValidationError({
    'email': 'Email already exists'
})

# Multiple field errors
raise serializers.ValidationError({
    'email': ['Email already exists', 'Invalid domain'],
    'phone': 'Invalid phone format'
})

# Non-field errors
raise serializers.ValidationError({
    'non_field_errors': ['Invalid combination of values']
})
```

## Complete Validation Example

```python
# bookings/serializers.py
from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator
from datetime import date, time, datetime
from .models import Appointment


def validate_future_date(value):
    if value < date.today():
        raise serializers.ValidationError('Date must be in the future')


def validate_business_hours(value):
    if value < time(8, 0) or value > time(18, 0):
        raise serializers.ValidationError(
            'Appointments only between 8 AM and 6 PM'
        )


class AppointmentSerializer(serializers.ModelSerializer):
    appointment_date = serializers.DateField(validators=[validate_future_date])
    appointment_time = serializers.TimeField(validators=[validate_business_hours])

    class Meta:
        model = Appointment
        fields = '__all__'
        validators = [
            UniqueTogetherValidator(
                queryset=Appointment.objects.filter(status='scheduled'),
                fields=['doctor', 'appointment_date', 'appointment_time'],
                message='This time slot is not available'
            )
        ]

    def validate_patient(self, value):
        """Check patient has valid insurance."""
        if hasattr(value, 'insurance'):
            if value.insurance.expiration_date < date.today():
                raise serializers.ValidationError(
                    'Patient insurance has expired'
                )
        return value

    def validate(self, data):
        """Cross-field validation."""
        doctor = data.get('doctor')

        if doctor and doctor.is_on_vacation:
            raise serializers.ValidationError({
                'doctor': 'Doctor is currently on vacation'
            })

        return data
```

---

## Next Steps

- [API Documentation](./08-api-documentation.md) - Swagger and ReDoc

---

[← Previous: Authentication and Permissions](./06-authentication-permissions.md) | [Back to Index](./README.md) | [Next: API Documentation →](./08-api-documentation.md)
