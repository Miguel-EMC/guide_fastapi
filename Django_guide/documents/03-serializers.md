# Serializers

Serializers convert complex data types (like Django model instances) to Python native datatypes that can be rendered into JSON. They also handle deserialization and validation.

## Basic Serializer

### ModelSerializer

```python
# doctors/serializers.py
from rest_framework import serializers
from .models import Doctor, Department, DoctorAvailability

class DoctorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Doctor
        fields = '__all__'  # All fields
        # Or specify fields explicitly:
        # fields = ['id', 'first_name', 'last_name', 'email', 'qualification']
```

### Specifying Fields

```python
class DoctorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Doctor
        fields = ['id', 'first_name', 'last_name', 'email']
        # Or exclude specific fields:
        # exclude = ['password', 'created_at']
```

### Read-Only Fields

```python
class DoctorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Doctor
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']
```

## Field Types

### Common Serializer Fields

```python
from rest_framework import serializers

class ExampleSerializer(serializers.Serializer):
    # Basic fields
    name = serializers.CharField(max_length=100)
    email = serializers.EmailField()
    age = serializers.IntegerField(min_value=0, max_value=150)
    salary = serializers.DecimalField(max_digits=10, decimal_places=2)
    is_active = serializers.BooleanField(default=True)

    # Date/Time fields
    birth_date = serializers.DateField()
    created_at = serializers.DateTimeField(read_only=True)
    start_time = serializers.TimeField()

    # Choice field
    status = serializers.ChoiceField(choices=['active', 'inactive', 'pending'])

    # URL field
    website = serializers.URLField(required=False)

    # File fields
    document = serializers.FileField(required=False)
    image = serializers.ImageField(required=False)

    # Hidden field
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())
```

### Field Arguments

| Argument | Description |
|----------|-------------|
| `read_only` | Field only for output |
| `write_only` | Field only for input |
| `required` | Field is required (default: True) |
| `default` | Default value if not provided |
| `allow_null` | Allow None values |
| `allow_blank` | Allow empty strings |
| `source` | Attribute to populate field |
| `validators` | List of validators |
| `error_messages` | Custom error messages |

```python
class DoctorSerializer(serializers.ModelSerializer):
    # Custom field options
    email = serializers.EmailField(
        required=True,
        allow_blank=False,
        error_messages={
            'invalid': 'Enter a valid email address.',
            'blank': 'Email cannot be blank.',
        }
    )

    # Write-only field (for input only)
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={'input_type': 'password'}
    )

    # Read-only field (for output only)
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = Doctor
        fields = '__all__'
```

## Nested Serializers

### Read Nested Data

```python
# patients/serializers.py
from rest_framework import serializers
from .models import Patient, Insurance, MedicalRecord
from bookings.models import Appointment

class InsuranceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Insurance
        fields = ['id', 'provider', 'policy_number', 'expiration_date']


class AppointmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = ['id', 'appointment_date', 'appointment_time', 'status']


class PatientSerializer(serializers.ModelSerializer):
    # Nested read-only serializers
    insurance = InsuranceSerializer(read_only=True)
    appointments = AppointmentSerializer(many=True, read_only=True)

    class Meta:
        model = Patient
        fields = [
            'id', 'first_name', 'last_name', 'email',
            'date_of_birth', 'insurance', 'appointments'
        ]
```

### Write Nested Data

```python
class PatientCreateSerializer(serializers.ModelSerializer):
    insurance = InsuranceSerializer()

    class Meta:
        model = Patient
        fields = ['first_name', 'last_name', 'email', 'date_of_birth', 'insurance']

    def create(self, validated_data):
        insurance_data = validated_data.pop('insurance')
        patient = Patient.objects.create(**validated_data)
        Insurance.objects.create(patient=patient, **insurance_data)
        return patient

    def update(self, instance, validated_data):
        insurance_data = validated_data.pop('insurance', None)

        # Update patient fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update or create insurance
        if insurance_data:
            Insurance.objects.update_or_create(
                patient=instance,
                defaults=insurance_data
            )

        return instance
```

## Custom Fields

### SerializerMethodField

```python
class PatientSerializer(serializers.ModelSerializer):
    age = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    upcoming_appointments_count = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = ['id', 'first_name', 'last_name', 'full_name', 'age',
                  'date_of_birth', 'upcoming_appointments_count']

    def get_age(self, obj):
        from datetime import date
        today = date.today()
        born = obj.date_of_birth
        return today.year - born.year - (
            (today.month, today.day) < (born.month, born.day)
        )

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"

    def get_upcoming_appointments_count(self, obj):
        from datetime import date
        return obj.appointments.filter(
            appointment_date__gte=date.today()
        ).count()
```

### Source Attribute

```python
class AppointmentSerializer(serializers.ModelSerializer):
    # Rename field
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)

    # Access related object attribute
    doctor_email = serializers.EmailField(source='doctor.email', read_only=True)

    # Access nested related object
    patient_insurance_provider = serializers.CharField(
        source='patient.insurance.provider',
        read_only=True
    )

    class Meta:
        model = Appointment
        fields = ['id', 'patient_name', 'doctor_email',
                  'patient_insurance_provider', 'appointment_date']
```

## Validation

### Field-Level Validation

```python
class DoctorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Doctor
        fields = '__all__'

    def validate_email(self, value):
        """Validate that email belongs to allowed domain."""
        if not value.endswith('@example.com'):
            raise serializers.ValidationError(
                'Email must be from @example.com domain'
            )
        return value

    def validate_contact_number(self, value):
        """Validate contact number format."""
        import re
        pattern = r'^\+?1?\d{9,15}$'
        if not re.match(pattern, value):
            raise serializers.ValidationError(
                'Invalid phone number format'
            )
        return value
```

### Object-Level Validation

```python
class DoctorAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorAvailability
        fields = '__all__'

    def validate(self, data):
        """Validate that end_date is after start_date."""
        if data['end_date'] < data['start_date']:
            raise serializers.ValidationError({
                'end_date': 'End date must be after start date'
            })

        if data['end_time'] <= data['start_time']:
            raise serializers.ValidationError({
                'end_time': 'End time must be after start time'
            })

        return data
```

### Custom Validators

```python
from rest_framework import serializers

def validate_future_date(value):
    """Ensure date is in the future."""
    from datetime import date
    if value < date.today():
        raise serializers.ValidationError('Date must be in the future')
    return value


class AppointmentSerializer(serializers.ModelSerializer):
    appointment_date = serializers.DateField(validators=[validate_future_date])

    class Meta:
        model = Appointment
        fields = '__all__'
```

### UniqueValidator

```python
from rest_framework.validators import UniqueValidator

class DoctorSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(
        validators=[
            UniqueValidator(
                queryset=Doctor.objects.all(),
                message='A doctor with this email already exists.'
            )
        ]
    )

    class Meta:
        model = Doctor
        fields = '__all__'
```

## Relational Fields

### PrimaryKeyRelatedField

```python
class AppointmentSerializer(serializers.ModelSerializer):
    # Returns ID
    patient = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all())
    doctor = serializers.PrimaryKeyRelatedField(queryset=Doctor.objects.all())

    class Meta:
        model = Appointment
        fields = '__all__'
```

### StringRelatedField

```python
class AppointmentSerializer(serializers.ModelSerializer):
    # Returns __str__ representation (read-only)
    patient = serializers.StringRelatedField()
    doctor = serializers.StringRelatedField()

    class Meta:
        model = Appointment
        fields = '__all__'
```

### SlugRelatedField

```python
class AppointmentSerializer(serializers.ModelSerializer):
    # Use a specific field instead of ID
    doctor = serializers.SlugRelatedField(
        slug_field='email',
        queryset=Doctor.objects.all()
    )

    class Meta:
        model = Appointment
        fields = '__all__'
```

## Context

Access request and other context in serializers:

```python
class DoctorSerializer(serializers.ModelSerializer):
    is_favorite = serializers.SerializerMethodField()

    class Meta:
        model = Doctor
        fields = ['id', 'first_name', 'last_name', 'is_favorite']

    def get_is_favorite(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.favorites.filter(user=request.user).exists()
        return False

# In view, pass context
class DoctorListView(generics.ListAPIView):
    serializer_class = DoctorSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['custom_data'] = 'value'
        return context
```

## Complete Serializers Example

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
    availabilities = DoctorAvailabilitySerializer(many=True, read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = Doctor
        fields = [
            'id', 'first_name', 'last_name', 'full_name',
            'qualification', 'email', 'contact_number',
            'is_on_vacation', 'availabilities'
        ]
        read_only_fields = ['id']

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
                'Cannot update contact while doctor is on vacation'
            )
        return value
```

---

## Next Steps

- [Views and ViewSets](./04-views-viewsets.md) - Class-based views and ViewSets

---

[← Previous: Models](./02-models.md) | [Back to Index](./README.md) | [Next: Views and ViewSets →](./04-views-viewsets.md)
