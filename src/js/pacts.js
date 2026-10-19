const PACTS = [
  { id: "ord", name: "Heavy ordnance", txt: "Enemy bombs are 50% bigger." },
  { id: "swarm", name: "Swarm", txt: "Every wave brings 30% more blocks." },
  { id: "thin", name: "Thin space", txt: "Collectors earn 30% less." },
  { id: "nostand", name: "No stand-ins", txt: "Lost blocks do not come back as stand-ins. Only a rebuild or a repair replaces them." },
  { id: "nohold", name: "No hold", txt: "H does nothing, so the waves never wait. N still calls the next wave early." },
  { id: "gaps", name: "Short gaps", txt: "The quiet between waves is half as long." },
  { id: "armour", name: "Armoured foes", txt: "Enemies adapt to your weapons twice as fast and can wear 10% more counter-armour." },
  { id: "glass", name: "Glass hull", txt: "No armour outline: the halo that rings the ship is gone." }
];
const PACTID = new Set(PACTS.map((p) => p.id));
const pactOn = (id) => !!(S.pacts && S.pacts[id]);
const heatOf = () => {
  let n = 0;
  for (const p of PACTS) if (pactOn(p.id)) n++;
  return n;
};
const heatName = () => diffName() + " · Heat " + heatOf();
const pactList = () => PACTS.filter((p) => pactOn(p.id)).map((p) => p.name);
const ordK = () => pactOn("ord") ? 1.5 : 1, gapK = () => pactOn("gaps") ? 0.5 : 1, swarmK = () => pactOn("swarm") ? 1.3 : 1, scrapK = () => 1 + 0.05 * heatOf();
function pactsPicked() {
  const o = {};
  if (SET.pacts && typeof SET.pacts === "object") {
    for (const k in SET.pacts) if (PACTID.has(k) && SET.pacts[k]) o[k] = 1;
  }
  return o;
}
function pactSave() {
  return Object.keys(S.pacts || {}).filter((k) => PACTID.has(k) && S.pacts[k]);
}
function pactLoad(a) {
  const o = {};
  if (Array.isArray(a)) {
    for (const k of a) if (PACTID.has(k)) o[k] = 1;
  }
  S.pacts = o;
}
function renderPacts() {
  const on = pactsPicked(), n = Object.keys(on).length;
  $("pactHeat").textContent = diffName() + " · Heat " + n + (n ? " (+" + Math.round(n * 5) + "% scrap)" : "");
  $("pactList").innerHTML = PACTS.map((p) => '<button type="button" class="alt pact" data-p="' + p.id + '" aria-pressed="' + !!on[p.id] + '"><b>' + p.name + "</b><small>" + p.txt + "</small><i>+1 Heat</i></button>").join("");
}
function openPacts() {
  renderPacts();
  show("pactp", true);
  if (!loadJSON("ew_pactT")) {
    storeJSON("ew_pactT", 1);
    $("pactBob").textContent = 'Bob: "Each pact makes the run harder and adds one Heat. Heat is only the pacts; Easy, Normal and Harsh stay what they are. Your record remembers the Heat."';
  } else $("pactBob").textContent = "";
}
function togglePact(id) {
  if (!PACTID.has(id)) return;
  SET.pacts = pactsPicked();
  if (SET.pacts[id]) delete SET.pacts[id];
  else SET.pacts[id] = 1;
  storeJSON("ew_set", SET);
  sfx("pact");
  renderPacts();
  if ($("newgame") && !$("newgame").hidden) renderNew();
}
function heatKey() {
  return diffName() + " H" + heatOf();
}
function heatRecord() {
  const k = heatKey(), r = loadJSON("ew_heat") || {}, prev = +r[k] || 0;
  if (!S.dev && S.wave > prev) {
    r[k] = S.wave;
    storeJSON("ew_heat", r);
  }
  return { key: k, prev, best: Math.max(prev, S.dev ? 0 : S.wave) };
}
