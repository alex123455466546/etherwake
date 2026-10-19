{
  const d = document.createElement("div");
  d.style.cssText = "position:absolute;top:-200px;width:100px;height:50px;overflow:scroll";
  document.body.appendChild(d);
  root.style.setProperty("--gut", d.offsetWidth - d.clientWidth + "px");
  d.remove();
}
addEventListener("resize", resize);
resize();
$("sys").innerHTML = SYSN.map((n, i) => '<button class="sys" type="button" data-i="' + i + '" data-s="0"><span><kbd>' + (i + 1) + "</kbd> " + n + '</span><b>On</b><span class="bar thin"><i></i></span></button>').join("");
const sysEl = [...$("sys").children], tapT = [0, 0, 0, 0];
let unmuteVol = 0.6;
sysEl.forEach((el, i) => el.addEventListener("click", () => {
  S.tPri = true;
  S.pri[i] = (S.pri[i] + 1) % 3;
  syncSys();
  el.blur();
}));
setTimeout(() => {
  try {
    setTitles();
  } catch (_) {
  }
}, 0);
const KEYACT = [["KeyW", "Thrust along the nose"], ["KeyS", "Brake (or reverse)"], ["KeyA", "Slide left (ship-relative)"], ["KeyD", "Slide right (ship-relative)"], ["KeyB", "Shipyard"], ["KeyH", "Hold waves"], ["KeyN", "Call the next wave"], ["KeyM", "Sound on or off"], ["KeyQ", "Rail gun"], ["KeyX", "Make a copy (hold)"], ["KeyE", "Form up"], ["KeyG", "Rebuild"], ["KeyV", "Flight assist"], ["KeyC", "Cruise control (press to start and stop)"], ["Backslash", "Flight draft"], ["BracketLeft", "Settle time shorter"], ["BracketRight", "Settle time longer"]];
const KEYFIX = /^(Escape|KeyP|KeyR|KeyU|KeyZ|KeyF|Space|ShiftLeft|ShiftRight|Tab|F11|Backquote|Digit[1-4]|Enter|Meta.*|ContextMenu)$/;
let KM = {}, capKey = null;
const keyName = (c) => c.startsWith("Key") ? c.slice(3) : c.startsWith("Digit") ? c.slice(5) : c.startsWith("Arrow") ? c.slice(5) : c === "Space" ? "Space" : c.replace(/(Left|Right)$/, " $1").replace(/^(Shift|Control|Alt) /, "$1 ");
const boundTo = (d) => SET.keys && typeof SET.keys[d] === "string" && SET.keys[d] || d;
function rebuildKM() {
  KM = {};
  const own = SET.keys && typeof SET.keys === "object" ? SET.keys : {};
  for (const [d] of KEYACT) {
    const c = own[d];
    if (typeof c === "string" && c && c !== d) KM[c] = d;
  }
  for (const [d] of KEYACT) {
    const c = own[d];
    if (typeof c === "string" && c && c !== d && !(d in KM)) KM[d] = "";
  }
}
const rmk = (e) => {
  const c = e.code in KM ? KM[e.code] : e.code;
  return c === e.code ? e : { code: c, repeat: e.repeat, target: e.target, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, metaKey: e.metaKey, preventDefault: () => e.preventDefault() };
};
function renderKeys(msg) {
  $("sKeys").innerHTML = KEYACT.map(([d, n]) => '<div class="row"><span>' + n + '</span><button type="button" class="kb alt' + (capKey === d ? " on" : "") + '" data-a="' + d + '" aria-pressed="' + (capKey === d) + '">' + (capKey === d ? "Press a key" : keyName(boundTo(d))) + "</button></div>").join("");
  $("sKeyMsg").textContent = msg || (capKey ? "Press the new key. Esc cancels." : "Click a key to change it. Esc, P, R, U, F, Space, Shift, 1 to 4, F11 and the backtick stay as they are.");
  $("sKeyMsg").classList.toggle("clash", !!msg);
}
function setKey(code) {
  const d = capKey;
  if (code === "Escape") {
    capKey = null;
    renderKeys();
    return;
  }
  if (KEYFIX.test(code)) {
    renderKeys(keyName(code) + " keeps its job. Pick another key.");
    return;
  }
  const other = KEYACT.find(([a]) => a !== d && boundTo(a) === code);
  if (other) {
    renderKeys(keyName(code) + " is already " + other[1] + ". Change that one first.");
    return;
  }
  if (!SET.keys || typeof SET.keys !== "object") SET.keys = {};
  if (code === d) delete SET.keys[d];
  else SET.keys[d] = code;
  capKey = null;
  for (const k in keys) keys[k] = false;
  storeJSON("ew_set", SET);
  rebuildKM();
  renderKeys();
}
addEventListener("keydown", (e0) => {
  if (capKey) {
    e0.preventDefault();
    if (!e0.repeat) setKey(e0.code);
    return;
  }
  const e = rmk(e0);
  if (e.target && e.target.tagName === "INPUT" && e.code.startsWith("Arrow")) return;
  if (e.target && (e.target.type === "number" || e.target.tagName === "SELECT") && e.code !== "Escape") return;
  if (!$("crash").hidden) return;
  if (["Space", "Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
  if (host && e.code === "F11") {
    e.preventDefault();
    if (!e.repeat) setFull(!SET.full);
    return;
  }
  if (!splashDone) {
    endSplash();
    return;
  }
  if (!$("echoL").hidden && (e.code === "Escape" || e.code === "KeyL")) {
    show("echoL", false);
    return;
  }
  if (!$("pactp").hidden && e.code === "Escape") {
    show("pactp", false);
    renderNew();
    return;
  }
  if (e.code === "Escape" && !$("news").hidden) {
    closeNews();
    return;
  }
  if (e.code === "Escape" && !$("newgame").hidden && ($("settings").hidden && $("controls").hidden && $("guide").hidden && $("records").hidden && $("news").hidden)) {
    show("newgame", false);
    return;
  }
  if (e.code === "Escape" && !($("settings").hidden && $("controls").hidden && $("guide").hidden && $("records").hidden)) {
    show("settings", false);
    show("controls", false);
    show("guide", false);
    show("records", false);
    return;
  }
  if (e.repeat) {
    keys[e.code] = true;
    return;
  }
  keys[e.code] = true;
  if (e.code === "Backquote") {
    toggleLog();
    return;
  }
  if (!S.started || S.over) return;
  if (e.code === "KeyB" || build && e.code === "Escape") {
    toggleBuild();
    return;
  }
  if (build) {
    if (e.code === "KeyR") {
      if (drag && dragTurn()) return;
      {
        const [rx, ry] = cellAt();
        if (turnFacing(blockAt(rx, ry))) return;
      }
      buildRot ^= 1;
      buildInfo("Turned: " + (buildRot ? "upright (2 x 6)" : "flat (6 x 2)") + ". Only heavy blocks care. To turn a weapon, point at it and press R.");
      return;
    }
    if (e.code === "KeyU") {
      const [ux, uy] = cellAt(), ub = blockAt(ux, uy);
      if (bsel.length > 1 && (!ub || bsel.includes(ub))) areaUpgrade(bsel);
      else {
        upgradeBlock(ub);
        uSwept = new Set(ub ? [ub] : []);
      }
      return;
    }
    if (e.code === "KeyZ" && (e.ctrlKey || e.metaKey)) {
      unscrap();
      return;
    }
    if (e.code === "Tab") {
      tab = (tab + 1) % CATS.length;
      const t2 = CATS[tab][1].find(unlocked);
      if (t2) pick = t2;
      fromTray = null;
      buildInfo();
    }
    const t = e.code.startsWith("Digit") ? CATS[tab][1][+e.code.slice(5) - 1] : null;
    if (t && unlocked(t)) {
      pick = t;
      fromTray = null;
      buildInfo();
    }
    return;
  }
  if (!S.paused) {
    if (e.code === "KeyV") cycleAssist();
    if (e.code === "Backslash") cycleDraft();
    if (e.code === "BracketLeft") nudgeSettle(-0.5);
    if (e.code === "BracketRight") nudgeSettle(0.5);
    if (e.code === "KeyQ") selectRail();
    if (e.code === "KeyX") beginCopy();
    if (e.code === "KeyL" && S.started && !S.offer && !S.over) echoList();
    if (e.code === "KeyU") stPress();
    if (e.code === "KeyZ" && !e.ctrlKey && !e.metaKey) recallCopy();
    if (e.code === "KeyE") toggleForm();
    if (e.code === "KeyG") startRebuild();
    if (e.code === "KeyC") toggleCruise();
  }
  if (e.code === "KeyP" || e.code === "Escape") {
    setPause(!S.paused);
    return;
  }
  if (S.paused) return;
  if (e.code === "Tab" && S.started && !S.over) {
    toggleMap();
    return;
  }
  if (e.code === "KeyM") {
    if (SET.vol > 0) {
      unmuteVol = SET.vol;
      SET.vol = 0;
    } else SET.vol = unmuteVol;
    $("sVol").value = Math.round(SET.vol * 100);
    storeJSON("ew_set", SET);
    applySet();
    toast(SET.vol ? "Sound on" : "Sound off");
  }
  if (/^Digit[1-4]$/.test(e.code)) tapSys(+e.code.slice(5) - 1);
  if (e.code === "KeyR") {
    S.pri = [0, 0, 0, 0];
    syncSys();
  }
  if (e.code === "KeyH") {
    if (pactOn("nohold")) {
      toast("No hold: the waves do not wait.", 1800);
      return;
    }
    sfx("hold");
    S.hold = !S.hold;
    toast(S.hold ? "Waves on hold. Take your time." : "Waves resumed");
  }
  if (evt && evt.k === "beacon" && evt.phase === 0 && (e.code === "KeyY" || e.code === "KeyN") && !S.paused && S.started) {
    beaconAnswer(e.code === "KeyY");
    return;
  }
  if (e.code === "KeyN" && waveLive <= 0 && waveT > 1.2 && !rifts.length && !S.skip) callWave();
});
addEventListener("keyup", (e) => {
  keys[rmk(e).code] = false;
});
addEventListener("blur", lostFocus);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) lostFocus();
});
cv.addEventListener("mousemove", (e) => {
  const r = cv.getBoundingClientRect();
  mouse.x = e.clientX - r.left;
  mouse.y = e.clientY - r.top;
  if (mapDrag) {
    const k = mapGeo().k;
    mapV.x = mapDrag.vx - (e.clientX - mapDrag.x) / k;
    mapV.y = mapDrag.vy - (e.clientY - mapDrag.y) / k;
  }
  if (build && box) {
    const c = cellAt();
    box.x1 = c[0];
    box.y1 = c[1];
  }
});
cv.addEventListener("mousedown", (e) => {
  const r = cv.getBoundingClientRect();
  mouse.x = e.clientX - r.left;
  mouse.y = e.clientY - r.top;
  if (build) {
    buildDown(e);
    return;
  }
  if (S.mapOn) {
    if (e.button === 0) mapDrag = { x: e.clientX, y: e.clientY, vx: mapV.x, vy: mapV.y };
    return;
  }
  if (e.button === 0) mouse.down = true;
  if (e.button === 2) mouse.rdown = true;
  if (e.button === 1) {
    e.preventDefault();
    mouse.mdown = true;
  }
});
addEventListener("mouseup", (e) => {
  if (mapDrag) {
    mapDrag = null;
    mapT = -99;
  }
  if (e.button === 2) mouse.rdown = false;
  else if (e.button === 1) mouse.mdown = false;
  else mouse.down = false;
  if (build) {
    const r = cv.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
    buildUp(e);
  }
});
cv.addEventListener("contextmenu", (e) => e.preventDefault());
mini.addEventListener("wheel", (e) => {
  e.preventDefault();
  const z = clamp(SET.mz + (e.deltaY > 0 ? 1 : -1), 0, 2);
  if (z !== SET.mz) {
    SET.mz = z;
    storeJSON("ew_set", SET);
    $("mzLab").textContent = MZ[z] / 1e3 + "k";
  }
}, { passive: false });
cv.addEventListener("wheel", (e) => {
  e.preventDefault();
  if (build || !S.started) return;
  if (S.mapOn) {
    mapV.R = clamp(mapV.R * (e.deltaY > 0 ? 1.2 : 0.83), 8e3, 125e3);
    mapT = -99;
    return;
  }
  zUser = clamp(zUser * (e.deltaY > 0 ? 0.9 : 1.11), 0.35, 1.8);
  zoom = zBase * zUser;
}, { passive: false });
if (host) CTL.push(["F11", "Fullscreen on or off."]);
function renderCtl() {
  const fl = SET.flightModel === "new" ? "new" : "classic";
  $("ctl").innerHTML = CTL.filter((c) => !c[2] || c[2] === fl).map((c) => "<dt><kbd>" + c[0] + "</kbd></dt><dd>" + c[1] + "</dd>").join("");
}
renderCtl();
$("keys").innerHTML = "<span><kbd>Esc</kbd> Menu and guide</span><span><kbd>B</kbd> Shipyard</span><span><kbd>H</kbd> Hold waves</span>";
reset();
for (let i = 0; i < 90; i++) spawn(rnd(-700, 700), rnd(-500, 500), rnd(-14, 14), rnd(-14, 14), rnd(1, 7), rnd(1.2, 2.4), Math.random() < 0.6 ? 0 : 1);
$("splash").addEventListener("click", endSplash);
setTimeout(endSplash, calmMotion ? 1500 : 3500);
$("mCont").addEventListener("click", () => begin(loadJSON("ew_save")));
$("go").addEventListener("click", openNew);
$("ngStart").addEventListener("click", startNew);
$("ngBack").addEventListener("click", () => show("newgame", false));
$("ngDiff").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  SET.diff = +b.dataset.d;
  storeJSON("ew_set", SET);
  armed = false;
  $("ngStart").textContent = "Start";
  renderNew();
  sfx("menuPick");
});
$("ngLines").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  SET.line = b.dataset.l;
  storeJSON("ew_set", SET);
  renderNew();
  sfx("menuPick");
});
$("ngSeed").addEventListener("keydown", (e) => {
  if (e.code === "Enter") {
    e.preventDefault();
    startNew();
  }
  if (e.code !== "Escape") e.stopPropagation();
});
$("stw").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b || b.disabled) return;
  if (b.id === "stwClose") stClose();
  else if (b.dataset.buy) stBuy(b.dataset.buy);
  else if (b.dataset.act) stAct(b.dataset.act);
});
$("echoCards").addEventListener("click", (e) => {
  const b = e.target.closest("button.echo");
  if (b) echoPick(+b.dataset.i);
});
$("echoRe").addEventListener("click", () => {
  echoReroll();
});
$("echoLBack").addEventListener("click", () => show("echoL", false));
$("ngSta").addEventListener("click", () => {
  sfx("menuPick");
  stationsCodex();
});
$("ngEch").addEventListener("click", () => {
  sfx("menuPick");
  echoCodex();
});
$("ngRec").addEventListener("click", () => {
  sfx("menuPick");
  recordsPage();
});
$("ngPacts").addEventListener("click", () => {
  sfx("menuPick");
  openPacts();
});
$("pactDone").addEventListener("click", () => {
  show("pactp", false);
  renderNew();
  sfx("menuPick");
});
$("pactList").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (b) togglePact(b.dataset.p);
});
for (const t of ["pointerdown", "keydown"]) addEventListener(t, () => audio(), { capture: true });
$("pRes").addEventListener("click", () => setPause(false));
$("pQuit").addEventListener("click", () => {
  save();
  setPause(false);
  S.started = false;
  runFile("quit");
  tip = -1;
  for (const id of ["wave", "boss", "tip"]) show(id, false);
  show("start", true);
  menu();
});
$("tipSkip").addEventListener("click", () => {
  tip = -1;
  storeJSON("ew_tut", 1);
  S.tipsOff = true;
  $("sTips").checked = false;
  endLesson();
  showTip();
});
for (const id of ["mSet", "pSet"]) $(id).addEventListener("click", () => {
  capKey = null;
  renderKeys();
  show("settings", true);
});
$("sKeys").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  capKey = capKey === b.dataset.a ? null : b.dataset.a;
  renderKeys();
});
$("sKeyReset").addEventListener("click", () => {
  SET.keys = {};
  capKey = null;
  storeJSON("ew_set", SET);
  rebuildKM();
  renderKeys();
});
$("mRec").addEventListener("click", recordsPage);
$("recBack").addEventListener("click", () => show("records", false));
for (const id of ["mCtl", "pCtl"]) $(id).addEventListener("click", () => show("controls", true));
for (const id of ["mGuide", "pGuide"]) $(id).addEventListener("click", () => show("guide", true));
$("gBack").addEventListener("click", () => show("guide", false));
buildGuide();
document.addEventListener("click", (e) => {
  if (e.target.closest("button")) sfx("click");
});
$("sBack").addEventListener("click", () => {
  capKey = null;
  show("settings", false);
});
$("cBack").addEventListener("click", () => show("controls", false));
{
  const st = loadJSON("ew_set");
  if (st && typeof st === "object") {
    for (const k in SET) if (typeof st[k] === typeof SET[k]) SET[k] = st[k];
    if (st.big === true && st.ui == null) SET.ui = 1.2;
  }
  SET.ui = clamp(SET.ui, 0.8, 1.5);
  SET.mz = clamp(SET.mz | 0, 0, 2);
  SET.look = SET.look === "classic" ? "classic" : "new";
  SET.flightModel = SET.flightModel === "new" ? "new" : "classic";
  SET.assist = clamp(SET.assist | 0, 0, 2);
  SET.sKey = SET.sKey === "reverse" ? "reverse" : "brake";
  SET.draft = clamp(SET.draft | 0 || 1, 1, 3);
  SET.settle = clamp(Math.round((+SET.settle || 3) * 2) / 2, 0.5, 8);
  SET.flight = clamp(SET.flight | 0, 0, 1);
  SET.camLag = !!SET.camLag;
  if (!SET.keys || typeof SET.keys !== "object") SET.keys = {};
  SET.music = clamp(+SET.music || 0, 0, 1);
  SET.diff = DIFFS.some((d) => d[0] === SET.diff) ? SET.diff : 1;
  SET.line = LINES[SET.line] ? SET.line : "lance";
  SET.dmgNum = ["off", "sum", "each"].includes(SET.dmgNum) ? SET.dmgNum : "sum";
  SET.bobSec = clamp(+SET.bobSec || 10, 4, 30);
  SET.track = SET.track === "synth" ? "synth" : "spaceify";
  $("sTrack").value = SET.track;
  $("sMusic").value = Math.round(SET.music * 100);
  $("sLook").value = SET.look;
  $("sVol").value = Math.round(SET.vol * 100);
  $("sPart").value = String(SET.part);
  $("sDmg").value = SET.dmgNum;
  $("sBobSec").value = String(SET.bobSec);
  $("sShake").checked = SET.shake;
  $("sHints").checked = SET.hints;
  $("sAll").checked = SET.all;
  $("sUi").value = String(SET.ui);
  $("sTips").checked = !loadJSON("ew_tut");
  $("sFull").checked = SET.full;
  $("sAssist").value = String(SET.assist);
  $("sModel").value = SET.flightModel;
  $("sSKey").value = SET.sKey;
  $("sDraft").value = String(SET.draft);
  $("sSettle").value = String(SET.settle);
  $("sFlight").value = String(SET.flight);
  $("sCam").checked = SET.camLag;
  $("sBob").value = SET.bob || "mixed";
  $("sSec").checked = !!SET.shieldSec;
  const ch = () => {
    SET.music = $("sMusic").value / 100;
    SET.track = $("sTrack").value === "synth" ? "synth" : "spaceify";
    SET.look = $("sLook").value === "classic" ? "classic" : "new";
    for (const k in partPics) delete partPics[k];
    SET.vol = $("sVol").value / 100;
    SET.part = +$("sPart").value || 1;
    SET.dmgNum = $("sDmg").value;
    SET.bobSec = +$("sBobSec").value || 10;
    SET.shake = $("sShake").checked;
    SET.hints = $("sHints").checked;
    SET.all = $("sAll").checked;
    SET.ui = +$("sUi").value || 1;
    SET.full = $("sFull").checked;
    SET.flightModel = $("sModel").value === "new" ? "new" : "classic";
    SET.assist = clamp(+$("sAssist").value | 0, 0, 2);
    SET.sKey = $("sSKey").value === "reverse" ? "reverse" : "brake";
    SET.draft = clamp(+$("sDraft").value | 0 || 1, 1, 3);
    SET.settle = clamp(+$("sSettle").value || 3, 0.5, 8);
    SET.flight = clamp(+$("sFlight").value | 0, 0, 1);
    SET.camLag = $("sCam").checked;
    SET.bob = $("sBob").value;
    SET.shieldSec = $("sSec").checked;
    storeJSON("ew_set", SET);
    storeJSON("ew_tut", $("sTips").checked ? null : 1);
    S.tipsOff = !$("sTips").checked;
    applySet();
    if (build) buildInfo();
  };
  for (const id of ["sVol", "sMusic", "sTrack", "sLook", "sPart", "sDmg", "sBobSec", "sShake", "sHints", "sAll", "sTips", "sUi", "sFull", "sAssist", "sModel", "sSKey", "sDraft", "sSettle", "sFlight", "sBob", "sSec", "sCam"]) $(id).addEventListener("change", ch);
  applySet();
  menu();
}
$("bParts").addEventListener("click", (e) => {
  const el = e.target.closest("button");
  if (!el || el.disabled) return;
  if (el.classList.contains("pg")) {
    tab = +el.dataset.i;
    const t = CATS[tab][1].find(unlocked);
    if (t) pick = t;
  } else {
    pick = el.dataset.t;
    tab = CATS.findIndex((c) => c[1].includes(pick));
  }
  fromTray = null;
  buildInfo();
});
$("bParts").addEventListener("mouseover", (e) => {
  const el = e.target.closest(".part");
  if (!el || el.dataset.t === hoverPart) return;
  hoverPart = el.dataset.t;
  showPart(hoverPart);
});
$("bParts").addEventListener("mouseleave", () => {
  hoverPart = null;
  showPart(null);
});
$("bHulls").addEventListener("click", (e) => {
  const el = e.target.closest("button");
  if (el) hullClick(+el.dataset.i, el);
});
$("bHulls").addEventListener("mouseover", (e) => {
  const el = e.target.closest("button");
  peekHull(el);
});
$("bHulls").addEventListener("mouseleave", () => peekHull(null));
$("bLoose").addEventListener("click", looseToTray);
$("bArrange").addEventListener("click", arrangeNow);
$("bLinks").addEventListener("click", (e) => {
  showLinks = !showLinks;
  e.currentTarget.setAttribute("aria-pressed", showLinks);
});
$("bHelp").addEventListener("click", (e) => {
  const on = $("bHelpText").hidden;
  show("bHelpText", on);
  e.currentTarget.setAttribute("aria-pressed", on);
});
$("bTray").addEventListener("click", (e) => {
  const el = e.target.closest("button");
  if (!el || !guard()) return;
  fromTray = el.dataset.t;
  buildInfo();
});
$("bTray").addEventListener("contextmenu", (e) => {
  e.preventDefault();
  const el = e.target.closest("button");
  if (!el || !guard()) return;
  const i = tray.findIndex((b2) => b2.t === el.dataset.t);
  if (i < 0) return;
  const b = tray.splice(i, 1)[0];
  if (!tray.some((q) => q.t === fromTray)) fromTray = tray.length ? tray[0].t : null;
  scrapBlocks([b], true);
});
$("bRebAll").addEventListener("click", rebuildAll);
$("bStrip").addEventListener("click", strip);
$("bUndo").addEventListener("click", putBack);
$("bScrapMode").addEventListener("click", (e) => {
  scrapMode = !scrapMode;
  e.currentTarget.setAttribute("aria-pressed", scrapMode);
  buildInfo(scrapMode ? "Scrap is on: click a block, or drag a box, to scrap for half what you paid." : void 0);
});
$("bUnscrap").addEventListener("click", unscrap);
$("bDone").addEventListener("click", toggleBuild);
$("again").addEventListener("click", () => begin(null));
$("oMenu").addEventListener("click", () => {
  show("over", false);
  S.over = false;
  S.started = false;
  tip = -1;
  for (const id of ["wave", "boss", "tip"]) show(id, false);
  show("start", true);
  menu();
});
for (const id of ["mNews", "pNews"]) $(id).addEventListener("click", () => showNews(null));
for (const id of ["pLog"]) $(id).addEventListener("click", toggleLog);
$("newsBack").addEventListener("click", closeNews);
$("newsX").addEventListener("click", closeNews);
$("newsBody").addEventListener("click", (e) => {
  const b = e.target.closest(".nvb");
  if (b) renderNews([b.dataset.v]);
});
$("dbgCopy").addEventListener("click", (e) => {
  e.currentTarget.blur();
  copyLog();
});
$("dbgSave").addEventListener("click", (e) => {
  e.currentTarget.blur();
  saveLog();
});
for (const id of ["pCopyLog", "crCopy"]) $(id).addEventListener("click", (e) => {
  e.currentTarget.blur();
  copyLog();
});
for (const id of ["dbgCopyS", "pCopyLogS", "crCopyS"]) $(id).addEventListener("click", (e) => {
  e.currentTarget.blur();
  copyLog(true);
});
for (const id of ["pSaveLog", "crSave"]) $(id).addEventListener("click", (e) => {
  e.currentTarget.blur();
  saveLog();
});
$("crGo").addEventListener("click", (e) => {
  e.currentTarget.blur();
  crashGo();
});
addEventListener("pagehide", saveNow);
window.etherwakeSave = saveNow;
if (host) {
  show("mQuit", true);
  show("sFullRow", true);
  $("mQuit").addEventListener("click", () => host.postMessage("quit"));
  host.addEventListener("message", (e) => {
    const m = String(e.data);
    if (m.startsWith("log-saved:")) logMsg("Saved to Downloads as " + m.slice(10));
    else if (m === "log-failed") logMsg("Could not save the file");
    else if (m.startsWith("run-log-saved:") && LOG) {
      LOG.runFile = "runs\\" + m.slice(14);
      if (S.over) {
        $("oLog").textContent = "Run log saved: " + LOG.runFile;
        show("oLog", true);
      }
    }
  });
}
requestAnimationFrame(frame);
setInterval(() => {
  const el = $("start");
  if (!el || el.hidden || el.style.display === "none") return;
  const cv2 = $("menuShip");
  if (!cv2) return;
  const c = cv2.getContext("2d"), w = cv2.width, h = cv2.height, t = performance.now() / 1e3, s = Math.min(w, h) / 34;
  c.clearRect(0, 0, w, h);
  c.save();
  c.translate(w / 2, h / 2);
  c.rotate(t * 0.4);
  const line = LINEORDER[Math.floor(t / 4) % LINEORDER.length], set = hullSet(4, line);
  for (const key of set) {
    const [x, y] = key.split(",").map(Number);
    c.fillStyle = "rgba(79,227,208,.35)";
    c.fillRect(x * s - s / 2, y * s - s / 2, s - 0.6, s - 0.6);
  }
  c.strokeStyle = "#4fe3d0";
  c.lineWidth = 1.2;
  c.beginPath();
  for (const e of hullEdges(set)) {
    c.moveTo(e[0] / CELL * s, e[1] / CELL * s);
    c.lineTo(e[2] / CELL * s, e[3] / CELL * s);
  }
  c.stroke();
  c.restore();
}, 60);
