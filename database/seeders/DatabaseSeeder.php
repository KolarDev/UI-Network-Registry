<?php

namespace Database\Seeders;

use App\Models\StaffRegistration;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Seed the default administrator account.
        //
        // Login accepts either the email or the username, and the User model
        // casts `password` to `hashed`, so the plain-text value below is stored
        // as a bcrypt hash. The `updateOrCreate` keeps this seeder idempotent,
        // so re-running it repairs a missing/renamed admin instead of failing
        // on the unique index.
        User::updateOrCreate(
            ['username' => 'admin'],
            [
                'email' => 'admin@ui.edu.ng',
                'password' => 'password',
            ],
        );

        $this->command?->info('Administrator ready: admin@ui.edu.ng (username: admin) / password');

        // Seed 25 fake staff registrations for testing UI pagination. Guarded so
        // re-running the seeder does not collide with the unique staff_id and
        // username indexes.
        if (StaffRegistration::query()->doesntExist()) {
            StaffRegistration::factory(25)->create();
            $this->command?->info('Seeded 25 sample staff registrations.');
        }
    }
}
