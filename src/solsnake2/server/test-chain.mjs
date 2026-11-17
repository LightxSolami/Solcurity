import assert from 'node:assert/strict'; import crypto from 'node:crypto';
import { PublicKey } from '@solana/web3.js'; import { parseMatch, pdas } from './chain.js';
// discriminators must equal sha256("global:<name>")[0..8]
const d = n => [...crypto.createHash('sha256').update('global:' + n).digest().subarray(0, 8)];
assert.deepEqual(d('create_match'), [107, 2, 184, 145, 70, 142, 17, 165]); assert.deepEqual(d('settle_match'), [71, 124, 117, 96, 191, 217, 116, 24]);
// parser against the layout asserted in the Rust test
const b = Buffer.alloc(266), k = n => Buffer.alloc(32, n);
b.writeBigUInt64LE(77n, 8); k(1).copy(b, 16); k(2).copy(b, 48); b.writeBigUInt64LE(500000000n, 80); b.writeUInt16LE(500, 88);
for (let i = 0; i < 5; i++) k(10 + i).copy(b, 90 + i * 32); b[255] = 3; b[256] = 0; b.writeBigInt64LE(1700000000n, 257);
const m = parseMatch(b); assert.equal(m.matchId, 77n); assert.equal(m.count, 3); assert.equal(m.players.length, 3); assert.equal(m.entryFee, 500000000n); assert.equal(m.feeBps, 500); assert.equal(m.status, 'Open');
assert.equal(m.players[1], new PublicKey(k(11)).toBase58());
const p = pdas(new PublicKey('11111111111111111111111111111111'), 5n); assert.ok(p.gm && p.vault);
console.log('chain tests ok');
