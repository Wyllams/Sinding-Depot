const fs = require('fs');
const path = 'c:/Users/wylla/.gemini/Siding Depot/web/app/(shell)/projects/[id]/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const regex = /<div className="space-y-2">\s*<label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Scope<\/label>\s*<CustomDropdown\s*value=\{deckScope\}\s*onChange=\{\(val\) => setDeckScope\(val\)\}/g;

const replacement = `<div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Price ($)</label>
                          <input type="number" min="0" step="0.01" value={deckPrice} onChange={(e) => setDeckPrice(e.target.value)} placeholder="e.g. 1500"
                            className="w-full bg-surface-container-highest border border-transparent rounded-lg py-3 px-4 text-on-surface placeholder:text-outline focus:outline-none focus:border-[#f5a623] focus:ring-1 focus:ring-[#f5a623] transition-all h-[48px] text-[15px]" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Scope</label>
                          <CustomDropdown
                            value={deckScope}
                            onChange={(val) => setDeckScope(val)}`;

const before = content;
content = content.replace(regex, replacement);

if (content !== before) {
  fs.writeFileSync(path, content);
  console.log('Success inserted price into deck');
} else {
  console.log('Fail Regex did not match');
}
