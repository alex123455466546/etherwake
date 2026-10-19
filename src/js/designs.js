const EHP = { core: 70, hull: 40, hard: 56, blast: 52, mirror: 36, pd: 30, emit: 28, mini: 26, miss: 26, eng: 28, tank: 28, coll: 28, bay: 36, ram: 48, drain: 30, dish: 34, shell: 44, hangar: 36 };
const ASPECT = { jammer: 1, dart: 2.2, gun: 2, mini: 1.3, rocket: 1.1, bomber: 0.8, bulwark: 1, brute: 0.85, beacon: 1, leech: 1.8, warden: 1.2, station: 1, heart: 1, sniper: 2.8, carrier: 1, reflection: 1.2 };
const KIT = {
  jammer: { w: 0, sp: "dish", spN: 0.1 },
  dart: { w: 0.14, wt: "emit" },
  gun: { w: 0.16, wt: "emit" },
  mini: { w: 0.22, wt: "mini" },
  rocket: { w: 0.16, wt: "miss" },
  bomber: { w: 0, sp: "bay", spN: 0.08 },
  bulwark: { w: 0.1, wt: "emit" },
  brute: { w: 0, sp: "ram", spN: 0.1 },
  beacon: { w: 0, sp: "dish", spN: 0.12 },
  sniper: { w: 0.12, wt: "emit" },
  carrier: { w: 0, sp: "dish", spN: 0.1 },
  reflection: { w: 0.14, wt: "emit" },
  leech: { w: 0, sp: "drain", spN: 0.06 },
  warden: { w: 0.1, wt: "emit", shell: true },
  station: { w: 0.14, wt: "emit", noEng: true },
  heart: { w: 0.12, wt: "emit", noEng: true }
};
function designShip(type, n) {
  n = Math.max(4, n | 0);
  const k = KIT[type] || KIT.gun, A = ASPECT[type] || 1.3, R = Math.ceil(Math.sqrt(n) * A) + 2, cand = [];
  for (let x = -R; x <= R; x++) for (let y = -R; y <= R; y++) cand.push([x, y, x / A * (x / A) + y * y + Math.random() * 0.25]);
  cand.sort((a, b) => a[2] - b[2]);
  let cells = cand.slice(0, n).map((c) => ({ x: c[0], y: c[1], t: "hull" }));
  const core = cells[0];
  core.t = "core";
  const cx = core.x, cy = core.y;
  for (const c of cells) {
    c.x -= cx;
    c.y -= cy;
  }
  const rest = cells.filter((c) => c.t !== "core"), take = (list, cnt, t) => {
    let m = 0;
    for (const c of list) {
      if (m >= cnt) break;
      if (c.t === "hull") {
        c.t = t;
        m++;
      }
    }
  };
  const front = rest.slice().sort((a, b) => b.x * 3 - Math.abs(b.y) - (a.x * 3 - Math.abs(a.y))), back = rest.slice().sort((a, b) => a.x - b.x || Math.abs(a.y) - Math.abs(b.y)), near = rest.slice().sort((a, b) => a.x * a.x + a.y * a.y - (b.x * b.x + b.y * b.y)), outer = rest.slice().sort((a, b) => b.x * b.x + b.y * b.y - (a.x * a.x + a.y * a.y));
  if (k.sp === "ram") take(front, Math.max(1, Math.round(n * (k.spN || 0.08))), "ram");
  if (k.sp === "drain") take(front, Math.max(1, Math.round(n * (k.spN || 0.06))), "drain");
  if (k.sp === "bay") take(near.filter((c) => c.x <= 0), Math.max(1, Math.round(n * (k.spN || 0.08))), "bay");
  if (k.sp === "dish") take(near, Math.max(1, Math.round(n * (k.spN || 0.12))), "dish");
  if (k.shell) {
    take(outer, Math.min(10, Math.max(4, Math.round(n * 0.08))), "shell");
    take(near.filter((c) => Math.abs(c.y) > 1), Math.max(1, Math.round(n * 0.03)), "hangar");
  }
  if (k.w || k.wt) {
    const wn = Math.max(1, Math.round(n * k.w));
    if (type === "station" || type === "heart") {
      const ring = outer.slice(0, Math.max(8, wn * 3));
      for (let i = 0; i < wn && ring.length; i++) {
        const c = ring[Math.floor(i * ring.length / wn)];
        if (c.t === "hull") c.t = "emit";
      }
    } else take(front, wn, k.wt);
  }
  if (!k.noEng) take(back, Math.max(1, Math.round(n * 0.12)), "eng");
  take(near, Math.max(1, Math.round(n * 0.1)), "tank");
  return cells;
}
const bossHpScale = () => 1;
function designReflection() {
  const set = P.hullSet, K = (x, y) => x + "," + y, cells = /* @__PURE__ */ new Map(), SC = 1.5;
  for (let X = -30; X <= 30; X++) for (let Y = -30; Y <= 30; Y++) if (set.has(K(Math.round(X / SC), Math.round(Y / SC)))) cells.set(K(X, Y), { x: X, y: Y, t: "hull" });
  const list = [...cells.values()];
  if (!list.length) return designShip("gun", 120);
  list.sort((a, b) => a.x * a.x + a.y * a.y - (b.x * b.x + b.y * b.y));
  list[0].t = "core";
  const cx = list[0].x, cy = list[0].y;
  for (const c of list) {
    c.x -= cx;
    c.y -= cy;
  }
  const rest = list.filter((c) => c.t !== "core"), WT = { emit: "emit", mini: "mini", miss: "miss", rail: "emit", battery: "miss", art: "emit", hmini: "mini" };
  for (const b of P.blocks) {
    const t = WT[b.t];
    if (!t) continue;
    let best = null, bd = 1e9;
    for (const c of rest) {
      if (c.t !== "hull") continue;
      const d = (c.x + cx - b.x * SC) ** 2 + (c.y + cy - b.y * SC) ** 2;
      if (d < bd) {
        bd = d;
        best = c;
      }
    }
    if (best) best.t = t;
  }
  const back = rest.slice().sort((a, b) => a.x - b.x), near = rest.slice().sort((a, b) => a.x * a.x + a.y * a.y - (b.x * b.x + b.y * b.y));
  let m = 0;
  for (const c of back) {
    if (m >= Math.round(rest.length * 0.1)) break;
    if (c.t === "hull") {
      c.t = "eng";
      m++;
    }
  }
  m = 0;
  for (const c of near) {
    if (m >= Math.round(rest.length * 0.1)) break;
    if (c.t === "hull") {
      c.t = "tank";
      m++;
    }
  }
  if (!list.some((c) => c.t === "emit" || c.t === "mini" || c.t === "miss")) {
    for (const c of rest.slice().sort((a, b) => b.x - a.x).slice(0, 8)) if (c.t === "hull") c.t = "emit";
  }
  armourize(list, list.length);
  return list;
}
const carrierNear = (e) => {
  if (e.type === "carrier") return false;
  for (const c of enemies) if (c.type === "carrier" && c !== e && c.hp > 0) {
    const dx = c.x - e.x, dy = c.y - e.y;
    if (dx * dx + dy * dy < TUNE.carrierR * TUNE.carrierR) return true;
  }
  return false;
};
const blockHp = (t, capK, hpK) => (EHP[t] || 30) * (0.1 + TUNE.egSlope * Math.max(1, S.wave)) * SET.diff * (capK || 1) * (hpK || 1) * (typeof clock === "function" ? clock() : 1) * (typeof dirK === "function" ? 1 + (dirK() - 1) * 0.7 : 1);
function reindex(e) {
  e.cell = /* @__PURE__ */ new Map();
  let r = 0, pd = 0, eng = 0, tank = 0, bay = 0, ram = 0, dish = 0, drain = 0, shell = 0, hangar = 0, core = null;
  const wb = [];
  for (const b of e.blocks) {
    e.cell.set(b.x + "," + b.y, b);
    r = Math.max(r, Math.hypot(b.x, b.y));
    switch (b.t) {
      case "core":
        core = b;
        break;
      case "emit":
      case "mini":
      case "miss":
        wb.push(b);
        break;
      case "eng":
        eng++;
        break;
      case "tank":
        tank++;
        break;
      case "bay":
        bay++;
        break;
      case "ram":
        ram++;
        break;
      case "dish":
        dish++;
        break;
      case "drain":
        drain++;
        break;
      case "shell":
        shell++;
        break;
      case "hangar":
        hangar++;
        break;
      case "pd":
        pd++;
        break;
    }
  }
  e.pd = pd;
  e.core = core;
  e.wb = wb;
  e.eng = eng;
  e.tank = tank;
  e.bay = bay;
  e.ram = ram;
  e.dish = dish;
  e.drain = drain;
  e.shell = shell;
  e.hangar = hangar;
  e.r = (r + 0.9) * CELL * (e.rMul || 1);
  if (e.eng0 == null) {
    e.eng0 = eng;
    e.shell0 = shell;
    e.wb0 = Math.max(1, wb.length);
  }
}
function buildShip(e, n, echo) {
  if (e.type === "reflection") {
    echo = designReflection();
    e.noCoreKill = true;
    e.resistRail = true;
    e.adaptive = true;
  }
  const cells = echo || designShip(e.type, n);
  if (!echo) armourize(cells, cells.length);
  e.blocks = cells.map((c) => {
    const h = blockHp(c.t, e.capK, e.hpK);
    return { x: c.x, y: c.y, t: c.t, hp: h, mh: h, g: 0 };
  });
  e.max = e.blocks.reduce((s, b) => s + b.hp, 0);
  e.hp = e.max;
  e.n0 = e.blocks.length;
  e.eng0 = null;
  reindex(e);
  const T = ET[e.type], per = T.eth * Math.pow(e.n0 / Math.max(4, T.cells.length || 4), 0.9) * TUNE.killEth;
  e.eth = per;
  e.ethTank = e.tank ? per / e.tank : per;
}
function rescaleShip(e) {
  const f = e.hp / e.max;
  let m = 0;
  for (const b of e.blocks) {
    const full = blockHp(b.t, e.capK, e.hpK);
    b.mh = full;
    b.hp = full * f;
    m += full;
  }
  e.max = m;
  e.hp = m * f;
}
function blockHit(e, wx, wy) {
  const c = Math.cos(-e.a), s = Math.sin(-e.a), dx = wx - e.x, dy = wy - e.y, lx = (dx * c - dy * s) / CELL, ly = (dx * s + dy * c) / CELL, ix = Math.round(lx), iy = Math.round(ly);
  let best = null, bd = 1.35;
  for (let i = ix - 1; i <= ix + 1; i++) for (let j = iy - 1; j <= iy + 1; j++) {
    const b = e.cell.get(i + "," + j);
    if (b) {
      const d = Math.hypot(lx - b.x, ly - b.y);
      if (d < bd) {
        bd = d;
        best = b;
      }
    }
  }
  return best;
}
const blockWorld = (e, b) => {
  const c = Math.cos(e.a), s = Math.sin(e.a), lx = b.x * CELL, ly = b.y * CELL;
  return [e.x + lx * c - ly * s, e.y + lx * s + ly * c];
};
function hurtEnemy(e, b, dmg, dt, pierce) {
  if (!b || b.hp <= 0) return 0;
  if (dt != null) {
    let m = armMul(b.t, dt);
    if (pierce && b.t === "hard") m = 0.75;
    dmg *= m;
  }
  if (carrierNear(e)) dmg *= 0.5;
  if (e.adaptive && e.core && dt != null) {
    const A = e.adT = e.adT || [0, 0, 0], sum = A[0] + A[1] + A[2];
    dmg *= 1 - Math.min(0.55, 0.8 * (A[dt] / (sum + 1)) * Math.min(1, sum / 3e3));
    A[dt] += dmg;
  }
  if (dt != null && EKC["d" + dt]) dmg *= EKC["d" + dt];
  const d = Math.min(dmg, b.hp);
  b.hp -= d;
  e.hp -= d;
  if (d > 0) e.hitT = S.t;
  if (dt != null) {
    S.dealt[dt] += d;
    if (LOG) add(LOG.ddl, DTNAME[dt] + (ARM[b.t] ? " on " + BT[b.t].name : ""), d);
  }
  if (b.hp <= 1e-4) breakEnemyBlock(e, b);
  return d;
}
function breakEnemyBlock(e, b) {
  const i = e.blocks.indexOf(b);
  if (i < 0) return;
  e.blocks.splice(i, 1);
  const [wx, wy] = blockWorld(e, b);
  burst(wx, wy, 14, 170, 3, 0.5, 2.6);
  if (LOG) {
    add(LOG.eblk, BT[b.t] ? BT[b.t].name : b.t, 1);
    LOG.eblkN++;
  }
  if (b.t === "core" && !e.noCoreKill) {
    e.hp = 0;
    reindex(e);
    return;
  }
  if (b.t === "core" && e.noCoreKill) {
    e.crippled = true;
    toast("The core is gone. It is still alive: break every block.", 4500);
  }
  e.max -= b.mh || blockHp(b.t, e.capK, e.hpK);
  if (b.t === "tank" && e.ethTank > 0) {
    spill(wx, wy, e.ethTank);
    e.eth -= e.ethTank;
  }
  reindex(e);
  if (!e.blocks.length) e.hp = 0;
  if (!e.core) return;
  const seen = /* @__PURE__ */ new Set([e.core]), q = [e.core];
  for (let k = 0; k < q.length; k++) {
    const c = q[k];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = e.cell.get(c.x + dx + "," + (c.y + dy));
      if (n && !seen.has(n)) {
        seen.add(n);
        q.push(n);
      }
    }
  }
  if (seen.size < e.blocks.length) {
    const cut = e.blocks.filter((c) => !seen.has(c));
    e.blocks = e.blocks.filter((c) => seen.has(c));
    let lost = 0;
    for (const c of cut) {
      lost += c.hp;
      e.max -= c.mh || blockHp(c.t, e.capK, e.hpK);
    }
    e.hp -= lost;
    makeDebris(e, cut);
    if (LOG) LOG.eCut++;
    reindex(e);
  }
}
function makeDebris(e, cut) {
  if (!cut.length) return;
  let mx = 0, my = 0;
  for (const c of cut) {
    mx += c.x;
    my += c.y;
  }
  mx /= cut.length;
  my /= cut.length;
  const [wx, wy] = blockWorld(e, { x: mx, y: my }), eth = cut.length * 9 + cut.filter((c) => c.t === "tank").length * e.ethTank;
  wrecks.push({ x: wx, y: wy, a: e.a, spin: rnd(-0.6, 0.6), ether: eth, max: eth, big: cut.length > 8, r: Math.sqrt(cut.length) * CELL, blocks: cut.map((c) => ({ x: Math.round(c.x - mx), y: Math.round(c.y - my), t: "hull", hp: 60, g: 0 })) });
  burst(wx, wy, 18, 140, 2, 0.6, 2.6);
}
function healEnemy(e, amt) {
  if (amt <= 0 || e.hp >= e.max) return;
  let left = amt;
  for (const b of e.blocks) {
    const full = b.mh || blockHp(b.t, e.capK, e.hpK), room = full - b.hp;
    if (room <= 0) continue;
    const g = Math.min(room, left);
    b.hp += g;
    e.hp += g;
    left -= g;
    if (left <= 0) break;
  }
}
const ECHO_AS = { dtank: "tank", rtank: "tank", mirror: "hull", ehull: "hull", slab: "hull", score: "hull", hcoll: "coll", carray: "coll", aft: "eng", gyro: "eng", rail: "emit", battery: "miss", art: "emit", hmini: "mini", shcore: "hull" };
function echoCells(saved, limit) {
  let cells = saved.map((c) => ({ x: c.x, y: c.y, t: c.t }));
  while (cells.length > limit) {
    const farI = cells.reduce((bi, c, i, a) => c.t !== "core" && (bi < 0 || c.x * c.x + c.y * c.y > a[bi].x * a[bi].x + a[bi].y * a[bi].y) ? i : bi, -1);
    if (farI < 0) break;
    cells.splice(farI, 1);
  }
  return cells.map((c) => BT[c.t] && !EHP[c.t] ? { x: c.x, y: c.y, t: ECHO_AS[c.t] || c.t } : c);
}
