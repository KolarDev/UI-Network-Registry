<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\PostTooLargeException;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // The admin endpoints under /api/admin are registered inside the `web`
        // middleware group (they authenticate with a session, so they need the
        // session middleware). That group also applies CSRF validation, which
        // makes the login endpoint unusable for any non-browser client (cURL,
        // Postman, mobile apps) -- those requests have no CSRF token and were
        // rejected with a 419 "CSRF token mismatch" before ever reaching the
        // controller. Exempt the JSON auth endpoints so they behave like an API.
        $middleware->validateCsrfTokens(except: [
            'api/admin/login',
            'api/admin/logout',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Always answer requests under /api/* with JSON. Without this, a
        // validation/auth failure on an API route can render an HTML error page
        // (or a full stack trace when APP_DEBUG is on) instead of the clean JSON
        // contract the frontend expects.
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request, \Throwable $e): bool => $request->is('api/*') || $request->expectsJson()
        );

        // A request body larger than `post_max_size` is rejected by middleware
        // before the controller runs, so no field-by-field validation can
        // happen. Answer with the same actionable message the controller uses
        // instead of a raw stack trace.
        $exceptions->render(function (PostTooLargeException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'The uploaded files are too large for the server to accept. Each document must be 5MB or smaller.',
                ], 413);
            }
        });
    })->create();
