# 16 - Testing with Pest and PHPUnit

Automated testing is a cornerstone of professional software development. It ensures your application works as expected, prevents regressions when you refactor or add new features, and gives you confidence in your codebase. Laravel is built with testing in mind and provides powerful tools for writing both **Unit** and **Feature** tests.

-   **Unit Tests**: Focus on a very small, isolated portion of your code, such as a single method within a model or service.
-   **Feature Tests**: Test a larger portion of your code, such as a full HTTP request to an API endpoint.

---

## 1. Setup and Environment

Laravel uses **PHPUnit** as its default testing framework. The configuration is in the `phpunit.xml` file at the root of your project.

When you run your tests, Laravel automatically configures a separate testing environment. It's common practice to create a `.env.testing` file to override your `.env` settings for tests, for example, to use an in-memory SQLite database.

**Example `.env.testing` for SQLite in-memory:**
```
DB_CONNECTION=sqlite
DB_DATABASE=:memory:
```

### Running Tests
To run all tests, use the `test` Artisan command:
```bash
php artisan test
```

---

## 2. Feature Tests (Testing API Endpoints)

Feature tests are where you'll spend most of your time when testing a backend API. You can simulate HTTP requests to your endpoints and assert that you receive the correct responses.

### Creating a Test
```bash
php artisan make:test Feature/PostApiTest
```

### The `RefreshDatabase` Trait
To ensure your tests are isolated and repeatable, use the `RefreshDatabase` trait. This trait will migrate your database before each test and wrap it in a transaction, rolling back all changes after the test completes.

```php
// tests/Feature/PostApiTest.php
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;

class PostApiTest extends TestCase
{
    use RefreshDatabase; // Essential for database testing

    // ... your tests
}
```

### Example: Testing the "Get All Posts" Endpoint

```php
// tests/Feature/PostApiTest.php
use App\Models\Post;

// ... inside PostApiTest class

/** @test */
public function it_can_retrieve_a_list_of_posts(): void
{
    // 1. Arrange: Set up the test data
    Post::factory()->count(3)->create();

    // 2. Act: Make a request to the endpoint
    $response = $this->getJson('/api/posts');

    // 3. Assert: Check the response
    $response->assertStatus(200)
             ->assertJsonCount(3)
             ->assertJsonStructure([
                 '*' => [ // Asserts the structure for each item in the collection
                     'id',
                     'title',
                     'content',
                     'created_at',
                     'updated_at',
                 ]
             ]);
}
```

### Example: Testing Post Creation with Authentication

```php
// tests/Feature/PostApiTest.php
use App\Models\User;

// ... inside PostApiTest class

/** @test */
public function an_authenticated_user_can_create_a_post(): void
{
    // Arrange: Create a user
    $user = User::factory()->create();

    // Act: Make a request, acting as the authenticated user
    $response = $this->actingAs($user, 'sanctum') // Authenticate using Sanctum guard
                     ->postJson('/api/posts', [
                         'title' => 'My First Post',
                         'content' => 'This is the content.',
                     ]);

    // Assert: Check the response and database
    $response->assertStatus(201) // Assert "Created" status
             ->assertJsonFragment(['title' => 'My First Post']);
    
    $this->assertDatabaseHas('posts', [
        'title' => 'My First Post',
    ]);
}
```

**Common API Assertions:**
-   `assertStatus($code)`: Assert the HTTP status code.
-   `assertJson(array $data)`: Assert that the JSON response contains the given data.
-   `assertJsonFragment(array $data)`: Assert the response contains the given fragment of data.
-   `assertJsonStructure(array $structure)`: Assert the JSON response has a specific structure.
-   `assertJsonCount($count)`: Assert the root JSON array has a certain number of items.

---

## 3. Unit Tests

Unit tests focus on smaller pieces of logic.

### Creating a Unit Test
```bash
php artisan make:test Unit/PostTest --unit
```

### Example: Testing a Model Method
Imagine your `Post` model has a method `isEdited()`.

```php
// tests/Unit/PostTest.php
use App\Models\Post;

// ... inside PostTest class

/** @test */
public function it_can_determine_if_it_was_edited(): void
{
    // Arrange
    $post = Post::factory()->make([
        'created_at' => now()->subMinute(),
        'updated_at' => now(),
    ]);

    $uneditedPost = Post::factory()->make([
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    // Act & Assert
    $this->assertTrue($post->isEdited());
    $this->assertFalse($uneditedPost->isEdited());
}
```

---

## 4. Pest: A Modern Alternative

Pest is a testing framework built on top of PHPUnit that focuses on a more elegant and expressive syntax. Laravel now supports Pest out of the box.

### Installing Pest
```bash
composer require pestphp/pest --dev --with-all-dependencies
php artisan pest:install
```

### Pest Syntax Example
Here's the previous feature test, rewritten in Pest:

```php
// tests/Feature/PostApiTest.php

use App\Models\Post;
use App\Models\User;
use function Pest\Laravel\{getJson, postJson};

test('it can retrieve a list of posts', function () {
    Post::factory()->count(3)->create();

    getJson('/api/posts')
        ->assertStatus(200)
        ->assertJsonCount(3);
});

test('an authenticated user can create a post', function () {
    $user = User::factory()->create();

    actingAs($user, 'sanctum')
        ->postJson('/api/posts', [
            'title' => 'My Pest Post',
            'content' => 'This is content from Pest.',
        ])
        ->assertStatus(201)
        ->assertJsonFragment(['title' => 'My Pest Post']);
    
    $this->assertDatabaseHas('posts', ['title' => 'My Pest Post']);
});
```

Pest often leads to more readable tests and is becoming the preferred choice for many Laravel developers.

Testing is a deep topic, but mastering these fundamentals will dramatically improve the quality and reliability of your API.