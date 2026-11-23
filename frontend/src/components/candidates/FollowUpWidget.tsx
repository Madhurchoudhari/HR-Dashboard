import React, { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../../api/client';
import type { CandidateNote, FollowUpData } from '../../types';
import {
  Bell, AlertTriangle, CalendarClock,
  CheckCheck, X
} from 'lucide-react';

const addDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 16);
};

interface Props {
  onCountUpdate?: (count: number) => void;
}

export const FollowUpWidget: React.FC<Props> = ({ onCountUpdate }) => {
  const [data, setData] = useState<FollowUpData | null>(null);
  const [activeTab, setActiveTab] = useState<'overdue' | 'today' | 'upcoming'>('overdue');
  const [loading, setLoading] = useState(true);

  // Mark Done / Reschedule state
  const [markingDoneId, setMarkingDoneId] = useState<number | null>(null);
  const [markDoneNote, setMarkDoneNote] = useState('');
  const [rescheduleId, setRescheduleId] = useState<number | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [overdueBannerDismissed, setOverdueBannerDismissed] = useState(false);

  const fetchFollowUps = useCallback(async () => {
    try {
      const res = await apiClient.get('/follow-ups');
      setData(res.data);
      onCountUpdate?.(res.data.counts.total_urgent);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [onCountUpdate]);

  useEffect(() => { fetchFollowUps(); }, [fetchFollowUps]);

  // Auto-switch to today if no overdue
  useEffect(() => {
    if (data && data.counts.overdue === 0 && data.counts.today > 0) {
      setActiveTab('today');
    }
  }, [data]);

  const handleMarkDone = async (noteId: number) => {
    try {
      await apiClient.patch(`/notes/${noteId}/status`, {
        follow_up_status: 'Done',
        new_note_text: markDoneNote || undefined,
      });
      setMarkingDoneId(null);
      setMarkDoneNote('');
      fetchFollowUps();
    } catch { /* ignore */ }
  };

  const handleReschedule = async (noteId: number) => {
    if (!rescheduleDate) return;
    try {
      await apiClient.patch(`/notes/${noteId}/status`, { reschedule_date: rescheduleDate });
      setRescheduleId(null);
      setRescheduleDate('');
      fetchFollowUps();
    } catch { /* ignore */ }
  };

  const activeNotes: CandidateNote[] = data?.[activeTab] ?? [];

  const tabCfg = [
    { key: 'overdue'  as const, label: 'Overdue',   count: data?.counts.overdue ?? 0,   color: 'text-red-600 dark:text-red-400',   activeBg: 'bg-red-50 dark:bg-red-950/40 border-b-2 border-red-500' },
    { key: 'today'    as const, label: 'Today',     count: data?.counts.today ?? 0,     color: 'text-amber-600 dark:text-amber-400', activeBg: 'bg-amber-50 dark:bg-amber-950/40 border-b-2 border-amber-500' },
    { key: 'upcoming' as const, label: 'Next 7 Days', count: data?.counts.upcoming ?? 0,  color: 'text-indigo-600 dark:text-indigo-400', activeBg: 'bg-indigo-50 dark:bg-indigo-950/40 border-b-2 border-indigo-500' },
  ];

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
      {/* Overdue Banner */}
      {!overdueBannerDismissed && data && data.counts.overdue > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-red-600 text-white text-xs">
          <span className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4" />
            You have {data.counts.overdue} overdue follow-up{data.counts.overdue > 1 ? 's' : ''}!
          </span>
          <button onClick={() => setOverdueBannerDismissed(true)}>
            <X className="w-4 h-4 hover:opacity-80" />
          </button>
        </div>
      )}

      {/* Widget Header */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">Follow-up Reminders</h3>
          {data && data.counts.total_urgent > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-extrabold animate-pulse">
              {data.counts.total_urgent}
            </span>
          )}
        </div>
        <button
          onClick={fetchFollowUps}
          className="text-[10px] text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-semibold"
        >
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 dark:border-gray-800">
        {tabCfg.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 text-[11px] font-bold transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === tab.key
                ? tab.activeBg + ' ' + tab.color
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-extrabold ${
                activeTab === tab.key ? 'bg-current/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
        {loading ? (
          <p className="text-xs text-gray-400 text-center py-6">Loading follow-ups...</p>
        ) : activeNotes.length === 0 ? (
          <div className="flex flex-col items-center py-8 gap-2 text-gray-400">
            <CheckCheck className="w-8 h-8 opacity-40" />
            <p className="text-xs font-semibold">
              {activeTab === 'overdue' && 'No overdue follow-ups 🎉'}
              {activeTab === 'today' && 'Nothing due today — all clear!'}
              {activeTab === 'upcoming' && 'No upcoming follow-ups in the next 7 days.'}
            </p>
          </div>
        ) : (
          activeNotes.map(note => (
            <div key={note.id} className={`px-4 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors ${
              activeTab === 'overdue' ? 'border-l-2 border-red-400' :
              activeTab === 'today'   ? 'border-l-2 border-amber-400' : ''
            }`}>
              <div className="flex items-start justify-between gap-3">
                {/* Candidate Info */}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                    {note.candidate?.name ?? `Candidate #${note.candidate_id}`}
                  </p>
                  <p className="text-[10px] text-gray-500 truncate">
                    {note.candidate?.applied_position ?? note.candidate?.job_opening?.title ?? ''}
                  </p>
                  <p className="text-[10px] text-gray-400 italic mt-0.5 truncate">
                    "{note.note_text.slice(0, 60)}{note.note_text.length > 60 ? '...' : ''}"
                  </p>
                </div>

                {/* Follow-up Date */}
                <div className="shrink-0 text-right">
                  <span className={`text-[10px] font-bold block ${
                    activeTab === 'overdue' ? 'text-red-600 dark:text-red-400' :
                    activeTab === 'today'   ? 'text-amber-600 dark:text-amber-400' :
                    'text-indigo-600 dark:text-indigo-400'
                  }`}>
                    {note.follow_up_date
                      ? new Date(note.follow_up_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                      : '—'}
                  </span>
                  <span className="text-[9px] text-gray-400">
                    {note.recruiter?.name?.split(' ')[0] ?? 'Recruiter'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-2">
                {markingDoneId === note.id ? (
                  <div className="flex-1 space-y-1.5">
                    <textarea
                      rows={1}
                      value={markDoneNote}
                      onChange={e => setMarkDoneNote(e.target.value)}
                      placeholder="Optional: quick note..."
                      className="w-full text-[10px] px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleMarkDone(note.id)}
                        className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold hover:bg-emerald-700"
                      >
                        ✓ Confirm Done
                      </button>
                      <button
                        onClick={() => setMarkingDoneId(null)}
                        className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-600 rounded text-[10px]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : rescheduleId === note.id ? (
                  <div className="flex-1 flex flex-wrap items-center gap-1.5">
                    {[1, 3, 7].map(d => (
                      <button
                        key={d}
                        onClick={() => setRescheduleDate(addDays(d))}
                        className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 rounded text-[10px] font-bold"
                      >
                        +{d}d
                      </button>
                    ))}
                    <input
                      type="datetime-local"
                      value={rescheduleDate}
                      onChange={e => setRescheduleDate(e.target.value)}
                      className="flex-1 min-w-[140px] text-[10px] px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                    />
                    <button
                      onClick={() => handleReschedule(note.id)}
                      className="px-2 py-1 bg-amber-500 text-white rounded text-[10px] font-bold"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setRescheduleId(null)}
                      className="px-1.5 py-1 bg-gray-200 dark:bg-gray-700 rounded"
                    >
                      <X className="w-3 h-3 text-gray-500" />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setMarkingDoneId(note.id)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-lg text-[10px] font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors border border-emerald-200 dark:border-emerald-800"
                    >
                      <CheckCheck className="w-3 h-3" /> Mark Done
                    </button>
                    <button
                      onClick={() => { setRescheduleId(note.id); setRescheduleDate(addDays(3)); }}
                      className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded-lg text-[10px] font-bold hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors border border-amber-200 dark:border-amber-800"
                    >
                      <CalendarClock className="w-3 h-3" /> Reschedule
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
