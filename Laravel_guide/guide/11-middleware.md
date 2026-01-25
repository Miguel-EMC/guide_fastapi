# 11 - Middleware in Laravel

Middleware provides a convenient mechanism for filtering HTTP requests entering your application. They act as "layers" that requests must pass through before reaching your controller, and also after your controller generates a response but before it's sent back to the client. This allows you to perform tasks such as authentication, logging, CORS handling, and more, in a centralized manner.

---

## 1. Understanding Middleware

Imagine your API endpoint is a secure club. Middleware are the bouncers at the entrance. Each bouncer checks something specific (e.g., "Is this person old enough?", "Does this person have an invitation?", "Is this person on the VIP list?"). If all checks pass, the person enters. If not, they are denied entry.

A middleware class typically has a `handle` method, which receives the incoming `$request` and a `$next` closure. The `$next` closure represents the next middleware in the stack, or the controller action itself.

```php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTokenIsValid
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->has('token')) {
            return response()->json(['message' => 'Token not provided'], 401);
        }

        if ($request->input('token') !== 'my-secret-token') {
            return response()->json(['message' => 'Invalid token'], 403);
        }

        return $next($request); // Pass the request to the next middleware or controller
    }
}
```

---

## 2. Creating Middleware

You can generate a new middleware class using the Artisan command:

```bash
php artisan make:middleware CheckApiKey
```
This will create a new file in `app/Http/Middleware/CheckApiKey.php`.

---

## 3. Registering and Applying Middleware

There are several ways to register and apply middleware:

### A. Global Middleware
Middleware that runs on every single HTTP request to your application. You register them in the `$middleware` property of your `app/Http/Kernel.php` file.

```php
// app/Http/Kernel.php
protected $middleware = [
    // ...
    \App\Http\Middleware\TrustProxies::class,
    \Illuminate\Http\Middleware\HandleCors::class, // Laravel's built-in CORS middleware
    \Illuminate\Foundation\Http\Middleware\ValidatePostSize::class,
    // ...
];
```

### B. Route Middleware (Aliases)
Middleware that can be assigned to specific routes or groups of routes. You first register an alias for them in the `$middlewareAliases` property of `app/Http/Kernel.php`.

```php
// app/Http/Kernel.php
protected $middlewareAliases = [
    // ...
    'auth' => \App\Http\Middleware\Authenticate::class,
    'api.key.check' => \App\Http\Middleware\CheckApiKey::class, // Your custom middleware
];
```
Then, you can apply them to routes:

```php
// routes/api.php
Route::get('/secured-data', function () {
    return response()->json(['data' => 'This is secured!']);
})->middleware('api.key.check');
```

### C. Middleware Groups
Laravel provides default middleware groups like `web` and `api`. The `api` group is defined in `app/Http/Kernel.php` and includes middleware specifically designed for APIs, such as `throttle` (rate limiting).

You can add your custom middleware to an existing group or create new groups:

```php
// app/Http/Kernel.php
protected $middlewareGroups = [
    'api' => [
        // ... Laravel's default API middleware
        \Illuminate\Routing\Middleware\ThrottleRequests::class.':api', // Rate Limiting
        \Illuminate\Routing\Middleware\SubstituteBindings::class,
        \App\Http\Middleware\CheckApiKey::class, // Add your API Key check to the API group
    ],
];
```
Any route defined in `routes/api.php` automatically uses the `api` middleware group.

---

## 4. Example: API Key Authentication Middleware

Let's refine our `CheckApiKey` middleware:

```php
// app/Http/Middleware/CheckApiKey.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckApiKey
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $expectedApiKey = env('API_KEY'); // Store your API key securely in .env

        if (!$request->hasHeader('X-API-KEY') || $request->header('X-API-KEY') !== $expectedApiKey) {
            return response()->json(['message' => 'Unauthorized - Invalid API Key'], 401);
        }

        return $next($request);
    }
}
```
Remember to add `API_KEY=your_secret_key_here` to your `.env` file.

Then, apply this middleware to the routes you want to protect.

---

## 5. Terminable Middleware

Sometimes, you might want to perform some operations *after* the HTTP response has been sent to the browser. For this, you can define a `terminate` method in your middleware.

```php
// app/Http/Middleware/LogApiRequest.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Log;

class LogApiRequest
{
    public function handle(Request $request, Closure $next): Response
    {
        return $next($request);
    }

    public function terminate(Request $request, Response $response): void
    {
        // This code will execute after the response has been sent
        Log::info('API Request Logged', [
            'url' => $request->fullUrl(),
            'method' => $request->method(),
            'status' => $response->getStatusCode(),
            'user_agent' => $request->header('User-Agent'),
        ]);
    }
}
```
Register terminable middleware as global or route middleware.

Middleware is a powerful feature for enforcing policies, managing cross-cutting concerns, and keeping your controller logic clean.