# 24 - API Schema Generation (OpenAPI/Swagger)

Manually documenting every endpoint of an API is tedious and error-prone. Modern APIs use **API schemas** to automatically generate documentation, client libraries, and testing tools. The most popular specification for this is **OpenAPI** (formerly known as Swagger).

A well-defined schema allows developers (including your future self) to understand and interact with your API without needing to read its source code.

---

## 1. Why Use an API Schema?

-   **Automatic Interactive Documentation**: Tools like Swagger UI and ReDoc can generate a beautiful, interactive documentation site where users can test endpoints directly from their browser.
-   **Client Code Generation**: You can generate client libraries for various languages (Python, JavaScript, Java, etc.) from the schema.
-   **Contract-First Development**: Defines a clear "contract" for your API, which is useful for frontend teams.
-   **Automated Testing**: The schema can be used to generate automated tests that validate your API's responses.

---

## 2. Generating Schemas with `drf-spectacular`

While DRF has some built-in schema generation, third-party packages offer much more power and support for OpenAPI 3. We will use `drf-spectacular`, a popular and modern library for this task.

### Step 1: Install `drf-spectacular`

First, add the package to your project.

```bash
pip install drf-spectacular
```

Don't forget to add it to your `requirements.txt` file.

### Step 2: Configure in `settings.py`

Add `drf_spectacular` to your `INSTALLED_APPS`:

```python
# settings.py
INSTALLED_APPS = [
    # ... other apps
    'rest_framework',
    'drf_spectacular', # Add this
]
```

Then, configure it as the default schema class for DRF:

```python
# settings.py
REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    # ... other settings
}
```

You can also add project-wide information for your API:

```python
# settings.py
SPECTACULAR_SETTINGS = {
    'TITLE': 'Doctor Clinic API',
    'DESCRIPTION': 'A comprehensive API for managing doctors, patients, and bookings.',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False, # We will serve it manually
}
```

### Step 3: Add Schema URLs

Finally, add the URLs that will serve the schema file and the documentation UIs.

```python
# your_project/urls.py
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

urlpatterns = [
    # ... your other urls
    # Schema URLs
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    # Optional UI URLs:
    path('api/schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]
```

---

## 3. Using the Generated Documentation

With the setup above, once you run your development server, you can access:

-   `http://127.0.0.1:8000/api/schema/`: Downloads the raw `openapi.yaml` schema file.
-   `http://127.0.0.1:8000/api/schema/swagger-ui/`: Displays the interactive Swagger UI for your API.
-   `http://127.0.0.1:8000/api/schema/redoc/`: Displays the elegant ReDoc documentation.

Now you have a fully documented API that automatically updates as you change your models, serializers, and views.

## 4. Annotating your API

For even better documentation, you can add more details using the `@extend_schema` decorator on your views. This allows you to add descriptions, examples, and clarify responses.

```python
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

@extend_schema(
    summary="Retrieve a list of doctors",
    description="Returns a paginated list of all doctors in the system. Can be filtered by specialty.",
    parameters=[
        OpenApiParameter(name='specialty', description='Filter by doctor specialty', required=False, type=OpenApiTypes.STR),
    ]
)
@api_view(['GET'])
def doctor_list(request):
    # ... view logic
```

This level of detail will be reflected in Swagger UI and ReDoc, making your API extremely easy to use.