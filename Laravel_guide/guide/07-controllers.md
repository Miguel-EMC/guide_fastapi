# 07 - Controllers in Laravel

Controllers are the "C" in the MVC (Model-View-Controller) architectural pattern. They act as intermediaries between incoming HTTP requests and your application's business logic. For API development, controllers are responsible for receiving client requests, processing them (often by interacting with models and services), and returning appropriate HTTP responses, typically in JSON format.

---

## 1. Creating Controllers

You can generate a new controller using the Artisan command-line interface.

### Standard Controller
```bash
php artisan make:controller PostController
```
This will create a new file at `app/Http/Controllers/PostController.php`.

### API Resource Controller
For API development, you'll often create controllers that handle a set of RESTful actions for a given resource. Laravel provides the `--api` flag for this purpose, which creates a controller with methods ready for API interactions (without the `create` and `edit` methods, which are typically for views).

```bash
php artisan make:controller DoctorController --api
```
This command generates a controller with `index`, `store`, `show`, `update`, and `destroy` methods.

---

## 2. Controller Actions (Methods)

Each method within a controller is designed to handle a specific HTTP request for a resource. Here's a breakdown of the typical API methods:

### `index()` - Retrieve All Resources
Responsible for fetching and returning a collection of resources.

```php
// app/Http/Controllers/DoctorController.php

use App\Models\Doctor;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class DoctorController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        $doctors = Doctor::all(); // Retrieve all doctors
        return response()->json($doctors);
    }
    // ... other methods
}
```

### `store(Request $request)` - Create a New Resource
Handles the creation of a new resource based on the incoming request data.

```php
// app/Http/Controllers/DoctorController.php

use App\Models\Doctor;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class DoctorController extends Controller
{
    // ... index method

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validatedData = $request->validate([ // Basic validation
            'name' => 'required|string|max:255',
            'specialty' => 'required|string|max:255',
            'is_on_vacation' => 'boolean',
        ]);

        $doctor = Doctor::create($validatedData); // Create doctor

        return response()->json($doctor, 201); // 201 Created status
    }
    // ... other methods
}
```

### `show(Doctor $doctor)` - Retrieve a Single Resource
Displays a specific resource. This method often leverages **Route Model Binding** for cleaner code.

```php
// app/Http/Controllers/DoctorController.php

use App\Models\Doctor;
use Illuminate\Http\JsonResponse;

class DoctorController extends Controller
{
    // ... index, store methods

    /**
     * Display the specified resource.
     */
    public function show(Doctor $doctor): JsonResponse // Doctor model automatically injected
    {
        return response()->json($doctor);
    }
    // ... other methods
}
```

### `update(Request $request, Doctor $doctor)` - Update a Resource
Updates an existing resource based on the incoming request data.

```php
// app/Http/Controllers/DoctorController.php

use App\Models\Doctor;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class DoctorController extends Controller
{
    // ... index, store, show methods

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Doctor $doctor): JsonResponse
    {
        $validatedData = $request->validate([
            'name' => 'sometimes|string|max:255',
            'specialty' => 'sometimes|string|max:255',
            'is_on_vacation' => 'sometimes|boolean',
        ]);

        $doctor->update($validatedData); // Update doctor

        return response()->json($doctor);
    }
    // ... destroy method
}
```

### `destroy(Doctor $doctor)` - Delete a Resource
Removes a specific resource from storage.

```php
// app/Http/Controllers/DoctorController.php

use App\Models\Doctor;
use Illuminate\Http\JsonResponse;

class DoctorController extends Controller
{
    // ... index, store, show, update methods

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Doctor $doctor): JsonResponse
    {
        $doctor->delete(); // Delete doctor

        return response()->json(null, 204); // 204 No Content status
    }
}
```

---

## 3. Dependency Injection in Controllers

Laravel's service container automatically injects class dependencies into your controller methods. This allows for clean, testable code.

```php
// app/Http/Controllers/DoctorController.php

use App\Models\Doctor;
use App\Services\BookingService; // Imagine you have a custom service
use Illuminate\Http\Request;

class DoctorController extends Controller
{
    protected $bookingService;

    // Constructor injection
    public function __construct(BookingService $bookingService)
    {
        $this->bookingService = $bookingService;
    }

    // Method injection (for Request and Model example above)
    public function store(Request $request)
    {
        // ...
    }
}
```

---

## 4. Single Action Controllers (`__invoke` method)

For controllers that perform only a single action, Laravel allows you to define a single `__invoke` method. These are useful for simple operations.

```bash
php artisan make:controller ShowDoctorProfileController --invokable --api
```
```php
// app/Http/Controllers/ShowDoctorProfileController.php

use App\Models\Doctor;
use Illuminate\Http\JsonResponse;

class ShowDoctorProfileController extends Controller
{
    /**
     * Handle the incoming request.
     */
    public function __invoke(Doctor $doctor): JsonResponse
    {
        return response()->json($doctor);
    }
}
```
You would then register this in your `routes/api.php` like so:
```php
Route::get('/doctors/{doctor}/profile', ShowDoctorProfileController::class);
```

Controllers are the central hub for handling API requests, making them a crucial component in your Laravel backend development.