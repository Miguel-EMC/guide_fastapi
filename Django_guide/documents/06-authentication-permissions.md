# Authentication and Permissions

DRF provides flexible authentication and permission systems to secure your API.

## Authentication

Authentication identifies who is making the request.

### Built-in Authentication Classes

| Class | Description | Use Case |
|-------|-------------|----------|
| `SessionAuthentication` | Uses Django sessions | Browser-based apps |
| `BasicAuthentication` | HTTP Basic Auth | Testing, simple APIs |
| `TokenAuthentication` | Token-based auth | Mobile apps, SPAs |
| `RemoteUserAuthentication` | External auth | Proxy authentication |

### Global Configuration

```python
# settings.py
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.BasicAuthentication',
    ],
}
```

### Per-View Configuration

```python
from rest_framework.authentication import SessionAuthentication, TokenAuthentication
from rest_framework.permissions import IsAuthenticated

class DoctorListView(generics.ListAPIView):
    authentication_classes = [SessionAuthentication, TokenAuthentication]
    permission_classes = [IsAuthenticated]
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
```

### Session Authentication

Uses Django's session framework. Requires CSRF token for unsafe methods.

```python
# settings.py
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
}

# Add to urls.py for login/logout views
path('api-auth/', include('rest_framework.urls')),
```

### Token Authentication

```python
# settings.py
INSTALLED_APPS = [
    ...
    'rest_framework.authtoken',
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
    ],
}
```

```bash
# Create database table
python manage.py migrate
```

```python
# Generate token for user
from rest_framework.authtoken.models import Token
token = Token.objects.create(user=user)
print(token.key)
```

```python
# urls.py - Token obtain endpoint
from rest_framework.authtoken.views import obtain_auth_token

urlpatterns = [
    path('api/token/', obtain_auth_token, name='api_token'),
]
```

Client usage:
```bash
# Get token
curl -X POST http://localhost:8000/api/token/ \
  -d "username=admin&password=password"

# Use token
curl http://localhost:8000/api/doctors/ \
  -H "Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b"
```

### Custom Token View

```python
# doctors/views.py
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.response import Response

class CustomAuthToken(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)

        return Response({
            'token': token.key,
            'user_id': user.pk,
            'email': user.email,
            'username': user.username,
        })
```

---

## Permissions

Permissions determine if the authenticated user can perform the action.

### Built-in Permission Classes

| Class | Description |
|-------|-------------|
| `AllowAny` | Unrestricted access |
| `IsAuthenticated` | Authenticated users only |
| `IsAdminUser` | Admin users only (is_staff=True) |
| `IsAuthenticatedOrReadOnly` | Authenticated for write, anyone for read |
| `DjangoModelPermissions` | Uses Django model permissions |
| `DjangoObjectPermissions` | Object-level permissions |

### Global Configuration

```python
# settings.py
REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}
```

### Per-View Configuration

```python
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser

class DoctorListView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer


class PublicDoctorListView(generics.ListAPIView):
    permission_classes = [AllowAny]  # Public endpoint
    queryset = Doctor.objects.filter(is_on_vacation=False)
    serializer_class = DoctorSerializer


class AdminDoctorView(generics.ListAPIView):
    permission_classes = [IsAdminUser]  # Admin only
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
```

### IsAuthenticatedOrReadOnly

```python
from rest_framework.permissions import IsAuthenticatedOrReadOnly

class DoctorViewSet(viewsets.ModelViewSet):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    # GET: Anyone
    # POST, PUT, DELETE: Authenticated only
```

---

## Custom Permissions

### Basic Custom Permission

```python
# doctors/permissions.py
from rest_framework import permissions

class IsDoctor(permissions.BasePermission):
    """
    Custom permission to only allow users in the 'doctors' group.
    """
    message = 'You must be a doctor to perform this action.'

    def has_permission(self, request, view):
        return request.user.groups.filter(name='doctors').exists()
```

### Object-Level Permission

```python
# doctors/permissions.py
from rest_framework import permissions

class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Object-level permission to only allow owners to edit.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions for any request
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions only for owner
        return obj.created_by == request.user


class IsDoctorOwner(permissions.BasePermission):
    """
    Only the doctor can modify their own profile.
    """

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        # Check if user is linked to this doctor
        return hasattr(request.user, 'doctor_profile') and \
               request.user.doctor_profile == obj
```

### Permission with Request Method Check

```python
class DoctorPermission(permissions.BasePermission):
    """
    Different permissions based on request method.
    """

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True  # Anyone can read

        if request.method == 'POST':
            return request.user.is_staff  # Only staff can create

        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        if request.method == 'DELETE':
            return request.user.is_superuser  # Only superuser can delete

        return obj.created_by == request.user
```

### Using Custom Permissions

```python
# doctors/views.py
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from .permissions import IsDoctor, IsOwnerOrReadOnly

class DoctorViewSet(viewsets.ModelViewSet):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
    permission_classes = [IsAuthenticated, IsDoctor]


class MedicalNoteView(generics.RetrieveUpdateDestroyAPIView):
    queryset = MedicalNote.objects.all()
    serializer_class = MedicalNoteSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
```

### Combining Permissions

```python
# All conditions must be True (AND)
permission_classes = [IsAuthenticated, IsDoctor]

# Custom OR logic
from rest_framework.permissions import BasePermission

class IsAdminOrDoctor(BasePermission):
    def has_permission(self, request, view):
        is_admin = request.user.is_staff
        is_doctor = request.user.groups.filter(name='doctors').exists()
        return is_admin or is_doctor
```

---

## Django Model Permissions

Uses Django's built-in permission system:

```python
from rest_framework.permissions import DjangoModelPermissions

class DoctorViewSet(viewsets.ModelViewSet):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
    permission_classes = [DjangoModelPermissions]
```

Required permissions:
- `POST`: `add_doctor`
- `PUT/PATCH`: `change_doctor`
- `DELETE`: `delete_doctor`

---

## User Groups

Create groups in Django admin or programmatically:

```python
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from doctors.models import Doctor

# Create group
doctors_group, created = Group.objects.get_or_create(name='doctors')

# Add permissions to group
content_type = ContentType.objects.get_for_model(Doctor)
permissions = Permission.objects.filter(content_type=content_type)
doctors_group.permissions.set(permissions)

# Add user to group
user.groups.add(doctors_group)
```

---

## Complete Example

```python
# doctors/permissions.py
from rest_framework import permissions

class IsDoctor(permissions.BasePermission):
    """Only users in doctors group."""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.groups.filter(name='doctors').exists()


class IsDoctorOrReadOnly(permissions.BasePermission):
    """Doctors can edit, others can only read."""

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.groups.filter(name='doctors').exists()


class CanManageAppointments(permissions.BasePermission):
    """Check if user can manage appointments."""

    def has_permission(self, request, view):
        return request.user.has_perm('bookings.change_appointment')

    def has_object_permission(self, request, view, obj):
        # Doctor can manage their own appointments
        if hasattr(request.user, 'doctor_profile'):
            return obj.doctor == request.user.doctor_profile

        # Patient can view their own appointments
        if hasattr(request.user, 'patient_profile'):
            return obj.patient == request.user.patient_profile

        return request.user.is_staff
```

```python
# doctors/viewsets.py
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .permissions import IsDoctor
from .models import Doctor
from .serializers import DoctorSerializer

class DoctorViewSet(viewsets.ModelViewSet):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer

    def get_permissions(self):
        """Different permissions for different actions."""
        if self.action in ['list', 'retrieve']:
            permission_classes = [IsAuthenticated]
        elif self.action == 'create':
            permission_classes = [IsAuthenticated, IsDoctor]
        else:
            permission_classes = [IsAuthenticated, IsDoctor]
        return [permission() for permission in permission_classes]
```

---

## Best Practices

| Practice | Description |
|----------|-------------|
| Default to restrictive | Start with IsAuthenticated |
| Use groups | Organize users by role |
| Object-level permissions | For resource ownership |
| Document permissions | Clear API documentation |
| Test permissions | Write permission tests |
| Use Token auth for APIs | Better than session for APIs |

---

## Next Steps

- [Validation](./07-validation.md) - Data validation patterns

---

[← Previous: URLs and Routing](./05-urls-routing.md) | [Back to Index](./README.md) | [Next: Validation →](./07-validation.md)
