<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Interview;
use App\Models\Candidate;
use Illuminate\Http\Request;

class InterviewController extends Controller
{
    public function index(Request $request)
    {
        $query = Interview::with('candidate.jobOpening');

        if ($request->has('candidate_id')) {
            $query->where('candidate_id', $request->candidate_id);
        }

        $interviews = $query->orderBy('scheduled_at', 'desc')->get();

        return response()->json($interviews);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'candidate_id' => 'required|exists:candidates,id',
            'interviewer_name' => 'required|string|max:255',
            'scheduled_at' => 'required|date',
            'mode' => 'required|in:Online,In-person',
            'feedback' => 'nullable|string',
            'rating' => 'nullable|integer|min:1|max:5',
        ]);

        $interview = Interview::create($validated);

        // Flow Management: Update candidate stage to Interview Scheduled if in Applied/Screening
        $candidate = Candidate::find($validated['candidate_id']);
        if ($candidate && in_array($candidate->status, ['Applied', 'Screening'])) {
            $candidate->changeStage('Interview Scheduled');
        }

        return response()->json($interview->load('candidate'), 201);
    }

    public function update(Request $request, $id)
    {
        $interview = Interview::findOrFail($id);

        $validated = $request->validate([
            'interviewer_name' => 'sometimes|string|max:255',
            'scheduled_at' => 'sometimes|date',
            'mode' => 'sometimes|in:Online,In-person',
            'feedback' => 'nullable|string',
            'rating' => 'nullable|integer|min:1|max:5',
        ]);

        $interview->update($validated);

        // Flow Management: Advance candidate stage to Interviewed if feedback/rating provided
        if ($interview->candidate && $interview->candidate->status === 'Interview Scheduled' && (!empty($validated['feedback']) || !empty($validated['rating']))) {
            $interview->candidate->changeStage('Interviewed');
        }

        return response()->json($interview->load('candidate'));
    }

    public function sendNotification(Request $request, $id)
    {
        $interview = Interview::with('candidate')->findOrFail($id);
        $channel = $request->input('channel', 'email');

        $interview->notification_sent = true;
        $interview->save();

        return response()->json([
            'message' => "Interview notification reminder sent via " . strtoupper($channel) . " to " . $interview->candidate->name . " (" . $interview->candidate->email . ")",
            'interview' => $interview,
        ]);
    }
}
