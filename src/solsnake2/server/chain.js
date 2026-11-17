// Raw web3.js client for the escrow program (no Anchor/IDL needed at runtime).
// Discriminators and the account layout are checked against the Rust code by `cargo test`.
import fs from 'node:fs';
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, sendAndConfirmTransaction } from '@solana/web3.js';
const D = { create: [107, 2, 184, 145, 70, 142, 17, 165], settle: [71, 124, 117, 96, 191, 217, 116, 24] };
export const FEES = { '0.5': 500_000_000n, '1': 1_000_000_000n, '10': 10_000_000_000n };
const u64 = n => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b; };
const u16 = n => { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; };
export function load(env = process.env) {
  for (const k of ['PROGRAM_ID', 'RPC_URL', 'SERVER_KEYPAIR', 'TREASURY_PUBKEY']) if (!env[k]) throw new Error('Missing env ' + k);
  const kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(env.SERVER_KEYPAIR, 'utf8'))));
  return { conn: new Connection(env.RPC_URL, 'confirmed'), kp, programId: new PublicKey(env.PROGRAM_ID), treasury: new PublicKey(env.TREASURY_PUBKEY),
    feeBps: +env.FEE_BPS || 500, rpc: env.RPC_URL, cluster: env.CLUSTER || 'devnet' };
}
export function pdas(programId, matchId) {
  const [gm] = PublicKey.findProgramAddressSync([Buffer.from('match'), u64(matchId)], programId);
  const [vault] = PublicKey.findProgramAddressSync([Buffer.from('vault'), gm.toBuffer()], programId);
  return { gm, vault };
}
export async function createMatch(c, matchId, entryFee) {
  const { gm, vault } = pdas(c.programId, matchId);
  const ix = new TransactionInstruction({ programId: c.programId, data: Buffer.concat([Buffer.from(D.create), u64(matchId), u64(entryFee), u16(c.feeBps)]),
    keys: [{ pubkey: gm, isSigner: false, isWritable: true }, { pubkey: vault, isSigner: false, isWritable: false }, { pubkey: c.kp.publicKey, isSigner: true, isWritable: true },
      { pubkey: c.treasury, isSigner: false, isWritable: false }, { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }] });
  const sig = await sendAndConfirmTransaction(c.conn, new Transaction().add(ix), [c.kp]);
  return { gm: gm.toBase58(), vault: vault.toBase58(), programId: c.programId.toBase58(), fee: entryFee.toString(), rpc: c.rpc, cluster: c.cluster, sig };
}
export function parseMatch(buf) { // layout: 8 disc + fields (see Rust test)
  const pk = (o) => new PublicKey(buf.subarray(o, o + 32)).toBase58(), count = buf[255];
  return { matchId: buf.readBigUInt64LE(8), authority: pk(16), treasury: pk(48), entryFee: buf.readBigUInt64LE(80), feeBps: buf.readUInt16LE(88),
    players: Array.from({ length: 5 }, (_, i) => pk(90 + i * 32)).slice(0, count), count, status: ['Open', 'Settled', 'Cancelled'][buf[256]], createdAt: buf.readBigInt64LE(257) };
}
export async function readMatch(c, gmBase58) {
  const a = await c.conn.getAccountInfo(new PublicKey(gmBase58), 'confirmed');
  if (!a || !a.owner.equals(c.programId)) throw new Error('match account not found');
  return parseMatch(a.data);
}
export async function settle(c, matchId, winner) {
  const { gm, vault } = pdas(c.programId, matchId), w = new PublicKey(winner);
  const ix = new TransactionInstruction({ programId: c.programId, data: Buffer.concat([Buffer.from(D.settle), w.toBuffer()]),
    keys: [{ pubkey: gm, isSigner: false, isWritable: true }, { pubkey: vault, isSigner: false, isWritable: true }, { pubkey: c.kp.publicKey, isSigner: true, isWritable: false },
      { pubkey: w, isSigner: false, isWritable: true }, { pubkey: c.treasury, isSigner: false, isWritable: true }, { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }] });
  return sendAndConfirmTransaction(c.conn, new Transaction().add(ix), [c.kp]);
}
