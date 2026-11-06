// Raw web3.js client for the escrow program (no Anchor/IDL needed at runtime).
// Discriminators and the account layout are checked against the Rust code by `cargo test`.
import fs from 'node:fs';
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, sendAndConfirmTransaction } from '@solana/web3.js';
const D = { create: [107, 2, 184, 145, 70, 142, 17, 165], settle: [71, 124, 117, 96, 191, 217, 116, 24] };
const MATCH_DISCRIMINATOR = [87, 187, 102, 98, 236, 52, 127, 39];
export const DEV_FEE_BPS = 50;
export const DEVELOPER_WALLET = 'DLbjcTvMHuvENT1336tdSRd9giHzJd5Uwo5WraqQ3k82';
export const FEES = { '0.05': 50_000_000n, '0.1': 100_000_000n, '0.5': 500_000_000n, '1': 1_000_000_000n };
const DEVNET_GENESIS_HASH = 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';
const MATCH_ACCOUNT_SIZE = 266;
const u64 = n => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b; };
const u16 = n => { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; };
export function load(env = process.env) {
  for (const k of ['PROGRAM_ID', 'RPC_URL', 'SERVER_KEYPAIR', 'TREASURY_PUBKEY', 'CLUSTER']) if (!env[k]) throw new Error('Missing env ' + k);
  if (env.CLUSTER !== 'devnet') throw new Error('Wagering is devnet-only; mainnet is disabled.');
  if (env.FEE_BPS !== undefined && Number(env.FEE_BPS) !== DEV_FEE_BPS) throw new Error('FEE_BPS must be 50 (0.5%).');
  const treasury = new PublicKey(env.TREASURY_PUBKEY);
  if (!treasury.equals(new PublicKey(DEVELOPER_WALLET))) throw new Error('TREASURY_PUBKEY does not match the program treasury.');
  const programId = new PublicKey(env.PROGRAM_ID);
  if (programId.equals(SystemProgram.programId)) throw new Error('PROGRAM_ID must be the deployed SolSnake escrow program, not the System Program placeholder.');
  const kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(env.SERVER_KEYPAIR, 'utf8'))));
  return { conn: new Connection(env.RPC_URL, 'confirmed'), kp, programId, treasury, feeBps: DEV_FEE_BPS,
    rpc: env.RPC_URL, cluster: env.CLUSTER };
}
export async function assertDevnet(c) {
  const genesisHash = await c.conn.getGenesisHash();
  if (genesisHash !== DEVNET_GENESIS_HASH) throw new Error('RPC_URL is not connected to Solana Devnet; wagering startup refused.');
}
export function pdas(programId, matchId) {
  const [gm] = PublicKey.findProgramAddressSync([Buffer.from('match'), u64(matchId)], programId);
  const [vault] = PublicKey.findProgramAddressSync([Buffer.from('vault'), gm.toBuffer()], programId);
  return { gm, vault };
}
export async function createMatch(c, matchId, entryFee) {
  if (!Object.values(FEES).includes(BigInt(entryFee))) throw new Error('Unsupported entry fee.');
  const { gm, vault } = pdas(c.programId, matchId);
  const ix = new TransactionInstruction({ programId: c.programId, data: Buffer.concat([Buffer.from(D.create), u64(matchId), u64(entryFee), u16(c.feeBps)]),
    keys: [{ pubkey: gm, isSigner: false, isWritable: true }, { pubkey: vault, isSigner: false, isWritable: false }, { pubkey: c.kp.publicKey, isSigner: true, isWritable: true },
      { pubkey: c.treasury, isSigner: false, isWritable: false }, { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }] });
  const sig = await sendAndConfirmTransaction(c.conn, new Transaction().add(ix), [c.kp]);
  return { gm: gm.toBase58(), vault: vault.toBase58(), programId: c.programId.toBase58(), fee: entryFee.toString(), rpc: c.rpc, cluster: c.cluster, sig };
}
export function parseMatch(buf) {
  if (!Buffer.isBuffer(buf) || buf.length !== MATCH_ACCOUNT_SIZE) throw new Error('Invalid match account size.');
  if (!buf.subarray(0, 8).equals(Buffer.from(MATCH_DISCRIMINATOR))) throw new Error('Invalid match account discriminator.');
  if (buf[255] > 5 || buf[256] > 2) throw new Error('Invalid match account state.');
  const pk = (o) => new PublicKey(buf.subarray(o, o + 32)).toBase58(), count = buf[255];
  return { matchId: buf.readBigUInt64LE(8), authority: pk(16), treasury: pk(48), entryFee: buf.readBigUInt64LE(80), feeBps: buf.readUInt16LE(88),
    players: Array.from({ length: 5 }, (_, i) => pk(90 + i * 32)).slice(0, count), count, status: ['Open', 'Settled', 'Cancelled'][buf[256]], createdAt: buf.readBigInt64LE(257) };
}
export async function readMatch(c, gmBase58, expectedMatchId) {
  const a = await c.conn.getAccountInfo(new PublicKey(gmBase58), 'confirmed');
  if (!a || !a.owner.equals(c.programId)) throw new Error('match account not found');
  const match = parseMatch(a.data);
  const expectedPda = pdas(c.programId, match.matchId).gm;
  if (!expectedPda.equals(new PublicKey(gmBase58))) throw new Error('Invalid match address.');
  if (expectedMatchId !== undefined && match.matchId !== BigInt(expectedMatchId)) throw new Error('Unexpected match ID.');
  if (match.authority !== c.kp.publicKey.toBase58() || match.treasury !== c.treasury.toBase58()
    || match.feeBps !== DEV_FEE_BPS || !Object.values(FEES).includes(match.entryFee)) {
    throw new Error('On-chain match configuration does not match server policy.');
  }
  return match;
}
export async function buildSettlement(c, matchId, winner) {
  const { gm, vault } = pdas(c.programId, matchId), w = new PublicKey(winner);
  const match = await readMatch(c, gm.toBase58(), matchId);
  if (match.status !== 'Open' || match.count !== 5 || !match.players.includes(w.toBase58())) {
    throw new Error('Match is not eligible for settlement.');
  }
  const latest = await c.conn.getLatestBlockhash('confirmed');
  const ix = new TransactionInstruction({ programId: c.programId, data: Buffer.concat([Buffer.from(D.settle), w.toBuffer()]),
    keys: [{ pubkey: gm, isSigner: false, isWritable: true }, { pubkey: vault, isSigner: false, isWritable: true }, { pubkey: c.kp.publicKey, isSigner: true, isWritable: false },
      { pubkey: w, isSigner: false, isWritable: true }, { pubkey: c.treasury, isSigner: false, isWritable: true }, { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ...match.players.map(player => ({ pubkey: new PublicKey(player), isSigner: true, isWritable: false }))] });
  const transaction = new Transaction({ feePayer: c.kp.publicKey, recentBlockhash: latest.blockhash }).add(ix);
  return { transaction: transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'),
    players: match.players, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight };
}
export function mergeSettlementApproval(transactionBase64, signedBase64, walletAddress, players) {
  const wallet = new PublicKey(walletAddress);
  if (!players.includes(wallet.toBase58())) throw new Error('Wallet is not a participant in this match.');
  const transaction = Transaction.from(Buffer.from(transactionBase64, 'base64'));
  const signed = Transaction.from(Buffer.from(signedBase64, 'base64'));
  if (!transaction.serializeMessage().equals(signed.serializeMessage())) throw new Error('Wallet approval is for a different transaction.');
  if (!signed.verifySignatures(false)) throw new Error('Invalid transaction signature.');
  const approval = signed.signatures.find(item => item.publicKey.equals(wallet));
  if (!approval?.signature) throw new Error('Wallet did not sign the settlement.');
  const target = transaction.signatures.find(item => item.publicKey.equals(wallet));
  if (!target) throw new Error('Wallet is not a required settlement signer.');
  target.signature = Buffer.from(approval.signature);
  return transaction;
}
export async function submitSettlement(c, transaction, players, lastValidBlockHeight) {
  const expected = new Set(players);
  const signed = new Set(transaction.signatures.filter(item => item.signature).map(item => item.publicKey.toBase58()));
  if (players.length !== 5 || expected.size !== 5 || players.some(player => !signed.has(player))) {
    throw new Error('Every player must approve the settlement.');
  }
  transaction.partialSign(c.kp);
  if (!transaction.verifySignatures()) throw new Error('Settlement is missing a valid player or authority signature.');
  const signature = await c.conn.sendRawTransaction(transaction.serialize(), { preflightCommitment: 'confirmed' });
  await c.conn.confirmTransaction({ signature, blockhash: transaction.recentBlockhash, lastValidBlockHeight }, 'confirmed');
  return signature;
}
