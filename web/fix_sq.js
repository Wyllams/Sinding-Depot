const fs = require('fs');
let code = fs.readFileSync('app/(shell)/new-project/page.tsx', 'utf8');

const target1 = '<label className={labelCls}>SQ</label>';
code = code.replace(target1, '<label className={labelCls}>Siding SQ</label>');

const target2 = '<input value={sq} onChange={(e)=>setSq(e.target.value)} className={inputCls} placeholder=\"e.g. 24.5\" type=\"number\" step=\"0.01\" />\n                    </div>\n                  </div>';

const rep2 = '<input value={sq} onChange={(e)=>setSq(e.target.value)} className={inputCls} placeholder=\"e.g. 24.5\" type=\"number\" step=\"0.01\" />\n                    </div>\n                    {finalSelected.includes(\"gutters\") && (\n                      <div className=\"space-y-2 fade-in\">\n                        <label className={labelCls}>Gutters SQ</label>\n                        <input value={guttersSq} onChange={(e)=>setGuttersSq(e.target.value)} className={inputCls} placeholder=\"e.g. 25\" type=\"number\" step=\"0.01\" />\n                      </div>\n                    )}\n                    {finalSelected.includes(\"roofing\") && (\n                      <div className=\"space-y-2 fade-in\">\n                        <label className={labelCls}>Roofing SQ</label>\n                        <input value={roofingSq} onChange={(e)=>setRoofingSq(e.target.value)} className={inputCls} placeholder=\"e.g. 30\" type=\"number\" step=\"0.01\" />\n                      </div>\n                    )}\n                  </div>';
code = code.replace(target2, rep2);

const target3 = 'Quantidade de Gutters para este projeto (opcional).';
code = code.replace(target3, 'Configurado na seçao \"Main Information\" no topo da pagina.');

const target4 = 'Quantidade de Roofing para este projeto (opcional).';
code = code.replace(target4, 'Configurado na seçao \"Main Information\" no topo da pagina.');

fs.writeFileSync('app/(shell)/new-project/page.tsx', code);
console.log('Replaced');
