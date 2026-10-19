function mkRock(x, y, rich) {
  const r = rich ? rnd(34, 62) : rnd(20, 58), pts = [];
  for (let i = 0; i < 10; i++) pts.push(rnd(0.72, 1.08));
  return { x, y, ax: x, ay: y, r, hp: r * 2.2, ether: r * (rich ? 3.2 : 1), rich, rot: rnd(0, TAU), spin: rnd(-0.25, 0.25), vx: rnd(-8, 8), vy: rnd(-8, 8), pts, flash: 0 };
}
const ROCK_TETHER = 800;
function farSpot(min) {
  for (let k = 0; k < 40; k++) {
    const a = rnd(0, TAU), d = Math.sqrt(RND()) * (WORLD - 200), x = Math.cos(a) * d, y = Math.sin(a) * d;
    if (Math.hypot(x - P.x, y - P.y) > min) return [x, y];
  }
  return [WORLD * 0.6, 0];
}
function seeded(s) {
  return () => {
    s = s + 1831565813 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function seedWorld(seed) {
  S.seed = seed;
  RND = seeded(seed);
  try {
    growWorld();
  } finally {
    RND = Math.random;
  }
  ensureChunks(true);
  refreshNear();
}
function growWorld() {
  rocks = [];
  motes = [];
  bolts = [];
  rifts = [];
  bombs = [];
  floats = [];
  enemies = [];
  wrecks = [];
  zones = [];
  patrols = [];
  raidT = TUNE.raidEvery;
  raidWarn = 0;
  fields = [];
  hollows = [];
  chunks = /* @__PURE__ */ new Map();
  chunkC = null;
  seedRegions();
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * TAU + 0.4;
    rocks.push(mkRock(Math.cos(a) * rnd(300, 460), Math.sin(a) * rnd(300, 460), i % 2 === 0));
  }
  wrecks.push(Object.assign(mkWreck(-340, 230, false), { world: 1 }));
  const camps = [];
  for (let n = 0; n < 1500 && camps.length < TUNE.maxCamps; n++) {
    const p = spotIn("reach", 3e3);
    if (camps.every((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) > 6e3)) camps.push(p);
  }
  let bi = -1, bd = 1e18;
  {
    const rs = sites.filter((s) => s.k === "reach");
    for (let i = 0; i < camps.length; i++) for (const s of rs) {
      const d = Math.hypot(camps[i][0] - s.x, camps[i][1] - s.y);
      if (d < bd) {
        bd = d;
        bi = i;
      }
    }
  }
  for (let i = 0; i < camps.length; i++) {
    const z = bind(Object.assign(mkBlob(camps[i][0], camps[i][1], 1500), { t: 18, in: false, base: i === bi, baseLvl: 0 }), camps[i]);
    zones.push(z);
    buildFortress(z, i);
    for (let k = 0; k < 5; k++) {
      const q = rnd(0, TAU), r = rnd(150, 700), rk = bind(mkRock(z.x + Math.cos(q) * r, z.y + Math.sin(q) * r, true), camps[i]);
      rk.vx = rk.vy = 0;
      rocks.push(rk);
    }
    for (let k = 0; k < 2; k++) wrecks.push(Object.assign(bind(mkWreck(z.x + rnd(-450, 450), z.y + rnd(-450, 450), true), camps[i]), { world: 1 }));
  }
  buildPatrols();
  seedCorruption();
  seedStations();
}
const CH = 2e4, HOME_CLEAR = 600;
let chunks = /* @__PURE__ */ new Map(), chunkC = null;
const CANDS = [["rock", 132], ["belt", 480], ["hrock", 12], ["hwreck", 8], ["wreck", 20], ["bwreck", 66], ["far", TUNE.edgeRare]];
function growChunk(cx, cy) {
  const key = cx + "," + cy, d = S.delta[key] || {}, gone = new Set(d.r || []), left = d.w || {}, x0 = cx * CH, y0 = cy * CH, t0 = performance.now();
  let id = 0, nr = 0, nw = 0;
  try {
    for (const [type, n] of CANDS) for (let q = 0; q < n; q++, id++) {
      RND = seeded(Math.imul(cx, 73856093) ^ Math.imul(cy, 19349663) ^ Math.imul(id + 1, 83492791) ^ S.seed | 0);
      const x = x0 + RND() * CH, y = y0 + RND() * CH, wreck = type === "wreck" || type === "hwreck" || type === "bwreck" || type === "far";
      const o_ = Math.hypot(x, y);
      if (type === "far") {
        if (o_ - WORLD < TUNE.edgeStrange) continue;
      } else if (o_ < (wreck ? HOME_CLEAR : HOME_CLEAR / 2) || o_ > WORLD - 200) continue;
      if (!wreck && gone.has(id)) continue;
      const r = regionAt(x, y), k = sites[r.i].k;
      let o;
      if (type === "rock") {
        if (k === "boneyard" && RND() < 0.7) continue;
        o = mkRock(x, y, RND() < 0.25);
      } else if (type === "belt") {
        if (k !== "belt") continue;
        o = mkRock(x, y, RND() < 0.2);
        o.si = r.i;
      } else if (type === "hrock") {
        if (k !== "hollows") continue;
        o = mkRock(x, y, true);
        o.vx = o.vy = 0;
        o.si = r.i;
      } else if (type === "hwreck") {
        if (k !== "hollows") continue;
        o = mkWreck(x, y, true);
        o.si = r.i;
      } else if (type === "wreck") o = mkWreck(x, y, false);
      else if (type === "far") {
        o = mkWreck(x, y, true);
        o.ether *= 2.5;
        o.max = o.ether;
        o.rare = 1;
      } else {
        if (k !== "boneyard") continue;
        o = mkWreck(x, y, true);
        o.si = r.i;
      }
      o.ck = key;
      o.id = id;
      if (wreck) {
        const l = left[id];
        if (l != null) {
          if (l <= 0) continue;
          o.ether = Math.min(o.max, l);
        }
        wrecks.push(o);
        nw++;
      } else {
        rocks.push(o);
        nr++;
      }
    }
  } finally {
    RND = Math.random;
  }
  for (let i = 0; i < sites.length; i++) {
    const s = sites[i];
    if (s.k === "hollows" && Math.floor(s.x / CH) === cx && Math.floor(s.y / CH) === cy) {
      const l = left[9e3 + i];
      if (l != null && l <= 0) continue;
      const w = heartWreck(i, key);
      if (w) {
        if (l != null) w.ether = Math.min(w.max, l);
        wrecks.push(w);
      }
    }
  }
  chunks.set(key, { cx, cy });
  if (LOG) {
    LOG.chunk.n++;
    LOG.chunk.ms += performance.now() - t0;
    LOG.chunk.max = Math.max(LOG.chunk.max, performance.now() - t0);
  }
}
function noteWrecks(key) {
  const d = S.delta[key] || (S.delta[key] = {});
  for (const w of wrecks) if (w.ck === key && w.ether < w.max - 0.5) (d.w || (d.w = {}))[w.id] = Math.round(w.ether);
  if (!d.r && !d.w) delete S.delta[key];
}
function noteAllWrecks() {
  for (const key of chunks.keys()) noteWrecks(key);
}
function dropChunk(key) {
  noteWrecks(key);
  rocks = rocks.filter((r) => r.ck !== key);
  wrecks = wrecks.filter((w) => w.ck !== key);
  chunks.delete(key);
}
function ensureChunks(all) {
  const cx = Math.floor(P.x / CH), cy = Math.floor(P.y / CH);
  if (!chunkC || Math.abs(P.x - (chunkC[0] + 0.5) * CH) > CH / 2 + 2e3 || Math.abs(P.y - (chunkC[1] + 0.5) * CH) > CH / 2 + 2e3) chunkC = [cx, cy];
  let grew = false;
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    const key = chunkC[0] + i + "," + (chunkC[1] + j);
    if (chunks.has(key)) continue;
    if (grew && !all) continue;
    growChunk(chunkC[0] + i, chunkC[1] + j);
    grew = true;
  }
  let dropped = false;
  for (const [key, c] of [...chunks]) if (Math.abs(c.cx - chunkC[0]) > 1 || Math.abs(c.cy - chunkC[1]) > 1) {
    dropChunk(key);
    dropped = true;
  }
  if (grew || dropped) refreshNear();
}
function resetChunks() {
  rocks = rocks.filter((r) => r.ck == null);
  wrecks = wrecks.filter((w) => w.ck == null);
  chunks = /* @__PURE__ */ new Map();
  chunkC = null;
  ensureChunks(true);
}
function removeRock(r) {
  if (r.ck != null) {
    const d = S.delta[r.ck] || (S.delta[r.ck] = {});
    (d.r || (d.r = [])).push(r.id);
  }
  let i = rocks.indexOf(r);
  if (i >= 0) rocks.splice(i, 1);
  i = nearRocks.indexOf(r);
  if (i >= 0) nearRocks.splice(i, 1);
}
const FOGC = 2e3, fogKey = (i, j) => (i + 160) * 512 + (j + 160);
function markFog() {
  const R = sightR(), ci = Math.floor(P.x / FOGC), cj = Math.floor(P.y / FOGC), n = Math.ceil(R / FOGC) + 1;
  for (let i = ci - n; i <= ci + n; i++) for (let j = cj - n; j <= cj + n; j++) {
    const dx = (i + 0.5) * FOGC - P.x, dy = (j + 0.5) * FOGC - P.y;
    if (dx * dx + dy * dy < (R + FOGC * 0.4) ** 2) S.fog.add(fogKey(i, j));
  }
  if (LOG) LOG.world.fogMax = Math.max(LOG.world.fogMax, S.fog.size);
}
const cHash2 = (x, y) => {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ h >>> 13, 1274126177);
  return ((h ^ h >>> 16) >>> 0) / 4294967295;
};
function cNoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), a = cHash2(xi, yi), b = cHash2(xi + 1, yi), c = cHash2(xi, yi + 1), d = cHash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x, y) => cNoise(x, y) * 0.55 + cNoise(x * 2.1, y * 2.1) * 0.3 + cNoise(x * 4.3, y * 4.3) * 0.15;
function cloudAt(x, y) {
  const sx = x / 9e3, sy = y / 9e3, wx = fbm(sx + 7.3, sy + 1.9) * 1.6, wy = fbm(sx - 3.1, sy + 5.2) * 1.6, n = fbm(sx + wx, sy + wy), d = clamp((n - 0.56) / 0.2, 0, 1);
  return d * d * (3 - 2 * d);
}
function corrDen(x, y) {
  let best = 0;
  if (typeof corrs === "undefined") return 0;
  for (const c of corrs) {
    const dx = x - c.x, dy = y - c.y, d = Math.hypot(dx, dy);
    if (d > c.R + 14e3) continue;
    if (!c.b) corrShape(c);
    const an = Math.atan2(dy, dx), R2 = blobR(c.b, an), dd = d - R2;
    const v = dd < 0 ? 0.45 + 0.55 * clamp(-dd / (R2 * 0.4), 0, 1) : 0.45 * Math.exp(-dd / 2600) + 0.14 * Math.exp(-dd / 9e3);
    if (v > best && !(v > 0.05 && corrFree(x, y))) best = v;
  }
  return best;
}
const sightR = () => 5e3 * (1 - 0.4 * (S.cloud || 0)) * (S.hd > TUNE.holCold ? 1 - 0.5 * (S.hd - TUNE.holCold) / (1 - TUNE.holCold) : 1);
const fogAlpha = (x, y) => fogged(x, y) ? (x - P.x) ** 2 + (y - P.y) ** 2 < (sightR() + 400) ** 2 ? 1 : 0.45 : 0;
const fogged = (x, y) => S.fog.has(fogKey(Math.floor(x / FOGC), Math.floor(y / FOGC)));
function fogSave() {
  const cols = /* @__PURE__ */ new Map();
  for (const k of S.fog) {
    const i = (k >> 9) - 160, j = (k & 511) - 160;
    let c = cols.get(i);
    if (!c) cols.set(i, c = []);
    c.push(j);
  }
  const out = [];
  for (const [i, js] of cols) {
    js.sort((a, b) => a - b);
    const row = [i];
    let s = js[0], l = 1;
    for (let n = 1; n < js.length; n++) {
      if (js[n] === s + l) l++;
      else {
        row.push(s, l);
        s = js[n];
        l = 1;
      }
    }
    row.push(s, l);
    out.push(row);
  }
  return out;
}
function fogLoad(a) {
  S.fog = /* @__PURE__ */ new Set();
  if (!Array.isArray(a)) return;
  for (const row of a) {
    if (!Array.isArray(row) || row.length < 3) continue;
    const i = row[0] | 0;
    for (let n = 1; n + 1 < row.length; n += 2) {
      const s = row[n] | 0, l = Math.min(row[n + 1] | 0, 600);
      for (let j = 0; j < l; j++) S.fog.add(fogKey(i, s + j));
    }
  }
}
function giveScrapText(v, why) {
  if (!(v > 0)) return;
  S.scrapAcc = (S.scrapAcc || 0) + v;
  S.scrapAccT = 0.6;
  S.scrapWhy = why || S.scrapWhy;
}
function dropMotes(x, y, n, v, kind, src) {
  if (kind === 1) {
    S.scrap += n * v;
    giveScrapText(n * v);
    burst(x, y, Math.min(8, n * 2), 90, 4, 0.4, 2.4);
    return;
  }
  for (let i = 0; i < n && motes.length < 700; i++) {
    const a = rnd(0, TAU), s = rnd(20, 150);
    motes.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, v, kind: kind || 0, src, life: rnd(30, 45) });
  }
}
function hitRock(r, dmg, x, y, friendly) {
  r.hp -= dmg;
  r.flash = 0.12;
  burst(x, y, 5, 140, 7, 0.5, 2.5);
  if (friendly && r.ether > 0 && Math.random() < dmg / 22) {
    const v = r.rich ? 4 : 2;
    r.ether -= v;
    dropMotes(x, y, 1, v, 0, "Rocks");
  }
  if (r.hp <= 0) {
    burst(r.x, r.y, 26 + r.r, 220, 7, 1.1, 3.4);
    burst(r.x, r.y, r.rich ? 50 : 14, 170, 0, 1, 2.6);
    if (friendly || r.rich) dropMotes(r.x, r.y, Math.max(0, Math.round(r.ether / (r.rich ? 4 : 2.5))), r.rich ? 4 : 2.5, 0, "Rocks");
    removeRock(r);
  }
}
function updRocks(dt) {
  const T2 = ROCK_TETHER * ROCK_TETHER;
  for (const r of rocks) {
    r.x += r.vx * dt;
    r.y += r.vy * dt;
    r.rot += r.spin * dt;
    r.flash -= dt;
    const ox = r.x - r.ax, oy = r.y - r.ay;
    if (ox * ox + oy * oy > T2) {
      if (ox * r.vx > 0) r.vx = -r.vx;
      if (oy * r.vy > 0) r.vy = -r.vy;
    }
  }
  for (let i = nearRocks.length - 1; i >= 0; i--) {
    const r = nearRocks[i], dx = P.x - r.x, dy = P.y - r.y, dd = Math.hypot(dx, dy), min = r.r * 0.9 + P.radius * 0.6;
    if (dd < min && dd > 0.01 && !P.form) {
      if ((S.ram || 0) >= 1 && !S.over) {
        ramRock(r);
        continue;
      }
      const nx = dx / dd, ny = dy / dd;
      P.x = r.x + nx * min;
      P.y = r.y + ny * min;
      const vn = P.vx * nx + P.vy * ny;
      if (vn < 0) {
        P.vx -= vn * nx * 1.15;
        P.vy -= vn * ny * 1.15;
      }
    }
    if (r.rich && dd < 900 && Math.random() < 0.07) {
      const a = rnd(0, TAU);
      spawn(r.x + Math.cos(a) * r.r * 0.8, r.y + Math.sin(a) * r.r * 0.8, Math.cos(a) * 30, Math.sin(a) * 30, rnd(0.6, 1.4), 2.2, 0);
    }
  }
}
function ramRock(r) {
  const sp = Math.hypot(P.vx, P.vy), cost = Math.min(TUNE.ramCap, r.r * TUNE.ramCost * TUNE.ramScale * (0.5 + sp / Math.max(1, P.vtop || sp)) * (1 + P.wt / TUNE.ramWt)), a = Math.min(S.shield, cost);
  S.shield -= a;
  if (a > 0) S.lastHit = S.t;
  const rem = Math.min(cost - a, TUNE.ramBlockCap);
  const nx = (r.x - P.x) / (Math.hypot(r.x - P.x, r.y - P.y) || 1), ny = (r.y - P.y) / (Math.hypot(r.x - P.x, r.y - P.y) || 1);
  if (rem > 0.5) hurt(P, P.x + nx * P.radius * 0.7, P.y + ny * P.radius * 0.7, rem, true, "ram");
  S.shake = Math.max(S.shake, 0.45);
  P.vx *= 0.93;
  P.vy *= 0.93;
  sfx("pop", r.x, r.y);
  S.rams = (S.rams | 0) + 1;
  if (LOG) {
    LOG.ram.n++;
    LOG.ram.shield += a;
    LOG.ram.blocks += Math.max(0, rem);
    logRock(r, sp, a, Math.max(0, rem));
  }
  hitRock(r, r.hp + 9, r.x, r.y, true);
}
function reach() {
  return reachOf(P.coll, P.radius);
}
function updMotes(dt) {
  const R = reach(), grab = P.radius * 0.55 + 12;
  let fly = 0;
  for (let i = motes.length - 1; i >= 0; i--) {
    const m = motes[i];
    m.life -= dt;
    let dx = P.x - m.x, dy = P.y - m.y, dd = Math.hypot(dx, dy), RR = R, gg = grab;
    if (m.home) {
      fly += m.v;
      const k = Math.min(1, dt * 7), sp = TUNE.moteSpeed;
      m.vx += (dx / Math.max(dd, 1) * sp - m.vx) * k;
      m.vy += (dy / Math.max(dd, 1) * sp - m.vy) * k;
      gg = Math.max(gg, sp * dt * 1.5);
    } else {
      for (const w of copies) {
        const ex = w.x - m.x, ey = w.y - m.y, ed = Math.hypot(ex, ey);
        if (ed < dd) {
          dx = ex;
          dy = ey;
          dd = ed;
          RR = reachOf(w.coll, w.radius);
          gg = w.radius * 0.55 + 12;
        }
      }
      if (dd < RR) {
        const k = (900 + 600 * (1 - dd / RR)) * dt / Math.max(dd, 1);
        m.vx += dx * k;
        m.vy += dy * k;
        m.vx *= 1 - 3 * dt;
        m.vy *= 1 - 3 * dt;
      } else {
        m.vx *= 1 - 1.5 * dt;
        m.vy *= 1 - 1.5 * dt;
      }
    }
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    if (dd < gg) {
      if (m.kind === 1) {
        sfx("scrap");
        S.scrap += m.v;
        burst(m.x, m.y, 6, 90, 4, 0.4, 2.4);
      } else {
        if (m.home) sfx("pour", void 0, void 0, S.fill);
        else sfx("pick");
        addEther(m.v, m.src || "Rocks");
        S.lastHarv = S.t;
        S.tPick = true;
        burst(m.x, m.y, 4, 80, 0, 0.35, 2.2);
      }
      m.life = 0;
    }
    if (m.life <= 0) {
      motes[i] = motes[motes.length - 1];
      motes.pop();
    }
  }
  S.inflight = fly;
}
function mkWreck(x, y, big) {
  const n = (big ? rnd(12, 18) : rnd(5, 10)) | 0, cells = [[0, 0]], D = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (cells.length < n) {
    const c = cells[RND() * cells.length | 0], d = D[RND() * 4 | 0], nx = c[0] + d[0], ny = c[1] + d[1];
    if (!cells.some((q) => q[0] === nx && q[1] === ny)) cells.push([nx, ny]);
  }
  const e = n * (big ? 24 : 12);
  return { x, y, a: rnd(0, TAU), spin: rnd(-0.1, 0.1), ether: e, max: e, big, r: Math.sqrt(n) * CELL, blocks: cellsToBlocks(cells) };
}
const spillKept = (raw) => raw / (1 + raw / TUNE.spillK);
function spill(x, y, lost) {
  let c = spills.find((q) => Math.hypot(q.x - x, q.y - y) < 300 && S.t - q.t0 < 1.5);
  if (!c) {
    c = { x, y, raw: 0, amt: 0, t0: S.t, tau: TUNE.spillTau };
    spills.push(c);
  }
  const add = spillKept(c.raw + lost) - spillKept(c.raw);
  c.raw += lost;
  c.amt += add;
  if (LOG) {
    LOG.spillRaw += lost;
    LOG.spillKept += add;
  }
  burst(x, y, 30, 200, 0, 1, 3);
  sfx("hiss", x, y);
}
function updSpills(dt, budget) {
  const R = reach() + TUNE.spillReach;
  let room = P.cap - S.ether;
  for (let i = spills.length - 1; i >= 0; i--) {
    const c = spills[i];
    if (S.frame % 30 === 0) {
      const b = biomeAt(c.x, c.y);
      c.tau = b === "hollows" ? TUNE.spillTau * 0.4 : TUNE.spillTau * clamp(0.6 + density(c.x, c.y), 0.4, 1.7);
    }
    c.amt *= Math.exp(-dt / c.tau);
    if (Math.hypot(P.x - c.x, P.y - c.y) < R && room > 0 && budget > 0) {
      const g = Math.min(c.amt, TUNE.spillRate * dt, room, budget);
      if (g > 0) {
        c.amt -= g;
        room -= g;
        budget -= g;
        addEther(g, "Spill won back");
        sfx("pour", void 0, void 0, S.fill);
        if (LOG) LOG.spillBack += g;
        for (let n = cnt(2); n > 0; n--) {
          const a = rnd(0, TAU), q = rnd(0, 40 + Math.sqrt(c.amt) * 3);
          spawn(c.x + Math.cos(a) * q, c.y + Math.sin(a) * q, (P.x - c.x) * 1.6, (P.y - c.y) * 1.6, 0.5, 2.4, 0);
        }
      }
    }
    for (let n = cnt(Math.min(3, c.amt / 40)); n > 0; n--) {
      const a = rnd(0, TAU), q = rnd(0, 40 + Math.sqrt(c.amt) * 3);
      spawn(c.x + Math.cos(a) * q, c.y + Math.sin(a) * q, rnd(-20, 20), rnd(-20, 20), rnd(0.8, 1.6), rnd(2, 3.2), Math.random() < 0.5 ? 0 : 6);
    }
    if (c.amt < 1) spills.splice(i, 1);
  }
  S.spilled = spills.reduce((a, c) => a + (Math.hypot(P.x - c.x, P.y - c.y) < 2500 ? c.amt : 0), 0);
  return budget;
}
function intake() {
  return (TUNE.intakeBase + TUNE.intakeMax * (1 - Math.exp(-P.coll / TUNE.intakeC))) * S.pw[3] * (S.mood === 2 ? TUNE.intakeRes : 1);
}
function trimWrecks() {
  const loose = wrecks.filter((w) => w.ck == null && !w.world);
  if (loose.length <= TUNE.looseWrecks) return;
  const far = loose.map((w) => [Math.hypot(w.x - P.x, w.y - P.y), w]).filter((q) => q[0] > 8e3).sort((a, b) => b[0] - a[0]).slice(0, loose.length - TUNE.looseWrecks);
  if (!far.length) return;
  const gone = new Set(far.map((q) => q[1]));
  wrecks = wrecks.filter((w) => !gone.has(w));
  if (LOG) LOG.world.trimmed = (LOG.world.trimmed | 0) + gone.size;
}
function updWrecks(dt) {
  if (S.frame % 300 === 0) trimWrecks();
  const R = reach(), near = [], gone = [], cap = intake() * (S.corr > 0 || pool() >= TUNE.lowPool * (P.cap + S.haloMax) ? 1 : TUNE.lowPoolK);
  let budget = updSpills(dt, cap * dt), room = P.cap - S.ether + S.haloMax - S.halo - S.inflight;
  for (const w of wrecks) {
    w.a += w.spin * dt;
    if (w.ether <= 0) continue;
    let dd = Math.hypot(P.x - w.x, P.y - w.y), lim = R + w.r;
    if (dd < 2600) {
      w.seen = 1;
      if (w.ck != null) S.marks[w.ck + ":" + w.id] = [Math.round(w.x), Math.round(w.y), w.big ? 1 : 0];
    }
    for (const q of copies) {
      const d2 = Math.hypot(q.x - w.x, q.y - w.y);
      if (d2 < dd) {
        dd = d2;
        lim = reachOf(q.coll, q.radius) + w.r;
      }
    }
    if (dd < lim) near.push([dd, w]);
  }
  near.sort((a, b) => a[0] - b[0]);
  if (near.length && S.started) echoWeld(dt);
  const chunk = clamp(cap / 12, 4, 12);
  for (const [, w] of near) {
    const take = Math.min(w.ether, budget, room);
    if (take <= 0) break;
    const fresh = S.t - (w.drawT || -9) > 0.6;
    w.ether -= take;
    budget -= take;
    room -= take;
    w.acc = (w.acc || 0) + take;
    w.drawT = S.t;
    S.lastHarv = S.t;
    S.drawT = S.t;
    S.drawK = Math.min(1, (S.drawK || 0) * 0.9 + 0.1 * Math.min(1, take / Math.max(1e-6, cap * dt)));
    if (fresh) sfx("harv", w.x, w.y, 1 - w.ether / w.max);
    while (w.acc >= chunk || w.ether <= 0.01 && w.acc > 0.01) {
      const v = Math.min(w.acc, chunk);
      w.acc -= v;
      const b = w.blocks[Math.random() * w.blocks.length | 0], [bx, by] = wpos(w, b), a = Math.atan2(P.y - by, P.x - bx) + rnd(-0.9, 0.9);
      if (motes.length < 900) motes.push({ x: bx, y: by, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, v, kind: 0, src: w.clean ? "Clean wreck" : "Wrecks", life: 40, home: 1 });
      else addEther(v, w.clean ? "Clean wreck" : "Wrecks");
      spawn(bx, by, rnd(-40, 40), rnd(-40, 40), 0.4, 2.4, Math.random() < 0.5 ? 0 : 1);
    }
    if (w.ether <= 0.01) {
      burst(w.x, w.y, 60, 180, 5, 1.4, 3.4);
      dropMotes(w.x, w.y, 3 + (w.blocks.length / 3 | 0), 1, 1);
      toast("Wreck drained. It left scrap.");
      if (w.rare) {
        earn("flotsam");
        if (LOG) LOG.edge.rare++;
      }
      gone.push(w);
    }
  }
  if (gone.length) {
    for (const w of gone) {
      if (w.ck != null) {
        const d = S.delta[w.ck] || (S.delta[w.ck] = {});
        (d.w || (d.w = {}))[w.id] = 0;
        delete S.marks[w.ck + ":" + w.id];
      }
      wrecks.splice(wrecks.indexOf(w), 1);
    }
  }
}
function updZones(dt) {
  zones.forEach((z, i) => {
    const d = Math.hypot(P.x - z.x, P.y - z.y), inside = inBlob(z, P.x, P.y);
    if (inside) z.in = true;
    else if (z.in && d > z.ext + 900) z.in = false;
    if (Math.abs(z.x - cam.x) < z.ext + 900 && Math.abs(z.y - cam.y) < z.ext + 700) for (let n = cnt(0.6); n > 0; n--) {
      const j = Math.random() * 72 | 0, a = z.pts[j], b = z.pts[(j + 1) % 72];
      spawn(a[0], a[1], (b[0] - a[0]) * 0.6, (b[1] - a[1]) * 0.6, rnd(1, 2.5), 2.4, 3);
    }
  });
}
