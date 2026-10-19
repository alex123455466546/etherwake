function hollowAt(x, y) {
  if (x * x + y * y > WORLD * WORLD) return null;
  const r = regionAt(x, y), s = sites[r.i];
  if (s.k !== "hollows") return null;
  return { d: clamp(1 - Math.hypot(x - s.x, y - s.y) / Math.max(1, s.rad), 0, 1) * clamp(r.e / TUNE.holFade, 0, 1), i: r.i };
}
const derelict = () => !!S.hol && (S.hd || 0) >= TUNE.derelictAt;
const hollowStage = (d) => d <= 0 ? -1 : d < TUNE.holRim ? 0 : d < TUNE.holCold ? 1 : d < TUNE.holHeart ? 2 : 3;
const hollowLeak = (d) => d <= 0 ? 0 : d < TUNE.holRim ? d / TUNE.holRim / (TUNE.holHaloS * 3) : d < TUNE.holCold ? 1 / TUNE.holHaloS : 0.25;
const hollowDrain = (d) => d < TUNE.holCold ? 0 : d < TUNE.holHeart ? TUNE.holDrain[0] + (d - TUNE.holCold) / (TUNE.holHeart - TUNE.holCold) * (TUNE.holDrain[1] - TUNE.holDrain[0]) : TUNE.holDrain[1] + (d - TUNE.holHeart) / (1 - TUNE.holHeart) * (TUNE.holDrain[2] - TUNE.holDrain[1]);
const hollowSpeed = (d) => d < TUNE.holCold ? 1 : 1 - (d - TUNE.holCold) / (1 - TUNE.holCold) * (1 - TUNE.holSpeed);
function stepHollow(dt) {
  const d = S.hd || 0;
  S.frosting = false;
  {
    const dn = !!S.hol && derelict();
    if (dn !== !!S.inBub) {
      S.inBub = dn;
      S.bubT = S.t;
    }
  }
  if (!S.hol || d <= 0 || S.over || P.form) {
    S.frostT = 0;
    return;
  }
  const L = LOG && LOG.hol;
  if (L) {
    L.deep = Math.max(L.deep, d);
    L.t[hollowStage(d)] += dt;
  }
  if (d >= TUNE.holHeart && S.ether < 1 && !derelict()) {
    S.frosting = true;
    S.frostT = (S.frostT || 0) + dt;
    if (S.frostT >= 1) {
      S.frostT = 0;
      const dead = [];
      let n = 0;
      for (const b of P.blocks) {
        if (b.t === "core" || b.ghost) continue;
        b.hp -= TUNE.holFrost;
        n++;
        if (b.hp <= 0) dead.push(b);
      }
      if (L) L.frost += n;
      sfx("hurt");
      for (const b of dead) {
        const [wx, wy] = wpos(P, b);
        damageBlock(P, b, wx, wy, 0);
      }
    }
  } else S.frostT = 0;
}
function heartWreck(i, key) {
  const s = sites[i];
  if (s.k !== "hollows" || s.rad * 2 < TUNE.holRichSize || hash2(i, 17, S.seed) >= 0.6) return null;
  const w = mkWreck(s.x, s.y, true);
  w.ether *= 3;
  w.max = w.ether;
  w.si = i;
  w.ck = key;
  w.id = 9e3 + i;
  w.heart = 1;
  return w;
}
let corrs = [];
const NEST = ["gun", "gun", "brute", "rocket", "dart", "mini", "gun", "brute"];
const CORR_IMMUNE = /* @__PURE__ */ new Set(["hollows", "reach"]);
const corrFree = (x, y) => sites.length > 0 && CORR_IMMUNE.has(kindAt(x, y));
function corrShape(c) {
  if (!c.b) {
    const r = srng(5e3 + c.si), h = [];
    for (let k = 2; k <= 6; k++) h.push([k, 0.025 + 0.04 * r(), r() * TAU]);
    c.b = { x: c.x, y: c.y, R: c.R, ext: c.R, h, pts: [] };
  }
  const b = c.b;
  b.x = c.x;
  b.y = c.y;
  b.R = c.R;
  let amp = 0;
  for (const q of b.h) amp += q[1];
  b.ext = c.R * (1 + amp);
  b.pts.length = 0;
  for (let i = 0; i < 96; i++) {
    const t = i / 96 * TAU, q = blobR(b, t);
    b.pts.push([b.x + Math.cos(t) * q, b.y + Math.sin(t) * q]);
  }
}
function corrAt(x, y) {
  for (const c of corrs) {
    if (!c.b) corrShape(c);
    if (inBlob(c.b, x, y) && !corrFree(x, y)) return c;
  }
  return null;
}
const biomeAt = (x, y) => corrAt(x, y) ? "corrupt" : kindAt(x, y);
function seedCorruption() {
  corrs = [];
  if (!sites.length) return;
  const cand = sites.map((s, i) => i).filter((i) => {
    const d = Math.hypot(sites[i].bx, sites[i].by);
    return d > 7e4 && d < 19e4;
  });
  shuffle(cand);
  for (const si of cand.filter((i) => !CORR_IMMUNE.has(sites[i].k) && !corrFree(sites[i].x, sites[i].y)).slice(0, 3)) {
    const s = sites[si], c = { si, x: s.x, y: s.y, R: TUNE.corrFull * TUNE.corrStart, hearts: [], n0: 4 + (RND() * 3 | 0), gT: TUNE.corrGrowT, budT: 0, seen: false, kills: 0, off: 0, broken: false, Rb: 0 };
    corrShape(c);
    corrs.push(c);
    addHeart(c, c.x, c.y, true);
    for (let k = 1; k < c.n0; k++) {
      let a = k / (c.n0 - 1) * TAU + rnd(-0.4, 0.4), r = rnd(0.15, 0.55) * c.R;
      for (let t = 0; t < 12 && corrFree(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r); t++) {
        a = rnd(0, TAU);
        r = rnd(0.15, 0.55) * c.R;
      }
      addHeart(c, c.x + Math.cos(a) * r, c.y + Math.sin(a) * r);
    }
  }
}
function addHeart(c, x, y, main) {
  const i = zones.length, z = bind(Object.assign(mkBlob(x, y, 1800), { t: 18, in: false, heart: 1, main: !!main, ci: corrs.indexOf(c), dead: false, fallen: -1e9, want: 0 }), [x, y, c.si]);
  zones.push(z);
  c.hearts.push(z);
  const h = mkEnemy("heart", x, y, i);
  if (main) {
    h.hpK = 2.5;
    rescaleShip(h);
    h.rMul = 1.35;
    h.r *= 1.35;
    h.main = true;
    h.name = "Main heart";
  }
  enemies.push(h);
  const n = (main ? 8 : 4) + (RND() * 4 | 0);
  for (let k = 0; k < n; k++) dockShip(z, i, NEST[k % NEST.length]);
  return z;
}
function budHeart(c, x, y) {
  if (x == null) {
    for (let n = 0; n < 40; n++) {
      const a = rnd(0, TAU), r = rnd(0.15, 0.6) * c.R, px = c.x + Math.cos(a) * r, py = c.y + Math.sin(a) * r;
      if (c.hearts.every((z2) => Math.hypot(z2.x - px, z2.y - py) > 4e3) && !corrFree(px, py)) {
        x = px;
        y = py;
        break;
      }
    }
  }
  if (x == null) return;
  const z = addHeart(c, x, y);
  ev("corruption", "a new heart budded in corruption " + corrs.indexOf(c));
  if (LOG) LOG.cor.buds++;
  if (Math.hypot(P.x - x, P.y - y) < 12e3) toast("A new heart has budded in the Corruption.", 3e3);
  return z;
}
function heartFell(e) {
  const z = zones[e.zone];
  if (!z) return;
  z.dead = true;
  const c = corrs[z.ci];
  if (c) {
    c.kills++;
    c.R = Math.max(TUNE.corrFull * TUNE.corrMin, c.R * (z.main ? 0.5 : 2 / 3));
    corrShape(c);
    if (LOG) LOG.cor.hearts++;
    if (z.main) {
      c.off = TUNE.corrOffT;
      c.Rb = Math.max(c.Rb || 0, c.R * 2);
      c.broken = true;
      toast("The main heart is destroyed. This part of the Corruption is out of action for a while.", 4200);
      ctEvent("mainheart", z.ci);
    }
  }
  S.scrap += 20 + Math.round(S.wave * 1.5);
  for (let k = 0; k < 2; k++) {
    const w = mkWreck(e.x + rnd(-200, 200), e.y + rnd(-200, 200), true);
    w.clean = 1;
    w.ether *= 2;
    w.max = w.ether;
    wrecks.push(w);
  }
  toast("A heart is destroyed. The Corruption shrinks.", 3600);
  sfx("clear");
  ev("corruption", "heart killed in " + z.ci + ", radius now " + Math.round(c ? c.R : 0));
}
const cpulses = [];
const corrK = () => (S.t < (S.corrPulse || 0) ? 0 : 1 - (S.corr || 0) * (1 - TUNE.corrRate)) * stormK();
function corrPulse(x, y, max, sp, small) {
  if (cpulses.length >= 5) cpulses.shift();
  cpulses.push({ x, y, r: 0, max: max || 8e3, sp: sp || 520, small: !!small });
}
function updCorr(dt) {
  for (const c of corrs) {
    if (c.off > 0) continue;
    c.pT = (c.pT == null ? rnd(TUNE.corrLocalT[0], TUNE.corrLocalT[1]) : c.pT) - dt;
    if (c.pT <= 0) {
      c.pT = rnd(TUNE.corrLocalT[0], TUNE.corrLocalT[1]);
      if (Math.hypot(P.x - c.x, P.y - c.y) < c.R + 16e3) corrPulse(c.x, c.y, c.R * 1.05);
    }
  }
  for (let i = cpulses.length - 1; i >= 0; i--) {
    const p = cpulses[i], d0 = Math.hypot(P.x - p.x, P.y - p.y);
    p.r += p.sp * dt;
    if (!p.small && Math.abs(d0 - p.r) < 260 && !P.form && S.t > (S.corrPulse || 0) && !corrFree(P.x, P.y)) {
      S.corrPulse = S.t + TUNE.corrPulseOff;
      if (LOG) LOG.cor.pulses = (LOG.cor.pulses | 0) + 1;
      ev("pulse", "washed over you, collectors offline " + TUNE.corrPulseOff + " s");
      toast("A Corruption pulse washes over you. Your collectors go offline for " + TUNE.corrPulseOff + " s.", 3200);
    }
    if (p.r > p.max) cpulses.splice(i, 1);
  }
  for (const c of corrs) {
    const alive = c.hearts.filter((z) => !z.dead).length;
    if (!c.seen && Math.hypot(P.x - c.x, P.y - c.y) < c.R + 5e3) c.seen = true;
    if (c.off > 0) {
      c.off -= dt;
      if (c.off <= 0) {
        c.off = 0;
        const z = addHeart(c, c.x, c.y, true);
        ev("corruption", "a new main heart formed in " + corrs.indexOf(c));
        if (Math.hypot(P.x - c.x, P.y - c.y) < c.R + 8e3) toast("A new main heart forms in the Corruption.", 3200);
      }
      continue;
    }
    if (alive < c.n0) {
      c.budT += dt;
      if (c.budT >= TUNE.corrBud) {
        c.budT = 0;
        budHeart(c);
      }
    } else c.budT = 0;
    if (!c.seen && Math.hypot(P.x - c.x, P.y - c.y) < c.R + 5e3) c.seen = true;
  }
  if (S.corr > 0.3 && pool() < TUNE.corrWarnAt && S.t > (S.corrWarnT || 0)) {
    S.corrWarnT = S.t + 90;
    toast("The Corruption is eating what you gather and your tanks are low. Get out of it.", 3600);
    ev("corruption", "low-tank warning at " + Math.round(pool()) + " ether");
  }
  const inn = S.biome === "corrupt" || S.pocketCorr;
  S.corr = clamp((S.corr || 0) + (inn ? 1 : -1) * dt / TUNE.corrFade, 0, 1);
  if (LOG && inn) LOG.cor.t += dt;
  stepPoison(dt);
}
const trails = [];
function trailAdd(e, dt) {
  e.trT = (e.trT || 0) - dt;
  if (e.trT > 0) return;
  e.trT = 0.3;
  if (trails.length >= 140) trails.shift();
  trails.push({ x: e.x, y: e.y, life: TUNE.trailLife, r: TUNE.trailR, src: e, v: Math.hypot(e.vx || 0, e.vy || 0) });
}
function stepPoison(dt) {
  for (let i = trails.length - 1; i >= 0; i--) {
    const q = trails[i];
    q.life -= dt;
    if (q.life <= 0) {
      trails.splice(i, 1);
      continue;
    }
    if (!S.over && !P.form && (P.x - q.x) ** 2 + (P.y - q.y) ** 2 < (q.r + P.radius) ** 2) {
      if (!(S.poison > 0)) ev("poison", "in a trail");
      S.poison = TUNE.poisonT;
    }
  }
  if (!(S.poison > 0)) return;
  S.poison -= dt;
  if (S.over || P.form) return;
  const dmg = TUNE.poisonDps * (1 + S.wave * 0.02) * dt, a = Math.min(S.shield, dmg);
  S.shield -= a;
  const rest = dmg - a;
  if (rest > 0) spend(rest, "Poison trail");
  S.lastHit = S.t;
  if (LOG) {
    LOG.cor.pz = (LOG.cor.pz || 0) + dmg;
    add(LOG.taken, "Poison trail", dmg);
    LOG.row.taken += dmg;
    if (rest > 0) add(LOG.hull, "Poison trail", rest);
  }
}
function corrWave() {
  for (const c of corrs) {
    if (c.off > 0 || !c.hearts.some((z) => !z.dead)) continue;
    const fast = S.wave >= 100 && !c.broken, cap = S.wave >= 100 ? TUNE.corrHuge : TUNE.corrFull;
    c.R = Math.min(cap, c.R + TUNE.corrWaveGrow * (fast ? TUNE.corrFast : 1));
    corrShape(c);
  }
}
function driftCorr() {
  for (const c of corrs) {
    const s = sites[c.si];
    c.x += s.dx;
    c.y += s.dy;
  }
}
function corrSave() {
  return corrs.map((c) => ({ off: Math.round(c.off || 0), broken: c.broken ? 1 : 0, Rb: Math.round(c.Rb || 0), R: Math.round(c.R), gT: Math.round(c.gT), budT: Math.round(c.budT), seen: c.seen ? 1 : 0, dead: c.hearts.map((z, i) => z.dead ? i : -1).filter((i) => i >= 0), buds: c.hearts.slice(c.n0).map((z) => [Math.round(z.x - c.x), Math.round(z.y - c.y)]) }));
}
function corrLoad(a) {
  if (!Array.isArray(a)) return;
  a.forEach((sv, n) => {
    const c = corrs[n];
    if (!c || !sv) return;
    c.R = clamp(+sv.R || c.R, TUNE.corrFull * TUNE.corrMin, TUNE.corrHuge);
    corrShape(c);
    c.off = Math.max(0, +sv.off || 0);
    c.broken = !!sv.broken;
    c.Rb = +sv.Rb || 0;
    c.gT = +sv.gT || c.gT;
    c.budT = +sv.budT || 0;
    c.seen = !!sv.seen;
    if (Array.isArray(sv.buds)) {
      for (const q of sv.buds) if (Array.isArray(q)) addHeart(c, c.x + (+q[0] || 0), c.y + (+q[1] || 0), !+q[0] && !+q[1]);
    }
    if (Array.isArray(sv.dead)) for (const i of sv.dead) {
      const z = c.hearts[i | 0];
      if (!z) continue;
      z.dead = true;
      const k = zones.indexOf(z);
      for (let j = enemies.length - 1; j >= 0; j--) if (enemies[j].zone === k) enemies.splice(j, 1);
    }
  });
}
const EDGE_WARN = ["The ether thins out here. Turn back.", "Hairline cracks run across the dark. Nothing is hurt yet.", "The ether here is wrong. Pockets of nothing drift past.", "The ship is coming apart. Turn back."];
function stepPockets(dt) {
  S.pockets = S.pockets || [];
  if ((S.pockT = (S.pockT || 0) - dt) <= 0 && S.pockets.length < 6) {
    S.pockT = rnd(4, 9);
    const a = rnd(0, TAU), d = rnd(1800, 4800), r = rnd(TUNE.edgePocket[0], TUNE.edgePocket[1]);
    S.pockets.push({ x: P.x + Math.cos(a) * d, y: P.y + Math.sin(a) * d, vx: rnd(-30, 30), vy: rnd(-30, 30), r, kind: Math.random() < 0.5 ? "neg" : "corr", life: rnd(50, 90) });
  }
  for (let i = S.pockets.length - 1; i >= 0; i--) {
    const q = S.pockets[i];
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    q.life -= dt;
    if (q.life <= 0 || Math.hypot(q.x - P.x, q.y - P.y) > 9e3) {
      S.pockets.splice(i, 1);
      continue;
    }
    if (Math.hypot(q.x - P.x, q.y - P.y) < q.r) {
      if (q.kind === "neg") S.pocketNeg = true;
      else S.pocketCorr = true;
    }
  }
}
function stepFray(dt) {
  const depth = Math.hypot(P.x, P.y) - WORLD;
  S.depth = Math.max(0, depth);
  S.pocketNeg = false;
  S.pocketCorr = false;
  if (depth <= 0) {
    if (S.trip) {
      if (S.trip.lost) earn("frayed");
      if (S.trip.far >= TUNE.edgeBreak) earn("fardark");
      S.trip = null;
    }
    S.frayStage = 0;
    S.frayT = 0;
    return;
  }
  if (!S.trip) S.trip = { far: 0, lost: 0 };
  S.trip.far = Math.max(S.trip.far, depth);
  S.st.edgeT += dt;
  if (depth > S.st.far) S.st.far = depth;
  earn("edge");
  const st = depth < TUNE.edgeCracks ? 0 : depth < TUNE.edgeStrange ? 1 : depth < TUNE.edgeBreak ? 2 : 3;
  S.stage = st;
  if (LOG) {
    const E = LOG.edge;
    E.stage = Math.max(E.stage || 0, st);
  }
  if (st >= 1) earn("thin");
  if (st >= 2) stepPockets(dt);
  if (st >= 3) {
    const k = clamp((depth - TUNE.edgeBreak) / (TUNE.edgeBreakFast - TUNE.edgeBreak), 0, 1), iv = TUNE.edgeBreakT[0] + (TUNE.edgeBreakT[1] - TUNE.edgeBreakT[0]) * k;
    S.frayT = (S.frayT || 0) + dt;
    if (S.frayT >= iv) {
      S.frayT = 0;
      crack();
    }
  } else S.frayT = 0;
  if (st !== S.frayStage || S.t - (S.frayWarn || -9) > 10) {
    S.frayStage = st;
    S.frayWarn = S.t;
    toast(EDGE_WARN[st], 2600);
  }
  for (let n = cnt(Math.min(4, depth / 800)); n > 0; n--) {
    const a = rnd(0, TAU), q = Math.max(W, H) / zoom * 0.55;
    spawn(cam.x + Math.cos(a) * q, cam.y + Math.sin(a) * q, -Math.cos(a) * rnd(40, 140), -Math.sin(a) * rnd(40, 140), rnd(0.3, 0.7), rnd(1.4, 2.4), Math.random() < 0.5 ? 5 : 7);
  }
}
