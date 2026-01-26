# 02 - Design Patterns Overview

Design patterns are typical, reusable solutions to commonly occurring problems within a given context in software design. They are not finished designs that can be transformed directly into code, but rather templates for how to solve a problem. This guide provides a brief overview of some of the most common and useful patterns for backend development, categorized by their intent.

---

## 1. Creational Patterns

Creational patterns provide various object creation mechanisms, which increase flexibility and reuse of existing code.

### A. Singleton

**Intent**: Ensures that a class has only one instance and provides a global point of access to it.

-   **Use Case**: Useful for objects that need to be shared across an entire application, such as a database connection pool, a logger, or a configuration manager.
-   **Example**: Many Service Containers (like Laravel's) can bind a class as a "singleton". When you first ask for the object, the container creates it. On all subsequent requests for that object, the container returns the exact same instance.

```
// Pseudocode
class Database {
    private static instance;
    private constructor() { /* connect to db */ }

    public static getInstance() {
        if (this.instance == null) {
            this.instance = new Database();
        }
        return this.instance;
    }
}

// Usage
db1 = Database.getInstance();
db2 = Database.getInstance();
// db1 and db2 are the exact same object.
```

### B. Factory Method

**Intent**: Provides an interface for creating objects in a superclass, but allows subclasses to alter the type of objects that will be created.

-   **Use Case**: Useful when you have a system that needs to create different types of objects, but you want to decouple the client code from the specific classes being instantiated. For example, a notification system that can send notifications via email, SMS, or push notification.
-   **Example**: You have a `NotificationService` that needs to create a "sender" object.

```
// Pseudocode
interface Notifier {
    send(message);
}

class EmailNotifier implements Notifier { /* ... */ }
class SMSNotifier implements Notifier { /* ... */ }

// The Factory
class NotifierFactory {
    public static createNotifier(type) {
        if (type == 'email') return new EmailNotifier();
        if (type == 'sms') return new SMSNotifier();
    }
}

// Usage
notifier = NotifierFactory.createNotifier('sms');
notifier.send("Hello!");
```

---

## 2. Structural Patterns

Structural patterns explain how to assemble objects and classes into larger structures, while keeping these structures flexible and efficient.

### A. Adapter

**Intent**: Allows objects with incompatible interfaces to collaborate.

-   **Use Case**: Imagine you have an application that works with a `NewPaymentGateway` interface, but you need to integrate an old, third-party payment library that has a different method structure. You create an "adapter" class that wraps the old library and implements the interface your application expects.
-   **Example**: Your app expects a `charge(amount)` method, but the old library has a `processTransaction(value)` method.

```
// Pseudocode
interface NewPaymentGateway {
    charge(amount);
}

class OldPaymentLibrary {
    processTransaction(value) { /* ... */ }
}

class PaymentAdapter implements NewPaymentGateway {
    private oldLibrary: OldPaymentLibrary;
    constructor(library) { this.oldLibrary = library; }

    charge(amount) {
        // The adapter translates the new method call to the old one.
        return this.oldLibrary.processTransaction(amount);
    }
}

// Usage
gateway = new PaymentAdapter(new OldPaymentLibrary());
gateway.charge(100);
```

### B. Decorator

**Intent**: Lets you attach new behaviors to objects by placing them inside special wrapper objects that contain the behaviors.

-   **Use Case**: Useful for adding responsibilities to objects dynamically without affecting other objects. For example, adding logging or caching to a data service.
-   **Example**: You have a simple `DataService` and you want to add caching to it without modifying the service itself.

```
// Pseudocode
interface DataService {
    fetchData(id);
}

class SimpleDataService implements DataService {
    fetchData(id) { /* fetches from database */ }
}

class CachingDataServiceDecorator implements DataService {
    private wrappedService: DataService;
    private cache: Cache;

    constructor(service) { this.wrappedService = service; }

    fetchData(id) {
        if (this.cache.has(id)) {
            return this.cache.get(id);
        }
        result = this.wrappedService.fetchData(id);
        this.cache.set(id, result);
        return result;
    }
}

// Usage
realService = new SimpleDataService();
cachedService = new CachingDataServiceDecorator(realService);
// Now, calls to cachedService.fetchData(1) will be cached.
```
This is often implemented using Middleware in web frameworks.

---

## 3. Behavioral Patterns

Behavioral patterns are concerned with algorithms and the assignment of responsibilities between objects.

### A. Observer

**Intent**: Defines a subscription mechanism to notify multiple objects about any events that happen to the object they're observing.

-   **Use Case**: Used when a change in one object requires changing others, but you don't want to couple the objects. The object that changes state (the "subject") notifies its dependents (the "observers").
-   **Example**: Laravel's Event/Listener system is a perfect implementation of this pattern. When a `UserRegistered` event is dispatched (by the subject), all registered listeners (the observers, like `SendWelcomeEmail` and `CreateUserProfile`) are notified and execute their logic.

### B. Strategy

**Intent**: Lets you define a family of algorithms, put each of them into a separate class, and make their objects interchangeable.

-   **Use Case**: Useful when you have multiple ways to perform a task, and you want to be able to switch between them at runtime. For example, a report generator that can export the report in different formats (PDF, CSV, XML).
-   **Example**:

```
// Pseudocode
interface ExportStrategy {
    export(data);
}

class PDFExportStrategy implements ExportStrategy {
    export(data) { /* logic to create a PDF */ }
}

class CSVExportStrategy implements ExportStrategy {
    export(data) { /* logic to create a CSV */ }
}

class Report {
    private exportStrategy: ExportStrategy;

    setExportStrategy(strategy) {
        this.exportStrategy = strategy;
    }

    generate(data) {
        // ... generate report data
        return this.exportStrategy.export(data);
    }
}

// Usage
report = new Report();
report.setExportStrategy(new PDFExportStrategy());
report.generate(myData); // Exports as PDF

report.setExportStrategy(new CSVExportStrategy());
report.generate(myData); // Exports as CSV
```
Understanding these fundamental patterns will help you write more flexible, scalable, and maintainable backend applications, regardless of the specific language or framework you use.