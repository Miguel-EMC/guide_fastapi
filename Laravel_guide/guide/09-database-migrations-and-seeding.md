# 09 - Database Migrations and Seeding

Laravel's database migrations and seeding features are crucial tools for managing your application's database schema and populating it with test data. Migrations provide a version control system for your database, allowing teams to easily collaborate on schema changes. Seeders help you quickly populate your database with dummy data for development, testing, or initial setup.

---

## 1. Database Migrations

Migrations are like version control for your database, allowing you to define and modify your database schema using PHP code. Each migration typically represents a set of changes to your database.

### Creating Migrations
You can create a new migration using the `make:migration` Artisan command:

```bash
php artisan make:migration create_flights_table
```

Laravel will place the new migration file in your `database/migrations` directory. The filename includes a timestamp, which Laravel uses to determine the order of migrations.

You can also use helpful flags:
-   `--create=table_name`: Generates a migration to create a new table.
    ```bash
    php artisan make:migration create_doctors_table --create=doctors
    ```
-   `--table=table_name`: Generates a migration to add columns to an existing table.
    ```bash
    php artisan make:migration add_is_on_vacation_to_doctors_table --table=doctors
    ```

### Migration Structure
A migration class typically contains two methods: `up()` and `down()`.

-   **`up()` method**: Used to add new tables, columns, or indexes to your database.
-   **`down()` method**: Used to reverse the operations performed by the `up()` method, essentially "rolling back" the changes.

```php
// database/migrations/YYYY_MM_DD_HHMMSS_create_doctors_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('doctors', function (Blueprint $table) {
            $table->id(); // Auto-incrementing primary key
            $table->string('name');
            $table->string('specialty');
            $table->boolean('is_on_vacation')->default(false);
            $table->timestamps(); // created_at and updated_at columns
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('doctors');
    }
};
```

### Schema Builder
The `Illuminate\Database\Schema\Blueprint` class provides a fluent way to define your table schema.

**Common Column Types:**
-   `$table->id()`: Auto-incrementing primary big integer.
-   `$table->string('column_name')`: VARCHAR equivalent.
-   `$table->text('column_name')`: TEXT equivalent.
-   `$table->integer('column_name')`: INT equivalent.
-   `$table->boolean('column_name')`: BOOLEAN equivalent.
-   `$table->timestamp('column_name')`: DATETIME equivalent.
-   `$table->foreignId('user_id')->constrained()`: Creates a foreign key to the `id` column on the `users` table.

**Column Modifiers:**
-   `->nullable()`: Allows NULL values.
-   `->default('value')`: Sets a default value.
-   `->unique()`: Creates a unique constraint.

### Running Migrations
-   **`php artisan migrate`**: Runs all pending migrations.
-   **`php artisan migrate:rollback`**: Rolls back the last batch of migrations.
-   **`php artisan migrate:fresh`**: Drops all tables from the database, then runs all migrations. (Useful for development).
-   **`php artisan migrate:refresh`**: Rolls back all migrations and then runs them again. (Useful for development).

---

## 2. Database Seeding

Database seeders allow you to populate your database with dummy data for development or testing purposes.

### Creating Seeders
```bash
php artisan make:seeder DoctorSeeder
```
This creates a `DoctorSeeder.php` file in your `database/seeders` directory.

### Writing Seeders
A seeder class contains a `run()` method where you can insert data into your database.

```php
// database/seeders/DoctorSeeder.php

use App\Models\Doctor;
use Illuminate\Database\Seeder;

class DoctorSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Doctor::create([
            'name' => 'Dr. Alice Smith',
            'specialty' => 'Pediatrics',
            'is_on_vacation' => false,
        ]);

        Doctor::create([
            'name' => 'Dr. Bob Johnson',
            'specialty' => 'Neurology',
            'is_on_vacation' => true,
        ]);
    }
}
```

### Running Seeders
To run your seeders, you typically call them from the main `DatabaseSeeder` class.

```php
// database/seeders/DatabaseSeeder.php

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            DoctorSeeder::class,
            // Other seeders here
        ]);
    }
}
```

Then, you can run all seeders using:
```bash
php artisan db:seed
```
If you want to run migrations and then seed the database from scratch:
```bash
php artisan migrate:fresh --seed
```

---

## 3. Model Factories

For generating large amounts of realistic-looking fake data, Laravel's Model Factories are invaluable.

```php
// database/factories/DoctorFactory.php (generated with make:model Doctor -f)

use App\Models\Doctor;
use Illuminate\Database\Eloquent\Factories\Factory;

class DoctorFactory extends Factory
{
    /** The name of the factory's corresponding model. */
    protected $model = Doctor::class;

    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'name' => $this->faker->name,
            'specialty' => $this->faker->randomElement(['Cardiology', 'Pediatrics', 'Neurology', 'Dermatology']),
            'is_on_vacation' => $this->faker->boolean,
        ];
    }
}
```

You can then use factories within your seeders:

```php
// database/seeders/DoctorSeeder.php

use App\Models\Doctor;
use Illuminate\Database\Seeder;

class DoctorSeeder extends Seeder
{
    public function run(): void
    {
        Doctor::factory()->count(10)->create(); // Creates 10 fake doctors
    }
}
```
Migrations and seeders are fundamental for maintaining a healthy and consistent database during the development lifecycle.