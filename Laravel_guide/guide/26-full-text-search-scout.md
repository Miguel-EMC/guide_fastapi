# 26 - Full-Text Search with Laravel Scout

For many APIs, simple `WHERE column LIKE '%query%'` SQL queries are insufficient for providing a fast and relevant search experience. This is where **full-text search** comes in. Laravel provides an elegant solution for this with **Laravel Scout**.

---

## 1. What is Laravel Scout?

Laravel Scout is a driver-based solution for adding full-text search to your Eloquent models. It automatically keeps your database records in sync with a search engine, making your models easily searchable.

Instead of writing complex SQL full-text queries, you interact with a simple, fluent API provided by Scout.

### Scout Drivers

Scout supports various search drivers (search engines):
-   **Algolia**: A powerful, hosted search-as-a-service.
-   **Meilisearch**: A fast, open-source search engine that you can self-host.
-   **Database**: A simple driver that uses your database's built-in full-text capabilities (or basic `LIKE` statements if full-text isn't available/configured). Great for small projects or getting started.
-   **Collection**: For searching PHP collections.

For this guide, we'll use the **Database** driver for simplicity, but the API remains largely the same across drivers.

---

## 2. Installation and Configuration (Database Driver)

### Step 1: Install Scout

```bash
composer require laravel/scout
```

### Step 2: Publish Configuration

Publish Scout's configuration file:
```bash
php artisan vendor:publish --provider="Laravel\Scout\ScoutServiceProvider"
```
This creates `config/scout.php`.

### Step 3: Configure Database Driver

In your `.env` file, set the `SCOUT_DRIVER` to `database`:
```
# .env
SCOUT_DRIVER=database
```
And ensure your database connection is properly configured.

### Step 4: Create Search Indexes Table

If using the `database` driver, you need a table to store your search indexes.
```bash
php artisan vendor:publish --tag="scout-db-migrations"
php artisan migrate
```
This will create a `scout_search_data` table.

---

## 3. Making Models Searchable

To make an Eloquent model searchable, you just need to add the `Searchable` trait to the model.

```php
// app/Models/Doctor.php

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Laravel\Scout\Searchable; // Import the trait

class Doctor extends Model
{
    use HasFactory, Searchable; // Use the trait

    /**
     * Get the indexable data array for the model.
     *
     * @return array<string, mixed>
     */
    public function toSearchableArray(): array
    {
        // Define which attributes of the model should be indexed for searching.
        return [
            'name' => $this->name,
            'specialty' => $this->specialty,
            // You can also include related data, e.g.,
            // 'patients' => $this->patients->pluck('name')->implode(', '),
        ];
    }
}
```
The `toSearchableArray()` method defines the data that will be stored in your search index.

### Custom Index Name (Optional)
By default, Scout will use the model's table name as the search index name. You can customize this:

```php
// app/Models/Doctor.php
class Doctor extends Model
{
    use Searchable;

    public function searchableAs(): string
    {
        return 'doctors_index'; // Custom index name
    }
}
```

---

## 4. Indexing Data

### Initial Import
To populate your search index with existing data, use the `scout:import` Artisan command:

```bash
php artisan scout:import "App\Models\Doctor"
```

### Automatic Syncing
Once the `Searchable` trait is added to your model, Scout automatically keeps your search index in sync. Whenever you create, update, or delete a model instance, Scout will update the search index accordingly.

---

## 5. Searching

Once your models are searchable, you can use the `search()` method to query your data.

```php
// app/Http/Controllers/SearchController.php

use App\Models\Doctor;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class SearchController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $query = $request->input('q');

        if (!$query) {
            return response()->json(['message' => 'Please provide a search query.'], 400);
        }

        // Search for doctors by name or specialty
        $doctors = Doctor::search($query)->get();

        return response()->json($doctors);
    }
}
```
You would then map this controller to a route: `Route::get('/search/doctors', SearchController::class);`

### Pagination
You can paginate search results just like regular Eloquent queries:
```php
$doctors = Doctor::search('Cardiology')->paginate(10);
return response()->json($doctors);
```

### Advanced Searches
You can add `where` clauses to your search queries:
```php
$doctors = Doctor::search('Alice')
                 ->where('is_on_vacation', false)
                 ->orderBy('name', 'asc')
                 ->get();
```

---

## 6. Disabling Syncing

Sometimes, you may want to prevent a model from being synced to the search index.

-   **Temporarily for a batch**:
    ```php
    Doctor::withoutSyncingToSearch(function () {
        Doctor::find(1)->update(['name' => 'Dr. Temporarily Offline']);
    });
    ```
-   **Conditionally**: You can define a `shouldBeSearchable()` method on your model.

Laravel Scout makes integrating powerful search capabilities into your API both simple and highly effective.