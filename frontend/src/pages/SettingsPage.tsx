import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import type { User, Source } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck, Plus, Layers, DollarSign,
  Users, Pencil, Trash2, X, Eye, EyeOff, UserPlus
} from 'lucide-react';
import { Modal } from '../components/common/Modal';

const ROLES = ['Admin', 'Recruiter', 'Viewer'] as const;
const DEPARTMENTS = ['Tech Hiring', 'Sales & Business', 'Operations & HR', 'Design & Product', 'Finance', 'Marketing'];

const roleColors: Record<string, string> = {
  Admin: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  Recruiter: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  Viewer: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

const emptyUserForm = {
  name: '',
  email: '',
  password: '',
  role: 'Recruiter' as string,
  department: '',
};

export const SettingsPage: React.FC = () => {
  const { isAdmin, user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [stages, setStages] = useState<Array<{ id: number; name: string; order_index: number }>>([]);
  const [loading, setLoading] = useState(true);

  // New Source form
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceCost, setNewSourceCost] = useState(500);

  // User modal state
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({ ...emptyUserForm });
  const [showPassword, setShowPassword] = useState(false);
  const [userSaving, setUserSaving] = useState(false);
  const [userError, setUserError] = useState('');

  // Delete confirm
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/settings');
      setUsers(res.data.users || []);
      setSources(res.data.sources || []);
      setStages(res.data.stages || []);
    } catch (err) {
      console.error('Failed to load settings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // ─── User Management ───────────────────────────────────────

  const openCreateUser = () => {
    setEditingUser(null);
    setUserForm({ ...emptyUserForm });
    setUserError('');
    setShowPassword(false);
    setUserModalOpen(true);
  };

  const openEditUser = (u: User) => {
    setEditingUser(u);
    setUserForm({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      department: u.department || '',
    });
    setUserError('');
    setShowPassword(false);
    setUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserSaving(true);
    setUserError('');
    try {
      if (editingUser) {
        const payload: any = {
          name: userForm.name,
          email: userForm.email,
          role: userForm.role,
          department: userForm.department,
        };
        if (userForm.password) payload.password = userForm.password;
        await apiClient.put(`/settings/users/${editingUser.id}`, payload);
      } else {
        await apiClient.post('/settings/users', userForm);
      }
      setUserModalOpen(false);
      fetchSettings();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.errors?.email?.[0] || 'Failed to save user.';
      setUserError(msg);
    } finally {
      setUserSaving(false);
    }
  };

  const handleDeleteUser = async (id: number) => {
    try {
      await apiClient.delete(`/settings/users/${id}`);
      setDeletingUserId(null);
      fetchSettings();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete user.');
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      await apiClient.patch(`/settings/users/${userId}/role`, { role: newRole });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole as any } : u));
    } catch (err) {
      console.error('Failed to update role', err);
    }
  };

  // ─── Source Management ─────────────────────────────────────

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/settings/sources', { name: newSourceName, cost_per_hire: newSourceCost });
      setNewSourceName('');
      fetchSettings();
    } catch (err) {
      console.error('Failed to add source', err);
    }
  };

  const handleDeleteSource = async (id: number) => {
    if (!confirm('Delete this source channel?')) return;
    try {
      await apiClient.delete(`/settings/sources/${id}`);
      fetchSettings();
    } catch (err) {
      console.error('Failed to delete source', err);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-gray-400">Loading system settings...</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">

      {/* ─── User Management ─────────────────────── */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              User Management
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Create, edit, and manage user accounts and their access roles.
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={openCreateUser}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-sm transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Add User
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 text-[11px] font-bold text-gray-400 uppercase">
                <th className="pb-3 pr-4">Name</th>
                <th className="pb-3 pr-4">Email</th>
                <th className="pb-3 pr-4">Department</th>
                <th className="pb-3 pr-4">Role</th>
                {isAdmin && <th className="pb-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                  <td className="py-3 pr-4 font-bold text-gray-900 dark:text-white">
                    {u.name}
                    {u.id === currentUser?.id && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300 font-semibold">You</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-gray-500">{u.email}</td>
                  <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{u.department || '—'}</td>
                  <td className="py-3 pr-4">
                    {isAdmin ? (
                      <select
                        value={u.role}
                        onChange={e => handleRoleChange(u.id, e.target.value)}
                        className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs rounded-lg px-2.5 py-1 text-gray-900 dark:text-white font-bold focus:outline-none"
                      >
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    ) : (
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${roleColors[u.role] ?? ''}`}>
                        {u.role}
                      </span>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditUser(u)}
                          className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950 text-indigo-600 dark:text-indigo-400 transition-colors"
                          title="Edit User"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {u.id !== currentUser?.id && (
                          deletingUserId === u.id ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-red-500 font-semibold">Confirm?</span>
                              <button
                                onClick={() => handleDeleteUser(u.id)}
                                className="px-2 py-0.5 rounded bg-red-500 text-white font-bold text-[10px] hover:bg-red-600"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setDeletingUserId(null)}
                                className="px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-[10px]"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeletingUserId(u.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-red-500 dark:text-red-400 transition-colors"
                              title="Delete User"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Roles Permissions Reference ─────────── */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-600" />
          Role Permissions Reference
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          {[
            { role: 'Admin', color: 'red', perms: ['Full access to all features', 'Create & delete users', 'Change user roles', 'Close job openings', 'Manage sources & stages'] },
            { role: 'Recruiter', color: 'indigo', perms: ['Add & manage candidates', 'Drag-drop Kanban stages', 'Schedule interviews', 'Log feedback & ratings', 'Parse resumes'] },
            { role: 'Viewer', color: 'gray', perms: ['View dashboard analytics', 'Browse candidates & jobs', 'View reports & charts', 'Export PDF/CSV reports', 'No edit permissions'] },
          ].map(({ role, color, perms }) => (
            <div key={role} className={`p-4 rounded-xl border border-${color}-200 dark:border-${color}-900 bg-${color}-50 dark:bg-${color}-950/40`}>
              <p className={`font-bold text-sm text-${color}-700 dark:text-${color}-300 mb-2`}>{role}</p>
              <ul className="space-y-1">
                {perms.map(p => (
                  <li key={p} className="text-gray-600 dark:text-gray-400 flex items-start gap-1.5">
                    <span className={`text-${color}-500 mt-0.5 shrink-0`}>✓</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Sources & Cost Per Hire ──────────────── */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-emerald-600" />
          Sourcing Channels & Cost-Per-Hire Configuration
        </h3>

        {isAdmin && (
          <form onSubmit={handleAddSource} className="flex gap-3 items-center">
            <input
              type="text"
              required
              placeholder="New Source Name (e.g. Glassdoor)"
              value={newSourceName}
              onChange={e => setNewSourceName(e.target.value)}
              className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs rounded-lg px-3 py-2 text-gray-900 dark:text-white"
            />
            <input
              type="number"
              min="0"
              required
              placeholder="Cost per hire (₹)"
              value={newSourceCost}
              onChange={e => setNewSourceCost(parseFloat(e.target.value))}
              className="w-36 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs rounded-lg px-3 py-2 text-gray-900 dark:text-white"
            />
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-sm flex items-center gap-1 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Channel
            </button>
          </form>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {sources.map(src => (
            <div key={src.id} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-800 flex justify-between items-center text-xs group">
              <span className="font-bold text-gray-900 dark:text-white">{src.name}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">₹{src.cost_per_hire}/hire</span>
                {isAdmin && (
                  <button
                    onClick={() => handleDeleteSource(src.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-950 text-red-500 transition-all"
                    title="Delete source"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Pipeline Stages ─────────────────────── */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-500" />
          Active Pipeline Stage Definitions
        </h3>
        <div className="flex flex-wrap gap-2">
          {stages.map(stg => (
            <span key={stg.id} className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-xs border border-gray-200 dark:border-gray-700">
              {stg.order_index}. {stg.name}
            </span>
          ))}
        </div>
      </div>

      {/* ─── Create / Edit User Modal ─────────────── */}
      <Modal
        isOpen={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        title={editingUser ? `Edit User — ${editingUser.name}` : 'Add New User'}
      >
        <form onSubmit={handleSaveUser} className="space-y-4">
          {userError && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
              <X className="w-3.5 h-3.5 shrink-0" />
              {userError}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block">Full Name *</label>
            <input
              type="text"
              required
              value={userForm.name}
              onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Priya Sharma"
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs rounded-lg px-3 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Email */}
          <div>
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block">Email Address *</label>
            <input
              type="email"
              required
              value={userForm.email}
              onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))}
              placeholder="e.g. priya@company.com"
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs rounded-lg px-3 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block">
              Password {editingUser ? '(leave blank to keep current)' : '*'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required={!editingUser}
                value={userForm.password}
                onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))}
                placeholder={editingUser ? 'Enter new password to change...' : 'Min. 6 characters'}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs rounded-lg px-3 py-2.5 pr-10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Role + Department row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block">Role *</label>
              <select
                value={userForm.role}
                onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs rounded-lg px-3 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block">Department</label>
              <select
                value={userForm.department}
                onChange={e => setUserForm(f => ({ ...f, department: e.target.value }))}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs rounded-lg px-3 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Department</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setUserModalOpen(false)}
              className="px-4 py-2 text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={userSaving}
              className="px-5 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60 shadow-sm flex items-center gap-2 transition-colors"
            >
              {userSaving ? (
                <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving...</>
              ) : (
                editingUser ? 'Update User' : 'Create User'
              )}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
