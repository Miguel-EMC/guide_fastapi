# 03 - Installation on Windows

Setting up a PHP and Laravel development environment on Windows can be complex if done manually. The recommended approach is to use a pre-packaged, all-in-one tool that handles the installation and configuration of the web server, PHP, database, and other necessary tools.

For this guide, we will use **Laragon**, a powerful yet easy-to-use local development environment that is extremely popular in the Laravel community.

## Why Use Laragon?

-   **All-in-One**: Comes with Apache, Nginx, PHP, Composer, MySQL/MariaDB, Redis, and more.
-   **Portable & Isolated**: It doesn't mess with your system files. You can even install it on a USB drive.
-   **Easy Project Creation**: Create new Laravel projects with a single click.
-   **Automatic Virtual Hosts**: Laragon automatically creates "pretty" URLs for your projects (e.g., `my-api.test` instead of `localhost:8000`).

---

## Step 1: Download and Install Laragon

1.  **Go to the Laragon download page:** [https://laragon.org/download/](https://laragon.org/download/)
2.  **Download the "Full" edition**, which includes all the tools you'll need.
3.  **Run the installer.** You can keep the default options. It is recommended *not* to install it in `C:\Program Files` but to keep the default `C:\laragon`.
4.  Once the installation is complete, launch Laragon. You will see the main control panel.

---

## Step 2: Start the Services

In the Laragon control panel, click the **"Start All"** button. This will start the Apache web server and the MySQL database server.

You can verify that the services are running by opening a web browser and navigating to `http://localhost`. You should see the Laragon dashboard.

---

## Step 3: Create a New Laravel Project

Laragon gives you two easy ways to create a new Laravel project.

### Method A: Using the "Quick App" Feature (Recommended)

1.  Right-click anywhere on the Laragon control panel to open the menu.
2.  Navigate to **Quick App > Laravel**.
3.  A dialog box will appear asking for a project name. Enter a name like `my-laravel-api` and click OK.
4.  Laragon will automatically open a terminal and run the `composer create-project` command for you. Wait for it to finish.

### Method B: Using the Terminal

1.  On the Laragon control panel, click the **"Terminal"** button. This opens a pre-configured terminal window where `php` and `composer` are already available.
2.  Navigate to the `www` directory, which is Laragon's root for projects:
    ```bash
    cd C:\laragon\www
    ```
    *(Note: The terminal might already start in this directory)*.
3.  Run the Composer command to create the project:
    ```bash
    composer create-project laravel/laravel my-laravel-api
    ```

---

## Step 4: Access Your Project

This is where Laragon's magic shines. It automatically configures a virtual host for you. You do not need to use `php artisan serve`.

Simply open your web browser and navigate to the URL matching your project's name with a `.test` extension:

**`http://my-laravel-api.test`**

You should see the default Laravel welcome page.

Your Laravel development environment on Windows is now ready! All your project files are located in `C:\laragon\www\my-laravel-api`.