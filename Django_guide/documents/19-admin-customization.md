# Admin Customization

Django Admin provides a powerful interface for managing your API data.

## Basic Admin Registration

```python
# doctors/admin.py
from django.contrib import admin
from .models import Doctor, Department, DoctorAvailability, MedicalNote

admin.site.register(Doctor)
admin.site.register(Department)
admin.site.register(DoctorAvailability)
admin.site.register(MedicalNote)
```

---

## ModelAdmin Customization

### List Display

```python
# doctors/admin.py
from django.contrib import admin
from .models import Doctor

@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'full_name',
        'email',
        'qualification',
        'is_on_vacation',
        'appointment_count',
        'created_at',
    ]
    list_display_links = ['id', 'full_name']
    list_editable = ['is_on_vacation']
    list_per_page = 25

    def full_name(self, obj):
        return f'Dr. {obj.first_name} {obj.last_name}'
    full_name.short_description = 'Name'
    full_name.admin_order_field = 'last_name'

    def appointment_count(self, obj):
        return obj.appointments.count()
    appointment_count.short_description = 'Appointments'
```

### Filtering and Search

```python
@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'email', 'qualification', 'is_on_vacation']

    # Search
    search_fields = ['first_name', 'last_name', 'email', 'qualification']
    search_help_text = 'Search by name, email, or qualification'

    # Filters
    list_filter = [
        'is_on_vacation',
        'qualification',
        'created_at',
    ]

    # Date hierarchy
    date_hierarchy = 'created_at'

    # Ordering
    ordering = ['last_name', 'first_name']
```

### Custom Filters

```python
# doctors/admin.py
from django.contrib import admin
from django.utils import timezone
from datetime import timedelta

class HasAppointmentsFilter(admin.SimpleListFilter):
    title = 'has appointments'
    parameter_name = 'has_appointments'

    def lookups(self, request, model_admin):
        return [
            ('yes', 'Has Appointments'),
            ('no', 'No Appointments'),
        ]

    def queryset(self, request, queryset):
        if self.value() == 'yes':
            return queryset.filter(appointments__isnull=False).distinct()
        if self.value() == 'no':
            return queryset.filter(appointments__isnull=True)


class RecentlyCreatedFilter(admin.SimpleListFilter):
    title = 'recently created'
    parameter_name = 'recent'

    def lookups(self, request, model_admin):
        return [
            ('today', 'Today'),
            ('week', 'This Week'),
            ('month', 'This Month'),
        ]

    def queryset(self, request, queryset):
        now = timezone.now()
        if self.value() == 'today':
            return queryset.filter(created_at__date=now.date())
        if self.value() == 'week':
            return queryset.filter(created_at__gte=now - timedelta(days=7))
        if self.value() == 'month':
            return queryset.filter(created_at__gte=now - timedelta(days=30))


@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    list_filter = [
        'is_on_vacation',
        HasAppointmentsFilter,
        RecentlyCreatedFilter,
    ]
```

---

## Form Customization

### Fieldsets

```python
@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    fieldsets = [
        ('Personal Information', {
            'fields': ['first_name', 'last_name', 'email', 'contact_number']
        }),
        ('Professional Details', {
            'fields': ['qualification', 'biography', 'photo']
        }),
        ('Status', {
            'fields': ['is_on_vacation'],
            'classes': ['collapse'],
        }),
        ('Metadata', {
            'fields': ['created_at', 'updated_at'],
            'classes': ['collapse'],
        }),
    ]

    readonly_fields = ['created_at', 'updated_at']
```

### Custom Form

```python
# doctors/forms.py
from django import forms
from .models import Doctor

class DoctorAdminForm(forms.ModelForm):
    class Meta:
        model = Doctor
        fields = '__all__'

    def clean_email(self):
        email = self.cleaned_data['email']
        if not email.endswith('@example.com'):
            raise forms.ValidationError('Email must be from @example.com domain')
        return email.lower()

    def clean(self):
        cleaned_data = super().clean()
        if cleaned_data.get('is_on_vacation') and not cleaned_data.get('biography'):
            raise forms.ValidationError(
                'Please add a biography before going on vacation'
            )
        return cleaned_data
```

```python
# doctors/admin.py
from .forms import DoctorAdminForm

@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    form = DoctorAdminForm
```

---

## Inline Models

```python
# doctors/admin.py
from .models import Doctor, DoctorAvailability, MedicalNote

class DoctorAvailabilityInline(admin.TabularInline):
    model = DoctorAvailability
    extra = 1
    min_num = 0
    max_num = 10


class MedicalNoteInline(admin.StackedInline):
    model = MedicalNote
    extra = 0
    readonly_fields = ['date']


@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'email', 'is_on_vacation']
    inlines = [DoctorAvailabilityInline, MedicalNoteInline]
```

---

## Custom Actions

```python
# doctors/admin.py
from django.contrib import admin, messages

@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'email', 'is_on_vacation']
    actions = ['set_on_vacation', 'set_off_vacation', 'send_newsletter']

    @admin.action(description='Mark selected doctors as on vacation')
    def set_on_vacation(self, request, queryset):
        updated = queryset.update(is_on_vacation=True)
        self.message_user(
            request,
            f'{updated} doctors marked as on vacation.',
            messages.SUCCESS
        )

    @admin.action(description='Mark selected doctors as available')
    def set_off_vacation(self, request, queryset):
        updated = queryset.update(is_on_vacation=False)
        self.message_user(
            request,
            f'{updated} doctors marked as available.',
            messages.SUCCESS
        )

    @admin.action(description='Send newsletter to selected doctors')
    def send_newsletter(self, request, queryset):
        from .tasks import send_newsletter_email

        for doctor in queryset:
            send_newsletter_email.delay(doctor.pk)

        self.message_user(
            request,
            f'Newsletter queued for {queryset.count()} doctors.',
            messages.INFO
        )
```

---

## Permissions

```python
@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'email', 'is_on_vacation']

    def has_add_permission(self, request):
        return request.user.has_perm('doctors.add_doctor')

    def has_change_permission(self, request, obj=None):
        if obj is not None and obj.is_on_vacation:
            # Only superuser can edit doctors on vacation
            return request.user.is_superuser
        return request.user.has_perm('doctors.change_doctor')

    def has_delete_permission(self, request, obj=None):
        if obj is not None:
            # Can't delete doctors with appointments
            if obj.appointments.exists():
                return False
        return request.user.has_perm('doctors.delete_doctor')

    def has_view_permission(self, request, obj=None):
        return True

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if not request.user.is_superuser:
            # Non-superusers only see their department's doctors
            return qs.filter(department__admin=request.user)
        return qs
```

---

## Custom Views in Admin

```python
# doctors/admin.py
from django.contrib import admin
from django.urls import path
from django.shortcuts import render
from django.http import HttpResponse
import csv

@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'email', 'is_on_vacation']
    change_list_template = 'admin/doctors/doctor/change_list.html'

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('export/', self.export_csv, name='doctor_export'),
            path('stats/', self.stats_view, name='doctor_stats'),
        ]
        return custom_urls + urls

    def export_csv(self, request):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="doctors.csv"'

        writer = csv.writer(response)
        writer.writerow(['ID', 'Name', 'Email', 'Qualification', 'On Vacation'])

        for doctor in Doctor.objects.all():
            writer.writerow([
                doctor.id,
                f'{doctor.first_name} {doctor.last_name}',
                doctor.email,
                doctor.qualification,
                doctor.is_on_vacation,
            ])

        return response

    def stats_view(self, request):
        context = {
            'total_doctors': Doctor.objects.count(),
            'on_vacation': Doctor.objects.filter(is_on_vacation=True).count(),
            'available': Doctor.objects.filter(is_on_vacation=False).count(),
        }
        return render(request, 'admin/doctors/doctor/stats.html', context)
```

```html
<!-- templates/admin/doctors/doctor/change_list.html -->
{% extends "admin/change_list.html" %}

{% block object-tools-items %}
<li>
    <a href="{% url 'admin:doctor_export' %}">Export CSV</a>
</li>
<li>
    <a href="{% url 'admin:doctor_stats' %}">View Stats</a>
</li>
{{ block.super }}
{% endblock %}
```

---

## Admin Site Customization

```python
# doctorapp/admin.py
from django.contrib import admin

admin.site.site_header = 'Doctor API Administration'
admin.site.site_title = 'Doctor API Admin'
admin.site.index_title = 'Welcome to Doctor API Admin'
```

### Custom Admin Site

```python
# doctorapp/admin.py
from django.contrib.admin import AdminSite

class DoctorAdminSite(AdminSite):
    site_header = 'Doctor API Administration'
    site_title = 'Doctor API Admin'
    index_title = 'Welcome to Doctor API Admin'

    def get_app_list(self, request, app_label=None):
        """Custom app ordering."""
        app_list = super().get_app_list(request, app_label)
        # Custom ordering logic
        return app_list


admin_site = DoctorAdminSite(name='doctor_admin')
```

```python
# doctors/admin.py
from doctorapp.admin import admin_site
from .models import Doctor

admin_site.register(Doctor, DoctorAdmin)
```

```python
# doctorapp/urls.py
from .admin import admin_site

urlpatterns = [
    path('admin/', admin_site.urls),
    ...
]
```

---

## Autocomplete Fields

```python
# doctors/admin.py
from django.contrib import admin
from bookings.models import Appointment

@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    search_fields = ['first_name', 'last_name', 'email']


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    autocomplete_fields = ['doctor', 'patient']
    list_display = ['patient', 'doctor', 'appointment_date', 'status']
```

---

## Raw ID Fields

```python
@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    raw_id_fields = ['doctor', 'patient']
    list_display = ['patient', 'doctor', 'appointment_date', 'status']
```

---

## Complete Admin Example

```python
# doctors/admin.py
from django.contrib import admin, messages
from django.utils.html import format_html
from django.urls import reverse
from .models import Doctor, Department, DoctorAvailability

class DoctorAvailabilityInline(admin.TabularInline):
    model = DoctorAvailability
    extra = 1


@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'photo_tag',
        'full_name',
        'email',
        'qualification',
        'vacation_status',
        'appointment_count',
    ]
    list_display_links = ['id', 'full_name']
    list_filter = ['is_on_vacation', 'qualification', 'created_at']
    search_fields = ['first_name', 'last_name', 'email']
    ordering = ['last_name']
    readonly_fields = ['photo_preview', 'created_at', 'updated_at']
    inlines = [DoctorAvailabilityInline]

    fieldsets = [
        ('Personal', {
            'fields': ['first_name', 'last_name', 'email', 'contact_number']
        }),
        ('Professional', {
            'fields': ['qualification', 'biography']
        }),
        ('Photo', {
            'fields': ['photo', 'photo_preview']
        }),
        ('Status', {
            'fields': ['is_on_vacation']
        }),
    ]

    actions = ['set_on_vacation', 'set_off_vacation']

    def full_name(self, obj):
        return f'Dr. {obj.first_name} {obj.last_name}'
    full_name.short_description = 'Name'

    def photo_tag(self, obj):
        if obj.photo:
            return format_html(
                '<img src="{}" width="40" height="40" style="border-radius: 50%;" />',
                obj.photo.url
            )
        return '-'
    photo_tag.short_description = 'Photo'

    def photo_preview(self, obj):
        if obj.photo:
            return format_html(
                '<img src="{}" width="200" />',
                obj.photo.url
            )
        return 'No photo'
    photo_preview.short_description = 'Preview'

    def vacation_status(self, obj):
        if obj.is_on_vacation:
            return format_html(
                '<span style="color: red;">🏖️ On Vacation</span>'
            )
        return format_html(
            '<span style="color: green;">✓ Available</span>'
        )
    vacation_status.short_description = 'Status'

    def appointment_count(self, obj):
        count = obj.appointments.count()
        url = reverse('admin:bookings_appointment_changelist') + f'?doctor__id={obj.id}'
        return format_html('<a href="{}">{} appointments</a>', url, count)
    appointment_count.short_description = 'Appointments'

    @admin.action(description='Set selected as on vacation')
    def set_on_vacation(self, request, queryset):
        queryset.update(is_on_vacation=True)
        self.message_user(request, 'Doctors set on vacation', messages.SUCCESS)

    @admin.action(description='Set selected as available')
    def set_off_vacation(self, request, queryset):
        queryset.update(is_on_vacation=False)
        self.message_user(request, 'Doctors set available', messages.SUCCESS)
```

---

## Best Practices

| Practice | Description |
|----------|-------------|
| Use list_display | Show important fields |
| Add search and filters | Easy data navigation |
| Use inlines | Related data in one view |
| Custom actions | Bulk operations |
| Limit permissions | Role-based access |
| Optimize queries | Use select_related |

---

## Next Steps

- [Deployment](./20-deployment.md) - Production deployment

---

[← Previous: Middleware](./18-middleware.md) | [Back to Index](./README.md) | [Next: Deployment →](./20-deployment.md)
