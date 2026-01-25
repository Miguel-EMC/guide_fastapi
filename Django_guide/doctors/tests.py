from django.test import TestCase
from django.urls import reverse

from patients.models import Patient
from doctors.models import Doctor
from rest_framework.test import APIClient

# Create your tests here.
class DoctorViewSetTest(TestCase):

    def setUp(self):
        self.patient = Patient.objects.create(
            first_name='Juan',
            last_name='Perez',
            date_of_birth='1980-01-01',
            contact_number='1234567890',
            email='juan@example.com',
            address='123 Main St',
            medical_history='None'
        )

        self.doctor = Doctor.objects.create(
            first_name='John',
            last_name='Doe',
            qualification='MD',
            contact_number='0987654321',
            email='john@example.com',
            address='456 Elm St',
            biography='Dr. Doe is a very experienced doctor',
            is_on_vacation=False
        )
        self.client = APIClient()

        def test_list_should_return_200(self):
            url = reverse('doctor-appointments', kwargs={'pk': self.doctor.id})
            response = self.client.get(url)
            self.assertEqual(response.status_code, 200)

