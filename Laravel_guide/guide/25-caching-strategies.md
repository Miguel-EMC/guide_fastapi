# 25 - Caching Strategies

Caching is the process of storing the results of expensive operations and reusing them for subsequent requests. It's one of the most effective ways to improve your application's performance, reduce database load, and decrease API response times. Laravel provides an expressive, unified API for various caching backends.

---

## 1. Laravel's Cache Configuration

Laravel's cache configuration is located in `config/cache.php`. Here, you can define different cache "stores" and specify a default driver.

### Cache Drivers
-   `file`: Stores cached items in files under `storage/framework/cache/data`. Simple, but not fast enough for serious production use.
-   `database`: Stores cached items in a database table. Slower than in-memory caches.
-   **`redis`**: Uses a Redis in-memory database. Extremely fast and powerful. **Recommended for production.**
-   **`memcached`**: Another popular in-memory cache system. Also **recommended for production.**
-   `array`: A non-persistent cache for the current request, primarily used for automated tests.

You can set your default cache driver in your `.env` file:
```
# .env
CACHE_DRIVER=redis
```

---

## 2. Core Cache Usage (The `Cache` Facade)

Laravel's `Cache` facade provides a simple way to interact with the cache.

### Storing and Retrieving Items
-   **`Cache::put('key', 'value', $seconds)`**: Store an item for a specific duration.
    ```php
    // Store for 10 minutes (600 seconds)
    Cache::put('user:1:profile', $profileData, 600); 
    ```
-   **`Cache::get('key', 'default_value')`**: Retrieve an item.
    ```php
    $profile = Cache::get('user:1:profile');
    ```
-   **`Cache::has('key')`**: Check if an item exists.
-   **`Cache::forget('key')`**: Remove an item.

### The `remember` Pattern (Most Common)
The `Cache::remember()` method is the most common and convenient way to use caching. It will get an item from the cache, but if the item does not exist, it will execute a closure to retrieve the data, store it in the cache, and then return it.

```php
use App\Models\User;
use Illuminate\Support\Facades\Cache;

// This code will only hit the database the first time it's run.
// On subsequent calls within 10 minutes, it will return the cached data.
$user = Cache::remember('user:1', 600, function () {
    return User::findOrFail(1);
});
```

-   **`Cache::rememberForever('key', function() { ... })`**: Same as `remember` but stores the item indefinitely.

---

## 3. Practical Caching Patterns

### Query Caching
Cache the results of a complex and frequently run database query.

```php
$popularPosts = Cache::remember('posts:popular', 3600, function () { // Cache for 1 hour
    return Post::where('views', '>', 1000)
                ->orderBy('views', 'desc')
                ->take(10)
                ->get();
});
```

### Model Caching
Cache individual model instances that are frequently accessed.

```php
function getUser(int $userId) {
    return Cache::remember("user:{$userId}", 3600, function () use ($userId) {
        return User::findOrFail($userId);
    });
}
```

### Response Caching
For some endpoints that return static data, you can cache the entire HTTP response. While you can build this manually, packages like `spatie/laravel-responsecache` make it incredibly simple.

---

## 4. Cache Invalidation: The Hard Part

There are two main strategies for invalidating (deleting) a cache key when the underlying data changes.

### Strategy 1: Time-Based Expiration (TTL)
Simply set a Time-To-Live (TTL) on your cache keys, as seen in the examples above.
-   **Pros**: Very simple to implement.
-   **Cons**: Your application might serve stale data until the cache expires.

### Strategy 2: Event-Driven Invalidation
Explicitly clear the cache when the data changes. This is typically done using model observers or events.

```php
// app/Models/User.php
use Illuminate\Support\Facades\Cache;

class User extends Model
{
    // ...

    protected static function booted(): void
    {
        // After a user is updated or deleted, clear their specific cache.
        static::saved(function (User $user) {
            Cache::forget("user:{$user->id}");
        });

        static::deleted(function (User $user) {
            Cache::forget("user:{$user->id}");
        });
    }
}
```
-   **Pros**: Data is always fresh.
-   **Cons**: Adds more complexity to your application logic.

---

## 5. Cache Tags (For Complex Invalidation)

What if you have multiple cache keys related to a single entity? For example, `user:1:profile`, `user:1:posts`, `user:1:settings`. Invalidating them one by one is inefficient.

**Cache Tags** solve this. You can "tag" related cache items and then flush all items with a specific tag at once.

```php
// Storing tagged items
Cache::tags(['user:1', 'posts'])->put('user:1:posts', $posts, 600);
Cache::tags(['user:1', 'profile'])->put('user:1:profile', $profile, 600);

// Later, when the user's profile is updated...
// This will invalidate BOTH 'user:1:posts' and 'user:1:profile'
Cache::tags('user:1')->flush();
```
**Note**: Cache tags are not supported by the `file` or `database` cache drivers. You must use a driver like `redis` or `memcached`.

---

## Best Practices Summary
-   Use an in-memory cache like **Redis** or **Memcached** in production for best performance.
-   Cache the results of **expensive operations**: slow database queries, complex computations, or calls to external APIs.
-   Use the `Cache::remember()` helper for clean, concise code.
-   Have a clear **invalidation strategy** (either TTL or event-driven).
-   Use **cache tags** when you need to manage and invalidate groups of related cache entries.