const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  `  const handleUpdateCarton = (id: string, updated: Partial<CartonRow>) => {
    setSheetData(prev => {
      const updatedCartons = prev.cartons.map((c, idx) => {`,
  `  const handleUpdateCarton = (id: string, updated: Partial<CartonRow>) => {
    setSheetData(prev => {
      const cTarget = prev.cartons.find(c => c.id === id);
      const updatedCartons = prev.cartons.map((c, idx) => {`
);

code = code.replace(
  `      return {
        ...prev,
        cartons: updatedCartons,
      };
    });
  };

  // Add 1 carton`,
  `      return {
        ...prev,
        cartons: updatedCartons,
        logs: [...(prev.logs || []), createLog('UPDATE', \`Updated Carton #\${cTarget?.cartonNo}\`)].slice(-50),
      };
    });
  };

  // Add 1 carton`
);

code = code.replace(
  `  const handleDeleteCarton = (id: string) => {
    setSheetData(prev => {
      const filtered = prev.cartons.filter(c => c.id !== id);`,
  `  const handleDeleteCarton = (id: string) => {
    setSheetData(prev => {
      const cTarget = prev.cartons.find(c => c.id === id);
      const filtered = prev.cartons.filter(c => c.id !== id);`
);

code = code.replace(
  `      return {
        ...prev,
        cartons: renumbered,
      };
    });
  };

  // Duplicate single carton`,
  `      return {
        ...prev,
        cartons: renumbered,
        logs: [...(prev.logs || []), createLog('DELETE', \`Deleted Carton #\${cTarget?.cartonNo}\`)].slice(-50),
      };
    });
  };

  // Duplicate single carton`
);

fs.writeFileSync('src/App.tsx', code);
