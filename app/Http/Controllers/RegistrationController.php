<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\AuthorizesAdmin;
use App\Models\RegistrationMessage;
use App\Models\StaffRegistration;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Throwable;

class RegistrationController extends Controller
{
    use AuthorizesAdmin;

    /**
     * Allowed status transitions that an admin may apply.
     */
    private const ADMIN_TOGGLEABLE_STATUSES = [
        StaffRegistration::STATUS_COMPLETED,
        StaffRegistration::STATUS_IN_REVIEW,
    ];

    /**
     * Shared image upload rules: real JPEG/PNG content only, max 5 MB.
     *
     * Both `mimes` and `mimetypes` are applied deliberately:
     *  - `mimes` allow-lists the file *extension* (jpg/jpeg/png).
     *  - `mimetypes` inspects the actual file *contents* with finfo, so a
     *    script or archive renamed to `.jpg` is rejected rather than stored.
     * PHP/libmagic reports `image/jpeg` for both `.jpg` and `.jpeg`, so the
     * content-type allow-list is image/jpeg + image/png.
     */
    private function imageRules(bool $required = true): array
    {
        $rules = [
            'file',
            'mimes:jpg,jpeg,png',
            'mimetypes:image/jpeg,image/png',
            'max:5120',
        ];
        if ($required) {
            array_unshift($rules, 'required');
        } else {
            array_unshift($rules, 'nullable');
        }

        return $rules;
    }

    /**
     * Detect an upload that PHP itself rejected before validation ran, and
     * build the 422 response explaining it.
     *
     * Two separate PHP limits can silently swallow a file:
     *  1. The whole request body exceeding `post_max_size` empties $_POST and
     *     $_FILES, so the uploads arrive "missing" and the caller gets a
     *     misleading "photocopy is required" error.
     *  2. A single file exceeding `upload_max_filesize` is marked with
     *     UPLOAD_ERR_INI_SIZE and fails the `file` rule, producing only the
     *     generic "failed to upload" message.
     *
     * Both are environment misconfigurations (the app accepts 5MB), so they are
     * reported as such rather than as user error.
     */
    private function rejectedUploadResponse(Request $request): ?JsonResponse
    {
        $contentLength = (int) $request->server('CONTENT_LENGTH');
        $postMax = $this->iniBytes((string) ini_get('post_max_size'));

        if ($postMax > 0 && $contentLength > $postMax) {
            return $this->uploadRejected(
                'The upload was too large for the server to accept. Each document must be 5MB or smaller.'
            );
        }

        foreach (['staffIdFile', 'payslipFile', 'attachment'] as $field) {
            $file = $request->file($field);

            if (! $file instanceof UploadedFile) {
                continue;
            }

            if (in_array($file->getError(), [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)) {
                $limit = trim((string) ini_get('upload_max_filesize'));

                return $this->uploadRejected(sprintf(
                    'The uploaded document exceeds this server\'s %s upload limit. Each document must be 5MB or smaller.',
                    $limit !== '' ? $limit : 'configured'
                ));
            }
        }

        return null;
    }

    /**
     * Convert a PHP ini shorthand size ("8M", "512K", "1G") to bytes.
     */
    private function iniBytes(string $value): int
    {
        $value = trim($value);
        if ($value === '') {
            return 0;
        }

        $unit = strtolower($value[strlen($value) - 1]);
        $number = (int) $value;

        return match ($unit) {
            'g' => $number * 1024 * 1024 * 1024,
            'm' => $number * 1024 * 1024,
            'k' => $number * 1024,
            default => $number,
        };
    }

    /**
     * Shared 422 payload for a rejected upload.
     */
    private function uploadRejected(string $message): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $message,
        ], 422);
    }

    /**
     * Handle incoming staff registration requests.
     */
    public function register(Request $request): JsonResponse
    {
        $messages = [
            'fullName.required' => 'Full name is required.',
            'fullName.min' => 'Full name must be at least 3 characters.',
            'staffId.required' => 'Staff ID is required.',
            'staffId.regex' => 'Staff ID must follow the format UI/STF/<Number> (e.g., UI/STF/1234).',
            'staffId.unique' => 'This Staff ID is already registered in the system.',
            'role.required' => 'Please select your institutional role.',
            'role.in' => 'Selected institutional role is invalid.',
            'designation.required_if' => 'Please select your designation (Academic or Non-Teaching).',
            'phone.required' => 'Phone number is required.',
            'phone.regex' => 'Please enter a valid Nigerian phone number (e.g., 08031234567 or +2348031234567).',
            'contactEmail.required' => 'Contact email is required.',
            'contactEmail.email' => 'Please enter a valid contact email address.',
            'contactEmail.max' => 'Contact email must not exceed 255 characters.',
            'faculty.required_if' => 'Faculty / Unit is required.',
            'department.required_if' => 'Department / Unit is required.',
            'username.required' => 'Preferred username is required.',
            'username.regex' => 'Username may only contain lowercase letters, numbers, dots, hyphens, and underscores.',
            'username.unique' => 'This username is already taken. Please choose another.',
            'password.required' => 'Password is required.',
            'password.min' => 'Password must be at least 8 characters long.',
            'salaryDeductionAuthorized.required' => 'Salary deduction authorization is required.',
            'salaryDeductionAuthorized.accepted' => 'You must authorize the monthly salary deduction to register.',
            'staffIdFile.required' => 'Staff ID card photocopy is required.',
            'staffIdFile.file' => 'Staff ID upload must be a valid file.',
            'staffIdFile.mimes' => 'Staff ID card must be a JPEG or PNG image (max 5MB).',
            'staffIdFile.mimetypes' => 'Staff ID card must be a JPEG or PNG image (max 5MB).',
            'staffIdFile.max' => 'Staff ID card file size must not exceed 5MB.',
            'payslipFile.required' => 'Recent payslip photocopy is required.',
            'payslipFile.file' => 'Payslip upload must be a valid file.',
            'payslipFile.mimes' => 'Payslip must be a JPEG or PNG image (max 5MB).',
            'payslipFile.mimetypes' => 'Payslip must be a JPEG or PNG image (max 5MB).',
            'payslipFile.max' => 'Payslip file size must not exceed 5MB.',
        ];

        if ($rejected = $this->rejectedUploadResponse($request)) {
            return $rejected;
        }

        $validator = Validator::make($request->all(), [
            'fullName' => 'required|string|min:3',
            'staffId' => [
                'required',
                'string',
                'regex:/^UI\/STF\/\d+$/',
                'unique:staff_registrations,staff_id',
            ],
            'role' => 'required|string|in:staff,dean,hod,director',
            'designation' => 'required_if:role,staff|nullable|string|in:Academic,Non-Teaching',
            'phone' => [
                'required',
                'string',
                'regex:/^(?:\+234|0)[789][01]\d{8}$/',
            ],
            'contactEmail' => 'required|string|email|max:255',
            'faculty' => 'required_if:role,staff,dean,hod|nullable|string',
            'department' => 'required_if:role,staff,hod,director|nullable|string',
            'username' => [
                'required',
                'string',
                'regex:/^[a-z0-9._-]+$/',
                'unique:staff_registrations,username',
            ],
            'password' => 'required|string|min:8',
            'salaryDeductionAuthorized' => 'required|boolean|accepted',
            'staffIdFile' => $this->imageRules(true),
            'payslipFile' => $this->imageRules(true),
        ], $messages);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed. Please correct the highlighted errors.',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            // Use the configured Storage disk abstraction
            // (defaults to 'public' locally, 's3' in production).
            $diskName = config('filesystems.default', 'public');

            $staffIdPath = $request->file('staffIdFile')->store('uploads/staff_ids', $diskName);
            $payslipPath = $request->file('payslipFile')->store('uploads/payslips', $diskName);

            $email = strtolower(trim($request->username)).'@ui.edu.ng';

            $registration = new StaffRegistration([
                'full_name' => trim($request->fullName),
                'staff_id' => strtoupper(trim($request->staffId)),
                'role' => $request->role,
                'designation' => $request->role === 'staff' ? $request->designation : null,
                'phone' => trim($request->phone),
                'contact_email' => strtolower(trim($request->contactEmail)),
                'faculty' => in_array($request->role, ['staff', 'dean', 'hod']) ? trim($request->faculty) : null,
                'department' => in_array($request->role, ['staff', 'hod', 'director']) ? trim($request->department) : null,
                'username' => strtolower(trim($request->username)),
                'email' => $email,
                'password' => $request->password, // hashed via casts
                'default_password_text' => $request->password,
                'salary_deduction_authorized' => filter_var($request->salaryDeductionAuthorized, FILTER_VALIDATE_BOOLEAN),
                'staff_id_file' => $staffIdPath,
                'payslip_file' => $payslipPath,
                'status' => StaffRegistration::STATUS_PENDING,
            ]);

            // Generate the unique public tracking code *before* saving so it
            // is persisted in the same INSERT as the rest of the data.
            $registration->tracking_id = StaffRegistration::generateTrackingId();
            $registration->save();

            return response()->json([
                'success' => true,
                'tracking_id' => $registration->tracking_id,
                'message' => 'Your registration was completed successfully! Save your Tracking ID to check status. The IT Network Unit will review your uploaded documents.',
                'registration' => [
                    'id' => $registration->id,
                    'tracking_id' => $registration->tracking_id,
                    'full_name' => $registration->full_name,
                    'staff_id' => $registration->staff_id,
                    'status' => $registration->status,
                    'is_editable' => $registration->is_editable,
                ],
            ], 201);
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'An error occurred while processing your registration: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/track/{tracking_id}
     *
     * Returns the registration status, profile details, full message thread,
     * and a derived `is_editable` boolean (false when status === completed).
     */
    public function track(string $trackingId): JsonResponse
    {
        $registration = StaffRegistration::with('messages')
            ->where('tracking_id', strtoupper($trackingId))
            ->first();

        if (! $registration) {
            return response()->json([
                'success' => false,
                'message' => 'No registration found for that tracking ID.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'registration' => [
                'id' => $registration->id,
                'tracking_id' => $registration->tracking_id,
                'status' => $registration->status,
                'is_editable' => $registration->is_editable,
                'full_name' => $registration->full_name,
                'staff_id' => $registration->staff_id,
                'role' => $registration->role,
                'designation' => $registration->designation,
                'phone' => $registration->phone,
                'contact_email' => $registration->contact_email,
                'faculty' => $registration->faculty,
                'department' => $registration->department,
                'username' => $registration->username,
                'email' => $registration->email,
                'salary_deduction_authorized' => (bool) $registration->salary_deduction_authorized,
                'submitted_at' => optional($registration->created_at)->toIso8601String(),
                'staff_id_file_url' => $this->fileUrl($registration->staff_id_file),
                'payslip_file_url' => $this->fileUrl($registration->payslip_file),
                'messages' => $registration->messages->map(fn (RegistrationMessage $m) => [
                    'id' => $m->id,
                    'sender_type' => $m->sender_type,
                    'message' => $m->message,
                    'attachment_url' => $this->fileUrl($m->attachment_path),
                    'created_at' => optional($m->created_at)->toIso8601String(),
                ]),
            ],
        ]);
    }

    /**
     * PUT /api/registrations/{id}
     *
     * Updates editable form fields. Rejected with HTTP 403 when the
     * registration has already been marked `completed`.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $registration = StaffRegistration::find($id);

        if (! $registration) {
            return response()->json([
                'success' => false,
                'message' => 'Registration not found.',
            ], 404);
        }

        if ($registration->status === StaffRegistration::STATUS_COMPLETED) {
            return response()->json([
                'success' => false,
                'message' => 'This registration is locked and can no longer be edited.',
            ], 403);
        }

        $messages = [
            'fullName.min' => 'Full name must be at least 3 characters.',
            'phone.regex' => 'Please enter a valid Nigerian phone number.',
            'contactEmail.email' => 'Please enter a valid contact email address.',
            'staffIdFile.mimes' => 'Staff ID card must be a JPEG or PNG image (max 5MB).',
            'staffIdFile.mimetypes' => 'Staff ID card must be a JPEG or PNG image (max 5MB).',
            'staffIdFile.max' => 'Staff ID card file size must not exceed 5MB.',
            'payslipFile.mimes' => 'Payslip must be a JPEG or PNG image (max 5MB).',
            'payslipFile.mimetypes' => 'Payslip must be a JPEG or PNG image (max 5MB).',
            'payslipFile.max' => 'Payslip file size must not exceed 5MB.',
        ];

        if ($rejected = $this->rejectedUploadResponse($request)) {
            return $rejected;
        }

        $validator = Validator::make($request->all(), [
            'fullName' => 'sometimes|required|string|min:3',
            'phone' => ['sometimes', 'required', 'string', 'regex:/^(?:\+234|0)[789][01]\d{8}$/'],
            'contactEmail' => 'sometimes|required|string|email|max:255',
            'faculty' => 'sometimes|nullable|string',
            'department' => 'sometimes|nullable|string',
            'designation' => 'sometimes|nullable|string|in:Academic,Non-Teaching',
            'staffIdFile' => $this->imageRules(false),
            'payslipFile' => $this->imageRules(false),
        ], $messages);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $diskName = config('filesystems.default', 'public');

            if ($request->hasFile('staffIdFile')) {
                if ($registration->staff_id_file) {
                    Storage::disk($diskName)->delete($registration->staff_id_file);
                }
                $registration->staff_id_file = $request->file('staffIdFile')
                    ->store('uploads/staff_ids', $diskName);
            }

            if ($request->hasFile('payslipFile')) {
                if ($registration->payslip_file) {
                    Storage::disk($diskName)->delete($registration->payslip_file);
                }
                $registration->payslip_file = $request->file('payslipFile')
                    ->store('uploads/payslips', $diskName);
            }

            if ($request->filled('fullName')) {
                $registration->full_name = trim($request->fullName);
            }
            if ($request->has('phone')) {
                $registration->phone = trim($request->phone);
            }
            if ($request->filled('contactEmail')) {
                $registration->contact_email = strtolower(trim($request->contactEmail));
            }
            if ($request->has('faculty')) {
                $registration->faculty = $request->faculty ? trim($request->faculty) : null;
            }
            if ($request->has('department')) {
                $registration->department = $request->department ? trim($request->department) : null;
            }
            if ($request->has('designation')) {
                $registration->designation = $request->designation ?: null;
            }

            $registration->save();

            return response()->json([
                'success' => true,
                'message' => 'Registration updated successfully.',
                'registration' => [
                    'id' => $registration->id,
                    'tracking_id' => $registration->tracking_id,
                    'status' => $registration->status,
                    'is_editable' => $registration->is_editable,
                ],
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'An error occurred while updating the registration: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/track/{tracking_id}/messages
     *
     * Public tracking-page endpoint. Messages posted here always come from the
     * requester, so they are stored as sender_type "user" regardless of who
     * is signed in.
     */
    public function postMessage(Request $request, string $trackingId): JsonResponse
    {
        return $this->storeMessage($request, $trackingId, RegistrationMessage::SENDER_USER);
    }

    /**
     * POST /api/admin/track/{tracking_id}/messages
     *
     * Admin dashboard endpoint (session-authenticated, `web` group). Messages
     * posted here are stored as sender_type "admin".
     */
    public function postAdminMessage(Request $request, string $trackingId): JsonResponse
    {
        if (! $this->isAdmin($request)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Admin access required.',
            ], 401);
        }

        return $this->storeMessage($request, $trackingId, RegistrationMessage::SENDER_ADMIN);
    }

    /**
     * Validate and persist a chat message for the given tracking ID. The
     * sender type is decided by the route, never by the request payload.
     */
    private function storeMessage(Request $request, string $trackingId, string $senderType): JsonResponse
    {
        $registration = StaffRegistration::where('tracking_id', strtoupper($trackingId))->first();

        if (! $registration) {
            return response()->json([
                'success' => false,
                'message' => 'No registration found for that tracking ID.',
            ], 404);
        }

        if ($rejected = $this->rejectedUploadResponse($request)) {
            return $rejected;
        }

        $validator = Validator::make($request->all(), [
            'message' => 'required_without:attachment|string|nullable',
            'attachment' => [
                'nullable',
                'file',
                'mimes:jpg,jpeg,png',
                'mimetypes:image/jpeg,image/png',
                'max:5120',
            ],
        ], [
            'attachment.mimes' => 'Attachment must be a JPEG or PNG image (max 5MB).',
            'attachment.mimetypes' => 'Attachment must be a JPEG or PNG image (max 5MB).',
            'attachment.max' => 'Attachment file size must not exceed 5MB.',
            'message.required_without' => 'Please enter a message or attach an image.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $attachmentPath = null;
            if ($request->hasFile('attachment')) {
                $diskName = config('filesystems.default', 'public');
                $attachmentPath = $request->file('attachment')
                    ->store('uploads/chat_attachments', $diskName);
            }

            $msg = RegistrationMessage::create([
                'staff_registration_id' => $registration->id,
                'sender_type' => $senderType,
                'message' => (string) ($request->input('message') ?? ''),
                'attachment_path' => $attachmentPath,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Message posted successfully.',
                'data' => [
                    'id' => $msg->id,
                    'sender_type' => $msg->sender_type,
                    'message' => $msg->message,
                    'attachment_url' => $this->fileUrl($msg->attachment_path),
                    'created_at' => optional($msg->created_at)->toIso8601String(),
                ],
            ], 201);
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to post message: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * PATCH /api/admin/registrations/{id}/status
     *
     * Admin-only: toggles a registration status between `completed` and
     * `in_review`. Always requires admin authorization.
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        if (! $this->isAdmin($request)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Admin access required.',
            ], 401);
        }

        $registration = StaffRegistration::find($id);
        if (! $registration) {
            return response()->json([
                'success' => false,
                'message' => 'Registration not found.',
            ], 404);
        }

        try {
            $data = $request->validate([
                'status' => ['required', 'string', Rule::in(self::ADMIN_TOGGLEABLE_STATUSES)],
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid status value.',
                'errors' => $e->errors(),
            ], 422);
        }

        $registration->status = $data['status'];
        $registration->save();

        return response()->json([
            'success' => true,
            'message' => 'Registration status updated.',
            'registration' => [
                'id' => $registration->id,
                'tracking_id' => $registration->tracking_id,
                'status' => $registration->status,
                'is_editable' => $registration->is_editable,
            ],
        ]);
    }

    /**
     * Resolve a storage path to a publicly accessible URL when possible.
     */
    protected function fileUrl(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        try {
            $disk = Storage::disk(config('filesystems.default', 'public'));

            return method_exists($disk, 'url') ? $disk->url($path) : null;
        } catch (Throwable) {
            return null;
        }
    }
}
