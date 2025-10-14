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

function setPillSelection(rowSel, activeSelector) {
  document
    .querySelectorAll(`${rowSel} .pill`)
    .forEach((pill) => pill.setAttribute("aria-pressed", "false"));
  if (activeSelector) {
    document
      .querySelector(`${rowSel} ${activeSelector}`)
      ?.setAttribute("aria-pressed", "true");
  }
}

function readInt(input) {
  if (!input) return { value: null, valid: false };
  const raw = toInt(input.value);
  if (raw == null || Number.isNaN(raw)) {
    return { value: null, valid: false };
  }
  return { value: raw, valid: true };
}

// Leg suggestion logic: return ALL overlapping options; if none, return nearest range(s)
const LEG_WINDOWS = [
  { label: "Red 762 legs", min: 910, max: 1280, cls: "leg-red" },
  { label: "Green 914 legs", min: 760, max: 1130, cls: "leg-green" },
  { label: "Yellow 1067 legs", min: 605, max: 975, cls: "leg-yellow" },
  { label: "Blue 1219 legs", min: 455, max: 825, cls: "leg-blue" },
];

function renderLegBands(containerId, target) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.replaceChildren();
  if (target == null || Number.isNaN(target)) return;
  const hits = LEG_WINDOWS.filter((w) => target >= w.min && target <= w.max);
  if (hits.length > 0) {
    hits.forEach((w) => {
      const d = document.createElement("div");
      d.className = `leg-band ${w.cls}`;
      d.textContent = w.label;
      container.appendChild(d);
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
      container.appendChild(d);
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
const benchAutoBlock = document.getElementById("benchAutoBlock");
const benchManualBlock = document.getElementById("benchManualBlock");
const benchCalc = document.getElementById("b_calc");
const benchReset = document.getElementById("b_reset");
const benchEq = document.getElementById("b_eq");
const benchResult = document.getElementById("b_result");
const benchLegBand = document.getElementById("b_legBand");

document.getElementById("benchModeRow").addEventListener("click", (e) => {
  const b = e.target.closest(".pill[data-mode]");
  if (!b) return;
  oneHotPill("#benchModeRow", b);
  benchMode = b.dataset.mode;
  if (benchAutoBlock) benchAutoBlock.hidden = benchMode !== "auto";
  if (benchManualBlock) benchManualBlock.hidden = benchMode !== "manual";
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
  const { value: h, valid } = readInt(b_hfb);
  if (B_piece != null && valid) {
    if (b_sreq_auto) b_sreq_auto.value = B_piece - h;
  } else if (b_sreq_auto) {
    b_sreq_auto.value = "";
  }
  benchMaybeEnable();
}

b_hfb?.addEventListener("input", benchEcho);

function benchMaybeEnable() {
  const hfbInt = readInt(b_hfb);
  const sreqManualInt = readInt(b_sreq_manual);
  const scurInt = readInt(b_scur);
  const lcurInt = readInt(b_lcur);
  const autoReady = benchMode === "auto" && B_piece != null && hfbInt.valid;
  const manualReady = benchMode === "manual" && sreqManualInt.valid;
  const ok = (autoReady || manualReady) && scurInt.valid && lcurInt.valid;
  if (benchCalc) benchCalc.disabled = !ok;
}

benchCalc?.addEventListener("click", () => {
  const Sreq =
    benchMode === "auto" ? readInt(b_sreq_auto).value : readInt(b_sreq_manual).value;
  const Scur = readInt(b_scur).value;
  const Lcur = readInt(b_lcur).value;
  if (Sreq == null || Scur == null || Lcur == null) return;
  const dS = Scur - Sreq;
  const Lnew = Lcur + dS;
  if (benchEq) benchEq.hidden = false;
  if (benchResult) {
    benchResult.hidden = false;
    benchResult.textContent = `New Leg Height: ${Lnew} mm`;
  }
  renderLegBands("b_legBand", Lnew);
});

benchReset?.addEventListener("click", () => {
  benchMode = "manual";
  setPillSelection("#benchModeRow", '.pill[data-mode="manual"]');
  if (benchAutoBlock) benchAutoBlock.hidden = true;
  if (benchManualBlock) benchManualBlock.hidden = false;
  B_piece = null;
  setPillSelection("#benchPieceRow");
  [b_hfb, b_sreq_auto, b_sreq_manual, b_scur, b_lcur].forEach((el) => {
    if (el) el.value = "";
  });
  if (benchEq) benchEq.hidden = true;
  if (benchResult) benchResult.hidden = true;
  benchLegBand?.replaceChildren();
  if (benchCalc) benchCalc.disabled = true;
});

// -------- Pre-Foam Planner --------
let H_CORE = 1595;
const T_SPIG = 130;
let P_piece = 914;
let D_boot = 200;
const centerEcho = document.getElementById("centerEcho");
const planBtn = document.getElementById("plan");
const resetBtn = document.getElementById("reset");
const eq = document.getElementById("eq");
const result = document.getElementById("result");
const legBand = document.getElementById("legBand");
if (centerEcho) centerEcho.textContent = String(D_boot / 2);

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
  if (centerEcho) centerEcho.textContent = String(D_boot / 2);
  maybeEnable();
});

const hfb = document.getElementById("hfb");
const tfoam = document.getElementById("tfoam");
[hfb, tfoam].forEach((el) => el.addEventListener("input", maybeEnable));

function maybeEnable() {
  const hfbInt = readInt(hfb);
  const tfoamInt = readInt(tfoam);
  const ok = hfbInt.valid && tfoamInt.valid && P_piece && D_boot && H_CORE;
  if (planBtn) planBtn.disabled = !ok;
}

planBtn?.addEventListener("click", () => {
  const Hfb = readInt(hfb).value;
  const F = readInt(tfoam).value;
  if (Hfb == null || F == null) return;
  const L = H_CORE - T_SPIG - (P_piece - Hfb) + (F - D_boot / 2);
  if (eq) eq.hidden = false;
  if (result) {
    result.hidden = false;
    result.textContent = `Set legs to: ${L} mm`;
  }
  renderLegBands("legBand", L);
});

resetBtn?.addEventListener("click", () => {
  H_CORE = 1595;
  P_piece = 914;
  D_boot = 200;
  if (centerEcho) centerEcho.textContent = "100";
  setPillSelection("#coreRow", '.pill[data-core="1595"]');
  setPillSelection("#pieceRow", '.pill[data-size="914"]');
  setPillSelection("#bootRow", '.pill[data-boot="200"]');
  hfb.value = "";
  tfoam.value = "";
  if (planBtn) planBtn.disabled = true;
  if (eq) eq.hidden = true;
  if (result) result.hidden = true;
  legBand?.replaceChildren();
});

// Default tab
selectTab("bench");
