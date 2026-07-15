<?php

namespace Database\Factories;

use App\Models\StaffRegistration;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<StaffRegistration>
 */
class StaffRegistrationFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password = null;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $firstName = fake()->firstName();
        $middleName = fake()->firstName();
        $lastName = fake()->lastName();
        
        $designation = fake()->randomElement(['Academic', 'Non-Teaching']);
        $title = $designation === 'Academic' ? fake()->randomElement(['Dr.', 'Prof.', 'Mr.', 'Mrs.', 'Dr. (Mrs.)']) : fake()->randomElement(['Mr.', 'Mrs.', 'Ms.']);
        $fullName = "{$title} {$firstName} {$middleName} {$lastName}";

        $initials = strtolower(substr($firstName, 0, 1) . substr($middleName, 0, 1));
        $surname = strtolower($lastName);
        $username = "{$initials}.{$surname}";

        // Clean username from non-alphanumeric chars except dots
        $username = preg_replace('/[^a-z.]/', '', $username);

        // Ensure username meets min length requirement or add characters
        if (strlen($username) < 4) {
            $username .= 's';
        }

        // Nigerian phone number matching pattern format e.g. 08031234567
        $phonePrefix = fake()->randomElement(['070', '080', '081', '090', '091']);
        $phoneSuffix = fake()->numerify('########');
        $phone = $phonePrefix . $phoneSuffix;

        $faculties = [
            'Faculty of Science',
            'Faculty of Arts',
            'Faculty of the Social Sciences',
            'Faculty of Technology',
            'Faculty of Clinical Sciences',
            'Faculty of Law',
            'Faculty of Education',
            'Faculty of Agriculture',
            'College of Medicine',
            'Registry Division',
            'Bursary Division',
            'University Library',
            'UI Health Services (Jaja Clinic)',
        ];

        $departments = [
            'Faculty of Science' => ['Computer Science', 'Physics', 'Chemistry', 'Mathematics', 'Statistics', 'Microbiology', 'Botany', 'Zoology', 'Geology'],
            'Faculty of Arts' => ['English', 'History', 'Linguistics', 'Theatre Arts', 'Philosophy', 'Religious Studies'],
            'Faculty of the Social Sciences' => ['Economics', 'Political Science', 'Sociology', 'Geography', 'Psychology'],
            'Faculty of Technology' => ['Mechanical Engineering', 'Electrical & Electronic Engineering', 'Civil Engineering', 'Petroleum Engineering', 'Agricultural & Environmental Engineering'],
            'Faculty of Clinical Sciences' => ['Medicine', 'Surgery', 'Paediatrics', 'Nursing Science', 'Physiotherapy'],
            'Faculty of Law' => ['Public Law', 'Private Law', 'Commercial Law'],
            'Faculty of Education' => ['Teacher Education', 'Guidance & Counselling', 'Educational Management', 'Adult Education'],
            'Faculty of Agriculture' => ['Agronomy', 'Agricultural Economics', 'Animal Science', 'Crop Protection'],
            'College of Medicine' => ['Anatomy', 'Physiology', 'Biochemistry', 'Pharmacology'],
            'Registry Division' => ['Academic Affairs', 'Council Affairs', 'Establishments (Academic)', 'Establishments (Non-Academic)'],
            'Bursary Division' => ['Finance & Accounts', 'Treasury', 'Payroll', 'Audit'],
            'University Library' => ['Cataloguing', 'Readers Services', 'Reference & Information', 'Technical Services'],
            'UI Health Services (Jaja Clinic)' => ['General Outpatient', 'Pharmacy', 'Laboratory Services', 'Nursing Unit'],
        ];

        $faculty = fake()->randomElement($faculties);
        $department = fake()->randomElement($departments[$faculty] ?? ['Registry']);

        return [
            'full_name' => $fullName,
            'staff_id' => 'UI/STF/' . fake()->unique()->numberBetween(1000, 99999),
            'designation' => $designation,
            'phone' => $phone,
            'faculty' => $faculty,
            'department' => $department,
            'username' => $username,
            'email' => "{$username}@ui.edu.ng",
            'password' => static::$password ??= Hash::make('password'),
            'salary_deduction_authorized' => true,
            'staff_id_file' => 'uploads/staff_ids/staff_' . Str::random(10) . '.jpg',
            'payslip_file' => 'uploads/payslips/payslip_' . Str::random(10) . '.pdf',
        ];
    }
}
