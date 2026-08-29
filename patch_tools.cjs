const fs = require('fs');
let code = fs.readFileSync('src/components/ToolsModal.tsx', 'utf8');

// Interface
code = code.replace(
  `onBulkPasteWeights: (weights: number[]) => void;\n}`,
  `onBulkPasteWeights: (weights: number[]) => void;\n  onConvertWeights: (multiplier: number, target: 'cartons' | 'unit') => void;\n}`
);

// Component params
code = code.replace(
  `onApplyUnitWeight,\n  onBulkPasteWeights\n}: ToolsModalProps) => {`,
  `onApplyUnitWeight,\n  onBulkPasteWeights,\n  onConvertWeights\n}: ToolsModalProps) => {`
);

// Add state for converter
code = code.replace(
  `  const [pasteStatus, setPasteStatus] = useState<string | null>(null);`,
  `  const [pasteStatus, setPasteStatus] = useState<string | null>(null);\n  const [convertMultiplier, setConvertMultiplier] = useState<string>('2.20462');\n  const [convertTarget, setConvertTarget] = useState<'cartons' | 'unit'>('cartons');\n  const [convertSuccess, setConvertSuccess] = useState<string | null>(null);`
);

// Add the converter block before the Bulk Paste block
const converterBlock = `
          {/* 3. Weight Unit Converter */}
          <div className="p-4 rounded-xl bg-orange-50/40 border border-orange-200">
            <div className="flex items-center gap-2 mb-3">
              <Scale className="w-4 h-4 text-orange-600" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                {lang === 'en' ? 'Batch Unit Converter' : 'ওজন ইউনিট কনভার্টার'}
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {lang === 'en' ? 'Target to Convert' : 'যা পরিবর্তন করবেন'}
                </label>
                <select
                  value={convertTarget}
                  onChange={(e) => setConvertTarget(e.target.value as 'cartons' | 'unit')}
                  className="w-full px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  <option value="cartons">{lang === 'en' ? 'Carton Weights (Gross & Tare)' : 'কার্টন ওজন (গ্রস ও ট্যার)'}</option>
                  <option value="unit">{lang === 'en' ? 'Unit Weight (gm/m)' : 'ইউনিট ওজন (gm/m)'}</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {lang === 'en' ? 'Custom Multiplier' : 'গুণক (Multiplier)'}
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={convertMultiplier}
                  onChange={(e) => setConvertMultiplier(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-3">
              <button onClick={() => setConvertMultiplier('2.20462')} className="px-2 py-1 text-[10px] font-bold bg-orange-100 text-orange-800 rounded hover:bg-orange-200">Kg → Lbs</button>
              <button onClick={() => setConvertMultiplier('0.453592')} className="px-2 py-1 text-[10px] font-bold bg-orange-100 text-orange-800 rounded hover:bg-orange-200">Lbs → Kg</button>
              <button onClick={() => setConvertMultiplier('1000')} className="px-2 py-1 text-[10px] font-bold bg-orange-100 text-orange-800 rounded hover:bg-orange-200">Kg → gm</button>
              <button onClick={() => setConvertMultiplier('0.001')} className="px-2 py-1 text-[10px] font-bold bg-orange-100 text-orange-800 rounded hover:bg-orange-200">gm → Kg</button>
              <button onClick={() => setConvertMultiplier('0.035274')} className="px-2 py-1 text-[10px] font-bold bg-orange-100 text-orange-800 rounded hover:bg-orange-200">gm → oz</button>
              <button onClick={() => setConvertMultiplier('28.3495')} className="px-2 py-1 text-[10px] font-bold bg-orange-100 text-orange-800 rounded hover:bg-orange-200">oz → gm</button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
              <span className="text-orange-700 font-semibold">
                {convertSuccess ? <span className="flex items-center gap-1"><Check className="w-3 h-3"/> {convertSuccess}</span> : ''}
              </span>
              <button
                onClick={() => {
                  const val = parseFloat(convertMultiplier);
                  if (!isNaN(val) && val > 0) {
                    if (window.confirm(lang === 'en' ? 'Are you sure you want to convert the entire sheet?' : 'পুরো শিটের ওজন পরিবর্তন করতে চান?')) {
                      onConvertWeights(val, convertTarget);
                      setConvertSuccess('Converted!');
                      setTimeout(() => setConvertSuccess(null), 2000);
                    }
                  }
                }}
                className="px-3 py-1 bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs rounded-md shadow-xs transition cursor-pointer"
              >
                {lang === 'en' ? 'Convert All' : 'সব কনভার্ট করুন'}
              </button>
            </div>
          </div>
`;

code = code.replace(
  `{/* 3. Bulk Paste Carton Weights */}`,
  converterBlock + `\n          {/* 4. Bulk Paste Carton Weights */}`
);


fs.writeFileSync('src/components/ToolsModal.tsx', code);
