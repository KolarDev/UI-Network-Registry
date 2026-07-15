<?php

use App\Http\Controllers\AdminAuthController;
use App\Http\Controllers\AdminSubmissionController;
use App\Http\Controllers\RegistrationController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider or through bootstrap/app.php.
|
*/

// Public staff registration endpoint
Route::post('/register', [RegistrationController::class, 'register']);

// Admin login/logout endpoints (uses session and returns mock tokens)
Route::middleware(['web'])->group(function () {
    Route::post('/admin/login', [AdminAuthController::class, 'login']);
    Route::post('/admin/logout', [AdminAuthController::class, 'logout']);
    
    // Submissions review endpoints (secured)
    Route::get('/admin/submissions', [AdminSubmissionController::class, 'index']);
    Route::get('/admin/submissions/export', [AdminSubmissionController::class, 'export']);
    Route::get('/admin/submissions/file', [AdminSubmissionController::class, 'downloadFile']);
});
