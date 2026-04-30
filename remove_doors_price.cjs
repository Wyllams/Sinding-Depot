const fs = require('fs');
const path = 'c:/Users/wylla/.gemini/Siding Depot/web/app/(shell)/projects/[id]/page.tsx';

let content = fs.readFileSync(path, 'utf8');

// 1. Remove doorPrice state
content = content.replace(/const \[doorPrice, setDoorPrice\] = useState\(""\);\r?\n/, '');

// 2. Remove UI blocks
const uiBlock = `                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Price ($)</label>
                          <input type="number" min="0" step="0.01" value={doorPrice} onChange={(e) => setDoorPrice(e.target.value)} placeholder="e.g. 1500"
                            className="w-full bg-surface-container-highest border border-transparent rounded-lg py-3 px-4 text-on-surface placeholder:text-outline focus:outline-none focus:border-[#f5a623] focus:ring-1 focus:ring-[#f5a623] transition-all h-[48px] text-[15px]" />
                        </div>`;

content = content.replace(uiBlock, '');
content = content.replace(uiBlock, '');

// Also handle the case where it might have a slightly different indent
// Or we can just use regex for the whole div containing doorPrice
content = content.replace(/[\ \t]*<div className="space-y-2">\s*<label[^>]*>Price \(\$\)<\/label>\s*<input[^>]*value=\{doorPrice\}[^>]*>\s*<\/div>/g, '');

// 3. Remove from update calls
content = content.replace(/, contracted_amount: parseFloat\(doorPrice\) \|\| null /g, '');

fs.writeFileSync(path, content);
console.log('Removed doors price fields');
