import assert from 'node:assert/strict'; import crypto from 'node:crypto';
import { Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js'; import { assertDevnet, createMatch, mergeSettlementApproval, parseMatch, pdas, FEES, DEV_FEE_BPS, DEVELOPER_WALLET, load } from './chain.js';
// discriminators must equal sha256("global:<name>")[0..8]
const d = n => [...crypto.createHash('sha256').update('global:' + n).digest().subarray(0, 8)];
assert.deepEqual(d('create_match'), [107, 2, 184, 145, 70, 142, 17, 165]); assert.deepEqual(d('settle_match'), [71, 124, 117, 96, 191, 217, 116, 24]);
// parser against the layout asserted in the Rust test
const b = Buffer.alloc(266), k = n => Buffer.alloc(32, n);
Buffer.from([87, 187, 102, 98, 236, 52, 127, 39]).copy(b, 0);
b.writeBigUInt64LE(77n, 8); k(1).copy(b, 16); k(2).copy(b, 48); b.writeBigUInt64LE(500000000n, 80); b.writeUInt16LE(DEV_FEE_BPS, 88);
for (let i = 0; i < 5; i++) k(10 + i).copy(b, 90 + i * 32); b[255] = 3; b[256] = 0; b.writeBigInt64LE(1700000000n, 257);
const m = parseMatch(b); assert.equal(m.matchId, 77n); assert.equal(m.count, 3); assert.equal(m.players.length, 3); assert.equal(m.entryFee, 500000000n); assert.equal(m.feeBps, DEV_FEE_BPS); assert.equal(m.status, 'Open');
assert.equal(m.players[1], new PublicKey(k(11)).toBase58());
assert.deepEqual(FEES, { '0.05': 50_000_000n, '0.1': 100_000_000n, '0.5': 500_000_000n, '1': 1_000_000_000n });
assert.equal(new PublicKey(DEVELOPER_WALLET).toBase58(), DEVELOPER_WALLET);
assert.throws(() => parseMatch(Buffer.alloc(266)), /discriminator/);
assert.throws(() => parseMatch(Buffer.alloc(265)), /size/);
const invalidCount = Buffer.from(b); invalidCount[255] = 6;
assert.throws(() => parseMatch(invalidCount), /state/);
const env = { PROGRAM_ID: Keypair.generate().publicKey.toBase58(), RPC_URL: 'https://api.devnet.solana.com', SERVER_KEYPAIR: 'unused', TREASURY_PUBKEY: DEVELOPER_WALLET, CLUSTER: 'mainnet-beta' };
assert.throws(() => load(env), /devnet-only/);
assert.throws(() => load({ ...env, CLUSTER: 'devnet', FEE_BPS: '500' }), /FEE_BPS must be 50/);
assert.throws(() => load({ ...env, CLUSTER: 'devnet', TREASURY_PUBKEY: SystemProgram.programId.toBase58() }), /TREASURY_PUBKEY/);
await assert.rejects(() => assertDevnet({ conn: { getGenesisHash: async () => 'mainnet-genesis' } }), /not connected to Solana Devnet/);
await assert.rejects(() => createMatch(null, 1n, 123n), /Unsupported entry fee/);
const authority = Keypair.generate(), players = Array.from({ length: 5 }, () => Keypair.generate());
const approvalTransaction = new Transaction({ feePayer: authority.publicKey, recentBlockhash: SystemProgram.programId.toBase58() }).add(
  new TransactionInstruction({ programId: SystemProgram.programId, data: Buffer.from([1]), keys: players.map(player => ({ pubkey: player.publicKey, isSigner: true, isWritable: false })) })
);
const approvalBase64 = approvalTransaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64');
const playerApproval = Transaction.from(Buffer.from(approvalBase64, 'base64'));
playerApproval.partialSign(players[0]);
const playerApprovalBase64 = playerApproval.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64');
const mergedApproval = mergeSettlementApproval(approvalBase64, playerApprovalBase64, players[0].publicKey.toBase58(), players.map(player => player.publicKey.toBase58()));
assert.ok(mergedApproval.signatures.find(item => item.publicKey.equals(players[0].publicKey)).signature);
assert.throws(() => mergeSettlementApproval(approvalBase64, playerApprovalBase64, authority.publicKey.toBase58(), players.map(player => player.publicKey.toBase58())), /not a participant/);
const alteredTransaction = Transaction.from(Buffer.from(approvalBase64, 'base64'));
alteredTransaction.instructions[0].data = Buffer.from([2]);
assert.throws(() => mergeSettlementApproval(alteredTransaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'), playerApprovalBase64, players[0].publicKey.toBase58(), players.map(player => player.publicKey.toBase58())), /different transaction/);
const unanimous = Transaction.from(Buffer.from(approvalBase64, 'base64'));
for (const player of players) {
  const signed = Transaction.from(Buffer.from(approvalBase64, 'base64'));
  signed.partialSign(player);
  const signedBase64 = signed.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64');
  const approved = mergeSettlementApproval(approvalBase64, signedBase64, player.publicKey.toBase58(), players.map(item => item.publicKey.toBase58()));
  unanimous.signatures.find(item => item.publicKey.equals(player.publicKey)).signature =
    approved.signatures.find(item => item.publicKey.equals(player.publicKey)).signature;
}
unanimous.partialSign(authority);
assert.equal(unanimous.verifySignatures(), true);
const p = pdas(new PublicKey('11111111111111111111111111111111'), 5n); assert.ok(p.gm && p.vault);
console.log('chain tests ok');
