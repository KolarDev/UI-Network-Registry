<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Contact email supplied by the registrant, distinct from the allocated
     * institutional `email` derived from their preferred username.
     *
     * Nullable at the database level so the column can be added to a table that
     * already holds registrations; the API requires it for every new or edited
     * submission.
     */
    public function up(): void
    {
        Schema::table('staff_registrations', function (Blueprint $table) {
            $table->string('contact_email')->nullable()->after('phone');
        });
    }

    public function down(): void
    {
        Schema::table('staff_registrations', function (Blueprint $table) {
            $table->dropColumn('contact_email');
        });
    }
};
