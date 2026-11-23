<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('candidate_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('candidate_id')->constrained('candidates')->onDelete('cascade');
            $table->foreignId('recruiter_id')->constrained('users')->onDelete('cascade');
            $table->enum('communication_type', ['Call', 'WhatsApp', 'Email', 'In-person', 'Other'])->default('Call');
            $table->text('note_text');
            $table->enum('outcome', [
                'Interested', 
                'Call Later', 
                'Not Interested', 
                'Salary Negotiation', 
                'No Response', 
                'Offer Discussed', 
                'Other'
            ])->default('Interested');
            $table->boolean('follow_up_needed')->default(false);
            $table->dateTime('follow_up_date')->nullable();
            $table->enum('follow_up_status', ['Pending', 'Done', 'Cancelled'])->default('Pending');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('candidate_notes');
    }
};
