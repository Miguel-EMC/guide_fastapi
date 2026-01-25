# 15 - Error Handling and Logging

In any production application, robust error handling and comprehensive logging are paramount. Laravel provides powerful tools to manage exceptions gracefully and to log events, making your application more resilient and easier to debug. This guide focuses on how to leverage these features for your backend API.

---

## 1. The Exception Handler

All exceptions thrown by your application are handled by the `app/Exceptions/Handler.php` class. This class contains two main methods:

-   **`register()`**: This is where you can register custom callbacks for reporting and rendering exceptions.
-   **`render()`**: Responsible for converting a given exception into an HTTP response.
-   **`report()`**: Responsible for sending the exception to an external logging service (e.g., Sentry, Bugsnag) or logging it internally.

### Customizing API Error Responses

Laravel's default exception handler automatically converts most exceptions into a JSON response with an appropriate HTTP status code for API requests. However, you might want to customize this behavior for specific exceptions.

```php
// app/Exceptions/Handler.php

use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class Handler extends ExceptionHandler
{
    /**
     * Register the exception handling callbacks for the application.
     */
    public function register(): void
    {
        $this->renderable(function (ModelNotFoundException $e, Request $request) {
            if ($request->is('api/*')) { // Only for API routes
                return response()->json([
                    'message' => 'Resource not found.'
                ], Response::HTTP_NOT_FOUND); // 404
            }
        });

        $this->renderable(function (AuthenticationException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'message' => 'Unauthenticated.'
                ], Response::HTTP_UNAUTHORIZED); // 401
            }
        });
        
        // For validation errors, Laravel handles this automatically, returning 422
        // However, you could customize it here if needed.
        $this->renderable(function (ValidationException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'message' => 'The given data was invalid.',
                    'errors' => $e->errors(),
                ], Response::HTTP_UNPROCESSABLE_ENTITY); // 422
            }
        });
    }
}
```

---

## 2. Logging

Laravel provides robust logging services built on top of the powerful Monolog library. You can log messages to various destinations (channels) like files, email, Slack, etc.

### Configuration (`config/logging.php`)

The `config/logging.php` file defines your application's log channels. The `stack` channel is typically used by default, sending messages to multiple other channels.

Common channels:
-   `single`: Writes to a single log file (`storage/logs/laravel.log`).
-   `daily`: Creates daily log files (`storage/logs/laravel-YYYY-MM-DD.log`).
-   `stack`: Sends log messages to multiple channels (e.g., daily files and Slack).

### Using the `Log` Facade

You can log messages at various levels using the `Log` facade:

```php
use Illuminate\Support\Facades\Log;

class SomeService
{
    public function processData(array $data)
    {
        Log::info('Data processing started', ['data' => $data]);

        try {
            // ... process data
        } catch (\Exception $e) {
            Log::error('Data processing failed', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            // Re-throw or handle the exception
        }

        Log::debug('Debug information: variable X is Y');
        Log::warning('Unusual activity detected for user ID: ' . $userId);
    }
}
```

### Contextual Data
You can pass an array of contextual data to the log methods, which will be formatted and displayed alongside the message.

---

## 3. HTTP Exceptions

Laravel provides a simple way to throw HTTP exceptions, which automatically trigger the appropriate HTTP response.

### `abort()`
You can use the `abort()` helper function to immediately terminate the request and throw an HTTP exception.

```php
use Illuminate\Http\Response;

class ItemController extends Controller
{
    public function show(string $id)
    {
        $item = Item::find($id);

        if (!$item) {
            abort(Response::HTTP_NOT_FOUND, 'Item not found.'); // Throws a 404
        }

        // ... return the item
    }
}
```

### `abort_if()` and `abort_unless()`
These helpers provide conditional aborting:

```php
// Throws 403 if the user is not authorized
abort_if(!auth()->user()->isAdmin(), Response::HTTP_FORBIDDEN, 'You are not authorized to view this.');

// Throws 404 unless the item exists
abort_unless($item, Response::HTTP_NOT_FOUND, 'The requested item does not exist.');
```

By effectively using the exception handler, logging, and HTTP exceptions, you can ensure your API responds predictably and provides valuable insights into its operation.