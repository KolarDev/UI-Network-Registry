<?php

namespace App\Http\Controllers;

use App\Models\StaffRegistration;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class RegistrationController extends Controller
{
    /**
     * Handle incoming staff registration requests.
     */
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'fullName' => 'required|string|min:3',
            'staffId' => [
                'required',
                'string',
                'regex:/^UI\/STF\/\d+$/',
                'unique:staff_registrations,staff_id'
            ],
            'role' => 'required|string|in:staff,dean,hod,director',
            'designation' => 'required_if:role,staff|nullable|string|in:Academic,Non-Teaching',
            'phone' => [
                'required',
                'string',
                'regex:/^(?:\+234|0)[789][01]\d{8}$/'
            ],
            'faculty' => 'required_if:role,staff,dean,hod|nullable|string',
            'department' => 'required_if:role,staff,hod,director|nullable|string',
            'username' => [
                'required',
                'string',
                'regex:/^[a-z0-9._-]+$/',
                'unique:staff_registrations,username'
            ],
            'password' => 'required|string|min:8',
            'salaryDeductionAuthorized' => 'required|boolean|accepted',
            'staffIdFile' => 'required|file|mimes:jpeg,png,pdf|max:5120',
            'payslipFile' => 'required|file|mimes:jpeg,png,pdf|max:5120',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        // Store files securely on private disk (storage/app/private/uploads/...)
        $staffIdPath = $request->file('staffIdFile')->store('uploads/staff_ids', 'local');
        $payslipPath = $request->file('payslipFile')->store('uploads/payslips', 'local');

        $email = $request->username . '@ui.edu.ng';

        $registration = StaffRegistration::create([
            'full_name' => $request->fullName,
            'staff_id' => $request->staffId,
            'role' => $request->role,
            'designation' => $request->role === 'staff' ? $request->designation : null,
            'phone' => $request->phone,
            'faculty' => in_array($request->role, ['staff', 'dean', 'hod']) ? $request->faculty : null,
            'department' => in_array($request->role, ['staff', 'hod', 'director']) ? $request->department : null,
            'username' => $request->username,
            'email' => $email,
            'password' => $request->password, // Will be hashed via casts in model
            'default_password_text' => $request->password,
            'salary_deduction_authorized' => (bool)$request->salaryDeductionAuthorized,
            'staff_id_file' => $staffIdPath,
            'payslip_file' => $payslipPath,
        ]);

        // Generate unique reference ID
        $reference = 'UI-NET-' . str_pad($registration->id, 6, '0', STR_PAD_LEFT);

        return response()->json([
            'success' => true,
            'reference' => $reference,
            'message' => 'Your registration was completed successfully! The IT Network Unit will review your uploaded documents.',
            'sentData' => [
                'fullName' => $registration->full_name,
                'username' => $registration->username,
                'staffId' => $registration->staff_id,
                'faculty' => $registration->faculty,
                'department' => $registration->department,
            ]
        ], 201);
    }
}
