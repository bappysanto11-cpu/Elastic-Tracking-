import React from 'react';
import { PackingSheetData } from '../types/calculator';
import { Language, translations } from '../utils/translations';
import { Building2, Hash, User, Tag, Maximize2, Palette, Box, Scale } from 'lucide-react';
import { AutocompleteInput } from './AutocompleteInput';

interface OrderHeaderFormProps {
  sheetData: PackingSheetData;
  onChange: (updated: Partial<PackingSheetData>) => void;
  onApplyDefaultWeights: () => void;
  lang: Language;
}

export const OrderHeaderForm: React.FC<OrderHeaderFormProps> = ({
  sheetData,
  onChange,
  onApplyDefaultWeights,
  lang,
}) => {
  const t = translations[lang];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 mb-4 border-b border-slate-100 gap-2">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-indigo-600" />
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
            {lang === 'en' ? 'Order & Item Specifications' : 'অর্ডার ও আইটেম বিবরণী'}
          </h2>
        </div>
        <div className="text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
          <span className="font-semibold text-slate-700">{t.autoCalculateNotice}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Company Name */}
        <div className="lg:col-span-2">
          <AutocompleteInput
            category="companies"
            value={sheetData.companyName}
            onChange={val => onChange({ companyName: val })}
            placeholder="e.g. GOOD & FAST Pa. Co. Ltd"
            label={t.companyName}
            icon={<Building2 className="w-3 h-3 text-slate-400" />}
            lang={lang}
          />
        </div>

        {/* Reference / PO */}
        <div className="lg:col-span-2">
          <AutocompleteInput
            category="refs"
            value={sheetData.ref}
            onChange={val => onChange({ ref: val })}
            placeholder="e.g. LIZ-LO-ELS-26080193"
            label={t.ref}
            icon={<Hash className="w-3 h-3 text-slate-400" />}
            monoFont={true}
            bold={true}
            lang={lang}
          />
        </div>

        {/* Customer */}
        <div>
          <AutocompleteInput
            category="customers"
            value={sheetData.customer}
            onChange={val => onChange({ customer: val })}
            placeholder="e.g. Liz"
            label={t.customer}
            icon={<User className="w-3 h-3 text-slate-400" />}
            lang={lang}
          />
        </div>

        {/* Buyer */}
        <div>
          <AutocompleteInput
            category="buyers"
            value={sheetData.buyer}
            onChange={val => onChange({ buyer: val })}
            placeholder="e.g. Sports Direct"
            label={t.buyer}
            icon={<Tag className="w-3 h-3 text-slate-400" />}
            bold={true}
            lang={lang}
          />
        </div>

        {/* Size */}
        <div>
          <AutocompleteInput
            category="sizes"
            value={sheetData.size}
            onChange={val => onChange({ size: val })}
            placeholder="e.g. 61 MM"
            label={t.size}
            icon={<Maximize2 className="w-3 h-3 text-slate-400" />}
            bold={true}
            uppercase={true}
            lang={lang}
          />
        </div>

        {/* Color */}
        <div>
          <AutocompleteInput
            category="colors"
            value={sheetData.color}
            onChange={val => onChange({ color: val })}
            placeholder="e.g. WHITE"
            label={t.color}
            icon={<Palette className="w-3 h-3 text-slate-400" />}
            bold={true}
            uppercase={true}
            lang={lang}
          />
        </div>
      </div>

      {/* Quick Buyer & Customer Shortcuts Bar */}
      <div className="mt-3 pt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
        <span className="font-semibold text-slate-500 flex items-center gap-1">
          <Tag className="w-3 h-3 text-indigo-500" />
          {lang === 'en' ? 'Quick Buyer:' : 'দ্রুত বায়ার নির্বাচন:'}
        </span>
        {['Sports Direct', 'H&M', 'Zara', 'M&S', 'Next', 'Decathlon', 'Primark', 'Target'].map(b => (
          <button
            key={b}
            type="button"
            onClick={() => onChange({ buyer: b })}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
              sheetData.buyer === b
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            {b}
          </button>
        ))}
      </div>

      {/* Numerical Constants Bar: Tare and Wt/Unit */}
      <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-lg">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          {/* Default Tare */}
          <div className="flex items-center gap-2">
            <Box className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-semibold text-slate-700">{t.defaultTare}:</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={sheetData.defaultTare}
              onChange={e => onChange({ defaultTare: parseFloat(e.target.value) || 0 })}
              className="w-20 px-2 py-1 text-xs font-bold font-mono text-center bg-white border border-slate-300 rounded shadow-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <span className="text-xs text-slate-500">Kg / CTN</span>
          </div>

          {/* Default Wt/unit */}
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-semibold text-slate-700">{t.defaultWtPerUnit}:</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={sheetData.defaultWtPerUnit}
              onChange={e => onChange({ defaultWtPerUnit: parseFloat(e.target.value) || 0 })}
              className="w-20 px-2 py-1 text-xs font-bold font-mono text-center bg-white border border-slate-300 rounded shadow-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none text-emerald-700"
            />
            <span className="text-xs text-slate-500">gm / Meter</span>
          </div>
        </div>

        <button
          onClick={onApplyDefaultWeights}
          className="px-3 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition cursor-pointer"
          title="Apply current default tare & unit weight to all active cartons"
        >
          {lang === 'en' ? 'Sync to All Cartons' : 'সব কার্টনে আপডেট করুন'}
        </button>
      </div>
    </div>
  );
};
