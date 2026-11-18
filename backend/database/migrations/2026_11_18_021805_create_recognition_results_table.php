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
    Schema::create('recognition_results', function (Blueprint $table) {
        $table->id();
        $table->foreignId('recognition_session_id')->constrained()->cascadeOnDelete();
        $table->jsonb('bbox');                    // [x1, y1, x2, y2]
        $table->foreignId('candidate_student_id')->nullable()->constrained('students')->nullOnDelete();
        $table->float('similarity_score')->nullable();
        $table->string('status');                 // matched|unknown|needs_review
        $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
        $table->timestamp('reviewed_at')->nullable();
        $table->timestamps();

        $table->index(['recognition_session_id', 'status']);
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('recognition_results');
    }
};
