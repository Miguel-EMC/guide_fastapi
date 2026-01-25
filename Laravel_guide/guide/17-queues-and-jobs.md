# 17 - Queues and Jobs

When a user makes an HTTP request to your API, they expect a fast response. However, some tasks, like sending an email, processing an uploaded image, or generating a report, can be slow. Performing these tasks during the request-response cycle can lead to long wait times and a poor user experience.

Laravel's **Queue** system allows you to offload these time-consuming tasks to a background process. You can wrap these tasks in **Jobs** and "dispatch" them to a queue, allowing your API to respond instantly while the job runs in the background.

---

## 1. How Queues Work

1.  **Dispatch**: Your application dispatches a job to a queue. The job's data is serialized and stored in a "queue" (e.g., a database table, a Redis list).
2.  **Immediate Response**: Your application immediately continues its execution and sends a response to the user without waiting for the job to complete.
3.  **Work**: A separate "queue worker" process constantly listens for new jobs on the queue. When it finds one, it picks it up and executes it.

---

## 2. Configuration and Drivers

Laravel supports several queue drivers, configured in `config/queue.php`.

-   `sync` (default): This driver executes jobs immediately in the foreground. It's useful for local development and testing but doesn't provide any performance benefit.
-   `database`: Stores jobs in a database table. It's a simple way to get started with queues.
-   `redis`: Uses a Redis server to queue jobs. It's a very popular, high-performance option for production.
-   `sqs`: Uses Amazon's Simple Queue Service.

### Setting up the `database` Driver

Let's configure the `database` driver as a starting point.

1.  **Generate the migration** for the `jobs` and `failed_jobs` tables:
    ```bash
    php artisan queue:table
    php artisan queue:failed-table
    php artisan migrate
    ```

2.  **Set the queue connection** in your `.env` file:
    ```
    # .env
    QUEUE_CONNECTION=database
    ```

---

## 3. Creating Jobs

You can generate a new job class using the Artisan command:
```bash
php artisan make:job SendWelcomeEmail
```
This will create a new file in `app/Jobs/SendWelcomeEmail.php`.

The main logic of the job goes into the `handle()` method. You can type-hint dependencies, and Laravel's service container will automatically inject them.

```php
// app/Jobs/SendWelcomeEmail.php

namespace App\Jobs;

use App\Models\User;
use App\Mail\WelcomeEmail; // Assuming you have a Mailable class
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;

class SendWelcomeEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The user instance.
     */
    public $user;

    /**
     * Create a new job instance.
     */
    public function __construct(User $user)
    {
        $this->user = $user;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        // The logic to send the email
        Mail::to($this->user->email)->send(new WelcomeEmail($this->user));
    }
}
```
Notice the `ShouldQueue` interface. This tells Laravel that the job should be pushed to the queue instead of being executed synchronously.

---

## 4. Dispatching Jobs

You can dispatch a job from anywhere in your application, typically from a controller or service after a relevant event occurs (like user registration).

```php
// app/Http/Controllers/Api/AuthController.php

use App\Jobs\SendWelcomeEmail;
use App\Models\User;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        // ... validation and user creation logic ...
        $user = User::create([...]);

        // Dispatch the job to the queue
        SendWelcomeEmail::dispatch($user);

        return response()->json(['message' => 'User registered successfully'], 201);
    }
}
```

### Delaying Jobs
You can delay the execution of a job:
```php
// Delay the job for 10 minutes
SendWelcomeEmail::dispatch($user)->delay(now()->addMinutes(10));
```

### Dispatching to a Specific Queue
You can dispatch jobs to different queues to prioritize them:
```php
// Dispatch to a high-priority 'emails' queue
SendWelcomeEmail::dispatch($user)->onQueue('emails');
```

---

## 5. Running the Queue Worker

To process the jobs in your queue, you need to run a queue worker.

```bash
php artisan queue:work
```
This command will start a long-running process that will continuously check the queue for new jobs and execute them.

**Useful Worker Options:**
-   `--queue=emails,notifications`: Process specific queues.
-   `--tries=3`: Attempt a job 3 times before marking it as failed.
-   `--timeout=60`: Kill a job if it runs for more than 60 seconds.

---

## 6. Supervisor for Production

In a production environment, the `php artisan queue:work` process could stop for various reasons. You need a process monitor to ensure it's always running. **Supervisor** is a popular and robust process monitor for Linux.

Configuring Supervisor is a server administration task, but essentially, you tell it to run `php artisan queue:work` and to automatically restart it if it fails.

---

## 7. Handling Failed Jobs

When a job fails all of its attempts, it is inserted into the `failed_jobs` database table. You can view, retry, or delete failed jobs using Artisan commands:

-   **`php artisan queue:failed`**: List all failed jobs.
-   **`php artisan queue:retry <uuid>`**: Retry a specific failed job.
-   **`php artisan queue:retry-all`**: Retry all failed jobs.
-   **`php artisan queue:flush`**: Delete all failed jobs.

Queues are an essential part of building high-performance, scalable Laravel applications. They ensure your API can provide a fast user experience while handling complex and time-consuming background tasks.