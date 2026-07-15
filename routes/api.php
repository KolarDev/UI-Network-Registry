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
