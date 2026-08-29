import React, { useState, useEffect } from 'react';
import { X, Save, Zap, Plus, Trash2 } from 'lucide-react';
import { Language } from '../utils/translations';

export interface QuickFillPreset {
  id: string;
  name: string;
  grossWt: number;
  tareWt: number;
}

interface QuickFillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (preset: QuickFillPreset) => void;
  lang: Language;
}

const STORAGE_KEY = 'garment_quick_fill_presets_v1';

export function QuickFillModal({ isOpen, onClose, onApply, lang }: QuickFillModalProps) {
  const [presets, setPresets] = useState<QuickFillPreset[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGrossWt, setNewGrossWt] = useState('');
  const [newTareWt, setNewTareWt] = useState('');

  useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          setPresets(JSON.parse(saved));
        } else {
            // Default presets
            const defaults = [
                { id: 'def_1', name: 'Full Carton', grossWt: 25.5, tareWt: 0.5 },
                { id: 'def_2', name: 'Half Carton', grossWt: 12.5, tareWt: 0.5 }
            ];
            setPresets(defaults);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
        }
      } catch (e) {
        console.error('Failed to load presets', e);
      }
    }
  }, [isOpen]);

  const savePresets = (newPresets: QuickFillPreset[]) => {
    setPresets(newPresets);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPresets));
  };

  const handleCreate = () => {
    if (!newName.trim() || !newGrossWt || !newTareWt) {
      alert(lang === 'en' ? 'Please fill all fields' : 'সবগুলো ঘর পূরণ করুন');
      return;
    }

    const preset: QuickFillPreset = {
      id: `preset_${Date.now()}`,
      name: newName.trim(),
      grossWt: parseFloat(newGrossWt),
      tareWt: parseFloat(newTareWt),
    };

    savePresets([...presets, preset]);
    setIsCreating(false);
    setNewName('');
    setNewGrossWt('');
    setNewTareWt('');
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    savePresets(presets.filter(p => p.id !== id));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            {lang === 'en' ? 'Quick Fill Presets' : 'কুইক ফিল প্রিসেট'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          {presets.length === 0 && !isCreating ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              {lang === 'en' ? 'No presets found. Create one!' : 'কোনো প্রিসেট নেই। নতুন তৈরি করুন!'}
            </div>
          ) : (
            <div className="space-y-2 mb-4">
              {presets.map(preset => (
                <div
                  key={preset.id}
                  onClick={() => onApply(preset)}
                  className="flex flex-col p-3 rounded-lg border border-slate-200 hover:border-amber-400 hover:bg-amber-50 cursor-pointer transition group"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-slate-800 text-sm">{preset.name}</span>
                    <button
                      onClick={(e) => handleDelete(preset.id, e)}
                      className="text-slate-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex gap-4 text-xs text-slate-600">
                    <div>Gross: <span className="font-semibold text-slate-800">{preset.grossWt} kg</span></div>
                    <div>Tare: <span className="font-semibold text-slate-800">{preset.tareWt} kg</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {isCreating ? (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <h3 className="font-semibold text-sm text-slate-700">
                {lang === 'en' ? 'Create New Preset' : 'নতুন প্রিসেট তৈরি করুন'}
              </h3>
              <input
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                placeholder={lang === 'en' ? 'Preset Name (e.g., Full Carton)' : 'নাম (যেমন: ফুল কার্টন)'}
                value={newName}
                onChange={e => setNewName(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                  placeholder="Gross Wt (kg)"
                  value={newGrossWt}
                  onChange={e => setNewGrossWt(e.target.value)}
                />
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                  placeholder="Tare Wt (kg)"
                  value={newTareWt}
                  onChange={e => setNewTareWt(e.target.value)}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleCreate}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-900 text-white rounded-md text-sm font-semibold hover:bg-slate-800"
                >
                  <Save className="w-4 h-4" /> {lang === 'en' ? 'Save' : 'সেভ'}
                </button>
                <button
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md text-sm font-semibold hover:bg-slate-50"
                >
                  {lang === 'en' ? 'Cancel' : 'বাতিল'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold text-slate-500 hover:text-amber-600 hover:border-amber-300 hover:bg-amber-50 transition"
            >
              <Plus className="w-4 h-4" />
              {lang === 'en' ? 'Add New Preset' : 'নতুন প্রিসেট যোগ করুন'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
