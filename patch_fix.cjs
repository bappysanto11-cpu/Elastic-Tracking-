const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  `      );
      const cTarget = prev.cartons.find(c => c.id === id);
      return {
        ...prev,
        cartons: updatedCartons,
        logs: [...(prev.logs || []), createLog('UPDATE', \`Updated Carton #\${cTarget?.cartonNo}\`)].slice(-50),
      };`,
  `      );
      return {
        ...prev,
        cartons: updatedCartons,
        logs: [...(prev.logs || []), createLog('SYSTEM', \`Applied default weights to all cartons\`)].slice(-50),
      };`
);

fs.writeFileSync('src/App.tsx', code);
