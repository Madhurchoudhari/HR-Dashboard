<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Interview extends Model
{
    use HasFactory;

    protected $fillable = [
        'candidate_id',
        'interviewer_name',
        'scheduled_at',
        'mode',
        'feedback',
        'rating',
        'notification_sent',
    ];

    protected $casts = [
        'scheduled_at' => 'datetime',
        'notification_sent' => 'boolean',
        'rating' => 'integer',
    ];

    public function candidate()
    {
        return $this->belongsTo(Candidate::class);
    }
}
