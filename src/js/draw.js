function blocksClassic(c, o, blocks, tint) {
  for (const b of blocks) {
    const x = b.x * CELL - CELL / 2, y = b.y * CELL - CELL / 2, h = clamp(b.hp / (maxHp(b) * (b.ghost ? 0.5 : 1)), 0, 1), z = CELL - 1;
    c.globalAlpha = 0.45 + 0.55 * h;
    if (tint) {
      c.fillStyle = tint;
      c.fillRect(x, y, z, z);
      c.fillStyle = "rgba(0,0,0,.35)";
      c.fillRect(x + 3, y + 3, z - 6, z - 6);
      continue;
    }
    if (b.ghost || b.t === "ehull") {
      c.globalAlpha = (b.ghost ? 0.3 + 0.14 * Math.sin(S.t * 6 + b.x * 2 + b.y) : 0.38) * (0.5 + 0.5 * h);
      c.fillStyle = PAL[b.ghost ? 0 : 1];
      c.fillRect(x, y, z, z);
      c.globalAlpha = 0.9;
      c.strokeStyle = PAL[0];
      c.lineWidth = 1;
      c.strokeRect(x + 0.5, y + 0.5, z - 1, z - 1);
      if (b.t === "ehull") continue;
      if (b.fix > 0) {
        c.fillStyle = C.scrap;
        c.fillRect(x + 1, y + z - 3, (z - 2) * Math.min(1, b.fix), 2);
      }
    } else {
      c.fillStyle = b.frame ? "#1d2229" : b.t === "hull" ? "#2b323d" : b.t === "mirror" ? "#49525f" : "#161b22";
      c.fillRect(x, y, z, z);
      c.strokeStyle = b.g ? C.ether : "#5a6470";
      c.lineWidth = 1;
      c.strokeRect(x + 0.5, y + 0.5, z - 1, z - 1);
      if (b.frame) {
        c.fillStyle = "#6b7480";
        for (const [rx, ry] of [[2, 2], [z - 4, 2], [2, z - 4], [z - 4, z - 4]]) c.fillRect(x + rx, y + ry, 2, 2);
      }
    }
    const k = BT[b.t].k;
    if (k === "core") {
      c.fillStyle = PAL[0];
      c.fillRect(x + 3, y + 3, z - 6, z - 6);
      c.fillStyle = "#fff";
      c.fillRect(x + 5, y + 5, z - 10, z - 10);
    } else if (k === "tank") {
      const f = S.fill * (z - 4);
      c.fillStyle = PAL[1];
      c.fillRect(x + 2, y + 2 + (z - 4 - f), z - 4, f);
      if (b.t === "dtank") {
        c.strokeStyle = "#ffffff";
        c.strokeRect(x + 3.5, y + 3.5, z - 7, z - 7);
      }
    } else if (b.t === "emit") {
      c.fillStyle = C.ink;
      c.fillRect(x + z - 5, y + 4, 5, z - 8);
      c.fillStyle = PAL[0];
      c.fillRect(x + 2, y + 5, z - 8, z - 10);
    } else if (b.t === "mini") {
      c.fillStyle = C.ink;
      c.fillRect(x + z - 6, y + 3, 6, 2);
      c.fillRect(x + z - 6, y + z / 2 - 1, 6, 2);
      c.fillRect(x + z - 6, y + z - 5, 6, 2);
      c.fillStyle = PAL[0];
      c.fillRect(x + 2, y + 4, z - 9, z - 8);
    } else if (b.t === "miss") {
      c.fillStyle = C.ink;
      c.beginPath();
      c.moveTo(x + z - 2, y + z / 2);
      c.lineTo(x + 4, y + 3);
      c.lineTo(x + 4, y + z - 3);
      c.closePath();
      c.fill();
    } else if (k === "coll") {
      c.strokeStyle = PAL[0];
      c.beginPath();
      c.arc(x + z / 2, y + z / 2, z / 2 - 3, 0, TAU);
      c.stroke();
      if (b.t === "hcoll") {
        c.strokeStyle = PAL[1];
        c.beginPath();
        c.arc(x + z / 2, y + z / 2, z / 2 - 1, 0, TAU);
        c.stroke();
        c.fillStyle = PAL[1];
        c.fillRect(x + z / 2 - 1.5, y + z / 2 - 1.5, 3, 3);
      }
    } else if (b.t === "eng") {
      c.fillStyle = C.ink;
      c.fillRect(x + 1, y + 4, 4, z - 8);
      c.fillStyle = PAL[1];
      c.fillRect(x + 7, y + 5, z - 11, z - 10);
    } else if (b.t === "aft") {
      c.fillStyle = C.ink;
      c.fillRect(x + 1, y + 2, 5, z - 4);
      c.fillStyle = C.ink;
      c.fillRect(x + 7, y + 5, z - 11, z - 10);
    } else if (b.t === "gyro") {
      c.strokeStyle = C.ink;
      c.beginPath();
      c.moveTo(x + 3, y + z / 2);
      c.lineTo(x + z - 3, y + z / 2);
      c.moveTo(x + z / 2, y + 3);
      c.lineTo(x + z / 2, y + z - 3);
      c.stroke();
    } else if (b.t === "mirror") {
      c.strokeStyle = C.ink;
      c.beginPath();
      c.moveTo(x + 3, y + z - 3);
      c.lineTo(x + z - 3, y + 3);
      c.stroke();
    } else if (b.t === "bay") {
      c.fillStyle = "#ffffff";
      c.beginPath();
      c.arc(x + z / 2, y + z / 2, z / 2 - 3, 0, TAU);
      c.fill();
      c.fillStyle = C.ink;
      c.fillRect(x + z / 2 - 1, y + z / 2 - 1, 3, 3);
    } else if (b.t === "ram") {
      c.fillStyle = "#ffffff";
      c.beginPath();
      c.moveTo(x + z - 1, y + z / 2);
      c.lineTo(x + 3, y + 3);
      c.lineTo(x + 3, y + z - 3);
      c.closePath();
      c.fill();
    } else if (b.t === "drain") {
      c.strokeStyle = "#ffffff";
      c.lineWidth = 2;
      c.beginPath();
      c.arc(x + z / 2, y + z / 2, z / 2 - 3, 0, TAU);
      c.stroke();
    } else if (b.t === "dish") {
      c.strokeStyle = "#ffffff";
      c.lineWidth = 1.5;
      c.beginPath();
      c.arc(x + z / 2, y + z / 2, z / 2 - 2, -2.2, 2.2);
      c.stroke();
      c.fillStyle = "#ffffff";
      c.fillRect(x + z / 2 - 1, y + z / 2 - 1, 3, 3);
    } else if (b.t === "shell") {
      c.fillStyle = "#ffffff";
      c.beginPath();
      c.moveTo(x + z / 2, y + 1);
      c.lineTo(x + z - 1, y + z / 2);
      c.lineTo(x + z / 2, y + z - 1);
      c.lineTo(x + 1, y + z / 2);
      c.closePath();
      c.fill();
    } else if (b.t === "hangar") {
      c.strokeStyle = "#ffffff";
      c.lineWidth = 2;
      c.strokeRect(x + 3, y + 3, z - 6, z - 6);
    }
  }
  c.globalAlpha = 1;
}
function blocksNew(c, o, blocks) {
  const at = o.cell ? (x, y) => o.cell.get(x + "," + y) : () => null, mine = o === P, z = CELL - 1, H2 = CELL / 2;
  const la = -o.a, sx = -0.6 * Math.cos(la) + 0.8 * Math.sin(la), sy = -0.6 * Math.sin(la) - 0.8 * Math.cos(la);
  const lit = [], dark = [], trim = [], cracks = [];
  const fine = zoom >= 0.45, calm = calmMotion || !fine, gA = mine ? P.gyA || 0 : S.t * 0.8, firing = mine && S.t - S.lastFire < 0.25, pf = S.patch == null ? 1 : S.patch, spd = mine ? 0 : Math.hypot(o.vx || 0, o.vy || 0);
  const harv = S.t - S.lastHarv < 1, thr = mine && !P.form ? clamp(P.tu, 0, 1) : 0, burn = thr && pool() > 1 ? thr * Math.min(1, S.pw[0]) : 0, reload = clamp(1 - S.missCd / (S.cdMax[2] || 1), 0, 1);
  const RED = !!o.hostile, PUR = !!o.corrupt, plates = /* @__PURE__ */ new Map(), backs = [], dishes = [], shapes2 = [];
  for (const b of blocks) {
    const x = b.x * CELL - H2, y = b.y * CELL - H2, h = clamp(b.hp / (maxHp(b) * (b.ghost ? 0.5 : 1)), 0, 1), job = JOBOF[b.t];
    if (b.ghost) {
      c.globalAlpha = (0.3 + 0.14 * Math.sin(S.t * 6 + b.x * 2 + b.y)) * (0.5 + 0.5 * h);
      c.fillStyle = PAL[0];
      c.fillRect(x, y, z, z);
      c.globalAlpha = 0.9;
      c.strokeStyle = PAL[0];
      c.lineWidth = 1;
      c.strokeRect(x + 0.5, y + 0.5, z - 1, z - 1);
      if (b.fix > 0) {
        c.fillStyle = C.scrap;
        c.fillRect(x + 1, y + z - 3, (z - 2) * Math.min(1, b.fix), 2);
      }
      c.globalAlpha = 1;
      continue;
    }
    const plate = isPlate(b);
    if (plate) {
      const col = PUR ? "#3a2457" : RED ? "#55262a" : b.t === "ehull" ? "#1f6f78" : b.frame ? "#272d36" : b.t === "mirror" ? "#5b6676" : b.t === "hard" ? "#5a4a2e" : b.t === "blast" ? "#41315e" : "#3a4451";
      if (!plates.has(col)) plates.set(col, []);
      plates.get(col).push(x, y);
    } else backs.push(x, y);
    if (b.t === "coll" || b.t === "hcoll") dishes.push(b, x, y);
    else shapes2.push(b, x, y, plate);
    for (const [dx, dy] of SIDES) {
      if (plate && isPlate(at(b.x + dx, b.y + dy))) continue;
      const e = dx ? [x + (dx > 0 ? z : 0), y, x + (dx > 0 ? z : 0), y + z] : [x, y + (dy > 0 ? z : 0), x + z, y + (dy > 0 ? z : 0)];
      (dx * sx + dy * sy > 0 ? lit : dark).push(e);
    }
    if (b.g) trim.push([x, y, C.ether]);
    else if (mine && JOBSYS[job] != null && S.pri[JOBSYS[job]] === 2) trim.push([x, y, "#ffffff"]);
    if (h < 0.66) cracks.push([x, y, h < 0.33]);
  }
  c.globalAlpha = 1;
  for (const [col, q] of plates) {
    c.fillStyle = col;
    c.beginPath();
    for (let i = 0; i < q.length; i += 2) c.rect(q[i] - 0.5, q[i + 1] - 0.5, CELL, CELL);
    c.fill();
  }
  if (backs.length) {
    c.fillStyle = PUR ? "#1f1230" : RED ? "#2b1417" : "#141920";
    c.beginPath();
    for (let i = 0; i < backs.length; i += 2) c.rect(backs[i], backs[i + 1], z, z);
    c.fill();
    c.strokeStyle = PUR ? "#6a49a3" : RED ? "#7a3a3f" : "#3b4452";
    c.lineWidth = 1;
    c.beginPath();
    for (let i = 0; i < backs.length; i += 2) c.rect(backs[i] + 0.5, backs[i + 1] + 0.5, z - 1, z - 1);
    c.stroke();
  }
  for (let i = 0; i < shapes2.length; i += 4) {
    const b = shapes2[i], x = shapes2[i + 1], y = shapes2[i + 2], t = b.t, col = PUR ? "#c08cff" : RED ? JOBOF[t] === "gun" || t === "bay" || t === "ram" ? "#ff4d4d" : JOBOF[t] === "drive" ? "#ff9966" : JOBOF[t] === "store" ? "#d9708c" : "#ff8a8a" : JOBC[JOBOF[t]] || "#ffffff", cx = x + z / 2, cy = y + z / 2;
    if (shapes2[i + 3]) {
      if (t === "mirror") {
        c.strokeStyle = "#d6dde6";
        c.globalAlpha = calm ? 0.8 : 0.5 + 0.4 * Math.sin(S.t * 2.4 + b.x * 0.8 + b.y * 0.8);
        c.lineWidth = 1.2;
        c.beginPath();
        c.moveTo(x + 3, y + z - 3);
        c.lineTo(x + z - 3, y + 3);
        c.stroke();
        c.globalAlpha = 1;
      }
      if (t === "hard") {
        c.strokeStyle = "#e0b45c";
        c.lineWidth = 1.6;
        c.beginPath();
        c.moveTo(x + 4, y + z / 2 + 2);
        c.lineTo(cx, y + 4);
        c.lineTo(x + z - 4, y + z / 2 + 2);
        c.moveTo(x + 4, y + z - 5);
        c.lineTo(cx, y + z / 2);
        c.lineTo(x + z - 4, y + z - 5);
        c.stroke();
      }
      if (t === "blast") {
        c.strokeStyle = "#b69cf0";
        c.lineWidth = 1.6;
        c.beginPath();
        c.arc(cx, cy, z / 2 - 5, 0, TAU);
        c.stroke();
        c.fillStyle = "#b69cf0";
        c.fillRect(cx - 1.5, cy - 1.5, 3, 3);
      }
      if (t === "ehull") {
        c.fillStyle = PAL[0];
        c.globalAlpha = 0.35 + 0.2 * Math.sin(S.t * 2 + b.x);
        c.fillRect(x + 4, y + 4, z - 8, z - 8);
        c.globalAlpha = 1;
      }
      if (b.frame) {
        c.fillStyle = "#7a8494";
        for (const [rx, ry] of [[2, 2], [z - 4, 2], [2, z - 4], [z - 4, z - 4]]) c.fillRect(x + rx, y + ry, 2, 2);
      }
      continue;
    }
    c.fillStyle = col;
    c.strokeStyle = col;
    const fcr = (t === "emit" || t === "mini" || t === "miss") && b.fc ? b.fc * Math.PI / 2 : 0;
    if (fcr) {
      c.save();
      c.translate(cx, cy);
      c.rotate(fcr);
      c.translate(-cx, -cy);
    }
    if (t === "core") {
      const p = 0.75 + 0.25 * Math.sin(S.t * 2.2);
      c.fillStyle = "#ffffff";
      c.globalAlpha = p;
      c.fillRect(x + 4, y + 4, z - 8, z - 8);
      c.globalAlpha = 1;
      c.strokeStyle = PAL[0];
      c.lineWidth = 1.5;
      c.strokeRect(x + 2.5, y + 2.5, z - 5, z - 5);
    } else if (t === "tank" || t === "dtank") {
      const w = t === "dtank" ? z - 4 : z - 6, x0 = cx - w / 2, r = w / 2;
      c.lineWidth = 1.2;
      c.beginPath();
      c.roundRect ? c.roundRect(x0, y + 2, w, z - 4, r) : c.rect(x0, y + 2, w, z - 4);
      c.stroke();
      const f = S.fill * (z - 6);
      c.globalAlpha = 0.85;
      c.fillRect(x0 + 1.5, y + 3 + (z - 6 - f), w - 3, f);
      c.globalAlpha = 1;
      if (t === "dtank") {
        c.fillStyle = "#ffffff";
        c.fillRect(x0 + 1, cy - 0.5, w - 2, 1);
      }
    } else if (t === "emit") {
      c.fillRect(x + 2, y + 4, z - 7, z - 8);
      c.fillStyle = C.ink;
      c.fillRect(x + z - 5, cy - 1.5, 8, 3);
      if (mine && fine) {
        const g = clamp(1 - S.fireCd / 0.34, 0, 1), fl = S.t - S.lastFire < 0.07;
        c.fillStyle = "#ffffff";
        c.globalAlpha = fl ? 1 : 0.15 + 0.55 * g * g;
        c.fillRect(x + z + 1, cy - 1.5, 3, 3);
        c.globalAlpha = 1;
      }
    } else if (t === "mini") {
      c.fillRect(x + 2, y + 3, z - 8, z - 6);
      c.fillStyle = C.ink;
      if (firing && !calm) {
        for (let q = 0; q < 3; q++) c.fillRect(x + z - 6, cy + Math.sin(S.t * 34 + q * 2.09) * 4 - 0.75, 9, 1.5);
      } else for (const q of [-4, 0, 4]) c.fillRect(x + z - 6, cy + q - 0.75, 9, 1.5);
    } else if (t === "miss") {
      c.lineWidth = 1;
      c.strokeRect(x + 1.5, y + 2.5, z - 3, z - 5);
      if (mine && fine && reload >= 1) {
        const op = S.t - S.lastFire < 0.2 ? 4 : 1.5;
        c.beginPath();
        c.moveTo(x + z - 1.5, y + 2.5);
        c.lineTo(x + z + op, y + 2.5 - op);
        c.moveTo(x + z - 1.5, y + z - 2.5);
        c.lineTo(x + z + op, y + z - 2.5 + op);
        c.stroke();
      }
      if (mine ? reload > 0 : true) {
        const L = (z - 6) * (mine ? reload : 1);
        c.fillStyle = C.ink;
        c.beginPath();
        c.moveTo(x + 3 + L, cy);
        c.lineTo(x + 3, cy - 3);
        c.lineTo(x + 3, cy + 3);
        c.closePath();
        c.fill();
      }
    } else if (t === "eng" || t === "aft") {
      const big = t === "aft", sw = mine && thr > 0.02 ? Math.atan2(-P.tdy, -P.tdx) - Math.PI : 0;
      if (sw) {
        c.save();
        c.translate(cx, cy);
        c.rotate(sw);
        c.translate(-cx, -cy);
      }
      c.fillRect(x + 4, y + 3, z - 6, z - 6);
      c.fillStyle = "#ffffff";
      const th = mine ? big ? burn : thr : clamp(spd / 160, 0, 1) * (o.awake ? 1 : 0.3);
      c.globalAlpha = 0.35 + 0.65 * th;
      c.fillRect(x - 2, y + (big ? 2 : 4), 4, z - (big ? 4 : 8));
      c.globalAlpha = 1;
      if (th > 0.06 && fine) {
        const L = (big ? 30 : 20) * th * (calm ? 1 : 1 + 0.25 * Math.sin(S.t * 43 + b.x * 5 + b.y * 3)), w = big ? z - 4 : z - 8;
        c.fillStyle = big ? "#ffffff" : C.pale;
        c.globalAlpha = 0.5;
        c.beginPath();
        c.moveTo(x - 2, y + (z - w) / 2);
        c.lineTo(x - 2 - L, cy);
        c.lineTo(x - 2, y + (z + w) / 2);
        c.closePath();
        c.fill();
        c.globalAlpha = 0.9;
        c.fillStyle = "#ffffff";
        c.beginPath();
        c.moveTo(x - 2, cy - w * 0.22);
        c.lineTo(x - 2 - L * 0.55, cy);
        c.lineTo(x - 2, cy + w * 0.22);
        c.closePath();
        c.fill();
        c.globalAlpha = 1;
      }
      if (big) {
        c.fillStyle = C.ink;
        c.fillRect(x + 4, cy - 1, z - 7, 2);
      }
      if (sw) c.restore();
    } else if (t === "bay") {
      c.lineWidth = 1.4;
      c.beginPath();
      c.arc(cx, cy, z / 2 - 4, 0, TAU);
      c.stroke();
      c.fillRect(cx - 2, cy - 2, 4, 4);
    } else if (t === "ram") {
      c.beginPath();
      c.moveTo(x + z - 1, cy);
      c.lineTo(x + 3, y + 3);
      c.lineTo(x + 3, y + z - 3);
      c.closePath();
      c.fill();
    } else if (t === "drain") {
      c.lineWidth = 1.6;
      c.beginPath();
      c.arc(cx, cy, z / 2 - 4, 0, TAU);
      c.stroke();
      c.fillRect(cx - 1, cy, 2, z / 2);
    } else if (t === "dish") {
      c.lineWidth = 1.4;
      c.beginPath();
      c.arc(cx - 2, cy, z / 2 - 3, -1.1, 1.1);
      c.stroke();
      c.fillRect(cx, cy - 1.5, 3, 3);
    } else if (t === "shell") {
      c.globalAlpha = 0.8;
      c.beginPath();
      c.moveTo(cx, y + 2);
      c.lineTo(x + z - 2, cy);
      c.lineTo(cx, y + z - 2);
      c.lineTo(x + 2, cy);
      c.closePath();
      c.fill();
      c.globalAlpha = 1;
    } else if (t === "hangar") {
      c.lineWidth = 2;
      c.strokeRect(x + 3, y + 3, z - 6, z - 6);
    } else if (t === "sgen") {
      const p = 0.5 + 0.5 * Math.sin(S.t * 3 + b.x);
      c.strokeStyle = "#9fb2cc";
      c.lineWidth = 1.4;
      c.beginPath();
      c.arc(cx, cy, z / 2 - 4, 0, TAU);
      c.stroke();
      c.globalAlpha = 0.35 + 0.4 * p;
      c.beginPath();
      c.arc(cx, cy, z / 2 - 7, 0, TAU);
      c.stroke();
      c.globalAlpha = 1;
      c.fillStyle = "#9fb2cc";
      c.fillRect(cx - 1.5, cy - 1.5, 3, 3);
    } else if (t === "pd") {
      c.strokeStyle = "#7ee0ff";
      c.lineWidth = 1.4;
      c.beginPath();
      c.arc(cx, cy, z / 2 - 5, 0, TAU);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        c.moveTo(cx + dx * (z / 2 - 8), cy + dy * (z / 2 - 8));
        c.lineTo(cx + dx * (z / 2 - 2), cy + dy * (z / 2 - 2));
      }
      c.stroke();
      c.fillStyle = "#7ee0ff";
      c.fillRect(cx - 1, cy - 1, 2, 2);
    } else if (t === "sensor") {
      c.lineWidth = 1.4;
      c.beginPath();
      c.ellipse(cx, cy, Math.max(2, z / 2 - 3), Math.max(2, z / 2 - 5.5), 0, 0, TAU);
      c.stroke();
      c.beginPath();
      c.arc(cx, cy, 3.2, 0, TAU);
      c.fill();
      if (!calm) {
        c.globalAlpha = 0.25 + 0.35 * Math.sin(S.t * 2 + b.x);
        c.beginPath();
        c.arc(cx, cy, 5.6, 0, TAU);
        c.stroke();
        c.globalAlpha = 1;
      }
    } else if (t === "score") {
      c.lineWidth = 1.6;
      c.beginPath();
      c.arc(cx, cy, z / 2 - 3, 0, TAU);
      c.stroke();
      c.beginPath();
      c.moveTo(cx - z / 2 + 6, cy);
      c.lineTo(cx + z / 2 - 6, cy);
      c.moveTo(cx, cy - z / 2 + 6);
      c.lineTo(cx, cy + z / 2 - 6);
      c.stroke();
      c.globalAlpha = calm ? 1 : 0.6 + 0.4 * Math.sin(S.t * 2.4 + b.x);
      c.fillRect(cx - 2, cy - 2, 4, 4);
      c.globalAlpha = 1;
    } else if (t === "gyro") {
      c.lineWidth = 1.4;
      c.beginPath();
      c.arc(cx, cy, z / 2 - 3, 0, TAU);
      c.stroke();
      const a = gA;
      c.beginPath();
      for (const q of [a, a + Math.PI / 2]) {
        c.moveTo(cx + Math.cos(q) * 4, cy + Math.sin(q) * 4);
        c.lineTo(cx - Math.cos(q) * 4, cy - Math.sin(q) * 4);
      }
      c.stroke();
      c.fillRect(cx - 1, cy - 1, 2, 2);
    }
    if (fcr) c.restore();
  }
  if (dishes.length) {
    const a = mine && harv ? S.t * 6 : 0, R = z / 2 - 2.5, R2 = z / 2 - 5.5, L = z / 2 - 3;
    c.strokeStyle = JOBC.coll;
    c.lineWidth = 1.4;
    c.globalAlpha = mine ? 0.4 + 0.6 * pf : 1;
    c.beginPath();
    for (let i = 0; i < dishes.length; i += 3) {
      const cx = dishes[i + 1] + z / 2, cy = dishes[i + 2] + z / 2;
      c.moveTo(cx + R, cy);
      c.arc(cx, cy, R, 0, TAU);
      if (dishes[i].t === "hcoll") {
        c.moveTo(cx + R2, cy);
        c.arc(cx, cy, R2, 0, TAU);
      }
    }
    c.stroke();
    c.lineWidth = 1;
    c.beginPath();
    for (let i = 0; i < dishes.length; i += 3) {
      const cx = dishes[i + 1] + z / 2, cy = dishes[i + 2] + z / 2;
      for (let k = 0; k < 3; k++) {
        const q = a + k * TAU / 3;
        c.moveTo(cx, cy);
        c.lineTo(cx + Math.cos(q) * L, cy + Math.sin(q) * L);
      }
    }
    c.stroke();
    if (mine && fine && !calm) {
      if (harv) {
        const ph = S.t * 1.4 % 1;
        c.globalAlpha = (1 - ph) * 0.5 * pf;
        c.lineWidth = 1;
        c.beginPath();
        for (let i = 0; i < dishes.length; i += 3) {
          const cx = dishes[i + 1] + z / 2, cy = dishes[i + 2] + z / 2;
          c.moveTo(cx + R + ph * 6, cy);
          c.arc(cx, cy, R + ph * 6, 0, TAU);
        }
        c.stroke();
      }
      c.globalAlpha = 0.8;
      c.setLineDash([3, 4]);
      c.lineDashOffset = -S.t * 18;
      c.beginPath();
      for (let i = 0; i < dishes.length; i += 3) {
        if (dishes[i].t !== "hcoll") continue;
        const cx = dishes[i + 1] + z / 2, cy = dishes[i + 2] + z / 2;
        c.moveTo(cx + R2, cy);
        c.arc(cx, cy, R2, 0, TAU);
      }
      c.strokeStyle = PAL[1];
      c.stroke();
      c.setLineDash([]);
    }
    c.globalAlpha = 1;
  }
  const lines = (list, col, w) => {
    if (!list.length) return;
    c.strokeStyle = col;
    c.lineWidth = w;
    c.beginPath();
    for (const e of list) {
      c.moveTo(e[0], e[1]);
      c.lineTo(e[2], e[3]);
    }
    c.stroke();
  };
  c.globalAlpha = 1;
  lines(lit, "rgba(230,236,242,.55)", 1);
  lines(dark, "rgba(0,0,0,.6)", 1);
  if (o === P && S.hull >= 2) {
    const solid = blocks.filter((b) => !b.ghost);
    c.strokeStyle = "rgba(191,243,236,.5)";
    c.lineWidth = 1.5;
    c.beginPath();
    if (S.line === "wheel" || S.line === "bastion" || S.line === "brick") {
    } else if (S.line === "lance") {
      const sp = solid.filter((b) => b.y === 0);
      if (sp.length) {
        const x0 = Math.min(...sp.map((b) => b.x)), x1 = Math.max(...sp.map((b) => b.x));
        c.moveTo(x0 * CELL - H2 + 2, 0);
        c.lineTo(x1 * CELL + H2 - 2, 0);
      }
    } else {
      const m = Math.max(...solid.map((b) => Math.abs(b.y)));
      for (const b of solid) if (m > 2 && Math.abs(b.y) === m) {
        const x = b.x * CELL, y = b.y * CELL;
        c.moveTo(x - 4, y - 3 * Math.sign(b.y));
        c.lineTo(x, y + 2 * Math.sign(b.y));
        c.lineTo(x + 4, y - 3 * Math.sign(b.y));
      }
    }
    c.stroke();
  }
  c.lineWidth = 1;
  for (const [x, y, col] of trim) {
    c.strokeStyle = col;
    c.globalAlpha = col === C.ether ? 1 : 0.7;
    c.strokeRect(x + 1.5, y + 1.5, z - 3, z - 3);
  }
  c.globalAlpha = 1;
  c.strokeStyle = "rgba(0,0,0,.75)";
  c.lineWidth = 1.2;
  c.beginPath();
  for (const [x, y, two] of cracks) {
    c.moveTo(x + 2, y + 3);
    c.lineTo(x + 6, y + 7);
    c.lineTo(x + 5, y + 11);
    c.lineTo(x + 9, y + 14);
    if (two) {
      c.moveTo(x + z - 2, y + 2);
      c.lineTo(x + z - 6, y + 6);
      c.lineTo(x + z - 4, y + 9);
    }
  }
  c.stroke();
  c.lineWidth = 1.6;
  for (const [x, y, two] of cracks) {
    const ix = x + z - 5, iy = y + 5;
    c.beginPath();
    if (two) {
      c.strokeStyle = C.hostile;
      c.moveTo(ix - 3, iy - 3);
      c.lineTo(ix + 3, iy + 3);
      c.moveTo(ix + 3, iy - 3);
      c.lineTo(ix - 3, iy + 3);
    } else {
      c.strokeStyle = "#ffb000";
      c.moveTo(ix, iy - 4);
      c.lineTo(ix + 4, iy + 3);
      c.lineTo(ix - 4, iy + 3);
      c.closePath();
    }
    c.stroke();
  }
  if (o === P && S.started) {
    c.strokeStyle = C.hostile;
    c.lineWidth = 1.2;
    c.setLineDash([3, 3]);
    c.globalAlpha = 0.8;
    for (const q of lostSlots()) {
      const x = q.x * CELL - CELL / 2, y = q.y * CELL - CELL / 2;
      c.strokeRect(x + 1.5, y + 1.5, z - 3, z - 3);
      c.beginPath();
      c.moveTo(x + 5, y + 5);
      c.lineTo(x + z - 5, y + z - 5);
      c.moveTo(x + z - 5, y + 5);
      c.lineTo(x + 5, y + z - 5);
      c.stroke();
    }
    c.setLineDash([]);
    c.globalAlpha = 1;
  }
}
function shapePath(c, lp, k) {
  const p = lp.pts, n = p.length / 2, ux = -Math.sin(P.a), uy = -Math.cos(P.a);
  let st = 0, bd = -1e9;
  for (let i = 0; i < n; i++) {
    const d = p[i * 2] * ux + p[i * 2 + 1] * uy;
    if (d > bd) {
      bd = d;
      st = i;
    }
  }
  c.beginPath();
  for (let q = 0; q <= n; q++) {
    const i = (st + q) % n;
    c[q ? "lineTo" : "moveTo"](p[i * 2], p[i * 2 + 1]);
  }
}
const SIDES = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const isPlate = (b) => !!b && !b.ghost && (b.t === "hull" || b.t === "mirror" || b.t === "ehull" || b.t === "hard" || b.t === "blast");
function markBlock(c, b) {
  const x = b.x * CELL - CELL / 2, y = b.y * CELL - CELL / 2, w = fw(b) * CELL, h = fh(b) * CELL;
  if (b.dark) {
    c.fillStyle = "rgba(7,8,11,.62)";
    c.fillRect(x, y, w - 1, h - 1);
  }
  if (b.mk > 1) {
    c.fillStyle = "rgba(7,8,11,.85)";
    c.fillRect(x + w - 15, y + 1, 14, 9);
    c.fillStyle = "#ffd166";
    c.font = "700 8px sans-serif";
    c.textAlign = "right";
    c.textBaseline = "top";
    c.fillText(b.mk === 2 ? "II" : "III", x + w - 3, y + 2);
    c.textAlign = "left";
    c.textBaseline = "alphabetic";
  }
}
function drawBig(c, o, big, tint) {
  const mine = o === P;
  for (const b of big) {
    const w = fw(b) * CELL, h = fh(b) * CELL, x = b.x * CELL - CELL / 2, y = b.y * CELL - CELL / 2, col = tint || JOBC[JOBOF[b.t]] || "#ffffff", cx = x + w / 2, cy = y + h / 2;
    c.globalAlpha = b.ghost ? 0.45 : 1;
    c.fillStyle = "#141920";
    c.fillRect(x, y, w - 1, h - 1);
    c.strokeStyle = col;
    c.lineWidth = 1.5;
    c.strokeRect(x + 0.75, y + 0.75, w - 2.5, h - 2.5);
    c.fillStyle = col;
    c.lineWidth = 1.5;
    const fr = b.t === "hmini" && b.fc ? b.fc * Math.PI / 2 : 0;
    if (fr) {
      c.save();
      c.translate(cx, cy);
      c.rotate(fr);
      c.translate(-cx, -cy);
    }
    if (b.t === "rail") {
      const horiz = w >= h, hot = mine && S.rail && S.rail.on ? clamp(S.rail.c / TUNE.railTime, 0, 1) : 0;
      c.fillStyle = C.ink;
      if (horiz) {
        c.fillRect(x + 4, cy - 2.5, w - 8, 5);
        c.fillRect(x + w - 4, cy - 1.5, 6, 3);
      } else {
        c.fillRect(cx - 2.5, y + 4, 5, h - 8);
        c.fillRect(cx - 1.5, y + h - 4, 3, 6);
      }
      c.fillStyle = "#ffffff";
      c.globalAlpha = (b.ghost ? 0.45 : 1) * (0.25 + 0.75 * hot);
      if (horiz) {
        c.fillRect(x + 4, cy - 1, (w - 8) * Math.max(0.1, hot), 2);
      } else {
        c.fillRect(cx - 1, y + 4, 2, (h - 8) * Math.max(0.1, hot));
      }
    } else if (b.t === "art") {
      const an = o === P && !P.form && !build ? gunDir(o, b, 3) - o.a : (b.fc | 0) * Math.PI / 2, L = Math.min(w, h) * 0.46;
      c.fillStyle = col;
      c.beginPath();
      c.arc(cx, cy, Math.min(w, h) * 0.27, 0, TAU);
      c.fill();
      c.save();
      c.translate(cx, cy);
      c.rotate(an);
      c.fillStyle = C.ink;
      c.fillRect(0, -4, L, 8);
      c.fillStyle = col;
      c.fillRect(L - 5, -5, 5, 10);
      c.fillStyle = "#ffffff";
      c.globalAlpha = (b.ghost ? 0.45 : 1) * 0.7;
      c.fillRect(6, -1, L - 14, 2);
      c.restore();
      c.fillStyle = C.ink;
      c.beginPath();
      c.arc(cx, cy, Math.min(w, h) * 0.12, 0, TAU);
      c.fill();
    } else if (b.t === "hmini") {
      c.fillStyle = C.ink;
      for (const qy of [0.25, 0.5, 0.75]) c.fillRect(x + w * 0.45, y + h * qy - 1.5, w * 0.5, 3);
      c.fillStyle = col;
      c.fillRect(x + 4, y + 5, w * 0.4, h - 10);
    } else if (b.t === "shcore") {
      c.strokeStyle = col;
      c.beginPath();
      c.arc(cx, cy, w * 0.34, 0, TAU);
      c.stroke();
      c.globalAlpha = (b.ghost ? 0.45 : 1) * 0.45;
      c.beginPath();
      c.arc(cx, cy, w * 0.18, 0, TAU);
      c.fill();
      c.globalAlpha = 1;
    } else if (b.t === "battery") {
      for (const [qx, qy] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) {
        c.beginPath();
        c.moveTo(x + w * qx + 4, y + h * qy);
        c.lineTo(x + w * qx - 3, y + h * qy - 3);
        c.lineTo(x + w * qx - 3, y + h * qy + 3);
        c.closePath();
        c.fill();
      }
    } else if (b.t === "rtank") {
      const f = S.fill * (h - 8);
      c.globalAlpha = 0.85;
      c.fillRect(x + 4, y + 4 + (h - 8 - f), w - 8, f);
      c.globalAlpha = 1;
      c.strokeStyle = "#ffffff";
      c.strokeRect(x + 3.5, y + 3.5, w - 8, h - 8);
    } else if (b.t === "slab") {
      for (const [qx, qy] of [[0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8]]) c.fillRect(x + w * qx - 1, y + h * qy - 1, 3, 3);
      c.globalAlpha = 0.4;
      c.fillRect(x + 4, y + 4, w - 8, h - 8);
    } else if (b.t === "eng2") {
      c.fillStyle = C.ink;
      c.fillRect(x + 1, y + 4, 5, h - 8);
      c.fillStyle = col;
      c.fillRect(x + 8, y + 5, w - 14, h - 10);
      c.fillStyle = "#ffffff";
      c.globalAlpha = 0.4 + 0.5 * (mine ? clamp(P.tu, 0, 1) : 0);
      c.fillRect(x - 3, y + 7, 4, h - 14);
      c.globalAlpha = 1;
    } else if (b.t === "carray") {
      c.strokeStyle = col;
      for (const [qx, qy] of [[0.5, 0.5], [0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) {
        c.beginPath();
        c.arc(x + w * qx, y + h * qy, w / 5, 0, TAU);
        c.stroke();
      }
    }
    if (fr) c.restore();
    c.globalAlpha = 1;
    if (!tint && (b.mk > 1 || b.dark)) markBlock(c, b);
  }
}
function derelictDraw(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(0.15);
  ctx.lineWidth = 7;
  ctx.strokeStyle = "#2b323c";
  ctx.fillStyle = "#1b2028";
  ctx.beginPath();
  ctx.arc(0, 0, 200, 0, TAU);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 60, 0, TAU);
  ctx.fill();
  ctx.stroke();
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 2);
    ctx.strokeRect(60, -9, 128, 18);
  }
  ctx.globalAlpha = 0.35 + 0.35 * Math.sin(S.t * 1.7);
  ctx.fillStyle = PAL[0];
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 2);
    ctx.fillRect(176, -3, 8, 6);
  }
  ctx.restore();
}
function derelictBubble(x, y, R) {
  const inn = S.hol && derelict() && Math.hypot(P.x - x, P.y - y) < R * 1.05, flash = clamp(1 - (S.t - (S.bubT || -9)) * 1.2, 0, 1), pulse = 0.5 + 0.5 * Math.sin(S.t * 2.2);
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = PAL[0];
  ctx.fillStyle = PAL[0];
  ctx.globalAlpha = 0.05 + 0.04 * pulse + (inn ? 0.05 : 0) + 0.18 * flash;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 0.3 + 0.15 * pulse + 0.5 * flash;
  ctx.lineWidth = 2 + 3 * flash;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, TAU);
  ctx.stroke();
  ctx.restore();
  ctx.globalAlpha = 1;
}
function copyPreview() {
  const b = S.cb;
  if (!b) return;
  if (!b.bl) {
    b.bl = copyBlocks(b.tier);
    b.order = b.bl.slice().sort((p, q) => Math.hypot(p.x, p.y) - Math.hypot(q.x, q.y));
  }
  const k = clamp(b.t / b.dur, 0, 1), gx = P.x + Math.cos(P.a + Math.PI / 2) * (P.radius + 60), gy = P.y + Math.sin(P.a + Math.PI / 2) * (P.radius + 60), n = Math.max(1, Math.ceil(k * b.order.length)), part = b.order.slice(0, n);
  const pv = { x: gx, y: gy, a: P.a, vx: 0, vy: 0, cell: cellMap(part), awake: true };
  ctx.save();
  ctx.globalAlpha = 0.35 + 0.5 * k;
  drawBlocks(pv, part);
  ctx.restore();
  ctx.strokeStyle = PAL[0];
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.6 * (1 - k);
  ctx.beginPath();
  ctx.arc(gx, gy, 40 + 160 * (1 - k), 0, TAU);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = PAL[1];
  ctx.globalAlpha = 0.55 + 0.4 * Math.sin(S.t * 10);
  ctx.font = "700 " + Math.round(13 / zoom) + "px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(b.cost.scrap + " scrap, " + b.cost.lock + " ether", gx, gy - b.order.reduce((m, q) => Math.max(m, Math.hypot(q.x, q.y)), 0) * CELL - 26);
  ctx.textAlign = "left";
  ctx.globalAlpha = 1;
}
function trailDraw(vis) {
  if (!trails.length) return;
  const by = /* @__PURE__ */ new Map();
  for (const q of trails) {
    if (!q.src) {
      if (vis(q.x, q.y, q.r)) {
        ctx.globalAlpha = clamp(q.life / TUNE.trailLife, 0, 1) * 0.2;
        ctx.fillStyle = "#a063e8";
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.r * 0.6, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      continue;
    }
    let l = by.get(q.src);
    if (!l) by.set(q.src, l = []);
    l.push(q);
  }
  for (const l of by.values()) {
    let run = [l[0]];
    for (let i = 1; i <= l.length; i++) {
      const a = l[i - 1], b = l[i];
      if (b && Math.hypot(b.x - a.x, b.y - a.y) < 900) {
        run.push(b);
        continue;
      }
      trailRibbon(run, vis);
      run = b ? [b] : [];
    }
  }
  ctx.globalAlpha = 1;
}
function trailRibbon(r, vis) {
  const n = r.length, a0 = r[0], a1 = r[n - 1];
  if (!vis(a0.x, a0.y, r[0].r * 3) && !vis(a1.x, a1.y, r[0].r * 3) && !vis((a0.x + a1.x) / 2, (a0.y + a1.y) / 2, Math.hypot(a1.x - a0.x, a1.y - a0.y) / 2 + r[0].r * 3)) return;
  ctx.fillStyle = "#a063e8";
  if (n < 2) {
    ctx.globalAlpha = clamp(a0.life / TUNE.trailLife, 0, 1) * 0.2;
    ctx.beginPath();
    ctx.arc(a0.x, a0.y, a0.r * 0.6, 0, TAU);
    ctx.fill();
    return;
  }
  const L = [], R = [];
  for (let i = 0; i < n; i++) {
    const p = r[i], q = r[Math.max(0, i - 1)], s = r[Math.min(n - 1, i + 1)], dx = s.x - q.x, dy = s.y - q.y, dl = Math.hypot(dx, dy) || 1, lf = clamp(p.life / TUNE.trailLife, 0, 1), w = p.r * (1.2 - 0.5 * lf) * (0.55 + 0.45 * clamp((p.v || 0) / 500, 0, 1));
    L.push([p.x - dy / dl * w, p.y + dx / dl * w]);
    R.push([p.x + dy / dl * w, p.y - dx / dl * w]);
  }
  const g = ctx.createLinearGradient(a0.x, a0.y, a1.x, a1.y), f0 = clamp(a0.life / TUNE.trailLife, 0, 1), f1 = clamp(a1.life / TUNE.trailLife, 0, 1);
  g.addColorStop(0, "rgba(160,99,232," + (0.3 * f0 * f0).toFixed(3) + ")");
  g.addColorStop(1, "rgba(160,99,232," + (0.3 * f1 * f1).toFixed(3) + ")");
  ctx.globalAlpha = 1;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(L[0][0], L[0][1]);
  for (let i = 1; i < n; i++) ctx.lineTo(L[i][0], L[i][1]);
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
  ctx.closePath();
  ctx.fill();
}
function drawBlocks(o, blocks, tint) {
  const c = o.c || ctx;
  c.save();
  c.translate(o.x, o.y);
  c.rotate(o.a);
  const big = blocks.filter((b) => fw(b) * fh(b) > 1), rest = big.length ? blocks.filter((b) => fw(b) * fh(b) === 1) : blocks;
  if (tint || SET.look === "classic") blocksClassic(c, o, rest, tint);
  else blocksNew(c, o, rest);
  if (big.length) drawBig(c, o, big, tint);
  if (!tint) for (const b of rest) {
    if (b.mk > 1 || b.dark) markBlock(c, b);
  }
  if (!tint && o.pipes && o.pipes.length) {
    const act = S.t - S.lastFire < 0.25, over = S.halo / S.haloMax, sync = S.mood === 2;
    const soft = SET.look !== "classic";
    c.globalAlpha = (soft ? 0.12 + 0.18 * over : 0.3 + 0.35 * over) * (S.mood === 1 ? 0.55 + 0.45 * Math.random() : 1);
    c.strokeStyle = PAL[0];
    c.lineWidth = soft ? 1 : 1.6;
    c.beginPath();
    for (const p of o.pipes) {
      c.moveTo(p.a.x * CELL, p.a.y * CELL);
      c.lineTo(p.z.x * CELL, p.z.y * CELL);
    }
    c.stroke();
    c.globalAlpha = 1;
    for (const p of o.pipes) {
      let sp = 0.6, col = "#ffffff", sz = 2.4, rev = false, hot = false;
      const k = BT[p.t] ? BT[p.t].k : "";
      if (k === "emit") {
        sp = 0.5 + S.pw[2] * 1.4;
        hot = S.pri[2] === 2;
        if (act) {
          sp = 6;
          sz = 3.6;
        }
      } else if (k === "eng") {
        sp = 0.5 + S.pw[0] * 1.4;
        col = C.pale;
        hot = S.pri[0] === 2;
      } else if (k === "coll") {
        rev = true;
        sp = (0.5 + S.dens * 1.5 + (S.t - S.lastHarv < 1 ? 2 : 0)) * S.pw[3];
        col = PAL[0];
        hot = S.pri[3] === 2;
      } else if (k === "tank") {
        rev = S.net > 0;
        sp = 0.4 + Math.min(2, Math.abs(S.net) * 0.1);
        col = PAL[1];
      } else if (k === "hull") {
        sp = 0.3 + S.pw[1] * 0.7;
        col = PAL[6];
        sz = 2;
        hot = S.pri[1] === 2;
      }
      if (hot) {
        col = "#ffffff";
        sz += 1.4;
      }
      let t = (S.t * sp + (sync ? 0 : p.ph)) % 1;
      if (rev) t = 1 - t;
      c.fillStyle = col;
      c.fillRect((p.a.x + (p.z.x - p.a.x) * t) * CELL - sz / 2, (p.a.y + (p.z.y - p.a.y) * t) * CELL - sz / 2, sz, sz);
    }
  }
  c.globalAlpha = 1;
  c.restore();
}
let lastFilter = "", hintK = null;
let menuEcho;
let menuBl = null;
function menuShip() {
  if (menuEcho === void 0) {
    const e = loadJSON("ew_echo");
    menuEcho = e && e[0] && e[0].blocks && e[0].blocks.length ? e[0].blocks : null;
  }
  const src = menuEcho || [{ x: 0, y: 0, t: "core" }, { x: 1, y: 0, t: "hull" }, { x: 2, y: 0, t: "emit" }, { x: -1, y: 0, t: "eng" }, { x: 0, y: 1, t: "hull" }, { x: 0, y: -1, t: "hull" }, { x: -1, y: 1, t: "coll" }, { x: -1, y: -1, t: "tank" }];
  if (!menuBl || menuBl.src !== src) {
    const blocks = src.filter((b) => BT[b.t]).map((b) => ({ x: b.x, y: b.y, t: b.t, hp: BT[b.t].hp, g: 0, mk: 1, rot: b.r | 0, fc: b.c | 0 }));
    menuBl = { src, blocks, cell: cellMap(blocks) };
  }
  const t = performance.now() / 1e3, n = Math.sqrt(Math.max(4, menuBl.blocks.length)), k = clamp(Math.min(W, H) / (n * CELL * 7), 1, 3.4), a = t * 0.08;
  ctx.save();
  ctx.translate(W * 0.5 + Math.cos(t * 0.05) * W * 0.18, H * 0.5 + Math.sin(t * 0.07) * H * 0.14);
  ctx.scale(k, k);
  ctx.globalAlpha = 0.75;
  const f = S.fill;
  S.fill = 0.7;
  drawBlocks({ x: 0, y: 0, a, cell: menuBl.cell }, menuBl.blocks);
  S.fill = f;
  ctx.restore();
  ctx.globalAlpha = 1;
}
function draw() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = "#07080b";
  ctx.fillRect(0, 0, W, H);
  if (S.frame % 10 === 0) refreshNear();
  if (sites.length) {
    const m = regionMix(cam.x, cam.y);
    for (const [k, a] of [[m.k, m.a], [m.k2, 1 - m.a]]) {
      const t = TINT[k] || 0;
      if (t > 0 && a > 0) {
        ctx.globalAlpha = t * a;
        ctx.fillStyle = RT[k].col;
        ctx.fillRect(0, 0, W, H);
      }
    }
    ctx.globalAlpha = 1;
  }
  if (sites.length && S.started) {
    if (S.frame % 30 === 0 || !hintK) {
      hintK = [];
      const here = biomeAt(cam.x, cam.y);
      for (let n = 0; n < 8; n++) {
        const a = n / 8 * TAU, k2 = biomeAt(cam.x + Math.cos(a) * 15e3, cam.y + Math.sin(a) * 15e3);
        hintK.push(k2 !== here && k2 !== "edge" ? k2 : null);
      }
    }
    for (let n = 0; n < 8; n++) {
      const k2 = hintK[n];
      if (!k2) continue;
      const a = n / 8 * TAU, gx = W / 2 + Math.cos(a) * W * 0.62, gy = H / 2 + Math.sin(a) * H * 0.62, gr = Math.max(W, H) * 0.36, g = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
      g.addColorStop(0, RT[k2].col + "30");
      g.addColorStop(1, RT[k2].col + "00");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
  }
  const warp = S.skip && !calmMotion ? Math.sin(Math.PI * (1 - S.skip.t / S.skip.max)) : 0;
  const thin = S.started ? clamp(S.depth / TUNE.frayCrack, 0, 0.9) : 0;
  for (const s of stars) {
    if (s.h < thin) continue;
    const f = 0.12 + s.l * 0.14, x0 = ((s.x - cam.x * f) % 1400 + 1400) % 1400, y0 = ((s.y - cam.y * f) % 1400 + 1400) % 1400;
    ctx.fillStyle = s.l === 2 ? "#b4bac2" : "#555c66";
    for (let x = x0; x <= W; x += 1400) for (let y = y0; y <= H; y += 1400) {
      if (warp > 0.02) {
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = s.s;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (x - W / 2) * 0.12 * warp * (1 + s.l), y + (y - H / 2) * 0.12 * warp * (1 + s.l));
        ctx.stroke();
      } else ctx.fillRect(x, y, s.s, s.s);
    }
  }
  ctx.save();
  const sh = calmMotion || !SET.shake ? 0 : S.shake * 7, shx = rnd(-sh, sh), shy = rnd(-sh, sh), toWorld = () => {
    ctx.translate(W / 2 + shx, H / 2 + shy);
    ctx.scale(zoom, zoom);
    ctx.translate(-cam.x, -cam.y);
  };
  toWorld();
  const vw = W / zoom / 2 + 120, vh = H / zoom / 2 + 120;
  const vis = (x, y, r) => Math.abs(x - cam.x) < vw + (r || 0) && Math.abs(y - cam.y) < vh + (r || 0);
  {
    const cd = Math.hypot(cam.x, cam.y), vr = Math.hypot(vw, vh);
    if (Math.abs(cd - WORLD) < vr) {
      const a = Math.atan2(cam.y, cam.x), span = Math.min(Math.PI, 1.6 * vr / Math.min(cd, WORLD)), step = 32 / WORLD, a0 = Math.floor((a - span) / step) * step;
      ctx.strokeStyle = "rgba(138,145,156,.18)";
      ctx.setLineDash([14, 18]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, WORLD, a0, a + span);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  if (sites.length) {
    const st = 140, x0 = Math.floor((cam.x - vw) / st) * st, y0 = Math.floor((cam.y - vh) / st) * st, nx = Math.ceil(2 * vw / st) + 2, ny = Math.ceil(2 * vh / st) + 2, id = [];
    for (let j = 0; j <= ny; j++) {
      const row = [];
      for (let i = 0; i <= nx; i++) row.push(regionAt(x0 + i * st, y0 + j * st).i);
      id.push(row);
    }
    ctx.fillStyle = "rgba(230,232,234,.26)";
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const a = id[j][i];
      if (a !== id[j][i + 1]) ctx.fillRect(x0 + i * st + st / 2 - 4, y0 + j * st - 4, 8, 8);
      if (a !== id[j + 1][i]) ctx.fillRect(x0 + i * st - 4, y0 + j * st + st / 2 - 4, 8, 8);
    }
  }
  if (FIELD.size && !calmMotion) {
    for (const [k, c] of FIELD) {
      const f = Math.min(1, c[0] + (S.t - c[1]) / TUNE.fieldRegrow), a = (1 - f) * 0.3;
      if (a < 0.02) continue;
      const i = k.indexOf(","), cx = (+k.slice(0, i) + 0.5) * TUNE.fieldCell, cy = (+k.slice(i + 1) + 0.5) * TUNE.fieldCell;
      if (!vis(cx, cy, TUNE.fieldCell)) continue;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, TUNE.fieldCell * 0.7);
      g.addColorStop(0, "rgba(0,0,0," + a + ")");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(cx - TUNE.fieldCell, cy - TUNE.fieldCell, TUNE.fieldCell * 2, TUNE.fieldCell * 2);
    }
  }
  drawRivers(vw, vh, vis, calmMotion);
  for (const p of cpulses) {
    const cd = Math.hypot(cam.x - p.x, cam.y - p.y), vr = Math.hypot(vw, vh);
    if (Math.abs(cd - p.r) < vr) {
      ctx.strokeStyle = "rgba(150,80,230," + 0.5 * (1 - p.r / p.max) + ")";
      ctx.lineWidth = 36;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, TAU);
      ctx.stroke();
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(225,190,255," + 0.75 * (1 - p.r / p.max) + ")";
      ctx.stroke();
    }
  }
  if (S.pockets && S.pockets.length) for (const q of S.pockets) {
    if (!vis(q.x, q.y, q.r)) continue;
    const neg = q.kind === "neg", col = neg ? "0,0,0" : "150,90,220", fa = Math.min(1, q.life / 6);
    ctx.fillStyle = "rgba(" + col + "," + 0.22 * fa + ")";
    ctx.beginPath();
    ctx.arc(q.x, q.y, q.r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(" + (neg ? "138,145,156" : col) + "," + 0.5 * fa + ")";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 12]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  for (const z of zones) {
    if (z.dead || !vis(z.x, z.y, z.ext)) continue;
    blobPath(ctx, z, 1, 0, 0);
    ctx.fillStyle = z.heart ? "rgba(150,90,220,.07)" : "rgba(229,72,77,.05)";
    ctx.fill();
    ctx.strokeStyle = z.heart ? "rgba(150,90,220,.6)" : "rgba(229,72,77,.55)";
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 12]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  trailDraw(vis);
  drawStations(vis);
  for (const s of sites) {
    if (s.k !== "hollows" || !vis(s.x, s.y, (1 - TUNE.derelictAt) * s.rad + 60)) continue;
    derelictBubble(s.x, s.y, (1 - TUNE.derelictAt) * s.rad);
  }
  for (const s of sites) {
    if (s.k !== "hollows" || !vis(s.x, s.y, 420)) continue;
    derelictDraw(s.x, s.y);
  }
  for (const w of wrecks) {
    if (!vis(w.x, w.y, w.r)) continue;
    drawBlocks(w, w.blocks, "#343c47");
    const k = w.ether / w.max;
    ctx.fillStyle = PAL[0];
    ctx.globalAlpha = 0.25 + 0.6 * k;
    const z = 4 + 6 * k;
    ctx.fillRect(w.x - z / 2, w.y - z / 2, z, z);
    ctx.globalAlpha = 1;
  }
  for (const r of nearRocks) {
    if (!vis(r.x, r.y, r.r)) continue;
    ctx.beginPath();
    for (let i = 0; i < r.pts.length; i++) {
      const a = r.rot + i / r.pts.length * TAU, q = r.r * r.pts[i];
      ctx[i ? "lineTo" : "moveTo"](r.x + Math.cos(a) * q, r.y + Math.sin(a) * q);
    }
    ctx.closePath();
    ctx.fillStyle = r.flash > 0 ? "#3a4350" : "#12161c";
    ctx.fill();
    ctx.lineWidth = r.rich ? 2 : 1.2;
    ctx.strokeStyle = r.rich ? PAL[0] : "#3a4350";
    ctx.stroke();
    if (r.rich) {
      ctx.fillStyle = PAL[0];
      for (let i = 0; i < 5; i++) {
        const a = r.rot * 1.3 + i * 1.9, q = r.r * (0.2 + 0.11 * i);
        ctx.fillRect(r.x + Math.cos(a) * q - 2, r.y + Math.sin(a) * q - 2, 4, 4);
      }
    }
  }
  if (S.started && !S.over) {
    ctx.strokeStyle = PAL[0];
    ctx.globalAlpha = 0.1;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(P.x, P.y, reach(), 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  for (const c of spills) {
    if (!vis(c.x, c.y, 200)) continue;
    const r = 40 + Math.sqrt(c.amt) * 3;
    ctx.fillStyle = C.ether;
    ctx.globalAlpha = Math.min(0.16, 0.03 + c.amt / 2500);
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = Math.min(0.35, c.amt / 800);
    ctx.strokeStyle = C.ether;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 8]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = PAL[0];
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  for (const m of motes) {
    if (!m.home || !vis(m.x, m.y)) continue;
    ctx.moveTo(m.x, m.y);
    ctx.lineTo(m.x - m.vx * 0.025, m.y - m.vy * 0.025);
  }
  ctx.stroke();
  for (const m of motes) {
    if (m.home || !vis(m.x, m.y)) continue;
    const z = m.kind === 1 ? 5 : 3 + m.v * 0.4;
    ctx.fillStyle = m.kind === 1 ? C.scrap : PAL[0];
    ctx.fillRect(m.x - z / 2, m.y - z / 2, z, z);
    ctx.fillStyle = "#fff";
    ctx.fillRect(m.x - 1, m.y - 1, 2, 2);
  }
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  for (const b of bolts) {
    if (!vis(b.x, b.y)) continue;
    const tl = b.m ? 0.03 : 0.022;
    ctx.lineWidth = b.m ? 5 * (b.ch ? 1 + 0.5 * (b.ch - 1) : 1) : b.art ? 4.5 : b.k ? 1.5 : 2.5;
    ctx.strokeStyle = b.f ? b.ch > 1.66 ? "#ffffff" : b.ch > 1.33 ? C.pale : C.ether : C.hostile;
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - b.vx * tl, b.y - b.vy * tl);
    ctx.stroke();
    if (!b.f) {
      const z = b.m ? 7 : b.k ? 3.5 : 5;
      ctx.fillStyle = C.hostile;
      ctx.beginPath();
      ctx.moveTo(b.x + z, b.y);
      ctx.lineTo(b.x, b.y + z);
      ctx.lineTo(b.x - z, b.y);
      ctx.lineTo(b.x, b.y - z);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(b.x - 1, b.y - 1, 2, 2);
    }
  }
  if (S.railBeam && S.railBeam.t > 0) {
    const rb = S.railBeam, k = clamp(rb.t / (rb.d || 0.4), 0, 1);
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(79,227,208," + 0.4 * k + ")";
    ctx.lineWidth = 44 * k + 4;
    ctx.beginPath();
    ctx.moveTo(rb.x1, rb.y1);
    ctx.lineTo(rb.x2, rb.y2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255," + k + ")";
    ctx.lineWidth = 11 * k + 1;
    ctx.beginPath();
    ctx.moveTo(rb.x1, rb.y1);
    ctx.lineTo(rb.x2, rb.y2);
    ctx.stroke();
    ctx.lineCap = "butt";
  }
  if (S.railSel && P.rails.length && !P.form && S.started && !S.over) {
    const [rx, ry] = wpos(P, P.rails[0]), mx = cam.x + (mouse.x - W / 2) / zoom, my = cam.y + (mouse.y - H / 2) / zoom, ch = S.rail && S.rail.on;
    let rel = Math.atan2(my - P.y, mx - P.x) - P.a;
    rel = Math.atan2(Math.sin(rel), Math.cos(rel));
    rel = clamp(rel, -TUNE.railArc, TUNE.railArc);
    ctx.save();
    ctx.strokeStyle = "rgba(79,227,208," + (0.45 + 0.2 * Math.sin(S.t * 6)) + ")";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(P.x, P.y, 46, 0, TAU);
    ctx.stroke();
    if (ch) {
      const cf0 = clamp(S.rail.spent / (0.8 * (S.rail.p0 || 1)), 0, 1), ok0 = S.rail.spent >= 0.2 * S.rail.p0 - 0.01;
      ctx.strokeStyle = ok0 ? "#ffffff" : "rgba(255,255,255,.5)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(P.x, P.y, 46, -Math.PI / 2, -Math.PI / 2 + TAU * cf0);
      ctx.stroke();
    }
    if (ch) {
      const R = S.rail, eff = R.spent + (R.hold > 0 && R.top ? 0.05 * R.p0 : 0), dm = TUNE.railK * Math.pow(eff, TUNE.railPow) * (S.mood === 1 ? 1.15 : 1) * TUNE.railBuff * DK(), wd = 2 * (TUNE.railHalf0 + TUNE.railHalf1 * clamp(R.spent / (0.8 * (R.p0 || 1)), 0, 1)) / CELL;
      ctx.font = Math.round(13 / zoom) + 'px "Atkinson Hyperlegible",sans-serif';
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(Math.round(R.spent) + " ether, about " + Math.round(dm) + " damage, " + wd.toFixed(1) + " cells wide", P.x, P.y + 62 / zoom);
    }
    ctx.setLineDash([10, 10]);
    ctx.strokeStyle = "rgba(79,227,208,.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (const s of [-1, 1]) {
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx + Math.cos(P.a + s * TUNE.railArc) * 900, ry + Math.sin(P.a + s * TUNE.railArc) * 900);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = ch ? "rgba(255,255,255,.85)" : "rgba(79,227,208,.5)";
    ctx.lineWidth = ch ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.lineTo(rx + Math.cos(P.a + rel) * (ch ? 2400 : 700), ry + Math.sin(P.a + rel) * (ch ? 2400 : 700));
    ctx.stroke();
    if (ch) {
      const cf = clamp(S.rail.spent / (0.8 * (S.rail.p0 || 1)), 0, 1), ok = S.rail.spent >= 0.2 * S.rail.p0 - 0.01, half = TUNE.railHalf0 + TUNE.railHalf1 * cf;
      ctx.lineCap = "butt";
      ctx.strokeStyle = ok ? "rgba(120,255,160," + (0.07 + 0.08 * cf) + ")" : "rgba(255,255,255,.05)";
      ctx.lineWidth = 2 * half;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx + Math.cos(P.a + rel) * 2400, ry + Math.sin(P.a + rel) * 2400);
      ctx.stroke();
    }
    ctx.restore();
  }
  if (S.rail && S.rail.on && P.rails.length && !P.form) {
    const [rx, ry] = wpos(P, P.rails[0]), k = clamp(S.rail.c / TUNE.railTime, 0, 1);
    const ok = S.rail.spent >= 0.2 * S.rail.p0 - 0.01;
    ctx.strokeStyle = ok ? "rgba(120,255,160," + (0.5 + 0.5 * k) + ")" : "rgba(255,255,255," + (0.3 + 0.6 * k) + ")";
    ctx.lineWidth = ok ? 3.5 : 2;
    ctx.beginPath();
    ctx.arc(rx, ry, 14 + 26 * k + 4 * Math.sin(S.t * 20), 0, TAU);
    ctx.stroke();
  }
  for (const q of rifts) {
    if (!vis(q.x, q.y, 80)) continue;
    const k = clamp(q.t / 1.6, 0, 1);
    ctx.strokeStyle = C.hostile;
    ctx.globalAlpha = 0.9 - 0.6 * k;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(q.x, q.y, 14 + 56 * k, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  for (const b of bombs) {
    if (!vis(b.x, b.y, b.r)) continue;
    const k = 1 - b.t / b.max;
    ctx.fillStyle = "rgba(229,72,77," + (0.06 + 0.2 * k) + ")";
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = C.hostile;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r * k, 0, TAU);
    ctx.stroke();
  }
  for (const e of enemies) {
    if (!vis(e.x, e.y, e.r)) continue;
    const T = ET[e.type];
    e.hostile = true;
    drawBlocks(e, e.blocks, e.flash > 0 ? "#ffffff" : SET.look === "classic" ? C.hostile : null);
    drawWarn(e);
    if (e.type === "carrier") {
      ctx.save();
      ctx.strokeStyle = "#ff9aa0";
      ctx.globalAlpha = 0.3 + 0.15 * Math.sin(S.t * 3);
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.arc(e.x, e.y, TUNE.carrierR, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
    ;
    if (T.boss) {
      const sh2 = e.ph === 0;
      ctx.strokeStyle = sh2 ? C.hostile : C.dim;
      ctx.globalAlpha = sh2 ? 0.75 + 0.2 * Math.sin(S.t * 8) : 0.35;
      ctx.lineWidth = sh2 ? 4 : 1.5;
      if (!sh2) ctx.setLineDash([6, 10]);
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r + 12, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
    if (e.crippled && e.blocks.length) {
      ctx.strokeStyle = C.hostile;
      ctx.globalAlpha = 0.55 + 0.3 * Math.sin(S.t * 6);
      ctx.lineWidth = 1.5;
      for (const b of e.blocks) {
        const [bx, by] = blockWorld(e, b);
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(e.a);
        ctx.strokeRect(-CELL * 0.5, -CELL * 0.5, CELL, CELL);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
    if (T.front) {
      ctx.strokeStyle = C.ink;
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r + 8, e.a - 1.15 * (e.p.arc || 1), e.a + 1.15 * (e.p.arc || 1));
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (e.capK) {
      ctx.strokeStyle = C.scrap;
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r + 10, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = C.scrap;
      ctx.font = '700 11px "Atkinson Hyperlegible",sans-serif';
      ctx.textAlign = "center";
      ctx.fillText(e.name, e.x, e.y - e.r - 16);
    }
    if (T.support && e.awake) {
      ctx.strokeStyle = C.hostile;
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.arc(e.x, e.y, 420, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
    if (e.buff > 0) {
      ctx.strokeStyle = C.hostile;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r + 4, 0, TAU);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(7,8,11,.82)";
    ctx.beginPath();
    ctx.arc(e.x, e.y, 8, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = '700 11px "Atkinson Hyperlegible",sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(T.mark, e.x, e.y + 0.5);
    ctx.textBaseline = "alphabetic";
    {
      const hf = clamp(e.hp / Math.max(1, e.max), 0, 1) * Math.min(1, e.blocks.length / Math.max(1, e.n0));
      if (hf < 0.999) {
        ctx.fillStyle = "rgba(229,72,77,.25)";
        ctx.fillRect(e.x - e.r, e.y - e.r - 9, e.r * 2, 3);
        ctx.fillStyle = C.hostile;
        ctx.fillRect(e.x - e.r, e.y - e.r - 9, e.r * 2 * hf, 3);
      }
    }
  }
  ctx.font = '700 12px "Atkinson Hyperlegible",sans-serif';
  ctx.textAlign = "center";
  for (const f of floats) {
    ctx.globalAlpha = clamp(f.t / 0.4, 0, 1);
    ctx.fillStyle = f.dim ? C.dim : C.ink;
    if (f.big) {
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.scale(2.2, 2.2);
      ctx.textAlign = "center";
      ctx.fillText(f.txt, 0, 0);
      ctx.restore();
    } else ctx.fillText(f.txt, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  const sat = S.depth > 0 ? (1 - Math.min(0.92, S.depth / 3e3)).toFixed(2) : "", hk = clamp((S.hd || 0) / TUNE.holCold, 0, 1), filt = [hk > 0 ? "saturate(" + (1 - 0.82 * hk).toFixed(2) + ") contrast(" + (1 + 0.08 * hk).toFixed(2) + ")" : "", sat ? "saturate(" + sat + ")" : ""].join(" ").trim();
  if (filt !== lastFilter) {
    lastFilter = filt;
    cv.style.filter = filt;
  }
  drawParticles();
  drawClouds();
  {
    ctx.save();
    toWorld();
    for (const e of enemies) if (e.wT > 0 || e.wFlash > 0) drawWarn(e);
    ctx.restore();
  }
  ctx.save();
  toWorld();
  drawRibbon();
  if (!S.over) {
    for (const w of copies) {
      if (!vis(w.x, w.y, w.radius + 40)) continue;
      ctx.strokeStyle = PAL[1];
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(P.x, P.y);
      ctx.lineTo(w.x, w.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
      drawBlocks(w, w.blocks);
      if (w.shMax > 0 && w.shield > 0.5) {
        const hit = clamp(1 - (S.t - w.hitT) * 1.6, 0, 1);
        ctx.globalAlpha = 0.1 + 0.5 * hit;
        ctx.strokeStyle = PAL[0];
        ctx.lineWidth = 1.5 + 2 * hit;
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.radius + 8, 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    copyPreview();
  }
  if (!S.over && !P.form && S.started) {
    ctx.save();
    ctx.translate(P.x, P.y);
    ctx.rotate(P.a);
    {
      const sh2 = P.shell || [], pass = (f, col, al, w) => {
        ctx.strokeStyle = col;
        ctx.globalAlpha = al;
        ctx.lineWidth = w;
        ctx.beginPath();
        for (const s of sh2) if (f(s)) {
          ctx.moveTo(s.x1, s.y1);
          ctx.lineTo(s.x2, s.y2);
        }
        ctx.stroke();
      }, fresh = (s) => S.t - (s.hit || -9) < 0.25;
      ctx.lineCap = "round";
      pass((s) => s.hp > 0, PAL[0], 0.16, 5);
      pass((s) => s.hp >= s.max * 0.5 && !fresh(s), PAL[0], 0.8, 1.8);
      pass((s) => s.hp > 0 && s.hp < s.max * 0.5 && !fresh(s), "#ffb000", 0.85, 1.8);
      pass((s) => s.hp > 0 && fresh(s), "#ffffff", 1, 2.6);
      ctx.setLineDash([2, 5]);
      pass((s) => s.hp <= 0, C.hostile, 0.35, 1);
      ctx.setLineDash([]);
      ctx.lineCap = "butt";
    }
    ctx.globalAlpha = 1;
    if (S.rb) {
      ctx.strokeStyle = PAL[0];
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.45 + 0.3 * Math.sin(S.t * 9);
      for (const q of P.slots) if (q.frame) ctx.strokeRect(q.x * CELL - CELL / 2 + 1, q.y * CELL - CELL / 2 + 1, CELL - 3, CELL - 3);
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, CELL * 0.9, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, S.rb.t / S.rb.dur));
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  if (!S.over && S.started) {
    if (!P.form) {
      if (S.spawn > 0) {
        ctx.save();
        ctx.globalAlpha = clamp(1 - S.spawn / 1.4, 0, 1);
      }
      drawBlocks(P, P.blocks);
      if (S.spawn > 0) {
        ctx.restore();
        ctx.strokeStyle = PAL[0];
        ctx.globalAlpha = clamp(S.spawn / 1.4, 0, 1) * 0.8;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(P.x, P.y, P.radius + 260 * (S.spawn / 1.4), 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    if (!P.form) {
      const k = S.shield / Math.max(S.smax, 1), hit = clamp(1 - (S.t - S.lastHit) * 2, 0, 1), sh2 = shapes().shapeS, lp = sh2.loops[0];
      ctx.save();
      ctx.translate(P.x, P.y);
      ctx.rotate(P.a);
      ctx.strokeStyle = PAL[0];
      ctx.lineJoin = "round";
      if (lp) {
        {
          const zo = clamp((0.62 - zoom) / 0.3, 0, 1);
          if (zo > 0 && S.shield > 0.5) {
            ctx.globalAlpha = zo * (0.1 + 0.08 * k + 0.06 * Math.sin(S.t * 2.4)) + 0.2 * hit * zo;
            ctx.fillStyle = PAL[0];
            shapePath(ctx, lp, 1);
            ctx.fill();
          }
        }
        {
          const low = S.shield > 0.5 && k < 0.35 ? 0.45 + 0.2 * Math.sin(S.t * 5) : 0, vis2 = Math.max(hit, low);
          if (S.shield > 0.5 && vis2 > 0.03) {
            ctx.globalAlpha = Math.min(1, 0.2 + 0.7 * vis2);
            ctx.lineWidth = 1.6 + 2 * hit;
            ctx.setLineDash(k < 0.999 ? [lp.len * k, lp.len] : []);
            shapePath(ctx, lp, k);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    if (!P.form && SET.shieldSec && S.sec && S.smax > 0) {
      const R2 = P.radius + 20, cols = ["#ffb000", "#7ee0ff", "#ffffff"], a0 = [-Math.PI / 2 - 0.2, Math.PI / 6 - 0.2, 5 * Math.PI / 6 - 0.2];
      ctx.save();
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = cols[i];
        ctx.globalAlpha = 0.2;
        ctx.beginPath();
        ctx.arc(P.x, P.y, R2, P.a + a0[i], P.a + a0[i] + 1.7);
        ctx.stroke();
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(P.x, P.y, R2, P.a + a0[i], P.a + a0[i] + 1.7 * clamp(S.sec[i], 0, 1));
        ctx.stroke();
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    if (!P.form) {
      const co = P.blocks.find((b) => b.t === "core"), cf = co ? clamp(co.hp / BT.core.hp, 0, 1) : 1;
      if (cf < 1 && (cf < 0.3 || S.t - S.lastHit < 2.5)) {
        const R2 = P.radius + 4;
        ctx.strokeStyle = cf < 0.3 ? C.hostile : C.ink;
        ctx.globalAlpha = cf < 0.3 ? 0.55 + 0.35 * Math.sin(S.t * 8) : 0.55;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(P.x, P.y, R2, Math.PI / 2 - Math.PI / 3 * cf, Math.PI / 2 + Math.PI / 3 * cf);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }
  if (S.started && !S.over && !P.form) {
    const R = P.radius + 15, a0 = -Math.PI / 2;
    ctx.strokeStyle = PAL[0];
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(P.x, P.y, R, a0, a0 + TAU * S.fill);
    ctx.stroke();
    const an = a0 + TAU * 0.4;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(P.x + Math.cos(an) * (R - 3), P.y + Math.sin(an) * (R - 3));
    ctx.lineTo(P.x + Math.cos(an) * (R + 3), P.y + Math.sin(an) * (R + 3));
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (S.started && !S.over && !P.form) {
    const have = [1, P.minis.length, P.racks.length], cd = [S.fireCd, S.miniCd, S.missCd], n = have.filter(Boolean).length;
    let x = P.x - (n * 16 - 4) / 2;
    const y = P.y + P.radius + 38;
    for (let i = 0; i < 3; i++) {
      if (!have[i]) continue;
      const f = 1 - clamp(cd[i] / S.cdMax[i], 0, 1), hot = i === 2 && S.fast;
      ctx.fillStyle = C.line;
      ctx.fillRect(x, y, 12, 3);
      ctx.fillStyle = f >= 1 ? hot ? "#ffffff" : C.ether : hot ? C.pale : C.dim;
      ctx.fillRect(x, y, 12 * f, 3);
      if (i === 2 && P.racks.length > 1 && S.racksFired) {
        ctx.fillStyle = hot ? "#ffffff" : C.dim;
        ctx.font = '700 9px "Atkinson Hyperlegible",sans-serif';
        ctx.textAlign = "center";
        ctx.fillText(S.racksFired, x + 6, y + 13);
      }
      x += 16;
    }
  }
  if ((S.ram || 0) > 0.04 && S.started && !S.over && !P.form) {
    const y = P.y + P.radius + 46;
    ctx.fillStyle = C.line;
    ctx.fillRect(P.x - 14, y, 28, 2);
    ctx.fillStyle = S.ram >= 1 ? "#ffffff" : C.dim;
    ctx.fillRect(P.x - 14, y, 28 * S.ram, 2);
  }
  if (S.halo > 1 && !S.over && S.started && !P.form) {
    const q = S.halo / S.haloMax, lp = shapes().shapeH.loops[0];
    if (lp) {
      ctx.save();
      ctx.translate(P.x, P.y);
      ctx.rotate(P.a);
      ctx.lineJoin = "round";
      ctx.strokeStyle = PAL[1];
      ctx.globalAlpha = Math.min(1, 0.1 + 0.12 * q + 0.6 * clamp(1 - (S.t - S.lastHit) * 3, 0, 1));
      ctx.lineWidth = 1.2 + 1.2 * q;
      shapePath(ctx, lp, 1);
      ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }
  if (S.started && !S.over && !P.form) {
    S.cmp += ((S.hostile > 0 || S.t - S.lastHit < 3 ? 0 : 1) - S.cmp) * Math.min(1, DT * 2);
    const k = S.cmp, R = P.radius + 44;
    if (k > 0.02) {
      ctx.strokeStyle = C.ink;
      ctx.globalAlpha = 0.1 * k;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(P.x, P.y, R, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 0.5 * k;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2;
        ctx.moveTo(P.x + Math.cos(a) * (R - 4), P.y + Math.sin(a) * (R - 4));
        ctx.lineTo(P.x + Math.cos(a) * (R + 4), P.y + Math.sin(a) * (R + 4));
      }
      ctx.stroke();
      ctx.fillStyle = C.ink;
      ctx.globalAlpha = 0.55 * k;
      ctx.font = '700 10px "Atkinson Hyperlegible",sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      [["E", 0], ["S", 1], ["W", 2], ["N", 3]].forEach(([t, i]) => {
        const a = i * Math.PI / 2;
        ctx.fillText(t, P.x + Math.cos(a) * (R + 14), P.y + Math.sin(a) * (R + 14));
      });
      ctx.textBaseline = "alphabetic";
      ctx.globalAlpha = 0.75 * k;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(P.x + Math.cos(P.a) * (R + 8), P.y + Math.sin(P.a) * (R + 8));
      ctx.lineTo(P.x + Math.cos(P.a + 0.08) * (R - 1), P.y + Math.sin(P.a + 0.08) * (R - 1));
      ctx.lineTo(P.x + Math.cos(P.a - 0.08) * (R - 1), P.y + Math.sin(P.a - 0.08) * (R - 1));
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    drawEvArrow(R);
    if (!S.paused) for (let i = 0, n = 0; i < rifts.length && n < 4; i++) {
      const q = rifts[i];
      if (q.t < 0.2) continue;
      n++;
      const ra = Math.atan2(q.y - P.y, q.x - P.x);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = C.hostile;
      ctx.beginPath();
      ctx.moveTo(P.x + Math.cos(ra) * (R + 10), P.y + Math.sin(ra) * (R + 10));
      ctx.lineTo(P.x + Math.cos(ra + 0.1) * (R - 2), P.y + Math.sin(ra + 0.1) * (R - 2));
      ctx.lineTo(P.x + Math.cos(ra - 0.1) * (R - 2), P.y + Math.sin(ra - 0.1) * (R - 2));
      ctx.closePath();
      ctx.fill();
      ctx.font = '700 10px "Atkinson Hyperlegible",sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(q.t.toFixed(1), P.x + Math.cos(ra) * (R + 24), P.y + Math.sin(ra) * (R + 24));
      ctx.textBaseline = "alphabetic";
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
  if (S.boost && SET.look !== "classic" && !calmMotion && S.started && !S.over) {
    const sp = Math.hypot(P.vx, P.vy) || 1, ux = P.vx / sp, uy = P.vy / sp;
    ctx.strokeStyle = "rgba(230,232,234,.16)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let k = 0; k < 14; k++) {
      const side = Math.random() < 0.5, x = side ? Math.random() < 0.5 ? rnd(0, W * 0.12) : rnd(W * 0.88, W) : rnd(0, W), y = side ? rnd(0, H) : Math.random() < 0.5 ? rnd(0, H * 0.12) : rnd(H * 0.88, H), L = rnd(40, 110);
      ctx.moveTo(x, y);
      ctx.lineTo(x - ux * L, y - uy * L);
    }
    ctx.stroke();
  }
  if (S.hd > 0.02 && S.started && !S.over) {
    const hv = clamp(S.hd / TUNE.holCold, 0, 1), g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.7);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0," + (0.62 + 0.08 * Math.sin(S.t * 3)) * hv + ")");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  if (S.started && !S.over) {
    if (S.corr > 0.02) {
      ctx.fillStyle = "rgba(150,90,220," + 0.08 * S.corr * (1 + 0.15 * Math.sin(S.t * 2)) + ")";
      ctx.fillRect(0, 0, W, H);
    }
    if (S.depth >= TUNE.edgeCracks) {
      const ck = clamp((S.depth - TUNE.edgeCracks) / 1e4, 0, 1);
      ctx.strokeStyle = "rgba(230,232,234," + (0.12 + 0.2 * ck) + ")";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const side = i % 4, t = hash2(i, 1, 9), sx = side === 0 ? W * t : side === 1 ? W : side === 2 ? W * t : 0, sy = side === 0 ? 0 : side === 1 ? H * t : side === 2 ? H : H * t, ang = Math.atan2(H / 2 - sy, W / 2 - sx) + (hash2(i, 2, 9) - 0.5) * 0.8, len = (80 + 260 * ck) * (0.6 + hash2(i, 3, 9));
        let x = sx, y = sy;
        ctx.moveTo(x, y);
        for (let j = 0; j < 7; j++) {
          const a = ang + (hash2(i, 10 + j, 9) - 0.5) * 1.1;
          x += Math.cos(a) * len / 7;
          y += Math.sin(a) * len / 7;
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }
  }
  if (S.started && !S.over && !build) {
    let n = 0;
    ctx.fillStyle = C.hostile;
    const arrow = (wx, wy) => {
      const sx = (wx - cam.x) * zoom, sy = (wy - cam.y) * zoom;
      if (Math.abs(sx) < W / 2 - 10 && Math.abs(sy) < H / 2 - 10) return;
      if (++n > 14) return;
      const a = Math.atan2(sy, sx), k = Math.min((W / 2 - 26) / Math.abs(Math.cos(a) || 1e-6), (H / 2 - 26) / Math.abs(Math.sin(a) || 1e-6)), x = W / 2 + Math.cos(a) * k, y = H / 2 + Math.sin(a) * k;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(9, 0);
      ctx.lineTo(-6, -6);
      ctx.lineTo(-6, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };
    for (const q of rifts) arrow(q.x, q.y);
    for (const e of enemies) if (e.wave) arrow(e.x, e.y);
    n = 0;
    ctx.fillStyle = C.ether;
    for (const w of wrecks) if (w.drawT > S.t - 0.4) arrow(w.x, w.y);
  }
  if (!S.started) menuShip();
  if (build) drawBuild();
  drawMini();
  if (S.mapOn && S.started && !build) drawMap();
}
const washes = {};
function chartWash(key, cx, cy, R, n) {
  const c = washes[key];
  if (c && c.cx === cx && c.cy === cy && c.R === R && c.n === n && c.fog === S.fog.size && c.seen === S.seenR.length && S.frame - c.at < 300) return c.cv;
  const cv2 = c && c.cv.width === n ? c.cv : document.createElement("canvas");
  if (cv2.width !== n) cv2.width = cv2.height = n;
  const g = cv2.getContext("2d"), img = g.createImageData(n, n), ids = new Int32Array(n * n), fa = new Float32Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = cx + ((i + 0.5) / n * 2 - 1) * R, y = cy + ((j + 0.5) / n * 2 - 1) * R, p = j * n + i, f = x * x + y * y > WORLD * WORLD ? 0 : fogAlpha(x, y);
    fa[p] = f;
    ids[p] = f ? regionAt(x, y).i : -1;
  }
  const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)], cols = {};
  for (let p = 0; p < n * n; p++) {
    const id = ids[p];
    if (id < 0) continue;
    const s = sites[id], q = p * 4, f = fa[p], edge = p % n < n - 1 && ids[p + 1] >= 0 && ids[p + 1] !== id || p + n < n * n && ids[p + n] >= 0 && ids[p + n] !== id;
    let col = cols[s.k] || (cols[s.k] = rgb(RT[s.k].col)), a = Math.max(0.3, MAPA[s.k] || 0) * f;
    if (edge) {
      col = [230, 232, 234];
      a = 0.55 * f;
    }
    img.data[q] = col[0];
    img.data[q + 1] = col[1];
    img.data[q + 2] = col[2];
    img.data[q + 3] = Math.round(a * 255);
  }
  g.putImageData(img, 0, 0);
  washes[key] = { cv: cv2, cx, cy, R, n, fog: S.fog.size, seen: S.seenR.length, at: S.frame };
  return cv2;
}
function chartMarks(g, X, Y, k, u, o) {
  const ok = (x, y) => o.inV(x, y) && fogged(x, y), sg2 = o.sight * o.sight, near2 = (x, y) => (x - P.x) ** 2 + (y - P.y) ** 2;
  mapRivers(g, X, Y, k, ok, u, o.mini ? "mini" : "map");
  for (const c of corrs) {
    if (!c.seen || !o.inV(c.x, c.y, c.R)) continue;
    if (!c.b) corrShape(c);
    g.beginPath();
    c.b.pts.forEach((q, i) => g[i ? "lineTo" : "moveTo"](X(q[0]), Y(q[1])));
    g.closePath();
    g.fillStyle = "rgba(150,90,220,.14)";
    g.fill();
    g.strokeStyle = "rgba(150,90,220,.7)";
    g.lineWidth = 1.5 * u;
    g.stroke();
  }
  for (const z of zones) {
    if (z.dead || !ok(z.x, z.y)) continue;
    g.strokeStyle = z.heart ? "#b07cff" : C.hostile;
    g.lineWidth = 1.5 * u;
    g.beginPath();
    g.arc(X(z.x), Y(z.y), Math.max(3 * u, z.R * k), 0, TAU);
    g.stroke();
  }
  if (o.mini) for (const r of rocks) {
    if (!r.rich || !o.inV(r.x, r.y) || near2(r.x, r.y) > sg2) continue;
    g.fillStyle = PAL[0];
    g.fillRect(X(r.x) - 2 * u, Y(r.y) - 2 * u, 4 * u, 4 * u);
  }
  g.strokeStyle = C.dim;
  g.lineWidth = u;
  const wz = o.mini ? 1 : 1.5;
  for (const w of wrecks) {
    if (w.ck != null || !o.inV(w.x, w.y) || !(w.seen || near2(w.x, w.y) < sg2)) continue;
    const z = (w.big ? 8 : 6) * u / wz;
    g.strokeRect(X(w.x) - z / 2, Y(w.y) - z / 2, z, z);
  }
  for (const key in S.marks) {
    const m = S.marks[key];
    if (!o.inV(m[0], m[1])) continue;
    const z = (m[2] ? 8 : 6) * u / wz;
    g.globalAlpha = near2(m[0], m[1]) < sg2 ? 1 : 0.5;
    g.strokeRect(X(m[0]) - z / 2, Y(m[1]) - z / 2, z, z);
  }
  g.globalAlpha = 1;
  if (o.path && S.path.length > 1) {
    g.strokeStyle = PAL[0];
    g.globalAlpha = 0.55;
    g.lineWidth = 1.5 * u;
    g.beginPath();
    S.path.forEach((q, i) => g[i ? "lineTo" : "moveTo"](X(q[0]), Y(q[1])));
    g.lineTo(X(P.x), Y(P.y));
    g.stroke();
    g.globalAlpha = 1;
  }
  g.textAlign = "center";
  g.textBaseline = "middle";
  for (const s of sites) {
    if (!ok(s.x, s.y)) continue;
    if (o.mini && near2(s.x, s.y) < (o.R * 0.3) ** 2) continue;
    const kn = S.felt[s.k];
    g.fillStyle = kn ? C.ink : C.dim;
    g.globalAlpha = o.mini ? 0.85 : fogAlpha(s.x, s.y) > 0.9 ? 1 : 0.6;
    g.font = "700 " + Math.round((o.mini ? 10 : kn ? 13 : 18) * u) + 'px "Atkinson Hyperlegible",sans-serif';
    g.fillText(kn ? RT[s.k].name : "?", X(s.x), Y(s.y));
    if (!o.mini && kn && s.w) {
      const a = s.ph + s.w * S.wt + (s.w > 0 ? Math.PI / 2 : -Math.PI / 2), x = X(s.x), y = Y(s.y) + 16 * u;
      g.strokeStyle = C.dim;
      g.lineWidth = 1.5 * u;
      g.beginPath();
      g.moveTo(x - Math.cos(a) * 12 * u, y - Math.sin(a) * 12 * u);
      g.lineTo(x + Math.cos(a) * 12 * u, y + Math.sin(a) * 12 * u);
      g.lineTo(x + Math.cos(a + 2.6) * 5 * u, y + Math.sin(a + 2.6) * 5 * u);
      g.stroke();
    }
  }
  drawStationMarks(g, o, X, Y, ok, u);
  g.globalAlpha = 1;
  g.textBaseline = "alphabetic";
  const tri = (x, y, a, z) => {
    g.beginPath();
    g.moveTo(x + Math.cos(a) * z, y + Math.sin(a) * z);
    g.lineTo(x + Math.cos(a + 2.5) * z * 0.8, y + Math.sin(a + 2.5) * z * 0.8);
    g.lineTo(x + Math.cos(a - 2.5) * z * 0.8, y + Math.sin(a - 2.5) * z * 0.8);
    g.closePath();
    g.fill();
  };
  const fogR = S.cloud > 0.4 ? 1200 * 1200 : sg2;
  g.fillStyle = C.hostile;
  for (const e of enemies) {
    if (!o.inV(e.x, e.y) || near2(e.x, e.y) > fogR) continue;
    const sp = Math.hypot(e.vx, e.vy);
    tri(X(e.x), Y(e.y), sp > 20 ? Math.atan2(e.vy, e.vx) : e.a, (ET[e.type].boss ? 9 : 4.5) * u);
  }
  g.strokeStyle = C.hostile;
  g.lineWidth = 1.5 * u;
  const pulse = 1 + 0.35 * Math.sin(S.t * 8);
  for (const q of rifts) {
    if (!o.inV(q.x, q.y)) continue;
    g.beginPath();
    g.arc(X(q.x), Y(q.y), 5 * u * pulse, 0, TAU);
    g.stroke();
  }
  g.fillStyle = PAL[1];
  for (const w of copies) if (o.inV(w.x, w.y)) g.fillRect(X(w.x) - 3 * u, Y(w.y) - 3 * u, 6 * u, 6 * u);
  g.fillStyle = "#fff";
  tri(X(P.x), Y(P.y), P.a, 7 * u);
  return tri;
}
function drawMini() {
  if (S.frame % 4) return;
  const N = mini.width, R = MZ[SET.mz], k = N / 2 / R, u = N / 280, h = N / 2, inV = (x, y, r) => Math.abs(x - P.x) < R + (r || 0) && Math.abs(y - P.y) < R + (r || 0);
  if (S.depth >= TUNE.edgeCracks && Math.random() < 0.35) return;
  mx2.clearRect(0, 0, N, N);
  mx2.save();
  mx2.translate(h, h);
  const X = (x) => (x - P.x) * k, Y = (y) => (y - P.y) * k;
  if (sites.length) {
    const q = R / 40, qx = Math.round(P.x / q) * q, qy = Math.round(P.y / q) * q, wash = chartWash("mini", qx, qy, R, 96);
    mx2.imageSmoothingEnabled = true;
    mx2.drawImage(wash, X(qx - R), Y(qy - R), 2 * R * k, 2 * R * k);
  }
  mx2.strokeStyle = "rgba(138,145,156,.3)";
  mx2.lineWidth = 2 * u;
  mx2.beginPath();
  mx2.arc(X(0), Y(0), WORLD * k, 0, TAU);
  mx2.stroke();
  const tri = chartMarks(mx2, X, Y, k, u, { mini: true, R, inV, sight: sightR(), path: false });
  const far = rifts.concat(enemies.filter((e) => e.wave)).map((q) => [X(q.x), Y(q.y)]).filter((q) => q[0] * q[0] + q[1] * q[1] > (h - 8 * u) ** 2);
  mx2.fillStyle = C.hostile;
  for (const [x, y] of far.slice(0, 12)) {
    const a = Math.atan2(y, x), m = h - 7 * u;
    tri(Math.cos(a) * m, Math.sin(a) * m, a, 5 * u);
  }
  const od = Math.hypot(P.x, P.y);
  if (od > WORLD) {
    const a = Math.atan2(-P.y, -P.x), m = h - 9 * u;
    mx2.fillStyle = C.ink;
    tri(Math.cos(a) * m, Math.sin(a) * m, a, 7 * u);
  }
  mx2.restore();
}
let mapV = { x: 0, y: 0, R: 6e4 }, mapDrag = null, mapT = -99;
function toggleMap() {
  S.mapOn = !S.mapOn;
  $("stage").classList.toggle("mapping", S.mapOn);
  mapDrag = null;
  if (S.mapOn) {
    mapT = -99;
    mapV.x = P.x;
    mapV.y = P.y;
  }
}
function drawWarn(e) {
  if (!(e.wT > 0 || e.wFlash > 0)) return;
  const k2 = e.wFlash > 0 ? 1 : 1 - e.wT / 2, L = 2600, ux = Math.cos(e.wA), uy = Math.sin(e.wA);
  ctx.save();
  ctx.lineCap = "butt";
  ctx.strokeStyle = C.hostile;
  ctx.globalAlpha = e.wFlash > 0 ? 0.9 : 0.12 + 0.28 * k2 + 0.1 * Math.sin(S.t * 18);
  ctx.lineWidth = e.wFlash > 0 ? (e.wW || 26) * 2 : (e.wW || 26) * 2 * (0.35 + 0.65 * k2);
  ctx.beginPath();
  ctx.moveTo(e.x, e.y);
  ctx.lineTo(e.x + ux * L, e.y + uy * L);
  ctx.stroke();
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(e.x, e.y);
  ctx.lineTo(e.x + ux * L, e.y + uy * L);
  ctx.stroke();
  ctx.restore();
}
let cloudCv = null, cloudCx = null, cloudImg = null, cloudT = -99;
function drawClouds() {
  if (!S.started || S.over) return;
  const cw = 64, ch = Math.max(24, Math.round(64 * H / Math.max(1, W)));
  if (!cloudCv || cloudCv.width !== cw || cloudCv.height !== ch) {
    cloudCv = document.createElement("canvas");
    cloudCv.width = cw;
    cloudCv.height = ch;
    cloudCx = cloudCv.getContext("2d");
    cloudImg = cloudCx.createImageData(cw, ch);
    cloudT = -99;
  }
  if (S.frame - cloudT >= 3) {
    cloudT = S.frame;
    const d = cloudImg.data, wx0 = cam.x - W / 2 / zoom, wy0 = cam.y - H / 2 / zoom, sx = W / zoom / cw, sy = H / zoom / ch, clear = clamp(0.3 * (P.sensor || 0), 0, 0.9);
    for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
      const x = wx0 + (i + 0.5) * sx, y = wy0 + (j + 0.5) * sy, dd = Math.hypot(x - P.x, y - P.y), near = clamp((dd - 350) / 1300, 0, 1);
      let cd = cloudAt(x, y);
      if (clear > 0) cd *= 1 - clear * clamp(1 - dd / 3500, 0, 1);
      const cc = corrDen(x, y);
      const a = Math.max(cd * 0.42, cc * 0.8) * near, pm = cc / (cc + cd * 0.5 + 1e-6), k = (j * cw + i) * 4;
      d[k] = 150 * (1 - pm) + 78 * pm;
      d[k + 1] = 130 * (1 - pm) + 22 * pm;
      d[k + 2] = 200 * (1 - pm) + 125 * pm;
      d[k + 3] = a * 255;
    }
    cloudCx.putImageData(cloudImg, 0, 0);
  }
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(cloudCv, 0, 0, W, H);
  ctx.restore();
}
function mapGeo() {
  const u = UI, x0 = Math.round(Math.max(64 * u, W * 0.1, Math.min(256 * u, W / 2 - 22) + 60 * u)), y0 = Math.round(104 * u), w = W - 2 * x0, h = H - y0 - Math.round(124 * u), k = Math.min(w, h) / 2 / mapV.R;
  return { u, x0, y0, w, h, cx: x0 + w / 2, cy: y0 + h / 2, k };
}
function drawMap() {
  const { u, x0, y0, w, h, cx, cy, k } = mapGeo(), R = mapV.R, X = (x) => cx + (x - mapV.x) * k, Y = (y) => cy + (y - mapV.y) * k, Rx = w / 2 / k, Ry = h / 2 / k, inV = (x, y, r) => Math.abs(x - mapV.x) < Rx + (r || 0) && Math.abs(y - mapV.y) < Ry + (r || 0);
  ctx.fillStyle = "rgba(7,8,11,.82)";
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, w, h);
  ctx.clip();
  ctx.fillStyle = "rgba(11,13,18,.95)";
  ctx.fillRect(x0, y0, w, h);
  if (sites.length) {
    const RW = Math.max(Rx, Ry), q = RW / 120, qx = Math.round(mapV.x / q) * q, qy = Math.round(mapV.y / q) * q, n = Math.max(240, Math.min(400, Math.round(Math.max(w, h) / 2.4))), wash = chartWash("map", qx, qy, RW, n);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(wash, X(qx - RW), Y(qy - RW), 2 * RW * k, 2 * RW * k);
  }
  ctx.strokeStyle = "rgba(138,145,156,.5)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.arc(X(0), Y(0), WORLD * k, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  chartMarks(ctx, X, Y, k, u, { mini: false, R, inV, sight: sightR(), path: true });
  ctx.restore();
  ctx.strokeStyle = "rgba(138,145,156,.4)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1);
  const f = (s) => Math.round(s * u) + 'px "Atkinson Hyperlegible",sans-serif';
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.font = "700 " + f(16);
  ctx.fillStyle = C.ink;
  ctx.fillText("MAP", x0, y0 - 14 * u);
  ctx.font = f(13);
  ctx.fillStyle = C.dim;
  ctx.fillText("Tab closes  ·  drag to move  ·  wheel to zoom  ·  " + Math.round(R * 2 / 1e3) + "k across", x0 + 56 * u, y0 - 14 * u);
  {
    const ex = exploredNow();
    ctx.textAlign = "right";
    ctx.fillStyle = C.ink;
    ctx.fillText("Charted " + Math.round(ex.all * 100) + "%", x0 + w, y0 - 14 * u);
    ctx.textAlign = "left";
  }
  {
    const L = 1e4 * k, bx = x0, by = y0 + h + 24 * u;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + L, by);
    ctx.moveTo(bx, by - 5 * u);
    ctx.lineTo(bx, by + 5 * u);
    ctx.moveTo(bx + L, by - 5 * u);
    ctx.lineTo(bx + L, by + 5 * u);
    ctx.stroke();
    ctx.fillStyle = C.dim;
    ctx.font = f(12);
    ctx.fillText("10,000", bx + L + 8 * u, by + 4 * u);
  }
  {
    const items = [
      ["you", () => {
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.moveTo(8 * u, 0);
        ctx.lineTo(-5 * u, -5 * u);
        ctx.lineTo(-5 * u, 5 * u);
        ctx.closePath();
        ctx.fill();
      }],
      ["your path", () => {
        ctx.strokeStyle = PAL[0];
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-8 * u, 3 * u);
        ctx.lineTo(0, -3 * u);
        ctx.lineTo(8 * u, 2 * u);
        ctx.stroke();
      }],
      ["current", () => {
        ctx.strokeStyle = "rgba(120,240,225,.6)";
        ctx.lineWidth = 6 * u;
        ctx.beginPath();
        ctx.moveTo(-8 * u, 0);
        ctx.lineTo(8 * u, 0);
        ctx.stroke();
      }],
      ["wreck", () => {
        ctx.strokeStyle = C.dim;
        ctx.lineWidth = 1;
        ctx.strokeRect(-4 * u, -4 * u, 8 * u, 8 * u);
      }],
      ["pirate camp", () => {
        ctx.strokeStyle = C.hostile;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, 5 * u, 0, TAU);
        ctx.stroke();
      }],
      ["the Corruption", () => {
        ctx.fillStyle = "rgba(150,90,220,.3)";
        ctx.beginPath();
        ctx.arc(0, 0, 6 * u, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = "rgba(150,90,220,.8)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }],
      ["hostile", () => {
        ctx.fillStyle = C.hostile;
        ctx.beginPath();
        ctx.moveTo(6 * u, 0);
        ctx.lineTo(-4 * u, -4 * u);
        ctx.lineTo(-4 * u, 4 * u);
        ctx.closePath();
        ctx.fill();
      }]
    ];
    let x = x0 + w;
    ctx.font = f(12);
    ctx.textAlign = "right";
    for (let i = items.length - 1; i >= 0; i--) {
      const [name, draw2] = items[i], tw = ctx.measureText(name).width;
      ctx.fillStyle = C.dim;
      ctx.fillText(name, x, y0 + h + 28 * u);
      x -= tw + 12 * u;
      ctx.save();
      ctx.translate(x, y0 + h + 24 * u);
      draw2();
      ctx.restore();
      x -= 24 * u;
    }
  }
  if (mouse.x > x0 && mouse.x < x0 + w && mouse.y > y0 && mouse.y < y0 + h && sites.length) {
    const wx = mapV.x + (mouse.x - cx) / k, wy = mapV.y + (mouse.y - cy) / k;
    if (Math.hypot(wx, wy) < WORLD && fogged(wx, wy)) {
      const s = sites[regionAt(wx, wy).i], kn = S.felt[s.k], t1 = kn ? RT[s.k].name : "Unknown space";
      let t2 = kn ? RT[s.k].short : "Fly in to learn what it does";
      {
        const ek = exploredNow().kinds.find((q) => q[0] === s.k);
        if (kn && ek) t2 += " · " + Math.round(ek[1] * 100) + "% of such space charted";
      }
      ctx.font = "700 " + f(14);
      let tw = ctx.measureText(t1).width;
      ctx.font = f(12);
      tw = Math.max(tw, ctx.measureText(t2).width) + 20 * u;
      const bx = Math.min(mouse.x + 14, W - tw - 8), by = mouse.y + 14;
      ctx.fillStyle = "rgba(7,8,11,.92)";
      ctx.fillRect(bx, by, tw, 42 * u);
      ctx.strokeStyle = kn && RT[s.k].col !== "#000000" ? RT[s.k].col : "rgba(138,145,156,.5)";
      ctx.lineWidth = 1;
      ctx.strokeRect(bx + 0.5, by + 0.5, tw - 1, 42 * u - 1);
      ctx.textAlign = "left";
      ctx.fillStyle = kn ? C.ink : C.dim;
      ctx.font = "700 " + f(14);
      ctx.fillText(t1, bx + 10 * u, by + 17 * u);
      ctx.fillStyle = C.dim;
      ctx.font = f(12);
      ctx.fillText(t2, bx + 10 * u, by + 33 * u);
    }
  }
  ctx.textAlign = "left";
}
const curStat = { rivers: 0, paths: 0, strokes: 0, motes: 0, mapW: 0, mapRivers: 0, mapPaths: 0, miniW: 0 };
function riverPath(c) {
  if (c.path) return c.path;
  const p = c.pts, d = new Path2D();
  d.moveTo(p[0][0], p[0][1]);
  for (let i = 1; i < p.length - 1; i++) d.quadraticCurveTo(p[i][0], p[i][1], (p[i][0] + p[i + 1][0]) / 2, (p[i][1] + p[i + 1][1]) / 2);
  d.lineTo(p[p.length - 1][0], p[p.length - 1][1]);
  return c.path = d;
}
const RIV_LANES = 7, RIV_MOTE = 520;
function drawRivers(vw, vh, vis, calm) {
  curStat.rivers = curStat.paths = curStat.strokes = curStat.motes = 0;
  if (!currents.length || !S.started) return;
  const t = S.t, x0 = cam.x - vw, x1 = cam.x + vw, y0 = cam.y - vh, y1 = cam.y + vh;
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (const c of currents) {
    if (c.bb[2] < x0 || c.bb[0] > x1 || c.bb[3] < y0 || c.bb[1] > y1) continue;
    const path = riverPath(c);
    curStat.rivers++;
    curStat.paths++;
    ctx.strokeStyle = "rgba(79,227,208,.05)";
    ctx.lineWidth = CURW * 2;
    ctx.stroke(path);
    ctx.strokeStyle = "rgba(120,240,225,.045)";
    ctx.lineWidth = CURW * 0.75;
    ctx.stroke(path);
    curStat.strokes += 2;
    const n = c.pts.length;
    const m = c.pts[c.mouthI], e = c.pts[n - 1], fx = (e[0] - m[0]) / (RIV_STEP * RIV_TAIL), fy = (e[1] - m[1]) / (RIV_STEP * RIV_TAIL), nx = -fy, ny = fx;
    if (vis(e[0], e[1], 5200)) {
      const reach2 = RIV_STEP * RIV_TAIL + 2400, hw = 3e3, fx1 = m[0] + fx * reach2, fy1 = m[1] + fy * reach2;
      const g = ctx.createLinearGradient(m[0], m[1], fx1, fy1);
      g.addColorStop(0, "rgba(120,240,225,.11)");
      g.addColorStop(1, "rgba(79,227,208,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(m[0] + nx * CURW, m[1] + ny * CURW);
      ctx.quadraticCurveTo(m[0] + fx * reach2 * 0.55 + nx * hw * 0.9, m[1] + fy * reach2 * 0.55 + ny * hw * 0.9, fx1 + nx * hw, fy1 + ny * hw);
      ctx.lineTo(fx1 - nx * hw, fy1 - ny * hw);
      ctx.quadraticCurveTo(m[0] + fx * reach2 * 0.55 - nx * hw * 0.9, m[1] + fy * reach2 * 0.55 - ny * hw * 0.9, m[0] - nx * CURW, m[1] - ny * CURW);
      ctx.closePath();
      ctx.fill();
      if (!calm) {
        ctx.strokeStyle = "rgba(190,255,247,.4)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let r = -3; r <= 3; r++) {
          const ph = ((t * 0.7 + r * 0.173) % 1 + 1) % 1, a = ph * reach2, w = (CURW + (hw - CURW) * Math.pow(ph, 0.8)) * r / 3, sx = m[0] + fx * a + nx * w, sy = m[1] + fy * a + ny * w;
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + fx * 160 + nx * r * 18, sy + fy * 160 + ny * r * 18);
        }
        ctx.stroke();
      }
    }
    const sp = c.pts[0];
    if (vis(sp[0], sp[1], 5200)) {
      const pul = 0.5 + 0.5 * Math.sin(t * 1.6 + c.id), g = ctx.createRadialGradient(sp[0], sp[1], 0, sp[0], sp[1], 4200);
      g.addColorStop(0, "rgba(190,255,247," + (0.2 + 0.08 * pul) + ")");
      g.addColorStop(0.35, "rgba(79,227,208,.1)");
      g.addColorStop(1, "rgba(79,227,208,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(sp[0], sp[1], 4200, 0, TAU);
      ctx.fill();
      if (!calm) {
        ctx.strokeStyle = "rgba(190,255,247,.38)";
        ctx.lineWidth = 4;
        for (let arm = 0; arm < 4; arm++) {
          ctx.beginPath();
          const a0 = t * 0.9 + arm * TAU / 4 + c.id;
          for (let k = 0; k <= 16; k++) {
            const r = 150 + k * k * 10.4, a = a0 - k * 0.27;
            (k ? ctx.lineTo : ctx.moveTo).call(ctx, sp[0] + Math.cos(a) * r, sp[1] + Math.sin(a) * r);
          }
          ctx.stroke();
        }
      }
    }
    if (calm) continue;
    ctx.lineCap = "butt";
    const mid = [], edge = [];
    for (let i = 0; i < n - 1; i++) {
      const q = c.pts[i], r = c.pts[i + 1];
      if (!vis((q[0] + r[0]) / 2, (q[1] + r[1]) / 2, 1500)) continue;
      const a = i * RIV_STEP, b = a + RIV_STEP, dx = (r[0] - q[0]) / RIV_STEP, dy = (r[1] - q[1]) / RIV_STEP;
      for (let l = 0; l < RIV_LANES; l++) {
        const lf = (l - 3) / 3, v = 700 * (1.5 - 0.9 * Math.abs(lf)), ph = l * 173 % RIV_MOTE, tv = t * v + ph;
        for (let j = Math.ceil((a - tv) / RIV_MOTE); ; j++) {
          const s = j * RIV_MOTE + tv;
          if (s >= b) break;
          if (s < a) continue;
          const h = (j * 2654435761 + l * 40503 >>> 0) % 1e3 / 1e3, off = (lf * 0.8 + (h - 0.5) * 0.2) * CURW, f = s - a, px = q[0] + dx * f - dy * off, py = q[1] + dy * f + dx * off;
          (Math.abs(lf) < 0.4 ? mid : edge).push(px, py, dx, dy);
        }
      }
    }
    for (const [arr, col, lw, len] of [[edge, "rgba(150,250,235,.2)", 2, 70], [mid, "rgba(200,255,248,.4)", 2.8, 120]]) {
      if (!arr.length) continue;
      ctx.strokeStyle = col;
      ctx.lineWidth = lw;
      ctx.beginPath();
      for (let k = 0; k < arr.length; k += 4) {
        ctx.moveTo(arr[k], arr[k + 1]);
        ctx.lineTo(arr[k] + arr[k + 2] * len, arr[k + 1] + arr[k + 3] * len);
      }
      ctx.stroke();
      curStat.strokes++;
      curStat.motes += arr.length / 4;
    }
    ctx.lineCap = "round";
  }
  ctx.restore();
}
function mapRivers(g, X, Y, k, ok, u, which) {
  const w = Math.max(CURW * 2 * k, 2 * u);
  let paths = 0;
  if (which === "map") curStat.mapW = w / k;
  else curStat.miniW = w / k;
  const runs = [];
  for (const c of currents) {
    let cur = null, lastX = -1e9, lastY = -1e9;
    const rr = [];
    for (let i = 0; i < c.pts.length; i++) {
      const p = c.pts[i];
      if (!ok(p[0], p[1])) {
        cur = null;
        continue;
      }
      const x = X(p[0]), y = Y(p[1]);
      if (cur && i < c.pts.length - 1 && Math.hypot(x - lastX, y - lastY) < 2.5 * u) continue;
      if (!cur) {
        cur = [];
        rr.push(cur);
      }
      cur.push(x, y);
      lastX = x;
      lastY = y;
    }
    if (rr.length) runs.push({ c, rr });
  }
  g.save();
  g.lineJoin = "round";
  g.lineCap = "butt";
  const trace = () => {
    g.beginPath();
    for (const { rr } of runs) for (const run of rr) {
      if (run.length < 4) continue;
      g.moveTo(run[0], run[1]);
      for (let q = 2; q < run.length; q += 2) g.lineTo(run[q], run[q + 1]);
    }
  };
  trace();
  g.strokeStyle = "rgba(79,227,208,.16)";
  g.lineWidth = w;
  g.stroke();
  paths = runs.length;
  trace();
  g.strokeStyle = "rgba(120,240,225,.22)";
  g.lineWidth = w * 0.55;
  g.stroke();
  trace();
  g.strokeStyle = "rgba(210,255,249,.85)";
  g.lineWidth = Math.max(1.2 * u, w * 0.14);
  g.setLineDash([6 * u, 11 * u]);
  g.lineDashOffset = -(S.t * 22 * u) % (17 * u);
  g.stroke();
  g.setLineDash([]);
  g.fillStyle = "rgba(210,255,249,.9)";
  g.strokeStyle = "rgba(210,255,249,.9)";
  g.lineWidth = 1.4 * u;
  for (const { c } of runs) {
    const s = c.pts[0], m = c.pts[c.mouthI], e = c.pts[c.pts.length - 1];
    if (ok(s[0], s[1])) {
      g.beginPath();
      g.arc(X(s[0]), Y(s[1]), 3.2 * u, 0, TAU);
      g.stroke();
    }
    if (ok(e[0], e[1])) {
      const ex = X(e[0]), ey = Y(e[1]), a = Math.atan2(Y(e[1]) - Y(m[1]), X(e[0]) - X(m[0])), z = 5 * u;
      g.beginPath();
      g.moveTo(ex + Math.cos(a) * z, ey + Math.sin(a) * z);
      g.lineTo(ex + Math.cos(a + 2.4) * z, ey + Math.sin(a + 2.4) * z);
      g.lineTo(ex + Math.cos(a - 2.4) * z, ey + Math.sin(a - 2.4) * z);
      g.closePath();
      g.fill();
    }
  }
  g.restore();
  if (which === "map") {
    curStat.mapRivers = runs.length;
    curStat.mapPaths = paths;
  }
}
