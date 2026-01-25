# Testing

Django REST Framework provides tools for testing APIs including APIClient and APITestCase.

## Setup

### Test File Structure

```
doctors/
├── tests/
│   ├── __init__.py
│   ├── test_models.py
│   ├── test_serializers.py
│   ├── test_views.py
│   └── test_viewsets.py
```

Or single file:
```
doctors/
├── tests.py
```

## Running Tests

```bash
# Run all tests
python manage.py test

# Run specific app tests
python manage.py test doctors

# Run specific test file
python manage.py test doctors.tests.test_views

# Run specific test class
python manage.py test doctors.tests.test_views.DoctorViewTest

# Run specific test method
python manage.py test doctors.tests.test_views.DoctorViewTest.test_list_doctors

# With verbosity
python manage.py test -v 2

# Stop on first failure
python manage.py test --failfast
```

## Model Tests

```python
# doctors/tests/test_models.py
from django.test import TestCase
from doctors.models import Doctor, Department, DoctorAvailability
from datetime import date, time

class DoctorModelTest(TestCase):
    def setUp(self):
        """Set up test data."""
        self.doctor = Doctor.objects.create(
            first_name='John',
            last_name='Smith',
            email='john.smith@example.com',
            qualification='Cardiologist',
            contact_number='+1234567890',
            address='123 Main St',
        )

    def test_doctor_creation(self):
        """Test doctor is created correctly."""
        self.assertEqual(self.doctor.first_name, 'John')
        self.assertEqual(self.doctor.last_name, 'Smith')
        self.assertFalse(self.doctor.is_on_vacation)

    def test_doctor_str(self):
        """Test doctor string representation."""
        self.assertEqual(str(self.doctor), 'Dr. John Smith')

    def test_doctor_full_name(self):
        """Test get_full_name method."""
        self.assertEqual(self.doctor.get_full_name(), 'John Smith')

    def test_default_vacation_status(self):
        """Test default vacation status is False."""
        new_doctor = Doctor.objects.create(
            first_name='Jane',
            last_name='Doe',
            email='jane.doe@example.com',
            qualification='Neurologist',
            contact_number='+0987654321',
            address='456 Oak St',
        )
        self.assertFalse(new_doctor.is_on_vacation)


class DoctorAvailabilityModelTest(TestCase):
    def setUp(self):
        self.doctor = Doctor.objects.create(
            first_name='John',
            last_name='Smith',
            email='john@example.com',
            qualification='GP',
            contact_number='1234567890',
            address='Test Address',
        )

    def test_availability_creation(self):
        """Test availability is created correctly."""
        availability = DoctorAvailability.objects.create(
            doctor=self.doctor,
            start_date=date(2024, 3, 1),
            end_date=date(2024, 3, 31),
            start_time=time(9, 0),
            end_time=time(17, 0),
        )
        self.assertEqual(availability.doctor, self.doctor)
        self.assertEqual(availability.start_date, date(2024, 3, 1))
```

## Serializer Tests

```python
# doctors/tests/test_serializers.py
from django.test import TestCase
from doctors.models import Doctor
from doctors.serializers import DoctorSerializer

class DoctorSerializerTest(TestCase):
    def setUp(self):
        self.doctor = Doctor.objects.create(
            first_name='John',
            last_name='Smith',
            email='john@example.com',
            qualification='Cardiologist',
            contact_number='+1234567890',
            address='123 Main St',
        )
        self.serializer = DoctorSerializer(instance=self.doctor)

    def test_contains_expected_fields(self):
        """Test serializer contains expected fields."""
        data = self.serializer.data
        self.assertIn('id', data)
        self.assertIn('first_name', data)
        self.assertIn('last_name', data)
        self.assertIn('email', data)

    def test_email_validation(self):
        """Test email domain validation."""
        data = {
            'first_name': 'Jane',
            'last_name': 'Doe',
            'email': 'jane@invalid.com',  # Wrong domain
            'qualification': 'GP',
            'contact_number': '+1234567890',
            'address': 'Test',
        }
        serializer = DoctorSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('email', serializer.errors)

    def test_valid_data(self):
        """Test serializer with valid data."""
        data = {
            'first_name': 'Jane',
            'last_name': 'Doe',
            'email': 'jane@example.com',
            'qualification': 'Neurologist',
            'contact_number': '+1234567890',
            'address': '456 Oak St',
        }
        serializer = DoctorSerializer(data=data)
        self.assertTrue(serializer.is_valid())

    def test_serializer_method_field(self):
        """Test SerializerMethodField."""
        data = self.serializer.data
        self.assertEqual(data['full_name'], 'Dr. John Smith')
```

## API Tests with APITestCase

```python
# doctors/tests/test_views.py
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase, APIClient
from django.contrib.auth.models import User, Group
from doctors.models import Doctor


class DoctorAPITest(APITestCase):
    def setUp(self):
        """Set up test data and authentication."""
        # Create user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

        # Create doctors group and add user
        self.doctors_group = Group.objects.create(name='doctors')
        self.user.groups.add(self.doctors_group)

        # Authenticate
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        # Create test doctor
        self.doctor = Doctor.objects.create(
            first_name='John',
            last_name='Smith',
            email='john@example.com',
            qualification='Cardiologist',
            contact_number='+1234567890',
            address='123 Main St',
        )

    def test_list_doctors(self):
        """Test retrieving list of doctors."""
        url = reverse('doctor-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['first_name'], 'John')

    def test_create_doctor(self):
        """Test creating a new doctor."""
        url = reverse('doctor-list')
        data = {
            'first_name': 'Jane',
            'last_name': 'Doe',
            'email': 'jane@example.com',
            'qualification': 'Neurologist',
            'contact_number': '+0987654321',
            'address': '456 Oak St',
        }
        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Doctor.objects.count(), 2)
        self.assertEqual(response.data['first_name'], 'Jane')

    def test_retrieve_doctor(self):
        """Test retrieving a single doctor."""
        url = reverse('doctor-detail', kwargs={'pk': self.doctor.pk})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['first_name'], 'John')

    def test_update_doctor(self):
        """Test updating a doctor."""
        url = reverse('doctor-detail', kwargs={'pk': self.doctor.pk})
        data = {'first_name': 'Jonathan'}
        response = self.client.patch(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.doctor.refresh_from_db()
        self.assertEqual(self.doctor.first_name, 'Jonathan')

    def test_delete_doctor(self):
        """Test deleting a doctor."""
        url = reverse('doctor-detail', kwargs={'pk': self.doctor.pk})
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Doctor.objects.count(), 0)

    def test_unauthenticated_access(self):
        """Test that unauthenticated users cannot access."""
        self.client.force_authenticate(user=None)
        url = reverse('doctor-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_invalid_data(self):
        """Test creating with invalid data."""
        url = reverse('doctor-list')
        data = {
            'first_name': '',  # Empty
            'email': 'invalid-email',  # Invalid
        }
        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('first_name', response.data)
        self.assertIn('email', response.data)


class DoctorViewSetTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)

        self.doctor = Doctor.objects.create(
            first_name='John',
            last_name='Smith',
            email='john@example.com',
            qualification='GP',
            contact_number='1234567890',
            address='Test Address',
        )

    def test_set_on_vacation_action(self):
        """Test custom action to set vacation."""
        url = reverse('doctor-set-on-vacation', kwargs={'pk': self.doctor.pk})
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.doctor.refresh_from_db()
        self.assertTrue(self.doctor.is_on_vacation)

    def test_set_off_vacation_action(self):
        """Test custom action to end vacation."""
        self.doctor.is_on_vacation = True
        self.doctor.save()

        url = reverse('doctor-set-off-vacation', kwargs={'pk': self.doctor.pk})
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.doctor.refresh_from_db()
        self.assertFalse(self.doctor.is_on_vacation)

    def test_available_doctors_action(self):
        """Test action to list available doctors."""
        # Create one on vacation, one available
        Doctor.objects.create(
            first_name='Jane',
            last_name='Doe',
            email='jane@example.com',
            qualification='GP',
            contact_number='0987654321',
            address='Test',
            is_on_vacation=True,
        )

        url = reverse('doctor-available')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['first_name'], 'John')
```

## Testing Permissions

```python
# doctors/tests/test_permissions.py
from django.test import TestCase
from django.contrib.auth.models import User, Group
from rest_framework.test import APIRequestFactory
from rest_framework.views import APIView
from doctors.permissions import IsDoctor

class IsDoctorPermissionTest(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.permission = IsDoctor()
        self.view = APIView()

        # User in doctors group
        self.doctor_user = User.objects.create_user(
            username='doctor',
            password='pass123'
        )
        doctors_group = Group.objects.create(name='doctors')
        self.doctor_user.groups.add(doctors_group)

        # User not in doctors group
        self.regular_user = User.objects.create_user(
            username='regular',
            password='pass123'
        )

    def test_doctor_has_permission(self):
        """Test that doctors have permission."""
        request = self.factory.get('/')
        request.user = self.doctor_user

        has_perm = self.permission.has_permission(request, self.view)
        self.assertTrue(has_perm)

    def test_regular_user_no_permission(self):
        """Test that regular users don't have permission."""
        request = self.factory.get('/')
        request.user = self.regular_user

        has_perm = self.permission.has_permission(request, self.view)
        self.assertFalse(has_perm)
```

## Test Fixtures

```python
# doctors/tests/fixtures.py
from doctors.models import Doctor
from patients.models import Patient
from bookings.models import Appointment
from datetime import date, time

def create_test_doctor(**kwargs):
    """Factory function to create test doctors."""
    defaults = {
        'first_name': 'Test',
        'last_name': 'Doctor',
        'email': 'test.doctor@example.com',
        'qualification': 'General Practitioner',
        'contact_number': '+1234567890',
        'address': 'Test Address',
    }
    defaults.update(kwargs)
    return Doctor.objects.create(**defaults)


def create_test_patient(**kwargs):
    """Factory function to create test patients."""
    defaults = {
        'first_name': 'Test',
        'last_name': 'Patient',
        'email': 'test.patient@example.com',
        'date_of_birth': date(1990, 1, 1),
        'contact_number': '+0987654321',
        'address': 'Patient Address',
    }
    defaults.update(kwargs)
    return Patient.objects.create(**defaults)


def create_test_appointment(doctor, patient, **kwargs):
    """Factory function to create test appointments."""
    defaults = {
        'doctor': doctor,
        'patient': patient,
        'appointment_date': date(2024, 6, 15),
        'appointment_time': time(10, 0),
        'status': 'scheduled',
    }
    defaults.update(kwargs)
    return Appointment.objects.create(**defaults)
```

Usage:
```python
from doctors.tests.fixtures import create_test_doctor, create_test_patient

class AppointmentAPITest(APITestCase):
    def setUp(self):
        self.doctor = create_test_doctor(first_name='John')
        self.patient = create_test_patient(first_name='Jane')
```

## Test Coverage

```bash
# Install coverage
pip install coverage

# Run tests with coverage
coverage run manage.py test

# Generate report
coverage report

# HTML report
coverage html
# Open htmlcov/index.html
```

## Best Practices

| Practice | Description |
|----------|-------------|
| Isolate tests | Each test should be independent |
| Use setUp | Prepare common test data |
| Test edge cases | Empty, null, invalid values |
| Test permissions | Verify access control |
| Use meaningful names | `test_create_doctor_with_valid_data` |
| Clean up | Use tearDown if needed |
| Mock external services | Don't call real APIs |

---

## Next Steps

- [Project: Doctor API](./10-project-doctor-api.md) - Complete implementation

---

[← Previous: API Documentation](./08-api-documentation.md) | [Back to Index](./README.md) | [Next: Project: Doctor API →](./10-project-doctor-api.md)
