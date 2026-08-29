const fs = require('fs');
let code = fs.readFileSync('src/components/CartonTable.tsx', 'utf8');

// Imports
code = code.replace(
  `import { Language, translations } from '../utils/translations';`,
  `import { Language, translations } from '../utils/translations';\nimport { QuickFillModal, QuickFillPreset } from './QuickFillModal';\nimport { Zap } from 'lucide-react';`
);

// State
code = code.replace(
  `  // Batch Editing Inputs
  const [batchTare, setBatchTare] = useState<string>(sheetData.defaultTare.toString());`,
  `  // Batch Editing Inputs
  const [batchTare, setBatchTare] = useState<string>(sheetData.defaultTare.toString());\n  const [isQuickFillOpen, setIsQuickFillOpen] = useState(false);`
);

// QuickFill handler
code = code.replace(
  `  const handleBatchDelete = () => {`,
  `  const handleApplyQuickFill = (preset: QuickFillPreset) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    
    if (onBatchUpdateCartons) {
      onBatchUpdateCartons(ids, { grossWt: preset.grossWt, tareWt: preset.tareWt });
    } else {
      ids.forEach(id => onUpdateCarton(id, { grossWt: preset.grossWt, tareWt: preset.tareWt }));
    }
    
    showFeedback(
      lang === 'en' 
        ? \`Applied "\${preset.name}" to \${ids.length} cartons!\` 
        : \`\${ids.length}টি কার্টনে "\${preset.name}" প্রয়োগ করা হয়েছে!\`,
      'success'
    );
    setIsQuickFillOpen(false);
  };

  const handleBatchDelete = () => {`
);

// Quick Fill Button in Toolbar
code = code.replace(
  `              <div className="hidden sm:flex items-center gap-1.5 ml-3 border-l border-indigo-200 pl-3">
                <button
                  onClick={handleResetBatchToDefaults}`,
  `              <div className="hidden sm:flex items-center gap-1.5 ml-3 border-l border-indigo-200 pl-3">
                <button
                  onClick={() => setIsQuickFillOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1 bg-amber-500 hover:bg-amber-400 text-amber-950 text-xs font-bold rounded-lg border border-amber-600 transition cursor-pointer shadow-sm"
                  title="Apply standard saved weights"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{lang === 'en' ? 'Quick Fill' : 'কুইক ফিল'}</span>
                </button>
                <div className="w-px h-4 bg-indigo-200 mx-1"></div>
                <button
                  onClick={handleResetBatchToDefaults}`
);


// Same for mobile menu
code = code.replace(
  `                <button
                  onClick={handleResetBatchToDefaults}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition cursor-pointer"
                >`,
  `                <button
                  onClick={() => setIsQuickFillOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold rounded-lg border border-amber-200 transition cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{lang === 'en' ? 'Quick Fill' : 'কুইক ফিল'}</span>
                </button>
                <button
                  onClick={handleResetBatchToDefaults}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition cursor-pointer"
                >`
);


// Insert Modal before return
code = code.replace(
  `      {/* Keyboard Shortcuts Helper Bar */}`,
  `      <QuickFillModal
        isOpen={isQuickFillOpen}
        onClose={() => setIsQuickFillOpen(false)}
        onApply={handleApplyQuickFill}
        lang={lang}
      />
      {/* Keyboard Shortcuts Helper Bar */}`
);

fs.writeFileSync('src/components/CartonTable.tsx', code);
