import React, { useState, useRef, memo } from 'react';
import { CartonRow } from '../types/calculator';
import { Language } from '../utils/translations';
import { CartonDeviation } from '../utils/deviationDetector';
import {
  Trash2,
  Copy,
  AlertTriangle,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Zap,
  Scale,
  Hash,
  Layers,
  FileText
} from 'lucide-react';

export interface CartonMobileCardProps {
  carton: CartonRow;
  index: number;
  isFocused: boolean;
  isChecked: boolean;
  wUnit: string;
  lang: Language;
  cartonDevs: CartonDeviation[];
  hasCriticalDev: boolean;
  hasWarningDev: boolean;
  unitWtDev?: CartonDeviation;
  tareDev?: CartonDeviation;
  underpackDev?: CartonDeviation;
  overpackDev?: CartonDeviation;
  isCompliantWithDemand: boolean;
  batchAvgGrossWt: number;
  batchAvgNetWt: number;
  weightDevThresholdPercent: number;
  activeDemandTare?: number;
  activeDemandUnitWt?: number;
  onSelectRow: (id: string, shiftKey: boolean) => void;
  onToggleSelection: (id: string, shiftKey: boolean) => void;
  onUpdateCarton: (id: string, updated: Partial<CartonRow>) => void;
  onDeleteCarton: (id: string) => void;
  onDuplicateCarton: (carton: CartonRow) => void;
  onOpenCartonQr?: (carton: CartonRow) => void;
  onInspect: (id: string) => void;
  onFixField: (cartonId: string, field: 'wtPerUnit' | 'tareWt', value: number) => void;
  registerGrossInputRef: (id: string, el: HTMLInputElement | null) => void;
}

export const CartonMobileCard = memo<CartonMobileCardProps>(({
  carton,
  index,
  isFocused,
  isChecked,
  wUnit,
  lang,
  cartonDevs,
  hasCriticalDev,
  hasWarningDev,
  unitWtDev,
  tareDev,
  underpackDev,
  overpackDev,
  isCompliantWithDemand,
  batchAvgGrossWt,
  batchAvgNetWt,
  weightDevThresholdPercent,
  activeDemandTare,
  activeDemandUnitWt,
  onSelectRow,
  onToggleSelection,
  onUpdateCarton,
  onDeleteCarton,
  onDuplicateCarton,
  onOpenCartonQr,
  onInspect,
  onFixField,
  registerGrossInputRef,
}) => {
  const [localGross, setLocalGross] = useState<string | null>(null);

  const displayGrossValue = localGross !== null 
    ? localGross 
    : carton.grossWt === 0 
    ? '' 
    : carton.grossWt.toString();

  const isNegativeNet = (carton.grossWt > 0 && carton.netWt < 0) || carton.netWt < 0;

  // Average weight deviations
  const grossDiff = carton.grossWt - batchAvgGrossWt;
  const grossDevPercent = batchAvgGrossWt > 0 && carton.grossWt > 0 ? (grossDiff / batchAvgGrossWt) * 100 : 0;
  const isGrossDeviating = Math.abs(grossDevPercent) >= weightDevThresholdPercent;
  const isOverweightAvg = isGrossDeviating && grossDevPercent > 0;

  return (
    <div
      onClick={() => onSelectRow(carton.id, false)}
      className={`rounded-xl p-3.5 border transition-all ${
        isFocused
          ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-300/60 shadow-sm'
          : isChecked
          ? 'bg-indigo-50/70 border-indigo-400 ring-1 ring-indigo-300'
          : hasCriticalDev
          ? 'bg-red-50/60 border-red-300'
          : hasWarningDev
          ? 'bg-amber-50/60 border-amber-300'
          : 'bg-white border-slate-200 shadow-2xs hover:border-slate-300'
      }`}
    >
      {/* Top Header Row: Selection, Carton Number, Badges, Action Icons */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelection(carton.id, false);
            }}
            className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
          />
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
              CTN #{carton.cartonNo}
            </span>
            {isFocused && (
              <span className="text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded leading-none">
                {lang === 'en' ? 'Active' : 'সক্রিয়'}
              </span>
            )}
          </div>
        </div>

        {/* Quality Badges & Quick Row Action Icons */}
        <div className="flex items-center gap-1.5">
          {hasCriticalDev ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onInspect(carton.id);
              }}
              className="p-1 text-red-600 bg-red-100 rounded-md transition"
              title="Inspect critical issue"
            >
              <ShieldAlert className="w-4 h-4" />
            </button>
          ) : hasWarningDev ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onInspect(carton.id);
              }}
              className="p-1 text-amber-600 bg-amber-100 rounded-md transition"
              title="Inspect warning"
            >
              <AlertTriangle className="w-4 h-4" />
            </button>
          ) : isCompliantWithDemand ? (
            <span className="p-1 text-emerald-600 bg-emerald-100 rounded-md">
              <ShieldCheck className="w-4 h-4" />
            </span>
          ) : null}

          {onOpenCartonQr && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenCartonQr(carton);
              }}
              className="p-1.5 text-slate-500 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 rounded-lg transition"
              title="QR Code"
            >
              <QrCode className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicateCarton(carton);
            }}
            className="p-1.5 text-slate-500 hover:text-indigo-700 bg-slate-100 hover:bg-indigo-50 rounded-lg transition"
            title="Duplicate"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteCarton(carton.id);
            }}
            className="p-1.5 text-slate-500 hover:text-rose-700 bg-slate-100 hover:bg-rose-50 rounded-lg transition"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Grid: Gross, Tare, Net, Wt/Unit */}
      <div className="grid grid-cols-2 gap-2.5 mb-2.5">
        
        {/* Gross Weight */}
        <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/80">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1">
            <span className="flex items-center gap-1">
              <Scale className="w-3 h-3 text-indigo-600" />
              {lang === 'en' ? 'Gross Wt' : 'গ্রস ওজন'}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">{wUnit}</span>
          </div>
          <input
            ref={el => registerGrossInputRef(carton.id, el)}
            type="number"
            step="any"
            min="0"
            value={displayGrossValue}
            placeholder="0.00"
            onFocus={() => {
              onSelectRow(carton.id, false);
              setLocalGross(carton.grossWt === 0 ? '' : carton.grossWt.toString());
            }}
            onChange={e => {
              const raw = e.target.value;
              setLocalGross(raw);
              if (raw === '' || raw === '-') {
                onUpdateCarton(carton.id, { grossWt: 0 });
              } else {
                const parsed = parseFloat(raw);
                if (!isNaN(parsed) && parsed >= 0) {
                  onUpdateCarton(carton.id, { grossWt: parsed });
                }
              }
            }}
            onBlur={() => {
              if (localGross !== null) {
                const parsed = parseFloat(localGross);
                const finalVal = isNaN(parsed) || parsed < 0 ? 0 : parsed;
                onUpdateCarton(carton.id, { grossWt: finalVal });
                setLocalGross(null);
              }
            }}
            className={`w-full py-1.5 px-2.5 text-base font-black font-mono text-right rounded-md border focus:outline-none transition ${
              isNegativeNet
                ? 'bg-red-50 border-red-400 text-red-900'
                : 'bg-white border-slate-300 text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
            }`}
          />

        </div>

        {/* Net Weight (Calculated) */}
        <div className={`p-2 rounded-lg border flex flex-col justify-between ${
          isNegativeNet
            ? 'bg-red-50 border-red-300 text-red-900'
            : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
        }`}>
          <div className="flex items-center justify-between text-[11px] font-semibold">
            <span className="flex items-center gap-1">
              <Scale className="w-3 h-3 text-emerald-600" />
              {lang === 'en' ? 'Net Wt' : 'নেট ওজন'}
            </span>
            <span className="text-[10px] opacity-75 font-mono">{wUnit}</span>
          </div>
          <div className="my-auto py-1 text-right">
            <span className="text-xl font-black font-mono">
              {carton.netWt.toFixed(2)}
            </span>
          </div>
          <div className="text-[10px] font-semibold text-right">
            {isNegativeNet ? (
              <span className="text-red-700 font-bold">⚠️ Gross &lt; Tare</span>
            ) : underpackDev ? (
              <span className="text-amber-800 font-bold">⚠️ Underpack</span>
            ) : overpackDev ? (
              <span className="text-amber-800 font-bold">⚠️ Overpack</span>
            ) : (
              <span className="text-emerald-700 font-medium">Auto-computed</span>
            )}
          </div>
        </div>

        {/* Tare Weight */}
        <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/80">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1">
            <span>{lang === 'en' ? 'Tare' : 'ট্যার'} ({wUnit})</span>
            {tareDev && activeDemandTare !== undefined && (
              <button
                type="button"
                onClick={() => onFixField(carton.id, 'tareWt', activeDemandTare)}
                className="text-[10px] bg-amber-200 text-amber-900 font-bold px-1 py-0.2 rounded hover:bg-amber-300 cursor-pointer"
              >
                Fix
              </button>
            )}
          </div>
          <input
            type="number"
            step="0.01"
            min="0"
            value={carton.tareWt}
            onChange={e => onUpdateCarton(carton.id, { tareWt: parseFloat(e.target.value) || 0 })}
            className={`w-full py-1 px-2 text-xs font-mono text-right rounded border bg-white focus:outline-none ${
              tareDev ? 'border-amber-400 bg-amber-50/50 text-amber-900 font-bold' : 'border-slate-300 text-slate-800'
            }`}
          />
        </div>

        {/* Unit Weight */}
        <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/80">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1">
            <span>{lang === 'en' ? 'Wt/Unit (gm)' : 'ইউনিট ওজন'}</span>
            {unitWtDev && activeDemandUnitWt !== undefined && (
              <button
                type="button"
                onClick={() => onFixField(carton.id, 'wtPerUnit', activeDemandUnitWt)}
                className="text-[10px] bg-red-600 text-white font-bold px-1 py-0.2 rounded hover:bg-red-700 cursor-pointer flex items-center gap-0.5"
              >
                <Zap className="w-2.5 h-2.5" />
                <span>Fix</span>
              </button>
            )}
          </div>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={carton.wtPerUnit}
            onChange={e => onUpdateCarton(carton.id, { wtPerUnit: parseFloat(e.target.value) || 30 })}
            className={`w-full py-1 px-2 text-xs font-mono text-right rounded border bg-white focus:outline-none ${
              unitWtDev ? 'border-red-400 bg-red-50 text-red-950 font-bold' : 'border-slate-300 text-slate-800'
            }`}
          />
        </div>

      </div>

      {/* Bottom Summary Strip: Lengths & Notes */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span className="text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded font-bold border border-indigo-100">
            {carton.lengthMtr.toFixed(2)} Mtr
          </span>
          <span className="text-purple-900 bg-purple-50 px-2 py-0.5 rounded font-bold border border-purple-100">
            {carton.lengthGry.toFixed(2)} Gry
          </span>
        </div>

        <div className="flex-1 max-w-[150px] ml-2">
          <input
            type="text"
            value={carton.notes || ''}
            placeholder={lang === 'en' ? 'Add note...' : 'নোট...'}
            onChange={e => onUpdateCarton(carton.id, { notes: e.target.value })}
            className="w-full text-right text-[11px] px-2 py-0.5 rounded border border-transparent hover:border-slate-200 focus:border-slate-300 focus:bg-white bg-slate-50 text-slate-600 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
});

CartonMobileCard.displayName = 'CartonMobileCard';
