// Raw web3.js client for the escrow program (no Anchor/IDL needed at runtime).
// Discriminators and the account layout are checked against the Rust code by `cargo test`.
import fs from 'node:fs';
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, sendAndConfirmTransaction } from '@solana/web3.js';
const D = { create: [107, 2, 184, 145, 70, 142, 17, 165] };
export const COMMIT_MOVE_DISCRIMINATOR = [27, 16, 69, 212, 175, 110, 123, 189];
export const REVEAL_MOVE_DISCRIMINATOR = [30, 133, 198, 26, 106, 44, 55, 149];
const MATCH_DISCRIMINATOR = [87, 187, 102, 98, 236, 52, 127, 39];
export const DEV_FEE_BPS = 50;
export const DEVELOPER_WALLET = 'DLbjcTvMHuvENT1336tdSRd9giHzJd5Uwo5WraqQ3k82';
export const FEES = { '0.5': 500_000_000n, '1': 1_000_000_000n, '10': 10_000_000_000n };
export const CLUSTER_GENESIS_HASHES = {
  devnet: 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG',
  testnet: '4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY',
};
const MATCH_ACCOUNT_SIZE = 474;
const u64 = n => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b; };
const u16 = n => { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; };
export function load(env = process.env) {
  for (const k of ['PROGRAM_ID', 'RPC_URL', 'SERVER_KEYPAIR', 'TREASURY_PUBKEY', 'CLUSTER']) if (!env[k]) throw new Error('Missing env ' + k);
  if (!Object.hasOwn(CLUSTER_GENESIS_HASHES, env.CLUSTER)) {
    throw new Error('Wagering is supported on Devnet and Testnet only; mainnet is disabled.');
  }
  if (env.FEE_BPS !== undefined && Number(env.FEE_BPS) !== DEV_FEE_BPS) throw new Error('FEE_BPS must be 50 (0.5%).');
  const treasury = new PublicKey(env.TREASURY_PUBKEY);
  if (!treasury.equals(new PublicKey(DEVELOPER_WALLET))) throw new Error('TREASURY_PUBKEY does not match the program treasury.');
  const programId = new PublicKey(env.PROGRAM_ID);
  if (programId.equals(SystemProgram.programId)) throw new Error('PROGRAM_ID must be the deployed SolSnake escrow program, not the System Program placeholder.');
  const kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(env.SERVER_KEYPAIR, 'utf8'))));
  return { conn: new Connection(env.RPC_URL, 'confirmed'), kp, programId, treasury, feeBps: DEV_FEE_BPS,
    rpc: env.RPC_URL, cluster: env.CLUSTER };
}
export async function assertSupportedCluster(c) {
  const expectedGenesisHash = CLUSTER_GENESIS_HASHES[c.cluster];
  if (!expectedGenesisHash) throw new Error('Wagering is supported on Devnet and Testnet only.');
  const genesisHash = await c.conn.getGenesisHash();
  if (genesisHash !== expectedGenesisHash) {
    const clusterName = c.cluster === 'testnet' ? 'Testnet' : 'Devnet';
    throw new Error(`RPC_URL is not connected to Solana ${clusterName}; wagering startup refused.`);
  }
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
  if (buf[255] > 5 || buf[256] > 3) throw new Error('Invalid match account state.');
  const pk = (o) => new PublicKey(buf.subarray(o, o + 32)).toBase58(), count = buf[255];
  if (buf[473] > 1) throw new Error('Invalid match phase.');
  const positions = Array.from({ length: 5 }, (_, i) =>
    Array.from({ length: 3 }, (__, j) => buf.readUInt16LE(266 + i * 6 + j * 2)));
  const directions = Array.from(buf.subarray(296, 301));
  const alive = Array.from(buf.subarray(301, 306), value => {
    if (value > 1) throw new Error('Invalid match player state.');
    return value === 1;
  });
  const commitments = Array.from({ length: 5 }, (_, i) => buf.subarray(306 + i * 32, 338 + i * 32));
  const committed = commitments.map(commitment => commitment.some(byte => byte !== 0));
  const revealedMoves = Array.from(buf.subarray(466, 471));
  if (directions.some(direction => direction > 3)
    || revealedMoves.some(move => move !== 255 && move > 3)) {
    throw new Error('Invalid match move state.');
  }
  return { matchId: buf.readBigUInt64LE(8), authority: pk(16), treasury: pk(48), entryFee: buf.readBigUInt64LE(80), feeBps: buf.readUInt16LE(88),
    players: Array.from({ length: 5 }, (_, i) => pk(90 + i * 32)).slice(0, count), count, status: ['Open', 'Settled', 'Cancelled', 'Draw'][buf[256]], createdAt: buf.readBigInt64LE(257),
    positions, directions, alive, committed, revealedMoves, round: buf.readUInt16LE(471), revealing: buf[473] === 1 };
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
