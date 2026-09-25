<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\AuthorizesAdmin;
use App\Models\StaffRegistration;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AdminSubmissionController extends Controller
{
    use AuthorizesAdmin;

    /**
     * Retrieve paginated registrations with dynamic filters.
     */
    public function index(Request $request)
    {
        if (!$this->isAdmin($request)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Admin access required.'
            ], 401);
        }

        $query = StaffRegistration::query();

        // Apply Search Filter (Search name, staff_id, email, username)
        if ($request->has('search') && !empty($request->query('search'))) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('full_name', 'like', "%{$search}%")
                  ->orWhere('staff_id', 'like', "%{$search}%")
                  ->orWhere('username', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // Apply Department Filter
        if ($request->has('department') && !empty($request->query('department'))) {
            $department = $request->query('department');
            $query->where('department', 'like', "%{$department}%");
        }

        // Return standardized pagination format
        $registrations = $query->orderBy('created_at', 'desc')->paginate(10);

        return response()->json($registrations);
    }

    /**
     * Stream CSV export on-the-fly for currently filtered records.
     */
    public function export(Request $request)
    {
        if (!$this->isAdmin($request)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Admin access required.'
            ], 401);
        }

        $query = StaffRegistration::query();

        // Apply Search Filter
        if ($request->has('search') && !empty($request->query('search'))) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('full_name', 'like', "%{$search}%")
                  ->orWhere('staff_id', 'like', "%{$search}%")
                  ->orWhere('username', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // Apply Department Filter
        if ($request->has('department') && !empty($request->query('department'))) {
            $department = $request->query('department');
            $query->where('department', 'like', "%{$department}%");
        }

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="ui_staff_registrations.csv"',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        return response()->streamDownload(function () use ($query) {
            $handle = fopen('php://output', 'w');

            // Add UTF-8 BOM for proper encoding in Excel
            fputs($handle, chr(0xEF) . chr(0xBB) . chr(0xBF));

            // Header line
            fputcsv($handle, [
                'ID',
                'Full Name',
                'Staff ID',
                'Role',
                'Designation',
                'Phone',
                'Contact Email',
                'Faculty',
                'Department',
                'Username',
                'Email',
                'Preferred Password',
                'Salary Deduction Authorized',
                'Staff ID File Path',
                'Payslip File Path',
                'Created At',
            ]);

            // Oldest first (ascending id), so new submissions are appended to
            // the end of the file. chunkById pages by key, keeping the order
            // stable and memory bounded.
            $query->chunkById(100, function ($registrations) use ($handle) {
                foreach ($registrations as $reg) {
                    fputcsv($handle, [
                        $reg->id,
                        $reg->full_name,
                        $reg->staff_id,
                        $reg->role,
                        $reg->designation,
                        $reg->phone,
                        $reg->contact_email,
                        $reg->faculty,
                        $reg->department,
                        $reg->username,
                        $reg->email,
                        $reg->default_password_text,
                        $reg->salary_deduction_authorized ? 'Yes' : 'No',
                        $reg->staff_id_file,
                        $reg->payslip_file,
                        $reg->created_at->format('Y-m-d H:i:s'),
                    ]);
                }
            });

            fclose($handle);
        }, 'ui_staff_registrations.csv', $headers);
    }

    /**
     * Download or preview an uploaded registration document securely via Storage disk abstraction.
     */
    public function downloadFile(Request $request)
    {
        if (!$this->isAdmin($request)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Admin access required.'
            ], 401);
        }

        $path = $request->query('path');
        $diskName = config('filesystems.default', 'public');
        $disk = Storage::disk($diskName);

        if (!$path || !$disk->exists($path)) {
            return response()->json([
                'success' => false,
                'message' => 'File not found.'
            ], 404);
        }

        $filename = basename($path);
        $mimeType = $disk->mimeType($path) ?: 'application/octet-stream';

        if ($request->query('preview') || $request->query('inline')) {
            return $disk->response($path, $filename, [
                'Content-Type' => $mimeType,
                'Content-Disposition' => 'inline; filename="' . $filename . '"',
            ]);
        }

        return $disk->download($path, $filename);
    }
}
