# 21 - Deployment

Deploying a Laravel application involves moving your code from your local development machine to a live server where users can access it. A proper deployment process is crucial for the stability, performance, and security of your application. This guide provides a general checklist for deploying your Laravel backend API.

---

## 1. Server Requirements

Before you deploy, ensure your server meets Laravel's requirements:
-   A web server (Nginx is recommended)
-   PHP (with required extensions like Ctype, cURL, DOM, Fileinfo, JSON, Mbstring, OpenSSL, PCRE, PDO, Tokenizer, XML)
-   A database (e.g., MySQL, PostgreSQL)
-   Composer
-   Git

---

## 2. Manual Deployment Checklist

This is a general step-by-step guide for a manual deployment. For a more robust and automated process, consider using tools like Laravel Forge or Envoyer.

### Step 1: Push Code to Repository
Ensure your latest stable code is pushed to a Git repository (like GitHub, GitLab, or Bitbucket).

### Step 2: Connect to Your Server
Connect to your server via SSH:
```bash
ssh user@your_server_ip
```

### Step 3: Clone the Repository
Clone your project's repository into the appropriate directory on your server (e.g., `/var/www/`).
```bash
git clone git@github.com:your-vendor/my-laravel-api.git /var/www/my-laravel-api
cd /var/www/my-laravel-api
```

### Step 4: Install Composer Dependencies
Install your application's dependencies. The `--optimize-autoloader` and `--no-dev` flags are highly recommended for production.
```bash
composer install --optimize-autoloader --no-dev
```

### Step 5: Configure Environment (`.env`)
Copy the example environment file and configure it for your production environment.
```bash
cp .env.example .env
```
Now, open the `.env` file (`nano .env`) and update the following critical variables:
-   `APP_ENV=production`
-   `APP_DEBUG=false`
-   `APP_URL=https://yourapi.com`
-   `DB_CONNECTION`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`
-   Any other service keys or credentials.

**Never use `APP_DEBUG=true` in production**, as it can expose sensitive information.

### Step 6: Generate Application Key
Generate a new, unique application key.
```bash
php artisan key:generate
```

### Step 7: Run Database Migrations
Run your database migrations to create the necessary tables. The `--force` flag is required to confirm that you want to run migrations in a production environment.
```bash
php artisan migrate --force
```

### Step 8: Run Optimization Commands
For a significant performance boost, cache your configuration, routes, and events.
```bash
php artisan config:cache
php artisan route:cache
php artisan event:cache
```
**Important**: If you make any changes to your configuration or routes, you must re-run these commands.

### Step 9: Set Folder Permissions
Ensure the web server has permission to write to the `storage` and `bootstrap/cache` directories.
```bash
sudo chown -R www-data:www-data storage
sudo chown -R www-data:www-data bootstrap/cache
sudo chmod -R 775 storage
sudo chmod -R 775 bootstrap/cache
```
*(Note: The user/group `www-data` might be different depending on your server configuration).*

### Step 10: Configure Web Server (Nginx Example)
Configure your Nginx server to point to your application's `public` directory.

**Example Nginx Server Block (`/etc/nginx/sites-available/my-laravel-api`):**
```nginx
server {
    listen 80;
    server_name yourapi.com;
    root /var/www/my-laravel-api/public;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    index index.php;

    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock; // Adjust PHP version
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```
Remember to enable the site and restart Nginx.

---

## 3. Queue Workers and Supervisor

If your application uses queues, you must configure a process monitor like **Supervisor** to keep your `php artisan queue:work` processes running permanently. Manually running the queue worker via SSH is not suitable for production.

---

## 4. Automated Deployment (Zero-Downtime)

Manual deployments are error-prone and cause downtime. For professional projects, use an automated deployment tool.

-   **Laravel Forge**: A service that provisions and manages your servers, making deployment as simple as pushing to a Git branch.
-   **Envoyer**: A zero-downtime deployment service for PHP applications. It works by creating a new release directory for each deployment and then atomically switching a symbolic link (`current`) to point to the new release once all steps are complete. This means your application is never offline during the deployment process.

These tools handle the entire checklist above automatically, reliably, and without downtime.