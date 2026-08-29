const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Imports
code = code.replace(
  `import { FloatingSummaryBadge } from './components/FloatingSummaryBadge';`,
  `import { FloatingSummaryBadge } from './components/FloatingSummaryBadge';\nimport { WorkspaceModal } from './components/WorkspaceModal';\nimport { DEFAULT_WORKSPACE_ID, loadWorkspaceData, saveWorkspaceData } from './utils/workspaceManager';`
);

// Constants
code = code.replace(
  `const STORAGE_KEY = 'garment_elastic_calculator_v1';`,
  `const STORAGE_KEY = 'garment_elastic_calculator_v1';\n\n// Added workspace state to App component`
);

// State vars
code = code.replace(
  `const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);`,
  `const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);\n  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState<boolean>(false);\n  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(() => localStorage.getItem('garment_active_workspace') || DEFAULT_WORKSPACE_ID);`
);

// Sheet State
code = code.replace(
  `  const { state: sheetData, set: setSheetData, undo: undoSheetData, redo: redoSheetData, canUndo, canRedo } = useHistory<PackingSheetData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading saved state', e);
    }
    return INITIAL_IMAGE_DATA;
  });`,
  `  const { state: sheetData, set: setSheetData, undo: undoSheetData, redo: redoSheetData, reset: resetSheetData, canUndo, canRedo } = useHistory<PackingSheetData>(() => {
    const loaded = loadWorkspaceData(localStorage.getItem('garment_active_workspace') || DEFAULT_WORKSPACE_ID);
    return loaded || INITIAL_IMAGE_DATA;
  });`
);

// Saving effect
code = code.replace(
  `  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sheetData));
      
      const now = new Date();
      localStorage.setItem(\`\${STORAGE_KEY}_timestamp\`, now.toISOString());
      
      setLastSavedTime(now);`,
  `  useEffect(() => {
    try {
      saveWorkspaceData(activeWorkspaceId, sheetData);
      // Legacy storage just in case for now (optional)
      if (activeWorkspaceId === DEFAULT_WORKSPACE_ID) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sheetData));
        localStorage.setItem(\`\${STORAGE_KEY}_timestamp\`, new Date().toISOString());
      }
      
      const now = new Date();
      
      setLastSavedTime(now);`
);

// Header props
code = code.replace(
  `onOpenCloudSync={() => setIsCloudSyncModalOpen(true)}`,
  `onOpenCloudSync={() => setIsCloudSyncModalOpen(true)}\n        onOpenWorkspaces={() => setIsWorkspaceModalOpen(true)}\n        activeWorkspaceId={activeWorkspaceId}`
);

// Modals
code = code.replace(
  `      <CloudSyncSettingsModal`,
  `      <WorkspaceModal
        isOpen={isWorkspaceModalOpen}
        onClose={() => setIsWorkspaceModalOpen(false)}
        activeWorkspaceId={activeWorkspaceId}
        onSelectWorkspace={(id) => {
          setActiveWorkspaceId(id);
          localStorage.setItem('garment_active_workspace', id);
          const loaded = loadWorkspaceData(id);
          resetSheetData(loaded || INITIAL_IMAGE_DATA);
          setIsWorkspaceModalOpen(false);
        }}
        lang={lang}
      />
      <CloudSyncSettingsModal`
);

fs.writeFileSync('src/App.tsx', code);
