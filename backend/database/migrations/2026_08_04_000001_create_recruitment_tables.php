<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sources', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->decimal('cost_per_hire', 10, 2)->default(0);
            $table->timestamps();
        });

        Schema::create('job_openings', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('department');
            $table->string('location')->default('Remote');
            $table->string('hiring_manager');
            $table->integer('positions_count')->default(1);
            $table->string('status')->default('Open'); // Open, Closed, On Hold
            $table->date('opened_date');
            $table->date('closed_date')->nullable();
            $table->timestamps();
        });

        Schema::create('pipeline_stages', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->integer('order_index')->default(0);
            $table->timestamps();
        });

        Schema::create('candidates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email');
            $table->string('phone')->nullable();
            $table->foreignId('source_id')->nullable()->constrained('sources')->onDelete('set null');
            $table->foreignId('job_opening_id')->nullable()->constrained('job_openings')->onDelete('cascade');
            $table->foreignId('recruiter_id')->nullable()->constrained('users')->onDelete('set null');
            $table->string('applied_position');
            $table->text('resume_url')->nullable();
            $table->string('status')->default('Applied');
            $table->string('rejection_reason')->nullable();
            $table->timestamps();
        });

        Schema::create('candidate_stage_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('candidate_id')->constrained('candidates')->onDelete('cascade');
            $table->string('stage');
            $table->dateTime('entered_at');
            $table->dateTime('exited_at')->nullable();
            $table->float('duration_days')->nullable();
            $table->timestamps();
        });

        Schema::create('interviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('candidate_id')->constrained('candidates')->onDelete('cascade');
            $table->string('interviewer_name');
            $table->dateTime('scheduled_at');
            $table->string('mode')->default('Online'); // Online, In-person
            $table->text('feedback')->nullable();
            $table->integer('rating')->nullable(); // 1 to 5
            $table->boolean('notification_sent')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('interviews');
        Schema::dropIfExists('candidate_stage_histories');
        Schema::dropIfExists('candidates');
        Schema::dropIfExists('pipeline_stages');
        Schema::dropIfExists('job_openings');
        Schema::dropIfExists('sources');
    }
};
