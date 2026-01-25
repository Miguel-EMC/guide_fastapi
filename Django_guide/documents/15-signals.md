# Signals

Django signals allow decoupled applications to be notified when actions occur elsewhere.

## Built-in Signals

### Model Signals

| Signal | Triggered |
|--------|-----------|
| `pre_save` | Before model save |
| `post_save` | After model save |
| `pre_delete` | Before model delete |
| `post_delete` | After model delete |
| `m2m_changed` | ManyToMany field modified |

### Request Signals

| Signal | Triggered |
|--------|-----------|
| `request_started` | HTTP request begins |
| `request_finished` | HTTP request ends |

---

## Basic Signal Usage

### Connecting to Signals

```python
# doctors/signals.py
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Doctor

@receiver(post_save, sender=Doctor)
def doctor_saved(sender, instance, created, **kwargs):
    if created:
        print(f'New doctor created: {instance}')
    else:
        print(f'Doctor updated: {instance}')

@receiver(post_delete, sender=Doctor)
def doctor_deleted(sender, instance, **kwargs):
    print(f'Doctor deleted: {instance}')
```

### Registering Signals

```python
# doctors/apps.py
from django.apps import AppConfig

class DoctorsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'doctors'

    def ready(self):
        import doctors.signals  # noqa
```

---

## Practical Signal Examples

### Auto-Create Related Profile

```python
# doctors/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import DoctorProfile

@receiver(post_save, sender=User)
def create_doctor_profile(sender, instance, created, **kwargs):
    """Create DoctorProfile when new user is created."""
    if created and hasattr(instance, 'is_doctor') and instance.is_doctor:
        DoctorProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_doctor_profile(sender, instance, **kwargs):
    """Save DoctorProfile when user is saved."""
    if hasattr(instance, 'doctor_profile'):
        instance.doctor_profile.save()
```

### Send Email Notifications

```python
# doctors/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import send_mail
from bookings.models import Appointment

@receiver(post_save, sender=Appointment)
def notify_appointment_created(sender, instance, created, **kwargs):
    """Send email when appointment is created."""
    if created:
        # Notify patient
        send_mail(
            subject='Appointment Confirmed',
            message=f'Your appointment with Dr. {instance.doctor} on '
                    f'{instance.appointment_date} at {instance.appointment_time} '
                    f'has been confirmed.',
            from_email='noreply@clinic.com',
            recipient_list=[instance.patient.email],
            fail_silently=True,
        )

        # Notify doctor
        send_mail(
            subject='New Appointment',
            message=f'New appointment with {instance.patient} on '
                    f'{instance.appointment_date} at {instance.appointment_time}.',
            from_email='noreply@clinic.com',
            recipient_list=[instance.doctor.email],
            fail_silently=True,
        )
```

### Cache Invalidation

```python
# doctors/signals.py
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache
from .models import Doctor

@receiver([post_save, post_delete], sender=Doctor)
def invalidate_doctor_cache(sender, instance, **kwargs):
    """Invalidate cache when doctor is modified."""
    cache.delete(f'doctor_{instance.pk}')
    cache.delete('doctor_list')
    cache.delete('available_doctors')
```

### Audit Logging

```python
# doctors/signals.py
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Doctor, AuditLog

@receiver(post_save, sender=Doctor)
def log_doctor_save(sender, instance, created, **kwargs):
    """Log doctor creation/update."""
    action = 'CREATE' if created else 'UPDATE'
    AuditLog.objects.create(
        model_name='Doctor',
        object_id=instance.pk,
        action=action,
        data={
            'first_name': instance.first_name,
            'last_name': instance.last_name,
            'email': instance.email,
        }
    )

@receiver(post_delete, sender=Doctor)
def log_doctor_delete(sender, instance, **kwargs):
    """Log doctor deletion."""
    AuditLog.objects.create(
        model_name='Doctor',
        object_id=instance.pk,
        action='DELETE',
        data={
            'first_name': instance.first_name,
            'last_name': instance.last_name,
        }
    )
```

---

## pre_save Signal

```python
# doctors/signals.py
from django.db.models.signals import pre_save
from django.dispatch import receiver
from django.utils.text import slugify
from .models import Doctor

@receiver(pre_save, sender=Doctor)
def doctor_pre_save(sender, instance, **kwargs):
    """Normalize data before saving."""
    # Normalize email
    instance.email = instance.email.lower()

    # Generate slug if not exists
    if not instance.slug:
        instance.slug = slugify(f'{instance.first_name}-{instance.last_name}')

    # Set default biography
    if not instance.biography:
        instance.biography = f'Dr. {instance.first_name} {instance.last_name} - {instance.qualification}'
```

### Track Field Changes

```python
# doctors/signals.py
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from .models import Doctor

@receiver(pre_save, sender=Doctor)
def track_changes(sender, instance, **kwargs):
    """Track what fields changed."""
    if instance.pk:
        try:
            old_instance = Doctor.objects.get(pk=instance.pk)
            instance._changed_fields = {}

            for field in instance._meta.fields:
                field_name = field.name
                old_value = getattr(old_instance, field_name)
                new_value = getattr(instance, field_name)
                if old_value != new_value:
                    instance._changed_fields[field_name] = {
                        'old': old_value,
                        'new': new_value
                    }
        except Doctor.DoesNotExist:
            pass

@receiver(post_save, sender=Doctor)
def handle_changes(sender, instance, created, **kwargs):
    """Handle tracked changes."""
    if not created and hasattr(instance, '_changed_fields'):
        if 'is_on_vacation' in instance._changed_fields:
            changes = instance._changed_fields['is_on_vacation']
            if changes['new']:
                # Doctor went on vacation
                cancel_upcoming_appointments(instance)
            else:
                # Doctor returned from vacation
                notify_patients_doctor_available(instance)
```

---

## ManyToMany Changed Signal

```python
# doctors/signals.py
from django.db.models.signals import m2m_changed
from django.dispatch import receiver
from .models import Doctor

@receiver(m2m_changed, sender=Doctor.departments.through)
def doctor_departments_changed(sender, instance, action, pk_set, **kwargs):
    """Handle department assignments."""
    if action == 'post_add':
        print(f'Doctor {instance} added to departments: {pk_set}')

    elif action == 'post_remove':
        print(f'Doctor {instance} removed from departments: {pk_set}')

    elif action == 'post_clear':
        print(f'Doctor {instance} removed from all departments')
```

---

## Custom Signals

### Define Custom Signal

```python
# doctors/signals.py
from django.dispatch import Signal

# Define custom signals
doctor_went_on_vacation = Signal()  # provides: doctor
doctor_returned_from_vacation = Signal()  # provides: doctor
appointment_cancelled = Signal()  # provides: appointment, reason
```

### Send Custom Signal

```python
# doctors/viewsets.py
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Doctor
from .serializers import DoctorSerializer
from .signals import doctor_went_on_vacation, doctor_returned_from_vacation

class DoctorViewSet(viewsets.ModelViewSet):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer

    @action(detail=True, methods=['post'])
    def set_on_vacation(self, request, pk=None):
        doctor = self.get_object()
        doctor.is_on_vacation = True
        doctor.save()

        # Send custom signal
        doctor_went_on_vacation.send(
            sender=self.__class__,
            doctor=doctor
        )

        return Response({'status': 'Doctor is on vacation'})

    @action(detail=True, methods=['post'])
    def set_off_vacation(self, request, pk=None):
        doctor = self.get_object()
        doctor.is_on_vacation = False
        doctor.save()

        # Send custom signal
        doctor_returned_from_vacation.send(
            sender=self.__class__,
            doctor=doctor
        )

        return Response({'status': 'Doctor is available'})
```

### Receive Custom Signal

```python
# doctors/handlers.py
from django.dispatch import receiver
from .signals import doctor_went_on_vacation, doctor_returned_from_vacation
from bookings.models import Appointment

@receiver(doctor_went_on_vacation)
def handle_vacation_start(sender, doctor, **kwargs):
    """Handle when doctor goes on vacation."""
    # Cancel all scheduled appointments
    appointments = Appointment.objects.filter(
        doctor=doctor,
        status='scheduled'
    )

    for appointment in appointments:
        appointment.status = 'cancelled'
        appointment.notes += '\nCancelled: Doctor on vacation'
        appointment.save()

        # Notify patient
        send_cancellation_email(appointment)


@receiver(doctor_returned_from_vacation)
def handle_vacation_end(sender, doctor, **kwargs):
    """Handle when doctor returns from vacation."""
    # Notify patients who had cancelled appointments
    notify_patients_doctor_available(doctor)
```

---

## Signal with Request Context

```python
# doctors/middleware.py
from threading import local

_thread_locals = local()

def get_current_user():
    return getattr(_thread_locals, 'user', None)

def get_current_request():
    return getattr(_thread_locals, 'request', None)

class CurrentUserMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _thread_locals.user = request.user
        _thread_locals.request = request
        response = self.get_response(request)
        return response
```

```python
# doctors/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Doctor, AuditLog
from .middleware import get_current_user

@receiver(post_save, sender=Doctor)
def audit_with_user(sender, instance, created, **kwargs):
    """Audit with current user context."""
    user = get_current_user()
    AuditLog.objects.create(
        model_name='Doctor',
        object_id=instance.pk,
        action='CREATE' if created else 'UPDATE',
        user=user,
    )
```

---

## Async Signal Handling

```python
# doctors/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Appointment
from .tasks import send_appointment_notification

@receiver(post_save, sender=Appointment)
def queue_notification(sender, instance, created, **kwargs):
    """Queue notification task instead of sending directly."""
    if created:
        # Use Celery task for async processing
        send_appointment_notification.delay(instance.pk)
```

---

## Complete Example

```python
# doctors/signals.py
from django.db.models.signals import pre_save, post_save, post_delete
from django.dispatch import receiver, Signal
from django.core.cache import cache
from django.core.mail import send_mail
from .models import Doctor

# Custom signals
doctor_vacation_status_changed = Signal()

@receiver(pre_save, sender=Doctor)
def doctor_pre_save(sender, instance, **kwargs):
    """Pre-save processing."""
    # Normalize email
    instance.email = instance.email.lower().strip()

    # Track vacation status change
    if instance.pk:
        try:
            old = Doctor.objects.get(pk=instance.pk)
            instance._vacation_changed = old.is_on_vacation != instance.is_on_vacation
            instance._was_on_vacation = old.is_on_vacation
        except Doctor.DoesNotExist:
            instance._vacation_changed = False


@receiver(post_save, sender=Doctor)
def doctor_post_save(sender, instance, created, **kwargs):
    """Post-save processing."""
    # Invalidate cache
    cache.delete(f'doctor_{instance.pk}')
    cache.delete('doctor_list')

    # Send custom signal if vacation status changed
    if not created and getattr(instance, '_vacation_changed', False):
        doctor_vacation_status_changed.send(
            sender=sender,
            doctor=instance,
            went_on_vacation=instance.is_on_vacation
        )

    # Send welcome email for new doctors
    if created:
        send_mail(
            subject='Welcome to the Clinic',
            message=f'Welcome Dr. {instance.first_name} {instance.last_name}!',
            from_email='admin@clinic.com',
            recipient_list=[instance.email],
            fail_silently=True,
        )


@receiver(post_delete, sender=Doctor)
def doctor_post_delete(sender, instance, **kwargs):
    """Post-delete processing."""
    cache.delete(f'doctor_{instance.pk}')
    cache.delete('doctor_list')


@receiver(doctor_vacation_status_changed)
def handle_vacation_change(sender, doctor, went_on_vacation, **kwargs):
    """Handle vacation status change."""
    if went_on_vacation:
        # Notify admin
        send_mail(
            subject=f'Dr. {doctor.last_name} on Vacation',
            message=f'Dr. {doctor.first_name} {doctor.last_name} is now on vacation.',
            from_email='system@clinic.com',
            recipient_list=['admin@clinic.com'],
            fail_silently=True,
        )
```

---

## Best Practices

| Practice | Description |
|----------|-------------|
| Keep handlers light | Heavy work should use Celery |
| Use `fail_silently` for emails | Don't break saves for email failures |
| Register in `apps.py` | Use `ready()` method |
| Avoid circular imports | Import inside functions if needed |
| Test signals | Write unit tests for handlers |
| Document custom signals | Clear docstrings |

---

## Next Steps

- [File Uploads](./16-file-uploads.md) - Handle file and media uploads

---

[← Previous: Caching](./14-caching.md) | [Back to Index](./README.md) | [Next: File Uploads →](./16-file-uploads.md)
