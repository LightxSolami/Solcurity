const fs = require('fs');
const content = fs.readFileSync('src/app/api/pumpfuntool/route.ts', 'utf8');
const lines = content.split('\n');

let braceCount = 0;
let inString = false;
let stringChar = '';

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    const prevChar = line[j - 1];
    if (!inString) {
      if (char === '"' || char === "'" || char === '`') {
        inString = true;
        stringChar = char;
      } else if (char === '{') {
        braceCount++;
        console.log('Line', i + 1, 'braceCount:', braceCount, ':', line.trim().substring(0, 80));
      } else if (char === '}') {
        braceCount--;
        console.log('Line', i + 1, 'braceCount:', braceCount, ':', line.trim().substring(0, 80));
      }
    } else if (char === stringChar && prevChar !== '\\') {
      inString = false;
    }
  }
  
  if (braceCount < 0) {
    console.log('Negative brace count at line', i + 1, ':', lines[i].trim());
    braceCount = 0;
  }
}

console.log('Final brace count:', braceCount);