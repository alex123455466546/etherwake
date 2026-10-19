let W = 800, H = 600, DPR = 1, zoom = 1, zBase = 1, zUser = 1, UI = 1, BSIDE = 300;
const S = {
  t: 0,
  started: false,
  paused: false,
  over: false,
  mood: 0,
  ether: 70,
  shield: 40,
  smax: 40,
  lastHit: -9,
  ts: 1,
  pri: [0, 0, 0, 0],
  pw: [1, 1, 1, 1],
  low: false,
  miniCd: 0,
  missCd: 0,
  scrap: 8,
  wave: 0,
  fireCd: 0,
  shake: 0,
  frame: 0,
  fill: 0,
  stream: 0,
  kills: 0,
  halo: 0,
  haloMax: 70,
  dens: 0.35,
  income: 0,
  net: 0,
  prev: 70,
  lastHarv: -9,
  lastFire: -9,
  wantT: 0,
  hostile: 0,
  lowT: -99,
  best: 0,
  st: null,
  felt: { drift: 1 },
  fog: /* @__PURE__ */ new Set(),
  marks: {},
  delta: {},
  ram: 0,
  cur: null,
  corr: 0,
  cmp: 1,
  hd: 0,
  hsi: -1,
  pockets: [],
  pockT: 0,
  stage: 0,
  frayStage: 0,
  frostT: 0,
  limp: false,
  cook: 0,
  cookMul: 1,
  hitStop: 0
};
const P = { x: 0, y: 0, vx: 0, vy: 0, a: -Math.PI / 2, blocks: [], cell: /* @__PURE__ */ new Map(), slots: [], pipes: [], cap: 100, realCap: 100, emit: [], minis: [], racks: [], rails: [], arts: [], shcore: 0, pds: [], coll: 0, hull: 0, eng: 0, thr: 0, aft: 0, gyro: 0, mirror: 0, carry: 0, leakK: 1, mass: 1, wt: 10, spin: 20, av: 0, tdx: 1, tdy: 0, tu: 0, radius: 30, form: false };
const cam = { x: 0, y: 0 };
const keys = {}, mouse = { x: 0, y: 0, down: false, rdown: false, mdown: false };
let motes = [], bolts = [], rocks = [], floats = [], rib = [];
let enemies = [], wrecks = [], zones = [], rifts = [], bombs = [], fields = [], hollows = [], copies = [], copyId = 0, spills = [], build = false, waveT = 6, waveLive = 0, pick = "hull", nextWave = [], nextText = "", tip = -1;
let tab = 0, tray = [], fromTray = null, drag = null, snap = null, box = null, undo = [], scrapMode = false, bsel = [];
let AC = null, master = null, noiseBuf = null, humO = null, humF = null, humG = null, ambG = null, chain = 0, chainT = 0;
const lastS = {};
const px = new Float32Array(NP), py = new Float32Array(NP), pvx = new Float32Array(NP), pvy = new Float32Array(NP), pl = new Float32Array(NP), pm = new Float32Array(NP), ps = new Float32Array(NP), pc = new Uint8Array(NP);
let pi = 0;
const bucket = [], bucketN = new Int32Array(10);
for (let c = 0; c < 10; c++) bucket.push(new Int32Array(NP));
let DT = 0.016;
const cnt = (n) => Math.floor(n * SET.part * DT * 60 + Math.random());
const toastEl = $("toast");
const stars = [];
for (let l = 0; l < 3; l++) for (let i = 0; i < 55; i++) stars.push({ x: Math.random() * 1400, y: Math.random() * 1400, l, s: rnd(0.6, 1.7), h: Math.random() });
const mini = $("mini"), mx2 = mini.getContext("2d");
let last = 0;
let armed = false, splashDone = false;
const cleared = () => waveLive > 0 || rifts.length ? S.wave - 1 : S.wave;
const unlocked = (t) => (!(t in ULK) || SET.all || Math.max(cleared(), S.best) >= ULK[t]) && (!(t in HEAVYH) || SET.all || S.hull >= HEAVYH[t] || !!(S.bp && S.bp[t]));
const owned = (t) => P.blocks.filter((b) => b.t === t && !b.ghost && !b.frame).length + tray.filter((b) => b.t === t && !b.frame).length;
const costOf = (t) => BT[t].cost + Math.floor(owned(t) / 3);
const afford = (t) => t === "ehull" ? pool() >= BT.ehull.eth : S.scrap >= costOf(t);
const pool = () => S.ether + S.halo;
const poolF = () => clamp(pool() / Math.max(1, P.realCap), 0, 1);
const blockAt = (x, y, o) => (o || P).cell.get(x + "," + y);
const reachOf = (coll, radius) => (95 + 48 * coll * S.pw[3]) * (S.mood === 2 ? 2 : 1) * EK("reach") + radius;
