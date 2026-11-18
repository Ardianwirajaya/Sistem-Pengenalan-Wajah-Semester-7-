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
    Schema::create('attendance_details', function (Blueprint $table) {
        $table->id();
        $table->foreignId('attendance_session_id')->constrained()->cascadeOnDelete();
        $table->foreignId('student_id')->constrained()->restrictOnDelete();
        $table->string('status');           // present|absent|excused|unknown
        $table->foreignId('recognition_result_id')->nullable()->constrained()->nullOnDelete();
        $table->foreignId('confirmed_by')->nullable()->constrained('users')->nullOnDelete();
        $table->timestamp('confirmed_at')->nullable();
        $table->timestamps();

        $table->unique(['attendance_session_id', 'student_id']);
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendance_details');
    }
};
