<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CandidateNote extends Model
{
    use HasFactory;

    protected $fillable = [
        'candidate_id',
        'recruiter_id',
        'communication_type',
        'note_text',
        'outcome',
        'follow_up_needed',
        'follow_up_date',
        'follow_up_status',
    ];

    protected $casts = [
        'follow_up_needed' => 'boolean',
        'follow_up_date'   => 'datetime',
    ];

    public function candidate()
    {
        return $this->belongsTo(Candidate::class);
    }

    public function recruiter()
    {
        return $this->belongsTo(User::class, 'recruiter_id');
    }
}
