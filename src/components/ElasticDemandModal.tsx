import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Sparkles, 
  Calendar, 
  User, 
  Tag, 
  Maximize2, 
  Palette, 
  Scale, 
  AlertCircle, 
  Clock, 
  FileText, 
  CheckCircle2,
  Bookmark,
  Layers
} from 'lucide-react';
import { ElasticDemand, DemandPriority, DemandStatus } from '../types/elasticDemand';
import { computeEstimatedKgAndGry } from '../utils/elasticDemandStorage';
import { Language, translations } from '../utils/translations';
import { AutocompleteInput } from './AutocompleteInput';

interface ElasticDemandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (demand: ElasticDemand) => void;
  editingDemand?: ElasticDemand | null;
  lang: Language;
}

const COMMON_BUYERS = ['HCF', 'H&M', 'ZARA', 'Sports Direct', 'M&S', 'Next', 'Decathlon', 'Target', 'Primark', 'Walmart', 'PVH', 'Uniqlo'];
const COMMON_SIZES = ['5MM', '6MM', '7MM', '8MM', '10MM', '12MM', '15MM', '20MM', '25MM', '30MM', '32MM', '38MM', '40MM', '50MM', '61MM'];
const COMMON_COLORS = ['BLACK', 'WHITE', 'OPTICAL WHITE', 'NAVY BLUE', 'GREY', 'OFF WHITE', 'RED', 'ROYAL BLUE', 'BEIGE', 'KHAKI'];

export const ElasticDemandModal: React.FC<ElasticDemandModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingDemand,
  lang,
}) => {
  const t = translations[lang];

  const getTodayDate = () => new Date().toISOString().split('T')[0];
  const getDefaultDeliveryDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  };

  const [demandDate, setDemandDate] = useState<string>(getTodayDate());
  const [deliveryDate, setDeliveryDate] = useState<string>(getDefaultDeliveryDate());
  const [buyer, setBuyer] = useState<string>('HCF');
  const [customer, setCustomer] = useState<string>('LIZ');
  const [ref, setRef] = useState<string>('LIZ-LO-ELS-26080056');
  const [size, setSize] = useState<string>('7MM');
  const [color, setColor] = useState<string>('BLACK');
  const [requiredQtyMtr, setRequiredQtyMtr] = useState<number>(5000);
  const [unitWeightGm, setUnitWeightGm] = useState<number>(8.0);
  const [defaultTare, setDefaultTare] = useState<number>(0.5);
  const [priority, setPriority] = useState<DemandPriority>('urgent');
  const [status, setStatus] = useState<DemandStatus>('pending');
  const [packedQtyMtr, setPackedQtyMtr] = useState<number>(0);
  const [poNumber, setPoNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Load editing demand data if provided
  useEffect(() => {
    if (editingDemand) {
      setDemandDate(editingDemand.demandDate || getTodayDate());
      setDeliveryDate(editingDemand.deliveryDate || getDefaultDeliveryDate());
      setBuyer(editingDemand.buyer || '');
      setCustomer(editingDemand.customer || '');
      setRef(editingDemand.ref || '');
      setSize(editingDemand.size || '');
      setColor(editingDemand.color || '');
      setRequiredQtyMtr(editingDemand.requiredQtyMtr || 0);
      setUnitWeightGm(editingDemand.unitWeightGm || 8.0);
      setDefaultTare(editingDemand.defaultTare ?? 0.5);
      setPriority(editingDemand.priority || 'normal');
      setStatus(editingDemand.status || 'pending');
      setPackedQtyMtr(editingDemand.packedQtyMtr || 0);
      setPoNumber(editingDemand.poNumber || '');
      setNotes(editingDemand.notes || '');
    } else {
      // Reset to fresh default
      setDemandDate(getTodayDate());
      setDeliveryDate(getDefaultDeliveryDate());
      setBuyer('HCF');
      setCustomer('LIZ');
      setRef('LIZ-LO-ELS-26080056');
      setSize('7MM');
      setColor('BLACK');
      setRequiredQtyMtr(5000);
      setUnitWeightGm(8.0);
      setDefaultTare(0.5);
      setPriority('urgent');
      setStatus('pending');
      setPackedQtyMtr(0);
      setPoNumber('');
      setNotes('Customer requirement in this REF');
    }
  }, [editingDemand, isOpen]);

  if (!isOpen) return null;

  // Live calculation of estimated Gross Yards and Kg
  const { gry: estGry, kg: estKg } = computeEstimatedKgAndGry(requiredQtyMtr, unitWeightGm);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyer.trim() || !ref.trim() || requiredQtyMtr <= 0) {
      return;
    }

    const demandPayload: ElasticDemand = {
      id: editingDemand?.id || `dem-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      demandDate,
      deliveryDate,
      buyer: buyer.trim(),
      customer: customer.trim(),
      ref: ref.trim(),
      size: size.trim(),
      color: color.trim(),
      requiredQtyMtr: Number(requiredQtyMtr),
      requiredQtyGry: estGry,
      requiredQtyKg: estKg,
      unitWeightGm: Number(unitWeightGm) || 8.0,
      defaultTare: Number(defaultTare) || 0.5,
      priority,
      status,
      packedQtyMtr: Number(packedQtyMtr) || 0,
      packedCartonsCount: editingDemand?.packedCartonsCount || 0,
      poNumber: poNumber.trim(),
      notes: notes.trim(),
      createdAt: editingDemand?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(demandPayload);
    onClose();
  };

  const handleApplyPreset = (presetBuyer: string, presetSize: string, presetRef: string, presetMtr: number, presetWt: number, presetColor: string) => {
    setBuyer(presetBuyer);
    setSize(presetSize);
    setRef(presetRef);
    setRequiredQtyMtr(presetMtr);
    setUnitWeightGm(presetWt);
    setColor(presetColor);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                {editingDemand 
                  ? (lang === 'en' ? 'Edit Elastic Demand' : 'ইলাস্টিক চাহিদা সম্পাদনা করুন')
                  : (lang === 'en' ? 'Input Elastic Demand (Date-wise)' : 'নতুন ইলাস্টিক চাহিদা এন্ট্রি করুন (তারিখ অনুযায়ী)')
                }
              </h3>
              <p className="text-xs text-indigo-200">
                {lang === 'en' 
                  ? 'Track buyer-specific meter requirement, size, reference & delivery date'
                  : 'বায়ারের সাইজ, রেফারেন্স, প্রয়োজনীয় মিটার ও ডেলিভারি ডেডলাইন রেকর্ড করুন'
                }
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preset Quick Fill Bar */}
        {!editingDemand && (
          <div className="bg-indigo-50/70 border-b border-indigo-100 px-6 py-2.5 flex items-center gap-2 overflow-x-auto text-xs">
            <span className="text-[11px] font-bold text-indigo-900 shrink-0 flex items-center gap-1">
              <Bookmark className="w-3.5 h-3.5 text-indigo-600" />
              {lang === 'en' ? 'Quick Example:' : 'দ্রুত উদাহরণ:'}
            </span>
            <button
              type="button"
              onClick={() => handleApplyPreset('HCF', '7MM', 'LIZ-LO-ELS-26080056', 5000, 8.0, 'BLACK')}
              className="px-2.5 py-1 rounded-md bg-white border border-indigo-200 text-indigo-800 hover:bg-indigo-600 hover:text-white transition font-medium text-[11px] shrink-0 cursor-pointer shadow-2xs"
            >
              HCF · 7MM · 5,000 Mtr
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('H&M', '32MM', 'HM-WB-2026-4412', 12000, 16.0, 'OPTICAL WHITE')}
              className="px-2.5 py-1 rounded-md bg-white border border-indigo-200 text-indigo-800 hover:bg-indigo-600 hover:text-white transition font-medium text-[11px] shrink-0 cursor-pointer shadow-2xs"
            >
              H&M · 32MM · 12,000 Mtr
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('ZARA', '20MM', 'ZR-JK-9088-EX', 8500, 11.0, 'NAVY BLUE')}
              className="px-2.5 py-1 rounded-md bg-white border border-indigo-200 text-indigo-800 hover:bg-indigo-600 hover:text-white transition font-medium text-[11px] shrink-0 cursor-pointer shadow-2xs"
            >
              ZARA · 20MM · 8,500 Mtr
            </button>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Dates Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                {lang === 'en' ? 'Demand Date (Received)' : 'চাহিদা প্রাপ্তির তারিখ'} <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={demandDate}
                onChange={e => setDemandDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                {lang === 'en' ? 'Target Delivery Date' : 'টার্গেট ডেলিভারি / শিপমেন্ট তারিখ'}
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={e => setDeliveryDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
              />
            </div>
          </div>

          {/* Buyer & Customer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                {lang === 'en' ? 'Buyer Name' : 'বায়ারের নাম (BUYER)'} <span className="text-rose-500">*</span>
              </label>
              <AutocompleteInput
                value={buyer}
                onChange={setBuyer}
                suggestions={COMMON_BUYERS}
                placeholder="e.g. HCF, H&M, Zara"
                className="w-full px-3 py-2 text-sm font-bold text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                {lang === 'en' ? 'Customer / Factory' : 'কাস্টমার / ফ্যাক্টরি'}
              </label>
              <input
                type="text"
                value={customer}
                onChange={e => setCustomer(e.target.value)}
                placeholder="e.g. LIZ, Inditex Sourcing"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Ref / Style & Size */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-600" />
                {lang === 'en' ? 'REF / Item Code' : 'রেফারেন্স / আইটেম কোড (REF)'} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={ref}
                onChange={e => setRef(e.target.value)}
                placeholder="e.g. LIZ-LO-ELS-26080056"
                className="w-full px-3 py-2 text-sm font-mono font-bold text-indigo-950 bg-indigo-50/40 border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5 text-emerald-600" />
                {lang === 'en' ? 'Elastic Size' : 'ইলাস্টিক সাইজ (SIZE)'} <span className="text-rose-500">*</span>
              </label>
              <AutocompleteInput
                value={size}
                onChange={setSize}
                suggestions={COMMON_SIZES}
                placeholder="e.g. 7MM, 25MM"
                className="w-full px-3 py-2 text-sm font-bold text-emerald-950 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Color & PO Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-purple-600" />
                {lang === 'en' ? 'Color / Shade' : 'কালার (Color)'}
              </label>
              <AutocompleteInput
                value={color}
                onChange={setColor}
                suggestions={COMMON_COLORS}
                placeholder="e.g. BLACK, OPTICAL WHITE"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                {lang === 'en' ? 'PO / Order Number (Optional)' : 'পিও / অর্ডার নং (ঐচ্ছিক)'}
              </label>
              <input
                type="text"
                value={poNumber}
                onChange={e => setPoNumber(e.target.value)}
                placeholder="e.g. PO-99214"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Required Qty (Meters), Unit Wt, Default Tare */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-indigo-600" />
              {lang === 'en' ? 'Quantity & Weight Specifications' : 'পরিমাণ ও ওজনের স্পেসিফিকেশন'}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {lang === 'en' ? 'Required Quantity (Mtr)' : 'প্রয়োজনীয় পরিমাণ (মিটার)'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  step={1}
                  value={requiredQtyMtr || ''}
                  onChange={e => setRequiredQtyMtr(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-2 text-base font-bold text-indigo-700 bg-white border border-indigo-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  placeholder="5000"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {lang === 'en' ? 'Unit Wt (gm/meter)' : 'প্রতি মিটার ওজন (gm/m)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  value={unitWeightGm || ''}
                  onChange={e => setUnitWeightGm(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-semibold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  placeholder="8.00"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {lang === 'en' ? 'Default Tare Wt (Kg)' : 'কার্টন ট্যার ওজন (Kg)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={defaultTare || ''}
                  onChange={e => setDefaultTare(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-semibold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  placeholder="0.50"
                />
              </div>
            </div>

            {/* Smart Calculated Conversion Preview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200 text-center">
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="block text-[10px] text-slate-500 font-bold uppercase">Demand Mtr</span>
                <span className="text-sm font-mono font-bold text-indigo-700">{requiredQtyMtr.toLocaleString()} m</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="block text-[10px] text-slate-500 font-bold uppercase">Gross Yards (Gry)</span>
                <span className="text-sm font-mono font-bold text-purple-700">{estGry} Gry</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="block text-[10px] text-slate-500 font-bold uppercase">Est. Net Wt</span>
                <span className="text-sm font-mono font-bold text-emerald-700">{estKg} Kg</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="block text-[10px] text-slate-500 font-bold uppercase">Yards (Yds)</span>
                <span className="text-sm font-mono font-bold text-slate-800">{Math.round(requiredQtyMtr / 0.9144).toLocaleString()} Yds</span>
              </div>
            </div>
          </div>

          {/* Priority & Status Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {lang === 'en' ? 'Priority Level' : 'অগ্রাধিকার লেভেল (Priority)'}
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['low', 'normal', 'high', 'urgent'] as DemandPriority[]).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`py-1.5 text-xs font-bold rounded-lg border capitalize transition cursor-pointer ${
                      priority === p
                        ? p === 'urgent'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                          : p === 'high'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                          : p === 'normal'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-slate-700 text-white border-slate-700 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {lang === 'en' ? 'Fulfillment Status' : 'বর্তমান অবস্থা (Status)'}
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as DemandStatus)}
                className="w-full px-3 py-2 text-sm font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="pending">⏳ Pending (অপেক্ষমাণ)</option>
                <option value="in_production">⚙️ In Production (চলমান)</option>
                <option value="packed">📦 Packed (প্যাকিং সম্পন্ন)</option>
                <option value="completed">✅ Completed / Dispatched (ডেলিভারি সম্পন্ন)</option>
                <option value="cancelled">❌ Cancelled (বাতিল)</option>
              </select>
            </div>
          </div>

          {/* Notes / Special Instructions */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              {lang === 'en' ? 'Notes & Customer Instructions' : 'নোট ও কাস্টমার নির্দেশনা'}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. GOODS customer NEED IN THIS REF, urgent container dispatch..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              {lang === 'en' ? 'Cancel' : 'বাতিল'}
            </button>
            <button
              type="submit"
              className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              {editingDemand 
                ? (lang === 'en' ? 'Update Demand' : 'চাহিদা আপডেট করুন')
                : (lang === 'en' ? 'Save Elastic Demand' : 'চাহিদা সংরক্ষণ করুন')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
