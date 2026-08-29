import React, { useState } from 'react';
import { X, Folder, Plus, Trash2, Edit2, Check } from 'lucide-react';
import { Workspace, getWorkspaces, createWorkspace, deleteWorkspace, DEFAULT_WORKSPACE_ID, saveWorkspaces } from '../utils/workspaceManager';
import { Language } from '../utils/translations';

interface WorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeWorkspaceId: string;
  onSelectWorkspace: (id: string) => void;
  lang: Language;
}

export function WorkspaceModal({ isOpen, onClose, activeWorkspaceId, onSelectWorkspace, lang }: WorkspaceModalProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(getWorkspaces());
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  if (!isOpen) return null;

  const refresh = () => setWorkspaces(getWorkspaces());

  const handleCreate = () => {
    if (!newName.trim()) return;
    const ws = createWorkspace(newName.trim());
    setNewName('');
    setIsCreating(false);
    refresh();
    onSelectWorkspace(ws.id);
  };

  const handleDelete = (id: string) => {
    if (window.confirm(lang === 'en' ? 'Are you sure you want to delete this sheet?' : 'আপনি কি নিশ্চিত যে এই শিটটি মুছতে চান?')) {
      deleteWorkspace(id);
      refresh();
      if (activeWorkspaceId === id) {
        onSelectWorkspace(DEFAULT_WORKSPACE_ID);
      }
    }
  };

  const startEdit = (ws: Workspace) => {
    setEditingId(ws.id);
    setEditName(ws.name);
  };

  const saveEdit = () => {
    if (!editName.trim() || !editingId) return;
    const updated = workspaces.map(w => w.id === editingId ? { ...w, name: editName.trim() } : w);
    saveWorkspaces(updated);
    setEditingId(null);
    refresh();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Folder className="w-5 h-5 text-indigo-500" />
            {lang === 'en' ? 'Target Sheets / Workspaces' : 'টার্গেট শিট / ওয়ার্কস্পেস'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto max-h-[60vh]">
          <div className="space-y-2">
            {workspaces.map(ws => (
              <div 
                key={ws.id} 
                className={`flex items-center justify-between p-3 rounded-lg border transition ${
                  activeWorkspaceId === ws.id 
                    ? 'border-indigo-500 bg-indigo-50 shadow-sm' 
                    : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
                }`}
              >
                <div 
                  className="flex-1 cursor-pointer flex items-center gap-3" 
                  onClick={() => {
                    if (editingId !== ws.id) {
                      onSelectWorkspace(ws.id);
                    }
                  }}
                >
                  <div className={`w-2 h-2 rounded-full ${activeWorkspaceId === ws.id ? 'bg-indigo-500' : 'bg-slate-300'}`} />
                  
                  {editingId === ws.id ? (
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <input 
                        type="text" 
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveEdit()}
                        className="px-2 py-1 border border-indigo-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        autoFocus
                      />
                      <button onClick={saveEdit} className="p-1 text-emerald-600 hover:bg-emerald-100 rounded">
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="font-semibold text-slate-800 text-sm">{ws.name}</div>
                      <div className="text-[10px] text-slate-500">
                        {new Date(ws.updatedAt).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>

                {editingId !== ws.id && (
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => { e.stopPropagation(); startEdit(ws); }}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition"
                      title="Rename"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {ws.id !== DEFAULT_WORKSPACE_ID && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(ws.id); }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {isCreating ? (
            <div className="mt-4 p-3 border border-indigo-200 bg-indigo-50/50 rounded-lg flex items-center gap-2">
              <input 
                type="text"
                placeholder={lang === 'en' ? 'Sheet name (e.g. Buyer B)' : 'শিটের নাম (যেমন: বায়ার বি)'}
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                className="flex-1 px-3 py-1.5 border border-indigo-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
              <button onClick={handleCreate} className="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700">
                {lang === 'en' ? 'Add' : 'যোগ'}
              </button>
              <button onClick={() => setIsCreating(false)} className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsCreating(true)}
              className="mt-4 w-full py-2.5 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition"
            >
              <Plus className="w-4 h-4" />
              {lang === 'en' ? 'Create New Target Sheet' : 'নতুন টার্গেট শিট তৈরি করুন'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
