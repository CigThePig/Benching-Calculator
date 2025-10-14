function toInt(v) {
  v = (v || "").trim().replace(/[^0-9\-]/g, "");
  if (v === "" || v === "-") return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? NaN : n;
}

function oneHotPill(rowSel, btn) {
  document
    .querySelectorAll(`${rowSel} .pill`)
    .forEach((b) => b.setAttribute("aria-pressed", "false"));
  btn.setAttribute("aria-pressed", "true");
}

// Leg suggestion logic: return ALL overlapping options; if none, return nearest range(s)
const LEG_WINDOWS = [
  { label: "Red 762 legs", min: 910, max: 1280, cls: "leg-red" },
  { label: "Green 914 legs", min: 760, max: 1130, cls: "leg-green" },
  { label: "Yellow 1067 legs", min: 605, max: 975, cls: "leg-yellow" },
  { label: "Blue 1219 legs", min: 455, max: 825, cls: "leg-blue" },
];

function renderLegBands(containerId, target) {
  const c = document.getElementById(containerId);
  c.innerHTML = "";
  if (target == null || Number.isNaN(target)) return;
  const hits = LEG_WINDOWS.filter((w) => target >= w.min && target <= w.max);
  if (hits.length > 0) {
    hits.forEach((w) => {
      const d = document.createElement("div");
      d.className = `leg-band ${w.cls}`;
      d.textContent = w.label;
      c.appendChild(d);
    });
  } else {
    // nearest: minimal distance to a window; include ties
    let bestDist = Infinity;
    const nearest = [];
    for (const w of LEG_WINDOWS) {
      let d = 0;
      if (target < w.min) d = w.min - target;
      else if (target > w.max) d = target - w.max;
      if (d < bestDist) {
        bestDist = d;
        nearest.length = 0;
        nearest.push(w);
      } else if (d === bestDist) {
        nearest.push(w);
      }
    }
    nearest.forEach((w) => {
      const d = document.createElement("div");
      d.className = `leg-band ${w.cls}`;
      d.textContent = w.label;
      c.appendChild(d);
    });
  }
}

// Tabs
const tabBtnBench = document.getElementById("tabBtnBench");
const tabBtnPlanner = document.getElementById("tabBtnPlanner");
const bench = document.getElementById("bench");
const planner = document.getElementById("planner");

function selectTab(which) {
  const isBench = which === "bench";
  tabBtnBench.setAttribute("aria-selected", String(isBench));
  tabBtnPlanner.setAttribute("aria-selected", String(!isBench));
  bench.hidden = !isBench;
  planner.hidden = isBench;
}

tabBtnBench.addEventListener("click", () => selectTab("bench"));
tabBtnPlanner.addEventListener("click", () => selectTab("planner"));

// -------- Bench Mode logic --------
let benchMode = "manual"; // default off

document.getElementById("benchModeRow").addEventListener("click", (e) => {
  const b = e.target.closest(".pill[data-mode]");
  if (!b) return;
  oneHotPill("#benchModeRow", b);
  benchMode = b.dataset.mode;
  document.getElementById("benchAutoBlock").hidden = benchMode !== "auto";
  document.getElementById("benchManualBlock").hidden = benchMode !== "manual";
  benchMaybeEnable();
});

let B_piece = null;
document.getElementById("benchPieceRow")?.addEventListener("click", (e) => {
  const b = e.target.closest(".pill[data-size]");
  if (!b) return;
  oneHotPill("#benchPieceRow", b);
  B_piece = parseInt(b.dataset.size, 10);
  benchEcho();
});

const b_hfb = document.getElementById("b_hfb");
const b_sreq_auto = document.getElementById("b_sreq_auto");
const b_sreq_manual = document.getElementById("b_sreq_manual");
const b_scur = document.getElementById("b_scur");
const b_lcur = document.getElementById("b_lcur");

[b_hfb, b_scur, b_lcur, b_sreq_manual].forEach((el) => {
  if (el) el.addEventListener("input", benchMaybeEnable);
});

function benchEcho() {
  const h = toInt(b_hfb?.value);
  if (B_piece != null && h != null && !Number.isNaN(h)) {
    if (b_sreq_auto) b_sreq_auto.value = B_piece - h;
  } else if (b_sreq_auto) {
    b_sreq_auto.value = "";
  }
  benchMaybeEnable();
}

b_hfb?.addEventListener("input", benchEcho);

function benchMaybeEnable() {
  let ok = false;
  if (benchMode === "auto") {
    ok =
      toInt(b_hfb?.value) != null &&
      !Number.isNaN(toInt(b_hfb?.value)) &&
      B_piece != null &&
      toInt(b_scur.value) != null &&
      !Number.isNaN(toInt(b_scur.value)) &&
      toInt(b_lcur.value) != null &&
      !Number.isNaN(toInt(b_lcur.value));
  } else {
    ok =
      toInt(b_sreq_manual.value) != null &&
      !Number.isNaN(toInt(b_sreq_manual.value)) &&
      toInt(b_scur.value) != null &&
      !Number.isNaN(toInt(b_scur.value)) &&
      toInt(b_lcur.value) != null &&
      !Number.isNaN(toInt(b_lcur.value));
  }
  document.getElementById("b_calc").disabled = !ok;
}

document.getElementById("b_calc").addEventListener("click", () => {
  const Sreq = benchMode === "auto" ? toInt(b_sreq_auto.value) : toInt(b_sreq_manual.value);
  const Scur = toInt(b_scur.value);
  const Lcur = toInt(b_lcur.value);
  const dS = Scur - Sreq;
  const Lnew = Lcur + dS;
  const eq = document.getElementById("b_eq");
  const res = document.getElementById("b_result");
  eq.hidden = false;
  res.hidden = false;
  res.textContent = `New Leg Height: ${Lnew} mm`;
  renderLegBands("b_legBand", Lnew);
});

document.getElementById("b_reset").addEventListener("click", () => {
  benchMode = "manual";
  document
    .querySelectorAll("#benchModeRow .pill")
    .forEach((b) => b.setAttribute("aria-pressed", "false"));
  document
    .querySelector('#benchModeRow .pill[data-mode="manual"]')
    .setAttribute("aria-pressed", "true");
  document.getElementById("benchAutoBlock").hidden = true;
  document.getElementById("benchManualBlock").hidden = false;
  B_piece = null;
  document
    .querySelectorAll("#benchPieceRow .pill")
    .forEach((b) => b.setAttribute("aria-pressed", "false"));
  [b_hfb, b_sreq_auto, b_sreq_manual, b_scur, b_lcur].forEach((el) => {
    if (el) el.value = "";
  });
  document.getElementById("b_eq").hidden = true;
  document.getElementById("b_result").hidden = true;
  document.getElementById("b_legBand").innerHTML = "";
  document.getElementById("b_calc").disabled = true;
});

// -------- Pre-Foam Planner --------
let H_CORE = 1595;
const T_SPIG = 130;
let P_piece = 914;
let D_boot = 200;
document.getElementById("centerEcho").textContent = String(D_boot / 2);

document.getElementById("coreRow").addEventListener("click", (e) => {
  const b = e.target.closest(".pill[data-core]");
  if (!b) return;
  oneHotPill("#coreRow", b);
  H_CORE = parseInt(b.dataset.core, 10);
  maybeEnable();
});

document.getElementById("pieceRow").addEventListener("click", (e) => {
  const b = e.target.closest(".pill[data-size]");
  if (!b) return;
  oneHotPill("#pieceRow", b);
  P_piece = parseInt(b.dataset.size, 10);
  maybeEnable();
});

document.getElementById("bootRow").addEventListener("click", (e) => {
  const b = e.target.closest(".pill[data-boot]");
  if (!b) return;
  oneHotPill("#bootRow", b);
  D_boot = parseInt(b.dataset.boot, 10);
  document.getElementById("centerEcho").textContent = String(D_boot / 2);
  maybeEnable();
});

const hfb = document.getElementById("hfb");
const tfoam = document.getElementById("tfoam");
[hfb, tfoam].forEach((el) => el.addEventListener("input", maybeEnable));

function maybeEnable() {
  const ok =
    toInt(hfb.value) != null &&
    !Number.isNaN(toInt(hfb.value)) &&
    toInt(tfoam.value) != null &&
    !Number.isNaN(toInt(tfoam.value)) &&
    P_piece &&
    D_boot &&
    H_CORE;
  document.getElementById("plan").disabled = !ok;
}

document.getElementById("plan").addEventListener("click", () => {
  const Hfb = toInt(hfb.value);
  const F = toInt(tfoam.value);
  const L = H_CORE - T_SPIG - (P_piece - Hfb) + (F - D_boot / 2);
  const eq = document.getElementById("eq");
  const res = document.getElementById("result");
  eq.hidden = false;
  res.hidden = false;
  res.textContent = `Set legs to: ${L} mm`;
  renderLegBands("legBand", L);
});

document.getElementById("reset").addEventListener("click", () => {
  H_CORE = 1595;
  P_piece = 914;
  D_boot = 200;
  document.getElementById("centerEcho").textContent = "100";
  ["#coreRow", "#pieceRow", "#bootRow"].forEach((sel) =>
    document
      .querySelectorAll(`${sel} .pill`)
      .forEach((b) => b.setAttribute("aria-pressed", "false"))
  );
  document
    .querySelector('#coreRow .pill[data-core="1595"]')
    .setAttribute("aria-pressed", "true");
  document
    .querySelector('#pieceRow .pill[data-size="914"]')
    .setAttribute("aria-pressed", "true");
  document
    .querySelector('#bootRow .pill[data-boot="200"]')
    .setAttribute("aria-pressed", "true");
  hfb.value = "";
  tfoam.value = "";
  document.getElementById("plan").disabled = true;
  document.getElementById("eq").hidden = true;
  document.getElementById("result").hidden = true;
  document.getElementById("legBand").innerHTML = "";
});

// Default tab
selectTab("bench");
