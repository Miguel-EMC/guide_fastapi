# Celery and Background Tasks

Celery is a distributed task queue for processing background jobs asynchronously.

## Installation

```bash
pip install celery redis
```

---

## Configuration

### Celery Setup

```python
# doctorapp/celery.py
import os
from celery import Celery

# Set default Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'doctorapp.settings')

app = Celery('doctorapp')

# Load config from Django settings
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks in all apps
app.autodiscover_tasks()

@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
```

```python
# doctorapp/__init__.py
from .celery import app as celery_app

__all__ = ('celery_app',)
```

### Django Settings

```python
# settings.py

# Celery Configuration
CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')

CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'

# Task settings
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60  # 30 minutes

# Rate limiting
CELERY_TASK_DEFAULT_RATE_LIMIT = '10/s'

# Retry settings
CELERY_TASK_ACKS_LATE = True
CELERY_WORKER_PREFETCH_MULTIPLIER = 1
```

---

## Creating Tasks

### Basic Task

```python
# doctors/tasks.py
from celery import shared_task
from django.core.mail import send_mail

@shared_task
def send_welcome_email(doctor_id):
    """Send welcome email to new doctor."""
    from .models import Doctor

    doctor = Doctor.objects.get(pk=doctor_id)

    send_mail(
        subject='Welcome to the Clinic',
        message=f'Welcome Dr. {doctor.first_name} {doctor.last_name}!',
        from_email='admin@clinic.com',
        recipient_list=[doctor.email],
    )

    return f'Email sent to {doctor.email}'
```

### Task with Retry

```python
# doctors/tasks.py
from celery import shared_task
from celery.exceptions import MaxRetriesExceededError

@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60  # 1 minute
)
def send_appointment_reminder(self, appointment_id):
    """Send appointment reminder with retry."""
    from bookings.models import Appointment

    try:
        appointment = Appointment.objects.get(pk=appointment_id)

        send_mail(
            subject='Appointment Reminder',
            message=f'Reminder: You have an appointment with '
                    f'Dr. {appointment.doctor} on {appointment.appointment_date} '
                    f'at {appointment.appointment_time}.',
            from_email='reminders@clinic.com',
            recipient_list=[appointment.patient.email],
        )

        return f'Reminder sent for appointment {appointment_id}'

    except Exception as exc:
        try:
            self.retry(exc=exc)
        except MaxRetriesExceededError:
            # Log failure
            return f'Failed to send reminder after {self.max_retries} retries'
```

### Task with Error Handling

```python
# doctors/tasks.py
from celery import shared_task
import logging

logger = logging.getLogger(__name__)

@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=600,
    retry_kwargs={'max_retries': 5}
)
def process_medical_report(self, report_id):
    """Process medical report with exponential backoff."""
    from .models import MedicalReport

    try:
        report = MedicalReport.objects.get(pk=report_id)

        # Process report
        report.status = 'processing'
        report.save()

        # Heavy processing here
        result = analyze_report(report)

        report.status = 'completed'
        report.result = result
        report.save()

        return f'Report {report_id} processed successfully'

    except Exception as exc:
        logger.error(f'Error processing report {report_id}: {exc}')
        raise
```

---

## Calling Tasks

### Basic Calls

```python
# Async execution (returns immediately)
send_welcome_email.delay(doctor_id)

# With apply_async for more control
send_welcome_email.apply_async(args=[doctor_id])

# With options
send_welcome_email.apply_async(
    args=[doctor_id],
    countdown=60,  # Delay 60 seconds
    expires=3600,  # Expire in 1 hour
)

# Synchronous execution (blocks)
result = send_welcome_email.apply(args=[doctor_id])
```

### In Views

```python
# doctors/views.py
from rest_framework import generics, status
from rest_framework.response import Response
from .tasks import send_welcome_email, generate_report

class DoctorCreateView(generics.CreateAPIView):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)

        # Queue welcome email
        send_welcome_email.delay(response.data['id'])

        return response


class GenerateReportView(generics.GenericAPIView):
    def post(self, request):
        doctor_id = request.data.get('doctor_id')
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')

        # Queue report generation
        task = generate_report.delay(doctor_id, start_date, end_date)

        return Response({
            'task_id': task.id,
            'status': 'Report generation started'
        })
```

### In Signals

```python
# doctors/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Doctor
from .tasks import send_welcome_email

@receiver(post_save, sender=Doctor)
def doctor_created(sender, instance, created, **kwargs):
    if created:
        send_welcome_email.delay(instance.pk)
```

---

## Task Chaining

### Chain Tasks

```python
from celery import chain

# Execute tasks in sequence
workflow = chain(
    process_data.s(data_id),
    generate_report.s(),
    send_report_email.s()
)

result = workflow.apply_async()
```

### Group Tasks

```python
from celery import group

# Execute tasks in parallel
tasks = group([
    send_reminder.s(appointment_id)
    for appointment_id in appointment_ids
])

result = tasks.apply_async()
```

### Chord (Group + Callback)

```python
from celery import chord

# Parallel tasks with callback
workflow = chord(
    [process_report.s(report_id) for report_id in report_ids],
    aggregate_results.s()
)

result = workflow.apply_async()
```

---

## Periodic Tasks (Celery Beat)

### Configuration

```python
# settings.py
from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    'send-daily-reminders': {
        'task': 'doctors.tasks.send_daily_reminders',
        'schedule': crontab(hour=8, minute=0),  # 8:00 AM daily
    },
    'cleanup-old-records': {
        'task': 'doctors.tasks.cleanup_old_records',
        'schedule': crontab(hour=2, minute=0),  # 2:00 AM daily
    },
    'generate-weekly-report': {
        'task': 'doctors.tasks.generate_weekly_report',
        'schedule': crontab(hour=0, minute=0, day_of_week='monday'),
    },
    'check-expired-appointments': {
        'task': 'bookings.tasks.check_expired_appointments',
        'schedule': 300.0,  # Every 5 minutes
    },
}
```

### Periodic Task Definition

```python
# doctors/tasks.py
from celery import shared_task
from datetime import date, timedelta

@shared_task
def send_daily_reminders():
    """Send appointment reminders for tomorrow."""
    from bookings.models import Appointment

    tomorrow = date.today() + timedelta(days=1)

    appointments = Appointment.objects.filter(
        appointment_date=tomorrow,
        status='scheduled'
    )

    for appointment in appointments:
        send_appointment_reminder.delay(appointment.pk)

    return f'Queued {appointments.count()} reminders'


@shared_task
def cleanup_old_records():
    """Delete old completed appointments."""
    from bookings.models import Appointment
    from datetime import timedelta

    cutoff_date = date.today() - timedelta(days=365)

    deleted, _ = Appointment.objects.filter(
        appointment_date__lt=cutoff_date,
        status='completed'
    ).delete()

    return f'Deleted {deleted} old appointments'


@shared_task
def generate_weekly_report():
    """Generate and email weekly summary report."""
    from .models import Doctor
    from bookings.models import Appointment
    from datetime import timedelta

    week_ago = date.today() - timedelta(days=7)

    # Generate statistics
    stats = {
        'total_appointments': Appointment.objects.filter(
            appointment_date__gte=week_ago
        ).count(),
        'completed': Appointment.objects.filter(
            appointment_date__gte=week_ago,
            status='completed'
        ).count(),
        'cancelled': Appointment.objects.filter(
            appointment_date__gte=week_ago,
            status='cancelled'
        ).count(),
    }

    # Email report
    send_mail(
        subject='Weekly Clinic Report',
        message=f'Weekly Statistics:\n{stats}',
        from_email='reports@clinic.com',
        recipient_list=['admin@clinic.com'],
    )

    return stats
```

---

## Task Status Tracking

### Check Task Status

```python
# doctors/views.py
from celery.result import AsyncResult
from rest_framework import generics
from rest_framework.response import Response

class TaskStatusView(generics.GenericAPIView):
    def get(self, request, task_id):
        result = AsyncResult(task_id)

        response = {
            'task_id': task_id,
            'status': result.status,
            'ready': result.ready(),
        }

        if result.ready():
            if result.successful():
                response['result'] = result.result
            else:
                response['error'] = str(result.result)

        return Response(response)
```

### Custom Task State

```python
# doctors/tasks.py
from celery import shared_task, current_task

@shared_task(bind=True)
def long_running_task(self, items):
    """Task with progress updates."""
    total = len(items)

    for i, item in enumerate(items):
        # Process item
        process_item(item)

        # Update progress
        self.update_state(
            state='PROGRESS',
            meta={
                'current': i + 1,
                'total': total,
                'percent': ((i + 1) / total) * 100
            }
        )

    return {'status': 'completed', 'processed': total}
```

```python
# doctors/views.py
class TaskProgressView(generics.GenericAPIView):
    def get(self, request, task_id):
        result = AsyncResult(task_id)

        if result.state == 'PENDING':
            response = {'state': result.state, 'status': 'Pending...'}
        elif result.state == 'PROGRESS':
            response = {
                'state': result.state,
                'current': result.info.get('current', 0),
                'total': result.info.get('total', 1),
                'percent': result.info.get('percent', 0),
            }
        elif result.state == 'SUCCESS':
            response = {'state': result.state, 'result': result.result}
        else:
            response = {'state': result.state, 'status': str(result.info)}

        return Response(response)
```

---

## Running Celery

### Development

```bash
# Start worker
celery -A doctorapp worker -l info

# Start beat (scheduler)
celery -A doctorapp beat -l info

# Both in one command (development only)
celery -A doctorapp worker -B -l info
```

### Production (Supervisor)

```ini
# /etc/supervisor/conf.d/celery.conf
[program:celery-worker]
command=/path/to/venv/bin/celery -A doctorapp worker -l info
directory=/path/to/project
user=www-data
numprocs=2
stdout_logfile=/var/log/celery/worker.log
stderr_logfile=/var/log/celery/worker.log
autostart=true
autorestart=true
startsecs=10

[program:celery-beat]
command=/path/to/venv/bin/celery -A doctorapp beat -l info
directory=/path/to/project
user=www-data
numprocs=1
stdout_logfile=/var/log/celery/beat.log
stderr_logfile=/var/log/celery/beat.log
autostart=true
autorestart=true
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    build: .
    command: gunicorn doctorapp.wsgi:application --bind 0.0.0.0:8000
    volumes:
      - .:/app
    ports:
      - "8000:8000"
    depends_on:
      - redis
      - db

  celery-worker:
    build: .
    command: celery -A doctorapp worker -l info
    volumes:
      - .:/app
    depends_on:
      - redis
      - db

  celery-beat:
    build: .
    command: celery -A doctorapp beat -l info
    volumes:
      - .:/app
    depends_on:
      - redis
      - db

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

---

## Best Practices

| Practice | Description |
|----------|-------------|
| Keep tasks small | Break large tasks into chains |
| Use retry for failures | Handle transient errors |
| Set time limits | Prevent stuck tasks |
| Use proper serializer | JSON for safety |
| Monitor with Flower | `pip install flower` |
| Idempotent tasks | Safe to retry |

---

## Next Steps

- [Middleware](./18-middleware.md) - Custom middleware and CORS

---

[← Previous: File Uploads](./16-file-uploads.md) | [Back to Index](./README.md) | [Next: Middleware →](./18-middleware.md)
