const fs = require('fs');
let code = fs.readFileSync('src/types/calculator.ts', 'utf8');

const logInterface = `
export interface ActivityLog {
  id: string;
  timestamp: string;
  action: 'ADD' | 'UPDATE' | 'DELETE' | 'BATCH' | 'SYSTEM';
  details: string;
}
`;

code = logInterface + code;

code = code.replace(
  `  cartons: CartonRow[];
  createdAt: string;`,
  `  cartons: CartonRow[];
  createdAt: string;
  logs?: ActivityLog[];`
);

fs.writeFileSync('src/types/calculator.ts', code);
