# 01 - SOLID Principles

SOLID is a mnemonic acronym for five design principles intended to make software designs more understandable, flexible, and maintainable. These principles are language-agnostic and are fundamental to good object-oriented design.

---

## 1. S - Single Responsibility Principle (SRP)

> A class should have only one reason to change.

This means that a class or module should have one, and only one, job or responsibility. If a class handles multiple responsibilities (e.g., handling database connections, business logic, *and* data presentation), it becomes tightly coupled and difficult to maintain.

**Bad Example:**
```
class Report {
    getReportData() {
        // Connects to DB and fetches data
    }
    formatReportAsJSON() {
        // Formats the data into JSON
    }
    sendReportByEmail() {
        // Connects to an email server and sends the report
    }
}
```
This `Report` class has three responsibilities. A change in the database logic, JSON format, or email sending logic would all require changing this class.

**Good Example:**
```
class ReportRepository {
    getReportData() {
        // Only responsible for data access
    }
}

class ReportFormatter {
    formatToJSON(data) {
        // Only responsible for formatting
    }
}

class EmailService {
    send(report) {
        // Only responsible for sending emails
    }
}
```
Each class now has a single responsibility, making them easier to test, reuse, and maintain.

---

## 2. O - Open/Closed Principle (OCP)

> Software entities (classes, modules, functions, etc.) should be open for extension, but closed for modification.

This means you should be able to add new functionality to a class without changing its existing source code. This is typically achieved through interfaces, abstraction, and polymorphism.

**Bad Example:**
```
class PaymentProcessor {
    processCreditCardPayment(paymentDetails) { /* ... */ }
    processPayPalPayment(paymentDetails) { /* ... */ }
    // If we want to add Stripe, we must modify this class.
}
```

**Good Example:**
```
interface PaymentGateway {
    pay(paymentDetails);
}

class CreditCardGateway implements PaymentGateway {
    pay(paymentDetails) { /* ... */ }
}

class PayPalGateway implements PaymentGateway {
    pay(paymentDetails) { /* ... */ }
}

// To add Stripe, we just create a new class. No modification needed.
class StripeGateway implements PaymentGateway {
    pay(paymentDetails) { /* ... */ }
}

class PaymentProcessor {
    processPayment(gateway: PaymentGateway, paymentDetails) {
        gateway.pay(paymentDetails);
    }
}
```

---

## 3. L - Liskov Substitution Principle (LSP)

> Subtypes must be substitutable for their base types.

This means that if you have a class `Child` that inherits from a class `Parent`, you should be able to use an object of `Child` anywhere you would use an object of `Parent` without causing incorrect behavior. The child class should not change the behavior of the parent class in unexpected ways.

**Bad Example:**
```
class Rectangle {
    setWidth(width) { this.width = width; }
    setHeight(height) { this.height = height; }
    getArea() { return this.width * this.height; }
}

class Square extends Rectangle {
    // A square must have equal width and height, so we override the setters.
    setWidth(width) {
        this.width = width;
        this.height = width;
    }
    setHeight(height) {
        this.width = height;
        this.height = height;
    }
}

function test(rect: Rectangle) {
    rect.setWidth(5);
    rect.setHeight(4);
    // Expected area is 20, but if you pass a Square, the area will be 16!
    // This violates the LSP.
    console.log(rect.getArea());
}
```
A `Square` is not a substitutable subtype of `Rectangle` in this context because it changes the expected behavior.

---

## 4. I - Interface Segregation Principle (ISP)

> No client should be forced to depend on methods it does not use.

This means you should favor many small, client-specific interfaces over one large, general-purpose interface.

**Bad Example:**
```
interface Worker {
    work();
    eat();
    sleep();
}

class HumanWorker implements Worker {
    work() { /* ... */ }
    eat() { /* ... */ }
    sleep() { /* ... */ }
}

class RobotWorker implements Worker {
    work() { /* ... */ }
    eat() { /* This makes no sense for a robot */ }
    sleep() { /* This makes no sense for a robot */ }
}
```
`RobotWorker` is forced to implement `eat` and `sleep`, methods it doesn't need.

**Good Example:**
```
interface Workable {
    work();
}

interface Feedable {
    eat();
}

interface Restable {
    sleep();
}

class HumanWorker implements Workable, Feedable, Restable { /* ... */ }
class RobotWorker implements Workable { /* ... */ }
```
Now, clients depend only on the interfaces they need.

---

## 5. D - Dependency Inversion Principle (DIP)

> A. High-level modules should not depend on low-level modules. Both should depend on abstractions.
> B. Abstractions should not depend on details. Details should depend on abstractions.

This principle is about decoupling. Instead of a high-level class depending directly on a low-level class, it should depend on an interface. The low-level class then implements that interface.

**Bad Example:**
```
// Low-level module
class MySQLDatabase {
    query(sql) { /* ... */ }
}

// High-level module
class ReportGenerator {
    private db: MySQLDatabase; // Directly depends on a concrete class

    constructor() {
        this.db = new MySQLDatabase();
    }

    generate() {
        this.db.query("SELECT ...");
    }
}
```
`ReportGenerator` is tightly coupled to `MySQLDatabase`. You can't easily switch to PostgreSQL.

**Good Example:**
```
// Abstraction
interface Database {
    query(sql);
}

// Low-level module
class MySQLDatabase implements Database {
    query(sql) { /* ... */ }
}

// Low-level module
class PostgreSQLDatabase implements Database {
    query(sql) { /* ... */ }
}

// High-level module
class ReportGenerator {
    private db: Database; // Depends on the abstraction

    constructor(database: Database) { // The dependency is injected
        this.db = database;
    }

    generate() {
        this.db.query("SELECT ...");
    }
}
```
Now `ReportGenerator` depends on the `Database` interface, not a concrete implementation. This is often achieved using Dependency Injection.