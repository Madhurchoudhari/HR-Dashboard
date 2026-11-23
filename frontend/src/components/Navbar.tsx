import React, { useEffect, useState, useRef } from 'react';
import { Bell, RefreshCw, AlertCircle, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import type { CandidateNote } from '../types';

interface NavbarProps {
  title: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ title, onRefresh, isRefreshing }) => {
  const { user } = useAuth();
  const [urgentCount, setUrgentCount] = useState(0);
  const [followUps, setFollowUps] = useState<{ overdue: CandidateNote[]; today: CandidateNote[] }>({ overdue: [], today: [] });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchFollowUpCounts = async () => {
    try {
      const res = await apiClient.get('/follow-ups');
      setUrgentCount(res.data.counts.total_urgent || 0);
      setFollowUps({
        overdue: res.data.overdue || [],
        today: res.data.today || [],
      });
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    fetchFollowUpCounts();
    const interval = setInterval(fetchFollowUpCounts, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 flex items-center justify-between sticky top-0 z-20 transition-colors duration-200">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
          {title}
        </h2>
        <span className="hidden md:inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Live Pipeline
        </span>
      </div>

      <div className="flex items-center gap-4">
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-500' : ''}`} />
            <span className="hidden sm:inline">Refresh Data</span>
          </button>
        )}

        {/* Notifications Bell Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(v => !v)}
            className="relative p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Follow-up Notifications"
          >
            <Bell className="w-5 h-5" />
            {urgentCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-white font-black text-[10px] ring-2 ring-white dark:ring-gray-900 animate-pulse">
                {urgentCount}
              </span>
            )}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl z-50 text-xs overflow-hidden">
              <div className="p-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between font-bold text-gray-900 dark:text-white">
                <span className="flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-indigo-600" />
                  Follow-up Reminders
                </span>
                <span className="text-[10px] text-gray-400 font-normal">{urgentCount} Urgent</span>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                {urgentCount === 0 ? (
                  <p className="p-4 text-center text-gray-400 italic">No pending urgent follow-ups!</p>
                ) : (
                  <>
                    {followUps.overdue.map(note => (
                      <div key={note.id} className="p-3 bg-red-50/40 dark:bg-red-950/20 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors">
                        <div className="flex items-center justify-between text-red-600 font-bold text-[11px] mb-0.5">
                          <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Overdue</span>
                          <span>{note.follow_up_date ? new Date(note.follow_up_date).toLocaleDateString() : ''}</span>
                        </div>
                        <p className="font-bold text-gray-900 dark:text-white truncate">{note.candidate?.name}</p>
                        <p className="text-[10px] text-gray-500 truncate">"{note.note_text}"</p>
                      </div>
                    ))}

                    {followUps.today.map(note => (
                      <div key={note.id} className="p-3 bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors">
                        <div className="flex items-center justify-between text-amber-600 font-bold text-[11px] mb-0.5">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Due Today</span>
                          <span>Today</span>
                        </div>
                        <p className="font-bold text-gray-900 dark:text-white truncate">{note.candidate?.name}</p>
                        <p className="text-[10px] text-gray-500 truncate">"{note.note_text}"</p>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-gray-200 dark:bg-gray-800 hidden sm:block"></div>

        {user && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
              {user.name.charAt(0)}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-xs font-bold text-gray-900 dark:text-white leading-none">
                {user.name}
              </p>
              <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                {user.role} • {user.department || 'HR'}
              </p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
