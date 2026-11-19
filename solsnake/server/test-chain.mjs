import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import {
  assertDevnet,
  createMatch,
  parseMatch,
  pdas,
  FEES,
  DEV_FEE_BPS,
  DEVELOPER_WALLET,
  COMMIT_MOVE_DISCRIMINATOR,
  REVEAL_MOVE_DISCRIMINATOR,
  load,
} from './chain.js';

const discriminator = name =>
  [...crypto.createHash('sha256').update('global:' + name).digest().subarray(0, 8)];
assert.deepEqual(discriminator('create_match'), [107, 2, 184, 145, 70, 142, 17, 165]);
assert.deepEqual(discriminator('commit_move'), COMMIT_MOVE_DISCRIMINATOR);
assert.deepEqual(discriminator('reveal_move'), REVEAL_MOVE_DISCRIMINATOR);

const data = Buffer.alloc(474);
Buffer.from([87, 187, 102, 98, 236, 52, 127, 39]).copy(data, 0);
data.writeBigUInt64LE(77n, 8);
Buffer.alloc(32, 1).copy(data, 16);
Buffer.from(new PublicKey(DEVELOPER_WALLET).toBytes()).copy(data, 48);
data.writeBigUInt64LE(500_000_000n, 80);
data.writeUInt16LE(DEV_FEE_BPS, 88);
const players = Array.from({ length: 5 }, (_, i) => new PublicKey(Buffer.alloc(32, 10 + i)).toBase58());
players.forEach((player, i) => new PublicKey(player).toBuffer().copy(data, 90 + i * 32));
data[255] = 5;
data[256] = 0;
data.writeBigInt64LE(1_700_000_000n, 257);
for (let i = 0; i < 15; i++) data.writeUInt16LE(i + 100, 266 + i * 2);
data.fill(1, 296, 301);
data.fill(1, 301, 306);
data.fill(4, 306, 466);
data.fill(255, 466, 471);
data.writeUInt16LE(12, 471);
data[473] = 1;

const match = parseMatch(data);
assert.equal(match.matchId, 77n);
assert.equal(match.count, 5);
assert.equal(match.players[1], players[1]);
assert.equal(match.entryFee, 500_000_000n);
assert.equal(match.feeBps, DEV_FEE_BPS);
assert.equal(match.status, 'Open');
assert.deepEqual(match.positions[0], [100, 101, 102]);
assert.deepEqual(match.directions, [1, 1, 1, 1, 1]);
assert.deepEqual(match.alive, [true, true, true, true, true]);
assert.deepEqual(match.committed, [true, true, true, true, true]);
assert.deepEqual(match.revealedMoves, [255, 255, 255, 255, 255]);
assert.equal(match.round, 12);
assert.equal(match.revealing, true);

const matchId = Buffer.alloc(8);
matchId.writeBigUInt64LE(42n);
const round = Buffer.alloc(2);
round.writeUInt16LE(3);
const commitment = crypto.createHash('sha256').update(Buffer.concat([
  Buffer.from('solsnake-move-v1'),
  matchId,
  round,
  Buffer.alloc(32, 9),
  Buffer.from([1]),
  Buffer.alloc(32, 7),
])).digest();
assert.deepEqual([...commitment], [
  62, 235, 151, 109, 224, 168, 166, 72, 51, 51, 137, 180, 225, 236, 79, 46,
  88, 48, 240, 33, 82, 237, 79, 91, 156, 182, 129, 146, 55, 89, 168, 243,
]);

assert.throws(() => parseMatch(Buffer.alloc(474)), /discriminator/);
assert.throws(() => parseMatch(Buffer.alloc(473)), /size/);
const invalidCount = Buffer.from(data);
invalidCount[255] = 6;
assert.throws(() => parseMatch(invalidCount), /state/);
const invalidStatus = Buffer.from(data);
invalidStatus[256] = 4;
assert.throws(() => parseMatch(invalidStatus), /state/);
const invalidDirection = Buffer.from(data);
invalidDirection[296] = 4;
assert.throws(() => parseMatch(invalidDirection), /move state/);
const invalidRevealedMove = Buffer.from(data);
invalidRevealedMove[466] = 4;
assert.throws(() => parseMatch(invalidRevealedMove), /move state/);
const invalidPhase = Buffer.from(data);
invalidPhase[473] = 2;
assert.throws(() => parseMatch(invalidPhase), /phase/);
assert.deepEqual(FEES, { '0.5': 500_000_000n, '1': 1_000_000_000n, '10': 10_000_000_000n });
assert.equal(new PublicKey(DEVELOPER_WALLET).toBase58(), DEVELOPER_WALLET);

const env = {
  PROGRAM_ID: Keypair.generate().publicKey.toBase58(),
  RPC_URL: 'https://api.devnet.solana.com',
  SERVER_KEYPAIR: 'unused',
  TREASURY_PUBKEY: DEVELOPER_WALLET,
  CLUSTER: 'mainnet-beta',
};
assert.throws(() => load(env), /devnet-only/);
assert.throws(() => load({ ...env, CLUSTER: 'devnet', FEE_BPS: '500' }), /FEE_BPS must be 50/);
assert.throws(() => load({ ...env, CLUSTER: 'devnet', TREASURY_PUBKEY: SystemProgram.programId.toBase58() }), /TREASURY_PUBKEY/);
await assert.rejects(() => assertDevnet({ conn: { getGenesisHash: async () => 'mainnet-genesis' } }), /not connected to Solana Devnet/);
await assert.rejects(() => createMatch(null, 1n, 123n), /Unsupported entry fee/);
const addresses = pdas(new PublicKey(SystemProgram.programId), 5n);
assert.ok(addresses.gm && addresses.vault);
console.log('on-chain game client tests ok');
