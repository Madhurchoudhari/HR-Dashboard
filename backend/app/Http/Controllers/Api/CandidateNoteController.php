<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CandidateNote;
use App\Models\Candidate;
use Illuminate\Http\Request;
use Carbon\Carbon;

class CandidateNoteController extends Controller
{
    public function indexForCandidate($candidateId)
    {
        $notes = CandidateNote::with(['recruiter', 'candidate'])
            ->where('candidate_id', $candidateId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($notes);
    }

    public function store(Request $request, $candidateId)
    {
        $candidate = Candidate::findOrFail($candidateId);

        $validated = $request->validate([
            'communication_type' => 'required|in:Call,WhatsApp,Email,In-person,Other',
            'note_text'          => 'required|string',
            'outcome'            => 'required|in:Interested,Call Later,Not Interested,Salary Negotiation,No Response,Offer Discussed,Other',
            'follow_up_needed'   => 'boolean',
            'follow_up_date'     => 'nullable|date',
            'recruiter_id'       => 'nullable|exists:users,id',
        ]);

        $recruiterId = $validated['recruiter_id'] ?? auth()->id() ?? 1;

        $note = CandidateNote::create([
            'candidate_id'       => $candidate->id,
            'recruiter_id'       => $recruiterId,
            'communication_type' => $validated['communication_type'],
            'note_text'          => $validated['note_text'],
            'outcome'            => $validated['outcome'],
            'follow_up_needed'   => $validated['follow_up_needed'] ?? false,
            'follow_up_date'     => !empty($validated['follow_up_date']) ? Carbon::parse($validated['follow_up_date']) : null,
            'follow_up_status'   => ($validated['follow_up_needed'] ?? false) ? 'Pending' : 'Done',
        ]);

        return response()->json($note->load(['recruiter', 'candidate']), 201);
    }

    public function updateStatus(Request $request, $id)
    {
        $note = CandidateNote::with(['candidate', 'recruiter'])->findOrFail($id);

        $validated = $request->validate([
            'follow_up_status' => 'sometimes|in:Pending,Done,Cancelled',
            'reschedule_date'  => 'nullable|date',
            'new_note_text'    => 'nullable|string',
            'new_outcome'      => 'nullable|string',
            'communication_type' => 'nullable|string',
        ]);

        if (isset($validated['follow_up_status'])) {
            $note->follow_up_status = $validated['follow_up_status'];
        }

        if (!empty($validated['reschedule_date'])) {
            $note->follow_up_date = Carbon::parse($validated['reschedule_date']);
            $note->follow_up_status = 'Pending';
            $note->follow_up_needed = true;
        }

        $note->save();

        // If recruiter logged a new note upon completing follow-up
        if (!empty($validated['new_note_text'])) {
            CandidateNote::create([
                'candidate_id'       => $note->candidate_id,
                'recruiter_id'       => auth()->id() ?? $note->recruiter_id,
                'communication_type' => $validated['communication_type'] ?? 'Call',
                'note_text'          => $validated['new_note_text'],
                'outcome'            => $validated['new_outcome'] ?? 'Interested',
                'follow_up_needed'   => false,
                'follow_up_status'   => 'Done',
            ]);
        }

        return response()->json($note->fresh(['recruiter', 'candidate']));
    }

    public function getFollowUps(Request $request)
    {
        $todayStart = Carbon::today();
        $todayEnd   = Carbon::today()->endOfDay();
        $next7Days  = Carbon::today()->addDays(7)->endOfDay();

        $baseQuery = CandidateNote::with(['candidate.jobOpening', 'recruiter'])
            ->where('follow_up_needed', true)
            ->where('follow_up_status', 'Pending');

        // Filter by recruiter if passed
        if ($request->filled('recruiter_id') && $request->recruiter_id !== 'All') {
            $baseQuery->where('recruiter_id', $request->recruiter_id);
        }

        $allPending = $baseQuery->orderBy('follow_up_date', 'asc')->get();

        $overdue = $allPending->filter(fn($n) => Carbon::parse($n->follow_up_date)->lt($todayStart))->values();
        $today   = $allPending->filter(fn($n) => Carbon::parse($n->follow_up_date)->gte($todayStart) && Carbon::parse($n->follow_up_date)->lte($todayEnd))->values();
        $upcoming = $allPending->filter(fn($n) => Carbon::parse($n->follow_up_date)->gt($todayEnd) && Carbon::parse($n->follow_up_date)->lte($next7Days))->values();

        return response()->json([
            'overdue'   => $overdue,
            'today'     => $today,
            'upcoming'  => $upcoming,
            'counts'    => [
                'overdue'  => $overdue->count(),
                'today'    => $today->count(),
                'upcoming' => $upcoming->count(),
                'total_urgent' => $overdue->count() + $today->count(),
            ]
        ]);
    }
}
