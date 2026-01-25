# 08 - Eloquent ORM and Models

Eloquent is Laravel's powerful and elegant Object-Relational Mapper (ORM). It uses the **Active Record** implementation, which means each database table has a corresponding "Model" in your application that is used to interact with that table. Eloquent makes database operations intuitive, expressive, and less error-prone.

---

## 1. Creating Models

You can create a new Eloquent model using the `make:model` Artisan command.

```bash
# Create a new Doctor model
php artisan make:model Doctor
```

By convention, this command will create a `Doctor` model in `app/Models/Doctor.php`, which will be associated with the `doctors` table in your database (the plural snake_case name of the model).

You can also generate a database migration at the same time:
```bash
php artisan make:model Patient --migration
# Or -m for short
```

## 2. Eloquent Model Conventions

Eloquent makes several assumptions to provide a fluid developer experience:

-   **Table Name**: The plural "snake_case" name of the model class. `Doctor` -> `doctors`.
-   **Primary Key**: A column named `id`.
-   **Timestamps**: Expects `created_at` and `updated_at` columns.

You can customize these by defining properties on your model:
```php
class Doctor extends Model
{
    /** The table associated with the model. */
    protected $table = 'my_doctors';

    /** The primary key for the model. */
    protected $primaryKey = 'doctor_id';

    /** Indicates if the model should be timestamped. */
    public $timestamps = false;
}
```

### Mass Assignment (`$fillable` & `$guarded`)

For security, Eloquent protects against mass-assignment vulnerabilities. You must explicitly define which attributes can be mass-assigned using the `$fillable` or `$guarded` properties.

-   `$fillable`: An array of attributes you **allow** to be mass-assigned. (Recommended)
-   `$guarded`: An array of attributes you want to **block** from being mass-assigned.

```php
class Doctor extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = ['name', 'specialty', 'is_on_vacation'];
}
```

---

## 3. Retrieving Data

Eloquent provides a beautiful, fluent interface for querying your database.

```php
// Get all doctors
$allDoctors = Doctor::all();

// Find a doctor by their primary key
$doctor = Doctor::find(1);

// Find a doctor or throw a 404 exception if not found
$doctor = Doctor::findOrFail(1);

// Build a query
$onVacation = Doctor::where('is_on_vacation', true)
                       ->orderBy('name', 'asc')
                       ->take(10)
                       ->get();
```

---

## 4. Inserting & Updating Data

### Creating Records
```php
// Using the create method (requires $fillable to be set)
$doctor = Doctor::create([
    'name' => 'Dr. Jane Doe',
    'specialty' => 'Cardiology',
]);
```

### Updating Records
```php
$doctor = Doctor::findOrFail(1);

// Update attributes
$doctor->is_on_vacation = true;

// Save the changes to the database
$doctor->save();

// You can also perform a mass update on a query
Doctor::where('id', 1)->update(['is_on_vacation' => false]);
```

---

## 5. Deleting Data

```php
$doctor = Doctor::findOrFail(1);
$doctor->delete();

// Or delete by primary key
Doctor::destroy(1);

// Or delete multiple records
Doctor::destroy([1, 2, 3]);
```

---

## 6. Eloquent Relationships

This is where Eloquent truly shines. You can define relationships between your models to easily query and access related data.

### One to Many (e.g., a Doctor has many Patients)
```php
// In app/Models/Doctor.php
public function patients()
{
    return $this->hasMany(Patient::class);
}

// In app/Models/Patient.php
public function doctor()
{
    return $this->belongsTo(Doctor::class);
}
```
Now you can access a doctor's patients like this: `$doctor = Doctor::find(1); $patients = $doctor->patients;`

### Many to Many (e.g., a Patient can have many Doctors through Appointments)
This requires a pivot table (e.g., `appointment_patient`).
```php
// In app/Models/Patient.php
public function doctors()
{
    return $this->belongsToMany(Doctor::class, 'appointments');
}

// In app/Models/Doctor.php
public function patients()
{
    return $this->belongsToMany(Patient::class, 'appointments');
}
```

---

## 7. Eager Loading (Solving the N+1 Problem)

When you access a relationship (e.g., `$doctor->patients`), Eloquent runs a separate query. If you loop through 25 doctors and access their patients, you'll run 26 queries (1 for doctors, 25 for patients). This is the "N+1 problem".

**Eager loading** solves this by loading the relationship data in advance with just two queries.

```php
// Instead of this (causes N+1):
$doctors = Doctor::all();
foreach ($doctors as $doctor) {
    echo $doctor->patients->count();
}

// Do this (Eager Loading):
$doctors = Doctor::with('patients')->get(); // Just 2 queries!
foreach ($doctors as $doctor) {
    echo $doctor->patients->count();
}
```
Always use eager loading when you know you will need to access relationship data.