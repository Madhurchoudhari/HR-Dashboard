<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Source;
use App\Models\PipelineStage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class SettingController extends Controller
{
    public function index()
    {
        return response()->json([
            'users'   => User::select('id', 'name', 'email', 'role', 'department')->get(),
            'sources' => Source::all(),
            'stages'  => PipelineStage::orderBy('order_index', 'asc')->get(),
        ]);
    }

    // ─── User CRUD ──────────────────────────────────────────

    public function storeUser(Request $request)
    {
        $validated = $request->validate([
            'name'       => 'required|string|max:255',
            'email'      => 'required|email|unique:users,email',
            'password'   => 'required|string|min:6',
            'role'       => 'required|in:Admin,Recruiter,Viewer',
            'department' => 'nullable|string|max:255',
        ]);

        $user = User::create([
            'name'       => $validated['name'],
            'email'      => $validated['email'],
            'password'   => Hash::make($validated['password']),
            'role'       => $validated['role'],
            'department' => $validated['department'] ?? null,
        ]);

        return response()->json($user, 201);
    }

    public function updateUser(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name'       => 'sometimes|string|max:255',
            'email'      => 'sometimes|email|unique:users,email,' . $id,
            'password'   => 'nullable|string|min:6',
            'role'       => 'sometimes|in:Admin,Recruiter,Viewer',
            'department' => 'nullable|string|max:255',
        ]);

        if (!empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $user->update($validated);

        return response()->json($user);
    }

    public function destroyUser($id)
    {
        $user = User::findOrFail($id);

        // Prevent deleting yourself
        if ($user->id === auth()->id()) {
            return response()->json(['message' => 'You cannot delete your own account.'], 403);
        }

        $user->delete();

        return response()->json(['message' => 'User deleted successfully.']);
    }

    public function updateUserRole(Request $request, $id)
    {
        $request->validate([
            'role' => 'required|in:Admin,Recruiter,Viewer',
        ]);

        $user = User::findOrFail($id);
        $user->role = $request->role;
        $user->save();

        return response()->json($user);
    }

    // ─── Source CRUD ──────────────────────────────────────────

    public function storeSource(Request $request)
    {
        $request->validate([
            'name'         => 'required|string|max:255',
            'cost_per_hire' => 'required|numeric|min:0',
        ]);

        $source = Source::create($request->only('name', 'cost_per_hire'));

        return response()->json($source, 201);
    }

    public function updateSource(Request $request, $id)
    {
        $source = Source::findOrFail($id);
        $request->validate([
            'name'         => 'sometimes|string|max:255',
            'cost_per_hire' => 'sometimes|numeric|min:0',
        ]);

        $source->update($request->only('name', 'cost_per_hire'));

        return response()->json($source);
    }

    public function destroySource($id)
    {
        $source = Source::findOrFail($id);
        $source->delete();

        return response()->json(['message' => 'Source deleted.']);
    }
}
