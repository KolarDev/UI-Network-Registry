<?php

namespace Tests\Feature;

use App\Models\StaffRegistration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * API-level upload hardening for the registration form.
 *
 * Every upload endpoint must reject non-image content and anything over 5MB
 * with an explicit HTTP 422 JSON validation error, enforced on the server --
 * the browser-side checks are a convenience, not a control.
 *
 * NOTE ON FIXTURES: these tests deliberately build *real* UploadedFile objects
 * over real temp files instead of using UploadedFile::fake(). The fake reports
 * its MIME type from the file NAME (Illuminate\Http\Testing\File::getMimeType()
 * -> MimeType::from($this->name)), so a script named "x.jpg" claims to be
 * image/jpeg and content-based validation can never be exercised. Real objects
 * make `mimetypes` inspect the actual bytes with finfo.
 */
class RegistrationUploadSecurityTest extends TestCase
{
    use RefreshDatabase;

    /** A real 1x1 JPEG (631 bytes). */
    private const JPEG_BASE64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigD//2Q==';

    /** A real 1x1 PNG. */
    private const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==';

    /** A real 1x1 GIF, used as an image format outside the allow-list. */
    private const GIF_BASE64 = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

    /** @var list<string> Temp files to remove after each test. */
    private array $tempFiles = [];

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    protected function tearDown(): void
    {
        foreach ($this->tempFiles as $path) {
            if (is_file($path)) {
                @unlink($path);
            }
        }
        $this->tempFiles = [];

        parent::tearDown();
    }

    /**
     * Build a real uploaded file whose contents finfo can inspect.
     */
    private function upload(string $name, string $content): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'regtest_');
        file_put_contents($path, $content);
        $this->tempFiles[] = $path;

        return new UploadedFile($path, $name, null, null, true);
    }

    private function jpeg(string $name = 'document.jpg'): UploadedFile
    {
        return $this->upload($name, base64_decode(self::JPEG_BASE64));
    }

    private function png(string $name = 'document.png'): UploadedFile
    {
        return $this->upload($name, base64_decode(self::PNG_BASE64));
    }

    /**
     * A JPEG padded out to an exact byte length, for size-limit assertions.
     */
    private function jpegOfBytes(string $name, int $bytes): UploadedFile
    {
        $jpeg = base64_decode(self::JPEG_BASE64);
        $padding = max(0, $bytes - strlen($jpeg));

        return $this->upload($name, $jpeg.str_repeat("\0", $padding));
    }

    /**
     * A valid registration payload, overridable per test.
     *
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'fullName' => 'Adesola Mumeen',
            'staffId' => 'UI/STF/12345',
            'role' => 'staff',
            'designation' => 'Academic',
            'phone' => '08031234567',
            'contactEmail' => 'adesola@example.com',
            'faculty' => 'Faculty of Science',
            'department' => 'Computer Science',
            'username' => 'adesola.mumeen',
            'password' => 'Password123!',
            'salaryDeductionAuthorized' => '1',
            'staffIdFile' => $this->jpeg('staff-id.jpg'),
            'payslipFile' => $this->jpeg('payslip.jpg'),
        ], $overrides);
    }

    private function registration(): StaffRegistration
    {
        return StaffRegistration::factory()->create([
            'tracking_id' => StaffRegistration::generateTrackingId(),
        ]);
    }

    public function test_a_valid_registration_with_jpeg_uploads_succeeds(): void
    {
        $response = $this->postJson('/api/register', $this->validPayload());

        $response->assertStatus(201)->assertJsonPath('success', true);

        $this->assertDatabaseHas('staff_registrations', [
            'staff_id' => 'UI/STF/12345',
            'contact_email' => 'adesola@example.com',
        ]);
    }

    public function test_png_uploads_are_accepted(): void
    {
        $response = $this->postJson('/api/register', $this->validPayload([
            'staffIdFile' => $this->png('staff-id.png'),
            'payslipFile' => $this->png('payslip.png'),
        ]));

        $response->assertStatus(201)->assertJsonPath('success', true);
    }

    public function test_the_stored_documents_are_written_to_the_configured_disk(): void
    {
        $this->postJson('/api/register', $this->validPayload())->assertStatus(201);

        $registration = StaffRegistration::firstOrFail();

        Storage::disk('public')->assertExists($registration->staff_id_file);
        Storage::disk('public')->assertExists($registration->payslip_file);
    }

    public function test_a_script_renamed_to_jpg_is_rejected_on_the_staff_id_field(): void
    {
        $malicious = $this->upload('staff-id.jpg', '<?php echo "pwned"; ?>');

        $this->postJson('/api/register', $this->validPayload([
            'staffIdFile' => $malicious,
        ]))
            ->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonValidationErrors('staffIdFile');
    }

    public function test_a_script_renamed_to_jpg_is_rejected_on_the_payslip_field(): void
    {
        $malicious = $this->upload('payslip.jpg', '<?php echo "pwned"; ?>');

        $this->postJson('/api/register', $this->validPayload([
            'payslipFile' => $malicious,
        ]))->assertStatus(422)->assertJsonValidationErrors('payslipFile');
    }

    public function test_a_non_image_upload_is_rejected(): void
    {
        $pdf = $this->upload('scan.jpg', "%PDF-1.4\n1 0 obj\n<<>>\nendobj\n");

        $this->postJson('/api/register', $this->validPayload([
            'staffIdFile' => $pdf,
        ]))->assertStatus(422)->assertJsonValidationErrors('staffIdFile');
    }

    public function test_a_disallowed_image_format_is_rejected_whatever_it_is_named(): void
    {
        // Real GIF content (a genuine image, but not on the JPEG/PNG
        // allow-list). Validation is by content, so the extension on the
        // request cannot be used to smuggle a format past the rules.
        $gif = $this->upload('document.png', base64_decode(self::GIF_BASE64));

        $this->postJson('/api/register', $this->validPayload([
            'staffIdFile' => $gif,
        ]))->assertStatus(422)->assertJsonValidationErrors('staffIdFile');
    }

    public function test_an_image_is_validated_by_content_rather_than_the_client_filename(): void
    {
        // A real PNG whose filename claims to be a GIF: the client-supplied
        // extension is not trusted, and the content passes the allow-list, so
        // this is accepted.
        $misnamed = $this->upload('document.gif', base64_decode(self::PNG_BASE64));

        $this->postJson('/api/register', $this->validPayload([
            'staffIdFile' => $misnamed,
        ]))->assertStatus(201)->assertJsonPath('success', true);
    }

    public function test_a_staff_id_image_over_5mb_is_rejected(): void
    {
        $this->postJson('/api/register', $this->validPayload([
            'staffIdFile' => $this->jpegOfBytes('huge.jpg', 5 * 1024 * 1024 + 1024),
        ]))->assertStatus(422)->assertJsonValidationErrors('staffIdFile');
    }

    public function test_a_payslip_image_over_5mb_is_rejected(): void
    {
        $this->postJson('/api/register', $this->validPayload([
            'payslipFile' => $this->jpegOfBytes('huge.jpg', 6 * 1024 * 1024),
        ]))->assertStatus(422)->assertJsonValidationErrors('payslipFile');
    }

    public function test_an_image_at_exactly_5mb_is_accepted(): void
    {
        $this->postJson('/api/register', $this->validPayload([
            'staffIdFile' => $this->jpegOfBytes('exact.jpg', 5 * 1024 * 1024),
        ]))->assertStatus(201)->assertJsonPath('success', true);
    }

    public function test_contact_email_is_required(): void
    {
        $payload = $this->validPayload();
        unset($payload['contactEmail']);

        $this->postJson('/api/register', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors('contactEmail');
    }

    public function test_contact_email_must_be_a_valid_address(): void
    {
        $this->postJson('/api/register', $this->validPayload([
            'contactEmail' => 'not-an-email',
        ]))->assertStatus(422)->assertJsonValidationErrors('contactEmail');
    }

    public function test_contact_email_is_returned_by_the_tracking_endpoint(): void
    {
        $trackingId = $this->postJson('/api/register', $this->validPayload())
            ->assertStatus(201)
            ->json('tracking_id');

        $this->getJson('/api/track/'.$trackingId)
            ->assertOk()
            ->assertJsonPath('registration.contact_email', 'adesola@example.com');
    }

    public function test_contact_email_can_be_updated(): void
    {
        $registration = $this->registration();

        $this->putJson('/api/registrations/'.$registration->id, [
            'contactEmail' => 'new@example.com',
        ])->assertOk()->assertJsonPath('success', true);

        $this->assertDatabaseHas('staff_registrations', [
            'id' => $registration->id,
            'contact_email' => 'new@example.com',
        ]);
    }

    public function test_message_attachment_rejects_a_non_image(): void
    {
        $registration = $this->registration();

        $this->post('/api/track/'.$registration->tracking_id.'/messages', [
            'attachment' => $this->upload('payload.jpg', '<?php echo 1; ?>'),
        ], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('attachment');
    }

    public function test_message_attachment_rejects_a_file_over_5mb(): void
    {
        $registration = $this->registration();

        $this->post('/api/track/'.$registration->tracking_id.'/messages', [
            'attachment' => $this->jpegOfBytes('huge.jpg', 6 * 1024 * 1024),
        ], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('attachment');
    }

    public function test_message_attachment_accepts_a_valid_image(): void
    {
        $registration = $this->registration();

        $this->post('/api/track/'.$registration->tracking_id.'/messages', [
            'message' => 'Here is my document.',
            'attachment' => $this->jpeg('extra.jpg'),
        ], ['Accept' => 'application/json'])
            ->assertStatus(201)
            ->assertJsonPath('success', true);
    }

    public function test_a_message_requires_text_or_an_attachment(): void
    {
        $registration = $this->registration();

        $this->postJson('/api/track/'.$registration->tracking_id.'/messages', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors('message');
    }

    public function test_updating_a_registration_with_a_non_image_is_rejected(): void
    {
        $registration = $this->registration();

        // A real PUT with multipart file data (putJson would JSON-encode the
        // file away, so the `file` rule would never be exercised).
        $this->put('/api/registrations/'.$registration->id, [
            'staffIdFile' => $this->upload('bad.jpg', '<?php echo 1; ?>'),
        ], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('staffIdFile');
    }

    public function test_updating_a_registration_accepts_a_valid_replacement_document(): void
    {
        $registration = $this->registration();
        $originalPath = $registration->staff_id_file;

        $this->put('/api/registrations/'.$registration->id, [
            'staffIdFile' => $this->jpeg('replacement.jpg'),
        ], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('success', true);

        $registration->refresh();

        $this->assertNotSame($originalPath, $registration->staff_id_file);
        Storage::disk('public')->assertExists($registration->staff_id_file);
    }

    public function test_a_request_body_over_the_server_limit_returns_clean_json_not_a_stack_trace(): void
    {
        // A body larger than post_max_size is rejected by middleware before the
        // controller runs. Simulate it by declaring an oversized Content-Length.
        $response = $this->call(
            'POST',
            '/api/register',
            [],
            [],
            [],
            [
                'CONTENT_LENGTH' => (string) (64 * 1024 * 1024),
                'CONTENT_TYPE' => 'multipart/form-data; boundary=x',
                'HTTP_ACCEPT' => 'application/json',
            ],
        );

        $response->assertStatus(413)
            ->assertJsonPath('success', false)
            ->assertJsonStructure(['success', 'message']);

        $this->assertStringNotContainsString('Traceback', $response->getContent());
        $this->assertStringNotContainsString('vendor'.DIRECTORY_SEPARATOR, $response->getContent());
    }

    public function test_only_an_admin_can_read_or_download_submissions(): void
    {
        StaffRegistration::factory()->count(3)->create();

        $this->getJson('/api/admin/submissions')->assertStatus(401);
        $this->getJson('/api/admin/submissions/export')->assertStatus(401);
        $this->getJson('/api/admin/submissions/file?path=uploads/staff_ids/x.jpg')->assertStatus(401);
    }

    public function test_the_retired_shared_admin_token_no_longer_grants_access(): void
    {
        StaffRegistration::factory()->count(3)->create();

        // "mock-admin-session-token" was previously accepted as a universal
        // bearer/query token by every admin endpoint.
        $this->getJson('/api/admin/submissions?token=mock-admin-session-token')->assertStatus(401);
        $this->getJson('/api/admin/submissions', [
            'Authorization' => 'Bearer mock-admin-session-token',
        ])->assertStatus(401);
    }

    public function test_an_authenticated_admin_can_list_submissions(): void
    {
        $admin = User::factory()->create();
        StaffRegistration::factory()->count(3)->create();

        $this->actingAs($admin)
            ->getJson('/api/admin/submissions')
            ->assertOk()
            ->assertJsonPath('total', 3);
    }
}
