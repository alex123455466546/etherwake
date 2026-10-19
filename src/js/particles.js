function spawn(x, y, vx, vy, life, size, col) {
  const i = pi;
  pi = (pi + 1) % NP;
  px[i] = x;
  py[i] = y;
  pvx[i] = vx;
  pvy[i] = vy;
  pl[i] = life;
  pm[i] = life;
  ps[i] = size;
  pc[i] = col;
}
function burst(x, y, n, sp, col, life, size) {
  n = Math.ceil(n * 0.6);
  for (let i = 0; i < n; i++) {
    const a = rnd(0, TAU), v = rnd(0.15, 1) * sp;
    spawn(x, y, Math.cos(a) * v, Math.sin(a) * v, rnd(0.4, 1) * life, rnd(0.6, 1) * size, col);
  }
}
function ring(x, y, n, sp, col) {
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU;
    spawn(x, y, Math.cos(a) * sp, Math.sin(a) * sp, rnd(0.6, 1.1), 3, col);
  }
}
function ambient(n, size) {
  for (n = cnt(n); n > 0; n--) spawn(cam.x + rnd(-0.6, 0.6) * W / zoom, cam.y + rnd(-0.6, 0.6) * H / zoom, rnd(-14, 14), rnd(-14, 14), rnd(3, 7), rnd(size, size * 2), Math.random() < 0.6 ? 0 : 1);
}
function updParticles(dt) {
  const vol = S.mood === 1, res = S.mood === 2, sp = Math.hypot(P.vx, P.vy), nx = sp > 1 ? P.vx / sp : 0, ny = sp > 1 ? P.vy / sp : 0, R2 = 170 * 170;
  for (let i = 0; i < NP; i++) {
    if (pl[i] <= 0) continue;
    pl[i] -= dt;
    if (pc[i] >= 8) {
      const dx = px[i] - P.x, dy = py[i] - P.y, d = Math.hypot(dx, dy) || 1, hq = S.halo / S.haloMax, k = (P.radius + 24 - d) * (1 + 11 * hq * hq);
      pvx[i] = P.vx - dy / d * 150 + dx / d * k;
      pvy[i] = P.vy + dx / d * 150 + dy / d * k;
    } else if (pc[i] < 2) {
      const dx = px[i] - P.x, dy = py[i] - P.y, d2 = dx * dx + dy * dy;
      if (d2 < R2 && sp > 40) {
        const k = (1 - d2 / R2) * dt, side = nx * dy - ny * dx > 0 ? 1 : -1;
        pvx[i] += -ny * side * sp * 1.6 * k;
        pvy[i] += nx * side * sp * 1.6 * k;
      }
      if (vol) {
        pvx[i] += rnd(-420, 420) * dt;
        pvy[i] += rnd(-420, 420) * dt;
      } else if (res && d2 < 36e4 && d2 > 100) {
        const inv = 1 / Math.sqrt(d2);
        pvx[i] += -dy * inv * 70 * dt;
        pvy[i] += dx * inv * 70 * dt;
      } else if (S.mood === 3 && d2 < 25e4 && d2 > 100) {
        const inv = 1 / Math.sqrt(d2);
        pvx[i] += dx * inv * 260 * dt;
        pvy[i] += dy * inv * 260 * dt;
      } else {
        pvx[i] *= 1 - 0.4 * dt;
        pvy[i] *= 1 - 0.4 * dt;
      }
    }
    px[i] += pvx[i] * dt;
    py[i] += pvy[i] * dt;
  }
}
function drawParticles() {
  const ox = W / 2 - cam.x * zoom, oy = H / 2 - cam.y * zoom, ex = P.x * zoom + ox, ey = P.y * zoom + oy, er = P.form || S.over || !S.started ? 0 : (P.radius + 18) * zoom, er2 = er * er;
  bucketN.fill(0);
  for (let i = 0; i < NP; i++) {
    if (pl[i] <= 0) continue;
    const sx = px[i] * zoom + ox, sy = py[i] * zoom + oy;
    if (sx < -8 || sy < -8 || sx > W + 8 || sy > H + 8) continue;
    if (er2) {
      const qx = sx - ex, qy = sy - ey;
      if (qx * qx + qy * qy < er2) continue;
    }
    const c = pc[i];
    bucket[c][bucketN[c]++] = i;
  }
  ctx.globalCompositeOperation = "lighter";
  const look = SET.look !== "classic", fast = calmMotion ? 1e12 : 16e4;
  for (let c = 0; c < PAL.length; c++) {
    const list = bucket[c], n = bucketN[c];
    if (!n) continue;
    ctx.fillStyle = PAL[c];
    const round = look && GLOWC.includes(c), k = round ? DPR : 1;
    if (round) ctx.setTransform(1, 0, 0, 1, 0, 0);
    let streak = false, al = 1;
    const dots = [null, null, null, null];
    ctx.globalAlpha = 1;
    ctx.beginPath();
    for (let j = 0; j < n; j++) {
      const i = list[j], f = pl[i] / pm[i], z = Math.max(0.7, ps[i] * zoom * (f < 0.5 ? f * 2 : 1)), x = (px[i] * zoom + ox) * k, y = (py[i] * zoom + oy) * k, vx = pvx[i], vy = pvy[i];
      if (look && c < 8 && vx * vx + vy * vy > fast) {
        ctx.moveTo(x - vx * 0.022 * zoom * k, y - vy * 0.022 * zoom * k);
        ctx.lineTo(x, y);
        streak = true;
        continue;
      }
      const a = f < 0.3 ? f / 0.3 : 1;
      if (round) {
        const d = Math.min(GLOWMAX, Math.max(2, Math.round(2 * z * k)));
        if (d < 4) {
          const q = Math.min(3, a * 4 | 0);
          (dots[q] || (dots[q] = new Path2D())).rect(x - z * k / 2, y - z * k / 2, z * k, z * k);
          continue;
        }
        if (a !== al) ctx.globalAlpha = al = a;
        ctx.drawImage(glowSprite(c, d), Math.round(x - d / 2), Math.round(y - d / 2));
      } else {
        if (a !== al) ctx.globalAlpha = al = a;
        ctx.fillRect(x - z / 2, y - z / 2, z, z);
      }
    }
    for (let q = 0; q < 4; q++) if (dots[q]) {
      ctx.globalAlpha = al = (q + 1) / 4;
      ctx.fill(dots[q]);
    }
    if (streak) {
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = PAL[c];
      ctx.lineWidth = Math.max(1, 1.2 * zoom) * k;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.lineCap = "butt";
    }
    if (round) ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}
const GLOWC = [0, 1, 6, 8, 9], GLOWMAX = 48, glows = [];
function glowSprite(c, d) {
  const key = c * 64 + d;
  if (glows[key]) return glows[key];
  const cv2 = document.createElement("canvas");
  cv2.width = cv2.height = d;
  const g = cv2.getContext("2d"), h = PAL[c], r = parseInt(h.slice(1, 3), 16), gg = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16), gr = g.createRadialGradient(d / 2, d / 2, 0, d / 2, d / 2, d / 2);
  gr.addColorStop(0, "rgba(" + r + "," + gg + "," + b + ",1)");
  gr.addColorStop(0.3, "rgba(" + r + "," + gg + "," + b + ",.8)");
  gr.addColorStop(1, "rgba(" + r + "," + gg + "," + b + ",0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, d, d);
  return glows[key] = cv2;
}
function drawRibbon() {
  if (SET.look === "classic" || rib.length < 3 || P.form || !S.started || S.over) return;
  const M = S.mood, col = M === 3 ? C.dim : PAL[0];
  ctx.lineCap = "round";
  for (let i = 1; i < rib.length; i++) {
    const a = rib[i - 1], b = rib[i], f = 1 - (S.t - b.t) / 1.5;
    if (f <= 0) continue;
    let ox = 0, oy = 0;
    if (M === 2 && !calmMotion) {
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, w = Math.sin(S.t * 5 + i * 0.45) * 14 * (1 - f);
      ox = -dy / d * w;
      oy = dx / d * w;
    }
    ctx.strokeStyle = b.b ? "#ffffff" : col;
    ctx.globalAlpha = f * (b.b ? 0.7 : 0.45);
    ctx.lineWidth = (b.b ? 5 : 2.4) * f + 0.6;
    ctx.beginPath();
    ctx.moveTo(a.x + ox, a.y + oy);
    ctx.lineTo(b.x + ox, b.y + oy);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.lineCap = "butt";
}
