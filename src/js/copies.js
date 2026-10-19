const COPYN = [0, 0, 5, 10, 20, 35, 55, 80];
const COPYKIT = [
  null,
  null,
  { eng: 1, coll: 1, emit: 1, tank: 1 },
  { eng: 2, coll: 1, emit: 2, tank: 1, sgen: 1, hull: 2 },
  { eng: 3, coll: 2, emit: 4, miss: 2, tank: 2, sgen: 2, hull: 3, gyro: 1 },
  { eng: 5, coll: 3, emit: 6, miss: 4, mini: 2, tank: 3, sgen: 3, hull: 7, gyro: 1 },
  { eng: 7, coll: 4, emit: 8, miss: 6, mini: 4, tank: 4, sgen: 5, hull: 14, gyro: 2 },
  { eng: 10, coll: 6, emit: 12, miss: 8, mini: 6, tank: 6, sgen: 7, hull: 21, gyro: 3 }
];
const copyAllowed = () => Math.min(TUNE.copyMax, 1 + P.blocks.filter((b) => b.t === "score" && !b.ghost).length);
const copyMk = (t) => {
  let m = 1;
  for (const b of P.blocks) if (b.t === t && !b.ghost) m = Math.max(m, b.mk | 0 || 1);
  return m;
};
function copyCost(tier) {
  let sc = BT.score.cost;
  for (const t in COPYKIT[tier]) sc += BT[t].cost * COPYKIT[tier][t] * (1 + 0.5 * (copyMk(t) - 1));
  return { scrap: Math.round(sc * TUNE.copyScrapK), lock: Math.round(sc * TUNE.copyLockK) };
}
function copyStats(c) {
  c.emit = c.blocks.filter((b) => b.t === "emit");
  c.minis = c.blocks.filter((b) => b.t === "mini" || b.t === "hmini");
  c.racks = c.blocks.filter((b) => b.t === "miss");
  c.coll = 0;
  for (const b of c.blocks) c.coll += b.t === "coll" ? 1 : b.t === "hcoll" ? 0.25 : 0;
  let r = 0;
  for (const b of c.blocks) r = Math.max(r, Math.hypot(b.x, b.y));
  c.radius = (r + 0.9) * CELL;
  c.cell = cellMap(c.blocks);
  c.pipes = pipesOf(c.blocks);
  c.eng = c.blocks.filter((b) => b.t === "eng").length;
}
function copyBlocks(tier) {
  const kit = COPYKIT[tier], n = COPYN[tier], cells = [], seq = [];
  for (let x = -6; x <= 6; x++) for (let y = -6; y <= 6; y++) if (x || y) cells.push([x, y, x * x * 0.7 + y * y * 1.3]);
  cells.sort((p, q) => p[2] - q[2]);
  const pick = cells.slice(0, n - 1).sort((p, q) => p[0] - q[0] || Math.abs(p[1]) - Math.abs(q[1]) || p[1] - q[1]);
  for (const t of ["eng", "gyro", "hull", "sgen", "tank", "coll", "miss", "mini", "emit"]) for (let i = 0; i < (kit[t] || 0); i++) seq.push(t);
  const make = (x, y, t) => {
    const b = mk(x, y, t, 0);
    b.mk = copyMk(t);
    b.hp = maxHp(b);
    return b;
  };
  return [make(0, 0, "score"), ...pick.map((q, i) => make(q[0], q[1], seq[i]))];
}
function copyMake(tier, x, y, a, cost, hpFrac) {
  const c = { copy: 1, id: ++copyId, tier, x, y, a, vx: P.vx, vy: P.vy, av: 0, awake: true, blocks: copyBlocks(tier), scrap: cost.scrap, lock: cost.lock, cd: 0, mcd: 0, rcd: 0, hitT: -9, born: S.t, hk: PK("hp") || 1 };
  copyStats(c);
  c.hpMax = c.blocks.reduce((s, b) => s + maxHp(b), 0);
  if (hpFrac < 1) for (const b of c.blocks) b.hp = Math.max(1, maxHp(b) * hpFrac);
  c.shMax = c.blocks.reduce((s, b) => s + (b.t === "sgen" ? TUNE.sgenVal * 1.15 * (b.mk | 0 || 1) : 0), 0);
  c.shield = c.shMax;
  return c;
}
const copyHp = (c) => clamp(c.blocks.reduce((s, b) => s + Math.max(0, b.hp), 0) / Math.max(1, c.hpMax), 0, 1);
function copySlot(c) {
  const i = Math.max(0, copies.indexOf(c)), off = [Math.PI / 2, -Math.PI / 2, Math.PI][i % 3], d = P.radius + c.radius + TUNE.copyOut;
  return [P.x + Math.cos(P.a + off) * d, P.y + Math.sin(P.a + off) * d];
}
function beginCopy() {
  if (S.cb || !S.started || S.over || build) return;
  if (P.form) {
    toast("Re-form the hull first");
    return;
  }
  if (S.rb) {
    toast("Not while rebuilding");
    return;
  }
  if (S.hull < 2) {
    toast("The " + HULLS.names[Math.max(0, S.hull)] + " is too small to make copies. A Frigate can.");
    return;
  }
  const lim = copyAllowed();
  if (copies.length >= lim) {
    toast(lim >= TUNE.copyMax ? TUNE.copyMax + " copies at once. Z recalls one." : lim + (lim > 1 ? " copies" : " copy") + " at once, one for each core block. A Section core adds a core.", 3e3);
    return;
  }
  const cost = copyCost(S.hull);
  if (S.scrap < cost.scrap) {
    toast("A copy costs " + cost.scrap + " scrap and " + cost.lock + " ether. You have " + Math.floor(S.scrap) + " scrap.", 3e3);
    return;
  }
  if (S.ether < cost.lock) {
    toast("A copy costs " + cost.scrap + " scrap and " + cost.lock + " ether. The tanks hold " + Math.floor(S.ether) + ".", 3e3);
    return;
  }
  S.cb = { t: 0, dur: TUNE.copyBuild, tier: S.hull, cost };
  rebuildHum(S.cb.dur);
  if (LOG) ev("copy", "building a tier " + S.hull + " copy: " + cost.scrap + " scrap, " + cost.lock + " ether");
}
function cancelCopy(msg) {
  if (!S.cb) return;
  S.cb = null;
  stopHum();
  if (msg) toast(msg, 1400);
}
function finishCopy() {
  const b = S.cb, cost = b.cost;
  S.cb = null;
  stopHum();
  if (S.scrap < cost.scrap || S.ether < cost.lock || copies.length >= copyAllowed()) {
    toast("The copy could not be paid for");
    return;
  }
  S.scrap -= cost.scrap;
  const e0 = S.ether;
  S.ether -= cost.lock;
  logEther("Copies", S.ether - e0, 0);
  S.lock = (S.lock || 0) + cost.lock;
  const [gx, gy] = [P.x + Math.cos(P.a + Math.PI / 2) * (P.radius + 60), P.y + Math.sin(P.a + Math.PI / 2) * (P.radius + 60)];
  const c = copyMake(b.tier, gx, gy, P.a, cost, 1);
  copies.push(c);
  recalc();
  ring(gx, gy, 40, 200, 0);
  ring(gx, gy, 24, 120, 2);
  sfx("plop");
  toast("A copy joins you. Z recalls the weakest.", 2400);
  if (LOG) {
    LOG.cp.made++;
    LOG.cp.scrap += cost.scrap;
    LOG.cp.lock += cost.lock;
    ev("copy", "a " + COPYN[b.tier] + "-block copy built");
  }
}
function recallCopy() {
  if (!copies.length) {
    toast("No copies to recall");
    return;
  }
  let c = copies[0];
  for (const q of copies) if (copyHp(q) < copyHp(c)) c = q;
  const hp = copyHp(c), sc = Math.round(c.scrap * TUNE.copyRefund * hp), et = c.lock * TUNE.copyRefund * hp;
  copies.splice(copies.indexOf(c), 1);
  S.lock = Math.max(0, (S.lock || 0) - c.lock);
  recalc();
  S.scrap += sc;
  addEther(et, "Copy recalled");
  ring(c.x, c.y, 50, 200, 1);
  sfx("snap");
  toast("Copy recalled: +" + sc + " scrap, +" + Math.round(et) + " ether", 2400);
  if (LOG) {
    LOG.cp.recalled++;
    LOG.cp.back += sc;
    LOG.cp.backE += Math.round(et);
    ev("copy", "recalled at " + Math.round(hp * 100) + "% health: " + sc + " scrap, " + Math.round(et) + " ether back");
  }
}
function killCopy(c, why) {
  const i = copies.indexOf(c);
  if (i < 0) return;
  copies.splice(i, 1);
  S.lock = Math.max(0, (S.lock || 0) - c.lock);
  recalc();
  burst(c.x, c.y, 70, 260, 5, 0.9, 3.4);
  burst(c.x, c.y, 40, 180, 2, 0.6, 2.8);
  ring(c.x, c.y, 50, 220, 0);
  sfx("lost");
  toast("A copy was lost. Its ether is unlocked, nothing comes back.", 2800);
  if (LOG) {
    LOG.cp.lost++;
    ev("copy", "lost (" + why + ")");
  }
}
function damageCopyBlock(c, b, x, y, dmg) {
  b.hp -= dmg;
  c.hitT = S.t;
  burst(x, y, 6, 150, 5, 0.4, 2.4);
  if (b.hp > 0) return;
  if (b.t === "score" || c.blocks.length <= 1) {
    killCopy(c, "its core broke");
    return;
  }
  c.blocks.splice(c.blocks.indexOf(b), 1);
  burst(x, y, 24, 200, 5, 0.7, 3);
  sfx("lost");
  copyStats(c);
}
function hurtCopy(c, x, y, dmg, force, src) {
  if (S.god) return true;
  const cs = Math.cos(-c.a), sn = Math.sin(-c.a), lx = (x - c.x) * cs - (y - c.y) * sn, ly = (x - c.x) * sn + (y - c.y) * cs;
  let b = c.cell.get(Math.round(lx / CELL) + "," + Math.round(ly / CELL));
  if (!b && force) {
    let bd = 1e9;
    for (const q of c.blocks) {
      const d = (q.x * CELL - lx) ** 2 + (q.y * CELL - ly) ** 2;
      if (d < bd) {
        bd = d;
        b = q;
      }
    }
  }
  if (!b) return false;
  if (c.shield > 0) {
    const a = Math.min(c.shield, dmg);
    c.shield -= a;
    dmg -= a;
    c.hitT = S.t;
    burst(x, y, 6, 160, 6, 0.3, 2.4);
    if (dmg <= 0.01) return true;
  }
  const dtp = DTYPE[src];
  if (dtp != null) dmg *= armMul(b.t, dtp);
  damageCopyBlock(c, b, x, y, dmg / c.hk);
  return true;
}
function bombCopies(bm) {
  for (const c of copies.slice()) for (const b of c.blocks.slice()) {
    const [wx, wy] = wpos(c, b);
    if ((wx - bm.x) ** 2 + (wy - bm.y) ** 2 < bm.r * bm.r) {
      if (c.shield > 0) {
        const a = Math.min(c.shield, bm.dmg);
        c.shield -= a;
        c.hitT = S.t;
        continue;
      }
      damageCopyBlock(c, b, wx, wy, bm.dmg * 0.5 / c.hk);
    }
  }
}
function updCopies(dt) {
  if (S.cb) {
    if (!keys.KeyX || P.form || S.paused) cancelCopy(keys.KeyX ? "" : "Copy cancelled");
    else {
      S.cb.t += dt;
      if (S.cb.t >= S.cb.dur) finishCopy();
    }
  }
  if (!copies.length) return;
  const wa = 0.45 * S.pw[2];
  for (const c of copies.slice()) {
    const [fx, fy] = copySlot(c);
    let gx = fx, gy = fy, tgt = null, bd = TUNE.copyRange * TUNE.copyRange;
    for (const e of enemies) {
      if (!e.awake) continue;
      const q = (e.x - c.x) ** 2 + (e.y - c.y) ** 2;
      if (q < bd) {
        bd = q;
        tgt = e;
      }
    }
    if (tgt) {
      gx += clamp((tgt.x - fx) * 0.35, -450, 450);
      gy += clamp((tgt.y - fy) * 0.35, -450, 450);
    }
    if (Math.hypot(gx - c.x, gy - c.y) > 14e3) {
      c.x = gx;
      c.y = gy;
      c.vx = P.vx;
      c.vy = P.vy;
    }
    c.vx += ((gx - c.x) * 9 - c.vx * 4.5) * dt;
    c.vy += ((gy - c.y) * 9 - c.vy * 4.5) * dt;
    const vmax = Math.max(900, Math.hypot(P.vx, P.vy) * 1.3), sp = Math.hypot(c.vx, c.vy);
    if (sp > vmax) {
      c.vx *= vmax / sp;
      c.vy *= vmax / sp;
    }
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    let da = (tgt ? Math.atan2(tgt.y - c.y, tgt.x - c.x) : P.a) - c.a;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    c.a += clamp(da, -6 * dt, 6 * dt);
    if (S.t - c.hitT > 3 && c.shield < c.shMax) c.shield = Math.min(c.shMax, c.shield + c.shMax * 0.12 * dt);
    c.cd -= dt;
    c.mcd -= dt;
    c.rcd -= dt;
    if (tgt && Math.abs(da) < 0.4 && !P.form) {
      if (c.cd <= 0 && c.emit.length) {
        c.cd = 0.34 / (0.5 + 1.5 * wa);
        fireFrom(c, c.emit, wa, 0);
      }
      if (c.mcd <= 0 && c.minis.length) {
        c.mcd = 0.085 / (0.5 + 1.5 * wa);
        fireFrom(c, c.minis, wa, 1);
      }
      if (c.rcd <= 0 && c.racks.length) {
        c.rcd = 1.8;
        fireFrom(c, c.racks, wa, 2);
      }
    }
  }
}
function copySave() {
  return copies.map((c) => ({ t: c.tier, s: c.scrap, l: c.lock, h: +copyHp(c).toFixed(2) }));
}
function copyLoad(a) {
  copies = [];
  S.lock = 0;
  if (!Array.isArray(a)) return;
  for (const q of a) {
    if (!q || !(q.t >= 2 && q.t <= 7) || copies.length >= TUNE.copyMax) continue;
    const c = copyMake(q.t | 0, P.x, P.y, P.a, { scrap: Math.max(0, q.s | 0), lock: Math.max(0, q.l | 0) }, clamp(+q.h || 1, 0.05, 1));
    copies.push(c);
    S.lock += c.lock;
  }
  for (const c of copies) {
    const [gx, gy] = copySlot(c);
    c.x = gx;
    c.y = gy;
  }
}
