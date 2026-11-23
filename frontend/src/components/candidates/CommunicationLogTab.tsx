import React, { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import type { CandidateNote, CommType, NoteOutcome } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  Phone, MessageCircle, Mail, Users, MoreHorizontal,
  Plus, CalendarClock, CheckCheck, X, Bell
} from 'lucide-react';

const COMM_ICONS: Record<CommType, React.ReactNode> = {
  Call:       <Phone className="w-3.5 h-3.5" />,
  WhatsApp:   <MessageCircle className="w-3.5 h-3.5" />,
  Email:      <Mail className="w-3.5 h-3.5" />,
  'In-person': <Users className="w-3.5 h-3.5" />,
  Other:      <MoreHorizontal className="w-3.5 h-3.5" />,
};

const COMM_COLORS: Record<CommType, string> = {
  Call:       'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
  WhatsApp:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  Email:      'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  'In-person': 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300',
  Other:      'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

const OUTCOME_COLORS: Record<NoteOutcome, string> = {
  'Interested':         'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  'Call Later':         'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  'Not Interested':     'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
  'Salary Negotiation': 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  'No Response':        'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  'Offer Discussed':    'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  'Other':              'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const QUICK_DATES = [
  { label: 'Tomorrow',   days: 1 },
  { label: 'In 3 days',  days: 3 },
  { label: 'Next week',  days: 7 },
  { label: 'In 2 weeks', days: 14 },
];

const addDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 16);
};

const isOverdue = (date?: string | null) => date && new Date(date) < new Date(new Date().setHours(0, 0, 0, 0));
const isToday   = (date?: string | null) => {
  if (!date) return false;
  const d = new Date(date);
  const t = new Date();
  return d.toDateString() === t.toDateString();
};

const followUpColor = (note?: CandidateNote | null) => {
  if (!note?.follow_up_date) return '';
  if (isOverdue(note.follow_up_date)) return 'text-red-600 dark:text-red-400';
  if (isToday(note.follow_up_date)) return 'text-amber-600 dark:text-amber-400';
  return 'text-gray-500 dark:text-gray-400';
};

interface Props {
  candidateId: number;
  onNoteAdded?: () => void;
}

const emptyForm = {
  communication_type: 'Call' as CommType,
  note_text: '',
  outcome: 'Interested' as NoteOutcome,
  follow_up_needed: false,
  follow_up_date: '',
};

export const CommunicationLogTab: React.FC<Props> = ({ candidateId, onNoteAdded }) => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<CandidateNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // "Mark as Done" inline new-note prompt
  const [markingDoneId, setMarkingDoneId] = useState<number | null>(null);
  const [markDoneNote, setMarkDoneNote] = useState('');
  const [rescheduleId, setRescheduleId] = useState<number | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/candidates/${candidateId}/notes`);
      setNotes(res.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchNotes(); }, [candidateId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await apiClient.post(`/candidates/${candidateId}/notes`, {
        ...form,
        recruiter_id: user?.id,
        follow_up_date: form.follow_up_needed && form.follow_up_date ? form.follow_up_date : null,
      });
      setForm({ ...emptyForm });
      setShowForm(false);
      fetchNotes();
      onNoteAdded?.();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save note.');
    } finally { setSaving(false); }
  };

  const handleMarkDone = async (noteId: number) => {
    try {
      await apiClient.patch(`/notes/${noteId}/status`, {
        follow_up_status: 'Done',
        new_note_text: markDoneNote || undefined,
        communication_type: form.communication_type,
        new_outcome: form.outcome,
      });
      setMarkingDoneId(null);
      setMarkDoneNote('');
      fetchNotes();
      onNoteAdded?.();
    } catch { /* ignore */ }
  };

  const handleReschedule = async (noteId: number) => {
    if (!rescheduleDate) return;
    try {
      await apiClient.patch(`/notes/${noteId}/status`, { reschedule_date: rescheduleDate });
      setRescheduleId(null);
      setRescheduleDate('');
      fetchNotes();
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-4">
      {/* Add Note Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition-colors shadow-sm"
        >
          {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showForm ? 'Cancel' : 'Log Communication'}
        </button>
      </div>

      {/* Add Note Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 space-y-3">
          <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wide flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Log New Communication
          </h4>

          {error && (
            <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 p-2 rounded-lg">{error}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Channel *</label>
              <select
                value={form.communication_type}
                onChange={e => setForm(f => ({ ...f, communication_type: e.target.value as CommType }))}
                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {(['Call', 'WhatsApp', 'Email', 'In-person', 'Other'] as CommType[]).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Outcome *</label>
              <select
                value={form.outcome}
                onChange={e => setForm(f => ({ ...f, outcome: e.target.value as NoteOutcome }))}
                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {(['Interested', 'Call Later', 'Not Interested', 'Salary Negotiation', 'No Response', 'Offer Discussed', 'Other'] as NoteOutcome[]).map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Note / What was discussed *</label>
            <textarea
              required
              rows={3}
              value={form.note_text}
              onChange={e => setForm(f => ({ ...f, note_text: e.target.value }))}
              placeholder="e.g. Candidate is interested, asked about salary band. Needs time to think..."
              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Follow-up toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, follow_up_needed: !f.follow_up_needed, follow_up_date: !f.follow_up_needed ? addDays(3) : '' }))}
              className={`relative w-10 h-5 rounded-full transition-colors ${form.follow_up_needed ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form.follow_up_needed ? 'left-5' : 'left-0.5'}`} />
            </button>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Needs Follow-up?</span>
          </div>

          {form.follow_up_needed && (
            <div className="space-y-2 pl-2 border-l-2 border-indigo-300 dark:border-indigo-700">
              <div className="flex flex-wrap gap-2">
                {QUICK_DATES.map(q => (
                  <button
                    key={q.label}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, follow_up_date: addDays(q.days) }))}
                    className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
              <input
                type="datetime-local"
                value={form.follow_up_date}
                onChange={e => setForm(f => ({ ...f, follow_up_date: e.target.value }))}
                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs rounded-lg px-3 py-1.5 text-gray-900 dark:text-white focus:outline-none"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving ? 'Saving...' : <><CheckCheck className="w-3.5 h-3.5" /> Save Note</>}
            </button>
          </div>
        </form>
      )}

      {/* Communication Timeline */}
      {loading ? (
        <p className="text-xs text-gray-400 italic text-center py-4">Loading communication history...</p>
      ) : notes.length === 0 ? (
        <div className="text-center py-8 space-y-2">
          <MessageCircle className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto" />
          <p className="text-xs text-gray-400 italic">No communication logged yet.</p>
          <p className="text-[11px] text-gray-400">Click "Log Communication" to add the first note.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map(note => (
            <div key={note.id} className="flex gap-3">
              {/* Avatar / Icon Column */}
              <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold mt-1 ${COMM_COLORS[note.communication_type]}`}>
                {COMM_ICONS[note.communication_type]}
              </div>

              {/* Bubble */}
              <div className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl rounded-tl-none p-3 text-xs shadow-xs space-y-2">
                {/* Header row */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 dark:text-white">{note.recruiter?.name ?? 'Team'}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${COMM_COLORS[note.communication_type]}`}>
                      {note.communication_type}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${OUTCOME_COLORS[note.outcome]}`}>
                      {note.outcome}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0">
                    {new Date(note.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Note text */}
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{note.note_text}</p>

                {/* Follow-up chip */}
                {note.follow_up_needed && note.follow_up_date && note.follow_up_status === 'Pending' && (
                  <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border ${
                    isOverdue(note.follow_up_date)
                      ? 'bg-red-50 border-red-200 dark:bg-red-950/40 dark:border-red-800'
                      : isToday(note.follow_up_date)
                        ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800'
                        : 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-800'
                  }`}>
                    <span className={`flex items-center gap-1.5 text-[11px] font-bold ${followUpColor(note)}`}>
                      <Bell className="w-3 h-3" />
                      Follow up on {new Date(note.follow_up_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {isOverdue(note.follow_up_date) && <span className="text-red-500 ml-1">⚠ OVERDUE</span>}
                      {isToday(note.follow_up_date) && <span className="text-amber-500 ml-1">— Today!</span>}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {markingDoneId === note.id ? (
                        <div className="space-y-2 min-w-[220px]">
                          <textarea
                            rows={2}
                            value={markDoneNote}
                            onChange={e => setMarkDoneNote(e.target.value)}
                            placeholder="Optional: Add a note about this follow-up..."
                            className="w-full text-[10px] px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          />
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleMarkDone(note.id)}
                              className="px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold hover:bg-emerald-700"
                            >
                              Confirm Done
                            </button>
                            <button
                              onClick={() => setMarkingDoneId(null)}
                              className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-[10px] font-bold"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : rescheduleId === note.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="datetime-local"
                            value={rescheduleDate}
                            onChange={e => setRescheduleDate(e.target.value)}
                            className="text-[10px] px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          />
                          <button
                            onClick={() => handleReschedule(note.id)}
                            className="px-2 py-1 bg-amber-500 text-white rounded text-[10px] font-bold"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setRescheduleId(null)}
                            className="px-1.5 py-1 bg-gray-200 dark:bg-gray-700 rounded text-[10px]"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => setMarkingDoneId(note.id)}
                            className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded text-[10px] font-bold hover:bg-emerald-200 flex items-center gap-1"
                          >
                            <CheckCheck className="w-3 h-3" /> Done
                          </button>
                          <button
                            onClick={() => { setRescheduleId(note.id); setRescheduleDate(addDays(3)); }}
                            className="px-2 py-1 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 rounded text-[10px] font-bold hover:bg-amber-200 flex items-center gap-1"
                          >
                            <CalendarClock className="w-3 h-3" /> Reschedule
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Done/Cancelled badge */}
                {note.follow_up_needed && note.follow_up_status !== 'Pending' && (
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    note.follow_up_status === 'Done'
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    <CheckCheck className="w-3 h-3" /> Follow-up {note.follow_up_status}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
