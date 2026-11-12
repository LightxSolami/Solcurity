const fs = require('fs');
const filePath = 'src/components/FuturisticWalletTracker.tsx';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// Check brace balance
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
      } else if (char === '}') {
        braceCount--;
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

// Also check for unmatched parentheses
let parenCount = 0;
inString = false;
stringChar = '';

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    const prevChar = line[j - 1];
    if (!inString) {
      if (char === '"' || char === "'" || char === '`') {
        inString = true;
        stringChar = char;
      } else if (char === '(') {
        parenCount++;
      } else if (char === ')') {
        parenCount--;
      }
    } else if (char === stringChar && prevChar !== '\\') {
      inString = false;
    }
  }
  if (parenCount < 0) {
    console.log('Negative paren count at line', i + 1);
  }
}
console.log('Final paren count:', parenCount);