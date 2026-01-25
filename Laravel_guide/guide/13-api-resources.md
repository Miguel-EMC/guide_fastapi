# 13 - API Resources (Data Transformation)

When building APIs, you often need to transform your Eloquent models into JSON responses that are consistent and easy for clients to consume. Directly returning Eloquent models with `$model->toJson()` can expose internal details or include unnecessary data. Laravel's **API Resources** provide a powerful way to transform your models and their relationships into flexible and structured JSON formats.

API Resources allow you to:
-   Control exactly which attributes are exposed in your API's JSON responses.
-   Add metadata that is not part of the model itself.
-   Include relationships in a controlled manner, preventing N+1 queries.
-   Maintain a consistent JSON structure across your API.

---

## 1. Creating Resources

You can generate a new resource using the `make:resource` Artisan command:

```bash
php artisan make:resource DoctorResource
```
This will create a new file at `app/Http/Resources/DoctorResource.php`.

## 2. Resource Structure

A resource class extends `Illuminate\Http\Resources\Json\JsonResource` and defines a `toArray()` method. This method takes the incoming request and returns the array of attributes that should be converted to JSON.

```php
// app/Http/Resources/DoctorResource.php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DoctorResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'full_name' => $this->name, // Custom attribute name
            'specialty_area' => $this->specialty,
            'on_vacation' => $this->is_on_vacation,
            'created_at' => $this->created_at->format('Y-m-d H:i:s'),
            'updated_at' => $this->updated_at->format('Y-m-d H:i:s'),
        ];
    }
}
```

---

## 3. Using Resources in Controllers

### Single Resource

To transform a single model instance, you simply instantiate the resource:

```php
// app/Http/Controllers/DoctorController.php

use App\Models\Doctor;
use App\Http\Resources\DoctorResource;
use Illuminate\Http\JsonResponse;

class DoctorController extends Controller
{
    /**
     * Display the specified resource.
     */
    public function show(Doctor $doctor): JsonResponse
    {
        return response()->json(new DoctorResource($doctor));
        // Alternatively, you can just return the resource directly
        // return new DoctorResource($doctor);
    }
}
```

### Resource Collections

To transform a collection of models, use the `collection()` method on your resource:

```php
// app/Http/Controllers/DoctorController.php

use App\Models\Doctor;
use App\Http\Resources\DoctorResource;
use Illuminate\Http\JsonResponse;

class DoctorController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        $doctors = Doctor::all();
        return response()->json(DoctorResource::collection($doctors));
        // Alternatively, return DoctorResource::collection($doctors);
    }
}
```
Laravel will automatically paginate resource collections if the underlying collection is a paginator instance.

---

## 4. Including Relationships

API Resources excel at managing how related models are included in your JSON responses.

```php
// app/Http/Resources/DoctorResource.php

namespace App\Http\Resources;

use App\Http\Resources\PatientResource; // Assuming you have a PatientResource
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DoctorResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'full_name' => $this->name,
            'specialty_area' => $this->specialty,
            'on_vacation' => $this->is_on_vacation,
            'patients' => PatientResource::collection($this->whenLoaded('patients')), // Conditionally load
            'created_at' => $this->created_at->format('Y-m-d H:i:s'),
            'updated_at' => $this->updated_at->format('Y-m-d H:i:s'),
        ];
    }
}
```
In the example above, `whenLoaded('patients')` ensures that the `patients` relationship is only included if it has already been eager loaded on the model. This prevents accidental N+1 queries.

---

## 5. Conditional Attributes

You can conditionally include attributes in your resource's output using the `when()` method.

```php
// app/Http/Resources/DoctorResource.php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DoctorResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'full_name' => $this->name,
            'specialty_area' => $this->specialty,
            'on_vacation' => $this->is_on_vacation,
            // Include a 'secret_note' only if the current user is an admin
            $this->when(Auth::user() && Auth::user()->isAdmin(), [
                'secret_note' => 'This doctor loves coffee.',
            ]),
            'created_at' => $this->created_at->format('Y-m-d H:i:s'),
            'updated_at' => $this->updated_at->format('Y-m-d H:i:s'),
        ];
    }
}
```

---

## 6. Adding Metadata to Collections

When returning a collection of resources, you might want to include additional metadata (e.g., total count, pagination links).

```php
// app/Http/Resources/DoctorCollection.php (custom collection resource)
namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\ResourceCollection;

class DoctorCollection extends ResourceCollection
{
    public function toArray(Request $request): array
    {
        return [
            'data' => $this->collection, // The actual collection of resources
            'meta' => [
                'total_doctors' => $this->collection->count(),
                'version' => '1.0.0',
                'author' => 'Your Name',
            ],
        ];
    }
}
```
You would then use `return new DoctorCollection($doctors);` in your controller.

API Resources are an indispensable tool for crafting clean, consistent, and maintainable JSON APIs in Laravel.