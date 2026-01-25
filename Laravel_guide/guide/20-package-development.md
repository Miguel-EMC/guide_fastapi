# 20 - Package Development

As your applications grow, you may find yourself writing similar code across multiple projects. Laravel's package development capabilities allow you to extract this reusable code into standalone packages. This promotes a modular architecture, reduces code duplication, and allows you to share your work with the open-source community.

This guide will walk you through the fundamental steps of creating a Laravel package.

---

## 1. Setting Up the Package

It's common practice to develop packages within a `packages` directory at the root of a standard Laravel application, allowing you to build the package in the context of a real application.

### Step 1: Create Directory Structure
```bash
mkdir -p packages/my-vendor/my-package/src
```
-   `packages`: A directory to hold all your local packages.
-   `my-vendor`: Your vendor name (e.g., your GitHub username).
-   `my-package`: The name of your package.
-   `src`: The source code of your package will live here.

### Step 2: Initialize Composer
Navigate to your package's root directory and initialize a `composer.json` file.

```bash
cd packages/my-vendor/my-package
composer init
```
Follow the interactive prompts. For the PSR-4 autoloading namespace, you should map your vendor and package name to the `src/` directory.

**Example `composer.json`:**
```json
{
    "name": "my-vendor/my-package",
    "description": "A brief description of my awesome package.",
    "type": "library",
    "license": "MIT",
    "authors": [
        {
            "name": "Your Name",
            "email": "your@email.com"
        }
    ],
    "require": {
        "php": "^8.2",
        "illuminate/support": "^10.0|^11.0"
    },
    "autoload": {
        "psr-4": {
            "MyVendor\MyPackage\": "src/"
        }
    },
    "extra": {
        "laravel": {
            "providers": [
                "MyVendor\MyPackage\MyPackageServiceProvider"
            ]
        }
    }
}
```
The `extra.laravel` section allows Laravel's package auto-discovery to automatically register your service provider.

---

## 2. The Service Provider

The service provider is the heart of your package. It's where you register configuration, routes, migrations, views, and bind services into the container.

Create a new file: `packages/my-vendor/my-package/src/MyPackageServiceProvider.php`.

```php
// packages/my-vendor/my-package/src/MyPackageServiceProvider.php

namespace MyVendor\MyPackage;

use Illuminate\Support\ServiceProvider;

class MyPackageServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Bind services, merge configuration, etc.
        $this->mergeConfigFrom(__DIR__.'/../config/my-package.php', 'my-package');
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Load routes, migrations, views, etc.
        $this->loadRoutesFrom(__DIR__.'/../routes/web.php');
        $this->loadMigrationsFrom(__DIR__.'/../database/migrations');

        if ($this->app->runningInConsole()) {
            $this->publishes([
                __DIR__.'/../config/my-package.php' => config_path('my-package.php'),
            ], 'config');
        }
    }
}
```

---

## 3. Loading Components from Your Package

### Configuration
-   Create a `config/my-package.php` file in your package directory.
-   In your service provider's `register` method, use `mergeConfigFrom()` to merge the package's config with the application's config.
-   In the `boot` method, use `publishes()` to allow users to publish your config file to their own `config` directory with `php artisan vendor:publish`.

### Routes
-   Create a `routes/web.php` or `routes/api.php` file in your package directory.
-   Use `loadRoutesFrom()` in your service provider's `boot` method to load them.

### Migrations
-   Create your migration files in a `database/migrations` directory within your package.
-   Use `loadMigrationsFrom()` in your service provider's `boot` method. Laravel will automatically run these migrations along with the application's migrations.

---

## 4. Local Development Workflow

To use your local package within a full Laravel application, you need to tell the application's Composer where to find it.

1.  **Modify the application's `composer.json`**: Add a `repositories` key to point to your local package's directory.

    ```json
    // In your main Laravel application's composer.json
    "repositories": [
        {
            "type": "path",
            "url": "packages/my-vendor/my-package"
        }
    ]
    ```

2.  **Require your package**: Now, from your main Laravel application's root, you can require your package using Composer.

    ```bash
    composer require my-vendor/my-package
    ```
    Composer will create a symbolic link in the `vendor` directory that points to your local package source code.

3.  **Develop**: Any changes you make in `packages/my-vendor/my-package/src` will be immediately reflected in your Laravel application, allowing for a smooth development workflow.

Once your package is complete, you can publish it to [Packagist](https://packagist.org/), the main Composer repository, making it available for anyone to use.
