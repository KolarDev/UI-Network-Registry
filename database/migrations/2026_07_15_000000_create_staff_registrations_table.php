<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('staff_registrations', function (Blueprint $table) {
            $table->id();
            $table->string('full_name');
            $table->string('staff_id')->unique();
            $table->string('designation'); // 'Academic' | 'Non-Teaching'
            $table->string('phone');
            $table->string('faculty');
            $table->string('department');
            $table->string('username')->unique();
            $table->string('email')->unique();
            $table->string('password');
            $table->boolean('salary_deduction_authorized')->default(false);
            $table->string('staff_id_file')->nullable();
            $table->string('payslip_file')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('staff_registrations');
    }
};
