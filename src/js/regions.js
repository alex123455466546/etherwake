let sites = [], heavy = [], siteGrid = /* @__PURE__ */ new Map(), nzSeed = [0, 0, 0, 0, 0, 0], nearRocks = [], currents = [], curSegs = /* @__PURE__ */ new Map();
const BLEND = 1500;
const RGRID = 5e4, RJIT = 1e4;
const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = RND() * (i + 1) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
function mkSite(k, bx, by, gx, gy) {
  return { k, bx, by, gx, gy, r: rnd(3e3, 6e3), w: TAU / rnd(900, 1800) * (RND() < 0.5 ? -1 : 1), ph: rnd(0, TAU), x: 0, y: 0 };
}
function hash2(ix, iy, s) {
  let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(s, 1274126177) | 0;
  h = Math.imul(h ^ h >>> 13, 1274126177);
  return ((h ^ h >>> 16) >>> 0) / 4294967296;
}
function vnoise(x, y, s) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), a = hash2(ix, iy, s), b = hash2(ix + 1, iy, s), c = hash2(ix, iy + 1, s), d = hash2(ix + 1, iy + 1, s), t = a + (b - a) * u;
  return t + (c + (d - c) * u - t) * v;
}
function seedRegions() {
  sites = [];
  siteGrid = /* @__PURE__ */ new Map();
  const kinds = {
    near: ["drift", "drift", "drift", "drift", "bloom", "bloom", "shallows", "shallows", "belt", "drift", "boneyard"],
    mid: ["bloom", "bloom", "shallows", "shallows", "belt", "belt", "belt", "drift", "drift", "boneyard", "boneyard", "reach", "reach", "drift", "drift"],
    /* no random Hollows in the middle ring: the Hollows are big and scary, so only the far ring's few and the four promised ones exist (B-e, 19 Oct: they had grown to 42 to 65% of the map) */
    far: ["reach", "reach", "reach", "hollows", "boneyard", "boneyard", "drift", "drift", "belt", "bloom", "shallows", "drift", "belt"]
  };
  const gl = [[0, 0]];
  for (let gx = -5; gx <= 5; gx++) for (let gy = -5; gy <= 5; gy++) if (gx || gy) gl.push([gx, gy]);
  for (const [gx, gy] of gl) {
    const bx = gx * RGRID, by = gy * RGRID, f = Math.hypot(bx, by) / WORLD;
    if (Math.hypot(bx, by) > WORLD + RGRID * 0.4) continue;
    const home = gx === 0 && gy === 0, k = home ? "drift" : (() => {
      const a = f < 0.3 ? kinds.near : f < 0.65 ? kinds.mid : kinds.far;
      return a[RND() * a.length | 0];
    })();
    const s = mkSite(k, bx + (home ? 0 : rnd(-RJIT, RJIT)), by + (home ? 0 : rnd(-RJIT, RJIT)), gx, gy);
    if (home) {
      s.r = 0;
      s.w = 0;
    }
    siteGrid.set((gx + 8) * 64 + (gy + 8), sites.length);
    sites.push(s);
  }
  const near = sites.map((s, i) => i).filter((i) => sites[i].bx || sites[i].by).sort((a, b) => Math.hypot(sites[a].bx, sites[a].by) - Math.hypot(sites[b].bx, sites[b].by)).slice(0, 4);
  shuffle(near);
  sites[near[0]].k = "bloom";
  sites[near[1]].k = "shallows";
  const far = sites.map((s, i) => i).filter((i) => {
    const d = Math.hypot(sites[i].bx, sites[i].by);
    return d > WORLD * 0.55 && d < WORLD - 12e3;
  });
  shuffle(far);
  ["reach", "reach", "reach", "reach", "reach", "hollows", "hollows", "hollows", "hollows", "boneyard", "boneyard"].forEach((k, n) => {
    if (far[n] != null) sites[far[n]].k = k;
  });
  for (let i = 0; i < nzSeed.length; i++) nzSeed[i] = RND() * 1e9 | 0;
  placeSites();
  growCurrents();
  for (const s of sites) s.hw = s.k === "hollows" ? TUNE.holGrow : 1;
  heavy = [];
  sites.forEach((s, i) => {
    if (s.hw > 1) heavy.push(i);
  });
  for (const s of sites) {
    let m = 1e12;
    for (const o of sites) if (o !== s) m = Math.min(m, Math.hypot(o.bx - s.bx, o.by - s.by) * s.hw / (s.hw + o.hw));
    s.rad = m;
  }
}
function placeSites() {
  for (const s of sites) {
    const x = s.bx + Math.cos(s.ph + s.w * S.wt) * s.r, y = s.by + Math.sin(s.ph + s.w * S.wt) * s.r;
    s.dx = x - s.x;
    s.dy = y - s.y;
    s.x = x;
    s.y = y;
  }
}
function driftSites() {
  placeSites();
  driftCorr();
  for (const r of rocks) if (r.si != null) {
    const s = sites[r.si];
    r.x += s.dx;
    r.y += s.dy;
    r.ax += s.dx;
    r.ay += s.dy;
  }
  for (const w of wrecks) if (w.si != null) {
    const s = sites[w.si];
    w.x += s.dx;
    w.y += s.dy;
  }
  zones.forEach((z, i) => {
    if (z.si == null) return;
    const s = sites[z.si];
    if (!s.dx && !s.dy) return;
    z.x += s.dx;
    z.y += s.dy;
    for (const p of z.pts) {
      p[0] += s.dx;
      p[1] += s.dy;
    }
    for (const e of enemies) if (e.zone === i && !e.awake) {
      e.x += s.dx;
      e.y += s.dy;
      e.hx += s.dx;
      e.hy += s.dy;
    }
  });
}
function regionAt(x, y, brute) {
  const k = nzSeed;
  const wx = x + 12e3 * (2 * vnoise(x / 4e4, y / 4e4, k[0]) - 1) + 4e3 * (2 * vnoise(x / 12e3, y / 12e3, k[1]) - 1) + 1e3 * (2 * vnoise(x / 3e3, y / 3e3, k[2]) - 1), wy = y + 12e3 * (2 * vnoise(x / 4e4, y / 4e4, k[3]) - 1) + 4e3 * (2 * vnoise(x / 12e3, y / 12e3, k[4]) - 1) + 1e3 * (2 * vnoise(x / 3e3, y / 3e3, k[5]) - 1);
  const gx = Math.round(wx / RGRID), gy = Math.round(wy / RGRID);
  let i = 0, j = 0, d1 = 1e20, d2 = 1e20, seen = 0;
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
    const n = siteGrid.get((gx + a + 8) * 64 + (gy + b + 8));
    if (n == null) continue;
    seen++;
    const s = sites[n];
    if (s.hw > 1) continue;
    const d = (wx - s.x) * (wx - s.x) + (wy - s.y) * (wy - s.y);
    if (d < d1) {
      d2 = d1;
      j = i;
      d1 = d;
      i = n;
    } else if (d < d2) {
      d2 = d;
      j = n;
    }
  }
  for (const n of heavy) {
    const s = sites[n], q = s.hw, d = ((wx - s.x) * (wx - s.x) + (wy - s.y) * (wy - s.y)) / (q * q);
    if (d < d1) {
      d2 = d1;
      j = i;
      d1 = d;
      i = n;
    } else if (d < d2) {
      d2 = d;
      j = n;
    }
  }
  if (seen < 2 || brute) {
    d1 = d2 = 1e20;
    for (let n = 0; n < sites.length; n++) {
      const s = sites[n], q = s.hw || 1, d = ((wx - s.x) * (wx - s.x) + (wy - s.y) * (wy - s.y)) / (q * q);
      if (d < d1) {
        d2 = d1;
        j = i;
        d1 = d;
        i = n;
      } else if (d < d2) {
        d2 = d;
        j = n;
      }
    }
  }
  const e = (Math.sqrt(d2) - Math.sqrt(d1)) / (1 / (sites[i].hw || 1) + 1 / (sites[j].hw || 1));
  return { i, j, b: clamp(2 * e / BLEND, 0, 1), e };
}
const kindAt = (x, y) => Math.hypot(x, y) > WORLD ? "edge" : sites.length ? sites[regionAt(x, y).i].k : "drift";
function spotIn(k, min) {
  const of = [];
  sites.forEach((s, i) => {
    if (s.k === k) of.push(i);
  });
  if (of.length) for (let n = 0; n < 300; n++) {
    const i = of[RND() * of.length | 0], s = sites[i], x = s.x + rnd(-RGRID * 0.5, RGRID * 0.5), y = s.y + rnd(-RGRID * 0.5, RGRID * 0.5);
    if (Math.hypot(x, y) < WORLD - 2e3 && Math.hypot(x - P.x, y - P.y) > min) {
      const r = regionAt(x, y);
      if (sites[r.i].k === k) return [x, y, r.i];
    }
  }
  return farSpot(min);
}
const bind = (o, p) => {
  if (p[2] != null) o.si = p[2];
  return o;
};
function refreshNear() {
  const x = cam.x, y = cam.y;
  nearRocks = rocks.filter((r) => Math.abs(r.x - x) < 4200 && Math.abs(r.y - y) < 4200);
}
function regionMix(x, y) {
  const r = regionAt(x, y), a = 0.5 + 0.5 * r.b;
  return { k: sites[r.i].k, k2: sites[r.j].k, a };
}
const CURW = 1500;
const RIV_N = 40, RIV_STEP = 800, RIV_TAIL = 3, RIV_HOME = 12e3, RIV_GAP = 4600, RIV_MIN = 6e4, RIV_MAX = 15e4;
const catmull = (p0, p1, p2, p3, t) => {
  const t2 = t * t, t3 = t2 * t;
  return [0, 1].map((k) => 0.5 * (2 * p1[k] + (p2[k] - p0[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * t3));
};
function riverBends(pts) {
  let n = 0, last = 0, h0 = null;
  for (let i = 0; i + 4 < pts.length; i += 4) {
    const h = Math.atan2(pts[i + 4][1] - pts[i][1], pts[i + 4][0] - pts[i][0]);
    if (h0 != null) {
      let d = h - h0;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      if (Math.abs(d) > 0.04) {
        const sg = d > 0 ? 1 : -1;
        if (last && sg !== last) n++;
        last = sg;
      }
    }
    h0 = h;
  }
  return n;
}
function tryRiver(g, first, grid, id) {
  const lerp = (a, b) => a + g() * (b - a), want = lerp(RIV_MIN, RIV_MAX - 12e3);
  let sx, sy;
  if (first) {
    const a = g() * TAU, d = lerp(22e3, 1e5);
    sx = Math.cos(a) * d;
    sy = Math.sin(a) * d;
  } else {
    const a = g() * TAU, d = Math.sqrt(g()) * (WORLD - 25e3);
    sx = Math.cos(a) * d;
    sy = Math.sin(a) * d;
  }
  if (regionAt(sx, sy, true).i === 0) return null;
  let hd = g() * TAU, bx = sx, by = sy, side = g() < 0.5 ? 1 : -1, chord = 0;
  const wp = [[sx, sy]];
  while (chord < want && wp.length < 40) {
    const d = lerp(8e3, 15e3), sw = lerp(4e3, 1e4) * side;
    side = -side;
    hd += lerp(-0.3, 0.3);
    if (Math.hypot(bx, by) > WORLD - 3e4) hd = Math.atan2(-by, -bx) + lerp(-0.7, 0.7);
    bx += Math.cos(hd) * d;
    by += Math.sin(hd) * d;
    const w = [bx - Math.sin(hd) * sw, by + Math.cos(hd) * sw], q = wp[wp.length - 1];
    chord += Math.hypot(w[0] - q[0], w[1] - q[1]) * 0.93;
    wp.push(w);
  }
  if (wp.length < 5) return null;
  const dense = [];
  for (let i = 0; i < wp.length - 1; i++) {
    const p0 = wp[Math.max(0, i - 1)], p1 = wp[i], p2 = wp[i + 1], p3 = wp[Math.min(wp.length - 1, i + 2)];
    for (let s = 0; s < 30; s++) dense.push(catmull(p0, p1, p2, p3, s / 30));
  }
  dense.push(wp[wp.length - 1].slice());
  const pts = [dense[0]];
  let acc = 0, need = RIV_STEP;
  for (let i = 1; i < dense.length; i++) {
    let a = dense[i - 1];
    const b = dense[i];
    let seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    while (seg > 0 && acc + seg >= need) {
      const f2 = (need - acc) / seg;
      a = [a[0] + (b[0] - a[0]) * f2, a[1] + (b[1] - a[1]) * f2];
      pts.push(a);
      seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
      acc = 0;
      need = RIV_STEP;
    }
    acc += seg;
  }
  const len = (pts.length - 1) * RIV_STEP;
  if (len < RIV_MIN || len > RIV_MAX) return null;
  for (const p of pts) {
    const o = Math.hypot(p[0], p[1]);
    if (o < RIV_HOME || o > WORLD - 4e3) return null;
  }
  if (riverBends(pts) < 5) return null;
  for (const p of pts) {
    const cx = Math.floor(p[0] / RIV_GAP), cy = Math.floor(p[1] / RIV_GAP);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const l = grid.get(cx + i + "," + (cy + j));
      if (l) {
        for (const q of l) if (Math.hypot(q[0] - p[0], q[1] - p[1]) < RIV_GAP) return null;
      }
    }
  }
  for (let i = 0; i < pts.length; i++) for (let j = i + 15; j < pts.length; j++) if (Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]) < 3400) return null;
  for (const p of pts) {
    const k = Math.floor(p[0] / RIV_GAP) + "," + Math.floor(p[1] / RIV_GAP);
    let l = grid.get(k);
    if (!l) grid.set(k, l = []);
    l.push(p);
  }
  const n = pts.length, e = pts[n - 1], f = [e[0] - pts[n - 2][0], e[1] - pts[n - 2][1]], fl = Math.hypot(f[0], f[1]) || 1;
  for (let i = 1; i <= RIV_TAIL; i++) pts.push([e[0] + f[0] / fl * RIV_STEP * i, e[1] + f[1] / fl * RIV_STEP * i]);
  return { pts, id, mouthI: n - 1, len, bends: riverBends(pts), a: regionAt(sx, sy, true).i, b: regionAt(e[0], e[1], true).i };
}
function burnOldCurrents() {
  for (let a = 0; a < sites.length; a++) for (let b = a + 1; b < sites.length; b++) {
    const A = sites[a], B = sites[b];
    if (Math.abs(A.gx - B.gx) > 1 || Math.abs(A.gy - B.gy) > 1) continue;
    if (RND() < 0.3) continue;
    for (let i = 0; i < 6; i++) RND();
  }
}
function growCurrents() {
  burnOldCurrents();
  currents = [];
  curSegs = /* @__PURE__ */ new Map();
  S.cur = null;
  S.rideT = 0;
  S.mouth = null;
  const g = seeded(S.seed ^ 6221137 | 0), grid = /* @__PURE__ */ new Map();
  for (let tries = 0; currents.length < RIV_N && tries < 1500; tries++) {
    const c = tryRiver(g, currents.length < 14, grid, currents.length);
    if (c) currents.push(c);
  }
  for (const c of currents) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (let i = 0; i < c.pts.length; i++) {
      const p = c.pts[i];
      x0 = Math.min(x0, p[0]);
      y0 = Math.min(y0, p[1]);
      x1 = Math.max(x1, p[0]);
      y1 = Math.max(y1, p[1]);
    }
    c.bb = [x0 - 4e3, y0 - 4e3, x1 + 4e3, y1 + 4e3];
    for (let i = 0; i < c.pts.length - 1; i++) {
      const q = c.pts[i], r = c.pts[i + 1], mx = (q[0] + r[0]) / 2, my = (q[1] + r[1]) / 2, l = Math.hypot(r[0] - q[0], r[1] - q[1]) || 1, key = Math.floor(mx / 1e4) + "," + Math.floor(my / 1e4);
      let list = curSegs.get(key);
      if (!list) {
        list = [];
        curSegs.set(key, list);
      }
      list.push([q[0], q[1], r[0], r[1], (r[0] - q[0]) / l, (r[1] - q[1]) / l, c, i]);
    }
  }
}
function currentAt(x, y) {
  const cx = Math.floor(x / 1e4), cy = Math.floor(y / 1e4);
  let best = 0, fx = 0, fy = 0, rc = null, ri = 0, ox = 0, oy = 0;
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    const l = curSegs.get(cx + i + "," + (cy + j));
    if (!l) continue;
    for (const s of l) {
      const sx = s[2] - s[0], sy = s[3] - s[1], L2 = sx * sx + sy * sy, t = clamp(((x - s[0]) * sx + (y - s[1]) * sy) / L2, 0, 1), qx = s[0] + sx * t - x, qy = s[1] + sy * t - y, d = Math.sqrt(qx * qx + qy * qy);
      if (d < CURW) {
        const st = 1 - d / CURW;
        if (st > best) {
          best = st;
          fx = s[4];
          fy = s[5];
          rc = s[6];
          ri = s[7] || 0;
          ox = d > 1 ? -qx / d : 0;
          oy = d > 1 ? -qy / d : 0;
        }
      }
    }
  }
  return { s: best, fx, fy, c: rc, i: ri, ox, oy };
}
function riverFx(dt) {
  const cu = S.cur;
  if (!cu) return;
  if (cu.s > 0.05) {
    S.rideT = (S.rideT || 0) + dt;
    if (cu.c && cu.i >= cu.c.mouthI - 1 && S.rideT > 1.5 && P.vx * cu.fx + P.vy * cu.fy > 0) {
      S.mouth = [cu.fx, cu.fy];
    } else if (!(cu.c && cu.i >= cu.c.mouthI - 1)) S.mouth = null;
  } else {
    S.mouth = null;
    S.rideT = 0;
  }
}
const riverFeed = () => !!(S.started && S.cur && S.cur.s > 0.25);
