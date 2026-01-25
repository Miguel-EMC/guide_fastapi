# File Uploads

Django and DRF provide robust file handling for uploads, media storage, and image processing.

## Configuration

### Settings

```python
# settings.py
import os

# Media files (uploads)
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Maximum upload size (10MB)
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024

# Allowed file types
ALLOWED_UPLOAD_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx']
```

### URL Configuration

```python
# doctorapp/urls.py
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # ... your URLs
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

---

## Model with File Fields

```python
# doctors/models.py
from django.db import models
import os

def doctor_photo_path(instance, filename):
    """Generate upload path for doctor photos."""
    ext = filename.split('.')[-1]
    filename = f'doctor_{instance.id}.{ext}'
    return os.path.join('doctors', 'photos', filename)


def document_path(instance, filename):
    """Generate upload path for documents."""
    return os.path.join('doctors', str(instance.doctor.id), 'documents', filename)


class Doctor(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()

    # Image field
    photo = models.ImageField(
        upload_to=doctor_photo_path,
        blank=True,
        null=True
    )

    # File field
    cv = models.FileField(
        upload_to='doctors/cv/',
        blank=True,
        null=True
    )

    def __str__(self):
        return f'Dr. {self.first_name} {self.last_name}'


class DoctorDocument(models.Model):
    doctor = models.ForeignKey(
        Doctor,
        on_delete=models.CASCADE,
        related_name='documents'
    )
    title = models.CharField(max_length=200)
    file = models.FileField(upload_to=document_path)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.title} - {self.doctor}'
```

---

## Basic File Upload Serializer

```python
# doctors/serializers.py
from rest_framework import serializers
from .models import Doctor, DoctorDocument

class DoctorSerializer(serializers.ModelSerializer):
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = Doctor
        fields = ['id', 'first_name', 'last_name', 'email', 'photo', 'photo_url', 'cv']

    def get_photo_url(self, obj):
        if obj.photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.photo.url)
            return obj.photo.url
        return None


class DoctorDocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    file_size = serializers.SerializerMethodField()

    class Meta:
        model = DoctorDocument
        fields = ['id', 'doctor', 'title', 'file', 'file_url', 'file_size', 'uploaded_at']

    def get_file_url(self, obj):
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url

    def get_file_size(self, obj):
        if obj.file:
            return obj.file.size
        return 0
```

---

## File Upload Views

### Using Parsers

```python
# doctors/views.py
from rest_framework import generics, status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from .models import Doctor, DoctorDocument
from .serializers import DoctorSerializer, DoctorDocumentSerializer

class DoctorPhotoUploadView(generics.UpdateAPIView):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
    parser_classes = [MultiPartParser, FormParser]

    def patch(self, request, pk):
        doctor = self.get_object()

        if 'photo' not in request.FILES:
            return Response(
                {'error': 'No photo provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        doctor.photo = request.FILES['photo']
        doctor.save()

        serializer = self.get_serializer(doctor)
        return Response(serializer.data)


class DoctorDocumentUploadView(generics.CreateAPIView):
    queryset = DoctorDocument.objects.all()
    serializer_class = DoctorDocumentSerializer
    parser_classes = [MultiPartParser, FormParser]
```

### Upload with Validation

```python
# doctors/views.py
import os
from django.conf import settings
from rest_framework import generics, status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response

class ValidatedFileUploadView(generics.CreateAPIView):
    parser_classes = [MultiPartParser, FormParser]

    ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf']
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

    def validate_file(self, file):
        # Check extension
        ext = os.path.splitext(file.name)[1].lower()
        if ext not in self.ALLOWED_EXTENSIONS:
            return False, f'File type {ext} not allowed'

        # Check file size
        if file.size > self.MAX_FILE_SIZE:
            return False, f'File too large. Max size: {self.MAX_FILE_SIZE // (1024*1024)}MB'

        return True, None

    def post(self, request, *args, **kwargs):
        file = request.FILES.get('file')

        if not file:
            return Response(
                {'error': 'No file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        is_valid, error = self.validate_file(file)
        if not is_valid:
            return Response(
                {'error': error},
                status=status.HTTP_400_BAD_REQUEST
            )

        return super().post(request, *args, **kwargs)
```

---

## Serializer File Validation

```python
# doctors/serializers.py
from rest_framework import serializers
from django.core.validators import FileExtensionValidator
import os

class DoctorDocumentSerializer(serializers.ModelSerializer):
    file = serializers.FileField(
        validators=[
            FileExtensionValidator(allowed_extensions=['pdf', 'doc', 'docx'])
        ]
    )

    class Meta:
        model = DoctorDocument
        fields = ['id', 'doctor', 'title', 'file', 'uploaded_at']

    def validate_file(self, value):
        # Max size: 10MB
        max_size = 10 * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError(
                f'File size cannot exceed {max_size // (1024*1024)}MB'
            )

        # Check content type
        allowed_types = ['application/pdf', 'application/msword',
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        if value.content_type not in allowed_types:
            raise serializers.ValidationError(
                'Only PDF and Word documents are allowed'
            )

        return value


class DoctorPhotoSerializer(serializers.ModelSerializer):
    photo = serializers.ImageField()

    class Meta:
        model = Doctor
        fields = ['id', 'photo']

    def validate_photo(self, value):
        # Max size: 2MB
        if value.size > 2 * 1024 * 1024:
            raise serializers.ValidationError('Image size cannot exceed 2MB')

        # Check dimensions (optional)
        from PIL import Image
        img = Image.open(value)
        if img.width < 100 or img.height < 100:
            raise serializers.ValidationError('Image must be at least 100x100 pixels')

        if img.width > 2000 or img.height > 2000:
            raise serializers.ValidationError('Image cannot exceed 2000x2000 pixels')

        return value
```

---

## Image Processing

### Installation

```bash
pip install Pillow
```

### Resize Image on Upload

```python
# doctors/models.py
from django.db import models
from PIL import Image
import os

class Doctor(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    photo = models.ImageField(upload_to='doctors/photos/', blank=True, null=True)
    thumbnail = models.ImageField(upload_to='doctors/thumbnails/', blank=True, null=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

        if self.photo:
            self.resize_photo()
            self.create_thumbnail()

    def resize_photo(self):
        """Resize photo to max 800x800."""
        img = Image.open(self.photo.path)

        if img.width > 800 or img.height > 800:
            img.thumbnail((800, 800), Image.Resampling.LANCZOS)
            img.save(self.photo.path)

    def create_thumbnail(self):
        """Create 150x150 thumbnail."""
        img = Image.open(self.photo.path)
        img.thumbnail((150, 150), Image.Resampling.LANCZOS)

        # Save thumbnail
        thumb_path = self.photo.path.replace('photos', 'thumbnails')
        os.makedirs(os.path.dirname(thumb_path), exist_ok=True)
        img.save(thumb_path)

        # Update model
        self.thumbnail = self.photo.name.replace('photos', 'thumbnails')
        super().save(update_fields=['thumbnail'])
```

### Image Processing Utility

```python
# doctors/utils.py
from PIL import Image
from io import BytesIO
from django.core.files.uploadedfile import InMemoryUploadedFile
import sys

def resize_image(image, max_size=(800, 800)):
    """Resize image to fit within max_size."""
    img = Image.open(image)

    # Convert to RGB if necessary
    if img.mode in ('RGBA', 'P'):
        img = img.convert('RGB')

    # Resize
    img.thumbnail(max_size, Image.Resampling.LANCZOS)

    # Save to BytesIO
    output = BytesIO()
    img.save(output, format='JPEG', quality=85)
    output.seek(0)

    return InMemoryUploadedFile(
        output,
        'ImageField',
        f'{image.name.split(".")[0]}.jpg',
        'image/jpeg',
        sys.getsizeof(output),
        None
    )


def create_thumbnail(image, size=(150, 150)):
    """Create thumbnail from image."""
    img = Image.open(image)

    if img.mode in ('RGBA', 'P'):
        img = img.convert('RGB')

    img.thumbnail(size, Image.Resampling.LANCZOS)

    output = BytesIO()
    img.save(output, format='JPEG', quality=80)
    output.seek(0)

    return InMemoryUploadedFile(
        output,
        'ImageField',
        f'thumb_{image.name.split(".")[0]}.jpg',
        'image/jpeg',
        sys.getsizeof(output),
        None
    )
```

```python
# doctors/serializers.py
from .utils import resize_image, create_thumbnail

class DoctorPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Doctor
        fields = ['id', 'photo', 'thumbnail']

    def update(self, instance, validated_data):
        if 'photo' in validated_data:
            # Resize photo
            validated_data['photo'] = resize_image(validated_data['photo'])
            # Create thumbnail
            instance.thumbnail = create_thumbnail(validated_data['photo'])

        return super().update(instance, validated_data)
```

---

## Multiple File Upload

```python
# doctors/serializers.py
class MultipleFileUploadSerializer(serializers.Serializer):
    files = serializers.ListField(
        child=serializers.FileField(),
        allow_empty=False,
        max_length=10
    )
    doctor = serializers.PrimaryKeyRelatedField(queryset=Doctor.objects.all())

    def create(self, validated_data):
        doctor = validated_data['doctor']
        files = validated_data['files']
        documents = []

        for file in files:
            doc = DoctorDocument.objects.create(
                doctor=doctor,
                title=file.name,
                file=file
            )
            documents.append(doc)

        return documents
```

```python
# doctors/views.py
class MultipleFileUploadView(generics.CreateAPIView):
    serializer_class = MultipleFileUploadSerializer
    parser_classes = [MultiPartParser]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        documents = serializer.save()

        return Response(
            DoctorDocumentSerializer(documents, many=True).data,
            status=status.HTTP_201_CREATED
        )
```

---

## Cloud Storage (AWS S3)

### Installation

```bash
pip install django-storages boto3
```

### Configuration

```python
# settings.py
INSTALLED_APPS = [
    ...
    'storages',
]

# AWS Settings
AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
AWS_STORAGE_BUCKET_NAME = os.environ.get('AWS_STORAGE_BUCKET_NAME')
AWS_S3_REGION_NAME = 'us-east-1'
AWS_S3_CUSTOM_DOMAIN = f'{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com'

# S3 Settings
AWS_S3_FILE_OVERWRITE = False
AWS_DEFAULT_ACL = None
AWS_S3_OBJECT_PARAMETERS = {
    'CacheControl': 'max-age=86400',
}

# Use S3 for media files
DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/media/'
```

### Custom Storage Backend

```python
# doctors/storage.py
from storages.backends.s3boto3 import S3Boto3Storage

class PublicMediaStorage(S3Boto3Storage):
    location = 'media'
    default_acl = 'public-read'
    file_overwrite = False


class PrivateMediaStorage(S3Boto3Storage):
    location = 'private'
    default_acl = 'private'
    file_overwrite = False
    custom_domain = False
```

```python
# doctors/models.py
from .storage import PublicMediaStorage, PrivateMediaStorage

class Doctor(models.Model):
    # Public photo
    photo = models.ImageField(
        upload_to='doctors/photos/',
        storage=PublicMediaStorage(),
        blank=True
    )

    # Private documents
    cv = models.FileField(
        upload_to='doctors/cv/',
        storage=PrivateMediaStorage(),
        blank=True
    )
```

---

## Secure File Downloads

```python
# doctors/views.py
from django.http import FileResponse, Http404
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from .models import DoctorDocument

class SecureFileDownloadView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            document = DoctorDocument.objects.get(pk=pk)
        except DoctorDocument.DoesNotExist:
            raise Http404('Document not found')

        # Check permission
        if not request.user.has_perm('doctors.view_doctordocument'):
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Serve file
        response = FileResponse(
            document.file.open('rb'),
            as_attachment=True,
            filename=document.title
        )
        return response
```

---

## ViewSet with File Upload

```python
# doctors/viewsets.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response

class DoctorViewSet(viewsets.ModelViewSet):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer

    @action(
        detail=True,
        methods=['post'],
        parser_classes=[MultiPartParser, FormParser]
    )
    def upload_photo(self, request, pk=None):
        doctor = self.get_object()

        if 'photo' not in request.FILES:
            return Response(
                {'error': 'No photo provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Delete old photo
        if doctor.photo:
            doctor.photo.delete()

        doctor.photo = request.FILES['photo']
        doctor.save()

        return Response(
            DoctorSerializer(doctor, context={'request': request}).data
        )

    @action(detail=True, methods=['delete'])
    def delete_photo(self, request, pk=None):
        doctor = self.get_object()

        if doctor.photo:
            doctor.photo.delete()
            doctor.save()

        return Response(status=status.HTTP_204_NO_CONTENT)
```

---

## Best Practices

| Practice | Description |
|----------|-------------|
| Validate file types | Check extensions and content types |
| Limit file sizes | Prevent large uploads |
| Use cloud storage | S3, GCS for production |
| Generate unique names | Avoid conflicts |
| Serve via CDN | Better performance |
| Secure private files | Authentication for sensitive files |

---

## Next Steps

- [Celery and Tasks](./17-celery-tasks.md) - Background job processing

---

[← Previous: Signals](./15-signals.md) | [Back to Index](./README.md) | [Next: Celery and Tasks →](./17-celery-tasks.md)
