const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

code = code.replace(
  `import { Language, translations } from '../utils/translations';`,
  `import { Language, translations } from '../utils/translations';\nimport { Folder } from 'lucide-react';\nimport { getWorkspaces, DEFAULT_WORKSPACE_ID } from '../utils/workspaceManager';`
);

code = code.replace(
  `interface HeaderProps {
  lang: Language;
  setLang: (lang: Language) => void;
  onOpenAiScan: () => void;
  onOpenHelp: () => void;
  onOpenTools: () => void;
  onOpenExcelDrive: () => void;`,
  `interface HeaderProps {
  lang: Language;
  setLang: (lang: Language) => void;
  onOpenAiScan: () => void;
  onOpenHelp: () => void;
  onOpenTools: () => void;
  onOpenExcelDrive: () => void;
  onOpenWorkspaces?: () => void;
  activeWorkspaceId?: string;`
);

code = code.replace(
  `export function Header({
  lang,
  setLang,
  onOpenAiScan,
  onOpenHelp,
  onOpenTools,
  onOpenExcelDrive,
  onOpenApk,
  onOpenIndexedDbBackups,
  onPrint,
  onExportCsv,
  onReset,
  onImportData,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  sheetData,
  summary,
  lastSavedTime,
  isSaving = false
}: HeaderProps) {`,
  `export function Header({
  lang,
  setLang,
  onOpenAiScan,
  onOpenHelp,
  onOpenTools,
  onOpenExcelDrive,
  onOpenWorkspaces,
  activeWorkspaceId,
  onOpenApk,
  onOpenIndexedDbBackups,
  onPrint,
  onExportCsv,
  onReset,
  onImportData,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  sheetData,
  summary,
  lastSavedTime,
  isSaving = false
}: HeaderProps) {
  
  const workspaces = getWorkspaces();
  const activeWorkspaceName = activeWorkspaceId ? (workspaces.find(w => w.id === activeWorkspaceId)?.name || 'Main Sheet') : 'Main Sheet';
`
);

code = code.replace(
  `          {/* Cloud Sync Settings */}
          <button
            onClick={onOpenCloudSync}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold shadow-sm border border-slate-700 transition cursor-pointer"
            title="Cloud Sync Setup"
          >
            <CloudSync className="w-4 h-4" />
            <span>Sync</span>
          </button>`,
  `          {/* Cloud Sync Settings */}
          <button
            onClick={onOpenCloudSync}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold shadow-sm border border-slate-700 transition cursor-pointer"
            title="Cloud Sync Setup"
          >
            <Cloud className="w-4 h-4" />
            <span>Sync</span>
          </button>`
);


code = code.replace(
  `<div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calculator className="w-6 h-6 text-indigo-400" />
            <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              <span className="hidden sm:inline">Garment Elastic</span> Calculator
              <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-1.5 py-0.5 rounded border border-indigo-500/30 font-semibold tracking-wide">PRO</span>
            </h1>
          </div>
        </div>`,
  `<div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calculator className="w-6 h-6 text-indigo-400" />
            <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              <span className="hidden sm:inline">Garment Elastic</span> Calculator
              <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-1.5 py-0.5 rounded border border-indigo-500/30 font-semibold tracking-wide">PRO</span>
            </h1>
          </div>
          
          {onOpenWorkspaces && (
            <button 
              onClick={onOpenWorkspaces}
              className="ml-2 hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 text-xs font-semibold transition"
              title="Switch Target Sheet"
            >
              <Folder className="w-3.5 h-3.5 text-indigo-400" />
              <span className="truncate max-w-[100px]">{activeWorkspaceName}</span>
            </button>
          )}
        </div>`
);


fs.writeFileSync('src/components/Header.tsx', code);
