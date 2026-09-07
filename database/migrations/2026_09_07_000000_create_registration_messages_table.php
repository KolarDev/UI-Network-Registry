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
        Schema::create('registration_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('staff_registration_id')
                ->constrained('staff_registrations')
                ->cascadeOnDelete();
            // 'user' (the registering staff member) or 'admin' (IT Network Unit staff).
            $table->string('sender_type');
            $table->text('message');
            $table->string('attachment_path')->nullable();
            $table->timestamps();

            $table->index(['staff_registration_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('registration_messages');
    }
};
