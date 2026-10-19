const CLEAN = /* @__PURE__ */ new Set(["Core trickle", "Halo from space", "Collectors", "Derelict field"]);
function addEther(v, src) {
  if (S.corr > 0 && !CLEAN.has(src)) {
    const lost = v * S.corr * (TUNE.corrEaseMin + (1 - TUNE.corrEaseMin) * clamp(pool() / TUNE.corrEaseAt, 0, 1));
    v -= lost;
    if (LOG) LOG.cor.lost += lost;
  }
  const p0 = pool();
  S.st.harv += v;
  const a = Math.min(v, P.cap - S.ether);
  S.ether += a;
  const h = Math.max(0, Math.min(S.haloMax - S.halo, v - a));
  S.halo += h;
  const over = v - a - h;
  if (over > 0 && S.started) {
    S.spill = (S.spill || 0) + over;
    const rate = (S.wave <= TUNE.spillEarlyWaves ? TUNE.spillEarly : TUNE.spill) / EK("refine");
    if (S.spill >= rate) {
      const n = Math.floor(S.spill / rate);
      S.spill -= n * rate;
      S.scrap += n * scrapK();
      S.st.spillScrap = (S.st.spillScrap || 0) + n;
      if (!S.spillTold) {
        S.spillTold = 1;
        toast("Tanks and halo full: surplus ether is refined to scrap", 3200);
      }
    }
  }
  logEther(src, pool() - p0, v);
}
function spend(v, src) {
  v *= PK("use");
  const p0 = pool(), h = Math.min(S.halo, v);
  S.halo -= h;
  S.ether = Math.max(0, S.ether - (v - h));
  logEther(src, pool() - p0, 0);
}
function blobR(b, t) {
  let m = 1;
  for (const q of b.h) m += q[1] * Math.sin(q[0] * t + q[2]);
  return b.R * m;
}
function mkBlob(x, y, R) {
  const h = [];
  let amp = 0;
  for (let k = 2; k <= 5; k++) {
    const a = rnd(0.04, 0.11);
    amp += a;
    h.push([k, a, rnd(0, TAU)]);
  }
  const b = { x, y, R, ext: R * (1 + amp), h, pts: [] };
  for (let i = 0; i < 72; i++) {
    const t = i / 72 * TAU, q = blobR(b, t);
    b.pts.push([x + Math.cos(t) * q, y + Math.sin(t) * q]);
  }
  return b;
}
function inBlob(b, x, y) {
  const dx = x - b.x, dy = y - b.y, d2 = dx * dx + dy * dy;
  if (d2 > b.ext * b.ext) return false;
  const q = blobR(b, Math.atan2(dy, dx));
  return d2 < q * q;
}
function blobPath(c, b, k, ox, oy) {
  c.beginPath();
  for (let i = 0; i < b.pts.length; i++) {
    const q = b.pts[i];
    c[i ? "lineTo" : "moveTo"]((q[0] - ox) * k, (q[1] - oy) * k);
  }
  c.closePath();
}
const FIELD = /* @__PURE__ */ new Map();
const cellKey = (cx, cy) => cx + "," + cy;
function fieldFill(cx, cy) {
  const c = FIELD.get(cellKey(cx, cy));
  if (!c) return 1;
  const f = Math.min(1, c[0] + (S.t - c[1]) / TUNE.fieldRegrow);
  if (f >= 1) FIELD.delete(cellKey(cx, cy));
  return f;
}
function cellCap(cx, cy) {
  const x = (cx + 0.5) * TUNE.fieldCell, y = (cy + 0.5) * TUNE.fieldCell;
  let d = 0.4;
  if (sites.length) {
    const r = regionAt(x, y), a = RT[sites[r.i].k].dens, b = RT[sites[r.j].k].dens;
    d = b + (a - b) * (0.5 + 0.5 * r.b);
  }
  const o = Math.hypot(x, y);
  if (o > WORLD - 1300) d *= clamp(1 - (o - (WORLD - 1300)) / 1300, 0.15, 1);
  return TUNE.fieldCap * clamp(d, 0.05, 1.6);
}
function patchCells(px, py) {
  if (px === void 0) {
    px = P.x;
    py = P.y;
  }
  const C = TUNE.fieldCell, cx = Math.floor(px / C), cy = Math.floor(py / C), out = [];
  for (let i = cx - 2; i <= cx + 2; i++) for (let j = cy - 2; j <= cy + 2; j++) if (Math.hypot((i + 0.5) * C - px, (j + 0.5) * C - py) <= TUNE.fieldPatch) out.push([i, j]);
  if (!out.length) out.push([cx, cy]);
  return out;
}
function patchFill() {
  if (riverFeed()) return 1;
  const c = patchCells();
  let s = 0;
  for (const q of c) s += fieldFill(q[0], q[1]);
  return s / c.length;
}
function drawField(amount, px, py) {
  const own = px === void 0;
  if (own && riverFeed() && amount > 0) {
    if (LOG) LOG.field.drawn += amount;
    return amount;
  }
  const c = patchCells(px, py), fill = [], cap = [];
  let total = 0;
  for (const q of c) {
    const f = fieldFill(q[0], q[1]), k = cellCap(q[0], q[1]);
    fill.push(f);
    cap.push(k);
    total += f * k;
  }
  if (total <= 1e-6 || amount <= 0) return 0;
  const take = Math.min(amount, total);
  c.forEach((q, n) => {
    const share = fill[n] * cap[n] / total * take;
    FIELD.set(cellKey(q[0], q[1]), [Math.max(0, fill[n] - share / cap[n]), S.t]);
  });
  if (LOG && own) LOG.field.drawn += take;
  return take;
}
const drawFieldAt = (x, y, amount) => drawField(amount, x, y);
function fieldSave() {
  const out = [];
  for (const [k, c] of FIELD) {
    const f = Math.min(1, c[0] + (S.t - c[1]) / TUNE.fieldRegrow);
    if (f < 0.98) {
      const i = k.indexOf(",");
      out.push([+k.slice(0, i), +k.slice(i + 1), +f.toFixed(2)]);
    }
  }
  return out.slice(0, 600);
}
function density(x, y) {
  let d = 0.4;
  if (sites.length) {
    const r = regionAt(x, y), a = RT[sites[r.i].k].dens, b = RT[sites[r.j].k].dens;
    d = b + (a - b) * (0.5 + 0.5 * r.b);
  }
  for (const k of nearRocks) {
    if (!k.rich) continue;
    const q = Math.hypot(x - k.x, y - k.y);
    if (q < 520) d += 0.3 * (1 - q / 520);
  }
  const o = Math.hypot(x, y);
  if (o > WORLD - 1300) d *= clamp(1 - (o - (WORLD - 1300)) / 1300, 0.15, 1);
  return clamp(d, 0.05, 1.6);
}
