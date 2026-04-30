import fs from 'fs';

const filePath = 'c:/Users/wylla/.gemini/Siding Depot/web/app/(shell)/projects/[id]/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. ADD STATES
content = content.replace(
  /const \[windowCount, setWindowCount\] = useState\(""\);/g,
  'const [windowCount, setWindowCount] = useState("");\n  const [windowPrice, setWindowPrice] = useState("");'
);
content = content.replace(
  /const \[doorCount, setDoorCount\] = useState\(""\);/g,
  'const [doorCount, setDoorCount] = useState("");\n  const [doorPrice, setDoorPrice] = useState("");'
);
content = content.replace(
  /const \[deckScope, setDeckScope\] = useState\(""\);/g,
  'const [deckScope, setDeckScope] = useState("");\n  const [deckPrice, setDeckPrice] = useState("");'
);

// 2. CLEAR STATES
content = content.replace(
  /setWindowCount\(""\);\s*setDoorCount\(""\);\s*setDeckScope\(""\);/g,
  'setWindowCount("");\n      setDoorCount("");\n      setDeckScope("");\n      setWindowPrice("");\n      setDoorPrice("");\n      setDeckPrice("");'
);

// 3. UI INPUTS - WINDOWS CONFIG
const windowPriceUI = `
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Price ($)</label>
                          <input type="number" min="0" step="0.01" value={windowPrice} onChange={(e) => setWindowPrice(e.target.value)} placeholder="e.g. 1500"
                            className="w-full bg-surface-container-highest border border-transparent rounded-lg py-3 px-4 text-on-surface placeholder:text-outline focus:outline-none focus:border-[#f5a623] focus:ring-1 focus:ring-[#f5a623] transition-all h-[48px] text-[15px]" />
                        </div>`;

content = content.replace(
  /<CustomDropdown value=\{windowTrim\}/g,
  `${windowPriceUI.trim()}\n                        <CustomDropdown value={windowTrim}`
);

// 4. UI INPUTS - DOORS CONFIG
const doorPriceUI = `
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Price ($)</label>
                          <input type="number" min="0" step="0.01" value={doorPrice} onChange={(e) => setDoorPrice(e.target.value)} placeholder="e.g. 1500"
                            className="w-full bg-surface-container-highest border border-transparent rounded-lg py-3 px-4 text-on-surface placeholder:text-outline focus:outline-none focus:border-[#f5a623] focus:ring-1 focus:ring-[#f5a623] transition-all h-[48px] text-[15px]" />
                        </div>`;

content = content.replace(
  /<\/div>\s*\{doorCount && \(/g,
  `</div>\n${doorPriceUI}\n                        {doorCount && (`
);

// 5. UI INPUTS - DECKSCOPE CONFIG
const deckPriceUI = `
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Price ($)</label>
                          <input type="number" min="0" step="0.01" value={deckPrice} onChange={(e) => setDeckPrice(e.target.value)} placeholder="e.g. 1500"
                            className="w-full bg-surface-container-highest border border-transparent rounded-lg py-3 px-4 text-on-surface placeholder:text-outline focus:outline-none focus:border-[#f5a623] focus:ring-1 focus:ring-[#f5a623] transition-all h-[48px] text-[15px]" />
                        </div>`;

content = content.replace(
  /<\/div>\s*<div className="flex gap-3 pt-2">/g,
  `</div>\n${deckPriceUI}\n                        <div className="flex gap-3 pt-2">`
);

// 6. SAVE LOGIC - WINDOWS
const windowsSaveStr = `
                              const windowsSvc = job?.services?.find((s: any) => s.service_type?.name?.toLowerCase() === "windows");
                              if (windowsSvc) {
                                await supabase.from("job_services").update({ quantity: wQty, contracted_amount: parseFloat(windowPrice) || null }).eq("id", windowsSvc.id);
                              }
`;
content = content.replace(
  /const wQty = parseInt\(windowCount\) \|\| null;/g,
  `const wQty = parseInt(windowCount) || null;\n${windowsSaveStr}`
);

// 7. SAVE LOGIC - DOORS
content = content.replace(
  /await supabase\.from\("job_services"\)\.update\(\{ quantity: qty \}\)\.eq\("id", doorsSvc\.id\);/g,
  'await supabase.from("job_services").update({ quantity: qty, contracted_amount: parseFloat(doorPrice) || null }).eq("id", doorsSvc.id);'
);

// 8. SAVE LOGIC - DECKS
content = content.replace(
  /await supabase\.from\("job_services"\)\.update\(\{ scope_of_work: notesStr \}\)\.eq\("id", decksSvc\.id\);/g,
  'await supabase.from("job_services").update({ scope_of_work: notesStr, contracted_amount: parseFloat(deckPrice) || null }).eq("id", decksSvc.id);'
);

// 9. HYDRATE EDIT MODALS - WHEN USER OPENS EDIT, FILL THE PRICES
content = content.replace(
  /setWindowCount\(\(job\.services\.find\(\(s: any\) => s\.service_type\?\.name\?\.toLowerCase\(\) === "windows"\)\?\.quantity \|\| ""\)\.toString\(\)\);/g,
  `setWindowCount((job.services.find((s: any) => s.service_type?.name?.toLowerCase() === "windows")?.quantity || "").toString());\n                                      setWindowPrice((job.services.find((s: any) => s.service_type?.name?.toLowerCase() === "windows")?.contracted_amount || "").toString());`
);

content = content.replace(
  /setDoorCount\(\(job\.services\.find\(\(s: any\) => s\.service_type\?\.name\?\.toLowerCase\(\) === "doors"\)\?\.quantity \|\| ""\)\.toString\(\)\);/g,
  `setDoorCount((job.services.find((s: any) => s.service_type?.name?.toLowerCase() === "doors")?.quantity || "").toString());\n                                      setDoorPrice((job.services.find((s: any) => s.service_type?.name?.toLowerCase() === "doors")?.contracted_amount || "").toString());`
);

content = content.replace(
  /setDeckScope\(job\.services\.find\(\(s: any\) => s\.service_type\?\.name\?\.toLowerCase\(\) === "decks"\)\?\.scope_of_work \|\| ""\);/g,
  `setDeckScope(job.services.find((s: any) => s.service_type?.name?.toLowerCase() === "decks")?.scope_of_work || "");\n                                      setDeckPrice((job.services.find((s: any) => s.service_type?.name?.toLowerCase() === "decks")?.contracted_amount || "").toString());`
);

// Write changes
fs.writeFileSync(filePath, content);
console.log("Patched successfully!");
