<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Shared admin authorization for the JSON endpoints under /api/admin.
 *
 * Admin sessions are established by
 * {@see \App\Http\Controllers\AdminAuthController::login()}. A request is
 * authorized either by the authenticated session (every same-origin request
 * from the SPA, including the CSV export and document downloads, which are
 * plain browser navigations and therefore only carry the session cookie), or
 * by the API token issued at login and echoed back as a bearer token or a
 * `token` query parameter.
 *
 * The token is random per login and stored in the session, so it is only
 * valid alongside that session. (It was previously the shared constant
 * string "mock-admin-session-token", which acted as a universal password:
 * anyone who knew it could read every registration and download every
 * uploaded document without logging in.)
 */
trait AuthorizesAdmin
{
    /**
     * Session key holding the API token issued by the most recent login.
     */
    protected const ADMIN_TOKEN_SESSION_KEY = 'admin_api_token';

    /**
     * Determine whether the request carries a valid admin session or API token.
     */
    protected function isAdmin(Request $request): bool
    {
        if (Auth::check()) {
            return true;
        }

        if (! $request->hasSession()) {
            return false;
        }

        $expected = $request->session()->get(self::ADMIN_TOKEN_SESSION_KEY);

        if (! is_string($expected) || $expected === '') {
            return false;
        }

        $provided = $request->bearerToken() ?? $request->query('token');

        return is_string($provided)
            && $provided !== ''
            && hash_equals($expected, $provided);
    }
}
