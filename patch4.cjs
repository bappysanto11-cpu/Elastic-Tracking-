const fs = require('fs');
let code = fs.readFileSync('src/components/CartonTable.tsx', 'utf8');

// Imports
code = code.replace(
  `Filter\n} from 'lucide-react';`,
  `Filter,\n  Search\n} from 'lucide-react';`
);

// State
code = code.replace(
  `  const [isQuickFillOpen, setIsQuickFillOpen] = useState(false);`,
  `  const [isQuickFillOpen, setIsQuickFillOpen] = useState(false);\n  const [searchQuery, setSearchQuery] = useState('');`
);

// Calculate filtered cartons
code = code.replace(
  `  const totalCount = sheetData.cartons.length;`,
  `  const totalCount = sheetData.cartons.length;\n\n  const filteredCartons = sheetData.cartons.filter(c => {\n    if (!searchQuery.trim()) return true;\n    const q = searchQuery.toLowerCase();\n    return c.cartonNo.toString().includes(q) || (c.notes && c.notes.toLowerCase().includes(q));\n  });\n  const displayedCount = filteredCartons.length;`
);

// Replace mapping to use filteredCartons
code = code.replace(
  `            {sheetData.cartons.map((carton, index) => {`,
  `            {filteredCartons.map((carton, index) => {`
);

// Add empty state for search
code = code.replace(
  `          </tbody>\n        </table>\n      </div>`,
  `          </tbody>\n        </table>\n        {filteredCartons.length === 0 && searchQuery.trim() !== '' && (\n          <div className="py-12 text-center text-slate-500 text-sm">\n            {lang === 'en' ? 'No cartons match your search.' : 'আপনার অনুসন্ধানের সাথে কোনো কার্টন মেলেনি।'}\n          </div>\n        )}\n      </div>`
);

// Search Bar UI
code = code.replace(
  `          <span className="text-xs bg-slate-200/80 text-slate-700 font-bold px-2 py-0.5 rounded-full font-mono">
            {totalCount} {lang === 'en' ? 'Rows' : 'সারি'}
          </span>`,
  `          <span className="text-xs bg-slate-200/80 text-slate-700 font-bold px-2 py-0.5 rounded-full font-mono">
            {searchQuery ? \`\${displayedCount} / \${totalCount}\` : totalCount} {lang === 'en' ? 'Rows' : 'সারি'}
          </span>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={lang === 'en' ? 'Search carton or notes...' : 'কার্টন বা নোট খুঁজুন...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-7 py-1.5 bg-white border border-slate-300 rounded-lg text-xs w-48 sm:w-56 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-md"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>`
);

fs.writeFileSync('src/components/CartonTable.tsx', code);
