const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Add createLog helper
const createLogHelper = `
  const createLog = (action: 'ADD' | 'UPDATE' | 'DELETE' | 'BATCH' | 'SYSTEM', details: string) => ({
    id: \`log-\${Date.now()}-\${Math.random().toString(36).substr(2, 5)}\`,
    timestamp: new Date().toISOString(),
    action,
    details
  });
`;

code = code.replace(
  `  // Handle scanned QR Code redirection`,
  createLogHelper + `\n  // Handle scanned QR Code redirection`
);

function appendLog(prevVar, actionStr, detailsStr) {
  return `logs: [...(${prevVar}.logs || []), createLog(${actionStr}, ${detailsStr})].slice(-100)`;
}

// 1. handleUpdateCarton
code = code.replace(
  `      return {
        ...prev,
        cartons: updatedCartons,
      };`,
  `      const cTarget = prev.cartons.find(c => c.id === id);
      return {
        ...prev,
        cartons: updatedCartons,
        logs: [...(prev.logs || []), createLog('UPDATE', \`Updated Carton #\${cTarget?.cartonNo}\`)].slice(-50),
      };`
);

// 2. handleAddCarton
code = code.replace(
  `      return {
        ...prev,
        cartons: [...prev.cartons, newCarton],
      };`,
  `      return {
        ...prev,
        cartons: [...prev.cartons, newCarton],
        logs: [...(prev.logs || []), createLog('ADD', \`Added new Carton #\${newCarton.cartonNo}\`)].slice(-50),
      };`
);

// 3. handleAddBulk
code = code.replace(
  `      return {
        ...prev,
        cartons: [...prev.cartons, ...newCartons],
      };`,
  `      return {
        ...prev,
        cartons: [...prev.cartons, ...newCartons],
        logs: [...(prev.logs || []), createLog('ADD', \`Added \${count} empty cartons in bulk\`)].slice(-50),
      };`
);

// 4. handleDeleteCarton
code = code.replace(
  `      return {
        ...prev,
        cartons: newCartons,
      };
    });
  };

  // Duplicate single carton`,
  `      const cTarget = prev.cartons.find(c => c.id === id);
      return {
        ...prev,
        cartons: newCartons,
        logs: [...(prev.logs || []), createLog('DELETE', \`Deleted Carton #\${cTarget?.cartonNo}\`)].slice(-50),
      };
    });
  };

  // Duplicate single carton`
);

// 5. handleDuplicateCarton
code = code.replace(
  `      return {
        ...prev,
        cartons: newCartons,
      };
    });
  };

  // Batch update`,
  `      return {
        ...prev,
        cartons: newCartons,
        logs: [...(prev.logs || []), createLog('ADD', \`Duplicated Carton #\${carton.cartonNo}\`)].slice(-50),
      };
    });
  };

  // Batch update`
);

// 6. handleBatchUpdateCartons
code = code.replace(
  `      return {
        ...prev,
        cartons: updatedCartons,
      };
    });
  };

  // Batch delete`,
  `      return {
        ...prev,
        cartons: updatedCartons,
        logs: [...(prev.logs || []), createLog('BATCH', \`Batch updated \${ids.length} cartons\`)].slice(-50),
      };
    });
  };

  // Batch delete`
);

// 7. handleBatchDeleteCartons
code = code.replace(
  `      return {
        ...prev,
        cartons: remaining,
      };
    });
  };

  // Batch duplicate`,
  `      return {
        ...prev,
        cartons: remaining,
        logs: [...(prev.logs || []), createLog('BATCH', \`Batch deleted \${ids.length} cartons\`)].slice(-50),
      };
    });
  };

  // Batch duplicate`
);

// 8. handleBatchDuplicateCartons
code = code.replace(
  `      return {
        ...prev,
        cartons: [...prev.cartons, ...duplicated],
      };
    });
  };

  // Clear empty rows`,
  `      return {
        ...prev,
        cartons: [...prev.cartons, ...duplicated],
        logs: [...(prev.logs || []), createLog('BATCH', \`Batch duplicated \${ids.length} cartons\`)].slice(-50),
      };
    });
  };

  // Clear empty rows`
);

// 9. handleClearEmpty
code = code.replace(
  `      return {
        ...prev,
        cartons: activeCartons,
      };
    });
  };`,
  `      return {
        ...prev,
        cartons: activeCartons,
        logs: [...(prev.logs || []), createLog('SYSTEM', \`Cleared \${prev.cartons.length - activeCartons.length} empty rows\`)].slice(-50),
      };
    });
  };`
);


// 10. handleConvertWeights
code = code.replace(
  `        return {
          ...prev,
          defaultTare: Number((prev.defaultTare * multiplier).toFixed(3)),
          cartons: newCartons,
        };`,
  `        return {
          ...prev,
          defaultTare: Number((prev.defaultTare * multiplier).toFixed(3)),
          cartons: newCartons,
          logs: [...(prev.logs || []), createLog('SYSTEM', \`Converted carton weights by \${multiplier}\`)].slice(-50),
        };`
);

code = code.replace(
  `        return {
          ...prev,
          defaultWtPerUnit: newUnit,
          cartons: newCartons,
        };`,
  `        return {
          ...prev,
          defaultWtPerUnit: newUnit,
          cartons: newCartons,
          logs: [...(prev.logs || []), createLog('SYSTEM', \`Converted unit weight by \${multiplier}\`)].slice(-50),
        };`
);

fs.writeFileSync('src/App.tsx', code);
