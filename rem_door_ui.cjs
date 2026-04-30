const fs = require('fs');
const path = 'c:/Users/wylla/.gemini/Siding Depot/web/app/(shell)/projects/[id]/page.tsx';

let lines = fs.readFileSync(path, 'utf8').split('\n');

// Backward loop to safely splice indices
for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].includes('value={doorPrice}')) {
    // Delete 5 lines block
    lines.splice(i - 2, 5);
    console.log('Removed block at ' + i);
  }
}

fs.writeFileSync(path, lines.join('\n'));
