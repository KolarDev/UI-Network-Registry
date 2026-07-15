<?php

use App\Http\Controllers\AdminAuthController;
use App\Http\Controllers\AdminSubmissionController;
use Illuminate\Support\Facades\Route;

Route::prefix('api')->group(function () {
    Route::post('/admin/login', [AdminAuthController::class, 'login']);
    Route::post('/admin/logout', [AdminAuthController::class, 'logout']);
    
    // Submissions review endpoints (secured)
    Route::get('/admin/submissions', [AdminSubmissionController::class, 'index']);
    Route::get('/admin/submissions/export', [AdminSubmissionController::class, 'export']);
    Route::get('/admin/submissions/file', [AdminSubmissionController::class, 'downloadFile']);
});

Route::get('{any}', function () {
    return view('app');
})->where('any', '.*');