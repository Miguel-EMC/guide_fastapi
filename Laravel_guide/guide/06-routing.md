# 06 - API Routing in Laravel

Routing is the process of mapping incoming HTTP requests to the appropriate controller actions. For backend API development in Laravel, your primary focus will be the `routes/api.php` file. Routes defined here are automatically stateless, prefixed with `/api`, and are intended to be consumed by clients like frontend applications or other services.

---

## 1. Basic Routing

The most basic Laravel routes accept a URI and a closure or a controller action.

```php
// routes/api.php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// A simple GET endpoint returning JSON
Route::get('/hello', function () {
    return response()->json(['message' => 'Hello, World!']);
});

// A POST endpoint
Route::post('/users', 'App\Http\Controllers\UserController@store');

// Other HTTP verbs
Route::put('/users/{id}', 'App\Http\Controllers\UserController@update');
Route::delete('/users/{id}', 'App\Http\Controllers\UserController@destroy');
```

As of Laravel 11, the syntax for controller actions is typically cleaner:

```php
use App\Http\Controllers\UserController;

Route::put('/users/{id}', [UserController::class, 'update']);
```

## 2. Route Parameters

Often, you'll need to capture segments of the URI, such as a user's ID.

### Required Parameters
```php
Route::get('/users/{id}', function (string $id) {
    // Find and return a user by their ID
});
```

### Optional Parameters
You can specify optional parameters by adding a `?` and providing a default value.
```php
Route::get('/posts/{category?}', function (string $category = 'all') {
    // Return posts, optionally filtered by category
});
```

---

## 3. Route Groups

Route groups allow you to share route attributes, such as middleware or prefixes, across a large number of routes without needing to define those attributes on each individual route.

### Middleware Grouping
This is commonly used to protect a group of routes with authentication middleware.

```php
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user/profile', [ProfileController::class, 'show']);
    Route::post('/posts', [PostController::class, 'store']);
});
```

### Prefix Grouping
This is useful for versioning your API.

```php
Route::prefix('v1')->group(function () {
    Route::get('/users', [UserController::class, 'index']);
    Route::get('/users/{id}', [UserController::class, 'show']);
});
// These routes will have URIs like /api/v1/users
```

## 4. Route Model Binding

Laravel's route model binding provides a convenient way to automatically inject model instances into your routes. Instead of fetching a model by its ID, Laravel can do it for you.

### Implicit Binding
If a route parameter's name (`{user}`) matches a model variable name (`$user`), and the variable is type-hinted with an Eloquent model, Laravel will automatically inject the model instance.

```php
use App\Models\User;

// Laravel will automatically find the User with the given {id}
// and inject it into the $user variable.
// If not found, it will automatically return a 404 response.
Route::get('/users/{user}', function (User $user) {
    return $user;
});
```

This is extremely powerful for creating clean and concise controller methods.

## 5. API Resource Routes

For CRUD (Create, Read, Update, Delete) operations, defining each route individually can be cumbersome. Laravel's API resource routes simplify this immensely.

```php
use App\Http\Controllers\DoctorController;

Route::apiResource('doctors', DoctorController::class);
```

This single line of code creates a full suite of conventional RESTful API endpoints:

| Verb      | URI                    | Action  | Route Name     |
|-----------|------------------------|---------|----------------|
| `GET`     | `/api/doctors`         | `index` | `doctors.index`|
| `POST`    | `/api/doctors`         | `store` | `doctors.store`|
| `GET`     | `/api/doctors/{doctor}`| `show`    | `doctors.show` |
| `PUT/PATCH` | `/api/doctors/{doctor}`| `update`  | `doctors.update`|
| `DELETE`  | `/api/doctors/{doctor}`| `destroy` | `doctors.destroy`|

This automatically maps to the corresponding methods in your `DoctorController`.

## 6. Rate Limiting

Laravel makes it easy to protect your API from abuse. You can apply rate limiting middleware to your routes. Laravel's default API rate limiter allows 60 requests per minute per IP address.

```php
// Apply the default API rate limiter to a group of routes
Route::middleware('throttle:api')->group(function () {
    // Your routes here...
});
```

## 7. Inspecting Your Routes

To get a complete overview of all the routes defined in your application, you can use the `route:list` Artisan command.

```bash
php artisan route:list
```

This is an invaluable tool for debugging and understanding your API's endpoints.