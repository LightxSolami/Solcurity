const fs = require('fs');
const filePath = 'src/components/FuturisticWalletTracker.tsx';
const content = fs.readFileSync(filePath, 'utf8');

// Replace Connection with SolanaConnection for usages from @solana/web3.js
let newContent = content.replace(/new Connection\(/g, 'new SolanaConnection(');

// Also fix any type references
newContent = newContent.replace(/: Connection/g, ': SolanaConnection');

fs.writeFileSync(filePath, newContent);
console.log('Fixed Connection references');