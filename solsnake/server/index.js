import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws'; import { PublicKey } from '@solana/web3.js';
import { Match, DT, MAX } from './game.js'; import * as chain from './chain.js';
const PORT = +process.env.PORT || 8080, dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../client');
const PAID = process.env.PAID_ENABLED === 'true'; // paid rooms: real on-chain deposits. Off by default.
const C = PAID ? chain.load() : null;
const BOTN = ['Nova', 'Vex', 'Kira', 'Zed', 'Rex'], FILL_MS = 8000, DEPOSIT_MS = 90000, sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = http.createServer((q, r) => {
  if (q.url.split('?')[0] === '/config') {
    r.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    r.end(JSON.stringify({ paid: PAID, cluster: PAID ? C.cluster : null }));
    return;
  }
  const f = q.url === '/' ? 'online.html' : path.basename(q.url.split('?')[0]);
  fs.readFile(path.join(dir, f), (e, d) => { if (e) { r.writeHead(404); r.end('not found'); } else { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); r.end(d); } });
});
const wss = new WebSocketServer({ server: srv, maxPayload: 16_384 });
const Q = { free: [], '0.5': [], '1': [], '10': [] }; let freeTimer = null;
const send = (c, o) => { if (c.ws.readyState === 1) c.ws.send(typeof o === 'string' ? o : JSON.stringify(o)); };
const queued = c => Object.values(Q).some(q => q.includes(c));

function run(humans, fill, onWinner) {
  const players = [...humans]; for (let i = 0; fill && players.length < MAX; i++) players.push({ bot: true, name: BOTN[i] });
  let iv; const m = new Match(players, async mm => {
    clearInterval(iv);
    for (const s of mm.S) if (!s.bot && !s.p.gone) { send(s.p, { t: 'end', place: s.place || 1, len: Math.round(s.len), kills: s.k }); s.p.match = null; }
    const w = mm.S.find(s => s.place === 1 && !s.bot); if (onWinner && w) await onWinner(w.p);
  });
  humans.forEach(h => { h.match = m; send(h, { t: 'start' }); });
  iv = setInterval(() => { m.tick(); for (const s of m.S) if (!s.bot && !s.p.gone && !m.over) send(s.p, m.snapFor(s)); }, DT * 1000);
}
function startFree() {
  clearTimeout(freeTimer); freeTimer = null; const humans = Q.free.splice(0, MAX); if (!humans.length) return;
  if (Q.free.length) freeTimer = setTimeout(startFree, FILL_MS); run(humans, true, null);
}
function chainState(match) {
  return {
    status: match.status,
    count: match.count,
    players: match.players,
    treasury: match.treasury,
    positions: match.positions,
    directions: match.directions,
    alive: match.alive,
    committed: match.committed,
    revealedMoves: match.revealedMoves,
    round: match.round,
    revealing: match.revealing,
  };
}
async function watchPaidMatch(humans, info, id) {
  while (true) {
    await sleep(1200);
    let match;
    try {
      match = await chain.readMatch(C, info.gm, id);
    } catch (e) {
      console.error('MATCH STATE READ FAILED', id, e.message);
      humans.forEach(h => send(h, { t: 'state_error', msg: 'Could not refresh on-chain match state. Retrying.' }));
      continue;
    }

    const state = chainState(match);
    humans.forEach(h => send(h, { t: 'chain_state', state }));
    if (match.status === 'Open') continue;

    const winnerIndex = match.status === 'Settled' ? match.alive.findIndex(Boolean) : -1;
    humans.forEach(h => send(h, {
      t: 'chain_end',
      status: match.status,
      winner: winnerIndex >= 0 ? match.players[winnerIndex] : null,
      state,
      gm: info.gm,
      vault: info.vault,
      programId: info.programId,
      rpc: info.rpc,
    }));
    return;
  }
}
async function startPaid(tier) {
  const humans = Q[tier].splice(0, MAX), id = BigInt(Date.now()) * 1000n + BigInt(Math.floor(Math.random() * 1000));
  humans.forEach(h => { h.onchainMatch = 'pending'; });
  let info = null;
  try {
    info = await chain.createMatch(C, id, chain.FEES[tier]); info.matchId = id.toString();
    humans.forEach(h => send(h, { t: 'deposit', tier, ...info }));
    const t0 = Date.now();
    while (Date.now() - t0 < DEPOSIT_MS && humans.every(h => !h.gone)) {
      await sleep(2000);
      const mm = await chain.readMatch(C, info.gm, id), on = new Set(mm.players);
      if (mm.status === 'Open' && mm.entryFee === chain.FEES[tier] && mm.count === MAX && humans.every(h => on.has(h.wallet))) {
        const infoForClients = { ...info, matchId: id.toString(), onchain: true };
        humans.forEach(h => {
          h.onchainMatch = info.gm;
          send(h, { t: 'start', onchain: true, match: infoForClients, state: chainState(mm) });
        });
        return watchPaidMatch(humans, info, id);
      }
    }
    humans.forEach(h => { h.onchainMatch = null; send(h, { t: 'abort', ...info }); });
    console.warn('match aborted before all deposits', id);
  } catch (e) {
    console.error('startPaid', e.message);
    if (info) humans.forEach(h => { h.onchainMatch = null; send(h, { t: 'abort', ...info }); });
    else humans.forEach(h => { h.onchainMatch = null; send(h, { t: 'err', msg: 'Could not open the on-chain match. No player deposit was requested.' }); });
  }
}
wss.on('connection', ws => {
  const c = { ws, name: 'Player', match: null, gone: false, msgs: 0, wallet: null, onchainMatch: null };
  const rl = setInterval(() => c.msgs = 0, 1000);
  send(c, { t: 'cfg', paid: PAID, cluster: C?.cluster, rpc: C?.rpc, programId: C?.programId.toBase58() });
  ws.on('message', raw => {
    if (++c.msgs > 90) return; let m; try { m = JSON.parse(raw); } catch { return; }
    if (m.t === 'join' && !c.match && !c.onchainMatch && !queued(c)) {
      const tier = String(m.tier || 'free');
      if (!(tier in Q)) return send(c, { t: 'err', msg: 'Unknown room.' });
      if (tier !== 'free') {
        if (!PAID) return send(c, { t: 'err', msg: 'Paid rooms are locked until escrow, audit and legal review are complete.' });
        try { c.wallet = new PublicKey(m.wallet).toBase58(); } catch { return send(c, { t: 'err', msg: 'Connect a wallet first.' }); }
        if (Q[tier].some(q => q.wallet === c.wallet)) return send(c, { t: 'err', msg: 'This wallet is already waiting.' });
      }
      c.name = String(m.name || 'Player').replace(/[^\w \-]/g, '').slice(0, 12) || 'Player';
      Q[tier].push(c); send(c, { t: 'wait', n: Q[tier].length, bots: tier === 'free' });
      if (Q[tier].length >= MAX) tier === 'free' ? startFree() : startPaid(tier);
      else if (tier === 'free' && !freeTimer) freeTimer = setTimeout(startFree, FILL_MS);
    } else if (m.t === 'in' && c.match) {
      const s = c.match.S.find(q => q.p === c); if (!s || !s.alive) return;
      if (Number.isFinite(m.a)) s.ta = m.a % 6.2832; s.boost = !!m.b;
    }
  });
  ws.on('close', () => { c.gone = true; clearInterval(rl); for (const k in Q) Q[k] = Q[k].filter(q => q !== c); });
});
async function start() {
  if (PAID) await chain.assertDevnet(C);
  srv.listen(PORT, '0.0.0.0', () => console.log(`SOLSNAKE server on port ${PORT} (paid rooms ${PAID ? 'DEVNET ONLY' : 'locked'})`));
}

start().catch(e => {
  console.error('SOLSNAKE startup refused:', e.message);
  process.exitCode = 1;
});
