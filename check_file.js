const fs = require('fs');
const content = fs.readFileSync('src/app/tools/solsnake/page.tsx', 'utf8');
const lines = content.split('\n');
for (let i = 0; i < 15; i++) {
  console.log(i+1, '|', lines[i].substring(0, 80));
}
console.log('---');
console.log('Starts with use client:', content.startsWith('"use client"'));