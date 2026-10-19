let LOG = null;
const add = (o, k, v) => {
  o[k] = (o[k] || 0) + v;
};
const EV = [], SNAP = [], SPIKE = [], FT = [], ERRS = /* @__PURE__ */ new Map(), ERRT = [];
let snapT = 0, saveT = 0, lastBio = "", autoFileT = -1e9, errHalt = false;
const lgT = (s) => Math.floor(s / 60) + "m " + String(Math.floor(s % 60)).padStart(2, "0") + "s";
function ev(k, x) {
  if (!LOG) return;
  EV.push({ t: S.t, w: S.wave, k, x: x || "" });
  if (EV.length > 300) EV.shift();
}
function shipSummary() {
  const m = {};
  for (const b of allBlocks()) if (!b.ghost) add(m, b.t, 1);
  return Object.keys(m).map((k) => k + " " + m[k]).join(", ");
}
function logSnap() {
  const co = P.blocks.find((b) => b.t === "core");
  SNAP.push({
    t: S.t,
    w: S.wave,
    pool: Math.round(pool()),
    halo: Math.round(S.halo),
    sh: Math.round(S.shield),
    hp: co ? Math.round(co.hp / BT.core.hp * 100) : 0,
    x: Math.round(P.x),
    y: Math.round(P.y),
    v: Math.round(Math.hypot(P.vx, P.vy)),
    n: allBlocks().filter((b) => !b.ghost).length,
    en: enemies.length,
    mood: S.mood,
    bio: S.biome,
    as: SET.assist == null ? "-" : SET.assist
  });
  if (SNAP.length > 60) SNAP.shift();
  logExplored();
}
function logSpike(ms) {
  let pa = 0;
  for (let i = 0; i < NP; i++) if (pl[i] > 0) pa++;
  SPIKE.push({ t: S.t, w: S.wave, ms: Math.round(ms), en: enemies.length, rk: nearRocks.length, bo: bolts.length, pa });
  if (SPIKE.length > 60) SPIKE.shift();
}
function persistLog() {
  try {
    if (LOG) storeJSON("ew_log", logText());
  } catch (_) {
  }
}
function autoFile(why) {
  const now = performance.now();
  if (!host || now - autoFileT < 2e4) return;
  autoFileT = now;
  try {
    ev("file", why);
    host.postMessage("save-log:" + logText());
  } catch (_) {
  }
}
function runName() {
  const d = LOG.date, p = (n) => String(n).padStart(2, "0");
  return "run-" + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "-" + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()) + ".txt";
}
function runFile(why) {
  if (!host || !LOG) return;
  try {
    ev("runlog", why);
    host.postMessage("run-log:" + runName() + "\n" + logText());
  } catch (_) {
  }
}
let expTot = null;
function expCount() {
  if (expTot && expTot.seed === S.seed) return expTot;
  const tot = { seed: S.seed, all: 0, kinds: {} }, st = 2, n = Math.ceil(WORLD / FOGC);
  for (let i = -n; i < n; i += st) for (let j = -n; j < n; j += st) {
    const x = (i + 0.5) * FOGC, y = (j + 0.5) * FOGC;
    if (Math.hypot(x, y) > WORLD) continue;
    const k = kindAt(x, y);
    tot.all += st * st;
    tot.kinds[k] = (tot.kinds[k] || 0) + st * st;
  }
  return expTot = tot;
}
let expCache = null;
function exploredNow() {
  if (expCache && S.t - expCache.t < 2 && S.t >= expCache.t && expCache.n === S.fog.size) return expCache;
  const T = expCount(), kinds = {};
  let n = 0;
  for (const key of S.fog) {
    const x = ((key >> 9) - 160 + 0.5) * FOGC, y = ((key & 511) - 160 + 0.5) * FOGC;
    if (Math.hypot(x, y) > WORLD) continue;
    n++;
    const k = kindAt(x, y);
    kinds[k] = (kinds[k] || 0) + 1;
  }
  return expCache = { all: n / Math.max(1, T.all), kinds: Object.keys(T.kinds).map((k) => [k, (kinds[k] || 0) / T.kinds[k]]), t: S.t, n: S.fog.size };
}
function logExplored() {
  if (!LOG) return;
  const e = exploredNow();
  LOG.expl = { all: e.all, kinds: e.kinds, t: S.t };
}
function logErr(src, e) {
  try {
    const msg = String(e && e.message || e), key = src + ": " + msg;
    let r = ERRS.get(key);
    if (!r) {
      r = { src, msg, stack: String(e && e.stack || "").split("\n").slice(0, 6).join("\n"), n: 0, t: S.t, w: S.wave, x: Math.round(P.x), y: Math.round(P.y), ship: "", ev: EV.slice(-50), ft: FT.slice() };
      try {
        r.ship = shipSummary();
      } catch (_) {
      }
      ERRS.set(key, r);
      if (ERRS.size > 40) ERRS.delete(ERRS.keys().next().value);
      if (window.console && console.error) console.error("Etherwake: " + key, e);
      ev("error", key);
    }
    r.n++;
    const now = performance.now();
    ERRT.push(now);
    while (ERRT.length && now - ERRT[0] > 5e3) ERRT.shift();
    if (ERRT.length >= 10 && !errHalt) crashCard(key);
    persistLog();
  } catch (_) {
  }
}
function safely(name, fn, a, b, c) {
  try {
    return fn(a, b, c);
  } catch (e) {
    logErr(name, e);
  }
}
function crashCard(key) {
  errHalt = true;
  S.paused = true;
  show("pause", false);
  $("crashMsg").textContent = key;
  show("crash", true);
  autoFile("crash");
}
function crashGo() {
  errHalt = false;
  ERRT.length = 0;
  show("crash", false);
  if (S.started && !S.over) S.paused = false;
}
addEventListener("error", (e) => logErr("window", e.error || e.message));
addEventListener("unhandledrejection", (e) => logErr("promise", e.reason));
function errText() {
  const a = [...ERRS.values()];
  if (!a.length) return ["ERRORS    none"];
  return [
    "ERRORS    " + a.length + (a.length === 1 ? " kind, " : " kinds, ") + a.reduce((s, r) => s + r.n, 0) + " in all",
    ...a.flatMap((r) => [
      "  x" + r.n + "  " + r.src + ": " + r.msg,
      "    first at " + lgT(r.t) + ", wave " + r.w + ", position " + r.x + "," + r.y + ", ship: " + r.ship,
      ...r.stack.split("\n").map((l) => "    " + l.trim()),
      "    frames before it (ms): " + r.ft.join(" "),
      "    events before it: " + (r.ev.slice(-12).map((q) => Math.round(q.t) + "s " + q.k + (q.x ? " " + q.x : "")).join(" | ") || "none")
    ])
  ];
}
function logStart(from) {
  try {
    const old = loadJSON("ew_log");
    if (old) {
      storeJSON("ew_log2", loadJSON("ew_log1"));
      storeJSON("ew_log1", old);
    }
  } catch (_) {
  }
  EV.length = SNAP.length = SPIKE.length = FT.length = WST.length = 0;
  snapT = saveT = 0;
  lastBio = "";
  LOG = {
    date: /* @__PURE__ */ new Date(),
    from,
    rows: [],
    row: null,
    inn: {},
    out: {},
    waste: 0,
    p: pool(),
    scrap: S.scrap,
    taken: {},
    hull: {},
    dealt: {},
    kills: {},
    ttk: {},
    lostT: {},
    blocked: 0,
    thr: 0,
    mood: [0, 0, 0, 0],
    bio: {},
    lastBy: "",
    end: "",
    fl: { t: 0, sp: 0, top: 0, boost: 0, brake: 0, tt: 0, turns: 0, slow: 0 },
    eblk: {},
    eblkN: 0,
    dtk: {},
    ddl: {},
    adapt: [],
    pd: { mine: 0, theirs: 0, bombs: 0, mis: 0 },
    upg: { n: 0, scrap: 0 },
    rail: { n: 0, spent: 0, dmg: 0, ships: 0 },
    darkT: 0,
    eCut: 0,
    acted: { n: 0, f: 0 },
    camp: {},
    field: { n: 0, sum: 0, thin: 0, drawn: 0 },
    chunk: { n: 0, ms: 0, max: 0 },
    hol: { deep: 0, t: [0, 0, 0, 0], lost: 0, frost: 0 },
    cor: { t: 0, lost: 0, hearts: 0, buds: 0 },
    edge: { stage: 0, rare: 0 },
    cur: { t: 0, free: 0 },
    ram: { n: 0, shield: 0, blocks: 0 },
    world: { fogMax: 0 },
    pat: { woke: 0 },
    raid: { n: 0, ships: 0, killed: 0 },
    aim: [{ s: 0, h: 0 }, { s: 0, h: 0 }, { s: 0, h: 0 }, { s: 0, h: 0 }],
    asleep: 0,
    volleys: 0,
    launched: 0,
    wasted: 0,
    rebuilds: 0,
    rbBlocks: 0,
    spillRaw: 0,
    spillKept: 0,
    spillBack: 0,
    bombsDrop: 0,
    bombsLand: 0,
    bombBlocks: 0,
    bombDmg: 0,
    bombSoak: 0,
    scrapped: 0,
    refund: 0,
    fr: { n: 0, ms: 0, h: new Array(101).fill(0), fn: 0, fms: 0, fh: new Array(101).fill(0) }
  };
  LOG.ct = { taken: 0, done: 0, failed: 0, paid: 0, fees: 0 };
  LOG.mn = { hired: 0, spent: 0, ether: 0, lost: 0 };
  LOG.st = { seen: 0, visits: 0, buys: 0, spent: 0, rep: 0, saved: 0, lost: 0, attacks: 0, ups: 0, coll: { sc: 0, et: 0 } };
  LOG.tr = { seen: 0, visits: 0, buys: 0, spent: 0 };
  LOG.evs = {};
  LOG.cp = { made: 0, recalled: 0, lost: 0, scrap: 0, lock: 0, back: 0, backE: 0 };
  LOG.stand = { formed: 0, fixed: 0 };
  LOG.eline = {};
  LOG.expl = { all: 0, kinds: {}, t: -1 };
  logRow();
}
function logFrame(ms) {
  const F = LOG.fr, b = Math.min(100, Math.round(ms));
  F.n++;
  F.ms += ms;
  F.h[b]++;
  if (waveLive > 0) {
    F.fn++;
    F.fms += ms;
    F.fh[b]++;
  }
  FT.push(Math.round(ms));
  if (FT.length > 20) FT.shift();
  if (ms > LOG.row.mx) LOG.row.mx = ms;
  if (ms > 50) logSpike(ms);
}
function slowest(h, n, share) {
  let k = 0;
  for (let b = 100; b >= 0; b--) {
    k += h[b];
    if (k >= n * share) return b;
  }
  return 0;
}
function logRow() {
  if (!LOG) return;
  if (LOG.row) {
    LOG.row.t1 = S.t;
    LOG.rows.push(LOG.row);
    if (LOG.row.pdb || LOG.row.pdm) ev("pd", "wave " + LOG.row.w + ": shot down " + LOG.row.pdb + " bombs and " + LOG.row.pdm + " missiles");
  }
  LOG.row = {
    w: S.wave,
    t0: S.t,
    t1: -1,
    clear: waveLive > 0 ? -1 : S.t,
    ship: allBlocks().filter((b) => !b.ghost).length,
    kills: 0,
    ttk: 0,
    taken: 0,
    dl: 0,
    dm: 0,
    hull: 0,
    lost: 0,
    inn: 0,
    out: 0,
    minE: 1,
    minCore: 1,
    scIn: 0,
    scOut: 0,
    fill: S.ether / Math.max(1, P.realCap),
    fast: 0,
    vol: 0,
    rk: 0,
    own: allRacks().length,
    bd: 0,
    bl: 0,
    call: -1,
    mx: 0,
    kd: curKind,
    pdb: 0,
    pdm: 0
  };
}
function logEther(src, d, want) {
  if (!LOG) return;
  LOG.p += d;
  if (want > 0 && want > d) LOG.waste += want - d;
  if (d > 0) {
    add(LOG.inn, src || "Other", d);
    LOG.row.inn += d;
  } else if (d < 0) {
    add(LOG.out, src || "Other", -d);
    LOG.row.out -= d;
  }
}
function logHit(src, d, hull) {
  if (!LOG || !(d > 0)) return;
  const n = ET[src] ? ET[src].name : "Other";
  add(LOG.taken, n, d);
  LOG.row.taken += d;
  if (hull > 0) {
    add(LOG.hull, n, hull);
    LOG.row.hull += hull;
    LOG.lastBy = n;
  }
}
function logFlight(dt, boost, da) {
  const F = LOG.fl, sp = Math.hypot(P.vx, P.vy), ad = Math.abs(da);
  F.t += dt;
  F.sp += sp * dt;
  if (sp > F.top) F.top = sp;
  if (boost) F.boost += dt;
  if (S.brake) F.brake += dt;
  const D = SET.flightModel === "new" ? (F.dr = F.dr || {})[SET.draft] = F.dr[SET.draft] || { t: 0, sp: 0, brake: 0, turns: 0, slow: 0, settle: 0 } : null;
  if (D) {
    D.t += dt;
    D.sp += sp * dt;
    if (S.brake) D.brake += dt;
    D.settle = SET.settle;
  }
  if (!F.tt) {
    if (ad > 1.5) {
      F.tt = dt;
      F.turns++;
      if (D) D.turns++;
    }
  } else if (ad < 0.25) {
    if (F.tt > 1) {
      F.slow++;
      if (D) D.slow++;
    }
    F.tt = 0;
  } else F.tt += dt;
}
const WST = [];
function logStatus(kind) {
  if (!LOG) return;
  const co = P.blocks.find((b) => b.t === "core"), bl = allBlocks().filter((b) => !b.ghost), w = {};
  for (const b of bl) {
    const T = BT[b.t];
    if (!T || !(b.t === "emit" || b.t === "mini" || b.t === "miss" || b.t === "battery" || b.t === "rail" || b.t === "art" || b.t === "hmini" || b.t === "pd")) continue;
    const m = b.mk || 1;
    w[T.name] = w[T.name] || [0, 0, 0];
    w[T.name][m - 1]++;
  }
  const wp = Object.keys(w).map((k) => k + " " + w[k].reduce((a, b) => a + b, 0) + (w[k][1] + w[k][2] ? " (Mk I " + w[k][0] + ", II " + w[k][1] + ", III " + w[k][2] + ")" : "")).join(", ");
  WST.push({
    t: S.t,
    w: S.wave,
    k: kind,
    h: "blocks " + bl.length + ", core " + (co ? Math.round(co.hp / BT.core.hp * 100) : 0) + "%, shield " + Math.round(S.shield) + "/" + Math.round(S.smax || 0) + ", halo " + Math.round(S.halo) + "/" + Math.round(S.haloMax || 0) + ", tanks " + Math.round(S.ether) + "/" + Math.round(P.realCap),
    e: "pool " + Math.round(pool()) + ", scrap " + Math.round(S.scrap),
    wp: (wp || "none") + "; rail guns " + P.rails.length + ", missile racks " + P.racks.length
  });
  if (WST.length > 240) WST.shift();
}
function logRock(r, sp, a, rem) {
  if (!LOG) return;
  (LOG.rocks = LOG.rocks || []).push({ t: S.t, w: S.wave, r: Math.round(r.r), sp: Math.round(sp), sh: Math.round(S.shield + a), a: Math.round(a), rem: Math.round(rem), hull: hullName(), wt: Math.round(P.wt) });
  if (LOG.rocks.length > 120) LOG.rocks.shift();
}
function logBomb() {
  if (LOG) {
    LOG.bombsDrop++;
    LOG.row.bd++;
  }
}
let flSig = "";
function logStep(dt) {
  {
    const sg = [SET.flightModel, SET.assist, SET.flight, SET.draft, SET.settle].join("/");
    if (sg !== flSig) {
      if (flSig) ev("flight", "model " + SET.flightModel + ", assist " + SET.assist + ", flight " + SET.flight + ", draft " + SET.draft + ", settle " + SET.settle);
      flSig = sg;
    }
  }
  if (!LOG) return;
  const r = LOG.row, co = P.blocks.find((b) => b.t === "core");
  const drift = pool() - LOG.p;
  if (Math.abs(drift) > 1e-6) logEther("Other (shipyard, lost tanks)", drift, 0);
  const sc = S.scrap - LOG.scrap;
  if (sc > 0) r.scIn += sc;
  else r.scOut -= sc;
  LOG.scrap = S.scrap;
  r.minE = Math.min(r.minE, S.ether / P.realCap);
  if (co) r.minCore = Math.min(r.minCore, co.hp / BT.core.hp);
  if (S.pw.some((p) => p < 0.99)) LOG.thr += dt;
  LOG.mood[S.mood] += dt;
  add(LOG.bio, S.biome, dt);
  if (P.blocks.some((b) => b.dark)) LOG.darkT += dt;
  if (S.biome !== lastBio) {
    if (lastBio) ev("zone", "entered " + (RT[S.biome] ? RT[S.biome].name : S.biome));
    lastBio = S.biome;
  }
  if (S.t >= snapT) {
    snapT = S.t + 30;
    logSnap();
  }
  if (S.t >= saveT) {
    saveT = S.t + 10;
    persistLog();
  }
}
function logText(short) {
  const full = !short, evs = evTrim();
  const L = LOG;
  if (!L) return (loadJSON("ew_log") || "No balance log yet. Play a run and open this again.") + (ERRS.size ? "\n\n" + errText().join("\n") : "");
  const T = Math.max(S.t, 1), R = (v, n) => String(v).padStart(n), F = (v, n) => String(v).padEnd(n), pc = (v) => Math.round(v * 100) + "%", pm = (v) => Math.round(v / T * 60), p1 = (v) => (v * 100).toFixed(1) + "%", tm = (s) => Math.floor(s / 60) + "m " + String(Math.floor(s % 60)).padStart(2, "0") + "s", sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  const table = (head, c2, c3, o, f3) => {
    const ks = Object.keys(o).filter((k) => o[k] >= 0.5).sort((a, b) => o[b] - o[a]);
    return [F(head, 30) + R(c2, 8) + R(c3, 12)].concat(ks.length ? ks.map((k) => "  " + F(k, 28) + R(Math.round(o[k]), 8) + R(f3(k), 12)) : ["  none"]).join("\n");
  };
  const cols = [
    ["wave", 4],
    ["ship", 5],
    ["fight", 6],
    ["gap", 5],
    ["kills", 6],
    ["ttk", 6],
    ["taken", 6],
    ["dealt", 6],
    ["guns", 6],
    ["miss", 6],
    ["hull", 5],
    ["lost", 5],
    ["in", 6],
    ["out", 6],
    ["low", 5],
    ["core", 5],
    ["scrap", 8],
    ["fill", 5],
    ["fast", 5],
    ["racks", 7],
    ["bombs", 6],
    ["call", 6],
    ["tier", 5],
    ["slow", 7],
    ["pd b/m", 8],
    ["kind", 10]
  ];
  const rowsA = L.rows.concat([Object.assign({}, L.row, { t1: S.t })]).map((r) => {
    const open = r.clear < 0, fight = (open ? r.t1 : r.clear) - r.t0, gap = open ? 0 : r.t1 - r.clear;
    return [
      r.w,
      r.ship,
      r.clear === r.t0 ? "-" : Math.round(fight) + "s" + (open ? "+" : ""),
      Math.round(gap) + "s",
      r.kills,
      r.kills ? (r.ttk / r.kills).toFixed(1) + "s" : "-",
      Math.round(r.taken),
      Math.round(r.dl || 0),
      Math.round((r.dl || 0) - (r.dm || 0)),
      Math.round(r.dm || 0),
      Math.round(r.hull),
      r.lost,
      Math.round(r.inn),
      Math.round(r.out),
      pc(r.minE),
      pc(r.minCore),
      "+" + r.scIn + "/-" + r.scOut,
      pc(r.fill),
      Math.round(r.fast) + "s",
      r.vol ? Math.round(r.rk / r.vol) + "/" + r.own : "-",
      r.bd ? r.bd + "/" + r.bl : "-",
      r.call < 0 ? "-" : "N" + Math.round(r.call),
      ROMAN[tierOf(r.w)] || "-",
      r.mx ? Math.round(r.mx) + "ms" : "-",
      r.pdb || r.pdm ? r.pdb + "/" + r.pdm : "-",
      r.kd || "-"
    ];
  });
  const CW = cols.map((c, i) => Math.max(c[1], c[0].length + 1, ...rowsA.map((r) => String(r[i]).length + 1))), rows = rowsA.map((r) => r.map((v, i) => R(v, CW[i])).join(""));
  const ship = {};
  for (const b of allBlocks()) add(ship, BT[b.t].name + (b.ghost ? " (stand-in)" : ""), 1);
  const shipList = Object.keys(ship).map((k) => k + " " + ship[k]), lost = Object.keys(L.lostT).map((k) => k + " " + L.lostT[k]), bio = Object.keys(L.bio).map((k) => (RT[k] ? RT[k].name : k) + " " + pc(L.bio[k] / T));
  const lines = (list, n) => {
    const out2 = [];
    for (let i = 0; i < list.length; i += n) out2.push("  " + list.slice(i, i + n).join(", "));
    return out2.length ? out2 : ["  none"];
  };
  const all = [
    "ETHERWAKE BALANCE LOG",
    "Version " + VERSION + " (" + verName(VERSION) + "); started " + L.date.toLocaleString() + " (" + L.from + ")",
    "Difficulty " + diffName() + ", ship line " + S.pick + ", world seed " + S.seed + ", every block unlocked: " + (SET.all ? "yes" : "no") + (S.dev ? ", DEV RUN" : ""),
    "HEAT      " + heatName() + (pactList().length ? ": " + pactList().join(", ") : " (no pacts)"),
    "Played " + tm(S.t) + ", wave " + S.wave + ", " + sum(L.kills) + (sum(L.kills) === 1 ? " ship" : " ships") + " broken",
    L.end || (S.started ? "Still flying" : "Saved and quit"),
    "",
    "== WAVES ==",
    "WAVES  (a row runs from that wave starting to the next one starting)",
    cols.map((c, i) => R(c[0], CW[i])).join(""),
    ...rows,
    "  ship   blocks when the wave began",
    "  fight  seconds to clear it (+ = still fighting); gap = quiet time after",
    "  ttk    average seconds to break a ship once you first hit it",
    "  taken  damage that reached you; hull = the part past the halo and shield",
    "  dealt  damage you did that wave; guns = lasers, miniguns, artillery and the rail gun; miss = missiles",
    "  in/out ether gained and spent; low = emptiest tanks; core = lowest core health",
    "  fill   tanks when the wave began; fast = seconds at the fast missile rate (tanks 90% or more)",
    "  racks  racks fired per volley / racks owned; bombs = dropped / landed on you; call = N and the ether paid back",
    "  tier   the enemies' parts that wave (I from wave 10, II from 25, III from 45)",
    "  slow   the slowest single frame that wave",
    "  pd b/m point defence: their bombs / their missiles shot down that wave",
    "",
    "== TOTALS ==",
    table("ETHER IN", "total", "per min", L.inn, (k) => pm(L.inn[k])),
    "  " + F("All sources", 28) + R(Math.round(sum(L.inn)), 8) + R(pm(sum(L.inn)), 12),
    "",
    table("ETHER OUT", "total", "per min", L.out, (k) => pm(L.out[k])),
    "  " + F("All uses", 28) + R(Math.round(sum(L.out)), 8) + R(pm(sum(L.out)), 12),
    "  " + F("Wasted, tanks and halo full", 28) + R(Math.round(L.waste), 8) + R(pm(L.waste), 12),
    "Systems throttled for " + tm(L.thr) + " (" + pc(L.thr / T) + " of the run)",
    "",
    table("DAMAGE TAKEN", "total", "past shield", L.taken, (k) => Math.round(L.hull[k] || 0)),
    "",
    table("DAMAGE DEALT", "total", "per min", L.dealt, (k) => pm(L.dealt[k])),
    "Shots blocked by Bulwark fronts and the Warden shell: " + L.blocked,
    "",
    "== SHIPS AND WEAPONS ==",
    "MISSILES  " + L.volleys + " volleys, " + L.launched + " missiles, " + L.wasted + " hit nothing (" + pc(L.wasted / Math.max(1, L.launched)) + ")",
    "BOMBS     " + L.bombsDrop + " dropped, " + L.bombsLand + " landed" + (L.bombsLand ? ", " + (L.bombBlocks / L.bombsLand).toFixed(1) + " blocks under each, halo and shield took " + pc(L.bombSoak / Math.max(1, L.bombDmg)) + " of the damage" : ""),
    "SCRAPPING " + L.scrapped + " blocks scrapped for " + L.refund + " scrap",
    "REBUILDS  " + L.rebuilds + " full rebuilds, " + L.rbBlocks + " blocks",
    "SPILLS    " + Math.round(L.spillRaw) + " ether spilled, " + Math.round(L.spillKept) + " kept in clouds, " + Math.round(L.spillBack) + " won back",
    "HULL      " + hullName() + ", " + P.hullSet.size + " cells",
    ...L.fr.n ? ["FRAMES    look " + (SET.look === "classic" ? "Classic" : "New") + ", " + W + "x" + H + " at " + DPR + "x; " + Math.round(1e3 * L.fr.n / L.fr.ms) + " fps on average" + (L.fr.fn ? ", " + Math.round(1e3 * L.fr.fn / L.fr.fms) + " in fights" : "") + "; " + pc(L.fr.h.slice(21).reduce((a, b) => a + b, 0) / L.fr.n) + " of frames under 50 fps, the slowest 1% took " + slowest(L.fr.h, L.fr.n, 0.01) + " ms" + (L.fr.fn ? " (" + slowest(L.fr.fh, L.fr.fn, 0.01) + " in fights)" : "")] : [],
    "== FLIGHT ==",
    ...L.fl.t > 0 ? ["FLIGHT    average speed " + Math.round(L.fl.sp / L.fl.t) + ", top " + Math.round(L.fl.top) + "; boosting " + tm(L.fl.boost) + ", assist braking " + tm(L.fl.brake) + "; " + L.fl.turns + " half turns, " + L.fl.slow + " took over a second; assist " + (SET.flight === 1 ? "Drift and brake" : SET.flightModel !== "new" ? "Classic, " + ["Full", "Light", "Off"][SET.assist | 0] : SET.assist === 2 ? "New, Off" : "New, On, draft " + SET.draft + ", settle " + SET.settle + " s")] : [],
    ...L.fl.dr ? Object.keys(L.fl.dr).map((k) => {
      const D = L.fl.dr[k];
      return "  draft " + k + ": " + tm(D.t) + " flown, average speed " + Math.round(D.sp / Math.max(0.01, D.t)) + ", assist braking " + pc(D.brake / Math.max(0.01, D.t)) + " of the time, " + D.turns + " half turns (" + D.slow + " over a second), settle time " + D.settle + " s";
    }) : [],
    ...Object.keys(L.camp).length ? ["CAMPS     " + Object.keys(L.camp).map((k) => {
      const c = L.camp[k];
      return "fortress " + k + ": " + c.n + " ships woke, all launched within " + c.launched.toFixed(1) + " s" + (c.cleared != null ? ", cleared in " + tm(c.cleared) + ", " + Math.round(c.dmg) + " damage taken" : ", not cleared");
    }).join("; ")] : [],
    ...L.hand && L.hand.length ? ["HANDICAP  h (your damage and shield, 1 = full) by wave: " + L.hand.filter((q, i) => i % 2 === 0 || i === L.hand.length - 1).map((q) => q[0] + " " + q[1].toFixed(2)).join(", ")] : [],
    "SHOTS/S   " + (S.t > 1 ? (L.aim.reduce((s, a) => s + a.s, 0) / S.t).toFixed(2) : "-") + " enemy gun shots a second over the run",
    "AIM       " + L.aim.map((a, i) => ["base", "I", "II", "III"][i] + " " + (a.s ? pc(a.h / a.s) + " of " + a.s : "-")).join(", ") + " of enemy gun shots hit you",
    ...L.chunk.n ? [
      "WORLD     " + L.chunk.n + " chunks grown (" + (L.chunk.ms / L.chunk.n).toFixed(1) + " ms each, slowest " + L.chunk.max.toFixed(1) + " ms); " + L.cur.t.toFixed(0) + " s in currents (" + L.cur.free.toFixed(0) + " s riding one free, let go of " + (L.cur.let | 0) + " times); " + L.world.fogMax + " fog cells charted, " + Object.keys(S.delta).length + " chunks changed" + (L.world.trimmed ? ", " + L.world.trimmed + " far loose wrecks cleared" : ""),
      "RAMS      " + L.ram.n + " rocks rammed; " + L.ram.shield.toFixed(0) + " shield and " + L.ram.blocks.toFixed(0) + " block damage paid"
    ] : [],
    ...L.expl.t >= 0 ? ["EXPLORED  " + p1(L.expl.all) + " of the world charted (" + L.expl.kinds.filter((q) => q[1] > 0).map((q) => (RT[q[0]] ? RT[q[0]].name : q[0]) + " " + p1(q[1])).join(", ") + "); at " + lgT(L.expl.t)] : [],
    ...S.ech && S.ech.length || L.ech && L.ech.offers.length ? ["ECHOES    " + (S.ech || []).length + " held: " + ((S.ech || []).map((h) => echoName(h) + (ECH_BY.get(h.id) && ECH_BY.get(h.id).cursed ? " (cursed)" : " (" + ECH_TIER[h.r | 0].n + ", wave " + h.w + ")")).join(", ") || "none") + "; offered " + (L.ech ? L.ech.offers.length : 0) + " times" + (S.rerolled ? ", rerolled once" : "")] : [],
    ...L.st.seen || L.st.visits ? ["STATION   " + L.st.seen + " found, " + L.st.visits + " visits, " + L.st.buys + " purchases for " + L.st.spent + " scrap, reputation +" + Math.round(L.st.rep) + ", " + L.st.saved + " saved from attack (" + L.st.attacks + " attacks), " + L.st.lost + " lost, " + L.st.ups + " upgrades; collected " + L.st.coll.sc + " scrap and " + L.st.coll.et + " ether; " + stations.filter((s) => !s.dead).length + " of " + stations.length + " stand"] : [],
    ...L.ct.taken ? ["CONTRACT  " + L.ct.taken + " taken, " + L.ct.done + " finished (paid " + L.ct.paid + " scrap), " + L.ct.failed + " failed (fees " + L.ct.fees + " scrap)"] : [],
    ...L.mn.hired || L.mn.lost ? ["MINER     " + L.mn.hired + " hired for " + L.mn.spent + " scrap, " + Math.round(L.mn.ether) + " ether drawn from the field, " + L.mn.lost + " lost"] : [],
    ...L.tr.seen ? ["TRADER    " + L.tr.seen + " came, " + L.tr.visits + " visits, " + L.tr.buys + " purchases for " + L.tr.spent + " scrap"] : [],
    ...Object.keys(L.evs).length ? ["EVENT     " + Object.keys(L.evs).map((k) => EVN[k] + " " + L.evs[k].done + " of " + L.evs[k].n + (L.evs[k].paid ? " (paid " + L.evs[k].paid + " scrap)" : "")).join(", ")] : [],
    ...L.cp.made || L.cp.lost ? ["COPIES    " + L.cp.made + " made (" + L.cp.scrap + " scrap, " + L.cp.lock + " ether), " + L.cp.recalled + " recalled (" + L.cp.back + " scrap, " + L.cp.backE + " ether back), " + L.cp.lost + " lost"] : [],
    ...L.stand.formed || L.stand.fixed ? ["STAND-INS " + L.stand.formed + " formed from ether for lost blocks, " + L.stand.fixed + " made solid for scrap"] : [],
    ...Object.keys(L.eline).length ? ["ENEMY RAILS  " + Object.keys(L.eline).map((k) => k + " " + L.eline[k].h + " of " + L.eline[k].n + " hit you").join(", ")] : [],
    ...L.runFile ? ["RUN LOG   " + L.runFile] : [],
    ...L.field.n ? ["FIELD     patch under you " + pc(L.field.sum / L.field.n) + " full on average; " + pc(L.field.thin / L.field.n) + " of the time on thin ground (under 25%); " + pm(L.field.drawn) + " ether a minute drawn from space"] : [],
    "ENEMY BLOCKS  " + L.eblkN + " shot off (" + Object.keys(L.eblk).sort((a, b) => L.eblk[b] - L.eblk[a]).slice(0, 6).map((k) => k + " " + L.eblk[k]).join(", ") + "), " + L.eCut + " cut-offs drifted away as wrecks; " + L.acted.f + " of " + L.acted.n + " ships fired before dying",
    "DAMAGE BY TYPE  taken: " + (Object.keys(L.dtk).map((k) => k + " " + Math.round(L.dtk[k])).join(", ") || "none") + "; dealt: " + (Object.keys(L.ddl).map((k) => k + " " + Math.round(L.ddl[k])).join(", ") || "none"),
    "ADAPT     " + (L.adapt.length ? L.adapt.slice(-6).map((a) => "wave " + a[0] + ": " + a[1] + " armour at " + a[2] + "% (your top type " + a[3] + "%)").join("; ") : "no counter-armour yet"),
    "POINT DEFENCE  " + L.pd.bombs + " bombs and " + L.pd.mis + " missiles shot down by you, " + L.pd.theirs + " of your missiles by them",
    "UPGRADES  " + L.upg.n + " blocks upgraded for " + L.upg.scrap + " scrap",
    "CORES     sections were dark for " + tm(L.darkT),
    ...L.rail.n ? ["RAIL GUN  " + L.rail.n + " shots, " + Math.round(L.rail.spent) + " ether spent, " + Math.round(L.rail.dmg) + " damage across " + L.rail.ships + " ships passed"] : [],
    "ASLEEP    " + L.asleep + " pirate ships killed without ever waking",
    "RAIDS     " + L.raid.n + " raids (" + L.raid.ships + " ships, " + L.raid.killed + " killed), " + L.pat.woke + " patrols woke",
    ...S.st.far > 0 ? ["EDGE      " + tm(S.st.edgeT) + " past the ring, deepest " + Math.round(S.st.far) + " (stage " + ["thinning", "cracks", "strange", "breaking"][L.edge.stage] + "), " + Math.round(L.out["Negative pocket"] || 0) + " ether lost to negative pockets, " + (L.frayLost || 0) + " blocks cracked off, " + L.edge.rare + " rare wrecks drained"] : [],
    ...L.hol.deep > 0 ? ["HOLLOWS   deepest " + pc(L.hol.deep) + " of the way to the heart; time at rim, quiet, cold, heart: " + L.hol.t.map((x) => tm(x)).join(", ") + "; " + Math.round(L.hol.lost) + " ether lost there; " + L.hol.frost + " block-hits of frost"] : [],
    ...L.cor.t > 0 || L.cor.hearts ? ["CORRUPTION " + tm(L.cor.t) + " inside, " + Math.round(L.cor.lost) + " ether lost to it, " + L.cor.hearts + " hearts destroyed, " + L.cor.buds + " budded; " + corrs.map((c) => Math.round(c.R)).join(" / ") + " units wide now"] : [],
    ...L.cor.pulses ? ["PULSES     " + L.cor.pulses + " Corruption pulses washed over you, " + TUNE.corrPulseOff + " s with the collectors offline each"] : [],
    ...L.hol.der ? ["DERELICT   " + Math.round(L.hol.der) + " ether refilled at a Hollow's heart"] : [],
    ...L.base && L.base.length ? ["PIRATE BASE  " + L.base.map((q) => q[0] + " at " + lgT(q[1]) + " (wave " + q[2] + ")").join(", ")] : [],
    "",
    table("SHIPS BROKEN", "count", "avg ttk", L.kills, (k) => (L.ttk[k] / L.kills[k]).toFixed(1) + "s"),
    "",
    "BLOCKS LOST",
    ...lines(lost, 5),
    "SHIP NOW, " + sum(ship) + " blocks",
    ...lines(shipList, 5),
    "TIME BY MOOD",
    ...lines(MOODS.map((m, i) => m.name + " " + pc(L.mood[i] / T)), 4),
    "TIME BY REGION",
    ...lines(bio, 4),
    "",
    ...errText(),
    "",
    "SLOW FRAMES  (over 50 ms; the last " + SPIKE.length + ")",
    ...SPIKE.length ? SPIKE.map((q) => "  " + R(lgT(q.t), 8) + "  wave " + F(q.w, 4) + R(q.ms, 5) + " ms   " + q.en + " enemies, " + q.rk + " rocks, " + q.bo + " bolts, " + q.pa + " particles") : ["  none"],
    "",
    "WAVE STATUS  (before each wave starts, after it clears, and when N calls the next; the last " + Math.min(WST.length, 60) + ")",
    ...WST.length ? WST.slice(-60).flatMap((q) => ["  " + F(lgT(q.t), 9) + "wave " + F(q.w, 4) + q.k, "    health and defence: " + q.h, "    ether and scrap:    " + q.e, "    weapons and upgrades: " + q.wp]) : ["  none"],
    "",
    "ROCK HITS  (rams; the last " + (L.rocks || []).length + ": rock size, your speed, hull, weight, shield before, shield paid, block damage)",
    ...(L.rocks || []).length ? L.rocks.slice(-40).map((q) => "  " + F(lgT(q.t), 9) + "w" + F(q.w, 4) + "size " + F(q.r, 4) + "speed " + F(q.sp, 6) + F(q.hull, 10) + "wt " + F(q.wt, 5) + "shield " + F(q.sh, 6) + "paid " + F(q.a, 5) + "blocks " + q.rem) : ["  none"],
    "",
    "SNAPSHOTS  (every 30 s; the last " + SNAP.length + ")",
    "  " + F("time", 9) + F("wave", 6) + R("pool", 7) + R("halo", 6) + R("shield", 7) + R("core", 6) + R("speed", 7) + R("blocks", 7) + R("enemies", 8) + "  where",
    ...SNAP.length ? SNAP.map((q) => "  " + F(lgT(q.t), 9) + F(q.w, 6) + R(q.pool, 7) + R(q.halo, 6) + R(q.sh, 7) + R(q.hp + "%", 6) + R(q.v, 7) + R(q.n, 7) + R(q.en, 8) + "  " + q.x + "," + q.y + " " + q.bio + ", " + (MOODS[q.mood] ? MOODS[q.mood].name : q.mood) + (q.as === "-" ? "" : ", assist " + q.as)) : ["  none"],
    "",
    "== EVENTS ==",
    "TIMELINE  (the last " + evs.length + " events; music and saves left out, assist switches grouped)",
    ...evs.length ? evs.map((q) => "  " + R(lgT(q.t), 8) + "  w" + F(q.w, 4) + F(q.k, 8) + q.x) : ["  none"]
  ];
  if (full) return all.join("\n");
  const out = [], i0 = all.indexOf(""), iw = all.indexOf("== WAVES =="), it = all.indexOf("== TOTALS ==");
  out.push(...all.slice(0, i0), "(short log; the full one has every table)", "");
  const wr = all.slice(iw + 1, it).filter((l) => !/^  (ship|fight|ttk|taken|dealt|in\/out|fill|racks|tier|slow|pd b\/m) /.test(l) && !/^WAVES/.test(l) && l !== "");
  out.push("== WAVES ==", wr[0], ...wr.slice(1).slice(-12));
  const top = (head) => {
    const i = all.findIndex((l) => l.startsWith(head));
    if (i < 0) return [];
    let n = 0;
    while (n < 6 && all[i + 1 + n] && all[i + 1 + n].startsWith("  ")) n++;
    return all.slice(i, i + 1 + n);
  };
  out.push("", "== TOTALS ==", ...top("ETHER IN"), ...top("ETHER OUT").slice(0, 1), ...top("DAMAGE TAKEN"), ...top("DAMAGE DEALT"));
  const keep = /^(MISSILES|BOMBS|FLIGHT|COPIES|POINT DEFENCE|HOLLOWS|CORRUPTION|PULSES|EXPLORED|EDGE|RAIDS|ENEMY RAILS|DAMAGE BY TYPE)/;
  out.push("", "== SHIPS AND WEAPONS ==", ...all.filter((l) => keep.test(l)));
  const ie = all.indexOf("== EVENTS ==");
  out.push("", "== EVENTS ==", all[ie + 1], ...all.slice(ie + 2).slice(-25));
  const er = errText();
  if (er.length) out.push("", ...er.slice(0, 6));
  return out.join("\n");
}
function evTrim() {
  const o = [];
  for (const q of EV) {
    if (q.k === "music" || q.k === "save" || q.k === "file" || q.k === "runlog") continue;
    const l = o[o.length - 1];
    if (q.k === "assist" && l && l.k === "assist" && q.t - l.t < 20) {
      l.n = (l.n || 1) + 1;
      l.x = l.n + " assist switches, now " + q.x;
      l.t = q.t;
      continue;
    }
    o.push(Object.assign({}, q));
  }
  return o;
}
function toggleLog() {
  const on = $("dbg").hidden;
  show("dbg", on);
  if (on) $("dbgBody").textContent = logText();
}
function saveLog() {
  if (host) {
    host.postMessage("save-log:" + logText());
    return;
  }
  const a = document.createElement("a"), d = /* @__PURE__ */ new Date(), p = (n) => String(n).padStart(2, "0");
  a.href = URL.createObjectURL(new Blob([logText()], { type: "text/plain" }));
  a.download = "etherwake-log-" + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "-" + p(d.getHours()) + p(d.getMinutes()) + ".txt";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1e3);
  logMsg("Saved");
}
function copyLog(short) {
  const t = logText(short);
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(() => logMsg(short ? "Copied the short log" : "Copied the full log"), saveLog);
  else saveLog();
}
let logMsgT = 0;
function logMsg(m) {
  $("dbgMsg").textContent = m;
  $("crMsg").textContent = m;
  toast(m, 2200);
  clearTimeout(logMsgT);
  logMsgT = setTimeout(() => {
    $("dbgMsg").textContent = "";
    $("crMsg").textContent = "";
  }, 6e3);
}
