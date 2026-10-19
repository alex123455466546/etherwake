const MAXHULL = HULLS.names.length - 1;
const GAUGE = {
  lance: (x, y) => x >= 0 ? Math.max(x / 3.6, Math.abs(y) + 0.26 * x) : Math.max(-x / 2.3, Math.abs(y) * 0.95, 0.8 * (-x / 2.3 + Math.abs(y))),
  /* a spearhead: a sharp nose and a broad, chamfered tail */
  manta: (x, y) => Math.hypot((x + 0.7 * Math.abs(y) - 0.3) / 1.1, y / 2.3),
  /* wings swept back */
  wheel: (x, y) => Math.hypot(x, y),
  bastion: (x, y) => Math.max(Math.abs(x) / 1.7, (Math.abs(y) + 0.42 * x) / 1.45, 0.7 * (Math.abs(x) / 1.7 + Math.abs(y) / 1.45)),
  /* a wedge: narrow at the front, wide and chamfered at the back */
  brick: (x, y) => Math.max(Math.abs(x) / 1.4, Math.abs(y))
};
const SYMX = { wheel: 1, brick: 1 };
const cellsOf = (s) => s ? s.split(";").map((c) => c.split(",").map(Number)) : [];
function growHull(line, from, n) {
  const f = GAUGE[line] || GAUGE.lance, symx = !!SYMX[line], set = new Set(from), R = 34, seen = /* @__PURE__ */ new Set(), list = [];
  const orb = (x, y) => {
    const o = /* @__PURE__ */ new Set([x + "," + y, x + "," + -y]);
    if (symx) {
      o.add(-x + "," + y);
      o.add(-x + "," + -y);
    }
    return [...o];
  };
  for (let x = -R; x <= R; x++) for (let y = -R; y <= R; y++) {
    const k = x + "," + y;
    if (seen.has(k)) continue;
    const o = orb(x, y);
    o.forEach((q) => seen.add(q));
    list.push({ o, f: f(x, y) + 0.03 * Math.hypot(x, y), x, y });
  }
  list.sort((a, b) => a.f - b.f || a.x - b.x || a.y - b.y);
  const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]], touches = (q) => {
    const [x, y] = q.split(",").map(Number);
    return nb.some(([dx, dy]) => set.has(x + dx + "," + (y + dy)));
  };
  for (const g of list) {
    const add = g.o.filter((q) => !set.has(q));
    if (!add.length || set.size + add.length > n) continue;
    if (set.size && !add.some(touches)) continue;
    add.forEach((q) => set.add(q));
    if (set.size >= n) break;
  }
  for (const g of list) {
    if (set.size >= n) break;
    for (const q of g.o) if (!set.has(q) && q.endsWith(",0") && touches(q)) {
      set.add(q);
      if (set.size >= n) break;
    }
  }
  return set;
}
const HCACHE = {};
function hullChain(line, vr) {
  const key = line + "|" + vr;
  if (HCACHE[key]) return HCACHE[key];
  const base = HCACHE[line + "|normal"] || [], ch = [];
  let set = /* @__PURE__ */ new Set(["0,0"]);
  for (let t = 0; t < HULLS.cells.length; t++) {
    if (t < 3 && base[t]) {
      set = base[t];
      ch.push(set);
      continue;
    }
    set = growHull(line, set, Math.round(HULLS.cells[t] * (t >= 3 ? (VARS[vr] || VARS.normal).cells : 1)));
    ch.push(set);
  }
  return HCACHE[key] = ch;
}
function hullSet(tier, line, vr) {
  if (tier < 0) {
    const set = /* @__PURE__ */ new Set();
    for (let x = -6; x <= 6; x++) for (let y = -6; y <= 6; y++) set.add(x + "," + y);
    return set;
  }
  if (!GAUGE[line]) line = GAUGE[S.pick] ? S.pick : "lance";
  hullChain(line, "normal");
  return hullChain(line, tier >= 3 && VARS[vr] ? vr : "normal")[Math.min(tier, HULLS.cells.length - 1)];
}
const inHull = (x, y) => P.hullSet.has(x + "," + y);
const lineOf = () => S.hull >= 0 && S.line ? LINES[S.line] : null;
const DK = () => HK() * PK("dmg") * (S.momT > 0 ? S.momV || 1 : 1);
const varOf = () => S.hull >= 3 ? VARS[S.var] || VARS.normal : null;
const hullName = () => S.hull < 0 ? "Legacy" : (lineOf() ? lineOf().name + " " : "") + (S.hull >= 3 && S.var && S.var !== "normal" ? VARS[S.var].name + " " : "") + HULLS.names[S.hull];
function PK(k) {
  const l = lineOf(), v = varOf();
  let m = l && l[k] || 1;
  if (v && v[k]) m *= 1 + (v[k] - 1) * (1 + 0.25 * (S.vk || 0));
  if (S.hull >= 7 && k !== "use") {
    for (const n of VARORDER) if (n !== S.var && VARS[n][k] > 1) m *= 1 + (VARS[n][k] - 1) * 0.5;
  }
  return m * EK(k);
}
function nextCells(vr) {
  if (S.hull < 0 || S.hull >= MAXHULL) return [];
  const nx = hullSet(S.hull + 1, S.line, vr || S.var), out = [];
  for (const k of nx) if (!P.hullSet.has(k)) out.push(k.split(",").map(Number));
  return out;
}
function hullEdges(set) {
  const e = [];
  for (const k of set) {
    const [x, y] = k.split(",").map(Number), h = CELL / 2;
    if (!set.has(x + 1 + "," + y)) e.push([x * CELL + h, y * CELL - h, x * CELL + h, y * CELL + h]);
    if (!set.has(x - 1 + "," + y)) e.push([x * CELL - h, y * CELL - h, x * CELL - h, y * CELL + h]);
    if (!set.has(x + "," + (y + 1))) e.push([x * CELL - h, y * CELL + h, x * CELL + h, y * CELL + h]);
    if (!set.has(x + "," + (y - 1))) e.push([x * CELL - h, y * CELL - h, x * CELL + h, y * CELL - h]);
  }
  return e;
}
function setHull(tier, line, vr) {
  S.hull = tier;
  S.line = tier >= 0 ? LINES[line] ? line : LINES[S.pick] ? S.pick : "lance" : "";
  S.var = tier >= 3 ? VARS[vr] ? vr : VARS[S.var] ? S.var : "normal" : "normal";
  if (tier < 3) S.vk = 0;
  P.hullSet = hullSet(tier, S.line, S.var);
  P.hullEdges = hullEdges(P.hullSet);
  P.shell = makeShell();
  let x0 = 0, x1 = 0, y0 = 0, y1 = 0;
  for (const k of P.hullSet) {
    const [x, y] = k.split(",").map(Number);
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  for (const vr2 of S.hull + 1 >= 3 ? VARORDER : ["normal"]) for (const [x, y] of nextCells(vr2)) {
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  P.view = { x0, x1, y0, y1 };
}
function borderCells(set) {
  const out = [];
  for (const k of set) {
    const [x, y] = k.split(",").map(Number);
    if (!set.has(x + 1 + "," + y) || !set.has(x - 1 + "," + y) || !set.has(x + "," + (y + 1)) || !set.has(x + "," + (y - 1))) out.push([x, y]);
  }
  return out;
}
const SHELL_K = 1 / 3;
const shellMax = () => BT.hull.hp * SHELL_K * (1 + Math.min(S.wave, 160) / 25);
function makeShell() {
  const mx = shellMax();
  return P.hullEdges.map((e) => ({ x1: e[0], y1: e[1], x2: e[2], y2: e[3], hp: mx, max: mx }));
}
function dropFrames() {
  let n = 0;
  P.blocks = P.blocks.filter((b) => {
    if (b.frame) {
      n++;
      return false;
    }
    return true;
  });
  for (let i = tray.length - 1; i >= 0; i--) if (tray[i].frame) {
    tray.splice(i, 1);
    n++;
  }
  return n;
}
const fitFrame = dropFrames;
function shellHit(lx, ly, dmg, wide) {
  if (!P.shell || dmg <= 0) return dmg;
  let best = null, bd = CELL * (wide ? 3.5 : 0.8);
  for (const s of P.shell) {
    if (s.hp <= 0) continue;
    const sx = s.x2 - s.x1, sy = s.y2 - s.y1, L2 = sx * sx + sy * sy || 1, t = clamp(((lx - s.x1) * sx + (ly - s.y1) * sy) / L2, 0, 1), qx = s.x1 + sx * t - lx, qy = s.y1 + sy * t - ly, d = Math.sqrt(qx * qx + qy * qy);
    if (d < bd) {
      bd = d;
      best = s;
    }
  }
  if (!best) return dmg;
  const a = Math.min(best.hp, dmg);
  best.hp -= a;
  best.hit = S.t;
  if (LOG) {
    LOG.shell = (LOG.shell || 0) + a;
  }
  return dmg - a;
}
function stepShell(dt) {
  const mend = S.hull >= 3 && (VARS[S.var] || {}).mend ? 1 + 0.25 * (S.vk || 0) : 0;
  if (mend && S.frame % 6 === 0 && S.t - S.lastHit > 1) for (const b of P.blocks) {
    const mh = maxHp(b);
    if (b.hp > 0 && b.hp < mh && !b.ghost) b.hp = Math.min(mh, b.hp + mh * 4e-3 * mend * dt * 6);
  }
  if (P.shell && P.shell.length && S.frame % 60 === 0) {
    const mx = shellMax();
    if (Math.abs(P.shell[0].max - mx) > 0.5) for (const s of P.shell) {
      const f = s.hp / s.max;
      s.max = mx;
      s.hp = mx * f;
    }
  }
  if (!P.shell || S.t - S.lastHit < (mend ? 1 : 3)) return;
  for (const s of P.shell) if (s.hp < s.max) s.hp = Math.min(s.max, s.hp + s.max / (mend ? 5 : 20) * dt);
}
const GUNS = /* @__PURE__ */ new Set(["emit", "mini", "rail", "hmini", "art"]);
const jobOf = (t) => {
  const k = BT[t].k;
  return k === "eng" ? "drive" : GUNS.has(t) ? "gun" : "rest";
};
const REST_ORDER = { tank: 0, dtank: 0, coll: 1, hcoll: 1, hull: 2, mirror: 2, ehull: 2 };
function arrange(keepTray, dry) {
  const core = P.blocks.find((b) => b.t === "core");
  if (!core) return null;
  const manta = S.hull >= 2 && S.line === "manta", wheel = S.hull >= 2 && S.line === "wheel", set = P.hullSet, K = (x, y) => x + "," + y;
  const slotSet = new Set(P.slots), fromT = keepTray ? [] : tray.filter((b) => !b.frame);
  const items = [...P.blocks.filter((b) => b !== core && !b.ghost && !b.frame), ...fromT, ...P.slots], frames = [...P.blocks.filter((b) => b.frame), ...keepTray ? [] : tray.filter((b) => b.frame)];
  const u = { arr: { pos: P.blocks.map((b) => [b, b.x, b.y, b.rot | 0, b.fc | 0]), tray: tray.map((b) => [b, b.x, b.y, b.rot | 0, b.fc | 0]), slots: P.slots.map((q) => [q, q.x, q.y, q.rot | 0, q.fc | 0]), dropped: [], lostSlots: [] } };
  const area = (b) => fw(b) * fh(b), occ = new Set(footOf(core).map((c) => K(c[0], c[1]))), placed = /* @__PURE__ */ new Map();
  const worth = (b) => (slotSet.has(b) ? 10 : 0) + (jobOf(b.t) === "rest" ? 1 + (REST_ORDER[b.t] ?? 1) : 0);
  const sorted = items.slice().sort((a, b) => worth(a) - worth(b));
  const mid = (cs) => [cs.reduce((a, c) => a + c[0], 0) / cs.length, cs.reduce((a, c) => a + c[1], 0) / cs.length];
  const xs = [...set].map((k) => +k.split(",")[0]), xmax = Math.max(...xs), xmin = Math.min(...xs), edgeX = /* @__PURE__ */ new Map(), edgeR = /* @__PURE__ */ new Map();
  for (const k of set) {
    const [x, y] = k.split(",").map(Number);
    edgeX.set(y, Math.max(edgeX.has(y) ? edgeX.get(y) : -99, x));
    edgeR.set(y, Math.min(edgeR.has(y) ? edgeR.get(y) : 99, x));
  }
  const rowF = (y) => edgeX.has(Math.round(y)) ? edgeX.get(Math.round(y)) : xmax, rowR = (y) => edgeR.has(Math.round(y)) ? edgeR.get(Math.round(y)) : xmin, frontC = rowF(0);
  const bigRole = (b) => b.t === "battery" ? "rack" : b.t === "slab" ? "plate" : jobOf(b.t) === "gun" ? "gun" : jobOf(b.t) === "drive" ? "drive" : "band";
  const RANK = { gun: 0, rack: 1, drive: 2, plate: 3, band: 4 };
  const bigs = sorted.filter((b) => area(b) > 1).sort((a, b) => area(b) - area(a) || RANK[bigRole(a)] - RANK[bigRole(b)]), mates = /* @__PURE__ */ new Map();
  const spare = [];
  for (const b of bigs) {
    const role = bigRole(b), r0 = b.rot | 0, rots = BT[b.t].sz[0] === BT[b.t].sz[1] ? [r0] : [r0, 1 - r0];
    let best = null, bs = -1e9;
    for (const rot of rots) for (const key of set) {
      const [x, y] = key.split(",").map(Number), cs = cellsAt(x, y, b.t, rot);
      if (!cs.every(([cx, cy]) => set.has(K(cx, cy)) && !occ.has(K(cx, cy)))) continue;
      const [mx, my] = mid(cs), w = rot ? BT[b.t].sz[1] : BT[b.t].sz[0], h = rot ? BT[b.t].sz[0] : BT[b.t].sz[1], rr = Math.hypot(mx - core.x, my - core.y);
      let sc = wheel ? role === "gun" ? rr * 10 : role === "drive" ? rr * 8 : role === "plate" ? rr * 4 : -rr * rr : role === "gun" ? manta ? mx * 10 + Math.abs(my) * 4 : -Math.abs(mx - (frontC - 1 - (w - 1) / 2)) * 10 - Math.abs(my) * 6 : role === "rack" ? -Math.abs(mx - (rowF(my) - (w - 1) / 2)) * 10 - Math.abs(Math.abs(my) - 3) * 3 : role === "drive" ? -(mx - xmin) * 10 - Math.abs(mx - (rowR(my) + (w - 1) / 2)) * 4 + Math.abs(my) * 3 : role === "plate" ? rr * 4 : -rr * rr;
      if (cs.some(([cx, cy]) => occ.has(K(cx + 1, cy)) || occ.has(K(cx - 1, cy)) || occ.has(K(cx, cy + 1)) || occ.has(K(cx, cy - 1)))) sc += 4;
      if ((mates.get(b.t) || []).some((q) => q[2] === rot && q[0] === x && q[1] === -y - (h - 1))) sc += role === "drive" ? 25 : 12;
      sc -= rot === r0 ? 0 : 5;
      if (sc > bs) {
        bs = sc;
        best = [x, y, rot];
      }
    }
    if (best) {
      placed.set(b, best);
      for (const [cx, cy] of cellsAt(best[0], best[1], b.t, best[2])) occ.add(K(cx, cy));
      if (!mates.has(b.t)) mates.set(b.t, []);
      mates.get(b.t).push(best);
    } else spare.push(b);
  }
  const smalls = sorted.filter((b) => area(b) === 1), freeC = [...set].filter((k) => !occ.has(k)).map((k) => k.split(",").map(Number)), fit = smalls.slice(0, freeC.length);
  spare.push(...smalls.slice(freeC.length));
  const roleOf = (b) => b.t === "emit" || b.t === "mini" ? "gun" : b.t === "miss" ? "rack" : b.t === "gyro" ? "gyro" : jobOf(b.t) === "drive" ? "drive" : b.t === "sensor" ? "sensor" : REST_ORDER[b.t] === 2 ? "plate" : "band";
  const nMid = fit.filter((b) => {
    const r = roleOf(b);
    return r === "band" || r === "plate";
  }).length, reachF = Math.max(1, Math.floor(nMid * 0.45)), reachR = Math.max(1, Math.floor(nMid * 0.3));
  const FA = Math.min(xmax, core.x + reachF + 1), RA = Math.max(xmin, core.x - reachR - 1), pool2 = freeC.slice(), spokes = (n, r, off) => Array.from({ length: n }, (_, i) => {
    const a = off + i * TAU / n;
    return [core.x + Math.cos(a) * r, core.y + Math.sin(a) * r];
  });
  const rmax = Math.max(...[...set].map((k) => {
    const [x, y] = k.split(",").map(Number);
    return Math.hypot(x - core.x, y - core.y);
  })), Ra = Math.min(rmax, 2 + nMid * 0.35);
  const nearest = (px, py) => {
    let bi = -1, bd = 1e18;
    pool2.forEach((c, i) => {
      const d = (c[0] - px) ** 2 + (c[1] - py) ** 2;
      if (d < bd) {
        bd = d;
        bi = i;
      }
    });
    return bi < 0 ? null : pool2.splice(bi, 1)[0];
  };
  const takeBy = (n, score) => {
    pool2.sort((m, o) => score(m) - score(o) || m[1] - o[1]);
    return pool2.splice(0, n);
  };
  const byRole = {};
  for (const b of fit) (byRole[roleOf(b)] = byRole[roleOf(b)] || []).push(b);
  const putR = (list, spots) => (list || []).forEach((b, i) => {
    if (spots[i]) placed.set(b, [spots[i][0], spots[i][1], b.rot | 0]);
  });
  if (wheel) {
    putR(byRole.gun, (byRole.gun || []).length ? spokes(byRole.gun.length, Ra, 0).map((q) => nearest(q[0], q[1])) : []);
    putR(byRole.rack, (byRole.rack || []).length ? spokes(byRole.rack.length, Ra * 0.85, TAU / Math.max(8, byRole.rack.length * 2)).map((q) => nearest(q[0], q[1])) : []);
    putR(byRole.drive, (byRole.drive || []).length ? spokes(byRole.drive.length, Ra * 0.6, TAU / (2 * byRole.drive.length)).map((q) => nearest(q[0], q[1])) : []);
    putR(byRole.gyro, takeBy((byRole.gyro || []).length, ([x, y]) => Math.abs(Math.hypot(x - core.x, y - core.y) - Ra * 0.45)));
  } else {
    putR(byRole.gun, takeBy((byRole.gun || []).length, ([x, y]) => Math.abs(x - FA) + Math.abs(y) * 1.3 + (x > FA ? 4 : 0)));
    putR(byRole.rack, takeBy((byRole.rack || []).length, ([x, y]) => (edgeX.get(y) - x) * 3 + Math.abs(x - FA) * 0.6 + Math.abs(y) * 0.55 + (x > FA + 1 ? 30 : 0)));
    putR(byRole.drive, takeBy((byRole.drive || []).length, ([x, y]) => (x - RA) * 1.2 - Math.abs(y) * 0.9 + (Math.abs(y) < 1.5 ? 3 : 0)));
    putR(byRole.gyro, takeBy((byRole.gyro || []).length, ([x, y]) => Math.abs(x - RA - 2) + Math.abs(y) * 0.35));
  }
  putR(byRole.sensor, takeBy((byRole.sensor || []).length, ([x, y]) => Math.abs(x - core.x - 1) * 2 + Math.abs(y) * 2));
  const band = byRole.band || [];
  band.sort((m, o) => (REST_ORDER[m.t] ?? 1) - (REST_ORDER[o.t] ?? 1));
  putR(band, takeBy(band.length, ([x, y]) => wheel ? Math.hypot(x - core.x, y - core.y) : Math.abs(y) * 2.2 + Math.abs(x - core.x) * 0.8));
  const pl = byRole.plate || [], depth0 = /* @__PURE__ */ new Map();
  for (const k of placed.values()) depth0.set(K(k[0], k[1]), 0);
  putR(pl, takeBy(pl.length, ([x, y]) => {
    let d = 9;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (depth0.has(K(x + dx, y + dy))) d = 0;
    return d * 3 - Math.abs(y) * 0.4 + Math.hypot(x - core.x, y - core.y) * 0.3;
  }));
  {
    const cellOwner = () => {
      const m = /* @__PURE__ */ new Map();
      for (const [b, p] of placed) for (const c of cellsAt(p[0], p[1], b.t, p[2])) m.set(K(c[0], c[1]), b);
      for (const c of footOf(core)) m.set(K(c[0], c[1]), core);
      return m;
    }, stuck = /* @__PURE__ */ new Set(), N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let guard2 = 0; guard2 < fit.length + bigs.length + 4; guard2++) {
      const m = cellOwner(), seen = /* @__PURE__ */ new Set(), qq = footOf(core).map((c) => K(c[0], c[1]));
      qq.forEach((k) => seen.add(k));
      for (let i = 0; i < qq.length; i++) {
        const [x, y] = qq[i].split(",").map(Number);
        for (const [dx, dy] of N4) {
          const k = K(x + dx, y + dy);
          if (m.has(k) && !seen.has(k)) {
            seen.add(k);
            qq.push(k);
          }
        }
      }
      const cut = [...placed].filter(([b2, p2]) => !stuck.has(b2) && !cellsAt(p2[0], p2[1], b2.t, p2[2]).some((c) => seen.has(K(c[0], c[1]))));
      if (!cut.length) break;
      const [b, p] = cut[0];
      placed.delete(b);
      const used = new Set(m.keys());
      let best = null, bd = 1e18;
      if (area(b) > 1) {
        const own = cellsAt(p[0], p[1], b.t, p[2]);
        for (const c of own) used.delete(K(c[0], c[1]));
        const [px, py] = mid(own);
        for (const rot of BT[b.t].sz[0] === BT[b.t].sz[1] ? [p[2]] : [p[2], 1 - p[2]]) for (const k of set) {
          const [x, y] = k.split(",").map(Number), cs = cellsAt(x, y, b.t, rot);
          if (!cs.every(([cx, cy]) => set.has(K(cx, cy)) && !used.has(K(cx, cy))) || !cs.some(([cx, cy]) => N4.some(([dx, dy]) => seen.has(K(cx + dx, cy + dy))))) continue;
          const [mx, my] = mid(cs), d = (mx - px) ** 2 + (my - py) ** 2;
          if (d < bd) {
            bd = d;
            best = [x, y, rot];
          }
        }
        if (best) placed.set(b, best);
        else {
          placed.set(b, p);
          stuck.add(b);
        }
        continue;
      }
      for (const k of set) {
        if (used.has(k)) continue;
        const [x, y] = k.split(",").map(Number);
        if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has(K(x + dx, y + dy)))) continue;
        const d = (x - p[0]) ** 2 + (y - p[1]) ** 2;
        if (d < bd) {
          bd = d;
          best = [x, y];
        }
      }
      if (best) placed.set(b, [best[0], best[1], b.rot | 0]);
      else spare.push(b);
    }
  }
  if (dry) return { placed, spare, moved: [...placed].filter(([b, p]) => tray.includes(b) || !(b.x === p[0] && b.y === p[1] && (b.rot | 0) === p[2])).length };
  for (const [b, [x, y, rot]] of placed) {
    b.x = x;
    b.y = y;
    b.rot = rot;
    autoFace(b);
    if (slotSet.has(b)) continue;
    const ti = tray.indexOf(b);
    if (ti >= 0) {
      tray.splice(ti, 1);
      P.blocks.push(b);
    }
  }
  for (const b of spare) {
    if (slotSet.has(b)) {
      P.slots.splice(P.slots.indexOf(b), 1);
      u.arr.lostSlots.push(b);
    } else if (!tray.includes(b)) {
      P.blocks.splice(P.blocks.indexOf(b), 1);
      b.g = 0;
      tray.push(b);
    }
  }
  if (!tray.some((b) => b.t === fromTray)) fromTray = tray.length ? tray[0].t : null;
  const taken = /* @__PURE__ */ new Set();
  for (const b of P.blocks) if (!b.frame) for (const c of footOf(b)) taken.add(K(c[0], c[1]));
  for (const s2 of P.slots) for (const c of cellsAt(s2.x, s2.y, s2.t, s2.rot)) taken.add(K(c[0], c[1]));
  const free = borderCells(set).filter(([x, y]) => !taken.has(K(x, y)));
  frames.forEach((b, i) => {
    if (i < free.length) {
      b.x = free[i][0];
      b.y = free[i][1];
      const ti = tray.indexOf(b);
      if (ti >= 0) {
        tray.splice(ti, 1);
        P.blocks.push(b);
      }
    } else {
      const pi = P.blocks.indexOf(b);
      if (pi >= 0) P.blocks.splice(pi, 1);
      const ti = tray.indexOf(b);
      if (ti >= 0) tray.splice(ti, 1);
      u.arr.dropped.push(b);
    }
  });
  if (!tray.some((b) => b.t === fromTray)) fromTray = tray.length ? tray[0].t : null;
  undo.push(u);
  return u;
}
const FACING = /* @__PURE__ */ new Set(["emit", "mini", "miss", "art", "hmini"]);
function autoFace(b) {
  if (!FACING.has(b.t) || S.line !== "wheel") return;
  const core = P.blocks.find((q2) => q2.t === "core");
  if (!core) return;
  const cs = footOf(b), mx = cs.reduce((a, c) => a + c[0], 0) / cs.length, my = cs.reduce((a, c) => a + c[1], 0) / cs.length;
  const q = (Math.round(Math.atan2(Math.abs(my - core.y), mx - core.x) / (Math.PI / 2)) % 4 + 4) % 4;
  b.fc = my - core.y < 0 ? [0, 3, 2, 1][q] : q;
}
const FACE_NAME = ["forward", "down", "back", "up"];
function turnFacing(b) {
  if (!b || !FACING.has(b.t) || b.ghost) return false;
  undo.push({ fc: [[b, b.fc | 0]] });
  b.fc = (b.fc | 0) + 1 & 3;
  sfx("place");
  recalc();
  buildInfo("The " + BT[b.t].name.toLowerCase() + " now faces " + FACE_NAME[b.fc] + (S.line === "wheel" ? ". Moving it to another place faces it outward again." : "."));
  return true;
}
const hullPrice = (t, vr) => HULLS.price[t] + (t >= 3 && t <= 6 ? (VARS[vr || S.var] || VARS.normal).price : 0);
function buyHull(vr) {
  if (S.hull < 0 || S.hull >= MAXHULL) return;
  const n = S.hull + 1, nv = n >= 3 && n <= 6 ? VARS[vr] ? vr : S.var || "normal" : n > 6 ? S.var : "normal", price = hullPrice(n, nv);
  if (!hullOpen(n)) {
    deny("The " + HULLS.names[n] + " unlocks at wave " + HULLS.minWave[n] + ".");
    return;
  }
  if (S.scrap < price) {
    deny("The " + HULLS.names[n] + " costs " + price + " scrap.");
    return;
  }
  S.scrap -= price;
  const kept = n > 3 && nv === S.var;
  setHull(n, S.line, nv);
  S.vk = n < 3 ? 0 : kept ? (S.vk || 0) + 1 : 0;
  S.st.hullPaid = (S.st.hullPaid || 0) + price;
  if (!refit()) dropFrames();
  ev("hull", "bought " + HULLS.names[S.hull] + (S.hull >= 3 ? " (" + VARS[S.var].name + ")" : "") + " (" + S.line + ") for " + price + " scrap");
  sfx("fanfare");
  recalc();
  takeSnap();
  buildInfo("Your hull is now a " + hullName() + ". Your blocks stayed where they were" + (tray.length ? "; place or scrap what is in the tray" : "") + ". Arrange fits the new cells.");
}
function refit() {
  const out = P.blocks.some((b) => !b.frame && b.t !== "core" && footOf(b).some((c) => !P.hullSet.has(c[0] + "," + c[1])));
  if (!out) return false;
  arrange(true);
  dropFrames();
  return true;
}
