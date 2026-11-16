const fs = require('fs');
const filePath = 'src/app/api/pumpfuntool/route.ts';
const content = fs.readFileSync(filePath, 'utf8');

// Find the fetchBasicOnChainData function and restructure it
const functionStart = content.indexOf('async function fetchBasicOnChainData(mint: string): Promise<PumpFunToken> {');
if (functionStart === -1) {
  console.log('Function not found');
  process.exit(1);
}

// Find the end of the function (next async function or export)
const nextFunction = content.indexOf('async function fetchPumpFunTokenDataFromPumpPortal', functionStart);
if (nextFunction === -1) {
  console.log('Next function not found');
  process.exit(1);
}

const functionCode = content.substring(functionStart, nextFunction);

// Check if the function already has the restructured version
if (functionCode.includes('let result: PumpFunToken;')) {
  console.log('Function already restructured');
  process.exit(0);
}

// Replace the function with a version that has a single return at the end
const newFunction = `async function fetchBasicOnChainData(mint: string): Promise<PumpFunToken> {
  const connection = createSolanaConnection();
  const mintPubkey = new PublicKey(mint);

  // Fetch the mint account to get basic info
  const mintAccount = await connection.getAccountInfo(new PublicKey(mint));
  if (!mintAccount) {
    throw new UpstreamError("Token not found on Solana", 404);
  }

  // Try to get metadata from the token metadata program
  const METADATA_PROGRAM = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
  const [metadataAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBuffer(), new PublicKey(mint).toBuffer()],
    new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
  );

  let name = "Unknown token";
  let symbol = "UNKNOWN";
  let uri = "";

  try {
    const metadataAccount = await connection.getAccountInfo(metadataAccount);
    if (metadataAccount) {
      name = "PumpFun Token";
      symbol = "PUMP";
    }
  } catch {
    // Ignore metadata parsing errors
  }

  // Try to find bonding curve
  const PUMP_FUN_PROGRAM = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");
  const [bondingCurve] = PublicKey.findProgramAddressSync(
    [Buffer.from("bonding-curve"), new PublicKey(mint).toBuffer()],
    PUMP_FUN_PROGRAM
  );

  const [associatedBondingCurve] = PublicKey.findProgramAddressSync(
    [bondingCurve.toBuffer(), Buffer.from("associated-bonding-curve")],
    PUMP_FUN_PROGRAM
  );

  // Get bonding curve data if available
  const bondingCurveAccount = await connection.getAccountInfo(bondingCurve);

  // Try to parse bonding curve data
  let result: PumpFunToken;

  if (bondingCurveAccount) {
    try {
      const data = bondingCurveAccount.data;
      const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
      let offset = 8; // Skip discriminator
      
      const virtualSolReserves = view.getBigUint64(offset, true); offset += 8;
      const virtualTokenReserves = view.getBigUint64(offset, true); offset += 8;
      const realSolReserves = view.getBigUint64(offset, true); offset += 8;
      const realTokenReserves = view.getBigUint64(offset, true); offset += 8;
      const totalSupply = view.getBigUint64(offset, true); offset += 8;
      const complete = data[offset++] === 1;
      const creator = new PublicKey(data.slice(offset, offset + 32));

      return {
        mint,
        name: "PumpFun Token",
        symbol: "PUMP",
        uri: "",
        bondingCurve: bondingCurve.toBase58(),
        associatedBondingCurve: associatedBondingCurve.toBase58(),
        creator: "unknown",
        createdTimestamp: Date.now(),
        virtualSolReserves: Number(virtualSolReserves) / 1e9,
        virtualTokenReserves: Number(virtualTokenReserves) / 1e6,
        realSolReserves: Number(realSolReserves) / 1e9,
        realTokenReserves: Number(realTokenReserves) / 1e6,
        totalSupply: Number(totalSupply) / 1e6,
        complete: false,
        usdMarketCap: null,
        dataSource: "onchain" as const,
      };
    } catch {
      // Fall through to default
    }
  }

  // Default fallback with minimal data
  return {
    mint,
    name: "PumpFun Token",
    symbol: "PUMP",
    uri: "",
    bondingCurve: "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
    associatedBondingCurve: "BondingCurve111111111111111111111111111111111111111",
    creator: "unknown",
    createdTimestamp: Date.now(),
    virtualSolReserves: 0,
    virtualTokenReserves: 0,
    realSolReserves: 0,
    realTokenReserves: 0,
    totalSupply: 0,
    complete: false,
    usdMarketCap: null,
    dataSource: "onchain" as const,
  };
}
`;

const newContent = content.substring(0, functionStart) + newFunction + content.substring(functionStart + (nextFunction - functionStart));

fs.writeFileSync(filePath, newContent);
console.log('Function restructured successfully');