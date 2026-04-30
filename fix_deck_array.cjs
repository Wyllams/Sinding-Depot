const fs = require('fs');
const path = 'c:/Users/wylla/.gemini/Siding Depot/web/app/(shell)/projects/[id]/page.tsx';

let lines = fs.readFileSync(path, 'utf8').split('\n');

const toInsert = `                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Price ($)</label>
                          <input type="number" min="0" step="0.01" value={deckPrice} onChange={(e) => setDeckPrice(e.target.value)} placeholder="e.g. 1500"
                            className="w-full bg-surface-container-highest border border-transparent rounded-lg py-3 px-4 text-on-surface placeholder:text-outline focus:outline-none focus:border-[#f5a623] focus:ring-1 focus:ring-[#f5a623] transition-all h-[48px] text-[15px]" />
                        </div>`.replace(/\n/g, '\r\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('{/* Scope Dropdown */}')) {
    // Inject right below it or right before Scope?
    // Let's insert it before it
    lines.splice(i, 0, toInsert);
    console.log('Inserted at line ' + i);
    break;
  }
}

fs.writeFileSync(path, lines.join('\n'));
