const fs = require('fs');
let code = fs.readFileSync('src/components/ToolsModal.tsx', 'utf8');

code = code.replace(
  `  const [pasteStatus, setPasteStatus] = React.useState<string>('');`,
  `  const [pasteStatus, setPasteStatus] = React.useState<string>('');\n  const [convertMultiplier, setConvertMultiplier] = React.useState<string>('2.20462');\n  const [convertTarget, setConvertTarget] = React.useState<'cartons' | 'unit'>('cartons');\n  const [convertSuccess, setConvertSuccess] = React.useState<string | null>(null);`
);

fs.writeFileSync('src/components/ToolsModal.tsx', code);
