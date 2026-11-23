<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\JobOpeningController;
use App\Http\Controllers\Api\CandidateController;
use App\Http\Controllers\Api\InterviewController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\CandidateNoteController;

// Public Auth Route
Route::post('/login', [AuthController::class, 'login']);

// Protected API Routes (Sanctum)
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Dashboard Analytics
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // Job Openings
    Route::get('/job-openings', [JobOpeningController::class, 'index']);
    Route::get('/job-openings/{id}', [JobOpeningController::class, 'show']);
    Route::post('/job-openings', [JobOpeningController::class, 'store']);
    Route::put('/job-openings/{id}', [JobOpeningController::class, 'update']);
    Route::delete('/job-openings/{id}', [JobOpeningController::class, 'destroy']);

    // Candidates & Pipeline
    Route::get('/candidates', [CandidateController::class, 'index']);
    Route::get('/candidates/{id}', [CandidateController::class, 'show']);
    Route::post('/candidates', [CandidateController::class, 'store']);
    Route::post('/candidates/sync-google-sheet', [CandidateController::class, 'syncGoogleSheet']);
    Route::put('/candidates/{id}', [CandidateController::class, 'update']);
    Route::patch('/candidates/{id}/stage', [CandidateController::class, 'updateStage']);
    Route::delete('/candidates/{id}', [CandidateController::class, 'destroy']);
    Route::post('/candidates/parse-resume', [CandidateController::class, 'parseResume']);

    // Interviews
    Route::get('/interviews', [InterviewController::class, 'index']);
    Route::post('/interviews', [InterviewController::class, 'store']);
    Route::put('/interviews/{id}', [InterviewController::class, 'update']);
    Route::post('/interviews/{id}/notify', [InterviewController::class, 'sendNotification']);

    // Reports
    Route::get('/reports', [ReportController::class, 'index']);

    // Settings — General
    Route::get('/settings', [SettingController::class, 'index']);

    // Settings — User Management (Admin only)
    Route::post('/settings/users', [SettingController::class, 'storeUser']);
    Route::put('/settings/users/{id}', [SettingController::class, 'updateUser']);
    Route::delete('/settings/users/{id}', [SettingController::class, 'destroyUser']);
    Route::patch('/settings/users/{id}/role', [SettingController::class, 'updateUserRole']);

    // Settings — Source Management
    Route::post('/settings/sources', [SettingController::class, 'storeSource']);
    Route::put('/settings/sources/{id}', [SettingController::class, 'updateSource']);
    Route::delete('/settings/sources/{id}', [SettingController::class, 'destroySource']);

    // Communication Notes & Follow-ups
    Route::get('/candidates/{candidateId}/notes', [CandidateNoteController::class, 'indexForCandidate']);
    Route::post('/candidates/{candidateId}/notes', [CandidateNoteController::class, 'store']);
    Route::patch('/notes/{id}/status', [CandidateNoteController::class, 'updateStatus']);
    Route::get('/follow-ups', [CandidateNoteController::class, 'getFollowUps']);
});
