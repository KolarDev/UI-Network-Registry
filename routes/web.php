<?php

use App\Http\Controllers\AdminAuthController;
use App\Http\Controllers\AdminSubmissionController;
use App\Http\Controllers\RegistrationController;
use Illuminate\Support\Facades\Route;

Route::prefix('api')->group(function () {
    Route::post('/admin/login', [AdminAuthController::class, 'login']);
    Route::post('/admin/logout', [AdminAuthController::class, 'logout']);
    
    // Submissions review endpoints (secured)
    Route::get('/admin/submissions', [AdminSubmissionController::class, 'index']);
    Route::get('/admin/submissions/export', [AdminSubmissionController::class, 'export']);
    Route::get('/admin/submissions/file', [AdminSubmissionController::class, 'downloadFile']);

    // Session-authenticated admin actions. These must sit in the `web` group:
    // under routes/api.php there is no session, so the admin was never
    // recognised (status toggles returned 401 and replies were stored as
    // sender_type "user"). CSRF protection applies; the SPA sends X-XSRF-TOKEN.
    Route::patch('/admin/registrations/{id}/status', [RegistrationController::class, 'updateStatus'])
        ->whereNumber('id');
    Route::post('/admin/track/{tracking_id}/messages', [RegistrationController::class, 'postAdminMessage']);
});

Route::get('{any}', function () {
    return view('app');
})->where('any', '.*');