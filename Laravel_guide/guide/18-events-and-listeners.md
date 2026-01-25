# 18 - Events and Listeners

Laravel's event and listener system provides a simple yet powerful implementation of the **Observer design pattern**. It allows you to fire an "event" when a specific action occurs in your application, and have one or more "listeners" react to that event without the different parts of the code being tightly coupled.

This is a fantastic way to decouple your application's concerns. For example, when a new user registers, instead of your `AuthController` being responsible for creating the user, sending a welcome email, and updating analytics, it can simply fire a `UserRegistered` event. Other parts of your application can then listen for this event and perform their respective actions.

---

## 1. How Events and Listeners Work

1.  **Event**: An event is a simple data object that holds information about what happened (e.g., which user registered).
2.  **Dispatch**: Your code "dispatches" or "fires" this event.
3.  **Listener**: A listener is a class that "listens" for a specific event. When it "hears" the event it's listening for, its `handle()` method is executed.

This means your `AuthController` doesn't need to know anything about sending emails or analytics. It only needs to know how to fire the `UserRegistered` event.

---

## 2. Generating Events and Listeners

You can generate new event and listener classes using Artisan commands:

```bash
# Create an event class
php artisan make:event OrderPlaced

# Create a listener for that event
php artisan make:listener SendOrderConfirmationEmail --event=OrderPlaced
```
This will create `app/Events/OrderPlaced.php` and `app/Listeners/SendOrderConfirmationEmail.php`.

---

## 3. Registering Events and Listeners

Laravel needs to know which listeners should handle which events. This mapping is defined in the `$listen` property of your `app/Providers/EventServiceProvider.php`.

```php
// app/Providers/EventServiceProvider.php

use App\Events\OrderPlaced;
use App\Listeners\SendOrderConfirmationEmail;
use App\Listeners\UpdateInventory;

class EventServiceProvider extends ServiceProvider
{
    /**
     * The event to listener mappings for the application.
     *
     * @var array
     */
    protected $listen = [
        OrderPlaced::class => [
            SendOrderConfirmationEmail::class,
            UpdateInventory::class,
            // You can add more listeners here
        ],
    ];

    // ...
}
```
In this example, when the `OrderPlaced` event is fired, both the `SendOrderConfirmationEmail` and `UpdateInventory` listeners will be executed.

---

## 4. Defining and Dispatching Events

An event class is a simple data container. You can define public properties or pass data through the constructor.

```php
// app/Events/OrderPlaced.php

use App\Models\Order;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OrderPlaced
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * The order instance.
     *
     * @var \App\Models\Order
     */
    public $order;

    /**
     * Create a new event instance.
     */
    public function __construct(Order $order)
    {
        $this->order = $order;
    }
}
```

You can dispatch the event from anywhere in your code using the `event()` helper or the `Event` facade.

```php
// In a controller, after successfully creating an order
use App\Events\OrderPlaced;

// ...
$order = Order::create([...]);

// Dispatch the event
event(new OrderPlaced($order));
// Or, OrderPlaced::dispatch($order);

return response()->json($order, 201);
```

---

## 5. Defining Listeners

A listener's `handle()` method receives the event instance it is listening for, allowing it to access the event's data.

```php
// app/Listeners/SendOrderConfirmationEmail.php

use App\Events\OrderPlaced;
use App\Mail\OrderConfirmationEmail; // Assuming you have a Mailable
use Illuminate\Support\Facades\Mail;

class SendOrderConfirmationEmail
{
    /**
     * Handle the event.
     */
    public function handle(OrderPlaced $event): void
    {
        // Access the order from the event
        $order = $event->order;

        // Send the confirmation email
        Mail::to($order->customer->email)->send(new OrderConfirmationEmail($order));
    }
}
```

---

## 6. Queued Event Listeners

Sometimes, a listener might perform a slow task, like sending an email. Running this task synchronously would slow down the user's request. To solve this, you can make your listeners **queued**.

Simply implement the `ShouldQueue` interface in your listener class. Laravel will automatically dispatch the listener to the queue worker instead of running it immediately.

```php
// app/Listeners/SendOrderConfirmationEmail.php

use App\Events\OrderPlaced;
use Illuminate\Contracts\Queue\ShouldQueue; // Import the interface
use Illuminate\Queue\InteractsWithQueue;

class SendOrderConfirmationEmail implements ShouldQueue // Implement it
{
    use InteractsWithQueue; // This trait is not required but provides useful methods

    /**
     * Handle the event.
     */
    public function handle(OrderPlaced $event): void
    {
        // This will now run in the background
        Mail::to($event->order->customer->email)->send(new OrderConfirmationEmail($event->order));
    }
}
```
This is an incredibly powerful way to improve your API's performance while keeping your code clean and decoupled.

---

## 7. Event Subscribers

If you have a class that needs to listen to multiple events, you can create an **Event Subscriber**. This keeps the event handling logic organized in a single class.

```bash
php artisan make:subscriber UserEventSubscriber
```
An event subscriber class has a `subscribe` method where you map events to their handler methods within the class. You then register the subscriber in your `EventServiceProvider`.

Events and listeners are a cornerstone of a well-architected Laravel application, promoting a clean, modular, and maintainable codebase.