<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Candidate extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'source_id',
        'job_opening_id',
        'recruiter_id',
        'applied_position',
        'resume_url',
        'status',
        'rejection_reason',
        'date',
        'sr_no',
        'location',
        'interview_date',
        'interview_time',
        'current_employee',
        'current_ctc',
        'expected_ctc',
        'company_name',
        'hr_name',
        'remark',
        'b_plus_l',
        'cibil',
        'experience',
        'graduation',
        'age',
        'strength',
        'sheet_url',
    ];

    public function source()
    {
        return $this->belongsTo(Source::class);
    }

    public function jobOpening()
    {
        return $this->belongsTo(JobOpening::class, 'job_opening_id');
    }

    public function recruiter()
    {
        return $this->belongsTo(User::class, 'recruiter_id');
    }

    public function stageHistories()
    {
        return $this->hasMany(CandidateStageHistory::class)->orderBy('entered_at', 'asc');
    }

    public function interviews()
    {
        return $this->hasMany(Interview::class)->orderBy('scheduled_at', 'desc');
    }

    public function notes()
    {
        return $this->hasMany(CandidateNote::class)->orderBy('created_at', 'desc');
    }

    public function latestPendingNote()
    {
        return $this->hasOne(CandidateNote::class)
            ->where('follow_up_needed', true)
            ->where('follow_up_status', 'Pending')
            ->orderBy('follow_up_date', 'asc');
    }

    /**
     * Centralized Stage Transition Flow Management
     */
    public function changeStage(string $newStage, ?string $rejectionReason = null): void
    {
        if ($this->status === $newStage) {
            return;
        }

        $now = Carbon::now();

        // 1. Close open stage history entry
        $lastHistory = CandidateStageHistory::where('candidate_id', $this->id)
            ->whereNull('exited_at')
            ->orderBy('entered_at', 'desc')
            ->first();

        if ($lastHistory) {
            $duration = Carbon::parse($lastHistory->entered_at)->diffInDays($now);
            $lastHistory->update([
                'exited_at' => $now,
                'duration_days' => round($duration, 1),
            ]);
        }

        // 2. Log new stage history entry
        CandidateStageHistory::create([
            'candidate_id' => $this->id,
            'stage' => $newStage,
            'entered_at' => $now,
            'exited_at' => null,
            'duration_days' => 0,
        ]);

        // 3. Update candidate status
        $this->status = $newStage;
        if ($rejectionReason !== null) {
            $this->rejection_reason = $rejectionReason;
        }
        $this->save();

        // 4. Flow Management: If candidate Joined, check position count completion
        if ($newStage === 'Joined' && $this->job_opening_id) {
            $job = JobOpening::find($this->job_opening_id);
            if ($job && $job->status === 'Open') {
                $hiredCount = Candidate::where('job_opening_id', $job->id)->where('status', 'Joined')->count();
                if ($hiredCount >= $job->positions_count) {
                    $job->status = 'Closed';
                    $job->closed_date = $now->format('Y-m-d');
                    $job->save();
                }
            }
        }
    }
}
