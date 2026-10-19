const PATROL0 = 1e3;
let patrols = [], raidT = 480, raidWarn = 0, raidDir = 0, flankN = 0;
const ROLE = { sniper: "hold", carrier: "support", reflection: "hold", dart: "flank", mini: "flank", gun: "hold", rocket: "hold", bomber: "hold", bulwark: "front", brute: "front", beacon: "support", leech: "leech", warden: "boss", station: "post", heart: "post" };
const compass8 = (a) => ["east", "south-east", "south", "south-west", "west", "north-west", "north", "north-east"][(Math.round(a / (TAU / 8)) % 8 + 8) % 8];
const groupOf = (id) => id >= PATROL0 ? patrols[id - PATROL0] : zones[id];
const sightOf = (e) => (e.zone >= 0 ? TUNE.sightReach : TUNE.sightBase) * (1 - 0.3 * (S.cloud || 0));
function wakeEnemy(e) {
  if (e.zone >= 0) wakeGroup(e.zone, P.x, P.y, false);
  else {
    if (!e.awake) e.woke = true;
    e.awake = true;
  }
}
function wakeGroup(id, lx, ly, neighbour) {
  const g = groupOf(id);
  if (!g) return 0;
  let n = 0, late = 0;
  for (const e of enemies) if (e.zone === id) {
    if (!e.awake) {
      e.awake = true;
      e.woke = true;
      e.ret = false;
      e.lt = 0;
      e.launch = ET[e.type].station ? 0 : rnd(0, TUNE.launchT);
      late = Math.max(late, e.launch);
      n++;
    }
    e.look = neighbour ? { x: lx, y: ly, t: S.t + 45 } : null;
  }
  if (!n) return 0;
  g.alarm = S.t;
  ev("alarm", (id >= PATROL0 ? "patrol " : "fortress ") + id + " woke: " + n + " ships" + (neighbour ? " (heard it)" : ""));
  if (LOG && !neighbour) {
    if (id >= PATROL0) LOG.pat.woke++;
    else {
      LOG.camp[id] = { t0: S.t, n, launched: late, dmg0: Object.values(LOG.taken).reduce((a, b) => a + b, 0) };
    }
  }
  if (neighbour) return n;
  if (id < PATROL0) raidT = Math.min(raidT, TUNE.raidAfterHit + rnd(0, 60));
  const ear = TUNE.earshotReach;
  zones.forEach((z, j) => {
    if (j !== id && Math.hypot(z.x - g.x, z.y - g.y) < ear) wakeGroup(j, lx, ly, true);
  });
  patrols.forEach((p, k) => {
    if (PATROL0 + k !== id && Math.hypot(p.x - g.x, p.y - g.y) < ear) wakeGroup(PATROL0 + k, lx, ly, true);
  });
  return n;
}
function leadAim(e, speed) {
  const f = TUNE.lead[e.tier] || 0, dx = P.x - e.x, dy = P.y - e.y;
  if (!f) return Math.atan2(dy, dx);
  let t = Math.hypot(dx, dy) / speed;
  for (let i = 0; i < 2; i++) {
    t = Math.hypot(dx + P.vx * t * f, dy + P.vy * t * f) / speed;
  }
  return Math.atan2(dy + P.vy * t * f, dx + P.vx * t * f);
}
const nearestBeacon = (e) => {
  let b = null, bd = 1e18;
  for (const o of enemies) if (o !== e && o.awake && ET[o.type].support) {
    const d = (o.x - e.x) ** 2 + (o.y - e.y) ** 2;
    if (d < bd) {
      bd = d;
      b = o;
    }
  }
  return b;
};
function coverSpot(e) {
  if ((e.cvT = e.cvT || 0) > S.t) return e.cv;
  e.cvT = S.t + 0.5;
  e.cv = null;
  if (kindAt(e.x, e.y) !== "belt") return null;
  let best = null, bd = 64e4;
  for (const r of nearRocks) {
    const d = (r.x - e.x) ** 2 + (r.y - e.y) ** 2;
    if (d < bd) {
      bd = d;
      best = r;
    }
  }
  if (!best) return null;
  const qx = best.x - P.x, qy = best.y - P.y, ql = Math.hypot(qx, qy) || 1, off = best.r + e.r + 50;
  e.cv = [best.x + qx / ql * off, best.y + qy / ql * off];
  return e.cv;
}
function steer(e, T, ux, uy, dd, fog) {
  if (e.hurt) {
    const bc = nearestBeacon(e);
    if (bc) {
      const qx = bc.x - e.x, qy = bc.y - e.y, ql = Math.hypot(qx, qy) || 1;
      return ql > 260 ? [qx / ql, qy / ql] : [0, 0];
    }
    return [-ux, -uy];
  }
  const role = e.duel || e.siege ? "front" : ROLE[e.type] || "hold";
  if (role === "front") {
    const want2 = (T.range || 60) * 0.5;
    return [ux * (dd > want2 ? 1 : 0.2), uy * (dd > want2 ? 1 : 0.2)];
  }
  if (role === "leech") {
    const near = dd < P.radius + 90;
    return [near ? -uy * e.side : ux, near ? ux * e.side : uy];
  }
  if (role === "flank") {
    const k2 = dd > T.range * 0.55 ? 0.6 : -0.3;
    return [ux * k2 - uy * e.side, uy * k2 + ux * e.side];
  }
  if (role === "support") {
    let cx = 0, cy = 0, n = 0;
    for (const o of enemies) if (o !== e && o.awake && !ET[o.type].support && (o.x - e.x) ** 2 + (o.y - e.y) ** 2 < 196e4) {
      cx += o.x;
      cy += o.y;
      n++;
    }
    if (n) {
      cx /= n;
      cy /= n;
      const qx = cx - P.x, qy = cy - P.y, ql = Math.hypot(qx, qy) || 1, tx = cx + qx / ql * 260 - e.x, ty = cy + qy / ql * 260 - e.y, tl = Math.hypot(tx, ty);
      return tl > 80 ? [tx / tl, ty / tl] : [0, 0];
    }
  }
  if (T.range && e.cd > 0.6 && role === "hold") {
    const cv = coverSpot(e);
    if (cv) {
      const tx = cv[0] - e.x, ty = cv[1] - e.y, tl = Math.hypot(tx, ty);
      if (tl > 60) return [tx / tl, ty / tl];
    }
  }
  const want = (T.keep || T.range * 0.55) * fog, k = dd > want ? 1 : -0.7;
  return [ux * k - uy * e.side * 0.4, uy * k + ux * e.side * 0.4];
}
function idleSteer(e, T, dt) {
  if (ET[e.type].station) {
    e.a += 0.12 * dt;
    return;
  }
  e.op += e.ow * dt;
  const tx = e.hx + Math.cos(e.op) * e.or - e.x, ty = e.hy + Math.sin(e.op) * e.or - e.y, tl = Math.hypot(tx, ty) || 1;
  e.vx += tx / tl * T.sp * 1.4 * dt;
  e.vy += ty / tl * T.sp * 1.4 * dt;
  const sp = Math.hypot(e.vx, e.vy);
  if (sp > 20) {
    let da = Math.atan2(e.vy, e.vx) - e.a;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    e.a += clamp(da, -1.6 * dt, 1.6 * dt);
  }
}
function makeCaptain(z, e) {
  e.capK = TUNE.capHp;
  rescaleShip(e);
  e.name = ["Vance", "Rook", "Mara", "Kestrel", "Brannoch", "Sable", "Ordo", "Teague"][Math.random() * 8 | 0] + " the " + ["Red", "Quiet", "Hollow", "Grim", "Wide", "Last"][Math.random() * 6 | 0];
  z.cap = e;
}
const DOCKED = ["dart", "dart", "dart", "dart", "dart", "gun", "gun", "gun", "mini", "mini", "rocket", "rocket", "brute", "brute", "dart", "gun"];
const BASE_DOCKED = ["bulwark", "rocket", "bulwark", "rocket", "gun", "bulwark", "rocket", "brute", "bulwark", "rocket", "dart", "bulwark", "rocket", "brute"];
const baseK = (z) => (1 + TUNE.baseLvlK * (z.baseLvl || 0)) * (1 + S.wave / TUNE.baseWaveK);
const baseWant = (z) => Math.min(34, 16 + 3 * (z.baseLvl || 0) + (S.wave / 12 | 0));
function baseMark(st, z) {
  const k = baseK(z);
  st.hpK = 3 * k;
  rescaleShip(st);
  st.rMul = 1.25;
  st.r *= 1.25;
  st.base = 1;
  st.baseK = k;
  st.name = "Pirate base" + (z.baseLvl | 0 ? " " + ("I".repeat(Math.min(z.baseLvl, 3)) || "") : "");
}
function buildFortress(z, i) {
  const st = mkEnemy("station", z.x, z.y, i);
  enemies.push(st);
  z.fallen = -1e9;
  z.capT = 0;
  z.want = 10 + (RND() * 7 | 0);
  if (z.base) {
    z.want = baseWant(z);
    baseMark(st, z);
    for (let k = 0; k < z.want; k++) dockShip(z, i, BASE_DOCKED[k % BASE_DOCKED.length]);
  } else for (let k = 0; k < z.want; k++) dockShip(z, i, DOCKED[k % DOCKED.length]);
  const b = enemies.find((e) => e.zone === i && e.type === "brute") || enemies.find((e) => e.zone === i && e.type !== "station");
  if (b) makeCaptain(z, b);
}
function dockShip(z, i, type) {
  const q = rnd(0, TAU), r = rnd(170, z.R * 0.45), e = mkEnemy(type, z.x + Math.cos(q) * r, z.y + Math.sin(q) * r, i);
  enemies.push(e);
  return e;
}
function buildPatrols() {
  patrols = [];
  const fz = zones.map((z, i) => i).filter((i) => !zones[i].heart);
  if (fz.length < 2) return;
  for (let k = 0; k < Math.min(TUNE.patrols, fz.length); k++) {
    const a = fz[RND() * fz.length | 0], wp = [a];
    for (let m = 0; m < 3; m++) {
      const l = wp[wp.length - 1], z0 = zones[l], near = fz.filter((i) => i !== l).sort((p2, q) => Math.hypot(zones[p2].x - z0.x, zones[p2].y - z0.y) - Math.hypot(zones[q].x - z0.x, zones[q].y - z0.y)).slice(0, 3);
      wp.push(near[RND() * near.length | 0]);
    }
    const z = zones[a], p = { wp, seg: 0, x: z.x + rnd(-400, 400), y: z.y + rnd(-400, 400), alarm: -99 }, id = PATROL0 + k;
    patrols.push(p);
    const n = 3 + (RND() * 4 | 0), mix = ["dart", "gun", "dart", "mini", "rocket", "gun"];
    for (let m = 0; m < n; m++) {
      const e = mkEnemy(mix[m % mix.length], p.x + rnd(-200, 200), p.y + rnd(-200, 200), id);
      e.hx = p.x;
      e.hy = p.y;
      e.or = rnd(120, 260);
      enemies.push(e);
    }
  }
}
function updGroups(dt) {
  patrols.forEach((p, k) => {
    const id = PATROL0 + k;
    let awake = false;
    for (const e of enemies) if (e.zone === id && e.awake) {
      awake = true;
      break;
    }
    if (!awake) {
      const z = zones[p.wp[p.seg]], tx = z.x - p.x, ty = z.y - p.y, tl = Math.hypot(tx, ty);
      if (tl < 450) p.seg = (p.seg + 1) % p.wp.length;
      else {
        p.x += tx / tl * TUNE.patrolSpeed * 150 * dt;
        p.y += ty / tl * TUNE.patrolSpeed * 150 * dt;
      }
    }
    for (const e of enemies) if (e.zone === id && !e.awake) {
      e.hx = p.x;
      e.hy = p.y;
    }
  });
  zones.forEach((z, i) => {
    if (z.heart) return;
    if (z.capT > 0 && (z.capT -= dt) <= 0) {
      const b = enemies.find((e) => e.zone === i && e.type === "brute" && !e.capK) || enemies.find((e) => e.zone === i && e.type !== "station" && !e.capK);
      if (b) makeCaptain(z, b);
    }
    if ((z.t -= dt) > 0) return;
    z.t = 18;
    const near = Math.hypot(P.x - z.x, P.y - z.y) < z.ext + 2500, st = enemies.find((e) => e.zone === i && e.type === "station"), docked = enemies.filter((e) => e.zone === i && e.type !== "station").length;
    if (st) {
      if (!near && docked < z.want) {
        const opts = UNLOCK.filter((u) => u[1] <= S.wave && u[0] !== "beacon"), t = opts.length ? opts[Math.random() * opts.length | 0][0] : "dart";
        dockShip(z, i, t);
      }
    } else if (z.base) {
      if (S.t - z.fallen > TUNE.baseBack && Math.hypot(P.x - z.x, P.y - z.y) > 3200) {
        const st2 = mkEnemy("station", z.x, z.y, i);
        enemies.push(st2);
        z.want = baseWant(z);
        baseMark(st2, z);
        for (let k = docked; k < z.want; k++) dockShip(z, i, BASE_DOCKED[k % BASE_DOCKED.length]);
        const b = enemies.find((e) => e.zone === i && e.type === "brute" && !e.capK);
        if (b) makeCaptain(z, b);
        ev("pirate base", "back, level " + z.baseLvl);
        if (LOG) (LOG.base = LOG.base || []).push(["back", Math.round(S.t), S.wave]);
        if (Math.hypot(P.x - z.x, P.y - z.y) < 3e4) toast("The pirate base is back.", 3e3);
      }
    } else if (!near && S.t - z.fallen > TUNE.fortRefill) {
      const st2 = mkEnemy("station", z.x, z.y, i);
      enemies.push(st2);
      for (let k = docked; k < z.want; k++) dockShip(z, i, DOCKED[k % DOCKED.length]);
      const b = enemies.find((e) => e.zone === i && e.type === "brute" && !e.capK);
      if (b) makeCaptain(z, b);
      ev("fortress", i + " retaken by pirates");
    }
  });
  updRaids(dt);
}
function updRaids(dt) {
  if (Math.hypot(P.x, P.y) > WORLD) {
    raidWarn = 0;
    return;
  }
  if (raidWarn > 0) {
    raidWarn -= dt;
    if (raidWarn <= 0) {
      if (waveLive > 0 || rifts.length) raidWarn = 4;
      else launchRaid();
    }
    return;
  }
  if (waveLive > 0 || rifts.length || S.over || !S.started) return;
  raidT -= dt;
  if (raidT > 0) return;
  let best = null, bd = 1e18;
  for (const z of zones) {
    if (!z.cap || z.cap.hp <= 0 || enemies.indexOf(z.cap) < 0) continue;
    const d = Math.hypot(z.x - P.x, z.y - P.y);
    if (d < bd) {
      bd = d;
      best = z;
    }
  }
  if (!best) {
    raidT = 60;
    return;
  }
  raidDir = Math.atan2(best.y - P.y, best.x - P.x);
  raidWarn = TUNE.raidWarn;
  raidT = TUNE.raidEvery + rnd(0, 120);
  toast("Pirate raiders inbound from the " + compass8(raidDir), 3600);
  sfx("wave");
  ev("raid", "warning: from the " + compass8(raidDir));
}
function launchRaid() {
  const n = 4 + (Math.random() * 5 | 0), mix = ["dart", "dart", "gun", "gun", "mini", "rocket", "brute"];
  for (let m = 0; m < n; m++) {
    const a = raidDir + rnd(-0.35, 0.35), d = rnd(2100, 2500), e = mkEnemy(mix[m % mix.length], P.x + Math.cos(a) * d, P.y + Math.sin(a) * d);
    e.raid = true;
    enemies.push(e);
    ring(e.x, e.y, 20, 160, 3);
  }
  sfx("warp");
  if (LOG) {
    LOG.raid.n++;
    LOG.raid.ships += n;
  }
  ev("raid", "launched: " + n + " ships");
}
function fortressFell(e) {
  const z = zones[e.zone];
  if (!z) return;
  z.fallen = S.t;
  ctEvent("fortress", e.zone);
  if (z.base) {
    z.baseDown = S.t;
    z.baseLvl = (z.baseLvl | 0) + 1;
    toast("The pirate base powers down. It will be back in " + Math.round(TUNE.baseBack / 60) + " minutes, stronger.", 4200);
    ev("pirate base", "down; level now " + z.baseLvl);
    if (LOG) (LOG.base = LOG.base || []).push(["down", Math.round(S.t), S.wave]);
  }
  for (let k = 0; k < 2; k++) wrecks.push(mkWreck(e.x + rnd(-200, 200), e.y + rnd(-200, 200), true));
  S.scrap += 8 + Math.round(S.wave * 0.4);
  toast("Fortress destroyed. Pirates will move back in after a while.", 3600);
  sfx("clear");
  ev("fortress", e.zone + " fell");
  if (LOG && LOG.camp[e.zone]) {
    const c = LOG.camp[e.zone];
    c.cleared = S.t - c.t0;
    c.dmg = Object.values(LOG.taken).reduce((a, b) => a + b, 0) - c.dmg0;
  }
}
function baseSave() {
  const zi = zones.findIndex((q) => q.base);
  if (zi < 0) return null;
  const z = zones[zi], up = enemies.some((e) => e.zone === zi && e.type === "station");
  return { lvl: z.baseLvl | 0, back: up ? 0 : Math.max(1, Math.round(TUNE.baseBack - (S.t - z.fallen))) };
}
function baseLoad(a) {
  const zi = zones.findIndex((q) => q.base);
  if (zi < 0 || !a || typeof a !== "object") return;
  const z = zones[zi], lvl = Math.max(0, Math.min(50, a.lvl | 0)), back = Math.max(0, Math.min(TUNE.baseBack, +a.back || 0));
  z.baseLvl = lvl;
  if (!lvl && !back) return;
  for (let i = enemies.length - 1; i >= 0; i--) if (enemies[i].zone === zi) enemies.splice(i, 1);
  if (back > 0) {
    z.fallen = S.t - (TUNE.baseBack - back);
    z.cap = null;
    z.capT = 0;
    z.want = baseWant(z);
    z.baseDown = z.fallen;
  } else buildFortress(z, zi);
}
function captainDown(e) {
  const z = zones[e.zone];
  if (z) {
    z.cap = null;
    z.capT = TUNE.capBack;
  }
  toast(e.name + " is down. That fortress sends no raids for now.", 3200);
  ev("captain", e.name + " killed");
}
