# 05 - Laravel Project Structure

Understanding the project structure is fundamental to working efficiently with any framework. Laravel provides a well-organized and intuitive directory structure that helps in separating concerns and keeping your codebase clean and maintainable. This guide will walk you through the most important directories and files, focusing on their relevance for backend API development.

---

## High-Level Overview

A fresh Laravel installation comes with a set of directories, each serving a specific purpose:

```
.
├── app/                  # Contains the core application logic (models, controllers, etc.)
├── bootstrap/            # Framework bootstrap scripts
├── config/               # All application configuration files
├── database/             # Database migrations, seeders, and factories
├── public/               # The web server's document root (entry point)
├── routes/               # All application route definitions
├── storage/              # Logs, cache, compiled templates, user-uploaded files
├── tests/                # Automated tests (unit and feature)
├── vendor/               # Composer dependencies
├── .env                  # Environment configuration file
├── artisan               # Laravel's command-line interface
├── composer.json         # Composer project dependencies
└── composer.lock         # Composer lock file
```

---

## Key Directories for Backend Development

Let's dive into the directories you'll interact with most when building a backend API.

### `app/`

This directory holds the core of your application. Most of your API's business logic will live here.

-   **`app/Http/`**:
    -   **`Controllers/`**: Contains your API controllers, which handle incoming requests and return responses.
    -   **`Middleware/`**: Houses HTTP middleware, which can filter or inspect incoming requests before they reach your controllers.
    -   **`Requests/`**: Contains form request classes for encapsulating validation logic and authorization.
    -   `app/Http/Kernel.php`: The central HTTP kernel that defines global middleware and route middleware groups.
-   **`app/Models/`**: Your Eloquent ORM models, representing your database tables and handling database interactions.
-   **`app/Providers/`**: Service providers, which are the central place for bootstrapping your application by binding services into the Laravel service container.

### `config/`

This directory contains all of your application's configuration files. Each file typically corresponds to a specific component or service (e.g., `app.php`, `database.php`, `auth.php`, `services.php`).

You'll often adjust these files to configure database connections, authentication guards, external service credentials, and more.

### `database/`

Manages your database schema and initial data.

-   **`migrations/`**: Contains the database migrations that act as version control for your database schema.
-   **`seeders/`**: Houses seed classes for populating your database with dummy data (useful for development and testing).
-   **`factories/`**: Contains model factories for generating large amounts of fake data programmatically.

### `public/`

This is the "web root" of your application. The `index.php` file in this directory is the single entry point for all web requests. When building an API, you typically won't place any assets here directly, as your API serves data, not static files.

### `routes/`

This directory contains all of your application's route definitions.

-   **`api.php`**: This is where you will define *all* your API endpoints. Routes defined here are automatically prefixed with `/api` and are stateless, typically using token-based authentication.
-   `web.php`: For web-based routes (HTML responses, sessions, cookies). Less relevant for a pure backend API.

### `storage/`

Holds various files not directly served by the web server, such as:

-   **`logs/`**: Application log files.
-   **`app/`**: Application-specific files like user uploads.
-   `framework/`: Caches, sessions, compiled views.

### `tests/`

Contains your automated tests.

-   **`Feature/`**: Tests that cover a small portion of your application, including HTTP requests and interactions with your database.
-   **`Unit/`**: Tests that focus on isolated units of code.

### `vendor/`

This directory holds all your Composer dependencies. You should never modify files in this directory directly.

---

## The Artisan CLI

Laravel's command-line interface, `artisan`, is an invaluable tool that lives at the root of your project. It helps you manage your application's structure by generating controllers, models, migrations, middleware, and much more.

```bash
php artisan list
```
This command will show you a list of all available Artisan commands. Using Artisan extensively will streamline your backend development workflow.