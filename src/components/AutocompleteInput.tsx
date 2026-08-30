import React, { useState, useEffect, useRef, useId } from 'react';
import { 
  getStoredHistory, 
  getIndexedDbSuggestions,
  saveHistoryEntry, 
  removeHistoryEntry, 
  AutocompleteStorageMap,
  SuggestionItem
} from '../utils/autocompleteHistory';
import { History, X, Check, ChevronDown, Sparkles, Database } from 'lucide-react';

interface AutocompleteInputProps {
  category: keyof AutocompleteStorageMap;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  icon?: React.ReactNode;
  uppercase?: boolean;
  monoFont?: boolean;
  bold?: boolean;
  label?: string;
  lang?: 'en' | 'bn';
}

export const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  category,
  value,
  onChange,
  placeholder,
  className = '',
  icon,
  uppercase = false,
  monoFont = false,
  bold = false,
  label,
  lang = 'en',
}) => {
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [highlightIndex, setHighlightIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const datalistId = useId();

  // Load synchronous items first, then enrich from IndexedDB
  const refreshSuggestions = async () => {
    // 1. Initial fast items
    const rawLocal = getStoredHistory(category);
    const initialList: SuggestionItem[] = rawLocal.map(v => ({
      value: v,
      source: 'saved',
    }));
    setSuggestions(initialList);

    // 2. Load and merge IndexedDB historical orders
    try {
      const enriched = await getIndexedDbSuggestions(category);
      if (enriched.length > 0) {
        setSuggestions(enriched);
      }
    } catch (e) {
      console.warn('IndexedDB autocomplete load failed:', e);
    }
  };

  useEffect(() => {
    refreshSuggestions();
  }, [category]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered suggestions based on user query
  const query = value.trim().toLowerCase();
  const filteredSuggestions = suggestions.filter(item => {
    if (!query) return true;
    return item.value.toLowerCase().includes(query);
  });

  const handleSelect = (selectedItem: SuggestionItem) => {
    onChange(selectedItem.value);
    saveHistoryEntry(category, selectedItem.value);
    refreshSuggestions();
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleRemove = (e: React.MouseEvent, itemToRemove: string) => {
    e.stopPropagation();
    removeHistoryEntry(category, itemToRemove);
    refreshSuggestions();
  };

  const handleBlur = () => {
    if (value.trim().length > 0) {
      saveHistoryEntry(category, value);
      refreshSuggestions();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      return;
    }

    if (isOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIndex(prev => 
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        );
      } else if (e.key === 'Enter') {
        if (highlightIndex >= 0 && highlightIndex < filteredSuggestions.length) {
          e.preventDefault();
          handleSelect(filteredSuggestions[highlightIndex]);
        } else if (value.trim().length > 0) {
          saveHistoryEntry(category, value);
          refreshSuggestions();
          setIsOpen(false);
        }
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
  };

  const idbCount = suggestions.filter(s => s.source === 'indexeddb').length;

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center justify-between">
          <span className="flex items-center gap-1">
            {icon}
            {label}
          </span>
          {suggestions.length > 0 && (
            <span 
              onClick={() => {
                refreshSuggestions();
                setIsOpen(!isOpen);
              }}
              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer flex items-center gap-1 select-none"
              title={lang === 'en' ? 'Suggestions from IndexedDB & history' : 'হিস্ট্রি ও IndexedDB সাজেশন তালিকা'}
            >
              {idbCount > 0 ? (
                <span className="flex items-center gap-0.5 text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                  <Database className="w-2.5 h-2.5" />
                  <span>{idbCount} {lang === 'en' ? 'DB' : 'ডিবি'}</span>
                </span>
              ) : (
                <span className="flex items-center gap-0.5">
                  <History className="w-2.5 h-2.5" />
                  <span>{suggestions.length}</span>
                </span>
              )}
            </span>
          )}
        </label>
      )}

      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          list={datalistId}
          value={value}
          onChange={e => {
            const val = uppercase ? e.target.value.toUpperCase() : e.target.value;
            onChange(val);
            if (!isOpen) setIsOpen(true);
            setHighlightIndex(-1);
          }}
          onFocus={() => {
            refreshSuggestions();
            setIsOpen(true);
            setHighlightIndex(-1);
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full px-2.5 py-1.5 pr-7 text-xs text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none transition ${
            monoFont ? 'font-mono' : ''
          } ${bold ? 'font-bold' : 'font-medium'} ${className}`}
        />

        {/* Dropdown trigger arrow */}
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            refreshSuggestions();
            setIsOpen(!isOpen);
          }}
          className="absolute right-1.5 p-1 text-slate-400 hover:text-slate-700 rounded-md transition cursor-pointer"
          title={lang === 'en' ? 'Show remembered suggestions' : 'সাজেশন তালিকা দেখুন'}
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-600' : ''}`} />
        </button>

        {/* HTML5 Native Datalist Fallback */}
        <datalist id={datalistId}>
          {suggestions.map((item, idx) => (
            <option key={idx} value={item.value} />
          ))}
        </datalist>
      </div>

      {/* Floating Custom Autocomplete Dropdown */}
      {isOpen && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl divide-y divide-slate-100 animate-in fade-in-50 duration-100">
          <div className="px-2.5 py-1.5 bg-slate-50 flex items-center justify-between text-[10px] font-semibold text-slate-500 border-b border-slate-100">
            <span className="flex items-center gap-1 text-indigo-700">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              {lang === 'en' ? 'Suggestions (IndexedDB & History)' : 'সাজেশন (IndexedDB ও হিস্ট্রি)'}
            </span>
            <span className="text-slate-400 font-mono">
              {filteredSuggestions.length} {lang === 'en' ? 'results' : 'টি'}
            </span>
          </div>

          <div className="py-1">
            {filteredSuggestions.map((item, idx) => {
              const isSelected = item.value.toLowerCase() === value.trim().toLowerCase();
              const isHighlighted = idx === highlightIndex;

              return (
                <div
                  key={idx}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setHighlightIndex(idx)}
                  className={`px-2.5 py-1.5 text-xs flex items-center justify-between cursor-pointer transition select-none ${
                    isHighlighted
                      ? 'bg-indigo-50 text-indigo-900 font-semibold'
                      : isSelected
                      ? 'bg-slate-100 text-slate-900 font-bold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    {item.source === 'indexeddb' ? (
                      <span title="From IndexedDB Backups">
                        <Database className={`w-3 h-3 shrink-0 ${isHighlighted ? 'text-emerald-600' : 'text-emerald-500'}`} />
                      </span>
                    ) : (
                      <History className={`w-3 h-3 shrink-0 ${isHighlighted ? 'text-indigo-600' : 'text-slate-400'}`} />
                    )}
                    <span className={`truncate ${monoFont ? 'font-mono' : ''}`}>
                      {item.value}
                    </span>
                    {item.source === 'indexeddb' && (
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 font-mono px-1 rounded">
                        {lang === 'en' ? 'Saved Order' : 'সেভড অর্ডার'}
                        {item.occurrences && item.occurrences > 1 ? ` (${item.occurrences}x)` : ''}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-emerald-600 mr-1" />
                    )}
                    {item.source !== 'default' && (
                      <button
                        type="button"
                        title={lang === 'en' ? 'Delete from saved' : 'মুছে ফেলুন'}
                        onClick={(e) => handleRemove(e, item.value)}
                        className="opacity-40 hover:opacity-100 hover:bg-red-50 hover:text-red-600 p-0.5 rounded transition text-slate-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
