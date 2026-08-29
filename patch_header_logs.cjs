const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

code = code.replace(
  `onOpenHelp: () => void;`,
  `onOpenHelp: () => void;\n  onOpenActivityLog?: () => void;`
);

code = code.replace(
  `  onOpenHelp,
  onOpenTools,`,
  `  onOpenHelp,
  onOpenTools,
  onOpenActivityLog,`
);

code = code.replace(
  `import { Folder } from 'lucide-react';`,
  `import { Folder, Activity } from 'lucide-react';`
);

// Add the button near the Tools/Help buttons
code = code.replace(
  `            <button
              onClick={onOpenTools}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 text-xs font-semibold border border-indigo-500/30 transition cursor-pointer"
              title="Calculator Tools & Utilities"
            >
              <Calculator className="w-4 h-4" />
              <span className="hidden md:inline">{lang === 'en' ? 'Tools' : 'টুলস'}</span>
            </button>`,
  `            <button
              onClick={onOpenTools}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 text-xs font-semibold border border-indigo-500/30 transition cursor-pointer"
              title="Calculator Tools & Utilities"
            >
              <Calculator className="w-4 h-4" />
              <span className="hidden md:inline">{lang === 'en' ? 'Tools' : 'টুলস'}</span>
            </button>
            {onOpenActivityLog && (
              <button
                onClick={onOpenActivityLog}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition cursor-pointer"
                title="Activity Log"
              >
                <Activity className="w-4 h-4" />
                <span className="hidden lg:inline">{lang === 'en' ? 'Activity' : 'লগ'}</span>
              </button>
            )}`
);

fs.writeFileSync('src/components/Header.tsx', code);
