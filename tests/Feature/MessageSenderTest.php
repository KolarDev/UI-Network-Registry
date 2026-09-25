<?php

namespace Tests\Feature;

use App\Models\RegistrationMessage;
use App\Models\StaffRegistration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The sender of a chat message is decided by the endpoint it was posted to:
 * the public tracking page stores "user", the admin dashboard stores "admin".
 */
class MessageSenderTest extends TestCase
{
    use RefreshDatabase;

    private function registration(): StaffRegistration
    {
        return StaffRegistration::factory()->create([
            'tracking_id' => StaffRegistration::generateTrackingId(),
            'status' => StaffRegistration::STATUS_PENDING,
        ]);
    }

    public function test_a_tracking_page_message_is_stored_as_user(): void
    {
        $registration = $this->registration();

        $this->postJson("/api/track/{$registration->tracking_id}/messages", ['message' => 'Hello'])
            ->assertCreated()
            ->assertJsonPath('data.sender_type', RegistrationMessage::SENDER_USER);
    }

    public function test_a_tracking_page_message_is_stored_as_user_even_for_a_signed_in_admin(): void
    {
        $registration = $this->registration();

        $this->actingAs(User::factory()->create())
            ->postJson("/api/track/{$registration->tracking_id}/messages", ['message' => 'Hello'])
            ->assertCreated()
            ->assertJsonPath('data.sender_type', RegistrationMessage::SENDER_USER);
    }

    public function test_an_admin_dashboard_message_is_stored_as_admin(): void
    {
        $registration = $this->registration();

        $this->actingAs(User::factory()->create())
            ->postJson("/api/admin/track/{$registration->tracking_id}/messages", ['message' => 'We are reviewing it.'])
            ->assertCreated()
            ->assertJsonPath('data.sender_type', RegistrationMessage::SENDER_ADMIN);

        $this->assertDatabaseHas('registration_messages', [
            'staff_registration_id' => $registration->id,
            'sender_type' => RegistrationMessage::SENDER_ADMIN,
        ]);
    }

    public function test_the_admin_message_endpoint_rejects_guests(): void
    {
        $registration = $this->registration();

        $this->postJson("/api/admin/track/{$registration->tracking_id}/messages", ['message' => 'Spoofed'])
            ->assertUnauthorized();

        $this->assertDatabaseCount('registration_messages', 0);
    }

    public function test_an_admin_can_toggle_status_and_a_guest_cannot(): void
    {
        $registration = $this->registration();

        $this->patchJson("/api/admin/registrations/{$registration->id}/status", ['status' => 'completed'])
            ->assertUnauthorized();

        $this->actingAs(User::factory()->create())
            ->patchJson("/api/admin/registrations/{$registration->id}/status", ['status' => 'completed'])
            ->assertOk()
            ->assertJsonPath('registration.is_editable', false);
    }
}
