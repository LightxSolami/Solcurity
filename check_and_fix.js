const fs = require('fs');

// Read the current file
const filePath = 'src/app/tools/solsnake/page.tsx';
const content = fs.readFileSync('src/app/tools/solsnake/page.tsx', 'utf8');

// Check if it starts with "use client"
console.log('Starts with "use client":', content.startsWith('"use client"'));

// Check first 20 chars
console.log('First 50 chars:', JSON.stringify(content.substring(0, 50)));

// Check for BOM
const buffer = fs.readFileSync('src/app/tools/solsnake/page.tsx');
console.log('First 3 bytes:', buffer.slice(0, 3));
console.log('Has BOM:', buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF);

// Re-write the file to ensure clean UTF-8 without BOM
fs.writeFileSync('src/app/tools/solsnake/page.tsx', content, 'utf8');
console.log('File rewritten without BOM');