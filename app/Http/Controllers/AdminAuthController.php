<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\AuthorizesAdmin;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class AdminAuthController extends Controller
{
    use AuthorizesAdmin;

    /**
     * Authenticate an admin user.
     *
     * Accepts either the seeded administrator email (`admin@ui.edu.ng`) or the
     * plain `username` in the `email` / `username` fields, so existing clients
     * that post `username` keep working.
     */
    public function login(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required_without:username|nullable|string',
            'username' => 'required_without:email|nullable|string',
            'password' => 'required|string',
        ], [
            'email.required_without' => 'Please enter your administrator email or username.',
            'username.required_without' => 'Please enter your administrator email or username.',
            'password.required' => 'Please enter your password.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Please provide your administrator credentials.',
                'errors' => $validator->errors(),
            ], 422);
        }

        // The identifier is whichever field the client supplied; resolve it to
        // the matching users column so `Auth::attempt` queries the right one.
        $identifier = trim((string) ($request->input('email') ?: $request->input('username')));

        if ($identifier === '') {
            return response()->json([
                'success' => false,
                'message' => 'Please enter your administrator email or username.',
            ], 422);
        }

        $field = filter_var($identifier, FILTER_VALIDATE_EMAIL) ? 'email' : 'username';

        $credentials = [
            $field => $identifier,
            'password' => (string) $request->input('password'),
        ];

        if (! Auth::attempt($credentials)) {
            // Deliberately identical response for unknown users and bad
            // passwords so the endpoint cannot be used to enumerate accounts.
            return response()->json([
                'success' => false,
                'message' => 'Invalid administrator credentials.',
            ], 401);
        }

        // Regenerate the session to prevent session fixation.
        $request->session()->regenerate();

        // Issue a random, session-bound API token for clients that echo the
        // token back as a bearer token or `token` query parameter.
        $token = Str::random(64);
        $request->session()->put(self::ADMIN_TOKEN_SESSION_KEY, $token);

        $user = Auth::user();

        return response()->json([
            'success' => true,
            'message' => 'Admin logged in successfully.',
            'user' => [
                'id' => $user->getKey(),
                'username' => $user->username,
                'email' => $user->email ?? null,
            ],
            'token' => $token,
        ]);
    }

    /**
     * Log out the authenticated admin user.
     */
    public function logout(Request $request): JsonResponse
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'success' => true,
            'message' => 'Admin logged out successfully.',
        ]);
    }
}
