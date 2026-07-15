<?php

namespace App\Http\Controllers;

use App\Models\StaffRegistration;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AdminSubmissionController extends Controller
{
    /**
     * Helper to verify admin authorization via active session or bearer/query token.
     */
    protected function authorizeAdmin(Request $request): bool
    {
        if (Auth::check()) {
            return true;
        }

        $token = $request->bearerToken() ?? $request->query('token');
        return $token === 'mock-admin-session-token';
    }

    /**
     * Retrieve paginated registrations with dynamic filters.
     */
    public function index(Request $request)
    {
        if (!$this->authorizeAdmin($request)) {
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
        if (!$this->authorizeAdmin($request)) {
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
                'Designation',
                'Phone',
                'Faculty',
                'Department',
                'Username',
                'Email',
                'Salary Deduction Authorized',
                'Staff ID File Path',
                'Payslip File Path',
                'Created At',
            ]);

            // Chunk records to prevent out-of-memory errors
            $query->orderBy('created_at', 'desc')->chunk(100, function ($registrations) use ($handle) {
                foreach ($registrations as $reg) {
                    fputcsv($handle, [
                        $reg->id,
                        $reg->full_name,
                        $reg->staff_id,
                        $reg->designation,
                        $reg->phone,
                        $reg->faculty,
                        $reg->department,
                        $reg->username,
                        $reg->email,
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
     * Download a private registration file securely.
     */
    public function downloadFile(Request $request)
    {
        if (!$this->authorizeAdmin($request)) {
            abort(401, 'Unauthorized.');
        }

        $path = $request->query('path');

        if (!$path || !\Illuminate\Support\Facades\Storage::disk('local')->exists($path)) {
            abort(404, 'File not found.');
        }

        return \Illuminate\Support\Facades\Storage::disk('local')->download($path);
    }
}
