<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class AdminAuthController extends Controller
{
    /**
     * Authenticate an admin user.
     */
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $credentials = [
            'username' => $request->username,
            'password' => $request->password,
        ];

        if (Auth::attempt($credentials)) {
            // Regenerate session to prevent session fixation
            $request->session()->regenerate();

            return response()->json([
                'success' => true,
                'message' => 'Admin logged in successfully.',
                'user' => [
                    'username' => Auth::user()->username,
                ],
                'token' => 'mock-admin-session-token'
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Invalid administrator credentials.'
        ], 401);
    }

    /**
     * Log out the authenticated admin user.
     */
    public function logout(Request $request)
    {
        Auth::logout();
        
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'success' => true,
            'message' => 'Admin logged out successfully.'
        ]);
    }
}
