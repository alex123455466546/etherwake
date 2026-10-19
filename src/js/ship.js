function starter() {
  P.blocks = [mk(0, 0, "core"), mk(1, 0, "hull"), mk(2, 0, "emit"), mk(-1, 0, "eng"), mk(0, 1, "hull"), mk(0, -1, "hull"), mk(-1, 1, "coll"), mk(-1, -1, "tank")];
}
function cellMap(blocks) {
  const m = /* @__PURE__ */ new Map();
  for (const b of blocks) for (const c of footOf(b)) m.set(c[0] + "," + c[1], b);
  return m;
}
function allBlocks() {
  return P.blocks;
}
function pipesOf(blocks) {
  const m = /* @__PURE__ */ new Map();
  for (const b of blocks) m.set(b.x + "," + b.y, b);
  const core = blocks.find((b) => b.t === "core") || blocks[0], dist = /* @__PURE__ */ new Map();
  if (!core) return [];
  dist.set(core, 0);
  const q = [core];
  for (let i = 0; i < q.length; i++) {
    const b = q[i];
    for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = m.get(b.x + d[0] + "," + (b.y + d[1]));
      if (n && !dist.has(n)) {
        dist.set(n, dist.get(b) + 1);
        q.push(n);
      }
    }
  }
  const out = [];
  for (const b of blocks) for (const d of [[1, 0], [0, 1]]) {
    const n = m.get(b.x + d[0] + "," + (b.y + d[1]));
    if (!n || n === b) continue;
    const da = dist.has(b) ? dist.get(b) : 99, dn = dist.has(n) ? dist.get(n) : 99, a = da <= dn ? b : n, z = da <= dn ? n : b;
    out.push({ a, z, ph: Math.random(), t: z.t });
  }
  return out;
}
function traceOutline(cell, off) {
  const ks = [...cell.keys()];
  if (!ks.length) return { loops: [], len: 0 };
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const k of ks) {
    const i = k.indexOf(","), x = +k.slice(0, i), y = +k.slice(i + 1);
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  const res = 6, pad = off + CELL, L = x0 * CELL - CELL / 2 - pad, T = y0 * CELL - CELL / 2 - pad, nx = Math.ceil(((x1 - x0 + 1) * CELL + 2 * pad) / res) + 2, ny = Math.ceil(((y1 - y0 + 1) * CELL + 2 * pad) / res) + 2, h = CELL / 2, f = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const px = L + i * res, py = T + j * res, gx = Math.round(px / CELL), gy = Math.round(py / CELL);
    let d = 1e9;
    for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) {
      if (!cell.has(gx + a + "," + (gy + b))) continue;
      const dx = Math.max(Math.abs(px - (gx + a) * CELL) - h, 0), dy = Math.max(Math.abs(py - (gy + b) * CELL) - h, 0), q = dx * dx + dy * dy;
      if (q < d) d = q;
    }
    f[j * nx + i] = d >= 1e8 ? 99 : Math.sqrt(d);
  }
  const nb = /* @__PURE__ */ new Map(), pt = /* @__PURE__ */ new Map(), link = (a, b) => {
    (nb.get(a) || nb.set(a, []).get(a)).push(b);
    (nb.get(b) || nb.set(b, []).get(b)).push(a);
  };
  const H = (i, j) => (j * nx + i) * 2, V = (i, j) => (j * nx + i) * 2 + 1;
  const cross = (id, ax, ay, bx, by, fa, fb) => {
    if (!pt.has(id)) {
      const t = clamp((off - fa) / (fb - fa || 1e-6), 0, 1);
      pt.set(id, [ax + (bx - ax) * t, ay + (by - ay) * t]);
    }
    return id;
  };
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const fa = f[j * nx + i], fb = f[j * nx + i + 1], fc = f[(j + 1) * nx + i + 1], fd = f[(j + 1) * nx + i], ia = fa <= off, ib = fb <= off, ic = fc <= off, id = fd <= off, e = [];
    const X = (i0) => L + i0 * res, Y = (j0) => T + j0 * res;
    if (ia !== ib) e.push(["t", cross(H(i, j), X(i), Y(j), X(i + 1), Y(j), fa, fb)]);
    if (ib !== ic) e.push(["r", cross(V(i + 1, j), X(i + 1), Y(j), X(i + 1), Y(j + 1), fb, fc)]);
    if (id !== ic) e.push(["b", cross(H(i, j + 1), X(i), Y(j + 1), X(i + 1), Y(j + 1), fd, fc)]);
    if (ia !== id) e.push(["l", cross(V(i, j), X(i), Y(j), X(i), Y(j + 1), fa, fd)]);
    if (e.length === 2) link(e[0][1], e[1][1]);
    else if (e.length === 4) {
      const g = (k) => e.find((q) => q[0] === k)[1];
      link(g("t"), g("l"));
      link(g("b"), g("r"));
    }
  }
  const seen = /* @__PURE__ */ new Set(), loops = [];
  let best = 0;
  for (const start of nb.keys()) {
    if (seen.has(start)) continue;
    const pts = [];
    let cur = start, prev = -1;
    for (let n = 0; n < 2e4; n++) {
      seen.add(cur);
      const p = pt.get(cur);
      pts.push(p[0], p[1]);
      const nn = nb.get(cur);
      let nxt = nn[0] === prev && nn.length > 1 ? nn[1] : nn[0];
      if (nxt === prev && nn.length > 1) nxt = nn[1];
      if (nxt == null || seen.has(nxt)) break;
      prev = cur;
      cur = nxt;
    }
    let len = 0;
    for (let i = 0; i < pts.length; i += 2) {
      const j = (i + 2) % pts.length;
      len += Math.hypot(pts[j] - pts[i], pts[j + 1] - pts[i + 1]);
    }
    if (pts.length >= 6) loops.push({ pts: Float32Array.from(pts), len });
    if (len > best) best = len;
  }
  loops.sort((a, b) => b.len - a.len);
  return { loops, len: best };
}
function shapes() {
  if (!P.shapeS || !P.shapeH) {
    P.shapeS = traceOutline(P.cell, 10);
    P.shapeH = traceOutline(P.cell, 24);
  }
  return P;
}
function outlinePoint(sh, out) {
  const lp = sh.loops[0];
  if (!lp) return [P.x, P.y];
  const n = lp.pts.length / 2, i = Math.random() * n | 0, c = Math.cos(P.a), s = Math.sin(P.a), lx = lp.pts[i * 2], ly = lp.pts[i * 2 + 1], l = Math.hypot(lx, ly) || 1, ox = lx + lx / l * out, oy = ly + ly / l * out;
  return [P.x + ox * c - oy * s, P.y + ox * s + oy * c];
}
function nearHull(x, y, m) {
  const c = Math.cos(-P.a), s = Math.sin(-P.a), lx = (x - P.x) * c - (y - P.y) * s, ly = (x - P.x) * s + (y - P.y) * c, gx = Math.round(lx / CELL), gy = Math.round(ly / CELL), h = CELL / 2;
  for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
    if (!P.cell.has(gx + i + "," + (gy + j))) continue;
    const dx = Math.max(Math.abs(lx - (gx + i) * CELL) - h, 0), dy = Math.max(Math.abs(ly - (gy + j) * CELL) - h, 0);
    if (dx * dx + dy * dy <= m * m) return true;
  }
  return false;
}
const ARM_ETHER = { hull: 1, hard: 1, blast: 1, mirror: 1, slab: 4 };
function recalc() {
  let cap = 70, rc = 70, r = 0, nc = 0, nh = 0, carry = 0;
  P.emit = [];
  P.minis = [];
  P.racks = [];
  P.rails = [];
  P.arts = [];
  P.pds = [];
  P.shcore = 0;
  P.coll = 0;
  P.hull = 0;
  P.eng = 0;
  P.mirror = 0;
  P.thr = 0;
  P.aft = 0;
  P.gyro = 0;
  P.sgen = 0;
  P.sensor = 0;
  assignSections();
  for (const b of allBlocks()) {
    const T = BT[b.t];
    if (b.dark) continue;
    const m = mkM(b) * secM(b);
    if (T.k === "tank") {
      cap += T.cap * m;
      if (!b.ghost) rc += T.cap * m;
    } else if (b.t === "coll" || b.t === "carray") {
      const v = (T.cv || 1) * m;
      P.coll += v;
      nc += v;
    } else if (b.t === "hcoll") {
      P.coll += 0.25 * m;
      nh += m;
    } else if (b.t === "hull" || b.t === "hard" || b.t === "blast" || b.t === "slab") P.hull += (T.hv || 1) * m;
    else if (b.t === "ehull") P.hull += 0.6 * m;
    else if (b.t === "mirror") {
      P.hull += 0.3 * m;
      P.mirror++;
    }
    const ae = ARM_ETHER[b.t];
    if (ae) {
      cap += ae * TUNE.armEth * m;
      if (!b.ghost) rc += ae * TUNE.armEth * m;
    }
  }
  for (const b of P.blocks) {
    const t = b.t;
    if (b.dark) continue;
    const m = mkM(b) * secM(b);
    if (t === "emit" || t === "core") P.emit.push(b);
    else if (t === "mini" || t === "hmini") P.minis.push(b);
    else if (t === "art") P.arts.push(b);
    else if (t === "shcore") P.shcore += m;
    else if (t === "miss" || t === "battery") P.racks.push(b);
    else if (t === "rail") P.rails.push(b);
    else if (t === "pd") P.pds.push(b);
    else if (t === "eng") {
      P.thr += m;
      carry += 6;
    } else if (t === "eng2") {
      P.thr += 5.5 * m;
      carry += 26;
    } else if (t === "sgen") {
      P.sgen += m;
    } else if (t === "sensor") {
      P.sensor += m;
    } else if (t === "aft") {
      P.aft += m;
      carry += 3;
    } else if (t === "gyro") {
      P.gyro += m;
      carry += 2;
    }
    if (BT[t].k === "eng") P.eng++;
    for (const c of footOf(b)) r = Math.max(r, Math.hypot(c[0], c[1]));
  }
  let wt = 0, mx = 0, my = 0;
  for (const b of P.blocks) {
    const w = BT[b.t].w * (b.ghost ? 0.5 : 1);
    wt += w;
    mx += w * b.x;
    my += w * b.y;
  }
  mx /= wt || 1;
  my /= wt || 1;
  let sw = 0;
  for (const b of P.blocks) sw += BT[b.t].w * (b.ghost ? 0.5 : 1) * ((b.x - mx) ** 2 + (b.y - my) ** 2 + 0.5);
  P.wt = wt;
  P.spin = sw;
  P.coll *= PK("coll") * (pactOn("thin") ? 0.7 : 1);
  P.cap = Math.max(10, cap * PK("ether") - (S.lock || 0));
  P.realCap = Math.max(10, rc * PK("ether") - (S.lock || 0));
  P.mass = P.blocks.length;
  P.carry = carry;
  P.radius = (r + 0.9) * CELL;
  S.haloMax = pactOn("glass") ? 1 : Math.round((40 + 30 * nc + 90 * nh) * PK("ether") * PK("halo"));
  P.leakK = 1 / (1 + 0.3 * nh);
  if (!build) {
    if (S.ether > P.cap) {
      S.halo += S.ether - P.cap;
      S.ether = P.cap;
    }
    S.halo = Math.min(S.halo, S.haloMax);
  }
  P.engList = P.blocks.filter((b) => b.t === "eng" || b.t === "aft" || b.t === "eng2");
  P.cell = cellMap(P.blocks);
  P.shapeS = P.shapeH = null;
  P.pipes = pipesOf(P.blocks);
}
function wpos(o, b) {
  const c = Math.cos(o.a), s = Math.sin(o.a), lx = (b.x + (fw(b) - 1) / 2) * CELL, ly = (b.y + (fh(b) - 1) / 2) * CELL;
  return [o.x + lx * c - ly * s, o.y + lx * s + ly * c];
}
