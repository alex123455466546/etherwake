function bgeo() {
  const v = P.view, cols = v.x1 - v.x0 + 1, rows = v.y1 - v.y0 + 1, m = 16 * UI, aw = Math.max(160, W - 2 * (BSIDE + 2 * m)), ah = Math.max(160, H - 2 * m - 70 * UI), G = clamp(Math.floor(Math.min(aw / cols, ah / rows)), 12, Math.round(56 * UI)), mx = (v.x0 + v.x1) / 2, my = (v.y0 + v.y1) / 2;
  return { G, cx: W / 2 - mx * G, cy: m + 24 * UI + ah / 2 - my * G };
}
function joined(list) {
  list = list.filter((b) => !b.ghost);
  return list.some((b) => b.t === "core") ? new Set(list) : null;
}
function looseOf() {
  const s = joined(P.blocks);
  return s ? P.blocks.filter((b) => !b.ghost && !s.has(b)) : [];
}
let looseFlash = 0;
const slotCells = () => {
  const s = /* @__PURE__ */ new Set();
  for (const q of P.slots) for (const c of cellsAt(q.x, q.y, q.t, q.rot)) s.add(c[0] + "," + c[1]);
  return s;
};
function moveFits(list, dx, dy, rot) {
  const mv = new Set(list), sl = slotCells();
  return list.every((b) => cellsAt(b.x + dx, b.y + dy, b.t, rot == null ? b.rot : rot).every(([cx, cy]) => {
    const o = blockAt(cx, cy);
    return inHull(cx, cy) && (!o || mv.has(o)) && !sl.has(cx + "," + cy);
  }));
}
function inBox(b, all) {
  const x0 = Math.min(b.x0, b.x1), x1 = Math.max(b.x0, b.x1), y0 = Math.min(b.y0, b.y1), y1 = Math.max(b.y0, b.y1);
  return P.blocks.filter((q) => !q.ghost && (all || q.t !== "core") && footOf(q).some(([cx, cy]) => cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1));
}
const solidAt = (x, y) => {
  const b = blockAt(x, y);
  return !!b && !b.ghost;
};
const touches = (x, y) => solidAt(x + 1, y) || solidAt(x - 1, y) || solidAt(x, y + 1) || solidAt(x, y - 1);
let buildRot = 0;
let snapPend = [];
const pendTray = () => snapPend.map((t) => {
  const b = mk(0, 0, t, 0);
  b.mk = 2;
  b.hp = BT[t].hp * 1.5;
  return b;
});
function canPlace(x, y, t, rot) {
  t = t || "hull";
  const cs = cellsAt(x, y, t, rot);
  if (t === "score" && scoreCount() >= 3) return false;
  return cs.every(([cx, cy]) => inHull(cx, cy) && !blockAt(cx, cy) && !P.slots.some((q) => q.x === cx && q.y === cy));
}
function pay(t) {
  if (t === "ehull") {
    spend(BT.ehull.eth, "Ether hull");
    return 0;
  }
  const c = costOf(t);
  S.scrap -= c;
  return c;
}
const refundOf = (b) => Math.floor((b.paid || 0) / 2);
function scrapBlocks(list, fromTray2) {
  list = list.filter((b) => b.t !== "core");
  if (!list.length) return false;
  if (!fromTray2) P.blocks = P.blocks.filter((b) => !list.includes(b));
  bsel = bsel.filter((b) => !list.includes(b));
  let r = 0;
  for (const b of list) {
    r += refundOf(b);
    b.g = 0;
  }
  S.scrap += r;
  undo.push({ blocks: list, r, tray: !!fromTray2 });
  if (LOG) {
    LOG.scrapped += list.length;
    LOG.refund += r;
    ev("build", "scrapped " + list.length + " for " + r + " scrap");
  }
  sfx("sell");
  recalc();
  buildInfo(list.length > 1 ? "Scrapped " + list.length + " blocks for " + r + " scrap." : "Scrapped for " + r + " scrap.");
  return true;
}
function unscrap() {
  if (!guard()) return;
  const u = undo[undo.length - 1];
  if (!u) {
    deny("Nothing to undo.");
    return;
  }
  if (u.arr) {
    unarrange(u.arr);
    return;
  }
  if (u.fc) {
    undo.pop();
    for (const [b, f] of u.fc) b.fc = f;
    sfx("place");
    recalc();
    buildInfo("Turned back.");
    return;
  }
  if (u.mv) {
    const mv = u.mv.filter((m) => P.blocks.includes(m[0])), set = new Set(mv.map((m) => m[0])), sl = slotCells();
    if (!mv.every(([b, x, y, r]) => cellsAt(x, y, b.t, r).every(([cx, cy]) => {
      const o = blockAt(cx, cy);
      return inHull(cx, cy) && (!o || set.has(o)) && !sl.has(cx + "," + cy);
    }))) {
      deny("Something is built where they were.");
      return;
    }
    undo.pop();
    for (const [b, x, y, r] of mv) {
      b.x = x;
      b.y = y;
      b.rot = r;
    }
    sfx("place");
    recalc();
    buildInfo("Moved back.");
    return;
  }
  if (S.scrap < u.r) {
    deny("That scrap is already spent.");
    return;
  }
  if (!u.tray && u.blocks.some((b) => blockAt(b.x, b.y))) {
    deny("Something is built where those blocks were.");
    return;
  }
  undo.pop();
  S.scrap -= u.r;
  if (u.tray) tray.push(...u.blocks);
  else P.blocks.push(...u.blocks);
  if (LOG) {
    LOG.scrapped -= u.blocks.length;
    LOG.refund -= u.r;
  }
  sfx("place");
  recalc();
  buildInfo("Put back.");
}
function unarrange(a) {
  const onShip = new Set(P.blocks), inTray = new Set(tray), gone = new Set(a.dropped), alive = ([b]) => onShip.has(b) || inTray.has(b) || gone.has(b);
  const keep = a.pos.filter(alive), tkeep = a.tray.filter(alive), slots = a.slots.filter(([q]) => P.slots.includes(q) || a.lostSlots.includes(q)), known = new Set([...a.pos, ...a.tray].map((p) => p[0]));
  const occ = /* @__PURE__ */ new Set(), mark = (x, y, t, r) => {
    for (const c of cellsAt(x, y, t, r)) occ.add(c[0] + "," + c[1]);
  };
  for (const [b, x, y, r] of keep) mark(x, y, b.t, r);
  for (const [q, x, y, r] of slots) mark(x, y, q.t, r);
  const others = P.blocks.filter((b) => !known.has(b)), hit = (b) => footOf(b).some((c) => occ.has(c[0] + "," + c[1]));
  if (others.some((b) => !b.frame && hit(b))) {
    deny("Something is built where those blocks were.");
    return;
  }
  undo.pop();
  for (const [b, x, y, r, f] of [...keep, ...tkeep]) {
    b.x = x;
    b.y = y;
    b.rot = r;
    b.fc = f | 0;
  }
  for (const [q, x, y, r, f] of slots) {
    q.x = x;
    q.y = y;
    q.rot = r;
    q.fc = f | 0;
    if (!P.slots.includes(q)) P.slots.push(q);
  }
  P.blocks = [...keep.map((p) => p[0]), ...others.filter((b) => !hit(b))];
  tray = [...tkeep.map((p) => p[0]), ...tray.filter((b) => !known.has(b))];
  bsel = [];
  if (!tray.some((b) => b.t === fromTray)) fromTray = tray.length ? tray[0].t : null;
  sfx("place");
  recalc();
  buildInfo("Put back where they were.");
}
function boxBlocks(b) {
  return inBox(b, false);
}
function deny(m) {
  sfx("deny");
  buildInfo(m);
}
const locked = () => waveLive > 0 || rifts.length > 0;
const LOCKED = "Building opens when this wave is cleared. G rebuilds now.";
function guard() {
  if (locked()) {
    deny(LOCKED);
    return false;
  }
  return true;
}
function rebuildAll() {
  if (!guard()) return;
  let n = 0, spent = 0;
  for (let q = nextSlot(); q; q = nextSlot()) {
    const c = costOf(q.t);
    if (S.scrap < c) break;
    S.scrap -= c;
    spent += c;
    rebuildSlot(q, c);
    n++;
  }
  const left = lostSlots().length;
  if (n) {
    sfx("place");
    buildInfo("Rebuilt " + n + (n > 1 ? " blocks" : " block") + " for " + spent + " scrap." + (left ? " " + left + " left: not enough scrap, or nothing next to them yet." : ""));
  } else deny(left ? "Rebuild needs " + rbNeed() + " scrap, you have " + Math.floor(S.scrap) + "." : "Nothing to rebuild.");
}
const partPics = {};
function partPic(t) {
  if (partPics[t]) return partPics[t];
  const n = 32, cv2 = document.createElement("canvas");
  cv2.width = cv2.height = n;
  const c = cv2.getContext("2d"), big = Math.max(fw({ t }), fh({ t }));
  c.scale(n / (CELL * big), n / (CELL * big));
  c.translate(CELL / 2 * big, CELL / 2 * big);
  const f = S.fill;
  S.fill = 0.6;
  drawBlocks({ x: 0, y: 0, a: 0, c }, [{ x: -(fw({ t }) - 1) / 2, y: -(fh({ t }) - 1) / 2, t, hp: BT[t].hp }]);
  S.fill = f;
  return partPics[t] = cv2.toDataURL();
}
const hullPics = {};
function hullPic(tier, line, vr) {
  const k = tier + line + (tier >= 3 ? vr || "" : "");
  if (hullPics[k]) return hullPics[k];
  const set = hullSet(tier, line, vr), n = 66, s = n / 28, cv2 = document.createElement("canvas");
  cv2.width = cv2.height = n;
  const c = cv2.getContext("2d");
  c.translate(n / 2 - s / 2, n / 2);
  c.fillStyle = C.line;
  for (const key of set) {
    const [x, y] = key.split(",").map(Number);
    c.fillRect(x * s - s / 2, y * s - s / 2, s, s);
  }
  c.strokeStyle = C.ink;
  c.lineWidth = 1;
  c.beginPath();
  for (const e of hullEdges(set)) {
    c.moveTo(e[0] / CELL * s, e[1] / CELL * s);
    c.lineTo(e[2] / CELL * s, e[3] / CELL * s);
  }
  c.stroke();
  return hullPics[k] = cv2.toDataURL();
}
let HTILES = [];
let hullArm = -1, hullPeek = null, hoverPart = null, gridPart = null, showLinks = false, hullCards = false;
function peekHull(el) {
  hullPeek = el ? HTILES[+el.dataset.i] : null;
  const t = $("bHullTip");
  if (t) t.textContent = el ? el.querySelector("b").textContent + ": " + el.dataset.tip + "." : "";
}
const PKN = { hp: "hp", halo: "halo", speed: "speed", coll: "collection", shield: "shield", use: "ether use" };
function varChanges(n, vr) {
  const v = VARS[vr], cells = hullSet(n, S.line, vr).size - P.hullSet.size, out = [(cells >= 0 ? "+" : "") + cells + " cells"];
  const keep = S.hull >= 3 && vr === S.var, gr = keep ? 1 + 0.25 * ((S.vk || 0) + 1) : 1;
  for (const k in PKN) {
    const nv = v[k] ? 1 + (v[k] - 1) * gr : 1, cur = varOf() && varOf()[k] ? 1 + (varOf()[k] - 1) * (1 + 0.25 * (S.vk || 0)) : 1, d = Math.round((nv / cur - 1) * 100);
    if (d) out.push((d > 0 ? "+" : "") + d + "% " + PKN[k]);
    else if (keep && v[k]) out.push("perk grows");
  }
  return out.join(", ");
}
function hullTiles() {
  if (S.hull < 0) return '<p class="hint" style="grid-column:1/-1">A Legacy hull: the full square from before hulls. It stays as it is; hulls come with a new run.</p>';
  const n = S.hull + 1, box2 = (t, l, vr, cls, st, tip, sub) => {
    HTILES.push([t, l, vr]);
    return '<button type="button" class="' + cls + '" data-i="' + (HTILES.length - 1) + '" data-tip="' + tip + '"><img alt="" src="' + hullPic(t, l, vr) + '"><b>' + (l ? LINES[l].name + " " : "") + (t >= 3 && vr && vr !== "normal" ? VARS[vr].name + " " : "") + HULLS.names[t] + "</b><span>" + st + "</span>" + (sub ? "<small>" + sub + "</small>" : "") + "</button>";
  };
  HTILES = [];
  let h = box2(S.hull, S.line, S.var, "hl now", "Yours, " + P.hullSet.size + " cells", P.hullSet.size + " cells. " + (lineOf() ? lineOf().perk : "") + (varOf() && S.var !== "normal" ? ". " + varOf().about : ""));
  if (n > MAXHULL || n >= 7 && !hullOpen(n)) return h + '<p class="hint" style="grid-column:1/-1">' + (n > MAXHULL ? "This is the top of the line." : "") + "</p>";
  const branch = n >= 3 && n <= 6;
  if (hullCards && branch) {
    h += VARORDER.map((vr) => {
      const price2 = hullPrice(n, vr), open2 = hullOpen(n), can = S.scrap >= price2, cls = "hl " + (open2 && can ? "buy" : "other"), st = (vr === S.var && S.hull >= 3 ? "Keep, " : "") + (open2 ? price2 + " scrap" : "wave " + HULLS.minWave[n]);
      return box2(n, S.line, vr, cls, st, varChanges(n, vr) + ". " + VARS[vr].about, varChanges(n, vr));
    }).join("") + '<button type="button" class="hl other" data-back="1"><b>Back</b><span>No upgrade</span></button>';
    return h;
  }
  const price = hullPrice(n, S.var), open = hullOpen(n);
  return h + box2(
    n,
    S.line,
    branch ? S.var : "normal",
    branch && open ? "hl up" : open && S.scrap >= price ? "hl buy" : "hl other",
    /* 'up' only opens the variant cards, so only a branch tier has it (an unaffordable Cutter or Frigate used to say "Pick what it becomes") */
    open ? branch ? "Upgrade, from " + price + " scrap" : "Buy, " + price + " scrap" : "Wave " + HULLS.minWave[n],
    hullSet(n, S.line, branch ? S.var : "normal").size + " cells (+" + (hullSet(n, S.line, branch ? S.var : "normal").size - P.hullSet.size) + ")"
  );
}
function lockText(t) {
  const w = t in ULK && Math.max(cleared(), S.best) < ULK[t] ? "wave " + ULK[t] : null, h = t in HEAVYH && S.hull < HEAVYH[t] ? "a " + HULLS.names[HEAVYH[t]] + " hull" : null;
  return "Needs " + [w, h].filter(Boolean).join(" and ");
}
function partsList() {
  return CATS.map((c, ci) => '<button type="button" class="pg" data-i="' + ci + '" aria-pressed="' + (ci === tab) + '" style="--job:var(--j-' + c[2] + ')">' + c[0] + "</button>" + c[1].map((t, i) => {
    const ok = unlocked(t), n = owned(t);
    return '<button type="button" class="part" data-t="' + t + '" style="--job:var(--j-' + c[2] + ')" aria-pressed="' + (!fromTray && t === pick) + '"' + (ok ? "" : " disabled") + '><img alt="" src="' + partPic(t) + '"><b>' + BT[t].name + (ci === tab && ok ? " <kbd>" + (i + 1) + "</kbd>" : "") + "</b><small>" + (ok ? PLINE[t] : lockText(t)) + '</small><span class="pp">' + (ok ? '<span class="pc' + (t === "ehull" ? " eth" : "") + '">' + (t === "ehull" ? BT.ehull.eth + " ether" : costOf(t) + " scrap") + "</span>" : "") + (n ? '<span class="po">own ' + n + "</span>" : "") + "</span></button>";
  }).join("")).join("");
}
let infoH = 0;
function showPart(t) {
  const asked = t;
  t = t || fromTray || pick;
  const T = BT[t], bits = ["Health " + T.hp];
  if (T.cap) bits.push("+" + T.cap + " capacity");
  bits.push(t === "ehull" ? T.eth + " ether" : costOf(t) + " scrap now, 1 more for every 3 you own");
  const el = $("bPartInfo");
  el.innerHTML = (fromTray && !asked ? "From the tray: " : "") + "<b>" + T.name + "</b>. " + T.info + "<br>" + bits.join(" &middot; ");
  if (el.offsetHeight > infoH) {
    infoH = el.offsetHeight;
    el.style.minHeight = infoH + "px";
  }
}
function resetPartInfo() {
  infoH = 0;
  $("bPartInfo").style.minHeight = "";
}
function buildInfo(m) {
  const lk = locked();
  $("build").classList.toggle("locked", lk);
  $("bHead").textContent = lk ? "Look only until the wave is cleared" : "Shipyard, game paused";
  $("bScrap").textContent = S.scrap;
  $("bEther").textContent = Math.floor(pool());
  $("bParts").innerHTML = partsList();
  showPart(hoverPart || gridPart);
  const lo = looseOf();
  $("bWarn").hidden = !lo.length;
  if (lo.length) $("bWarnText").textContent = lo.length + (lo.length > 1 ? " blocks are" : " block is") + " not joined to the core (outlined in red). Join " + (lo.length > 1 ? "them" : "it") + " to the ship, or put " + (lo.length > 1 ? "them" : "it") + " in the tray, before you leave.";
  $("bHullNow").innerHTML = "<b>" + hullName() + '</b><br><span class="hint">' + P.hullSet.size + " cells" + (lineOf() ? ". " + lineOf().perk : "") + "</span>";
  if (!m) hullArm = -1;
  $("bHulls").innerHTML = hullTiles();
  const lost = lostSlots();
  $("bRebAll").textContent = lost.length ? "Rebuild all (" + lost.length + ")" : "Rebuild all";
  $("bRebAll").disabled = !lost.length;
  if (lk && !m) m = LOCKED;
  $("bInfo").textContent = m || "";
  const n = {};
  for (const b of tray) n[b.t] = (n[b.t] || 0) + 1;
  const ks = Object.keys(n);
  $("bTray").innerHTML = ks.length ? ks.map((t) => '<button class="bt" type="button" data-t="' + t + '" aria-pressed="' + (fromTray === t) + '">' + BT[t].name + "<small>x" + n[t] + "</small></button>").join("") : '<span class="hint">Empty. Click a placed block to lift it here.</span>';
  $("bDone").disabled = tray.length > 0;
  shipStats();
}
function hullClick(i, el) {
  if (!guard()) return;
  el = el || $("bHulls").children[i];
  if (!el) return;
  if (el.dataset.back) {
    hullCards = false;
    buildInfo();
    return;
  }
  const [t, l, vr] = HTILES[i] || [];
  if (el.classList.contains("up")) {
    hullCards = true;
    buildInfo("Pick what the " + HULLS.names[t] + " becomes. Each card shows what it changes against the hull you have.");
    return;
  }
  if (el.classList.contains("buy")) {
    hullCards = false;
    buyHull(vr);
  }
}
let arrPlan = null;
const arrSig = () => P.blocks.length + ":" + tray.length + ":" + P.slots.length + ":" + S.hull + S.line;
function arrangeNow() {
  if (!guard()) return;
  if (!arrPlan || arrPlan.sig !== arrSig()) {
    const pl = arrange(false, true);
    if (!pl || !pl.moved && !pl.spare.length) {
      deny("Nothing to arrange.");
      return;
    }
    arrPlan = { sig: arrSig(), pl };
    sfx("hold");
    buildInfo("Preview: " + pl.moved + (pl.moved === 1 ? " block" : " blocks") + " would move (dashed in the grid)" + (pl.spare.length ? " and " + pl.spare.length + " would not fit and go to the tray" : "") + ". Press Arrange again to do it. Changing anything cancels.");
    return;
  }
  arrPlan = null;
  const had = tray.length, u = arrange();
  if (!u) {
    deny("Nothing to arrange.");
    return;
  }
  bsel = [];
  sfx("place");
  recalc();
  ev("arrange", hullName() + ": " + P.blocks.length + " blocks placed, " + tray.length + " left in the tray");
  buildInfo("Arranged" + (had ? ", the tray included" : "") + ": big blocks fitted by their size first, engines at the back, weapons at the front, tanks in the middle." + (tray.length ? " " + tray.length + " did not fit and wait in the tray." : "") + " Ctrl+Z puts it back.");
}
function looseToTray() {
  if (!guard()) return;
  const lo = looseOf();
  if (!lo.length) return;
  P.blocks = P.blocks.filter((b) => !lo.includes(b));
  for (const b of lo) {
    b.g = 0;
    tray.push(b);
  }
  bsel = bsel.filter((b) => !lo.includes(b));
  fromTray = lo[0].t;
  sfx("lift");
  recalc();
  buildInfo(lo.length + (lo.length > 1 ? " blocks are" : " block is") + " in the tray. Click a lit cell to set " + (lo.length > 1 ? "them" : "it") + " down.");
}
function toggleBuild() {
  if (S.over || !S.started || !build && S.paused) return;
  if (build) {
    const lo = looseOf();
    if (lo.length) {
      looseFlash = performance.now() + 2400;
      deny(lo.length + (lo.length > 1 ? " blocks are" : " block is") + " not joined to the core (outlined in red). Join " + (lo.length > 1 ? "them" : "it") + ", or put " + (lo.length > 1 ? "them" : "it") + " in the tray.");
      return;
    }
  }
  if (build && tray.length) {
    deny("Place or sell everything in the tray first.");
    return;
  }
  build = !build;
  if (build) {
    if (!locked()) {
      P.form = false;
      for (let i = P.blocks.length - 1; i >= 0; i--) if (P.blocks[i].ghost) {
        P.blocks[i].slot.on = false;
        P.blocks.splice(i, 1);
      }
    }
    recalc();
    takeSnap();
    snapPend = (S.pend || []).slice();
    S.pend = [];
    tray = pendTray();
    fromTray = tray.length ? tray[0].t : null;
    drag = null;
    box = null;
    bsel = [];
    gridPart = null;
    undo = [];
    S.paused = true;
    S.tBuild = true;
    mouse.down = mouse.rdown = mouse.mdown = false;
    if (!unlocked(pick)) {
      tab = 0;
      pick = "hull";
    }
    toast("");
    resetPartInfo();
    buildInfo();
    {
      const up = P.blocks.filter((b) => !b.ghost && b.t !== "core" && BT[b.t].cost && (b.mk || 1) < 3).map((b) => BT[b.t].cost * ((b.mk || 1) === 1 ? 2 : 4));
      if (up.length && S.scrap >= Math.min(...up) && !S.st.upgHint) {
        S.st.upgHint = 1;
        buildInfo("You can afford an upgrade: point at a block and press U (Mk I to II to III). A block that breaks comes back at Mk I and returns about half of its upgrade scrap.");
      }
    }
  } else {
    S.paused = false;
    undo = [];
    box = null;
    scrapMode = false;
    recalc();
    S.prev = pool();
    save();
  }
  showTip();
  $("build").hidden = !build;
  $("stage").classList.toggle("building", build);
}
function cellAt() {
  const g = bgeo();
  return [Math.round((mouse.x - g.cx) / g.G), Math.round((mouse.y - g.cy) / g.G)];
}
function buildDown(e) {
  if (!guard()) return;
  const [x, y] = cellAt(), at = blockAt(x, y), si = P.slots.findIndex((q) => q.x === x && q.y === y), sl = si >= 0 ? P.slots[si] : null;
  if (e.button === 2) {
    box = { x0: x, y0: y, x1: x, y1: y, b: 2, sel: true };
    return;
  }
  if (e.button === 0 && scrapMode) {
    box = { x0: x, y0: y, x1: x, y1: y, b: 0 };
    return;
  }
  if (e.button !== 0) return;
  if (at) {
    drag = { b: at, bs: at.t !== "core" && bsel.length > 1 && bsel.includes(at) ? bsel.slice() : [at], ax: x, ay: y, turn: 0 };
    return;
  }
  if (sl) {
    if (!afford(sl.t)) {
      deny("Rebuilding the " + BT[sl.t].name.toLowerCase() + " costs " + costOf(sl.t) + " scrap.");
      return;
    }
    const nb = mk(x, y, sl.t, sl.rot);
    if (sl.fc) nb.fc = sl.fc & 3;
    nb.paid = pay(sl.t);
    P.slots.splice(si, 1);
    P.blocks.push(nb);
    recalc();
    buildInfo("Rebuilt for real.");
    sfx("place");
    return;
  }
  box = { x0: x, y0: y, x1: x, y1: y, b: 0, sel: true };
}
function placeAt(x, y) {
  const tb = fromTray ? tray.find((b) => b.t === fromTray) : null, pt = fromTray || pick, pr = tb ? tb.rot | 0 : buildRot;
  if (!canPlace(x, y, pt, pr)) {
    deny(pt === "score" && scoreCount() >= 3 ? "A ship carries three section cores besides its main core." : "Blocks have to touch the ship and fit inside the hull.");
    return;
  }
  if (fromTray) {
    const i = tray.findIndex((b2) => b2.t === fromTray);
    if (i < 0) {
      fromTray = null;
      return;
    }
    const b = tray.splice(i, 1)[0];
    b.x = x;
    b.y = y;
    autoFace(b);
    P.blocks.push(b);
    if (!tray.some((q) => q.t === fromTray)) fromTray = tray.length ? tray[0].t : null;
    recalc();
    buildInfo();
    sfx("place");
    return;
  }
  if (!afford(pick)) {
    deny(pick === "ehull" ? "Ether hull needs 25 ether in the pool." : "Not enough scrap. " + BT[pick].name + " now costs " + costOf(pick) + ".");
    return;
  }
  const nb = mk(x, y, pick, buildRot);
  nb.paid = pay(pick);
  autoFace(nb);
  P.blocks.push(nb);
  recalc();
  buildInfo();
  sfx("place");
  ev("build", "placed " + BT[pick].name + " for " + nb.paid + " scrap");
}
function pickInfo() {
  if (!bsel.length) {
    buildInfo("Nothing picked.");
    return;
  }
  const up = bsel.filter(canUp), tot = up.reduce((s, b) => s + upCost(b), 0);
  buildInfo("Picked " + bsel.length + (bsel.length > 1 ? " blocks" : " block") + ". Drag one to move the group." + (up.length ? " U upgrades " + (up.length > 1 ? up.length + " of them for " + tot + " scrap" : "it for " + tot + " scrap") + (S.scrap < tot ? " (you have " + S.scrap + "; the most useful go first)" : "") + "." : "") + " Scrap mode scraps.");
}
let uSwept = /* @__PURE__ */ new Set();
function uSweep() {
  if (!build || !keys.KeyU) {
    if (uSwept.size) uSwept = /* @__PURE__ */ new Set();
    return;
  }
  const b = blockAt(...cellAt());
  if (!b || uSwept.has(b)) return;
  uSwept.add(b);
  if (canUp(b) && S.scrap >= upCost(b)) upgradeBlock(b);
}
function buildUp(e) {
  if (locked()) {
    box = null;
    drag = null;
    return;
  }
  if (box && e.button === box.b) {
    const b2 = box;
    box = null;
    const c = cellAt();
    b2.x1 = c[0];
    b2.y1 = c[1];
    if (b2.sel) {
      if (b2.b === 2) {
        if (b2.x0 === b2.x1 && b2.y0 === b2.y1) {
          const at = blockAt(b2.x0, b2.y0);
          if (at && at.t !== "core" && !at.frame && !at.ghost) bsel = bsel.includes(at) ? bsel.filter((q) => q !== at) : [...bsel, at];
          else bsel = [];
        } else bsel = inBox(b2, false);
        pickInfo();
        return;
      }
      if (b2.x0 === b2.x1 && b2.y0 === b2.y1) {
        bsel = [];
        placeAt(b2.x0, b2.y0);
        return;
      }
      bsel = inBox(b2, false);
      pickInfo();
      return;
    }
    if (b2.x0 === b2.x1 && b2.y0 === b2.y1) {
      const si = P.slots.findIndex((q) => q.x === b2.x0 && q.y === b2.y0), at = blockAt(b2.x0, b2.y0);
      if (si >= 0 && !at) {
        P.slots.splice(si, 1);
        buildInfo("Slot forgotten.");
        return;
      }
      if (at && at.t === "core") {
        deny("The core stays.");
        return;
      }
      if (at) scrapBlocks([at]);
      return;
    }
    const list = boxBlocks(b2);
    if (list.length) scrapBlocks(list);
    return;
  }
  if (!drag || e.button !== 0) return;
  const d = drag, b = d.b;
  drag = null;
  const [x, y] = cellAt(), dx = x - d.ax, dy = y - d.ay, turn = d.turn && canTurn(d) ? 1 : 0;
  if (!dx && !dy && !turn) {
    if (bsel.includes(b)) {
      bsel = bsel.filter((q) => q !== b);
      buildInfo("Let go of the " + BT[b.t].name.toLowerCase() + ".");
      return;
    }
    if (b.t === "core") {
      deny("Drag the core to move it. It cannot leave the ship.");
      return;
    }
    P.blocks = P.blocks.filter((q) => q !== b);
    b.g = 0;
    tray.push(b);
    fromTray = b.t;
    sfx("lift");
    recalc();
    buildInfo();
    return;
  }
  const rot = turn ? (b.rot | 0) ^ 1 : void 0;
  if (!moveFits(d.bs, dx, dy, rot)) {
    deny(d.bs.length > 1 ? "The group does not fit there. Red cells are outside the hull or taken." : "That does not fit there. Red cells are outside the hull or taken.");
    return;
  }
  undo.push({ mv: d.bs.map((q) => [q, q.x, q.y, q.rot | 0]) });
  for (const q of d.bs) {
    q.x += dx;
    q.y += dy;
    autoFace(q);
  }
  if (turn) b.rot = rot;
  recalc();
  buildInfo(d.bs.length > 1 ? "Moved " + d.bs.length + " blocks." : "Moved.");
  sfx("place");
}
const canTurn = (d) => d.bs.length === 1 && !!BT[d.b.t].sz && BT[d.b.t].sz[0] !== BT[d.b.t].sz[1];
function dragTurn() {
  if (!drag || !canTurn(drag)) return false;
  drag.turn ^= 1;
  return true;
}
function takeSnap() {
  snap = { blocks: P.blocks.map((b) => Object.assign({}, b)), slots: P.slots.map((q) => Object.assign({}, q)), scrap: S.scrap, ether: S.ether, halo: S.halo };
}
function strip() {
  if (!guard()) return;
  for (const b of P.blocks) if (b.t !== "core") {
    b.g = 0;
    tray.push(b);
  }
  P.blocks = P.blocks.filter((b) => b.t === "core");
  bsel = [];
  fromTray = tray.length ? tray[0].t : null;
  recalc();
  buildInfo("Stripped. Everything you own is in the tray.");
}
function putBack() {
  if (!snap || !guard()) return;
  undo = [];
  P.blocks = snap.blocks.map((b) => Object.assign({}, b));
  P.slots = snap.slots.map((q) => Object.assign({}, q));
  S.scrap = snap.scrap;
  S.ether = snap.ether;
  S.halo = snap.halo;
  tray = pendTray();
  fromTray = tray.length ? tray[0].t : null;
  drag = null;
  bsel = [];
  recalc();
  buildInfo("Back to how it was when you opened the shipyard.");
}
function drawBuild() {
  uSweep();
  const g = bgeo(), G = g.G, v = P.view, X = (x) => g.cx + (x - 0.5) * G, Y = (y) => g.cy + (y - 0.5) * G;
  ctx.fillStyle = "rgba(7,8,11,.9)";
  ctx.fillRect(0, 0, W, H);
  const nx = nextCells(), nset = new Set(nx.map((c) => c[0] + "," + c[1])), cells = [...P.hullSet].map((k) => k.split(",").map(Number));
  ctx.strokeStyle = "rgba(138,145,156,.16)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = v.x0 - 1; x <= v.x1 + 1; x++) for (let y = v.y0 - 1; y <= v.y1 + 1; y++) {
    if (P.hullSet.has(x + "," + y) || nset.has(x + "," + y)) continue;
    ctx.moveTo(X(x), Y(y) + G);
    ctx.lineTo(X(x) + G, Y(y));
  }
  ctx.stroke();
  ctx.fillStyle = "rgba(230,232,234,.035)";
  for (const [x, y] of cells) ctx.fillRect(X(x), Y(y), G, G);
  ctx.strokeStyle = "rgba(138,145,156,.22)";
  ctx.beginPath();
  for (const [x, y] of cells) ctx.rect(X(x) + 0.5, Y(y) + 0.5, G - 1, G - 1);
  ctx.stroke();
  if (nx.length) {
    ctx.strokeStyle = "rgba(138,145,156,.4)";
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    for (const [x, y] of nx) ctx.rect(X(x) + 2.5, Y(y) + 2.5, G - 5, G - 5);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  const edge = (list, col, w, dash) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.setLineDash(dash || []);
    ctx.beginPath();
    for (const e of list) {
      ctx.moveTo(g.cx + e[0] / CELL * G, g.cy + e[1] / CELL * G);
      ctx.lineTo(g.cx + e[2] / CELL * G, g.cy + e[3] / CELL * G);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  };
  ctx.font = Math.round(13 * UI) + 'px "Atkinson Hyperlegible",sans-serif';
  ctx.fillStyle = C.dim;
  if (nx.length && S.hull >= 0) {
    const top = Math.min(...nx.map((c) => c[1])), xs = nx.filter((c) => c[1] === top).map((c) => c[0]), n = S.hull + 1;
    ctx.textAlign = "center";
    ctx.fillText("Next: " + (lineOf() ? lineOf().name + " " : "") + HULLS.names[n] + ", " + hullPrice(n) + " scrap", g.cx + (Math.min(...xs) + Math.max(...xs)) / 2 * G, Y(top) - 8);
  }
  const lit = hoverPart || (fromTray ? null : pick), ok = fromTray ? true : afford(lit || pick), [hx, hy] = cellAt();
  if (!drag && !locked()) {
    ctx.fillStyle = ok ? PAL[0] : C.hostile;
    ctx.globalAlpha = hoverPart ? 0.3 : 0.16;
    for (const [x, y] of cells) if (canPlace(x, y, fromTray || lit || pick, buildRot)) ctx.fillRect(X(x) + 2, Y(y) + 2, G - 4, G - 4);
    ctx.globalAlpha = 1;
  }
  ctx.save();
  ctx.translate(g.cx, g.cy);
  ctx.scale(G / CELL, G / CELL);
  drawBlocks({ x: 0, y: 0, a: 0, cell: P.cell, pipes: showLinks ? P.pipes : null }, P.blocks);
  ctx.restore();
  edge(P.hullEdges, "rgba(120,230,255,.28)", 7);
  edge(P.hullEdges, "#bff3ec", 2);
  if (hullPeek) edge(hullEdges(hullSet(hullPeek[0], hullPeek[1], hullPeek[2])), PAL[0], 2, [6, 4]);
  ctx.setLineDash([4, 3]);
  ctx.strokeStyle = C.scrap;
  ctx.fillStyle = C.scrap;
  ctx.lineWidth = 1.5;
  ctx.font = "600 " + Math.round(11 * UI) + 'px "Atkinson Hyperlegible",sans-serif';
  ctx.textAlign = "center";
  for (const q of P.slots) {
    ctx.strokeRect(X(q.x) + 2, Y(q.y) + 2, G - 4, G - 4);
    ctx.fillText(BT[q.t].name[0], g.cx + q.x * G, g.cy + q.y * G + 4);
  }
  ctx.setLineDash([]);
  for (const b of P.blocks) if (b.g) {
    ctx.fillStyle = PAL[1];
    ctx.fillRect(X(b.x) + 2, Y(b.y) + 2, 6, 6);
  }
  const bb = (cs) => {
    const xs = cs.map((c) => c[0]), ys = cs.map((c) => c[1]), x0 = Math.min(...xs), y0 = Math.min(...ys);
    return [X(x0) + 1, Y(y0) + 1, (Math.max(...xs) - x0 + 1) * G - 2, (Math.max(...ys) - y0 + 1) * G - 2];
  };
  const lo = looseOf(), pulse = looseFlash > performance.now() && Math.floor(performance.now() / 260) % 2 === 0;
  if (lo.length) {
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = C.hostile;
    ctx.lineWidth = pulse ? 4 : 2;
    ctx.font = "700 " + Math.round(10 * UI) + 'px "Atkinson Hyperlegible",sans-serif';
    ctx.textAlign = "left";
    for (const b of lo) {
      const r = bb(footOf(b));
      if (pulse) {
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = C.hostile;
        ctx.fillRect(r[0], r[1], r[2], r[3]);
        ctx.globalAlpha = 1;
      }
      ctx.strokeRect(r[0], r[1], r[2], r[3]);
      if (G >= 26) ctx.fillStyle = C.hostile, ctx.fillText("Loose", r[0] + 3, r[1] + 10 * UI + 1);
    }
    ctx.setLineDash([]);
  }
  if (arrPlan && arrPlan.sig === arrSig()) {
    ctx.setLineDash([5, 3]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = PAL[0];
    ctx.fillStyle = PAL[0];
    for (const [b, p] of arrPlan.pl.placed) {
      if (b.x === p[0] && b.y === p[1] && (b.rot | 0) === p[2]) continue;
      const cs = cellsAt(p[0], p[1], b.t, p[2]);
      ctx.globalAlpha = 0.2;
      for (const [cx, cy] of cs) ctx.fillRect(X(cx) + 1, Y(cy) + 1, G - 2, G - 2);
      ctx.globalAlpha = 1;
      const r = bb(cs);
      ctx.strokeRect(r[0], r[1], r[2], r[3]);
    }
    ctx.setLineDash([]);
  }
  if (bsel.length) {
    ctx.strokeStyle = PAL[0];
    ctx.lineWidth = 2;
    ctx.fillStyle = PAL[0];
    for (const b of bsel) {
      const r = bb(footOf(b));
      ctx.globalAlpha = 0.12;
      ctx.fillRect(r[0], r[1], r[2], r[3]);
      ctx.globalAlpha = 1;
      ctx.strokeRect(r[0], r[1], r[2], r[3]);
    }
  }
  if (drag && !locked()) {
    const d = drag, dx = hx - d.ax, dy = hy - d.ay, turn = d.turn && canTurn(d) ? 1 : 0;
    if (dx || dy || turn) {
      const mv = new Set(d.bs), sl = slotCells();
      ctx.fillStyle = "rgba(7,8,11,.65)";
      for (const q of d.bs) for (const [cx, cy] of footOf(q)) ctx.fillRect(X(cx), Y(cy), G, G);
      for (const q of d.bs) {
        const cs = cellsAt(q.x + dx, q.y + dy, q.t, turn ? (q.rot | 0) ^ 1 : q.rot);
        let good = true;
        for (const [cx, cy] of cs) {
          const o = blockAt(cx, cy), ok2 = inHull(cx, cy) && (!o || mv.has(o)) && !sl.has(cx + "," + cy);
          if (!ok2) good = false;
          ctx.fillStyle = ok2 ? PAL[0] : C.hostile;
          ctx.globalAlpha = 0.4;
          ctx.fillRect(X(cx) + 1, Y(cy) + 1, G - 2, G - 2);
          ctx.globalAlpha = 1;
        }
        const r = bb(cs);
        ctx.strokeStyle = good ? PAL[0] : C.hostile;
        ctx.lineWidth = 2;
        ctx.strokeRect(r[0], r[1], r[2], r[3]);
      }
    }
  } else if (!box && !locked() && inHull(hx, hy)) {
    const over = blockAt(hx, hy);
    if (over) {
      const r = bb(footOf(over));
      ctx.strokeStyle = PAL[0];
      ctx.lineWidth = 1.5;
      ctx.strokeRect(r[0], r[1], r[2], r[3]);
    } else {
      const pt2 = fromTray || pick, pr2 = fromTray ? (tray.find((b) => b.t === fromTray) || {}).rot | 0 : buildRot, r = bb(cellsAt(hx, hy, pt2, pr2));
      ctx.strokeStyle = canPlace(hx, hy, pt2, pr2) && ok ? PAL[0] : C.dim;
      ctx.lineWidth = 2;
      ctx.strokeRect(r[0], r[1], r[2], r[3]);
    }
  }
  ctx.fillStyle = C.dim;
  ctx.font = Math.round(13 * UI) + 'px "Atkinson Hyperlegible",sans-serif';
  ctx.textAlign = "right";
  ctx.fillText("FRONT →", Math.min(X(v.x1) + G, W - BSIDE - 40 * UI), Y(v.y0) - 8 - (nx.length ? 16 * UI : 0));
  const label = (t) => {
    ctx.font = "700 " + Math.round(12 * UI) + 'px "Atkinson Hyperlegible",sans-serif';
    ctx.textAlign = "left";
    const w = ctx.measureText(t).width;
    ctx.fillStyle = "rgba(7,8,11,.9)";
    ctx.fillRect(mouse.x + 12, mouse.y - 26, w + 12, 20 * UI);
    ctx.fillStyle = C.ink;
    ctx.fillText(t, mouse.x + 18, mouse.y - 12);
  };
  const inGrid = mouse.x > BSIDE + 32 * UI && mouse.x < W - BSIDE - 32 * UI, at = blockAt(hx, hy);
  const gp = inGrid && at && !drag && !box ? at.t : null;
  if (gp !== gridPart) {
    gridPart = gp;
    if (!hoverPart) showPart(gp);
  }
  if (box) {
    const x0 = Math.min(box.x0, box.x1), x1 = Math.max(box.x0, box.x1), y0 = Math.min(box.y0, box.y1), y1 = Math.max(box.y0, box.y1), list = boxBlocks(box), r = list.reduce((a, b) => a + refundOf(b), 0), more = x0 !== x1 || y0 !== y1;
    if (box.sel) {
      if (more) {
        ctx.strokeStyle = PAL[0];
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(X(x0), Y(y0), (x1 - x0 + 1) * G, (y1 - y0 + 1) * G);
        ctx.setLineDash([]);
        label(list.length ? "Pick " + list.length + (list.length > 1 ? " blocks" : " block") : "Nothing to pick");
      }
    } else {
      ctx.strokeStyle = C.hostile;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(X(x0), Y(y0), (x1 - x0 + 1) * G, (y1 - y0 + 1) * G);
      ctx.setLineDash([]);
      if (more) label(list.length ? "Scrap " + list.length + (list.length > 1 ? " blocks" : " block") + " for " + r : "Nothing to scrap");
    }
  } else if (scrapMode) {
    if (at && at.t !== "core") label("Scrap for " + refundOf(at));
  } else if (inGrid && !drag && at && lo.includes(at)) label("Not joined to the core");
  else if (inGrid && !drag && !box && at && at.t !== "core" && !at.frame) {
    const mk2 = at.mk || 1, T = BT[at.t];
    label(T.name + (mk2 > 1 ? " Mk " + ROMAN[mk2] : "") + " · " + Math.round(at.hp) + "/" + Math.round(maxHp(at)) + (T.cost && mk2 < 3 ? " · U: Mk " + ROMAN[mk2 + 1] + " for " + T.cost * (mk2 === 1 ? 2 : 4) + " scrap" : mk2 >= 3 ? " · Mk III" : ""));
  } else if (inGrid && !drag && hx >= v.x0 - 1 && hx <= v.x1 + 1 && hy >= v.y0 - 1 && hy <= v.y1 + 1) {
    if (nset.has(hx + "," + hy)) label(S.hull === 1 ? "A Frigate adds this cell" : "The " + HULLS.names[S.hull + 1] + " adds this cell");
    else if (!inHull(hx, hy)) label("Outside your hull");
    else if (at && at.frame) label("Frame plate: free, scraps for 0");
    else if (!at && !locked() && !P.slots.some((q) => q.x === hx && q.y === hy)) label("Click to place here");
  }
}
