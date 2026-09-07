<?php

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

// User tracking / chat endpoints
Route::get('/track/{tracking_id}', [RegistrationController::class, 'track']);
Route::post('/track/{tracking_id}/messages', [RegistrationController::class, 'postMessage']);

// Editable registration update (locked once status === completed)
Route::put('/registrations/{id}', [RegistrationController::class, 'update'])
    ->whereNumber('id');

// Admin status toggling
Route::patch('/admin/registrations/{id}/status', [RegistrationController::class, 'updateStatus'])
    ->whereNumber('id');
