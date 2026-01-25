# 19 - WebSockets with Laravel Reverb

Traditional HTTP requests are initiated by the client. But what if you want your server to push information to the client in real-time? This is where **WebSockets** come in. WebSockets provide a persistent, two-way communication channel between a client and a server, perfect for live notifications, chats, real-time dashboards, and more.

**Laravel Reverb** is a first-party, high-performance WebSocket server for Laravel applications, built with PHP. It offers a seamless, scalable, and easy-to-use solution for building real-time applications.

---

## 1. How Reverb and Broadcasting Work

1.  **Start Server**: You run the Reverb WebSocket server alongside your regular web server.
2.  **Client Connects**: A client (e.g., a JavaScript application) establishes a persistent WebSocket connection to the Reverb server.
3.  **Event Fired**: An event occurs in your Laravel application (e.g., an order is updated).
4.  **Broadcast**: Your application "broadcasts" this event. Instead of being handled by a regular listener, it's sent to a queue and then pushed to the Reverb server.
5.  **Push to Client**: The Reverb server pushes the event's data down the WebSocket connection to all authorized clients listening on that specific "channel".

---

## 2. Installation and Configuration

### Step 1: Install Reverb
First, add the Reverb Composer package to your project.
```bash
composer require laravel/reverb
```
Then, complete the installation using the `reverb:install` Artisan command:
```bash
php artisan reverb:install
```
This command will publish the Reverb configuration file (`config/reverb.php`) and update your `.env` file with the necessary variables (`REVERB_APP_ID`, `REVERB_APP_KEY`, `REVERB_SECRET`, etc.).

### Step 2: Uncomment BroadcastServiceProvider
Ensure the `BroadcastServiceProvider` is uncommented in your `config/app.php` file's `providers` array.

```php
// config/app.php
'providers' => [
    // ...
    App\Providers\BroadcastServiceProvider::class,
],
```

### Step 3: Set Broadcast Driver
In your `.env` file, ensure your broadcast driver is set to `reverb`:
```
# .env
BROADCAST_CONNECTION=reverb
```

---

## 3. Broadcasting Events

To broadcast an event, it must implement the `Illuminate\Contracts\Broadcasting\ShouldBroadcast` interface.

### Creating a Broadcastable Event
```bash
php artisan make:event OrderStatusUpdated
```
Now, modify the event class:

```php
// app/Events/OrderStatusUpdated.php

namespace App\Events;

use App\Models\Order;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OrderStatusUpdated implements ShouldBroadcast // Implement the interface
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     */
    public function __construct(
        public Order $order,
        public string $status
    ) {}

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        // Broadcast on a private channel named 'orders.{orderId}'
        // Only the user associated with this order can listen.
        return [
            new PrivateChannel('orders.' . $this->order->id),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'order.status.updated';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'order_id' => $this->order->id,
            'new_status' => $this->status,
        ];
    }
}
```

Now, whenever you dispatch this event (`OrderStatusUpdated::dispatch($order, 'shipped');`), it will be sent to the Reverb server.

---

## 4. Authorizing Channels

Public channels are open to anyone. Private and presence channels, however, require authorization. This is handled in `routes/channels.php`.

When a client tries to subscribe to a private channel, Laravel makes an HTTP request to your application to check if the user is authorized.

```php
// routes/channels.php

use Illuminate\Support\Facades\Broadcast;

// The {order} wildcard matches the wildcard in your PrivateChannel name.
Broadcast::channel('orders.{order}', function ($user, $orderId) {
    // Check if the authenticated user owns the order.
    // Replace with your actual logic.
    return $user->id === \App\Models\Order::find($orderId)->user_id;
});
```

---

## 5. Running the Reverb Server

To start the WebSocket server, run the `reverb:start` Artisan command:
```bash
php artisan reverb:start
```
This will start a server on the host and port defined in your `.env` file (defaults to `0.0.0.0:8080`).

---

## 6. Client-Side Integration with Laravel Echo

**Laravel Echo** is a JavaScript library that makes it painless to subscribe to channels and listen for events broadcast by Laravel.

### Installation
```bash
npm install --save-dev laravel-echo pusher-js
```
Note: We install `pusher-js` because Echo uses the Pusher protocol, which Reverb is fully compatible with.

### Listening for Events
In your JavaScript application, you would configure and use Echo like this:

```javascript
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

window.Echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: import.meta.env.VITE_REVERB_PORT,
    wssPort: import.meta.env.VITE_REVERB_PORT,
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
    enabledTransports: ['ws', 'wss'],
});

// Assuming the user is authenticated and you have the order ID
let orderId = 123; 

// Listen on the private channel
window.Echo.private(`orders.${orderId}`)
    .listen('.order.status.updated', (e) => {
        // e will contain the data from broadcastWith(): { order_id: 123, new_status: 'shipped' }
        console.log('Order status updated!', e);
        // Update your UI here...
    });
```
This setup provides a powerful foundation for building real-time, interactive features in your application.