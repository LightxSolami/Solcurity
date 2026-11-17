// Authoritative game simulation. The server decides everything; clients only send aim + boost.
export const R = 1700, DT = 1 / 30, MAX = 5;
const rad = s => 7 + Math.min(s.len, 320) * .028, rnd = Math.random;
export class Match {
  constructor(players, onEnd) {
    this.food = []; this.over = false; this.onEnd = onEnd; this.tickN = 0;
    this.S = players.map((p, i) => this.mk(p, i));
    for (let i = 0; i < 340; i++) this.sf();
  }
  mk(p, i) {
    const a = i / MAX * 6.283, d = R * .55, x = Math.cos(a) * d, y = Math.sin(a) * d, h = a + Math.PI;
    const s = { id: i, p, bot: !!p.bot, n: p.name, x, y, a: h, ta: h, len: 14, segs: [], alive: true, k: 0, boost: false, fd: 0, t: 0, b: false, place: 0 };
    for (let j = 0; j < 14; j++) s.segs.push({ x: x - Math.cos(h) * j * 9, y: y - Math.sin(h) * j * 9 });
    return s;
  }
  sf() { const a = rnd() * 6.283, d = Math.sqrt(rnd()) * (R - 50); this.food.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, v: 1 + rnd() * .8, c: rnd() * 5 | 0 }); }
  danger(s, px, py) {
    if (Math.hypot(px, py) > R - 45) return true;
    for (const o of this.S) if (o.alive && o !== s) for (let j = 0; j < o.segs.length; j += 2) { const q = o.segs[j]; if ((q.x - px) ** 2 + (q.y - py) ** 2 < (rad(o) + 18) ** 2) return true; }
    return false;
  }
  ai(s, dt) {
    s.t -= dt; if (s.t > 0) return; s.t = .14 + rnd() * .1;
    const L = 70 + rad(s) * 2, a = s.a; let best = null, bd = 440 * 440;
    for (const f of this.food) { const d = (f.x - s.x) ** 2 + (f.y - s.y) ** 2; if (d < bd) { bd = d; best = f; } }
    const ok = !this.danger(s, s.x + Math.cos(a) * L, s.y + Math.sin(a) * L);
    if (!ok) {
      const l = !this.danger(s, s.x + Math.cos(a - .7) * L, s.y + Math.sin(a - .7) * L), r = !this.danger(s, s.x + Math.cos(a + .7) * L, s.y + Math.sin(a + .7) * L);
      s.ta = l && (!r || rnd() < .5) ? a - .9 : r ? a + .9 : a + 2;
    } else if (best) s.ta = Math.atan2(best.y - s.y, best.x - s.x); else s.ta += rnd() - .5;
    s.boost = ok && s.len > 35 && rnd() < .07;
  }
  upd(s, dt) {
    if (s.bot) this.ai(s, dt);
    const tr = 3.8 / (1 + s.len / 200); let d = s.ta - s.a; d = Math.atan2(Math.sin(d), Math.cos(d));
    s.a += Math.max(-tr * dt, Math.min(tr * dt, d));
    const b = s.boost && s.len > 12, sp = b ? 330 : 175; s.b = b;
    if (b) { s.len -= dt * 7; s.fd += dt; if (s.fd > .2) { s.fd = 0; const t = s.segs[s.segs.length - 1]; this.food.push({ x: t.x, y: t.y, v: 1, c: s.id }); } }
    s.x += Math.cos(s.a) * sp * dt; s.y += Math.sin(s.a) * sp * dt;
    const g = s.segs; g[0].x = s.x; g[0].y = s.y; const n = Math.floor(s.len);
    while (g.length < n) g.push({ ...g[g.length - 1] }); while (g.length > n && g.length > 3) g.pop();
    for (let i = 1; i < g.length; i++) { const p = g[i - 1], q = g[i], dx = q.x - p.x, dy = q.y - p.y, l = Math.hypot(dx, dy) || 1; if (l > 9) { q.x = p.x + dx / l * 9; q.y = p.y + dy / l * 9; } }
    const r = rad(s);
    for (let i = this.food.length - 1; i >= 0; i--) {
      const f = this.food[i], dx = f.x - s.x, dy = f.y - s.y, dd = dx * dx + dy * dy, m = r + 38;
      if (dd < m * m) { f.x -= dx * Math.min(1, dt * 7); f.y -= dy * Math.min(1, dt * 7); if (dd < (r + 7) ** 2) { s.len += f.v * .55; this.food[i] = this.food[this.food.length - 1]; this.food.pop(); } }
    }
  }
  kill(s, o) {
    if (!s.alive) return; s.alive = false; if (o) o.k++;
    s.place = this.S.filter(q => q.alive).length + 1;
    for (let i = 0; i < s.segs.length; i += 2) this.food.push({ x: s.segs[i].x + (rnd() - .5) * 14, y: s.segs[i].y + (rnd() - .5) * 14, v: 2.4, c: i % 5 });
    if (this.S.filter(q => q.alive).length <= 1) { const w = this.S.find(q => q.alive); if (w) w.place = 1; this.over = true; }
  }
  tick() {
    if (this.over) return; this.tickN++;
    for (const s of this.S) { if (!s.alive) continue; if (s.p.gone) { this.kill(s, null); continue; } this.upd(s, DT); }
    for (const s of this.S) {
      if (!s.alive) continue; const r = rad(s);
      if (Math.hypot(s.x, s.y) > R - r) { this.kill(s, null); continue; }
      for (const o of this.S) {
        if (o === s || !o.alive) continue; const m = rad(o) + r * .6; let hit = false;
        for (const q of o.segs) { const dx = q.x - s.x, dy = q.y - s.y; if (dx * dx + dy * dy < m * m) { hit = true; break; } }
        if (hit) { this.kill(s, o); break; }
      }
    }
    while (this.food.length < 340) this.sf();
    if (!this.S.some(s => s.alive && !s.bot)) this.over = true;
    if (this.over) this.onEnd(this);
  }
  snapFor(me) {
    const rd = Math.round;
    return JSON.stringify({ t: 's', me: me.id, sn: this.S.map(q => ({ i: q.id, nm: q.n, a: rd(q.a * 100) / 100, l: rd(q.len), k: q.k, pl: q.place, b: q.b ? 1 : 0, al: q.alive ? 1 : 0, g: q.alive ? q.segs.flatMap(g => [rd(g.x), rd(g.y)]) : [] })),
      f: this.food.filter(f => (f.x - me.x) ** 2 + (f.y - me.y) ** 2 < 1000 ** 2).map(f => [rd(f.x), rd(f.y), f.c, rd(f.v * 10) / 10]) });
  }
}
