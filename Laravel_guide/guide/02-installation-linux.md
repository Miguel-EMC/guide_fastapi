# 02 - Installation on Linux (Ubuntu/Debian)

This guide provides step-by-step instructions for setting up a Laravel development environment on a Linux distribution based on Ubuntu or Debian. We will use the command line for all steps.

## Prerequisites

Before you begin, you will need:
-   A user with `sudo` privileges.
-   A command-line terminal.
-   Basic knowledge of shell commands.

---

## Step 1: Install PHP and Required Extensions

Laravel 11 (the current version as of this writing) requires PHP 8.2 or higher. We will install PHP 8.3 and some common extensions that Laravel uses.

1.  **Update your package list:**
    ```bash
    sudo apt-get update
    ```

2.  **Install PHP and extensions:**
    ```bash
    sudo apt-get install -y php8.3 php8.3-cli php8.3-fpm php8.3-mysql php8.3-pgsql php8.3-sqlite3 php8.3-mbstring php8.3-xml php8.3-curl php8.3-zip php8.3-bcmath
    ```
    This command installs the PHP engine, the command-line interface, and extensions for database connections, string manipulation, and more.

3.  **Verify the installation:**
    ```bash
    php --version
    # You should see output like: PHP 8.3.x ...
    ```

---

## Step 2: Install Composer

Composer is the dependency manager for PHP. Laravel uses it to manage all of its packages.

1.  **Download the installer:**
    ```bash
    curl -sS https://getcomposer.org/installer -o /tmp/composer-setup.php
    ```

2.  **Verify the installer's signature (Security Best Practice):**
    ```bash
    HASH=$(curl -sS https://composer.github.io/installer.sig)
    php -r "if (hash_file('SHA384', '/tmp/composer-setup.php') === '$HASH') { echo 'Installer verified'; } else { echo 'Installer corrupt'; unlink('/tmp/composer-setup.php'); } echo PHP_EOL;"
    ```

3.  **Install Composer globally:**
    ```bash
    sudo php /tmp/composer-setup.php --install-dir=/usr/local/bin --filename=composer
    ```
    This makes the `composer` command available system-wide.

4.  **Verify the installation:**
    ```bash
    composer --version
    # You should see output like: Composer version 2.x.x ...
    ```

---

## Step 3: (Optional) Install a Database Server

While Laravel can use SQLite for simple development, you will likely want a more robust database like PostgreSQL or MySQL.

### For PostgreSQL:
```bash
sudo apt-get install -y postgresql postgresql-contrib
# After installation, you'll need to create a user and database.
```

### For MySQL:
```bash
sudo apt-get install -y mysql-server
# After installation, run the secure installation script.
```

---

## Step 4: Create a New Laravel Project

Now that you have PHP and Composer, you can create a new Laravel project.

1.  **Navigate to your development directory:**
    ```bash
    cd /path/to/your/development/folder
    ```

2.  **Create the project:**
    ```bash
    composer create-project laravel/laravel my-laravel-api
    ```
    Composer will download Laravel and all its dependencies into a new folder named `my-laravel-api`.

---

## Step 5: Run the Development Server

1.  **Navigate into your new project directory:**
    ```bash
    cd my-laravel-api
    ```

2.  **Start the Artisan development server:**
    ```bash
    php artisan serve
    ```

3.  **You should see output like:**
    ```
      INFO  Server running on [http://127.0.0.1:8000].
    ```

You can now open your web browser and navigate to `http://127.0.0.1:8000`. You should see the default Laravel welcome page.

Your Laravel development environment on Linux is now ready! You can stop the server at any time by pressing `Ctrl+C` in the terminal.