<?php

namespace Tests\Feature;

use App\Models\StaffRegistration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The CSV exporter must include the registrant's contact email, which is
 * distinct from the institutional address allocated from their username.
 */
class AdminExportTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_csv_export_contains_a_contact_email_column_and_values(): void
    {
        StaffRegistration::factory()->create([
            'full_name' => 'Adesola Mumeen',
            'username' => 'adesola.mumeen',
            'email' => 'adesola.mumeen@ui.edu.ng',
            'contact_email' => 'adesola@gmail.com',
        ]);

        $response = $this->actingAs(User::factory()->create())
            ->get('/api/admin/submissions/export');

        $response->assertOk();

        $csv = $response->streamedContent();

        $this->assertStringContainsString('Contact Email', $csv);
        $this->assertStringContainsString('adesola@gmail.com', $csv);
        // The allocated institutional address must still be exported too.
        $this->assertStringContainsString('adesola.mumeen@ui.edu.ng', $csv);
    }

    public function test_the_csv_export_lists_rows_in_ascending_id_order(): void
    {
        // More than one 100-row chunk, so ordering across chunks is covered.
        $expected = StaffRegistration::factory(105)->create()->pluck('id')->sort()->values()->all();

        $csv = $this->actingAs(User::factory()->create())
            ->get('/api/admin/submissions/export')
            ->assertOk()
            ->streamedContent();

        $rows = array_map('str_getcsv', preg_split('/\R/', trim(ltrim($csv, "\xEF\xBB\xBF"))));
        array_shift($rows); // header
        $ids = array_map(fn (array $row) => (int) $row[0], $rows);

        $this->assertSame($expected, $ids);
    }

    public function test_the_submissions_index_reports_registry_wide_status_counts(): void
    {
        StaffRegistration::factory(2)->create(['status' => StaffRegistration::STATUS_PENDING]);
        StaffRegistration::factory()->create(['status' => StaffRegistration::STATUS_COMPLETED]);

        $this->actingAs(User::factory()->create())
            ->getJson('/api/admin/submissions?search=no-such-registrant')
            ->assertOk()
            ->assertJsonPath('total', 0)
            ->assertJsonPath('status_counts', ['pending' => 2, 'in_review' => 0, 'completed' => 1]);
    }

    public function test_the_submissions_index_exposes_contact_email(): void
    {
        StaffRegistration::factory()->create(['contact_email' => 'contact@example.com']);

        $this->actingAs(User::factory()->create())
            ->getJson('/api/admin/submissions')
            ->assertOk()
            ->assertJsonPath('data.0.contact_email', 'contact@example.com');
    }
}
