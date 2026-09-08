import React from 'react';
import { PackingSheetData } from '../types/calculator';
import { Language, translations } from '../utils/translations';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line,
  Scatter
} from 'recharts';

interface AnalyticsViewProps {
  sheetData: PackingSheetData;
  lang: Language;
}

export function AnalyticsView({ sheetData, lang }: AnalyticsViewProps) {
  const t = translations[lang];

  // Filter out empty rows that haven't been filled
  const activeCartons = sheetData.cartons.filter(c => c.grossWt > 0 || c.netWt > 0);

  const chartData = activeCartons.map(c => ({
    name: `Ctn ${c.cartonNo}`,
    grossWt: c.grossWt,
    netWt: c.netWt,
    tareWt: c.tareWt,
  }));

  if (activeCartons.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center min-h-[400px] flex items-center justify-center">
        <p className="text-slate-500 text-lg">No data available for analytics. Add some cartons first.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-8">
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Weight Distribution (Gross vs Net)</h2>
        <p className="text-sm text-slate-500 mb-6">
          Compare gross and net weights across cartons to identify packing inconsistencies or anomalous tare weights.
        </p>
        
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#64748b', fontSize: 12 }} 
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <YAxis 
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                label={{ value: 'Weight (kg)', angle: -90, position: 'insideLeft', style: { fill: '#64748b' } }}
              />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="grossWt" name="Gross Wt" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={32} />
              <Bar dataKey="netWt" name="Net Wt" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={32} />
              <Line type="monotone" dataKey="tareWt" name="Tare Wt" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="pt-6 border-t border-slate-100">
        <h2 className="text-xl font-bold text-slate-800 mb-2">Net Weight Consistency</h2>
        <p className="text-sm text-slate-500 mb-6">
          Visualize net weight variations. An ideal production run should have a relatively flat line.
        </p>

        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#64748b', fontSize: 12 }} 
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <YAxis 
                domain={['dataMin - 1', 'dataMax + 1']}
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                label={{ value: 'Net Wt (kg)', angle: -90, position: 'insideLeft', style: { fill: '#64748b' } }}
              />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Line type="monotone" dataKey="netWt" name="Net Wt Trend" stroke="#10b981" strokeWidth={3} dot={{ stroke: '#10b981', strokeWidth: 2, fill: 'white', r: 5 }} activeDot={{ r: 8 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsView;
