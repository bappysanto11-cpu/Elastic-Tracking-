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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-neutral-200 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white">
              <Folder className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                {lang === 'en' ? 'Target Sheets / Workspaces' : 'টার্গেট শিট / ওয়ার্কস্পেস'}
              </h2>
              <p className="text-[11px] text-neutral-400">
                {lang === 'en' ? 'Manage your production datasets' : 'প্রোডাকশন ডেটাসেট পরিচালনা করুন'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto max-h-[60vh] bg-white">
          <div className="space-y-2">
            {workspaces.map(ws => (
              <div 
                key={ws.id} 
                className={`flex items-center justify-between p-3 rounded-xl border transition ${
                  activeWorkspaceId === ws.id 
                    ? 'border-neutral-900 bg-neutral-100 shadow-xs ring-1 ring-neutral-900' 
                    : 'border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50/70'
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
                  <div className={`w-2.5 h-2.5 rounded-full ${activeWorkspaceId === ws.id ? 'bg-neutral-900 ring-2 ring-neutral-300' : 'bg-neutral-300'}`} />
                  
                  {editingId === ws.id ? (
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <input 
                        type="text" 
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveEdit()}
                        className="px-2 py-1 border border-neutral-400 rounded-lg text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                        autoFocus
                      />
                      <button onClick={saveEdit} className="p-1 bg-neutral-900 text-white hover:bg-black rounded-md transition cursor-pointer">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="font-bold text-neutral-900 text-xs sm:text-sm">{ws.name}</div>
                      <div className="text-[10px] text-neutral-500 font-mono">
                        {new Date(ws.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                </div>

                {editingId !== ws.id && (
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => { e.stopPropagation(); startEdit(ws); }}
                      className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition cursor-pointer"
                      title="Rename"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {ws.id !== DEFAULT_WORKSPACE_ID && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(ws.id); }}
                        className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition cursor-pointer"
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
            <div className="mt-4 p-3 border border-neutral-300 bg-neutral-50 rounded-xl flex items-center gap-2">
              <input 
                type="text"
                placeholder={lang === 'en' ? 'Sheet name (e.g. Buyer B)' : 'শিটের নাম (যেমন: বায়ার বি)'}
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                className="flex-1 px-3 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                autoFocus
              />
              <button onClick={handleCreate} className="px-3 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-bold hover:bg-black transition cursor-pointer">
                {lang === 'en' ? 'Add' : 'যোগ'}
              </button>
              <button onClick={() => setIsCreating(false)} className="p-1.5 bg-white border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-100 transition cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsCreating(true)}
              className="mt-4 w-full py-2.5 border-2 border-dashed border-neutral-300 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-neutral-700 hover:text-neutral-900 hover:border-neutral-900 hover:bg-neutral-50 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'en' ? 'Create New Target Sheet' : 'নতুন টার্গেট শিট তৈরি করুন'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
