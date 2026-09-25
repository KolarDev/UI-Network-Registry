<?php

namespace Tests\Feature;

use App\Models\StaffRegistration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Admin authentication.
 *
 * These are JSON API endpoints, but they live in the `web` middleware group
 * (they authenticate with a session, so they need the session middleware).
 * They are exempted from CSRF validation in bootstrap/app.php so that a
 * non-browser client can call them; that exemption is asserted here at the
 * middleware-configuration level, because Laravel's HTTP test client skips
 * CSRF validation entirely when the environment is `testing`.
 */
class AdminAuthTest extends TestCase
{
    use RefreshDatabase;

    private function admin(array $attributes = []): User
    {
        return User::factory()->create(array_merge([
            'username' => 'admin',
            'email' => 'admin@ui.edu.ng',
            'password' => 'password',
        ], $attributes));
    }

    public function test_login_succeeds_with_the_admin_email(): void
    {
        $this->admin();

        $this->postJson('/api/admin/login', [
            'email' => 'admin@ui.edu.ng',
            'password' => 'password',
        ])
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('user.email', 'admin@ui.edu.ng')
            ->assertJsonStructure(['token']);
    }

    public function test_login_succeeds_with_the_admin_username(): void
    {
        $this->admin();

        $this->postJson('/api/admin/login', [
            'username' => 'admin',
            'password' => 'password',
        ])
            ->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_login_rejects_a_wrong_password(): void
    {
        $this->admin();

        $this->postJson('/api/admin/login', [
            'email' => 'admin@ui.edu.ng',
            'password' => 'not-the-password',
        ])
            ->assertStatus(401)
            ->assertJsonPath('success', false);
    }

    public function test_login_rejects_an_unknown_account(): void
    {
        $this->postJson('/api/admin/login', [
            'email' => 'nobody@ui.edu.ng',
            'password' => 'password',
        ])
            ->assertStatus(401)
            ->assertJsonPath('success', false);
    }

    public function test_login_requires_a_password(): void
    {
        $this->postJson('/api/admin/login', ['email' => 'admin@ui.edu.ng'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('password');
    }

    public function test_login_requires_an_identifier(): void
    {
        $this->postJson('/api/admin/login', ['password' => 'password'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');
    }

    public function test_login_returns_a_random_token_rather_than_a_shared_constant(): void
    {
        $this->admin();

        $token = $this->postJson('/api/admin/login', [
            'email' => 'admin@ui.edu.ng',
            'password' => 'password',
        ])->json('token');

        $this->assertIsString($token);
        $this->assertNotSame('mock-admin-session-token', $token);
        $this->assertGreaterThanOrEqual(32, strlen($token));
    }

    public function test_the_seeded_administrator_can_log_in(): void
    {
        // Runs the real seeder, guarding against the regression where the
        // `users` table was left empty and every login returned 401.
        $this->seed(\Database\Seeders\DatabaseSeeder::class);

        $this->assertDatabaseHas('users', [
            'username' => 'admin',
            'email' => 'admin@ui.edu.ng',
        ]);

        $this->assertTrue(
            Hash::check('password', User::where('username', 'admin')->firstOrFail()->password)
        );

        $this->postJson('/api/admin/login', [
            'email' => 'admin@ui.edu.ng',
            'password' => 'password',
        ])->assertOk()->assertJsonPath('success', true);
    }

    public function test_the_login_and_logout_routes_are_exempt_from_csrf(): void
    {
        $except = app(\Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class)
            ->getExcludedPaths();

        $this->assertContains('api/admin/login', $except);
        $this->assertContains('api/admin/logout', $except);
    }

    public function test_logout_clears_the_admin_session(): void
    {
        $this->actingAs($this->admin());

        $this->postJson('/api/admin/logout')->assertOk()->assertJsonPath('success', true);
        $this->assertGuest();
    }
}
