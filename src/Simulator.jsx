import { useState, useRef, useEffect, useCallback } from "react";

// ─── G-Code Parser ────────────────────────────────────────────────────────────
function parseWord(line, letter) {
  const re = new RegExp(letter + "([+-]?\\d*\\.?\\d+)", "i");
  const m = line.match(re);
  return m ? parseFloat(m[1]) : null;
}

function parseLine(raw) {
  const line = raw.replace(/\(.*?\)/g, "").replace(/;.*$/, "").trim().toUpperCase();
  if (!line) return null;
  const g = parseWord(line, "G");
  const m = parseWord(line, "M");
  const x = parseWord(line, "X");
  const z = parseWord(line, "Z");
  const u = parseWord(line, "U");
  const w = parseWord(line, "W");
  const i = parseWord(line, "I");
  const k = parseWord(line, "K");
  const r = parseWord(line, "R");
  const f = parseWord(line, "F");
  const s = parseWord(line, "S");
  const p = parseWord(line, "P");
  const q = parseWord(line, "Q");
  const t = line.match(/T(\d+)/i) ? line.match(/T(\d+)/i)[1] : null;
  return { raw, line, g, m, x, z, u, w, i, k, r, f, s, p, q, t };
}

// ─── Expand canned cycles into motion primitives ──────────────────────────────
function expandToCycles(tokens, modalState) {
  const moves = [];
  let modal = { ...modalState };

  for (const tok of tokens) {
    if (!tok) continue;

    // Update modal G
    if (tok.g !== null) {
      if ([0,1,2,3,4,17,18,19,20,21,40,41,42,90,91,92,94,95,96,97].includes(tok.g)) {
        modal.g = tok.g;
      }
    }
    if (tok.f !== null) modal.f = tok.f;
    if (tok.s !== null) modal.s = tok.s;

    const activeG = tok.g !== null ? tok.g : modal.g;

    // Absolute/incremental
    const abs = (modal.absMode !== false);
    if (tok.g === 90) { modal.absMode = true; continue; }
    if (tok.g === 91) { modal.absMode = false; continue; }
    if ([20,21,40,41,42,95,94,96,97,17,18,19,4,92].includes(tok.g) && tok.x === null && tok.z === null && tok.u === null && tok.w === null) continue;

    // M-codes we care about
    if (tok.m !== null) {
      moves.push({ type: "mcode", m: tok.m, raw: tok.raw });
      continue;
    }

    // Resolve target position
    let tx = modal.cx, tz = modal.cz;
    if (abs) {
      if (tok.x !== null) tx = tok.x;        // X is diameter
      if (tok.z !== null) tz = tok.z;
    } else {
      if (tok.u !== null) tx = modal.cx + tok.u; // U = incremental X (diameter)
      if (tok.w !== null) tz = modal.cz + tok.w;
      if (tok.x !== null) tx = modal.cx + tok.x;
      if (tok.z !== null) tz = modal.cz + tok.z;
    }

    if (activeG === 0) {
      moves.push({ type: "rapid", x: tx, z: tz, fromX: modal.cx, fromZ: modal.cz, raw: tok.raw });
      modal.cx = tx; modal.cz = tz;
    } else if (activeG === 1) {
      moves.push({ type: "feed", x: tx, z: tz, fromX: modal.cx, fromZ: modal.cz, raw: tok.raw });
      modal.cx = tx; modal.cz = tz;
    } else if (activeG === 2 || activeG === 3) {
      // Arc — resolve center
      let cx_arc = modal.cx, cz_arc = modal.cz;
      if (tok.r !== null) {
        // Compute center from R
        const dx = tx - modal.cx, dz = tz - modal.cz;
        const dist = Math.sqrt(dx*dx + dz*dz) / 2;
        const R = Math.abs(tok.r);
        const h = Math.sqrt(Math.max(0, R*R - dist*dist));
        const mx = (modal.cx + tx) / 2, mz = (modal.cz + tz) / 2;
        const perp = activeG === 2 ? [dz/dist, -dx/dist] : [-dz/dist, dx/dist];
        cx_arc = mx + perp[0] * (tok.r < 0 ? -h : h);
        cz_arc = mz + perp[1] * (tok.r < 0 ? -h : h);
      } else {
        if (tok.i !== null) cx_arc = modal.cx + tok.i * 2; // I is radius offset, X is diameter
        if (tok.k !== null) cz_arc = modal.cz + tok.k;
      }
      moves.push({ type: activeG === 2 ? "arc_cw" : "arc_ccw", x: tx, z: tz, fromX: modal.cx, fromZ: modal.cz, cx: cx_arc, cz: cz_arc, raw: tok.raw });
      modal.cx = tx; modal.cz = tz;
    } else if (activeG === 71 || activeG === 72) {
      // Simplified: treat G71/G72 as a feed move to the target
      moves.push({ type: "feed", x: tx, z: tz, fromX: modal.cx, fromZ: modal.cz, raw: tok.raw, isCycle: true });
      modal.cx = tx; modal.cz = tz;
    } else if (activeG === 28) {
      // Home
      moves.push({ type: "rapid", x: modal.cx + (tok.u || 0), z: modal.cz + (tok.w || 0), fromX: modal.cx, fromZ: modal.cz, raw: tok.raw });
      moves.push({ type: "rapid", x: 120, z: 50, fromX: modal.cx, fromZ: modal.cz, raw: "G28 (home)" });
      modal.cx = 120; modal.cz = 50;
    }
  }

  return { moves, modal };
}

// ─── Default G-code program ───────────────────────────────────────────────────
const DEFAULT_PROGRAM = `(ALEXANDER MACHINE SHOP)
(PUMA DNT2600M - SAMPLE SHAFT)
(MATERIAL: 60mm DIA x 100mm LONG)
O1001
G21 G40 G95 G97
G28 U0 W0
T0101 (ROUGH TURN - CNMG)
G50 S3000
G96 S200 M03
M08
G00 X62.0 Z2.0
(ROUGH PROFILE)
G01 Z0.0 F0.3
G01 X0.0 F0.15
G00 Z2.0
G00 X58.0
G01 Z-25.0 F0.25
G01 X62.0
G00 Z2.0
G00 X50.0
G01 Z-25.0 F0.25
G01 X62.0
G00 Z2.0
G00 X42.0
G01 Z-50.0 F0.25
G01 X62.0
G00 Z2.0
(FINISH PROFILE)
T0202 (FINISH TURN - VNMG)
G96 S280 M03
G00 X40.0 Z2.0
G01 Z0.0 F0.12
G01 X0.0
G00 Z2.0
G00 X20.0
G01 X20.0 Z0.0 F0.1
G01 X24.0 Z-2.0
G01 Z-25.0
G02 X34.0 Z-30.0 R5.0
G01 X40.0 Z-32.0
G01 Z-50.0
G01 X55.0
G01 X58.0 Z-51.5
G01 Z-80.0
G01 X62.0
G28 U0 W0
M05
M09
M30`;

// ─── Canvas Simulator ─────────────────────────────────────────────────────────

const SIM_W = 700, SIM_H = 380;
const PAD = { l: 60, r: 30, t: 30, b: 50 };

// World: Z from +50 (right, chuck side) to -120 (left, tail)
// X in diameter: 0 (center) to 80 (max radius = 40)
const WORLD = { zMin: -110, zMax: 55, xMax: 75 }; // X is diameter

function worldToCanvas(wz, wx) {
  // wx = diameter
  const plotW = SIM_W - PAD.l - PAD.r;
  const plotH = SIM_H - PAD.t - PAD.b;
  const cx = PAD.l + ((wz - WORLD.zMin) / (WORLD.zMax - WORLD.zMin)) * plotW;
  const cy = PAD.t + plotH / 2 - (wx / 2 / (WORLD.xMax / 2)) * (plotH / 2);
  return [cx, cy];
}

function LatheSimulator({ moves, currentStep, stockDia, stockLen, dark }) {
  const canvasRef = useRef(null);
  const materialRef = useRef(null); // offscreen canvas for material

  // Initialize material canvas
  useEffect(() => {
    const mc = document.createElement("canvas");
    mc.width = SIM_W; mc.height = SIM_H;
    const mctx = mc.getContext("2d");
    // Fill stock as rectangle
    const [z0, x0] = worldToCanvas(0, stockDia);
    const [zL, xL] = worldToCanvas(-stockLen, 0);
    const [,xTop] = worldToCanvas(0, stockDia);
    const [,xBot] = worldToCanvas(0, -stockDia);
    mctx.fillStyle = dark ? "#b8860b" : "#d4a843";
    mctx.fillRect(zL, xTop, z0 - zL, xBot - xTop);
    materialRef.current = mc;
  }, [stockDia, stockLen, dark]);

  // Apply material removal for all moves up to currentStep
  useEffect(() => {
    if (!materialRef.current) return;
    const mc = materialRef.current;
    const mctx = mc.getContext("2d");

    // Reset material
    mctx.clearRect(0, 0, SIM_W, SIM_H);
    const [z0] = worldToCanvas(0, 0);
    const [zL] = worldToCanvas(-stockLen, 0);
    const [,xTop] = worldToCanvas(0, stockDia);
    const [,xBot] = worldToCanvas(0, -stockDia);
    mctx.fillStyle = dark ? "#b8860b" : "#d4a843";
    mctx.fillRect(zL, xTop, z0 - zL, xBot - xTop);

    // For each feed move, erase material
    for (let i = 0; i <= currentStep && i < moves.length; i++) {
      const mv = moves[i];
      if (mv.type === "feed" || mv.type === "arc_cw" || mv.type === "arc_ccw") {
        cutMaterial(mctx, mv, stockDia);
      }
    }
  }, [currentStep, moves, stockDia, stockLen, dark]);

  function cutMaterial(mctx, mv, maxDia) {
    const toolR = 3; // tool nose radius in canvas px
    if (mv.type === "feed") {
      // Erase area between path and centerline (both upper and lower half)
      const [fx, fy] = worldToCanvas(mv.fromZ, mv.fromX);
      const [tx, ty] = worldToCanvas(mv.z, mv.x);
      // Build polygon: from-top → to-top → to-center → from-center (mirrored)
      const [,fCenter] = worldToCanvas(mv.fromZ, 0);
      const [,tCenter] = worldToCanvas(mv.z, 0);

      mctx.clearRect(0, 0, 0, 0);
      mctx.save();
      mctx.globalCompositeOperation = "destination-out";
      mctx.beginPath();
      mctx.moveTo(fx - toolR, fy - toolR);
      mctx.lineTo(tx + toolR, ty - toolR);
      mctx.lineTo(tx + toolR, tCenter + toolR);
      mctx.lineTo(fx - toolR, fCenter + toolR);
      mctx.closePath();
      mctx.fill();
      // Mirror for bottom half
      const [,fyBot] = worldToCanvas(mv.fromZ, -mv.fromX);
      const [,tyBot] = worldToCanvas(mv.z, -mv.x);
      mctx.beginPath();
      mctx.moveTo(fx - toolR, fy + toolR);
      mctx.lineTo(tx + toolR, ty + toolR);
      mctx.lineTo(tx + toolR, tCenter - toolR);
      mctx.lineTo(fx - toolR, fCenter - toolR);
      mctx.closePath();
      mctx.fill();
      mctx.restore();
    } else if (mv.type === "arc_cw" || mv.type === "arc_ccw") {
      // Approximate arc cut by sampling points
      const steps = 32;
      const [cxW, czW] = [mv.cx, mv.cz];
      const r = Math.sqrt((mv.fromX - cxW) ** 2 + (mv.fromZ - czW) ** 2);
      const a0 = Math.atan2(mv.fromX - cxW, mv.fromZ - czW);
      const a1 = Math.atan2(mv.x - cxW, mv.z - czW);
      mctx.save();
      mctx.globalCompositeOperation = "destination-out";
      let prev = null;
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        let da = a1 - a0;
        if (mv.type === "arc_cw" && da > 0) da -= Math.PI * 2;
        if (mv.type === "arc_ccw" && da < 0) da += Math.PI * 2;
        const a = a0 + da * t;
        const wz = czW + r * Math.cos(a);
        const wx = cxW + r * Math.sin(a);
        const [cx2, cy2] = worldToCanvas(wz, wx);
        const [,cen] = worldToCanvas(wz, 0);
        if (prev) {
          mctx.beginPath();
          mctx.moveTo(prev[0], prev[1] - 3);
          mctx.lineTo(cx2, cy2 - 3);
          mctx.lineTo(cx2, cen);
          mctx.lineTo(prev[0], prev[2]);
          mctx.closePath(); mctx.fill();
          mctx.beginPath();
          mctx.moveTo(prev[0], prev[3] + 3);
          mctx.lineTo(cx2, worldToCanvas(wz, -wx)[1] + 3);
          mctx.lineTo(cx2, cen);
          mctx.lineTo(prev[0], prev[2]);
          mctx.closePath(); mctx.fill();
        }
        prev = [cx2, cy2, cen, worldToCanvas(wz, -wx)[1]];
      }
      mctx.restore();
    }
  }

  // Render main canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const plotW = SIM_W - PAD.l - PAD.r;
    const plotH = SIM_H - PAD.t - PAD.b;
    const bg = dark ? "#0d1117" : "#f0f4f8";
    const gridCol = dark ? "#1e2633" : "#e2e8f0";
    const axisCol = dark ? "#30363d" : "#94a3b8";
    const labelCol = dark ? "#8b949e" : "#64748b";

    ctx.clearRect(0, 0, SIM_W, SIM_H);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, SIM_W, SIM_H);

    // Grid
    ctx.strokeStyle = gridCol; ctx.lineWidth = 0.5;
    for (let z = Math.ceil(WORLD.zMin / 10) * 10; z <= WORLD.zMax; z += 10) {
      const [cx2] = worldToCanvas(z, 0);
      ctx.beginPath(); ctx.moveTo(cx2, PAD.t); ctx.lineTo(cx2, SIM_H - PAD.b); ctx.stroke();
    }
    for (let x = 0; x <= WORLD.xMax; x += 10) {
      const [,cy1] = worldToCanvas(0, x);
      const [,cy2] = worldToCanvas(0, -x);
      ctx.beginPath(); ctx.moveTo(PAD.l, cy1); ctx.lineTo(SIM_W - PAD.r, cy1); ctx.stroke();
      if (x > 0) { ctx.beginPath(); ctx.moveTo(PAD.l, cy2); ctx.lineTo(SIM_W - PAD.r, cy2); ctx.stroke(); }
    }

    // Centerline
    ctx.strokeStyle = dark ? "#ef444430" : "#ef444440";
    ctx.setLineDash([6, 4]); ctx.lineWidth = 1;
    const [,cly] = worldToCanvas(0, 0);
    ctx.beginPath(); ctx.moveTo(PAD.l, cly); ctx.lineTo(SIM_W - PAD.r, cly); ctx.stroke();
    ctx.setLineDash([]);

    // Axes labels
    ctx.fillStyle = labelCol; ctx.font = "10px monospace"; ctx.textAlign = "center";
    for (let z = Math.ceil(WORLD.zMin / 20) * 20; z <= WORLD.zMax; z += 20) {
      const [cx2] = worldToCanvas(z, 0);
      ctx.fillText(`Z${z}`, cx2, SIM_H - PAD.b + 14);
    }
    ctx.textAlign = "right";
    for (let x = 0; x <= WORLD.xMax; x += 20) {
      const [,cy1] = worldToCanvas(0, x);
      ctx.fillText(`Ø${x}`, PAD.l - 4, cy1 + 3);
    }
    ctx.textAlign = "left";

    // Axis labels
    ctx.fillStyle = dark ? "#4d8fcc" : "#1a3a6b";
    ctx.font = "bold 11px monospace";
    ctx.fillText("Z →", SIM_W - PAD.r - 28, SIM_H - PAD.b + 14);
    ctx.fillText("X Ø", 4, PAD.t + 10);

    // Draw material
    if (materialRef.current) {
      ctx.drawImage(materialRef.current, 0, 0);
    }

    // Draw chuck
    const [chZ] = worldToCanvas(2, 0);
    const [,chTop] = worldToCanvas(0, stockDia + 8);
    const [,chBot] = worldToCanvas(0, -(stockDia + 8));
    ctx.fillStyle = dark ? "#1e3a5f" : "#2d4a6e";
    ctx.fillRect(chZ, chTop, 16, chBot - chTop);
    ctx.strokeStyle = dark ? "#4d8fcc" : "#1a3a6b"; ctx.lineWidth = 1.5;
    ctx.strokeRect(chZ, chTop, 16, chBot - chTop);
    // Chuck jaws
    for (let j = 0; j < 3; j++) {
      const jy = chTop + (j + 0.5) * (chBot - chTop) / 3;
      ctx.fillStyle = dark ? "#30363d" : "#64748b";
      ctx.fillRect(chZ + 1, jy - 5, 14, 10);
    }

    // Draw toolpath lines (all moves up to currentStep)
    for (let i = 0; i <= currentStep && i < moves.length; i++) {
      const mv = moves[i];
      if (mv.type === "rapid") {
        ctx.strokeStyle = dark ? "#f9731620" : "#f9731615";
        ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
        const [fx, fy] = worldToCanvas(mv.fromZ, mv.fromX);
        const [tx, ty] = worldToCanvas(mv.z, mv.x);
        ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke();
        // Mirror
        const [,fyB] = worldToCanvas(mv.fromZ, -mv.fromX);
        const [,tyB] = worldToCanvas(mv.z, -mv.x);
        ctx.beginPath(); ctx.moveTo(fx, fyB); ctx.lineTo(tx, tyB); ctx.stroke();
        ctx.setLineDash([]);
      } else if (mv.type === "feed") {
        ctx.strokeStyle = dark ? "#22d3ee55" : "#0369a155";
        ctx.lineWidth = 1.5; ctx.setLineDash([]);
        const [fx, fy] = worldToCanvas(mv.fromZ, mv.fromX);
        const [tx, ty] = worldToCanvas(mv.z, mv.x);
        ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke();
        const [,fyB] = worldToCanvas(mv.fromZ, -mv.fromX);
        const [,tyB] = worldToCanvas(mv.z, -mv.x);
        ctx.beginPath(); ctx.moveTo(fx, fyB); ctx.lineTo(tx, tyB); ctx.stroke();
      } else if (mv.type === "arc_cw" || mv.type === "arc_ccw") {
        ctx.strokeStyle = dark ? "#a78bfa55" : "#7c3aed55";
        ctx.lineWidth = 1.5; ctx.setLineDash([]);
        // Draw arc by sampling
        const steps = 48;
        const r = Math.sqrt((mv.fromX - mv.cx) ** 2 + (mv.fromZ - mv.cz) ** 2);
        const a0 = Math.atan2(mv.fromX - mv.cx, mv.fromZ - mv.cz);
        const a1 = Math.atan2(mv.x - mv.cx, mv.z - mv.cz);
        let da = a1 - a0;
        if (mv.type === "arc_cw" && da > 0) da -= Math.PI * 2;
        if (mv.type === "arc_ccw" && da < 0) da += Math.PI * 2;
        ctx.beginPath();
        for (let s = 0; s <= steps; s++) {
          const a = a0 + da * (s / steps);
          const wz = mv.cz + r * Math.cos(a);
          const wx = mv.cx + r * Math.sin(a);
          const [cx2, cy2] = worldToCanvas(wz, wx);
          s === 0 ? ctx.moveTo(cx2, cy2) : ctx.lineTo(cx2, cy2);
        }
        ctx.stroke();
        // Mirror
        ctx.beginPath();
        for (let s = 0; s <= steps; s++) {
          const a = a0 + da * (s / steps);
          const wz = mv.cz + r * Math.cos(a);
          const wx = mv.cx + r * Math.sin(a);
          const [cx2, cy2] = worldToCanvas(wz, -wx);
          s === 0 ? ctx.moveTo(cx2, cy2) : ctx.lineTo(cx2, cy2);
        }
        ctx.stroke();
      }
    }

    // Draw current tool position
    if (currentStep >= 0 && currentStep < moves.length) {
      const mv = moves[currentStep];
      const toolX = mv.x ?? mv.fromX ?? 60;
      const toolZ = mv.z ?? mv.fromZ ?? 0;
      const [tx, ty] = worldToCanvas(toolZ, toolX);
      // Tool marker
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + 10, ty - 8);
      ctx.lineTo(tx + 10, ty + 8);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 1;
      ctx.stroke();
      // Mirror
      const [,tyB] = worldToCanvas(toolZ, -toolX);
      ctx.fillStyle = "#ef444466";
      ctx.beginPath();
      ctx.moveTo(tx, tyB);
      ctx.lineTo(tx + 10, tyB - 8);
      ctx.lineTo(tx + 10, tyB + 8);
      ctx.closePath(); ctx.fill();
    }
  }, [currentStep, moves, dark, stockDia, materialRef.current]);

  return (
    <canvas
      ref={canvasRef}
      width={SIM_W}
      height={SIM_H}
      style={{ display: "block", width: "100%", height: "auto", borderRadius: 8 }}
    />
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function Simulator({ dark: darkProp = true, setDark: setDarkProp, user }) {
  const [code, setCode]           = useState(DEFAULT_PROGRAM);
  const [moves, setMoves]         = useState([]);
  const [currentStep, setStep]    = useState(-1);
  const [playing, setPlaying]     = useState(false);
  const [speed, setSpeed]         = useState(120);  // ms per step
  const [errors, setErrors]       = useState([]);
  const [stockDia, setStockDia]   = useState(60);
  const [stockLen, setStockLen]   = useState(100);
  const [dark, setDark]           = useState(true);
  const [activeMove, setActive]   = useState(null);
  const [highlightLine, setHL]    = useState(-1);
  const intervalRef               = useRef(null);
  const editorRef                 = useRef(null);

  const T = dark ? {
    bg:"#0d1117", sur:"#161b22", bdr:"#30363d", txt:"#c9d1d9", mut:"#8b949e",
    acc:"#4d8fcc", ed:"#0d1117", edTxt:"#c9d1d9", btn:"#2d4a6e", btnTxt:"#c9d1d9",
    rapid:"#f97316", feed:"#22d3ee", arc:"#a78bfa", err:"#f85149",
  } : {
    bg:"#f0f4f8", sur:"#ffffff", bdr:"#e2e8f0", txt:"#1e293b", mut:"#64748b",
    acc:"#1a3a6b", ed:"#1e293b", edTxt:"#e2e8f0", btn:"#1a3a6b", btnTxt:"#ffffff",
    rapid:"#ea580c", feed:"#0369a1", arc:"#7c3aed", err:"#dc2626",
  };

  // Parse and compile
  const compile = useCallback(() => {
    const lines = code.split("\n");
    const tokens = lines.map(l => parseLine(l));
    const errs = [];
    const modal = { g: 0, f: 0.25, s: 1500, cx: 120, cz: 50, absMode: true };
    const { moves: compiled } = expandToCycles(tokens.filter(Boolean), modal);

    // Basic error checks
    tokens.forEach((tok, i) => {
      if (!tok) return;
      if (tok.g !== null && ![0,1,2,3,4,17,18,19,20,21,28,29,30,40,41,42,50,52,53,54,55,56,65,70,71,72,73,74,75,76,80,81,83,84,85,90,91,92,94,95,96,97,98,99,107,460,461].includes(tok.g)) {
        errs.push({ line: i + 1, msg: `Unrecognised G${tok.g}` });
      }
    });

    setMoves(compiled);
    setErrors(errs);
    setStep(-1);
    setPlaying(false);
    clearInterval(intervalRef.current);
  }, [code]);

  // Auto-compile on change (debounced)
  useEffect(() => {
    const t = setTimeout(compile, 600);
    return () => clearTimeout(t);
  }, [compile]);

  // Playback
  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setStep(s => {
          if (s >= moves.length - 1) { setPlaying(false); return s; }
          return s + 1;
        });
      }, speed);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [playing, speed, moves.length]);

  // Update active move info
  useEffect(() => {
    if (currentStep >= 0 && currentStep < moves.length) {
      setActive(moves[currentStep]);
    } else {
      setActive(null);
    }
  }, [currentStep, moves]);

  const pct = moves.length > 0 ? Math.round(((currentStep + 1) / moves.length) * 100) : 0;

  const moveTypeColor = (type) => {
    if (type === "rapid") return T.rapid;
    if (type === "feed") return T.feed;
    if (type?.startsWith("arc")) return T.arc;
    return T.mut;
  };

  const moveTypeLabel = (type) => {
    if (type === "rapid") return "G00 RAPID";
    if (type === "feed") return "G01 FEED";
    if (type === "arc_cw") return "G02 CW ARC";
    if (type === "arc_ccw") return "G03 CCW ARC";
    if (type === "mcode") return "M-CODE";
    return type?.toUpperCase() || "";
  };

  return (
    <div style={{ minHeight:"100vh", background:T.bg, color:T.txt, fontFamily:"monospace", display:"flex", flexDirection:"column" }}>

      {/* Header */}
      <div style={{ background:T.sur, borderBottom:`1px solid ${T.bdr}`, padding:"10px 16px", display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
        <div style={{ display:"flex", alignItems:"center", gap:0 }}>
          <div style={{ background:"#004990", borderRadius:"5px 0 0 5px", padding:"4px 10px" }}>
            <span style={{ color:"#c8d8e8", fontWeight:800, fontSize:13, letterSpacing:"0.04em" }}>Alexander Machine Shop</span>
          </div>
          <div style={{ background:dark?"#1e2633":T.bdr, border:`1px solid ${T.bdr}`, borderLeft:"none", borderRadius:"0 5px 5px 0", padding:"4px 8px", display:"flex", alignItems:"center", gap:4 }}>
            <span style={{ background:"#ef4444", color:"#fff", fontWeight:900, fontSize:9, padding:"1px 4px", borderRadius:2 }}>RAD</span>
            <span style={{ color:T.mut, fontSize:9, fontWeight:700, letterSpacing:"0.15em" }}>MFG</span>
          </div>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:11, fontWeight:700, color:T.acc }}>PUMA DNT2600M — G-Code Simulator</div>
          <div style={{ fontSize:9, color:T.mut }}>Fanuc 0i-TF · XZ Turning View · Material Removal</div>
        </div>
        <button onClick={()=>setDark(d=>!d)} style={{ background:"none", border:`1px solid ${T.bdr}`, color:T.mut, borderRadius:5, padding:"4px 9px", cursor:"pointer", fontSize:11 }}>
          {dark?"☀️ Light":"🌙 Dark"}
        </button>
      </div>

      {/* Main layout */}
      <div style={{ display:"flex", flex:1, gap:0, minHeight:0, flexWrap:"wrap" }}>

        {/* Editor panel */}
        <div style={{ width:280, minWidth:200, background:T.sur, borderRight:`1px solid ${T.bdr}`, display:"flex", flexDirection:"column" }}>
          <div style={{ padding:"8px 12px", borderBottom:`1px solid ${T.bdr}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:10, letterSpacing:"0.15em", textTransform:"uppercase", color:T.mut }}>G-Code Editor</span>
            <button onClick={compile} style={{ background:T.btn, color:T.btnTxt, border:"none", borderRadius:4, padding:"3px 10px", fontSize:10, cursor:"pointer", fontWeight:700 }}>▶ Run</button>
          </div>
          <textarea
            ref={editorRef}
            value={code}
            onChange={e => setCode(e.target.value)}
            spellCheck={false}
            style={{
              flex:1, background:T.ed, color:T.edTxt, border:"none", outline:"none",
              fontFamily:"monospace", fontSize:11, lineHeight:1.6, padding:"10px 12px",
              resize:"none", tabSize:2,
              minHeight:300,
            }}
          />
          {/* Stock settings */}
          <div style={{ padding:"8px 12px", borderTop:`1px solid ${T.bdr}` }}>
            <div style={{ fontSize:9, letterSpacing:"0.15em", textTransform:"uppercase", color:T.mut, marginBottom:6 }}>Stock</div>
            <div style={{ display:"flex", gap:8 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:9, color:T.mut, marginBottom:3 }}>Ø Dia (mm)</div>
                <input type="number" value={stockDia} onChange={e=>setStockDia(Number(e.target.value))} min={10} max={80}
                  style={{ width:"100%", background:T.bg, color:T.txt, border:`1px solid ${T.bdr}`, borderRadius:4, padding:"3px 6px", fontSize:11, fontFamily:"monospace" }}/>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:9, color:T.mut, marginBottom:3 }}>Length (mm)</div>
                <input type="number" value={stockLen} onChange={e=>setStockLen(Number(e.target.value))} min={10} max={150}
                  style={{ width:"100%", background:T.bg, color:T.txt, border:`1px solid ${T.bdr}`, borderRadius:4, padding:"3px 6px", fontSize:11, fontFamily:"monospace" }}/>
              </div>
            </div>
          </div>
          {/* Errors */}
          {errors.length > 0 && (
            <div style={{ padding:"8px 12px", borderTop:`1px solid ${T.bdr}`, maxHeight:80, overflowY:"auto" }}>
              {errors.map((e,i)=>(
                <div key={i} style={{ fontSize:10, color:T.err, marginBottom:2 }}>⚠ Line {e.line}: {e.msg}</div>
              ))}
            </div>
          )}
        </div>

        {/* Sim + controls */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:300 }}>

          {/* Simulator canvas */}
          <div style={{ flex:1, padding:"12px", background:T.bg, position:"relative" }}>
            <LatheSimulator
              moves={moves}
              currentStep={currentStep}
              stockDia={stockDia}
              stockLen={stockLen}
              dark={dark}
            />

            {/* Legend */}
            <div style={{ position:"absolute", top:20, right:20, background:dark?"#161b22cc":"#ffffffcc", border:`1px solid ${T.bdr}`, borderRadius:6, padding:"6px 10px", fontSize:9 }}>
              {[["G00 Rapid", T.rapid], ["G01 Feed", T.feed], ["G02/03 Arc", T.arc]].map(([l,c])=>(
                <div key={l} style={{ display:"flex", alignItems:"center", gap:5, marginBottom:3 }}>
                  <div style={{ width:20, height:2, background:c, borderRadius:1 }}/>
                  <span style={{ color:T.mut }}>{l}</span>
                </div>
              ))}
              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                <div style={{ width:0, height:0, borderTop:"5px solid transparent", borderBottom:"5px solid transparent", borderLeft:"8px solid #ef4444" }}/>
                <span style={{ color:T.mut }}>Tool</span>
              </div>
            </div>
          </div>

          {/* Controls bar */}
          <div style={{ background:T.sur, borderTop:`1px solid ${T.bdr}`, padding:"10px 14px" }}>
            {/* Progress */}
            <div style={{ marginBottom:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ fontSize:9, color:T.mut }}>
                  {currentStep < 0 ? "Not started" : `Step ${currentStep + 1} of ${moves.length}`}
                </span>
                <span style={{ fontSize:9, color:T.acc, fontWeight:700 }}>{pct}%</span>
              </div>
              <div style={{ height:4, background:T.bdr, borderRadius:99, overflow:"hidden", cursor:"pointer" }}
                onClick={e => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const frac = (e.clientX - rect.left) / rect.width;
                  setStep(Math.floor(frac * moves.length) - 1);
                  setPlaying(false);
                }}>
                <div style={{ height:"100%", width:`${pct}%`, background:T.acc, borderRadius:99, transition:"width 0.1s" }}/>
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
              <button onClick={()=>{ setStep(-1); setPlaying(false); }}
                style={{ padding:"6px 12px", borderRadius:5, border:`1px solid ${T.bdr}`, background:"none", color:T.mut, cursor:"pointer", fontSize:11 }}>⏮ Reset</button>
              <button onClick={()=>setStep(s => Math.max(-1, s-1))}
                style={{ padding:"6px 12px", borderRadius:5, border:`1px solid ${T.bdr}`, background:"none", color:T.mut, cursor:"pointer", fontSize:11 }}>⏪ Step</button>
              <button onClick={()=>setPlaying(p=>!p)}
                style={{ padding:"6px 18px", borderRadius:5, border:"none", background:T.btn, color:T.btnTxt, cursor:"pointer", fontSize:13, fontWeight:700, minWidth:70 }}>
                {playing ? "⏸" : "▶"}
              </button>
              <button onClick={()=>setStep(s => Math.min(moves.length - 1, s+1))}
                style={{ padding:"6px 12px", borderRadius:5, border:`1px solid ${T.bdr}`, background:"none", color:T.mut, cursor:"pointer", fontSize:11 }}>Step ⏩</button>
              <button onClick={()=>{ setStep(moves.length - 1); setPlaying(false); }}
                style={{ padding:"6px 12px", borderRadius:5, border:`1px solid ${T.bdr}`, background:"none", color:T.mut, cursor:"pointer", fontSize:11 }}>⏭ End</button>

              {/* Speed */}
              <div style={{ display:"flex", alignItems:"center", gap:5, marginLeft:"auto" }}>
                <span style={{ fontSize:9, color:T.mut }}>Speed</span>
                <input type="range" min={20} max={500} step={10} value={500 - speed + 20}
                  onChange={e => setSpeed(500 - parseInt(e.target.value) + 20)}
                  style={{ width:70, accentColor:T.acc }}/>
                <span style={{ fontSize:9, color:T.mut }}>{Math.round(1000/speed)}×</span>
              </div>
            </div>
          </div>

          {/* Active move info */}
          {activeMove && (
            <div style={{ background:T.sur, borderTop:`1px solid ${T.bdr}`, padding:"8px 14px", display:"flex", gap:16, alignItems:"center", flexWrap:"wrap" }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ width:8, height:8, borderRadius:99, background:moveTypeColor(activeMove.type) }}/>
                <span style={{ fontSize:11, fontWeight:700, color:moveTypeColor(activeMove.type) }}>{moveTypeLabel(activeMove.type)}</span>
              </div>
              {activeMove.type !== "mcode" && (
                <>
                  <span style={{ fontSize:11, color:T.mut }}>
                    From: <span style={{ color:T.txt }}>X{activeMove.fromX?.toFixed(2)} Z{activeMove.fromZ?.toFixed(2)}</span>
                  </span>
                  <span style={{ fontSize:11, color:T.mut }}>
                    To: <span style={{ color:T.txt }}>X{activeMove.x?.toFixed(2)} Z{activeMove.z?.toFixed(2)}</span>
                  </span>
                  {activeMove.type === "feed" && (
                    <span style={{ fontSize:11, color:T.mut }}>
                      Dist: <span style={{ color:T.txt }}>
                        {Math.sqrt((activeMove.x-activeMove.fromX)**2+(activeMove.z-activeMove.fromZ)**2).toFixed(2)}mm
                      </span>
                    </span>
                  )}
                </>
              )}
              {activeMove.type === "mcode" && (
                <span style={{ fontSize:11, color:T.txt }}>M{activeMove.m}</span>
              )}
              <span style={{ fontSize:10, color:T.mut, fontStyle:"italic", marginLeft:"auto" }}>{activeMove.raw}</span>
            </div>
          )}
        </div>

        {/* Move list panel */}
        <div style={{ width:200, background:T.sur, borderLeft:`1px solid ${T.bdr}`, display:"flex", flexDirection:"column", minWidth:150 }}>
          <div style={{ padding:"8px 12px", borderBottom:`1px solid ${T.bdr}` }}>
            <span style={{ fontSize:10, letterSpacing:"0.15em", textTransform:"uppercase", color:T.mut }}>Toolpath ({moves.length})</span>
          </div>
          <div style={{ flex:1, overflowY:"auto" }}>
            {moves.map((mv, i) => (
              <div key={i} onClick={()=>{ setStep(i); setPlaying(false); }}
                style={{
                  padding:"5px 10px", cursor:"pointer", borderBottom:`1px solid ${T.bdr}20`,
                  background: i === currentStep ? (dark?"#1e2633":"#f0f4ff") : "none",
                  borderLeft: i === currentStep ? `3px solid ${moveTypeColor(mv.type)}` : "3px solid transparent",
                  transition:"background 0.1s",
                }}>
                <div style={{ fontSize:9, fontWeight:700, color:moveTypeColor(mv.type), marginBottom:1 }}>{moveTypeLabel(mv.type)}</div>
                <div style={{ fontSize:8, color:T.mut, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{mv.raw}</div>
              </div>
            ))}
            {moves.length === 0 && (
              <div style={{ padding:12, fontSize:10, color:T.mut }}>Write or paste G-code in the editor, then click ▶ Run.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
