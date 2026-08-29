const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const handleConvertWeights = `
  const handleConvertWeights = (multiplier: number, target: 'cartons' | 'unit') => {
    setSheetData(prev => {
      if (target === 'cartons') {
        const newCartons = prev.cartons.map((c, idx) => {
          return recomputeCarton(
            {
              ...c,
              grossWt: c.grossWt > 0 ? c.grossWt * multiplier : 0,
              tareWt: c.tareWt * multiplier,
            },
            idx,
            prev.defaultTare * multiplier,
            prev.defaultWtPerUnit
          );
        });
        return {
          ...prev,
          defaultTare: Number((prev.defaultTare * multiplier).toFixed(3)),
          cartons: newCartons,
        };
      } else {
        // Convert unit weight
        const newUnit = Number((prev.defaultWtPerUnit * multiplier).toFixed(2));
        const newCartons = prev.cartons.map((c, idx) => {
          return recomputeCarton(
            {
              ...c,
              wtPerUnit: c.wtPerUnit * multiplier,
            },
            idx,
            prev.defaultTare,
            newUnit
          );
        });
        return {
          ...prev,
          defaultWtPerUnit: newUnit,
          cartons: newCartons,
        };
      }
    });
  };
`;

code = code.replace(
  `  // Bulk paste weights handler`,
  handleConvertWeights + `\n  // Bulk paste weights handler`
);

code = code.replace(
  `onBulkPasteWeights={handleBulkPasteWeights}`,
  `onBulkPasteWeights={handleBulkPasteWeights}\n        onConvertWeights={handleConvertWeights}`
);

fs.writeFileSync('src/App.tsx', code);
