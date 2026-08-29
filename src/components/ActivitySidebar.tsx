import React from 'react';
import { X, Activity, Plus, Trash2, Edit3, Settings, CheckSquare } from 'lucide-react';
import { ActivityLog } from '../types/calculator';
import { Language } from '../utils/translations';

interface ActivitySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  logs?: ActivityLog[];
  lang: Language;
}

export function ActivitySidebar({ isOpen, onClose, logs = [], lang }: ActivitySidebarProps) {
  const getIcon = (action: ActivityLog['action']) => {
    switch (action) {
      case 'ADD': return <Plus className="w-3.5 h-3.5 text-emerald-500" />;
      case 'UPDATE': return <Edit3 className="w-3.5 h-3.5 text-blue-500" />;
      case 'DELETE': return <Trash2 className="w-3.5 h-3.5 text-rose-500" />;
      case 'BATCH': return <CheckSquare className="w-3.5 h-3.5 text-purple-500" />;
      case 'SYSTEM': return <Settings className="w-3.5 h-3.5 text-slate-500" />;
      default: return <Activity className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const getTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <>
      {/* Backdrop overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[90] lg:hidden"
          onClick={onClose}
        ></div>
      )}

      {/* Sidebar Panel */}
      <div 
        className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-[100] transform transition-transform duration-300 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-slate-800">
              {lang === 'en' ? 'Activity Log' : 'অ্যাক্টিভিটি লগ'}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-md transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
          {logs.length === 0 ? (
            <div className="text-center text-slate-500 text-sm mt-10">
              {lang === 'en' ? 'No recent activity.' : 'কোন সাম্প্রতিক অ্যাক্টিভিটি নেই।'}
            </div>
          ) : (
            <div className="relative border-l border-slate-200 ml-3 space-y-6">
              {[...logs].reverse().map(log => (
                <div key={log.id} className="relative pl-5 group">
                  <div className="absolute -left-[11px] top-1 bg-white border border-slate-200 rounded-full p-1 shadow-sm">
                    {getIcon(log.action)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 mb-0.5 tracking-wider font-mono">
                      {getTime(log.timestamp)}
                    </span>
                    <span className="text-sm font-semibold text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm inline-block w-fit">
                      {log.details}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
