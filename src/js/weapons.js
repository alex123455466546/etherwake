function boltDmg(w) {
  return 8 * (0.4 + 1.8 * w) * (S.mood === 1 ? 1.75 : 1);
}
const warhead = () => Math.min(TUNE.warheadCap, 1 + pool() / TUNE.warheadK);
function rackDmg(w) {
  return 34 * TUNE.missDmgK * (0.6 + 0.9 * w) * (S.mood === 1 ? 1.75 : 1) * (S.pri[2] === 2 ? 1.5 : 1) * warhead() * DK();
}
function armourOf(e) {
  const p = e.p || {};
  return Math.min(ET[e.type].front ? 0.6 : 1, p.front || 1, p.side || 1, p.back || 1) * (p.all || 1);
}
function hitMul(e, q) {
  const p = e.p || {}, a = Math.abs(q);
  return (a < Math.PI / 4 ? p.front || 1 : a > 3 * Math.PI / 4 ? p.back || 1 : p.side || 1) * (p.all || 1) * (a > 3 * Math.PI / 4 && ET[e.type].front ? TUNE.bulwarkBack : 1);
}
const shelled = (e) => !!ET[e.type].boss && e.ph === 0;
const rngK = () => (1 + 0.12 * Math.min(3, P.sensor || 0)) * EK("range");
function nudgeAim(x, y, a) {
  let best = null, bd = TUNE.aimCone;
  for (const e of enemies) {
    const dx = e.x - x, dy = e.y - y, dist = Math.hypot(dx, dy);
    if (dist > TUNE.aimRange || dist < 40) continue;
    const lt = dist / 860, ex = e.x + (e.vx || 0) * lt - x, ey = e.y + (e.vy || 0) * lt - y;
    let d = Math.atan2(ey, ex) - a;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    if (Math.abs(d) < bd) {
      bd = Math.abs(d);
      best = [d, dist];
    }
  }
  if (!best) return a;
  const close = clamp(1 - (best[1] - 300) / 900, 0, 1);
  return a + best[0] * (TUNE.aimPull + 0.3 * close);
}
function allRacks() {
  return P.racks.map((b) => [P, b]);
}
function volley(racks, w, full, f) {
  let n = racks.length;
  if (!full) {
    let need = 0;
    const R2 = TUNE.smartRange * TUNE.smartRange;
    for (const e of enemies) {
      if (!e.awake || (e.x - P.x) ** 2 + (e.y - P.y) ** 2 > R2 || shelled(e)) continue;
      need += Math.max(0, e.hp) / armourOf(e);
    }
    for (const b of bolts) if (b.f && b.m) need -= b.dmg;
    if (need <= 0) return;
    const per = racks.reduce((s, r) => s + (r[1].t === "battery" ? 4 : 1) * mkM(r[1]) * secM(r[1]), 0) / Math.max(1, racks.length);
    n = Math.min(n, Math.ceil(need * TUNE.smartSpare / (rackDmg(w) * per)));
    if (f < TUNE.chargeLow) n = Math.min(n, Math.max(1, Math.round(racks.length * clamp(TUNE.chargeMin + (1 - TUNE.chargeMin) * (f - 0.05) / (TUNE.chargeLow - 0.05), TUNE.chargeMin, 1))));
  }
  const by = /* @__PURE__ */ new Map();
  for (let i = 0; i < n; i++) {
    const r = racks[(S.rackI + i) % racks.length];
    if (!by.has(r[0])) by.set(r[0], []);
    by.get(r[0]).push(r[1]);
  }
  S.rackI = (S.rackI + n) % racks.length;
  S.racksFired = n;
  for (const [o, list] of by) fireFrom(o, list, w, 2);
  if (LOG) {
    LOG.row.vol++;
    LOG.row.rk += n;
    LOG.row.own = Math.max(LOG.row.own, racks.length);
    LOG.volleys++;
  }
}
function mirrorChance() {
  const p = TUNE.mirrorEach * (1 + S.halo / S.haloMax);
  return Math.min(TUNE.mirrorCap, 1 - Math.pow(1 - p, P.mirror));
}
function gunDir(o, b, kind) {
  const base = o.a + (b.fc | 0) * Math.PI / 2;
  if (o !== P || P.form || kind === 2) return base;
  const [bx, by] = wpos(o, b);
  let mx = cam.x + (mouse.x - W / 2) / zoom, my = cam.y + (mouse.y - H / 2) / zoom;
  if (b.t === "art" && S.artFoe && !build) {
    const f = S.artFoe, lt = Math.hypot(f.x - bx, f.y - by) / 1150;
    mx = f.x + (f.vx || 0) * lt;
    my = f.y + (f.vy || 0) * lt;
  } else if ((mx - bx) ** 2 + (my - by) ** 2 < TUNE.aimMin * TUNE.aimMin) return base;
  const arc = b.t === "art" || b.t === "hmini" ? TUNE.arcHeavy : TUNE.arcSmall;
  let rel = Math.atan2(my - by, mx - bx) - base;
  rel = Math.atan2(Math.sin(rel), Math.cos(rel));
  return base + clamp(rel, -arc, arc);
}
function fireFrom(o, list, w, kind, free) {
  const ch = kind === 2 ? warhead() : 1, cost = S.mood === 3 || free ? 0 : (kind === 3 ? TUNE.artCost : kind === 2 ? TUNE.missCost : kind === 1 ? TUNE.miniCost : TUNE.laserCost) * (S.pri[2] === 2 ? TUNE.wmaxCost : 1) * (S.hol && S.hd > 0 ? 1 - 0.5 * clamp(S.hd / TUNE.holRim, 0, 1) : 1);
  if (list.length && pool() >= cost) sfx(kind === 3 ? "shell" : kind === 2 ? "missile" : kind === 1 ? "mini" : "fire");
  const vol = S.mood === 1;
  for (const b of list) {
    const nm = b.t === "battery" ? 4 : 1, bm = mkM(b) * secM(b), cb = cost * nm * (b.t === "battery" ? 0.9 : 1) * (b.t === "hmini" ? TUNE.hminiCostK : 1) * (kind === 2 ? EK("mcost") : 1);
    if (pool() < cb) break;
    spend(cb, ["Laser shots", "Minigun shots", "Missiles", "Artillery shells"][kind]);
    S.lastFire = S.t;
    const [bx, by] = wpos(o, b), ga = gunDir(o, b, kind), a = ga + (kind === 1 ? rnd(-0.12, 0.12) : vol ? rnd(-0.05, 0.05) : rnd(-0.015, 0.015)), c = Math.cos(ga), s = Math.sin(ga), x = bx + c * CELL * 0.7, y = by + s * CELL * 0.7;
    if (kind === 2) {
      let tg = null, bd = 1e12;
      const mx = cam.x + (mouse.x - W / 2) / zoom, my = cam.y + (mouse.y - H / 2) / zoom;
      for (const e of enemies) {
        if (shelled(e)) continue;
        const q = (e.x - mx) ** 2 + (e.y - my) ** 2;
        if (q < bd && (e.x - o.x) ** 2 + (e.y - o.y) ** 2 < 1e6) {
          bd = q;
          tg = e;
        }
      }
      let ba = o.a;
      if (tg) {
        let q = Math.atan2(tg.y - y, tg.x - x) - o.a;
        q = Math.atan2(Math.sin(q), Math.cos(q));
        ba = o.a + clamp(q, -TUNE.missArc, TUNE.missArc);
      }
      const n3 = S.pri[2] === 2 ? 3 : 1;
      for (let rr = 0; rr < nm; rr++) for (let j = 0; j < n3; j++) {
        const a2 = ba + rnd(-TUNE.missCone, TUNE.missCone) + (j - (n3 - 1) / 2) * 0.5;
        bolts.push({ x, y, vx: Math.cos(a2) * 260 + o.vx * 0.5, vy: Math.sin(a2) * 260 + o.vy * 0.5, life: 3.2 * TUNE.rangeMiss * rngK(), dmg: 34 * TUNE.missDmgK * (0.6 + 0.9 * w) * (vol ? 1.75 : 1) * (n3 > 1 ? 0.5 : 1) * ch * bm * DK(), f: 1, m: 1, tg, ch, bl: b.t === "battery" ? 1.25 : 1 });
      }
      if (LOG) LOG.launched += n3 * nm;
    } else for (let hh = 0, hn = b.t === "hmini" ? TUNE.hminiN : 1; hh < hn; hh++) {
      const v = kind === 3 ? 1150 : kind ? 780 : 900, an0 = hh ? a + rnd(-0.06, 0.06) : a, an = o === P && !P.form ? nudgeAim(x, y, an0) : an0;
      bolts.push({
        x,
        y,
        tg: kind === 3 && o === P ? S.artFoe : null,
        vx: Math.cos(an) * v + o.vx * 0.4,
        vy: Math.sin(an) * v + o.vy * 0.4,
        /* the firing ship's own speed: a split piece's, not yours */
        life: (kind === 3 ? 0.95 * TUNE.rangeLaser * TUNE.artRange * 900 / 1150 : kind ? 0.72 * TUNE.rangeMini : 0.95 * TUNE.rangeLaser) * rngK(),
        dmg: (kind === 3 ? TUNE.artDmg : kind ? 0.2 : 1) * boltDmg(w) * warhead() * bm * (kind === 1 ? TUNE.miniBuff : TUNE.laserBuff) * DK(),
        f: 1,
        k: kind,
        art: kind === 3 ? 1 : 0
      });
    }
    for (let i = 0; i < (kind === 1 ? 1 : 3); i++) spawn(bx + c * CELL, by + s * CELL, Math.cos(a) * rnd(60, 220) + rnd(-50, 50), Math.sin(a) * rnd(60, 220) + rnd(-50, 50), 0.25, 2.4, i ? 0 : 2);
  }
}
function seekTarget(b) {
  const ca = Math.atan2(b.vy, b.vx);
  for (let pass = 0; pass < 2 && !b.tg; pass++) {
    let bd = 1e18;
    for (const e of enemies) {
      if (shelled(e)) continue;
      if (pass === 0 && (e.inc || 0) > e.hp * 1.15) continue;
      const dx = e.x - b.x, dy = e.y - b.y, d2 = dx * dx + dy * dy;
      if (d2 > TUNE.missSeek * TUNE.missSeek) continue;
      let q = Math.atan2(dy, dx) - ca;
      q = Math.abs(Math.atan2(Math.sin(q), Math.cos(q)));
      const sc = d2 * (1 + 1.5 * q / Math.PI);
      if (sc < bd) {
        bd = sc;
        b.tg = e;
      }
    }
  }
}
function updBolts(dt) {
  if (!bolts.length) return;
  for (const e of enemies) e.inc = 0;
  for (const b of bolts) if (b.m && b.f && b.tg && b.life > 0) b.tg.inc = (b.tg.inc || 0) + b.dmg;
  const near = nearRocks.filter((r) => Math.abs(r.x - P.x) < 2600 && Math.abs(r.y - P.y) < 2600);
  for (let i = bolts.length - 1; i >= 0; i--) {
    const b = bolts[i];
    b.life -= dt;
    if (b.m) {
      let tx = 0, ty = 0, ok = false;
      if (b.f) {
        if (!b.tg || b.tg.hp <= 0 || shelled(b.tg) || enemies.indexOf(b.tg) < 0) {
          b.tg = null;
          seekTarget(b);
        } else if (b.tg.inc > b.tg.hp * 1.3 + b.dmg && b.life < 2.6 && !b.reseek) {
          b.reseek = 1;
          const old = b.tg;
          b.tg = null;
          seekTarget(b);
          if (!b.tg) b.tg = old;
        }
        if (b.tg) {
          tx = b.tg.x;
          ty = b.tg.y;
          ok = true;
        }
      } else {
        tx = P.x;
        ty = P.y;
        ok = !S.over;
      }
      let sp = Math.hypot(b.vx, b.vy);
      const ca = Math.atan2(b.vy, b.vx);
      let na = ca;
      if (ok) {
        let q = Math.atan2(ty - b.y, tx - b.x) - ca;
        q = Math.atan2(Math.sin(q), Math.cos(q));
        const dq = Math.hypot(tx - b.x, ty - b.y), tr = (b.f ? 4.5 * (1 + 1.4 * clamp(1 - dq / 300, 0, 1)) : 1.9) * dt;
        na = ca + clamp(q, -tr, tr);
      }
      sp = Math.min(b.f ? 620 : 330, sp + (b.f ? 500 : 200) * dt);
      b.vx = Math.cos(na) * sp;
      b.vy = Math.sin(na) * sp;
      spawn(b.x, b.y, -b.vx * 0.2 + rnd(-30, 30), -b.vy * 0.2 + rnd(-30, 30), 0.4, 2.6 * (b.ch ? 1 + 0.5 * (b.ch - 1) : 1), b.f ? b.ch > 1.66 ? 2 : b.ch > 1.33 ? 6 : 1 : 3);
    } else if (b.art && b.f && b.tg && b.tg.hp > 0) {
      const sp = Math.hypot(b.vx, b.vy), ca = Math.atan2(b.vy, b.vx);
      let q = Math.atan2(b.tg.y - b.y, b.tg.x - b.x) - ca;
      q = Math.atan2(Math.sin(q), Math.cos(q));
      if (Math.abs(q) < 0.6) {
        const na = ca + clamp(q, -TUNE.artHome * dt, TUNE.artHome * dt);
        b.vx = Math.cos(na) * sp;
        b.vy = Math.sin(na) * sp;
      }
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (!b.m && Math.random() < (b.k ? 0.1 : 0.25)) spawn(b.x, b.y, rnd(-20, 20), rnd(-20, 20), 0.22, 2, b.f ? 0 : 3);
    let dead = b.life <= 0, boom = dead && b.m;
    if (!dead) for (const r of near) {
      const dx = b.x - r.x, dy = b.y - r.y;
      if (dx * dx + dy * dy < r.r * r.r) {
        dead = true;
        boom = b.m;
        hitRock(r, b.dmg, b.x, b.y, b.f);
        break;
      }
    }
    if (!dead && b.f) {
      for (const e of enemies) {
        const dx = b.x - e.x, dy = b.y - e.y;
        if (dx * dx + dy * dy < (e.r + 6) * (e.r + 6)) {
          const T = ET[e.type];
          if (b.m) {
            if (!(T.boss && e.ph === 0) && !blockHit(e, b.x, b.y)) continue;
            dead = true;
            boom = true;
            if (T.boss && e.ph === 0) {
              if (LOG) LOG.blocked++;
              if (!(e.blkT > 0)) {
                e.blkT = 0.7;
                floatText(e.x, e.y - e.r - 12, "shell stops missiles", 1);
              }
              ring(b.x, b.y, 16, 120, 0);
            }
            break;
          }
          let q = Math.atan2(dy, dx) - e.a;
          q = Math.atan2(Math.sin(q), Math.cos(q));
          if (T.front && Math.abs(q) < 1.15 * (e.p.arc || 1) || T.boss && e.ph === 0 && b.k) {
            dead = true;
            if (LOG) LOG.blocked++;
            if (!(e.blkT > 0)) {
              e.blkT = 0.7;
              floatText(e.x, e.y - e.r - 12, "blocked", 1);
            }
            sfx("clang", b.x, b.y);
            burst(b.x, b.y, 6, 170, 2, 0.3, 2.2);
            wakeEnemy(e);
            if (e.p.spikes && Math.random() < e.p.spikes) {
              const ax = P.x - b.x, ay = P.y - b.y, ad = Math.hypot(ax, ay) || 1;
              bolts.push({ x: b.x, y: b.y, vx: ax / ad * 430, vy: ay / ad * 430, life: 1.6, dmg: b.dmg * 0.5, f: 0, src: e.type });
            }
            break;
          }
          const hb = blockHit(e, b.x, b.y);
          if (!hb) continue;
          dead = true;
          const dmg = b.dmg * hitMul(e, q);
          sfx("ehit", b.x, b.y);
          hurtEnemy(e, hb, dmg, b.k ? 2 : 1);
          hitNum(e, dmg, b.rf ? "Mirror reflections" : b.art ? "Artillery" : b.k ? "Minigun" : "Laser");
          S.st.dmg[b.k ? 1 : 0] += dmg;
          e.flash = 0.08;
          wakeEnemy(e);
          burst(b.x, b.y, b.k ? 3 : 7, 160, 3, 0.4, 2.4);
          break;
        }
      }
    }
    if (!dead && !b.f && !S.over) {
      const dx = b.x - P.x, dy = b.y - P.y, rr = P.form ? P.radius * 0.7 : P.radius + (S.shield > 0 || S.halo > 0 ? 10 : 2);
      if (dx * dx + dy * dy < rr * rr && (P.form || !P.cell.size || nearHull(b.x, b.y, S.shield > 0 || S.halo > 0 ? 10 : 2))) {
        if (!b.mr && P.mirror && !P.form && DTYPE[b.src] === 1 && Math.random() < mirrorChance() * (b.nr || 1)) {
          b.f = 1;
          b.m = 0;
          b.k = 0;
          b.rf = 1;
          b.vx *= -1.3;
          b.vy *= -1.3;
          b.life = 1.2;
          b.dmg *= 1.5;
          sfx("shield");
          burst(b.x, b.y, 12, 220, 2, 0.4, 2.6);
        } else {
          b.mr = 1;
          dead = hurt(P, b.x, b.y, b.dmg, false, b.src);
          if (LOG && b.tr != null && !b.hc) {
            b.hc = 1;
            LOG.aim[b.tr].h++;
          }
          if (dead && b.m) boom = true;
        }
      }
      if (!dead && !b.f) for (const w of copies) {
        const ex = b.x - w.x, ey = b.y - w.y;
        if (ex * ex + ey * ey < w.radius * w.radius) {
          dead = hurt(w, b.x, b.y, b.dmg, false, b.src);
          if (dead) {
            if (b.m) boom = true;
            break;
          }
        }
      }
    }
    if (boom) {
      const hits = explode(b);
      if (b.f && b.m && !hits && LOG) LOG.wasted++;
    }
    if (dead) {
      bolts[i] = bolts[bolts.length - 1];
      bolts.pop();
    }
  }
}
