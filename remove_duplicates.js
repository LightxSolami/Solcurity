const fs = require('fs');

const filePath = 'src/components/pumpfuntool/PumpFunAnalytics.tsx';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// Remove lines 379-422 (0-indexed: 378-421)
const newLines = lines.slice(0, 378).concat(lines.slice(422));

fs.writeFileSync(filePath, newLines.join('\n'));
console.log('Duplicate lines removed');