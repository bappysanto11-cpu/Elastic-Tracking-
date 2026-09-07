import React, { useState, useEffect, useRef, memo } from 'react';
import { CartonRow } from '../types/calculator';
import { Language } from '../utils/translations';
import { CartonDeviation } from '../utils/deviationDetector';
import { parseRawWeightData } from '../utils/calc';
import {
  Trash2,
  Copy,
  AlertTriangle,
  QrCode,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  Edit3,
  TrendingUp,
  TrendingDown,
  Zap
} from 'lucide-react';

export interface CartonTableRowProps {
  carton: CartonRow;
  index: number;
  isFocused: boolean;
  isChecked: boolean;
  wUnit: string;
  lang: Language;
  groupBy: 'none' | 'color' | 'size';
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
  converterState: { id: string; mode: 'yds' | 'mtr' | 'lb'; value: string } | null;
  onSelectRow: (id: string, shiftKey: boolean) => void;
  onToggleSelection: (id: string, shiftKey: boolean) => void;
  onUpdateCarton: (id: string, updated: Partial<CartonRow>) => void;
  onDeleteCarton: (id: string) => void;
  onDuplicateCarton: (carton: CartonRow) => void;
  onOpenCartonQr?: (carton: CartonRow) => void;
  onInspect: (id: string) => void;
  onFixField: (cartonId: string, field: 'wtPerUnit' | 'tareWt', value: number) => void;
  onStartConversion: (id: string, mode: 'yds' | 'mtr' | 'lb') => void;
  onApplyConversion: () => void;
  onCancelConversion: () => void;
  onConversionChange: (value: string) => void;
  onNavigateRow: (direction: 'up' | 'down', currentId: string) => void;
  onBulkPasteWeights?: (
    weights: number[],
    mode?: 'append' | 'replace' | 'fromIndex',
    startIndex?: number,
    customTare?: number,
    customUnitWt?: number
  ) => void;
  registerGrossInputRef: (id: string, el: HTMLInputElement | null) => void;
  registerRowRef: (id: string, el: HTMLTableRowElement | null) => void;
}

export const CartonTableRow = memo<CartonTableRowProps>(({
  carton,
  index,
  isFocused,
  isChecked,
  wUnit,
  lang,
  groupBy,
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
  converterState,
  onSelectRow,
  onToggleSelection,
  onUpdateCarton,
  onDeleteCarton,
  onDuplicateCarton,
  onOpenCartonQr,
  onInspect,
  onFixField,
  onStartConversion,
  onApplyConversion,
  onCancelConversion,
  onConversionChange,
  onNavigateRow,
  onBulkPasteWeights,
  registerGrossInputRef,
  registerRowRef,
}) => {
  // Local Gross Weight editing state to prevent full-table re-renders while typing
  const [localGross, setLocalGross] = useState<string | null>(null);
  const isEditingGrossRef = useRef<boolean>(false);

  const displayGrossValue = localGross !== null 
    ? localGross 
    : carton.grossWt === 0 
    ? '' 
    : carton.grossWt.toString();

  const isNegativeNet = (carton.grossWt > 0 && carton.netWt < 0) || carton.netWt < 0;
  const isActive = carton.netWt !== 0 || carton.grossWt > 0;

  // Batch Weight Average Deviation Analysis for this carton
  const grossDiff = carton.grossWt - batchAvgGrossWt;
  const grossDevPercent = batchAvgGrossWt > 0 && carton.grossWt > 0 ? (grossDiff / batchAvgGrossWt) * 100 : 0;
  const isGrossDeviating = Math.abs(grossDevPercent) >= weightDevThresholdPercent;
  const isOverweightAvg = isGrossDeviating && grossDevPercent > 0;

  const netDiff = carton.netWt - batchAvgNetWt;
  const netDevPercent = batchAvgNetWt > 0 && carton.netWt > 0 ? (netDiff / batchAvgNetWt) * 100 : 0;
  const isNetDeviating = Math.abs(netDevPercent) >= weightDevThresholdPercent;

  const isConverting = converterState?.id === carton.id;

  const getGroupColor = (val?: string) => {
    if (!val) return 'transparent';
    let hash = 0;
    for (let i = 0; i < val.length; i++) {
      hash = val.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 94%)`;
  };

  const rowBgColor = groupBy !== 'none' ? getGroupColor(carton[groupBy]) : undefined;

  return (
    <tr
      ref={el => registerRowRef(carton.id, el)}
      style={rowBgColor ? { backgroundColor: rowBgColor } : undefined}
      onClick={(e) => {
        if (e.shiftKey) {
          onToggleSelection(carton.id, true);
        } else {
          onSelectRow(carton.id, false);
        }
      }}
      className={`transition-colors duration-75 cursor-pointer relative ${
        isFocused
          ? hasCriticalDev
            ? 'bg-red-100/95 text-red-950 border-l-4 border-l-red-600 ring-2 ring-inset ring-red-500/80 shadow-xs z-10'
            : hasWarningDev
            ? 'bg-amber-100/95 text-amber-950 border-l-4 border-l-amber-500 ring-2 ring-inset ring-amber-500/80 shadow-xs z-10'
            : isChecked
            ? 'bg-indigo-100/95 font-medium border-l-4 border-l-indigo-600 ring-2 ring-inset ring-indigo-500/80 shadow-xs z-10'
            : 'bg-blue-50/95 text-slate-950 font-medium border-l-4 border-l-blue-600 ring-2 ring-inset ring-blue-500/80 shadow-xs z-10'
          : hasCriticalDev
          ? 'bg-red-50/90 hover:bg-red-100/90 text-red-950 border-l-4 border-l-red-600'
          : hasWarningDev
          ? 'bg-amber-50/80 hover:bg-amber-100/80 text-amber-950 border-l-4 border-l-amber-500'
          : isChecked
          ? 'bg-indigo-50/90 font-medium border-l-4 border-l-indigo-600 ring-1 ring-inset ring-indigo-200'
          : isGrossDeviating
          ? isOverweightAvg
            ? 'bg-amber-50/60 hover:bg-amber-100/60 font-medium border-l-4 border-l-amber-500'
            : 'bg-sky-50/60 hover:bg-sky-100/60 font-medium border-l-4 border-l-sky-500'
          : isCompliantWithDemand
          ? 'bg-emerald-50/30 hover:bg-emerald-50/60 font-medium border-l-4 border-l-emerald-500'
          : isActive 
          ? 'bg-white font-medium hover:bg-slate-50/80 border-l-4 border-l-transparent' 
          : 'bg-slate-50/50 text-slate-400 hover:bg-slate-100/60 border-l-4 border-l-transparent'
      }`}
    >
      {/* Selection Checkbox */}
      <td 
        className={`py-2 px-3 text-center border-r border-slate-200 ${
          isChecked ? 'bg-indigo-100/60' : isFocused ? 'bg-blue-100/40' : 'bg-transparent'
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelection(carton.id, e.shiftKey);
        }}
      >
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => {}} // Handled by td onClick
            className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
          />
        </div>
      </td>

      {/* CTN # with Active/Editing Beacon and Quality Flag */}
      <td className={`py-2 px-2 text-center font-bold border-r ${
        isFocused
          ? 'bg-blue-100/90 text-blue-950 border-blue-300 font-black'
          : hasCriticalDev
          ? 'bg-red-100/80 text-red-900 border-red-200'
          : hasWarningDev
          ? 'bg-amber-100/80 text-amber-950 border-amber-200'
          : isChecked
          ? 'bg-indigo-100/80 text-indigo-950 border-indigo-200 font-black'
          : 'text-slate-800 border-slate-200 bg-slate-100/60'
      }`}>
        <div className="flex items-center justify-center gap-1">
          {/* Active Editing Row Pulse Beacon */}
          {isFocused && (
            <span 
              className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white shrink-0 shadow-2xs animate-pulse"
              title={lang === 'en' ? 'Active / Editing Carton' : 'সক্রিয় / এডিটিং কার্টন'}
            >
              <Edit3 className="w-2.5 h-2.5" />
            </span>
          )}

          {/* Quality Flag Beacon */}
          {hasCriticalDev ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onInspect(carton.id);
              }}
              className="p-0.5 text-red-600 hover:bg-red-200 rounded shrink-0 transition"
              title={lang === 'en' ? 'Click to inspect critical packing deviation!' : 'প্যাকিং ত্রুটি বিস্তারিত দেখতে ক্লিক করুন!'}
            >
              <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
            </button>
          ) : hasWarningDev ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onInspect(carton.id);
              }}
              className="p-0.5 text-amber-600 hover:bg-amber-200 rounded shrink-0 transition"
              title={lang === 'en' ? 'Click to inspect packing warning!' : 'প্যাকিং সতর্কতা বিস্তারিত দেখতে ক্লিক করুন!'}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
            </button>
          ) : isGrossDeviating ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onInspect(carton.id);
              }}
              className={`p-0.5 rounded shrink-0 transition cursor-pointer ${isOverweightAvg ? 'text-amber-700 hover:bg-amber-200' : 'text-sky-700 hover:bg-sky-200'}`}
              title={
                lang === 'en'
                  ? `Weight deviates by ${isOverweightAvg ? '+' : ''}${grossDevPercent.toFixed(1)}% from batch average (${batchAvgGrossWt.toFixed(2)} ${wUnit}). Click to inspect!`
                  : `ব্যাচ গড় (${batchAvgGrossWt.toFixed(2)} ${wUnit}) থেকে ওজন ${isOverweightAvg ? '+' : ''}${grossDevPercent.toFixed(1)}% বিচ্যুত। বিস্তারিত দেখতে ক্লিক করুন!`
              }
            >
              {isOverweightAvg ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            </button>
          ) : isCompliantWithDemand ? (
            <span 
              className="p-0.5 text-emerald-600 shrink-0 inline-block"
              title={lang === 'en' ? '100% Demand Compliant' : 'চাহিদার সাথে শতভাগ সামঞ্জস্যপূর্ণ'}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
            </span>
          ) : null}

          <input
            type="number"
            value={carton.cartonNo}
            onFocus={() => onSelectRow(carton.id, false)}
            onChange={e => onUpdateCarton(carton.id, { cartonNo: parseInt(e.target.value) || index + 1 })}
            className={`w-10 text-center font-bold focus:outline-none rounded ${
              isFocused ? 'bg-white shadow-2xs border border-blue-400 text-blue-950 font-black' : 'bg-transparent'
            }`}
          />
        </div>
      </td>

      {/* Gross Wt */}
      <td className="py-1.5 px-2 text-right border-r border-slate-200">
        {isConverting ? (
          <div className="flex items-center justify-end gap-1">
            <span className="text-[9px] font-bold text-orange-600 bg-orange-100 px-1 py-0.5 rounded uppercase leading-none shadow-xs border border-orange-200">
              {converterState.mode} → Kg
            </span>
            <input
              autoFocus
              type="number"
              step="any"
              value={converterState.value}
              onChange={e => onConversionChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onApplyConversion();
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  onCancelConversion();
                }
              }}
              onBlur={onApplyConversion}
              className="w-16 sm:w-20 text-right px-1.5 py-1 text-xs font-bold rounded focus:outline-none border-2 border-orange-400 bg-orange-50 text-orange-950 shadow-inner"
              placeholder={converterState.mode}
            />
          </div>
        ) : (
          <div className="flex items-center justify-end gap-0.5">
            {isFocused && (
              <div className="flex flex-col justify-center gap-0.5 opacity-60 hover:opacity-100 transition-opacity pr-1 border-r border-slate-200 mr-1">
                <button 
                  tabIndex={-1} 
                  onMouseDown={(e) => { e.preventDefault(); onStartConversion(carton.id, 'yds'); }} 
                  className="text-[7px] leading-none tracking-tighter bg-slate-200 hover:bg-slate-300 hover:text-indigo-700 px-1 py-0.5 rounded font-bold text-slate-600 cursor-pointer uppercase" 
                  title="Calculate Gross Kg from Yards"
                >
                  Yds
                </button>
                <button 
                  tabIndex={-1} 
                  onMouseDown={(e) => { e.preventDefault(); onStartConversion(carton.id, 'mtr'); }} 
                  className="text-[7px] leading-none tracking-tighter bg-slate-200 hover:bg-slate-300 hover:text-indigo-700 px-1 py-0.5 rounded font-bold text-slate-600 cursor-pointer uppercase" 
                  title="Calculate Gross Kg from Meters"
                >
                  Mtr
                </button>
                <button 
                  tabIndex={-1} 
                  onMouseDown={(e) => { e.preventDefault(); onStartConversion(carton.id, 'lb'); }} 
                  className="text-[7px] leading-none tracking-tighter bg-slate-200 hover:bg-slate-300 hover:text-indigo-700 px-1 py-0.5 rounded font-bold text-slate-600 cursor-pointer uppercase" 
                  title="Convert Lbs to Gross Kg"
                >
                  Lbs
                </button>
              </div>
            )}
            <input
              ref={el => registerGrossInputRef(carton.id, el)}
              type="number"
              step="any"
              min="0"
              value={displayGrossValue}
              onFocus={() => {
                onSelectRow(carton.id, false);
                isEditingGrossRef.current = true;
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
                isEditingGrossRef.current = false;
                if (localGross !== null) {
                  const parsed = parseFloat(localGross);
                  const finalVal = isNaN(parsed) || parsed < 0 ? 0 : parsed;
                  onUpdateCarton(carton.id, { grossWt: finalVal });
                  setLocalGross(null);
                }
              }}
              onPaste={e => {
                const pasteText = e.clipboardData?.getData('text') || '';
                const weights = parseRawWeightData(pasteText);
                if (weights.length > 1 || pasteText.includes('\n') || pasteText.includes('\t') || (pasteText.includes(',') && weights.length > 1)) {
                  e.preventDefault();
                  if (onBulkPasteWeights) {
                    onBulkPasteWeights(weights, 'fromIndex', index);
                  }
                }
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  onNavigateRow('down', carton.id);
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  onNavigateRow('up', carton.id);
                }
              }}
              placeholder="0.00"
              className={`w-20 sm:w-24 text-right px-2 py-1 font-bold rounded focus:outline-none transition ${
                isNegativeNet
                  ? 'bg-white border-2 border-red-500 text-red-900 focus:ring-2 focus:ring-red-500'
                  : isFocused
                  ? 'text-slate-950 bg-white border-2 border-blue-500 shadow-xs focus:ring-2 focus:ring-blue-400 font-black'
                  : isChecked
                  ? 'text-slate-950 bg-white border border-indigo-400 shadow-xs focus:ring-2 focus:ring-indigo-400'
                  : 'text-slate-900 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
              }`}
            />
          </div>
        )}
        {/* Batch Average Gross Weight Deviation Badge */}
        {batchAvgGrossWt > 0 && carton.grossWt > 0 && isGrossDeviating && (
          <div 
            className={`mt-1 flex items-center justify-end gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold leading-none border shadow-2xs ${
              isOverweightAvg
                ? 'bg-amber-100/90 text-amber-950 border-amber-300' 
                : 'bg-sky-100/90 text-sky-950 border-sky-300'
            }`}
            title={
              lang === 'en'
                ? `Carton Gross Wt (${carton.grossWt.toFixed(2)} ${wUnit}) deviates by ${isOverweightAvg ? '+' : ''}${grossDevPercent.toFixed(1)}% from Batch Avg (${batchAvgGrossWt.toFixed(2)} ${wUnit})`
                : `কার্টন গ্রস ওজন (${carton.grossWt.toFixed(2)} ${wUnit}) ব্যাচ গড় (${batchAvgGrossWt.toFixed(2)} ${wUnit}) থেকে ${isOverweightAvg ? '+' : ''}${grossDevPercent.toFixed(1)}% বিচ্যুত`
            }
          >
            {isOverweightAvg ? (
              <TrendingUp className="w-2.5 h-2.5 text-amber-800 shrink-0" />
            ) : (
              <TrendingDown className="w-2.5 h-2.5 text-sky-800 shrink-0" />
            )}
            <span>{isOverweightAvg ? '+' : ''}{grossDevPercent.toFixed(1)}% {lang === 'en' ? 'vs avg' : 'গড় থেকে'}</span>
          </div>
        )}
      </td>

      {/* Tare Wt */}
      <td className="py-1.5 px-2 text-right border-r border-slate-200">
        <div className="flex items-center justify-end gap-1">
          <input
            type="number"
            step="0.01"
            min="0"
            value={carton.tareWt}
            onFocus={() => onSelectRow(carton.id, false)}
            onChange={e => {
              const val = parseFloat(e.target.value) || 0;
              onUpdateCarton(carton.id, { tareWt: val });
            }}
            className={`w-16 text-right px-2 py-1 text-slate-600 border rounded focus:bg-white focus:border-slate-400 focus:outline-none ${
              tareDev 
                ? 'border-amber-400 bg-amber-50/50 text-amber-900 font-bold' 
                : isFocused
                ? 'bg-white border-blue-300 text-slate-900 shadow-2xs font-semibold'
                : 'bg-transparent border-transparent hover:border-slate-200'
            }`}
          />
          {tareDev && activeDemandTare !== undefined && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onFixField(carton.id, 'tareWt', activeDemandTare);
              }}
              className="text-[10px] bg-amber-200 hover:bg-amber-300 text-amber-900 font-sans font-bold px-1 py-0.5 rounded shrink-0 cursor-pointer"
              title={lang === 'en' ? `Set Tare to demand standard: ${activeDemandTare} ${wUnit}` : `ট্যার চাহিদার মান ${activeDemandTare} ${wUnit} সেট করুন`}
            >
              Fix
            </button>
          )}
        </div>
      </td>

      {/* Net Wt */}
      <td className={`py-1.5 px-3 text-right font-bold border-r border-slate-200 text-xs ${
        isNegativeNet
          ? 'bg-red-100 text-red-700 font-black'
          : underpackDev || overpackDev
          ? 'bg-amber-100/70 text-amber-950 font-black'
          : isChecked
          ? 'text-emerald-900 bg-emerald-100/70 font-black'
          : isFocused
          ? 'text-emerald-900 bg-emerald-100/70 font-black'
          : 'text-emerald-700 bg-emerald-50/30'
      }`}>
        <div className="flex items-center justify-end gap-1">
          {isNegativeNet && (
            <span title={lang === 'en' ? 'Gross weight is less than tare weight!' : 'গ্রস ওজন ট্যার ওজনের চেয়ে কম!'}>
              <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0 inline" />
            </span>
          )}
          <span>{carton.netWt.toFixed(2)}</span>
        </div>
        {isNegativeNet ? (
          <div className="text-[9px] font-sans font-bold text-red-600 tracking-tight leading-none mt-0.5">
            {lang === 'en' ? 'Gross < Tare' : 'গ্রস < ট্যার'}
          </div>
        ) : underpackDev ? (
          <div className="text-[9px] font-sans font-bold text-amber-700 tracking-tight leading-none mt-0.5">
            {lang === 'en' ? '⚠️ Underpacked' : '⚠️ কম প্যাক'}
          </div>
        ) : overpackDev ? (
          <div className="text-[9px] font-sans font-bold text-amber-700 tracking-tight leading-none mt-0.5">
            {lang === 'en' ? '⚠️ Overpacked' : '⚠️ অতিরিক্ত প্যাক'}
          </div>
        ) : isNetDeviating && batchAvgNetWt > 0 && carton.netWt > 0 ? (
          <div 
            className={`text-[9px] font-mono font-bold tracking-tight leading-none mt-0.5 flex items-center justify-end gap-0.5 ${
              netDevPercent > 0 ? 'text-amber-800' : 'text-sky-800'
            }`}
            title={
              lang === 'en'
                ? `Net Wt deviates by ${netDevPercent > 0 ? '+' : ''}${netDevPercent.toFixed(1)}% from Batch Net Avg (${batchAvgNetWt.toFixed(2)} ${wUnit})`
                : `নেট ওজন ব্যাচ গড় থেকে ${netDevPercent > 0 ? '+' : ''}${netDevPercent.toFixed(1)}% বিচ্যুত`
            }
          >
            <span>{netDevPercent > 0 ? '▲' : '▼'} Net {netDevPercent > 0 ? '+' : ''}{netDevPercent.toFixed(1)}%</span>
          </div>
        ) : null}
      </td>

      {/* Wt/Unit */}
      <td className="py-1.5 px-2 text-right border-r border-slate-200">
        <div className="flex items-center justify-end gap-1">
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={carton.wtPerUnit}
            onFocus={() => onSelectRow(carton.id, false)}
            onChange={e => {
              const val = parseFloat(e.target.value) || 30;
              onUpdateCarton(carton.id, { wtPerUnit: val });
            }}
            className={`w-16 sm:w-20 text-right px-2 py-1 font-semibold rounded focus:bg-white focus:outline-none ${
              unitWtDev
                ? 'border-2 border-red-500 bg-red-100/70 text-red-950 font-bold focus:ring-1 focus:ring-red-500'
                : isFocused
                ? 'bg-white border-blue-300 text-slate-900 shadow-2xs font-bold'
                : 'text-slate-800 bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-500'
            }`}
          />
          {unitWtDev && activeDemandUnitWt !== undefined && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onFixField(carton.id, 'wtPerUnit', activeDemandUnitWt);
              }}
              className="text-[10px] bg-red-600 hover:bg-red-700 text-white font-sans font-bold px-1.5 py-0.5 rounded shadow-xs shrink-0 cursor-pointer transition flex items-center gap-0.5"
              title={lang === 'en' ? `Fix Unit Wt to Demand Requirement: ${activeDemandUnitWt} gm/m` : `চাহিদা অনুযায়ী ইউনিট ওজন ${activeDemandUnitWt} gm/m সেট করুন`}
            >
              <Zap className="w-2.5 h-2.5" />
              <span>Fix</span>
            </button>
          )}
        </div>
        {unitWtDev && (
          <div className="text-[9px] font-sans font-bold text-red-700 tracking-tight leading-none mt-0.5 text-right">
            Exp: {activeDemandUnitWt}g ({unitWtDev.percentDiff !== undefined ? `${unitWtDev.percentDiff > 0 ? '+' : ''}${unitWtDev.percentDiff.toFixed(0)}%` : ''})
          </div>
        )}
      </td>

      {/* Length (Mtr) */}
      <td className={`py-1.5 px-3 text-right font-black border-r border-slate-200 text-xs ${
        isChecked ? 'text-indigo-950 bg-indigo-100/80' : isFocused ? 'text-indigo-950 bg-indigo-100/70 font-black' : 'text-indigo-700 bg-indigo-50/40'
      }`}>
        {carton.lengthMtr.toFixed(2)}
      </td>

      {/* Length (Gry) */}
      <td className={`py-1.5 px-3 text-right font-black border-r border-slate-200 text-xs ${
        isChecked ? 'text-purple-950 bg-purple-100/80' : isFocused ? 'text-purple-950 bg-purple-100/70 font-black' : 'text-purple-700 bg-purple-50/40'
      }`}>
        {carton.lengthGry.toFixed(2)}
      </td>

      {/* Length (Yds) */}
      <td className="py-1.5 px-3 text-right text-slate-500 border-r border-slate-200 text-xs">
        {carton.lengthYds ? carton.lengthYds.toFixed(2) : '0.00'}
      </td>

      {/* Notes */}
      <td className="py-1.5 px-2 border-r border-slate-200">
        <input
          type="text"
          value={carton.notes || ''}
          onFocus={() => onSelectRow(carton.id, false)}
          onChange={e => onUpdateCarton(carton.id, { notes: e.target.value })}
          placeholder="..."
          className={`w-full px-2 py-1 text-slate-700 font-sans text-xs rounded focus:bg-white focus:border-slate-300 focus:outline-none ${
            isFocused ? 'bg-white border border-blue-200 shadow-2xs' : 'bg-transparent border border-transparent hover:border-slate-200'
          }`}
        />
      </td>

      {/* Actions */}
      <td className="py-1.5 px-2 text-center">
        <div className="flex items-center justify-center gap-1">
          {onOpenCartonQr && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenCartonQr(carton);
              }}
              className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition cursor-pointer"
              title={lang === 'en' ? 'Scan & Preview Carton QR' : 'কার্টন কিউআর কোড দেখুন'}
            >
              <QrCode className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicateCarton(carton);
            }}
            className="p-1 text-slate-400 hover:text-indigo-600 rounded transition cursor-pointer"
            title={lang === 'en' ? 'Duplicate (Ctrl+D)' : 'ডুপ্লিকেট (Ctrl+D)'}
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteCarton(carton.id);
            }}
            className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
            title={lang === 'en' ? 'Delete Row (Ctrl+Delete)' : 'সারি মুছুন (Ctrl+Delete)'}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
});

CartonTableRow.displayName = 'CartonTableRow';
