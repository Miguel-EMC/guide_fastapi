# Models

Django ORM provides a powerful abstraction layer for database operations. Models define the structure of your data and relationships.

## Basic Model

```python
# doctors/models.py
from django.db import models

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
        verbose_name = 'Doctor'
        verbose_name_plural = 'Doctors'

    def __str__(self):
        return f"Dr. {self.first_name} {self.last_name}"

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}"
```

## Field Types

### Common Field Types

| Field Type | Description | Example |
|------------|-------------|---------|
| `CharField` | Short text | `name = CharField(max_length=100)` |
| `TextField` | Long text | `biography = TextField()` |
| `IntegerField` | Integer numbers | `age = IntegerField()` |
| `FloatField` | Decimal numbers | `price = FloatField()` |
| `DecimalField` | Precise decimals | `price = DecimalField(max_digits=10, decimal_places=2)` |
| `BooleanField` | True/False | `is_active = BooleanField(default=True)` |
| `DateField` | Date only | `birth_date = DateField()` |
| `DateTimeField` | Date and time | `created_at = DateTimeField(auto_now_add=True)` |
| `TimeField` | Time only | `start_time = TimeField()` |
| `EmailField` | Email validation | `email = EmailField()` |
| `URLField` | URL validation | `website = URLField()` |
| `SlugField` | URL-safe strings | `slug = SlugField()` |
| `FileField` | File uploads | `document = FileField(upload_to='docs/')` |
| `ImageField` | Image uploads | `photo = ImageField(upload_to='photos/')` |

### Field Options

```python
class Example(models.Model):
    # Required field
    name = models.CharField(max_length=100)

    # Optional field (can be blank and null)
    description = models.TextField(blank=True, null=True)

    # Default value
    is_active = models.BooleanField(default=True)

    # Unique constraint
    email = models.EmailField(unique=True)

    # Choices
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('archived', 'Archived'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')

    # Auto timestamps
    created_at = models.DateTimeField(auto_now_add=True)  # Set on create
    updated_at = models.DateTimeField(auto_now=True)      # Set on every save

    # Custom column name
    my_field = models.CharField(max_length=100, db_column='custom_column_name')

    # Help text (shown in admin)
    notes = models.TextField(help_text='Additional notes about this item')

    # Verbose name
    first_name = models.CharField('First Name', max_length=100)
```

## Relationships

### ForeignKey (Many-to-One)

Many patients can have appointments with one doctor:

```python
# bookings/models.py
from django.db import models
from doctors.models import Doctor
from patients.models import Patient

class Appointment(models.Model):
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
    status = models.CharField(max_length=20, default='scheduled')

    class Meta:
        ordering = ['-appointment_date', '-appointment_time']

    def __str__(self):
        return f"{self.patient} - Dr. {self.doctor} on {self.appointment_date}"
```

### on_delete Options

| Option | Behavior |
|--------|----------|
| `CASCADE` | Delete related objects |
| `PROTECT` | Prevent deletion if related objects exist |
| `SET_NULL` | Set FK to NULL (requires null=True) |
| `SET_DEFAULT` | Set to default value |
| `DO_NOTHING` | Do nothing (may cause integrity errors) |

### OneToOneField

One patient has one insurance:

```python
# patients/models.py
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
```

### ManyToManyField

Doctors can belong to multiple departments:

```python
# doctors/models.py
class Department(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name


class Doctor(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    departments = models.ManyToManyField(
        Department,
        related_name='doctors',
        blank=True
    )
```

## Model Methods

```python
class Patient(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    date_of_birth = models.DateField()

    def __str__(self):
        return self.get_full_name()

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def age(self):
        from datetime import date
        today = date.today()
        born = self.date_of_birth
        return today.year - born.year - (
            (today.month, today.day) < (born.month, born.day)
        )

    def get_upcoming_appointments(self):
        from datetime import date
        return self.appointments.filter(
            appointment_date__gte=date.today()
        ).order_by('appointment_date')
```

## Meta Options

```python
class Doctor(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)

    class Meta:
        # Default ordering
        ordering = ['last_name', 'first_name']

        # Custom table name
        db_table = 'medical_doctors'

        # Verbose names
        verbose_name = 'Doctor'
        verbose_name_plural = 'Doctors'

        # Unique together constraint
        unique_together = [['first_name', 'last_name', 'email']]

        # Indexes
        indexes = [
            models.Index(fields=['last_name', 'first_name']),
            models.Index(fields=['email']),
        ]

        # Permissions
        permissions = [
            ('can_view_salary', 'Can view doctor salary'),
            ('can_approve_vacation', 'Can approve vacation'),
        ]
```

## QuerySet Operations

```python
# Create
doctor = Doctor.objects.create(
    first_name='John',
    last_name='Smith',
    email='john@example.com'
)

# Get single object
doctor = Doctor.objects.get(pk=1)
doctor = Doctor.objects.get(email='john@example.com')

# Filter (returns QuerySet)
doctors = Doctor.objects.filter(is_on_vacation=False)
doctors = Doctor.objects.filter(last_name__startswith='S')
doctors = Doctor.objects.filter(qualification__icontains='cardio')

# Exclude
doctors = Doctor.objects.exclude(is_on_vacation=True)

# All
all_doctors = Doctor.objects.all()

# Order by
doctors = Doctor.objects.order_by('last_name', '-first_name')

# Limit (slicing)
first_five = Doctor.objects.all()[:5]

# Count
count = Doctor.objects.filter(is_on_vacation=False).count()

# Exists
has_doctors = Doctor.objects.filter(qualification='Cardiologist').exists()

# First / Last
first_doctor = Doctor.objects.first()
last_doctor = Doctor.objects.order_by('-id').first()

# Update
Doctor.objects.filter(pk=1).update(is_on_vacation=True)

# Delete
Doctor.objects.filter(pk=1).delete()

# Values (returns dictionaries)
emails = Doctor.objects.values('email', 'first_name')

# Values list (returns tuples)
email_list = Doctor.objects.values_list('email', flat=True)
```

## Lookup Expressions

```python
# Exact match
Doctor.objects.filter(first_name='John')
Doctor.objects.filter(first_name__exact='John')

# Case-insensitive
Doctor.objects.filter(first_name__iexact='john')

# Contains
Doctor.objects.filter(biography__contains='specialist')
Doctor.objects.filter(biography__icontains='SPECIALIST')  # Case-insensitive

# Starts/Ends with
Doctor.objects.filter(last_name__startswith='S')
Doctor.objects.filter(email__endswith='@example.com')

# In list
Doctor.objects.filter(id__in=[1, 2, 3])

# Range
Appointment.objects.filter(appointment_date__range=['2024-01-01', '2024-12-31'])

# Greater/Less than
Patient.objects.filter(date_of_birth__lt='2000-01-01')
Patient.objects.filter(date_of_birth__gte='1990-01-01')

# Is null
Doctor.objects.filter(biography__isnull=True)

# Related objects
Appointment.objects.filter(doctor__last_name='Smith')
Appointment.objects.filter(patient__insurance__provider='BlueCross')
```

## Aggregation

```python
from django.db.models import Count, Avg, Sum, Max, Min

# Count appointments per doctor
doctors = Doctor.objects.annotate(
    appointment_count=Count('appointments')
)

# Filter by annotation
busy_doctors = Doctor.objects.annotate(
    appointment_count=Count('appointments')
).filter(appointment_count__gte=10)

# Aggregate functions
stats = Appointment.objects.aggregate(
    total=Count('id'),
    avg_per_doctor=Avg('doctor__id'),
)
```

## Migrations

```bash
# Create migrations after model changes
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Show migrations status
python manage.py showmigrations

# Create migration with name
python manage.py makemigrations doctors --name add_vacation_field

# Rollback migration
python manage.py migrate doctors 0001

# Generate SQL without applying
python manage.py sqlmigrate doctors 0001
```

## Complete Models Example

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
```

---

## Next Steps

- [Serializers](./03-serializers.md) - Data serialization and validation

---

[← Previous: Introduction](./01-introduction.md) | [Back to Index](./README.md) | [Next: Serializers →](./03-serializers.md)
