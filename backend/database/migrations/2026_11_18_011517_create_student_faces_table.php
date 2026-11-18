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
    $embeddingDim = 512;

    Schema::create('student_faces', function (Blueprint $table) use ($embeddingDim) {
        $table->id();
        $table->foreignId('student_id')->constrained()->cascadeOnDelete();
        $table->string('object_key');
        $table->vector('embedding', $embeddingDim)->nullable();
        $table->string('model_version')->nullable();
        $table->boolean('is_primary')->default(false);
        $table->timestamps();
        $table->softDeletes();

        $table->index(['student_id', 'is_primary']);
    });
}


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('student_faces');
    }
};
