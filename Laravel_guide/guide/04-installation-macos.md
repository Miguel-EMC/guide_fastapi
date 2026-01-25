# 04 - Installation on macOS

For macOS, the most efficient and modern way to set up a Laravel development environment is by using **Homebrew** for installing PHP and **Laravel Herd** for managing your local server environment.

-   **Homebrew**: The de-facto package manager for macOS.
-   **Laravel Herd**: An official, super-fast, all-in-one Laravel development environment provided by the Laravel team. It handles Nginx, PHP, and DnsMasq to give you a zero-configuration setup.

---

## Step 1: Install Homebrew

If you don't already have Homebrew installed, open your terminal and run the following command:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
Follow the on-screen instructions to complete the installation.

---

## Step 2: Install and Set Up Laravel Herd

Herd provides a complete development environment in a single, easy-to-manage application.

1.  **Download Herd:** Go to the official website: [https://herd.laravel.com/](https://herd.laravel.com/)
2.  **Install the application:** Download the `.dmg` file and drag the Herd application into your `Applications` folder.
3.  **Launch Herd:** Start the application. Herd will automatically detect any existing PHP installations and manage them for you. It uses a static Nginx server and DnsMasq to route `.test` domains to your local machine.

By default, Herd uses the latest stable version of PHP. You can easily switch between different PHP versions from the Herd menu bar icon if needed.

---

## Step 3: Verify Composer

Laravel Herd automatically makes Composer available globally. You can verify this by opening your terminal and running:

```bash
composer --version
# You should see Composer's version information.
```

---

## Step 4: Create a New Laravel Project

Herd makes project creation incredibly simple.

1.  **Open Herd's settings** from the menu bar icon and find the "Paths" tab. You will see a list of folders that Herd monitors. By default, `~/Herd` is one of them.
2.  **Navigate to a Herd-monitored directory** in your terminal.
    ```bash
    cd ~/Herd
    ```
3.  **Create a new Laravel project using Composer:**
    ```bash
    composer create-project laravel/laravel my-laravel-api
    ```
    Composer will create the `my-laravel-api` directory and install all the necessary dependencies.

---

## Step 5: Access Your Project

Similar to Laragon on Windows, Herd automatically creates a local `.test` domain for any project folder within its monitored paths. You do not need to use `php artisan serve`.

1.  **Secure the site (Optional but Recommended):** In your terminal, while inside the project directory, run:
    ```bash
    herd secure
    ```
    This will generate a TLS certificate for your local site, allowing you to access it over HTTPS.

2.  **Open your browser** and navigate to the URL:
    
    **`http://my-laravel-api.test`** 
    
    or if you secured it:
    
    **`https://my-laravel-api.test`**

You should see the default Laravel welcome page. Your development environment on macOS is now fully configured.