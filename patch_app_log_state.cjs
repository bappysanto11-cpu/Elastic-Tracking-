const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  `import { Header } from './components/Header';`,
  `import { Header } from './components/Header';\nimport { ActivitySidebar } from './components/ActivitySidebar';`
);

code = code.replace(
  `  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);`,
  `  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);\n  const [isActivityLogOpen, setIsActivityLogOpen] = useState<boolean>(false);`
);

// We need a button in the UI to toggle the ActivityLog.
// Maybe add it to Header props?
code = code.replace(
  `onOpenHelp={() => setIsHelpOpen(true)}`,
  `onOpenHelp={() => setIsHelpOpen(true)}\n        onOpenActivityLog={() => setIsActivityLogOpen(true)}`
);

// Also render the Sidebar in App.tsx
code = code.replace(
  `      <HelpModal`,
  `      <ActivitySidebar
        isOpen={isActivityLogOpen}
        onClose={() => setIsActivityLogOpen(false)}
        logs={sheetData.logs}
        lang={lang}
      />\n      <HelpModal`
);

fs.writeFileSync('src/App.tsx', code);
