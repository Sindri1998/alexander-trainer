import { useState, useEffect, useRef } from "react";

// ─── PUMA DNT2600M Code Database ─────────────────────────────────────────────
// Fanuc 0i-TF control · Live tooling (M suffix) · C-axis · BMT55P turret
// 12-station · Hydraulic tailstock · Hydraulic chuck · Bar capacity Ø81mm

const GCODES = [
  // ── Motion (Lathe context: X=diameter, Z=axial) ───────────────────────────
  { code:"G00", category:"Motion",    name:"Rapid Traverse",              desc:"Position at rapid speed. On the DNT2600M, X moves in diameter (U=incremental), Z is axial. No cutting — use for positioning only.", example:"G00 X100.0 Z5.0 T0101" },
  { code:"G01", category:"Motion",    name:"Linear Interpolation",        desc:"Straight-line cut at programmed feed rate (F). Used for turning, facing, chamfering. Feed in G99 (mm/rev) is standard on this lathe.", example:"G01 Z-80.0 F0.2" },
  { code:"G02", category:"Motion",    name:"CW Circular Interpolation",   desc:"Clockwise arc in the XZ plane (G18 active by default on lathe). Use R for radius or I/K for arc center offsets.", example:"G02 X40.0 Z-20.0 R10.0 F0.15" },
  { code:"G03", category:"Motion",    name:"CCW Circular Interpolation",  desc:"Counter-clockwise arc in the XZ plane. Common for concave radius blends on turned parts.", example:"G03 X60.0 Z-30.0 R15.0 F0.15" },
  { code:"G04", category:"Motion",    name:"Dwell",                       desc:"Pause at current position. P = time in milliseconds. Use after grooving or boring for clean flat bottom. Example: G04 P500 = 0.5 sec.", example:"G04 P500" },

  // ── Plane ─────────────────────────────────────────────────────────────────
  { code:"G17", category:"Plane",     name:"XY Plane Select",             desc:"Selects XY plane for live tool milling arcs. Must be active before G02/G03 in C-axis milling mode.", example:"G17" },
  { code:"G18", category:"Plane",     name:"XZ Plane Select (default)",   desc:"Default lathe plane. Arc moves (G02/G03) in the XZ plane for turning radii. Active at power-up.", example:"G18" },
  { code:"G19", category:"Plane",     name:"YZ Plane Select",             desc:"Select YZ plane. Rarely used — only for specialized live tool arcs on the C-axis.", example:"G19" },

  // ── Units ─────────────────────────────────────────────────────────────────
  { code:"G20", category:"Units",     name:"Inch Input",                  desc:"All coordinates and feeds in inches. Feed in in/rev (G99) or in/min (G98). Verify offsets match.", example:"G20" },
  { code:"G21", category:"Units",     name:"Metric Input (default)",      desc:"All coordinates in mm. Standard for this machine. Feed in mm/rev (G99). Power-up default.", example:"G21" },

  // ── Positioning / WCS ────────────────────────────────────────────────────
  { code:"G28", category:"Position",  name:"Return to Reference Point",   desc:"Move axes to machine zero via optional intermediate point. Always use G28 U0 W0 before a tool change to clear the turret safely.", example:"G28 U0 W0" },
  { code:"G30", category:"Position",  name:"2nd Reference Point",         desc:"Move to the 2nd reference point (user-defined). On DNT2600M often set to tool change position.", example:"G30 U0 W0" },
  { code:"G40", category:"Comp",      name:"Tool Nose Radius Comp OFF",   desc:"Cancel tool nose radius compensation (G41/G42). Must cancel before reference return or tool change.", example:"G40" },
  { code:"G41", category:"Comp",      name:"Tool Nose Comp — Left",       desc:"Offset tool path to left of cut direction by nose radius. Used for OD turning (tool moving in -Z, compensates for nose radius).", example:"G41 G01 Z-50.0 F0.2" },
  { code:"G42", category:"Comp",      name:"Tool Nose Comp — Right",      desc:"Offset tool path to right of cut direction by nose radius. Used for ID boring.", example:"G42 G01 Z-50.0 F0.2" },
  { code:"G50", category:"Position",  name:"Max Spindle Speed / Coord Set", desc:"G50 S3500: clamp max spindle RPM in G96 CSS mode. Also: G50 X_ Z_ sets coordinate system (older format, prefer G54).", example:"G50 S3500" },
  { code:"G52", category:"Position",  name:"Local Coord Shift",           desc:"Temporarily shift the coordinate system origin. Cancelled by G52 X0 Z0. Useful for sub-features.", example:"G52 X0.0 Z-50.0" },
  { code:"G53", category:"Position",  name:"Machine Coordinate Move",     desc:"Move in machine (absolute) coordinates, ignoring all work offsets. Non-modal. Use with G00 only.", example:"G53 G00 X0 Z0" },
  { code:"G54", category:"WCS",       name:"Work Offset 1 (standard)",    desc:"Activate work coordinate system 1. Most programs on this machine use G54 as the primary work offset.", example:"G54" },
  { code:"G55", category:"WCS",       name:"Work Offset 2",               desc:"Second work coordinate system. Useful when running two different part programs or sub-spindle setups.", example:"G55" },
  { code:"G56", category:"WCS",       name:"Work Offset 3",               desc:"Third work coordinate system.", example:"G56" },
  { code:"G90", category:"Position",  name:"Absolute Programming",        desc:"Coordinates are absolute from work origin. Standard mode. X always in diameter value on lathe.", example:"G90" },
  { code:"G91", category:"Position",  name:"Incremental Programming",     desc:"Coordinates are incremental (U, W addresses also work for incremental in Fanuc lathe).", example:"G91" },
  { code:"G92", category:"Threading", name:"Simple Threading Cycle",      desc:"Single-pass threading cycle. Easier than G32 but less flexible than G76. X=minor dia, Z=thread end, F=pitch.", example:"G92 X29.0 Z-28.0 F1.5" },

  // ── Turning / Facing Cycles ───────────────────────────────────────────────
  { code:"G70", category:"Lathe",     name:"Finish Turning Cycle",        desc:"Runs a finish pass over the profile defined by G71/G72/G73 rough cycle blocks P to Q. No stock removal in G70 itself.", example:"G70 P10 Q20 F0.1 S1200" },
  { code:"G71", category:"Lathe",     name:"OD Rough Turning Cycle",      desc:"Automatic stock removal along Z. U=depth per pass (radius), R=retract amount, P=start block, Q=end block, W=Z finish stock, F=feed.", example:"G71 U2.0 R0.5\nG71 P10 Q20 U0.3 W0.1 F0.25" },
  { code:"G72", category:"Lathe",     name:"Face Rough Turning Cycle",    desc:"Automatic stock removal along X (facing). W=depth per pass, R=retract. Same P/Q profile blocks as G71.", example:"G72 W2.0 R0.5\nG72 P10 Q20 U0.1 W0.3 F0.2" },
  { code:"G73", category:"Lathe",     name:"Pattern Repeat Cycle",        desc:"Follows profile shape with repeated passes. Good for castings/forgings where stock is near-net. U/W=total stock, R=passes.", example:"G73 U4.0 W4.0 R3\nG73 P10 Q20 U0.3 W0.1 F0.2" },
  { code:"G74", category:"Lathe",     name:"End Face Peck Drilling",      desc:"Peck drilling cycle at the face center (X0, Z-). Q=peck depth, F=feed. Also used for face grooving.", example:"G74 R1.0\nG74 X0 Z-30.0 Q5000 F0.1" },
  { code:"G75", category:"Lathe",     name:"OD/ID Grooving Cycle",        desc:"Grooving cycle on OD or ID. R=retract per peck, P=peck depth in X (radius, no decimal — G75 uses integer μm), F=feed.", example:"G75 R1.0\nG75 X28.0 Z-30.0 P3000 Q3000 F0.08" },
  { code:"G76", category:"Threading", name:"Multi-Pass Threading Cycle",  desc:"Automatic multi-pass threading. First line: P=thread form angle/finish passes/infeed method, Q=min infeed, R=finish allowance. Second line: X=minor dia, Z=end, P=thread height, Q=first pass depth, F=pitch.", example:"G76 P020060 Q50 R0.05\nG76 X28.93 Z-30.0 P535 Q200 F1.5" },

  // ── Single-pass threading ─────────────────────────────────────────────────
  { code:"G32", category:"Threading", name:"Thread Cutting (single pass)", desc:"One-pass thread synchronized to spindle encoder. Must loop manually. F=pitch. Used for tapered or special threads.", example:"G32 Z-30.0 F1.5" },

  // ── Canned Drilling Cycles (live tool: C-axis milling) ────────────────────
  { code:"G80", category:"Canned",    name:"Cancel Canned Cycle",         desc:"Cancel any active canned cycle (G83, G84, G85, etc.). Must call G80 before changing cycle or returning home.", example:"G80" },
  { code:"G81", category:"Canned",    name:"Drilling Cycle",              desc:"Simple drill with live tool: feed to Z depth, rapid retract. No peck. For shallow holes in C-axis mode.", example:"G81 Z-15.0 R2.0 F0.12" },
  { code:"G83", category:"Canned",    name:"Peck Drilling Cycle",         desc:"Full-retract peck drilling with live tool. Q=peck depth per pass. Best for deep holes — clears chips fully.", example:"G83 Z-30.0 R2.0 Q5.0 F0.08" },
  { code:"G84", category:"Canned",    name:"Tapping Cycle (rigid)",       desc:"Rigid tapping with live tool spindle. Feed rate MUST = pitch × RPM. Spindle auto-reverses at depth.", example:"G84 Z-18.0 R2.0 F1.25" },
  { code:"G85", category:"Canned",    name:"Boring Cycle",                desc:"Bore: feed in, feed out. Leaves clean finish. For reaming on live tool.", example:"G85 Z-25.0 R2.0 F0.08" },

  // ── Feed Mode ────────────────────────────────────────────────────────────
  { code:"G94", category:"Feed",      name:"Feed per Minute (IPM/MPM)",   desc:"Feed rate in mm/min or in/min. Use for live tool (C-axis) milling operations on the DNT2600M.", example:"G94 F200" },
  { code:"G95", category:"Feed",      name:"Feed per Revolution (default)", desc:"Feed rate in mm/rev or in/rev. Standard mode for turning. Synchronized to spindle speed. Power-up default.", example:"G95 F0.2" },
  { code:"G98", category:"Feed",      name:"Canned Cycle — Return to Initial", desc:"After canned cycle, tool retracts to Z height before the cycle call. Use when obstructions exist between holes.", example:"G98 G83 Z-30.0 R2.0 Q5.0 F0.08" },
  { code:"G99", category:"Feed",      name:"Canned Cycle — Return to R Plane", desc:"After canned cycle, retract only to R plane. Faster for multiple holes at same depth.", example:"G99 G83 Z-30.0 R2.0 Q5.0 F0.08" },

  // ── Spindle ──────────────────────────────────────────────────────────────
  { code:"G96", category:"Spindle",   name:"Constant Surface Speed (CSS)", desc:"Spindle RPM auto-adjusts as X changes to keep surface speed S (m/min or SFM) constant. ALWAYS pair with G50 Sxxx to clamp max RPM.", example:"G50 S3000\nG96 S220 M03" },
  { code:"G97", category:"Spindle",   name:"Constant RPM",                desc:"Fixed RPM mode. Required for threading (G76/G92/G32), drilling, tapping, and C-axis live tool operations.", example:"G97 S1800 M03" },

  // ── Polar Coordinate / C-Axis Milling ────────────────────────────────────
  { code:"G12.1", category:"C-Axis",  name:"Polar Interpolation ON",      desc:"Activates polar coordinate mode for face milling: C-axis becomes linear Y-equivalent. X=radius, C=angle. Use G97 first.", example:"G12.1\nG01 X30.0 C90.0 F150" },
  { code:"G13.1", category:"C-Axis",  name:"Polar Interpolation OFF",     desc:"Cancel polar interpolation mode. Must cancel before returning to turning mode or calling G28.", example:"G13.1" },
  { code:"G107", category:"C-Axis",   name:"Cylindrical Interpolation",   desc:"Maps C-axis (degrees) to a linear Y equivalent for OD milling (keyways, flats, slots on cylinder surface).", example:"G107 C30.0" },

  // ── Subprogramming / Macros ──────────────────────────────────────────────
  { code:"G65",  category:"Macro",    name:"Custom Macro Call",           desc:"Call a macro program (O-number) with variable arguments (#1=A, #2=B, etc.). Used for parametric part families on this machine.", example:"G65 P9010 A25.0 B-50.0" },
  { code:"G10",  category:"Macro",    name:"Programmable Data Input",     desc:"Set tool offsets or work offsets from within the program. G10 L10 P1 X_ Z_ R_ sets tool wear/geometry.", example:"G10 L10 P1 X0.0 Z0.05 R0.0" },
];

const MCODES = [
  // ── Program Control ───────────────────────────────────────────────────────
  { code:"M00", category:"Program",   name:"Program Stop",                desc:"Unconditional stop. Spindle and coolant stay ON. Operator must press Cycle Start to continue. Use for mid-program inspection.", example:"M00 (INSPECT PART)" },
  { code:"M01", category:"Program",   name:"Optional Stop",               desc:"Stops only if Optional Stop is active on the panel. Use for optional inspection points without impacting full production runs.", example:"M01" },
  { code:"M02", category:"Program",   name:"End of Program (no rewind)",  desc:"End program. Resets modal codes. Does not rewind to O-number start. Rarely used — prefer M30.", example:"M02" },
  { code:"M30", category:"Program",   name:"End Program + Rewind",        desc:"End program, reset control, rewind to O-number start. Standard last line of every DNT2600M program.", example:"M30" },
  { code:"M98", category:"Program",   name:"Subprogram Call",             desc:"Call external subprogram by O-number. L = repeat count. Puma DNT uses this for canned boring/grooving routines.", example:"M98 P1000 L3" },
  { code:"M99", category:"Program",   name:"Return from Subprogram",      desc:"Return to main program from subprogram. In main program: infinite loop restart.", example:"M99" },

  // ── Main Spindle ─────────────────────────────────────────────────────────
  { code:"M03", category:"Spindle",   name:"Main Spindle CW (fwd)",       desc:"Start main spindle clockwise. Standard direction for OD turning with right-hand tools. Use with S word.", example:"M03 S1500" },
  { code:"M04", category:"Spindle",   name:"Main Spindle CCW (rev)",      desc:"Start main spindle counter-clockwise. Used for left-hand threading or back-turning ops.", example:"M04 S800" },
  { code:"M05", category:"Spindle",   name:"Main Spindle Stop",           desc:"Stop main spindle. Does not cancel CSS (G96) — that is modal until cancelled.", example:"M05" },
  { code:"M19", category:"Spindle",   name:"Spindle Orient",              desc:"Orient spindle to defined angular position. Required before part transfer, C-axis engagement, or certain tool changes.", example:"M19" },

  // ── Live Tool Spindle (M suffix = milling head) ───────────────────────────
  { code:"M13", category:"LiveTool",  name:"Live Tool Spindle FWD",       desc:"Start live tool (BMT55P turret) spindle in forward (CW) direction. Use with S word in G97 mode.", example:"G97 S2500 M13" },
  { code:"M14", category:"LiveTool",  name:"Live Tool Spindle REV",       desc:"Start live tool spindle in reverse (CCW). Used for left-hand tapping with live tool.", example:"G97 S1200 M14" },
  { code:"M15", category:"LiveTool",  name:"Live Tool Spindle Stop",      desc:"Stop the live tool (milling) spindle on the turret. Always call before returning to turning mode.", example:"M15" },

  // ── C-Axis ────────────────────────────────────────────────────────────────
  { code:"M34", category:"C-Axis",    name:"C-Axis OFF",                  desc:"Disengage C-axis mode. Call before returning to normal turning. Main spindle returns to free rotation.", example:"M34" },
  { code:"M35", category:"C-Axis",    name:"C-Axis ON",                   desc:"Engage C-axis on the main spindle (positions/holds the chuck). Required before any G12.1, G107, or C-axis positioning.", example:"M35" },

  // ── Coolant ───────────────────────────────────────────────────────────────
  { code:"M07", category:"Coolant",   name:"Mist Coolant ON",             desc:"Activate mist coolant. Lighter delivery — good for light cuts or materials sensitive to thermal shock.", example:"M07" },
  { code:"M08", category:"Coolant",   name:"Flood Coolant ON",            desc:"Activate flood coolant. Standard coolant for turning, grooving, and threading on the DNT2600M.", example:"M08" },
  { code:"M09", category:"Coolant",   name:"All Coolant OFF",             desc:"Turn off flood and mist coolant. Standard call at end of each tool operation or before program end.", example:"M09" },
  { code:"M88", category:"Coolant",   name:"Through-Tool Coolant ON",     desc:"Activate coolant through the live tool spindle (high-pressure coolant through BMT55P tooling). Requires TSC option.", example:"M88" },
  { code:"M89", category:"Coolant",   name:"Through-Tool Coolant OFF",    desc:"Deactivate through-tool coolant.", example:"M89" },

  // ── Chuck / Clamp ─────────────────────────────────────────────────────────
  { code:"M10", category:"Chuck",     name:"Chuck CLOSE (clamp)",         desc:"Close/clamp the hydraulic chuck. Turret must be clear. Machine will alarm if chuck is open during cycle.", example:"M10" },
  { code:"M11", category:"Chuck",     name:"Chuck OPEN (unclamp)",        desc:"Open/unclamp the hydraulic chuck. Spindle must be stopped (M05) before M11 in most setups.", example:"M05\nM11" },

  // ── Tailstock ─────────────────────────────────────────────────────────────
  { code:"M46", category:"Tailstock", name:"Tailstock Body ADVANCE",      desc:"Advance the hydraulic tailstock body toward the spindle. Live center (MT#4) must be installed first. Confirm tool clearance before advancing.", example:"M46" },
  { code:"M47", category:"Tailstock", name:"Tailstock Body RETRACT",      desc:"Retract the hydraulic tailstock body away from spindle. Always retract quill first (M79) if extended, then body.", example:"M79\nM47" },
  { code:"M78", category:"Tailstock", name:"Tailstock Quill ADVANCE",     desc:"Extend the tailstock quill (barrel/spindle) forward to apply centre pressure after body is in position (M46). Controls how far the quill extends into the part.", example:"M46\nM78" },
  { code:"M79", category:"Tailstock", name:"Tailstock Quill RETRACT",     desc:"Retract the tailstock quill back into the body. Always call M79 before M47 (body retract) to prevent dragging the live centre across the finished part surface.", example:"M79\nM47" },
  { code:"M84", category:"Tailstock", name:"Tailstock Traction Bar ADVANCE", desc:"Advance the programmable traction bar to clamp and lock the tailstock body after advancing with M46. Ensures body is rigid during heavy turning. Machine option — verify your config.", example:"M46\nM84" },
  { code:"M85", category:"Tailstock", name:"Tailstock Traction Bar RETRACT", desc:"Retract the traction bar to release the tailstock body clamp. Must be called before M47 body retract when traction bar (M84) is active.", example:"M85\nM47" },
  { code:"G460", category:"Tailstock", name:"Auto Tailstock ADVANCE (macro)", desc:"Doosan macro-assigned G-code that automatically moves the tailstock body to the programmed Z position (V word = Z coordinate in machine reference). Calls internal macro O9014. Handles body traverse, pin engagement/disengagement, and quill advance automatically. Much safer than manual M46/M78 sequencing for production runs.", example:"G460 V-250.0" },
  { code:"G461", category:"Tailstock", name:"Auto Tailstock RETRACT (macro)", desc:"Doosan macro G-code that automatically retracts the tailstock — quill retract (M79), body return to park Z position, and pin operations — in the correct sequence. Calls internal macro O9013. Use at end of a shaft operation before parting or rechucking.", example:"G461" },

  // ── Door / Automation ────────────────────────────────────────────────────
  { code:"M52", category:"Aux",       name:"Auto Door OPEN",              desc:"Open the automatic sliding door. Used in automated cell when robot/loader needs access.", example:"M52" },
  { code:"M53", category:"Aux",       name:"Auto Door CLOSE",             desc:"Close the automatic sliding door before cycle start in automated cell.", example:"M53" },
  { code:"M54", category:"Aux",       name:"Parts Counter",               desc:"Increment the parts counter on the control. Typically called just before M30 to track completed parts.", example:"M54" },

  // ── Bar Feeder ────────────────────────────────────────────────────────────
  { code:"M36", category:"BarFeed",   name:"Bar Feed ADVANCE",            desc:"Signal bar feeder to advance bar stock to stop. Machine-specific handshake code for Puma series.", example:"M36" },
  { code:"M37", category:"BarFeed",   name:"Bar Feed RETRACT",            desc:"Retract bar feeder push tube before part cutoff or chuck operation.", example:"M37" },

  // ── Gear / Spindle Range ──────────────────────────────────────────────────
  { code:"M40", category:"Spindle",   name:"Spindle Gear Neutral",        desc:"Set gearbox to neutral. Machine selects automatically in modern configs, but can be called manually.", example:"M40" },
  { code:"M41", category:"Spindle",   name:"Spindle Gear Low",            desc:"Select low gear range (high torque, lower max RPM). For heavy roughing on large diameters.", example:"M41" },
  { code:"M42", category:"Spindle",   name:"Spindle Gear High",           desc:"Select high gear range (lower torque, higher max RPM). For finishing small diameters.", example:"M42" },

  // ── Override Control ──────────────────────────────────────────────────────
  { code:"M48", category:"Program",   name:"Override ENABLE",             desc:"Allow feed rate and spindle override knobs on panel to affect running program.", example:"M48" },
  { code:"M49", category:"Program",   name:"Override LOCK (cancel)",      desc:"Disable feed and spindle override knobs. Program runs at exactly programmed F and S. Use for threading passes.", example:"M49" },
];

const ALL_CODES = [...GCODES, ...MCODES];
const CATEGORIES = [...new Set(ALL_CODES.map(c => c.category))];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeQuestion(pool, mode) {
  const correct = pool[Math.floor(Math.random() * pool.length)];
  const wrong = shuffle(pool.filter(c => !(c.code === correct.code && c.name === correct.name))).slice(0, 3);
  const options = shuffle([correct, ...wrong]);
  const key = c => c.code + c.name;
  if (mode === "code-to-name") return {
    prompt: correct.code, promptLabel: "What does this code do on the PUMA DNT2600M?",
    promptSub: correct.example,
    options: options.map(o => ({ label: o.name, value: key(o) })),
    correct: key(correct), explanation: correct.desc, fullCode: correct,
  };
  if (mode === "name-to-code") return {
    prompt: correct.name, promptLabel: "Which code performs this function?",
    promptSub: correct.desc,
    options: options.map(o => ({ label: o.code, value: key(o) })),
    correct: key(correct), explanation: correct.desc, fullCode: correct,
  };
  if (mode === "snippet") return {
    prompt: correct.example, promptLabel: "What does this block do?",
    promptSub: null,
    options: options.map(o => ({ label: o.name, value: key(o) })),
    correct: key(correct), explanation: correct.desc, fullCode: correct,
  };
}

// ─── Visualizer ──────────────────────────────────────────────────────────────

function arrow(ctx, x1, y1, x2, y2, col) {
  const a = Math.atan2(y2-y1, x2-x1);
  ctx.strokeStyle = col; ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x2-Math.cos(a-0.4)*9, y2-Math.sin(a-0.4)*9);
  ctx.lineTo(x2,y2);
  ctx.lineTo(x2-Math.cos(a+0.4)*9, y2-Math.sin(a+0.4)*9);
  ctx.stroke();
}
function lbl(ctx, x, y, text, col, size=10) {
  ctx.fillStyle = col; ctx.font=`bold ${size}px monospace`; ctx.fillText(text,x,y);
}

function GCodeViz({ code }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    const W=cv.width, H=cv.height;
    ctx.clearRect(0,0,W,H);
    ctx.strokeStyle="#1e293b"; ctx.lineWidth=0.5;
    for (let x=0;x<=W;x+=20){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for (let y=0;y<=H;y+=20){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    const cx=W/2, cy=H/2;
    ctx.lineWidth=2; ctx.lineCap="round"; ctx.textAlign="left";
    const g = code;

    // Draw a lathe part silhouette for context
    const drawLathe = () => {
      ctx.strokeStyle="#1e3a5f"; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(50,cy-35); ctx.lineTo(230,cy-35); ctx.lineTo(230,cy+35); ctx.lineTo(50,cy+35); ctx.closePath(); ctx.stroke();
      ctx.strokeStyle="#0f2744"; ctx.lineWidth=0.5;
      ctx.beginPath(); ctx.moveTo(50,cy); ctx.lineTo(230,cy); ctx.stroke();
      ctx.lineWidth=2;
    };

    if (g.code==="G00") {
      drawLathe();
      ctx.setLineDash([6,4]); ctx.strokeStyle="#f97316"; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(230,cy-55); ctx.lineTo(80,cy-55); ctx.stroke();
      ctx.setLineDash([]); arrow(ctx,120,cy-55,80,cy-55,"#f97316");
      lbl(ctx,130,cy-60,"RAPID","#f97316",10);
      ctx.setLineDash([6,4]); ctx.strokeStyle="#f97316";
      ctx.beginPath(); ctx.moveTo(230,cy-55); ctx.lineTo(230,cy-35); ctx.stroke();
      ctx.setLineDash([]);
      lbl(ctx,50,cy+55,"X=Ø (diameter)  Z=axial","#64748b",9);
    } else if (g.code==="G01") {
      drawLathe();
      ctx.strokeStyle="#22d3ee"; ctx.lineWidth=2.5;
      ctx.beginPath(); ctx.moveTo(200,cy-35); ctx.lineTo(80,cy-35); ctx.stroke();
      arrow(ctx,130,cy-35,80,cy-35,"#22d3ee");
      lbl(ctx,100,cy-44,"TURN F0.2mm/rev","#22d3ee",10);
    } else if (g.code==="G02"||g.code==="G03") {
      drawLathe();
      const col=g.code==="G02"?"#a78bfa":"#34d399";
      const cw=g.code==="G02";
      ctx.strokeStyle=col; ctx.lineWidth=2.5;
      ctx.beginPath(); ctx.arc(140, cy-35, 30, cw?Math.PI:0, cw?0:Math.PI, !cw); ctx.stroke();
      arrow(ctx, cw?170:110, cy-35, cw?171:109, cy-36, col);
      lbl(ctx,110,cy+58,cw?"CW arc (concave on OD)":"CCW arc (convex on OD)",col,9);
    } else if (g.code==="G04") {
      drawLathe();
      ctx.strokeStyle="#fbbf24"; ctx.beginPath(); ctx.arc(cx,cy-10,28,0,Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx,cy-10); ctx.lineTo(cx,cy-35); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx,cy-10); ctx.lineTo(cx+18,cy+5); ctx.stroke();
      lbl(ctx,cx-30,cy+42,"DWELL P500 (0.5s)","#fbbf24",10);
    } else if (g.code==="G50") {
      ctx.textAlign="center";
      ctx.fillStyle="#fbbf24"; ctx.font="bold 16px monospace";
      ctx.fillText("G50 S3500",cx,cy-15);
      ctx.font="10px monospace"; ctx.fillStyle="#94a3b8";
      ctx.fillText("MAX SPINDLE CLAMP",cx,cy+5);
      ctx.fillText("Prevents overspeed in G96 CSS",cx,cy+22);
      ctx.fillText("as X approaches centerline",cx,cy+38);
      ctx.textAlign="left";
    } else if (g.code==="G96"||g.code==="G97") {
      ctx.strokeStyle="#334155"; ctx.lineWidth=1;
      for (let i=0;i<4;i++) {
        ctx.beginPath(); ctx.arc(cx,cy,15+i*18,0,Math.PI*2); ctx.stroke();
      }
      const col="#4ade80";
      ctx.strokeStyle=col; ctx.lineWidth=2;
      if (g.code==="G96") {
        [0.5,1.0,1.5,2.0].forEach((r,i)=>{
          const rpm=Math.round(220/(r)*10)/10;
          ctx.beginPath(); ctx.arc(cx,cy,r*30,0,0.3,false); ctx.stroke();
          lbl(ctx,cx+r*30+4,cy,`Ø${r*20}→${rpm}rpm`,col,8);
        });
        lbl(ctx,20,cy+80,"CSS: RPM changes as Ø changes","#fbbf24",9);
      } else {
        ctx.beginPath(); ctx.arc(cx,cy,40,0,Math.PI*2*0.7,false); ctx.stroke();
        arrow(ctx,cx+38,cy-12,cx+40,cy-16,col);
        lbl(ctx,cx-30,cy+60,"FIXED 1800 rpm","#4ade80",10);
      }
    } else if (g.code==="G71") {
      drawLathe();
      const profile=[[50,cy-10],[90,cy-10],[90,cy-30],[140,cy-30],[160,cy-22],[200,cy-22]];
      ctx.strokeStyle="#22d3ee"; ctx.lineWidth=1.5;
      ctx.beginPath(); profile.forEach(([x,y],i)=>i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)); ctx.stroke();
      for (let i=1;i<=4;i++) {
        ctx.strokeStyle="#f97316"; ctx.lineWidth=1; ctx.setLineDash([3,3]);
        ctx.beginPath(); ctx.moveTo(50,cy-10-i*6); ctx.lineTo(200,cy-10-i*6); ctx.stroke();
      }
      ctx.setLineDash([]); lbl(ctx,55,cy+58,"G71: OD rough passes → Z","#f97316",9);
      lbl(ctx,55,cy+70,"G70: finish pass on profile","#22d3ee",9);
    } else if (g.code==="G72") {
      drawLathe();
      for (let i=1;i<=4;i++) {
        ctx.strokeStyle="#f97316"; ctx.lineWidth=1; ctx.setLineDash([3,3]);
        const x=50+i*18;
        ctx.beginPath(); ctx.moveTo(x,cy-35); ctx.lineTo(x,cy+35); ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.strokeStyle="#22d3ee"; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(200,cy-35); ctx.lineTo(200,cy-10); ctx.lineTo(80,cy-10); ctx.stroke();
      lbl(ctx,55,cy+58,"G72: face rough passes → X","#f97316",9);
    } else if (g.code==="G73") {
      drawLathe();
      const profile=[[55,cy-8],[90,cy-22],[130,cy-28],[180,cy-28],[200,cy-15]];
      [8,5,2,0].forEach((off,i)=>{
        ctx.strokeStyle=i===3?"#22d3ee":"#f97316"; ctx.lineWidth=i===3?2:1;
        if (i!==3) ctx.setLineDash([3,3]);
        ctx.beginPath(); profile.forEach(([x,y],j)=>j===0?ctx.moveTo(x,y+off):ctx.lineTo(x,y+off)); ctx.stroke();
        ctx.setLineDash([]);
      });
      lbl(ctx,55,cy+58,"G73: repeat profile shape","#f97316",9);
      lbl(ctx,55,cy+70,"Good for near-net castings","#64748b",9);
    } else if (g.code==="G74") {
      drawLathe();
      ctx.strokeStyle="#22d3ee"; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(cx,cy-35); ctx.lineTo(cx,cy+10); ctx.stroke();
      arrow(ctx,cx,cy-10,cx,cy+10,"#22d3ee");
      for (let i=1;i<=3;i++) {
        ctx.strokeStyle="#fbbf24"; ctx.setLineDash([2,3]);
        ctx.beginPath(); ctx.moveTo(cx,cy-35+i*14); ctx.lineTo(cx,cy-35+(i-1)*14); ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle="#fbbf24"; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(cx-8,cy-35+i*14); ctx.lineTo(cx+8,cy-35+i*14); ctx.stroke();
      }
      lbl(ctx,cx+10,cy-20,"PECK","#fbbf24",9);
      lbl(ctx,cx+10,cy+15,"Z-30 Q5000","#22d3ee",9);
    } else if (g.code==="G75") {
      drawLathe();
      ctx.strokeStyle="#f472b6"; ctx.lineWidth=2;
      for (let i=0;i<3;i++) {
        const zpos=90+i*40;
        ctx.beginPath(); ctx.moveTo(zpos,cy-35); ctx.lineTo(zpos,cy-15); ctx.stroke();
        ctx.setLineDash([3,2]); ctx.strokeStyle="#f97316";
        ctx.beginPath(); ctx.moveTo(zpos,cy-15); ctx.lineTo(zpos,cy-35); ctx.stroke();
        ctx.setLineDash([]); ctx.strokeStyle="#f472b6";
      }
      lbl(ctx,55,cy+55,"G75: OD groove peck cycle","#f472b6",9);
    } else if (g.code==="G76"||g.code==="G92"||g.code==="G32") {
      drawLathe();
      ctx.strokeStyle="#f97316"; ctx.lineWidth=1;
      for (let i=0;i<10;i++) {
        const x=200-i*14;
        ctx.beginPath(); ctx.moveTo(x,cy-35); ctx.lineTo(x-7,cy-22); ctx.lineTo(x,cy-35+26); ctx.stroke();
      }
      lbl(ctx,55,cy+55,g.code==="G76"?"G76 multi-pass threading":g.code==="G92"?"G92 simple thread cycle":"G32 single-pass thread","#f97316",9);
      lbl(ctx,55,cy+68,"F=pitch (mm), X=minor dia","#64748b",9);
    } else if (g.code==="G70") {
      drawLathe();
      const profile=[[55,cy-8],[90,cy-22],[130,cy-28],[180,cy-28],[200,cy-15]];
      ctx.strokeStyle="#22d3ee"; ctx.lineWidth=2.5;
      ctx.beginPath(); profile.forEach(([x,y],i)=>i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)); ctx.stroke();
      arrow(ctx,profile[1][0],profile[1][1],profile[2][0],profile[2][1],"#22d3ee");
      lbl(ctx,55,cy+55,"G70: FINISH pass on P→Q profile","#22d3ee",9);
      lbl(ctx,55,cy+68,"After G71/G72/G73 roughing","#64748b",9);
    } else if (["G81","G83","G84","G85"].includes(g.code)) {
      // Live tool drill on face
      ctx.strokeStyle="#334155"; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(cx,cy,50,0,Math.PI*2); ctx.stroke();
      ctx.strokeStyle="#64748b"; ctx.lineWidth=1;
      for (let a=0;a<4;a++) {
        const angle=(a/4)*Math.PI*2;
        ctx.beginPath(); ctx.moveTo(cx+Math.cos(angle)*50,cy+Math.sin(angle)*50);
        ctx.lineTo(cx+Math.cos(angle)*40,cy+Math.sin(angle)*40); ctx.stroke();
      }
      const hx=cx+32, hy=cy-32;
      ctx.strokeStyle="#22d3ee"; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(hx,cy-70); ctx.lineTo(hx,hy+5); ctx.stroke();
      arrow(ctx,hx,cy-50,hx,hy+5,"#22d3ee");
      if (g.code==="G83") {
        for (let i=1;i<=3;i++) {
          ctx.strokeStyle="#fbbf24"; ctx.lineWidth=1; ctx.setLineDash([2,2]);
          ctx.beginPath(); ctx.moveTo(hx-6,cy-70+i*12); ctx.lineTo(hx+6,cy-70+i*12); ctx.stroke();
          ctx.setLineDash([]);
        }
        lbl(ctx,hx+6,cy-52,"PECK","#fbbf24",9);
      }
      lbl(ctx,20,cy+75,"Live tool (BMT55P) · C-axis mode","#64748b",9);
      lbl(ctx,20,cy+88,g.code==="G84"?"G84 RIGID TAP — F=pitch×RPM":g.code==="G83"?"G83 PECK DRILL Q=peck depth":g.code==="G85"?"G85 BORE feed in/out":"G81 DRILL no peck","#22d3ee",9);
    } else if (g.code==="G12.1"||g.code==="G13.1") {
      ctx.strokeStyle="#334155"; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.arc(cx,cy-10,55,0,Math.PI*2); ctx.stroke();
      const col=g.code==="G12.1"?"#f472b6":"#64748b";
      ctx.strokeStyle=col; ctx.lineWidth=2;
      if (g.code==="G12.1") {
        ctx.beginPath(); ctx.moveTo(cx-40,cy-10); ctx.lineTo(cx+40,cy-10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx,cy-10-55); ctx.lineTo(cx,cy-10+55); ctx.stroke();
        lbl(ctx,cx+8,cy-38,"C→Y","#f472b6",9);
        lbl(ctx,cx+8,cy-24,"X=R","#f472b6",9);
      } else {
        const cross=12;
        ctx.beginPath(); ctx.moveTo(cx-cross,cy-10-cross); ctx.lineTo(cx+cross,cy-10+cross); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx+cross,cy-10-cross); ctx.lineTo(cx-cross,cy-10+cross); ctx.stroke();
      }
      lbl(ctx,20,cy+65,g.code==="G12.1"?"G12.1 POLAR: face milling on chuck":"G13.1 CANCEL polar mode","#f472b6",9);
    } else if (g.code==="G107") {
      ctx.strokeStyle="#334155"; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.arc(cx,cy-10,45,0,Math.PI*2); ctx.stroke();
      ctx.strokeStyle="#fb923c"; ctx.lineWidth=2;
      ctx.beginPath();
      for (let i=0;i<=180;i+=10) {
        const a=(i/180)*Math.PI*2;
        const x=cx+Math.cos(a)*45, y=cy-10+Math.sin(a)*8;
        i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
      }
      ctx.stroke();
      lbl(ctx,20,cy+65,"G107: cylindrical interp (OD keyways)","#fb923c",9);
    } else if (g.code==="G40"||g.code==="G41"||g.code==="G42") {
      drawLathe();
      const col=g.code==="G40"?"#f87171":g.code==="G41"?"#22d3ee":"#a78bfa";
      ctx.strokeStyle="#475569"; ctx.setLineDash([4,3]);
      ctx.beginPath(); ctx.moveTo(60,cy-30); ctx.lineTo(210,cy-30); ctx.stroke();
      ctx.setLineDash([]);
      if (g.code!=="G40") {
        const off=g.code==="G41"?-8:8;
        ctx.strokeStyle=col; ctx.lineWidth=2;
        ctx.beginPath(); ctx.moveTo(60,cy-30+off); ctx.lineTo(210,cy-30+off); ctx.stroke();
        arrow(ctx,160,cy-30+off,210,cy-30+off,col);
        lbl(ctx,65,cy-30+off-5,g.code==="G41"?"COMP LEFT (OD turn)":"COMP RIGHT (bore)",col,9);
      }
      lbl(ctx,65,cy-30-12,"PROGRAMMED PATH","#475569",9);
      if (g.code==="G40") {
        lbl(ctx,cx-40,cy+30,"NO NOSE RADIUS COMP","#f87171",10);
      }
    } else if (g.code==="G54"||g.code==="G55"||g.code==="G56") {
      const wn=parseInt(g.code.slice(1))-53;
      const cols=["#22d3ee","#a78bfa","#34d399"];
      const col=cols[wn-1];
      ctx.strokeStyle="#1e3a5f"; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(40,cy+40); ctx.lineTo(230,cy+40); ctx.stroke();
      ctx.fillStyle="#334155"; ctx.fillRect(40,cy-30,80,70);
      ctx.strokeStyle="#475569"; ctx.strokeRect(40,cy-30,80,70);
      ctx.strokeStyle=col; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(40,cy+40); ctx.lineTo(40,cy-40); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(40,cy+40); ctx.lineTo(140,cy+40); ctx.stroke();
      ctx.fillStyle=col; ctx.beginPath(); ctx.arc(40,cy+40,5,0,Math.PI*2); ctx.fill();
      lbl(ctx,44,cy+38,`WCS ${wn} ORIGIN`,col,9);
      lbl(ctx,42,cy+55,"Machine home","#475569",9);
      ctx.fillStyle="#475569"; ctx.beginPath(); ctx.arc(230,cy+40,4,0,Math.PI*2); ctx.fill();
    } else if (g.code==="G20"||g.code==="G21") {
      ctx.textAlign="center";
      const col=g.code==="G20"?"#fb923c":"#22d3ee";
      ctx.fillStyle=col; ctx.font="bold 26px monospace";
      ctx.fillText(g.code==="G20"?"INCHES":"METRIC (mm)",cx,cy-15);
      ctx.font="10px monospace"; ctx.fillStyle="#94a3b8";
      ctx.fillText(g.code==="G20"?"Feed: in/rev  e.g. F0.008":"Feed: mm/rev  e.g. F0.20",cx,cy+8);
      ctx.fillText(g.code==="G20"?"X dia: 1.500\"":"X dia: 38.10mm",cx,cy+24);
      ctx.fillText("DNT2600M default: G21","#fbbf24",cx,cy+44);
      ctx.textAlign="left";
    } else if (g.code==="G28"||g.code==="G30") {
      ctx.setLineDash([4,4]); ctx.strokeStyle="#f87171"; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(190,cy-30); ctx.lineTo(50,cy-80); ctx.stroke();
      ctx.setLineDash([]);
      arrow(ctx,110,cy-57,50,cy-80,"#f87171");
      ctx.fillStyle="#f87171"; ctx.font="22px monospace";
      ctx.fillText("⌂",42,cy-72);
      lbl(ctx,90,cy-50,g.code==="G28"?"MACHINE HOME":"2nd REF POINT","#f87171",10);
      lbl(ctx,50,cy+30,"Always: G28 U0 W0","#94a3b8",9);
      lbl(ctx,50,cy+44,"before tool change!","#f87171",9);
    } else if (g.code==="G10") {
      ctx.textAlign="center";
      ctx.fillStyle="#c084fc"; ctx.font="bold 13px monospace";
      ctx.fillText("G10 L10 P1 X0.0 Z0.05",cx,cy-20);
      ctx.font="10px monospace"; ctx.fillStyle="#94a3b8";
      ctx.fillText("Set tool wear offset #1",cx,cy);
      ctx.fillText("Z+0.05 shifts part +Z",cx,cy+18);
      ctx.fillText("Use after measuring to adjust",cx,cy+34);
      ctx.textAlign="left";
    } else if (g.code==="G65") {
      ctx.textAlign="center";
      ctx.fillStyle="#a78bfa"; ctx.font="bold 13px monospace";
      ctx.fillText("G65 P9010 A25.0 B-50.0",cx,cy-20);
      ctx.font="10px monospace"; ctx.fillStyle="#94a3b8";
      ctx.fillText("Calls macro O9010",cx,cy);
      ctx.fillText("#1=A=25.0  #2=B=-50.0",cx,cy+18);
      ctx.fillText("Parametric family programming",cx,cy+34);
      ctx.textAlign="left";
    } else if (["M03","M04","M05"].includes(g.code)) {
      const dir=g.code==="M03"?1:g.code==="M04"?-1:0;
      const col=g.code==="M05"?"#475569":g.code==="M03"?"#22d3ee":"#f97316";
      ctx.strokeStyle="#334155"; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(cx,cy-10,40,0,Math.PI*2); ctx.stroke();
      ctx.strokeStyle=col;
      if (dir!==0) for (let i=0;i<6;i++) {
        const a=(i/6)*Math.PI*2;
        arrow(ctx,cx+Math.cos(a)*40,cy-10+Math.sin(a)*40,cx+Math.cos(a+dir*0.5)*40,cy-10+Math.sin(a+dir*0.5)*40,col);
      }
      lbl(ctx,cx-35,cy+50,g.code==="M03"?"MAIN SPINDLE CW":g.code==="M04"?"MAIN SPINDLE CCW":"SPINDLE STOP",col,10);
    } else if (["M13","M14","M15"].includes(g.code)) {
      const col=g.code==="M15"?"#475569":"#f472b6";
      ctx.strokeStyle="#334155"; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(cx-60,cy); ctx.lineTo(cx+60,cy); ctx.stroke();
      ctx.strokeStyle="#475569"; ctx.lineWidth=1;
      for (let i=-2;i<=2;i++) {
        ctx.beginPath(); ctx.moveTo(cx+i*20,cy); ctx.lineTo(cx+i*20-8,cy-25); ctx.stroke();
      }
      ctx.strokeStyle=col; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(cx,cy-35,16,0,Math.PI*2); ctx.stroke();
      if (g.code!=="M15") {
        const d=g.code==="M13"?1:-1;
        for (let i=0;i<4;i++) {
          const a=(i/4)*Math.PI*2;
          arrow(ctx,cx+Math.cos(a)*16,cy-35+Math.sin(a)*16,cx+Math.cos(a+d*0.5)*16,cy-35+Math.sin(a+d*0.5)*16,col);
        }
      }
      lbl(ctx,cx-50,cy+45,g.code==="M13"?"LIVE TOOL FWD (BMT55P)":g.code==="M14"?"LIVE TOOL REV (left tap)":"LIVE TOOL STOP",col,9);
    } else if (g.code==="M35"||g.code==="M34") {
      const col=g.code==="M35"?"#fbbf24":"#64748b";
      ctx.strokeStyle="#334155"; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(cx,cy-10,40,0,Math.PI*2); ctx.stroke();
      if (g.code==="M35") {
        ctx.strokeStyle="#fbbf24"; ctx.lineWidth=3;
        ctx.beginPath(); ctx.moveTo(cx,cy-10); ctx.lineTo(cx+40,cy-10); ctx.stroke();
        ctx.fillStyle="#fbbf24"; ctx.beginPath(); ctx.arc(cx+40,cy-10,5,0,Math.PI*2); ctx.fill();
        lbl(ctx,cx-45,cy+45,"C-AXIS ON → chuck indexes","#fbbf24",9);
      } else {
        const cross=12;
        ctx.strokeStyle="#64748b"; ctx.lineWidth=2.5;
        ctx.beginPath(); ctx.moveTo(cx-cross,cy-10-cross); ctx.lineTo(cx+cross,cy-10+cross); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx+cross,cy-10-cross); ctx.lineTo(cx-cross,cy-10+cross); ctx.stroke();
        lbl(ctx,cx-40,cy+45,"C-AXIS OFF → free spin","#64748b",9);
      }
    } else if (["M07","M08","M09","M88","M89"].includes(g.code)) {
      const on=g.code!=="M09"&&g.code!=="M89";
      const thru=g.code==="M88"||g.code==="M89";
      const col=on?(thru?"#a78bfa":"#22d3ee"):"#475569";
      ctx.strokeStyle=col;
      for (let i=-2;i<=2;i++) {
        ctx.beginPath(); ctx.moveTo(cx+i*20,cy-45);
        for (let y=0;y<90;y+=4) ctx.lineTo(cx+i*20+Math.sin(y*0.3)*(on?6:2),cy-45+y);
        ctx.stroke();
      }
      lbl(ctx,cx-45,cy+60,!on?"COOLANT OFF":thru?"THROUGH-TOOL (TSC) ON":"FLOOD COOLANT ON",col,9);
    } else if (g.code==="M10"||g.code==="M11") {
      const open=g.code==="M11",col=open?"#f97316":"#22d3ee";
      ctx.strokeStyle="#334155"; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(cx,cy-10,40,0,Math.PI*2); ctx.stroke();
      const gap=open?14:0;
      ctx.fillStyle=col;
      [-1,1].forEach(s=>{
        ctx.beginPath();
        ctx.moveTo(cx-s*gap,cy-50); ctx.lineTo(cx-s*gap,cy+30); ctx.lineTo(cx-s*40,cy-10); ctx.closePath(); ctx.fill();
      });
      lbl(ctx,cx-35,cy+55,open?"CHUCK OPEN (M11)":"CHUCK CLOSE (M10)",col,10);
      if (!open) lbl(ctx,cx-40,cy+68,"Needs M05 first!","#f87171",9);
    } else if (["M46","M47","M78","M79","M84","M85"].includes(g.code)) {
      // Bed line
      ctx.strokeStyle="#475569"; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(20,cy+48); ctx.lineTo(W-20,cy+48); ctx.stroke();
      // Chuck (left)
      ctx.fillStyle="#1e293b"; ctx.strokeStyle="#334155"; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.arc(48,cy,32,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle="#475569";
      for (let a=0;a<3;a++){const ang=(a/3)*Math.PI*2;ctx.beginPath();ctx.moveTo(48+Math.cos(ang)*32,cy+Math.sin(ang)*32);ctx.lineTo(48+Math.cos(ang)*20,cy+Math.sin(ang)*20);ctx.stroke();}
      // Workpiece stub
      ctx.fillStyle="#2d3748"; ctx.fillRect(78,cy-8,50,16);
      // Tailstock body position
      const bodyAdv=["M46","M78","M84"].includes(g.code);
      const bodyLeft=bodyAdv?170:205;
      const bodyCol=bodyAdv?"#22d3ee":"#f97316";
      ctx.fillStyle="#0f2744"; ctx.strokeStyle=bodyCol; ctx.lineWidth=2;
      ctx.beginPath(); ctx.roundRect(bodyLeft,cy-28,42,56,4); ctx.fill(); ctx.stroke();
      lbl(ctx,bodyLeft+4,cy+8,"BODY",bodyCol,8);
      // Quill for M78/M79
      if (g.code==="M78"||g.code==="M79") {
        const qOut=g.code==="M78";
        const qLen=qOut?28:6;
        ctx.strokeStyle="#7dd3fc"; ctx.lineWidth=5;
        ctx.beginPath(); ctx.moveTo(bodyLeft,cy); ctx.lineTo(bodyLeft-qLen,cy); ctx.stroke();
        ctx.fillStyle="#fbbf24";
        ctx.beginPath(); ctx.moveTo(bodyLeft-qLen,cy-7); ctx.lineTo(bodyLeft-qLen-9,cy); ctx.lineTo(bodyLeft-qLen,cy+7); ctx.closePath(); ctx.fill();
        lbl(ctx,bodyLeft-qLen-26,cy-14,qOut?"QUILL ←":"QUILL →","#fbbf24",9);
      }
      // Arrow for body motion
      if (g.code==="M46"||g.code==="M47") {
        if (bodyAdv) arrow(ctx,240,cy,175,cy,bodyCol);
        else arrow(ctx,170,cy,240,cy,bodyCol);
      }
      // Traction bar for M84/M85
      if (g.code==="M84"||g.code==="M85") {
        const locked=g.code==="M84";
        ctx.fillStyle=locked?"#4ade80":"#f97316";
        ctx.fillRect(bodyLeft+8,cy+30,26,8);
        lbl(ctx,bodyLeft+2,cy+52,locked?"TRACTION: LOCKED":"TRACTION: FREE",ctx.fillStyle,8);
      }
      // Label
      const labels={M46:"M46 BODY ADVANCE",M47:"M47 BODY RETRACT",M78:"M78 QUILL ADVANCE",M79:"M79 QUILL RETRACT",M84:"M84 LOCK (traction bar)",M85:"M85 RELEASE (traction bar)"};
      lbl(ctx,20,cy+70,labels[g.code]||g.code,bodyCol,9);
      // Safe sequence hint
      const seqs={M46:"Seq: M46 → M78 → [cut]",M47:"Seq: [cut] → M79 → M47",M78:"Seq: M46 → M78 → [cut]",M79:"Seq: [cut] → M79 → M47",M84:"After M46: M84 locks body",M85:"Before M47: M85 releases"};
      lbl(ctx,20,cy+83,seqs[g.code]||"","#94a3b8",8);
    } else if (g.code==="M19") {
      ctx.strokeStyle="#fbbf24"; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(cx,cy-10,38,0,Math.PI*2); ctx.stroke();
      ctx.strokeStyle="#fbbf24"; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(cx,cy-10); ctx.lineTo(cx+38,cy-10); ctx.stroke();
      ctx.fillStyle="#fbbf24"; ctx.beginPath(); ctx.arc(cx+38,cy-10,5,0,Math.PI*2); ctx.fill();
      lbl(ctx,cx-42,cy+50,"ORIENT to 0° → for C-axis / transfer","#fbbf24",9);
    } else if (["M52","M53"].includes(g.code)) {
      const open=g.code==="M52",col=open?"#22d3ee":"#f97316";
      ctx.strokeStyle="#475569"; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(60,cy-60); ctx.lineTo(60,cy+60); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(200,cy-60); ctx.lineTo(200,cy+60); ctx.stroke();
      if (open) {
        ctx.setLineDash([5,3]); ctx.strokeStyle=col;
        ctx.beginPath(); ctx.moveTo(60,cy); ctx.lineTo(200,cy); ctx.stroke();
        ctx.setLineDash([]); arrow(ctx,130,cy,200,cy,col);
        lbl(ctx,80,cy-10,"AUTO DOOR OPENING","#22d3ee",9);
      } else {
        ctx.strokeStyle=col; ctx.lineWidth=3;
        ctx.beginPath(); ctx.moveTo(130,cy-50); ctx.lineTo(130,cy+50); ctx.stroke();
        lbl(ctx,80,cy-10,"AUTO DOOR CLOSED","#f97316",9);
      }
    } else if (g.code==="M36"||g.code==="M37") {
      const adv=g.code==="M36",col=adv?"#34d399":"#f97316";
      ctx.strokeStyle="#475569"; ctx.lineWidth=1;
      ctx.fillStyle="#1e3a5f"; ctx.fillRect(180,cy-20,60,40); ctx.strokeRect(180,cy-20,60,40);
      lbl(ctx,185,cy+5,"CHUCK","#94a3b8",9);
      ctx.strokeStyle="#475569"; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(30,cy); ctx.lineTo(180,cy); ctx.stroke();
      ctx.strokeStyle=col; ctx.lineWidth=2.5;
      if (adv) {
        ctx.beginPath(); ctx.moveTo(50,cy); ctx.lineTo(150,cy); ctx.stroke();
        arrow(ctx,110,cy,150,cy,col);
        lbl(ctx,55,cy-12,"BAR ADVANCE","#34d399",9);
      } else {
        arrow(ctx,130,cy,60,cy,col);
        lbl(ctx,55,cy-12,"BAR RETRACT","#f97316",9);
      }
    } else if (["M00","M01","M02","M30"].includes(g.code)) {
      ctx.textAlign="center";
      const col=g.code==="M30"?"#34d399":g.code==="M01"?"#fbbf24":"#f87171";
      ctx.fillStyle=col; ctx.font="bold 32px monospace";
      ctx.fillText(["M00","M01"].includes(g.code)?"⏸":"⏹",cx,cy+8);
      ctx.font="10px monospace"; ctx.fillStyle="#94a3b8";
      const sub={M00:"STOP — press Cycle Start to continue",M01:"Optional stop (if panel switch ON)",M02:"End — no rewind",M30:"End + REWIND ← standard"};
      ctx.fillText(sub[g.code],cx,cy+34);
      ctx.textAlign="left";
    } else if (["M41","M42","M40"].includes(g.code)) {
      ctx.textAlign="center";
      const col=g.code==="M41"?"#f97316":g.code==="M42"?"#22d3ee":"#64748b";
      ctx.fillStyle=col; ctx.font="bold 15px monospace";
      ctx.fillText(g.code==="M41"?"LOW GEAR":g.code==="M42"?"HIGH GEAR":"NEUTRAL",cx,cy-10);
      ctx.font="10px monospace"; ctx.fillStyle="#94a3b8";
      ctx.fillText(g.code==="M41"?"High torque — heavy roughing":g.code==="M42"?"High RPM — finishing":"No drive to spindle",cx,cy+10);
      ctx.textAlign="left";
    } else if (g.code==="M98"||g.code==="M99") {
      ctx.strokeStyle="#a78bfa"; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(40,cy-35); ctx.lineTo(150,cy-35); ctx.lineTo(150,cy+35); ctx.lineTo(40,cy+35); ctx.closePath(); ctx.stroke();
      lbl(ctx,60,cy,"MAIN","#a78bfa",11);
      if (g.code==="M98") {
        ctx.strokeStyle="#22d3ee"; ctx.setLineDash([4,3]);
        ctx.beginPath(); ctx.moveTo(150,cy); ctx.lineTo(200,cy); ctx.lineTo(200,cy+60); ctx.lineTo(170,cy+60); ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle="#22d3ee"; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(170,cy+40); ctx.lineTo(240,cy+40); ctx.lineTo(240,cy+80); ctx.lineTo(170,cy+80); ctx.closePath(); ctx.stroke();
        lbl(ctx,175,cy+65,"SUBPROG","#22d3ee",9);
      } else {
        ctx.strokeStyle="#f97316"; ctx.setLineDash([4,3]);
        ctx.beginPath(); ctx.moveTo(170,cy+60); ctx.lineTo(120,cy+60); ctx.lineTo(120,cy+35); ctx.stroke();
        ctx.setLineDash([]); arrow(ctx,122,cy+40,122,cy+35,"#f97316");
        lbl(ctx,125,cy+58,"RETURN","#f97316",9);
      }
    } else if (g.code==="M48"||g.code==="M49") {
      ctx.textAlign="center";
      const col=g.code==="M48"?"#34d399":"#f87171";
      ctx.fillStyle=col; ctx.font="bold 14px monospace";
      ctx.fillText(g.code==="M48"?"OVERRIDE ACTIVE":"OVERRIDE LOCKED",cx,cy-10);
      ctx.font="10px monospace"; ctx.fillStyle="#94a3b8";
      ctx.fillText(g.code==="M48"?"Feed/Speed knobs work":"Lock for threading passes",cx,cy+12);
      ctx.textAlign="left";
    } else if (g.code==="G17"||g.code==="G18"||g.code==="G19") {
      const labels={G17:"XY (live tool face mill)",G18:"XZ (lathe default)",G19:"YZ (rare)"};
      ctx.textAlign="center";
      ctx.fillStyle="#818cf8"; ctx.font="bold 14px monospace";
      ctx.fillText(labels[g.code],cx,cy-10);
      ctx.font="10px monospace"; ctx.fillStyle="#94a3b8";
      ctx.fillText("Arc plane selection",cx,cy+12);
      ctx.fillText(g.code==="G18"?"Active at power-up on DNT2600M":g.code==="G17"?"Use in C-axis milling mode":"Rarely used",cx,cy+28);
      ctx.textAlign="left";
    } else if (g.code==="G94"||g.code==="G95") {
      ctx.textAlign="center";
      const col=g.code==="G95"?"#22d3ee":"#fb923c";
      ctx.fillStyle=col; ctx.font="bold 14px monospace";
      ctx.fillText(g.code==="G95"?"FEED/REV (default)":"FEED/MIN",cx,cy-15);
      ctx.font="10px monospace"; ctx.fillStyle="#94a3b8";
      ctx.fillText(g.code==="G95"?"G95 F0.2 → 0.2 mm/rev":"G94 F200 → 200 mm/min",cx,cy+5);
      ctx.fillText(g.code==="G95"?"Use for all turning ops":"Use for live tool milling",cx,cy+22);
      ctx.fillText("DNT2600M default: G95","#fbbf24",cx,cy+44);
      ctx.textAlign="left";
    } else if (g.code==="G98"||g.code==="G99") {
      ctx.strokeStyle="#94a3b8"; ctx.setLineDash([3,3]);
      ctx.beginPath(); ctx.moveTo(50,cy-40); ctx.lineTo(230,cy-40); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(50,cy); ctx.lineTo(230,cy); ctx.stroke();
      ctx.setLineDash([]);
      lbl(ctx,235,cy-38,"INITIAL Z","#94a3b8",9); lbl(ctx,235,cy+2,"R PLANE","#fbbf24",9);
      const col=g.code==="G98"?"#22d3ee":"#a78bfa";
      const retY=g.code==="G98"?cy-40:cy;
      ctx.strokeStyle=col; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(130,cy+45); ctx.lineTo(130,retY); ctx.stroke();
      arrow(ctx,130,cy+20,130,retY,col);
      lbl(ctx,50,cy+60,g.code==="G98"?"→ retract to INITIAL Z":"→ retract to R PLANE",col,9);
    } else if (g.code==="M54") {
      ctx.textAlign="center";
      ctx.fillStyle="#34d399"; ctx.font="bold 30px monospace";
      ctx.fillText("✓",cx,cy+10);
      ctx.font="11px monospace"; ctx.fillStyle="#94a3b8";
      ctx.fillText("PARTS COUNTER +1",cx,cy+38);
      ctx.fillText("Call before M30",cx,cy+54);
      ctx.textAlign="left";
    } else if (g.code==="G460"||g.code==="G461") {
      const adv=g.code==="G460";
      ctx.strokeStyle="#475569"; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(20,cy+50); ctx.lineTo(W-20,cy+50); ctx.stroke();
      ctx.fillStyle="#1e293b"; ctx.strokeStyle="#334155"; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.arc(48,cy-5,30,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle="#475569";
      for(let a=0;a<3;a++){const ang=(a/3)*Math.PI*2;ctx.beginPath();ctx.moveTo(48+Math.cos(ang)*30,cy-5+Math.sin(ang)*30);ctx.lineTo(48+Math.cos(ang)*20,cy-5+Math.sin(ang)*20);ctx.stroke();}
      ctx.fillStyle="#2d3748"; ctx.fillRect(76,cy-13,60,16);
      const bx=adv?175:215;
      const col=adv?"#22d3ee":"#f97316";
      ctx.fillStyle="#0f2744"; ctx.strokeStyle=col; ctx.lineWidth=2;
      ctx.beginPath(); ctx.rect(bx,cy-30,44,60); ctx.fill(); ctx.stroke();
      if(adv){
        ctx.strokeStyle="#7dd3fc"; ctx.lineWidth=5;
        ctx.beginPath(); ctx.moveTo(bx,cy-5); ctx.lineTo(bx-24,cy-5); ctx.stroke();
        ctx.fillStyle="#fbbf24";
        ctx.beginPath(); ctx.moveTo(bx-24,cy-12); ctx.lineTo(bx-33,cy-5); ctx.lineTo(bx-24,cy+2); ctx.closePath(); ctx.fill();
      }
      if(adv) arrow(ctx,240,cy-5,180,cy-5,col);
      else arrow(ctx,175,cy-5,240,cy-5,col);
      ctx.fillStyle=col+"33"; ctx.strokeStyle=col; ctx.lineWidth=1;
      ctx.beginPath(); ctx.rect(85,cy+56,110,18); ctx.fill(); ctx.stroke();
      lbl(ctx,99,cy+68,"MACRO O901"+(adv?"4":"3"),col,9);
      lbl(ctx,20,cy+36,adv?"G460 V-250.0 — AUTO TS ADV":"G461 — AUTO TS RETRACT",col,9);
      lbl(ctx,20,cy+47,adv?"Calls O9014 · full sequence":"Calls O9013 · safe retract","#94a3b8",8);
    } else {
      ctx.textAlign="center";
      ctx.fillStyle="#334155"; ctx.font="bold 40px monospace"; ctx.fillText(g.code,cx,cy+14);
      ctx.font="11px monospace"; ctx.fillStyle="#94a3b8"; ctx.fillText(g.name,cx,cy+36);
      ctx.textAlign="left";
    }
    ctx.textAlign="left";
  }, [code]);

  return <canvas ref={ref} width={280} height={200} style={{borderRadius:"8px",background:"#1e293b",display:"block"}}/>;
}

// ─── Lessons Data ────────────────────────────────────────────────────────────

const LESSONS = [
  {
    id:"basics", title:"Lathe Basics", subtitle:"How the DNT2600M thinks about coordinates",
    icon:"📐", color:"#38bdf8",
    steps:[
      { heading:"The Coordinate System",
        body:`On the PUMA DNT2600M, all motion uses two primary axes:\n\n• Z-axis — runs left-right along the spindle centerline. Z0 is typically the face of the part. Negative Z moves INTO the part.\n\n• X-axis — runs toward/away from the centerline. ALWAYS programmed as DIAMETER. So X50.0 means the tool is at a point where the part is 50mm in diameter.\n\nThis diameter convention is the #1 thing that trips up mill programmers. If you want to cut to a 30mm radius, you program X60.0 (60mm diameter).`,
        highlight:["G00","G01","G90"],
        tip:"💡 Quick check: if your part should be Ø40mm, your X value is 40.0 — not 20.0."
      },
      { heading:"Rapid vs Feed",
        body:`Every move on the DNT2600M is either RAPID or FEED:\n\nG00 — RAPID TRAVERSE\nMoves at maximum machine speed. No cutting. Use to position the tool before and after cuts. The path is NOT guaranteed to be straight — axes move independently.\n\nG01 — LINEAR INTERPOLATION\nMoves in a perfectly straight line at the programmed feed rate (F). This is your cutting move for turning, facing, chamfering, and boring.\n\nRule of thumb: if the tool is touching the part, you need G01. If it's in the air, use G00.`,
        highlight:["G00","G01"],
        tip:"⚠️ Never rapid into material. Approach with G00 to a safe clearance point (e.g. Z2.0), then switch to G01."
      },
      { heading:"Absolute vs Incremental",
        body:`G90 — ABSOLUTE MODE (default, most common)\nAll coordinates are measured from the work origin (Z0 face of part, X0 centerline). X50.0 always means Ø50mm from center.\n\nG91 — INCREMENTAL MODE\nCoordinates are relative offsets from the current position.\n\nOn Fanuc lathes you can also use address letters:\n  U = incremental X\n  W = incremental Z\n\nSo G01 W-30.0 F0.2 turns 30mm in the -Z direction from wherever you are now.`,
        highlight:["G90","G91"],
        tip:"💡 Fanuc tip: U and W work in G90 mode too — mix absolute and incremental in the same block."
      },
      { heading:"Feed Rate Modes",
        body:`G95 — FEED PER REVOLUTION (default on DNT2600M)\nF value = mm per spindle revolution. Standard for turning — chip load stays constant as RPM changes.\n  Example: F0.2 = 0.2mm per revolution\n\nG94 — FEED PER MINUTE\nF value = mm/min. Use in C-axis live tool milling mode.\n  Example: F150 = 150mm per minute\n\nThe machine powers up in G95. When you switch to live tool milling, switch to G94. Remember to switch back when returning to turning!`,
        highlight:["G94","G95"],
        tip:"💡 For G95: chip load = feed rate. Doubling RPM with same F doubles mm/min — the chip stays the same size."
      },
    ]
  },
  {
    id:"spindle", title:"Spindle Control", subtitle:"Speed, direction, CSS, and safety",
    icon:"⚙️", color:"#4ade80",
    steps:[
      { heading:"Starting and Stopping",
        body:`Three M-codes control the main spindle:\n\nM03 S___ — Start spindle CLOCKWISE (standard for OD turning with right-hand tools)\nM04 S___ — Start spindle COUNTER-CLOCKWISE (left-hand tools, back-boring)\nM05        — Stop spindle\n\nThe S word sets RPM (in G97 mode) or surface speed in m/min (in G96 mode).\n\nAlways include S before or with M03/M04. The spindle won't start without a speed command.\n\nExample: G97 S1500 M03 — start at 1500 RPM, clockwise`,
        highlight:["M03","M04","M05"],
        tip:"💡 M05 doesn't cancel G96 CSS mode — speed mode stays modal until you change it."
      },
      { heading:"Constant RPM vs CSS",
        body:`G97 — CONSTANT RPM\nSpindle runs at exactly the S speed. Use for:\n  • Threading (G76, G92, G32) — critical, must be G97\n  • C-axis / live tool operations\n  • Drilling and tapping\n  • Small diameters where CSS goes too fast\n\nG96 — CONSTANT SURFACE SPEED (CSS)\nSpindle RPM auto-adjusts as X (diameter) changes to keep cutting speed constant.\n\nALWAYS pair with G50 S3500 to prevent overspeed at centerline!\n\nExample:\n  G50 S3000    (clamp max at 3000 RPM)\n  G96 S220 M03 (220 m/min surface speed, CW)`,
        highlight:["G96","G97","G50","M03"],
        tip:"⚠️ Forgetting G50 with G96 can cause the spindle to overspeed dangerously as X approaches 0."
      },
      { heading:"Gear Ranges",
        body:`The DNT2600M has automatic gear selection but you can command it manually:\n\nM41 — Low gear (high torque, lower max RPM)\nM42 — High gear (lower torque, higher max RPM)\nM40 — Neutral\n\nThe control usually selects gear automatically based on S speed. You'll rarely need to specify this, but it can help with heavy interrupted cuts where you want to force low gear for maximum torque.`,
        highlight:["M41","M42","M40"],
        tip:"💡 If the machine hesitates or gear-hunts during a roughing pass, try commanding M41 explicitly."
      },
      { heading:"Spindle Orient",
        body:`M19 — SPINDLE ORIENT\n\nIndexes the main spindle to a precise angular position. On the DNT2600M this is used for:\n\n1. Engaging C-axis mode (M35) — spindle must be oriented and stopped first\n2. Live tool operations requiring angular positioning\n\nSequence for C-axis engagement:\n  M05        (stop main spindle)\n  M19        (orient to 0°)\n  M35        (engage C-axis servo)\n  G97 S2000 M13  (start live tool)`,
        highlight:["M19","M35","M34"],
        tip:"💡 M35 engages the C-axis servo. Without M19 first, the C-axis may index to an unexpected angle."
      },
    ]
  },
  {
    id:"turning", title:"Turning Cycles", subtitle:"G71, G72, G73, G70 — roughing and finishing",
    icon:"🔄", color:"#22d3ee",
    steps:[
      { heading:"Why Use Canned Cycles?",
        body:`Manual turning (G00/G01) works for simple shapes, but for complex profiles you'd need to calculate every pass position. Canned cycles do this automatically.\n\nThe DNT2600M Fanuc control has four turning cycles:\n\nG71 — OD/ID rough turning (passes parallel to Z axis)\nG72 — Face rough turning (passes parallel to X axis)\nG73 — Pattern repeat (follows profile shape with offset)\nG70 — Finish pass (follows the G71/72/73 profile precisely)\n\nYou define the FINAL profile once (between N-block P and Q), and the control calculates all rough passes automatically.`,
        highlight:["G70","G71","G72","G73"],
        tip:"💡 G71/G72/G73 all leave stock deliberately (U and W parameters). G70 then removes that stock on the finish pass."
      },
      { heading:"G71 — OD Rough Turning",
        body:`G71 removes stock in passes parallel to the Z axis. Two-line format:\n\nLine 1:  G71 U___ R___\n  U = depth of cut per pass (radius, e.g. U2.0 = 2mm per side)\n  R = retract amount between passes (e.g. R0.5)\n\nLine 2:  G71 P___ Q___ U___ W___ F___\n  P = block number where finish profile starts\n  Q = block number where finish profile ends\n  U = X finish stock to leave (diameter, e.g. U0.3)\n  W = Z finish stock to leave\n  F = roughing feed rate\n\nExample:\n  G71 U2.0 R0.5\n  G71 P10 Q20 U0.3 W0.1 F0.25`,
        highlight:["G71"],
        tip:"💡 The profile blocks (P to Q) define the FINISHED shape, not the rough cuts. G71 figures out the passes."
      },
      { heading:"G70 — Finish Pass",
        body:`After G71/G72/G73 roughing, call G70 to take the finish pass:\n\n  G70 P___ Q___ F___ S___\n  P = same start block as the rough cycle\n  Q = same end block as the rough cycle\n  F = finish feed rate (lower, e.g. F0.1)\n  S = finish spindle speed\n\nFull sequence example:\n  G96 S220 M03         (CSS, CW)\n  G00 X65.0 Z2.0 T0101 (approach)\n  G71 U2.0 R0.5\n  G71 P10 Q20 U0.3 W0.1 F0.25\n  G70 P10 Q20 F0.1 S280\n  G28 U0 W0 M05`,
        highlight:["G70","G71"],
        tip:"⚠️ The F and S in G70 override the values in the profile blocks — always specify them on the G70 line."
      },
      { heading:"G72 & G73",
        body:`G72 — FACE ROUGH TURNING\nPasses run parallel to X (facing passes). Used when you have more axial stock than radial, or for facing down a shoulder.\n\n  G72 W___ R___\n  G72 P___ Q___ U___ W___ F___\n\nG73 — PATTERN REPEAT\nFollows the profile shape at an offset, reducing the offset each pass. Ideal for castings or forgings already close to final shape — G71 would cut mostly air.\n\n  G73 U___ W___ R___     (U=X total stock, W=Z total stock, R=number of passes)\n  G73 P___ Q___ U___ W___ F___\n\nChoose G72 when stock is mainly axial.\nChoose G73 when blank already resembles the part.`,
        highlight:["G72","G73"],
        tip:"💡 Bar stock → G71. Cast/forged blank → G73. Facing a flange → G72."
      },
    ]
  },
  {
    id:"threading", title:"Threading on the Lathe", subtitle:"G76, G92, G32 — cut threads right first time",
    icon:"🔩", color:"#f87171",
    steps:[
      { heading:"How Lathe Threading Works",
        body:`Threading on the DNT2600M is spindle-synchronized — the control reads a spindle encoder and times Z-axis feed to match exactly one pitch per revolution.\n\nThree options:\n\nG76 — Multi-pass threading cycle (recommended)\n  Automatically calculates all passes, infeed angle, finish passes.\n\nG92 — Simple threading cycle\n  One cycle per depth; you specify each pass depth manually.\n\nG32 — Single-pass threading\n  One synchronized pass; you must loop it yourself.\n\nALWAYS use G97 (constant RPM) for threading. Never G96.`,
        highlight:["G76","G92","G32","G97"],
        tip:"⚠️ Threading requires M49 (override lock) if the operator might bump the feed override knob mid-thread."
      },
      { heading:"G76 — The Recommended Method",
        body:`G76 is the most powerful threading cycle. Two-line format:\n\nLine 1:  G76 P___ Q___ R___\n  P = 6-digit code: (finish passes)(min angle)(thread form)\n      e.g. P020060 = 2 finish passes, 0° lead-in, 60° thread form\n  Q = minimum infeed depth in μm (no decimal), e.g. Q50\n  R = finish allowance in mm, e.g. R0.05\n\nLine 2:  G76 X___ Z___ P___ Q___ F___\n  X = minor (root) diameter\n  Z = thread end position\n  P = thread height in μm (no decimal)\n  Q = first pass depth in μm\n  F = pitch in mm/rev\n\nM30×1.5 example:\n  G97 S800 M03\n  G76 P020060 Q50 R0.05\n  G76 X27.94 Z-28.0 P1030 Q250 F1.5`,
        highlight:["G76"],
        tip:"💡 Minor diameter for M30×1.5: 30 − (2 × 0.9743 × 1.5) = 27.08mm. Always verify with thread gauges."
      },
      { heading:"G92 — Simple Thread Cycle",
        body:`G92 cuts one pass per call. You manually decrease X each time:\n\n  G97 S800 M03\n  G92 X29.2 Z-28.0 F1.5   (1st pass)\n  G92 X28.7 Z-28.0 F1.5\n  G92 X28.3 Z-28.0 F1.5\n  G92 X27.94 Z-28.0 F1.5  (finish)\n  G92 X27.94 Z-28.0 F1.5  (spring pass)\n\nZ stays the same every line — only X changes.\nF is always the pitch.\n\nUseful when you need tight control over each pass depth, or verifying a thread setup interactively in MDI.`,
        highlight:["G92"],
        tip:"💡 Always take a spring pass (repeat finish depth) to clean up deflection from the previous pass."
      },
      { heading:"Thread Depth Reference",
        body:`For metric 60° threads:\n  Thread depth per side = 0.6495 × pitch\n\nCommon values:\n  M8×1.25  → P812   minor ≈ 6.38mm\n  M10×1.5  → P974   minor ≈ 8.05mm\n  M12×1.75 → P1136  minor ≈ 9.73mm\n  M16×2.0  → P1299  minor ≈ 13.40mm\n  M20×2.5  → P1624  minor ≈ 16.75mm\n  M30×1.5  → P974   minor ≈ 28.05mm\n\nMinor diameter = nominal − (2 × depth per side)\n\nIn G76: P value = thread height in μm (no decimal)\n  e.g. 0.974mm → P974`,
        highlight:["G76","G92"],
        tip:"💡 Gauge check: won't enter = too tight (go deeper, reduce X). Won't tighten = too loose (check tool wear, spring pass)."
      },
    ]
  },
  {
    id:"livetools", title:"C-Axis & Live Tools", subtitle:"Milling, drilling, and tapping with the BMT55P turret",
    icon:"🪛", color:"#e879f9",
    steps:[
      { heading:"Live Tool Basics",
        body:`The DNT2600M's 'M' suffix means it has a live tool turret (BMT55P). Turret stations can hold powered tools (end mills, drills, taps) that spin independently of the main spindle.\n\nKey M-codes:\n  M13 — Live tool spindle FORWARD (CW)\n  M14 — Live tool spindle REVERSE (CCW, for left-hand taps)\n  M15 — Live tool spindle STOP\n\nFeed mode must be G94 (feed/min) for live tool milling.\nSpeed mode must be G97 (fixed RPM).\n\nExample:\n  G97 S2500 M13    (live tool at 2500 RPM, CW)\n  G94 F150         (150 mm/min)`,
        highlight:["M13","M14","M15","G94","G97"],
        tip:"💡 Always stop the live tool (M15) and cancel C-axis (M34) before returning to turning mode."
      },
      { heading:"Engaging the C-Axis",
        body:`The C-axis turns the main spindle into a positioning/contouring axis (degrees) for live tool work.\n\nSequence to ENGAGE:\n  M05        — Stop main spindle\n  M19        — Orient spindle\n  M35        — Engage C-axis servo\n  G97 S2500 M13  — Start live tool\n\nSequence to DISENGAGE:\n  M15        — Stop live tool\n  G13.1      — Cancel polar interpolation (if active)\n  M34        — Disengage C-axis\n  G97 S1500 M03  — Restart main spindle\n\nC-axis positioning:\n  G00 C90.0    — Index chuck to 90°\n  G01 C180.0 F5 — Interpolate to 180°`,
        highlight:["M35","M34","M19","M05","M13"],
        tip:"⚠️ Never start the main spindle (M03/M04) while M35 is active — the C-axis servo will fault."
      },
      { heading:"Face Drilling & Tapping",
        body:`To drill holes on the face of a part, use canned cycles in C-axis mode:\n\nExample: 4 holes on a 30mm bolt circle:\n  M05 / M19 / M35          (engage C-axis)\n  G97 S2500 M13             (live tool CW)\n  G94                       (feed/min)\n  G99                       (return to R plane)\n  G00 X30.0 C0 Z5.0        (1st hole position)\n  G83 Z-20.0 R2.0 Q5.0 F80 (peck drill)\n  C90.0                     (2nd hole)\n  C180.0                    (3rd hole)\n  C270.0                    (4th hole)\n  G80                       (cancel cycle)\n  M15 / M34                 (disengage)`,
        highlight:["G83","G84","G81","G80","M35","M34"],
        tip:"💡 For G84 tapping: F = pitch × RPM. M8×1.25 at 500 RPM → F = 625 mm/min."
      },
      { heading:"Polar Interpolation (G12.1)",
        body:`G12.1 activates polar coordinate interpolation — the C-axis is treated as a linear Y-axis equivalent for face milling.\n\nG12.1 — Activate polar mode\nG13.1 — Cancel polar mode\n\nIn G12.1 mode:\n  X = radius from centerline\n  C = angular position (treated as linear motion)\n\nExample: mill a flat at 15mm from center:\n  G12.1\n  G97 S3000 M13\n  G94 F100\n  G01 X15.0 C-30.0 F100\n  G01 C30.0\n  G13.1\n\nG107 — Cylindrical interpolation\nMaps C (degrees) to linear Y on OD cylinder surface. Used for keyways, flats, slots on outside diameter.`,
        highlight:["G12.1","G13.1","G107"],
        tip:"💡 G12.1 is for FACE features. G107 is for OD features (keyways on cylinder surface)."
      },
    ]
  },
  {
    id:"program", title:"Program Structure", subtitle:"A complete turning program from start to finish",
    icon:"📋", color:"#a78bfa",
    steps:[
      { heading:"Program Header",
        body:`Every DNT2600M program follows a structure. Here's the opening:\n\n  O1234                    (Program number)\n  (PART: SHAFT END CAP)    (Comment — ignored by control)\n  (MATERIAL: 304SS)\n  (TOOL 1: 80° CNMG ROUGHER)\n  G21 G40 G95 G97          (Safety line: metric, no comp, feed/rev, RPM)\n  G28 U0 W0               (Return to home)\n  M09                      (Coolant off)\n\nThe G21 G40 G95 G97 "safety line" resets critical modals to known states. Never skip it — a previous program may have left G20 (inches) or G96 active.`,
        highlight:["G21","G40","G95","G97","G28"],
        tip:"💡 Always number your O-programs. The control won't run a program without an O-number on line 1."
      },
      { heading:"Tool Call & Setup",
        body:`Calling a tool on the DNT2600M:\n\n  T0101                    (Tool 1, offset 1)\n  G00 X65.0 Z5.0           (Rapid to approach position)\n  G50 S3000                (Clamp max RPM for CSS)\n  G96 S220 M03             (CSS 220 m/min, spindle CW)\n  M08                      (Flood coolant ON)\n\nT word format: T(tool number)(offset number)\n  T0101 = tool 1, wear offset 1\n  T0202 = tool 2, wear offset 2\n\nThe turret indexes when T is called. Always G28 before T call to avoid collision.`,
        highlight:["G28","G50","G96","M03","M08"],
        tip:"⚠️ Never call T without going to G28 first. A turret collision is expensive."
      },
      { heading:"Cutting Sequence",
        body:`A typical OD turning sequence:\n\n  G00 X62.0 Z2.0\n  G71 U2.0 R0.5\n  G71 P10 Q20 U0.3 W0.1 F0.25\n\n  N10 G00 X20.0            (start of profile)\n  G01 Z0.0 F0.15           (face to Z0)\n  G01 X24.0 Z-2.0          (chamfer)\n  G01 Z-40.0               (turn OD)\n  G02 X34.0 Z-45.0 R5.0    (radius blend)\n  G01 Z-80.0\n  N20 G01 X62.0            (exit — end of G71 profile)\n\n  G70 P10 Q20 F0.1 S280`,
        highlight:["G00","G01","G02","G71","G70"],
        tip:"💡 The N10/N20 numbers are the P and Q references for G71. Use block numbers that won't conflict elsewhere."
      },
      { heading:"Program Footer",
        body:`Ending the program safely:\n\n  G00 X65.0               (retract from part)\n  G28 U0 W0               (return home — incremental, always safe)\n  M05                      (spindle stop)\n  M09                      (coolant off)\n  M54                      (parts counter increment)\n  M30                      (end program + rewind)\n\nNotes:\n• G28 U0 W0 — incremental, safe from any position\n• M30 not M02 — M30 rewinds for re-run\n• M54 before M30 tracks parts count on the control display`,
        highlight:["G28","M05","M09","M30","M54"],
        tip:"💡 G28 U0 W0 is safer than G28 X0 Z0 — absolute G28 X0 Z0 can crash into the chuck."
      },
    ]
  },
  {
    id:"safety", title:"Safety & Gotchas", subtitle:"Common mistakes on the DNT2600M and how to avoid them",
    icon:"⚠️", color:"#fbbf24",
    steps:[
      { heading:"G96 Without G50",
        body:`DANGER: CSS (G96) without a speed clamp\n\nWhen G96 is active and the tool approaches X0 (centerline), the spindle will try to spin infinitely fast. Without G50, it accelerates until the drive faults or the spindle overspeeds.\n\nALWAYS do this:\n  G50 S3000          ← set max RPM FIRST\n  G96 S220 M03       ← then start CSS\n\nThe G50 S___ clamp is modal — stays active until you set a new G50 S value.\n\nIf you see the spindle accelerating rapidly with X near zero: FEED HOLD immediately.`,
        highlight:["G50","G96"],
        tip:"🚨 Most common dangerous mistake on CSS lathes. Make G50 a habit before every G96."
      },
      { heading:"T-call Without G28",
        body:`DANGER: Indexing the turret without clearing first\n\nIf you call a T-code without returning to home, the incoming tool may swing into the chuck, workpiece, or tailstock.\n\nSafe sequence:\n  G28 U0 W0          ← always home first\n  T0202              ← then index turret\n  G00 X___ Z___      ← then approach\n\nOn the DNT2600M, G28 U0 W0 is incremental — it moves 0mm in U and W, then rapids to machine home. This is safer than G28 X0 Z0 which moves X to absolute machine zero (near the chuck).`,
        highlight:["G28"],
        tip:"🚨 Turret collision = expensive repair. G28 U0 W0 between every tool change, no exceptions."
      },
      { heading:"X Diameter Convention",
        body:`COMMON MISTAKE: Confusing radius and diameter\n\nThe DNT2600M programs X in DIAMETER — different from milling where X is a radius/coordinate.\n\nIf your part needs to be Ø50mm:\n  ✓ Correct:  G01 X50.0    (diameter)\n  ✗ Wrong:    G01 X25.0    (radius — part will be Ø25mm!)\n\nWhen calculating depth of cut: 1mm DOC = 2mm change in diameter.\nRoughing from Ø60 to Ø56 (2mm per side) = X60.0 to X56.0 in the program.`,
        highlight:["G01","G00","G71"],
        tip:"💡 Check: if finished diameter should be 40mm, the G01 X value is 40.0. Always ask 'is this a diameter?'"
      },
      { heading:"Coolant & Chuck Safety",
        body:`Key operational reminders:\n\nCHUCK SAFETY\n  • Always M05 (stop spindle) before M11 (open chuck)\n  • M10 (close chuck) before starting spindle\n  • Never bypass chuck pressure alarms\n\nCOOLANT\n  • M08 = flood coolant (standard turning)\n  • M88 = through-tool coolant (TSC, needs TSC tool holders)\n  • Always M09 at end of program\n\nTAILSTOCK\n  • M46 = body ADVANCE (confirm live center installed)\n  • M78 = quill ADVANCE (apply centre pressure)\n  • M79 = quill RETRACT (before body retract)\n  • M47 = body RETRACT (tool must be clear)\n  • M84/M85 = traction bar lock/release (if equipped)\n  • Manual sequence: M46 → M78 → [cut] → M79 → M47\n  • Auto sequence: G460 V___ (advance) → [cut] → G461 (retract)\n  • G460/G461 call macros O9014/O9013 — handle all steps automatically`,
        highlight:["M05","M10","M11","M08","M09","M46","M47","M78","M79","G460","G461"],
        tip:"⚠️ If hydraulic chuck pressure light comes on during a cut — FEED HOLD. Do not continue."
      },
    ]
  },
];

// ─── Teaching Screen ──────────────────────────────────────────────────────────

function TeachScreen({ onBack, dark, setDark }) {
  const [lessonIdx, setLessonIdx] = useState(null);
  const [stepIdx,   setStepIdx]   = useState(0);
  const T2 = dark ? {
    bg:"#0d1117",sur:"#161b22",bdr:"#30363d",acc:"#e2e8f0",txt:"#e2e8f0",mut:"#8b949e",
    selBg:"#1e2633",tipBg:"#0d1f0d",tipTxt:"#3fb950",tipBdr:"#196127",
  } : {
    bg:"#f8f8f8",sur:"#ffffff",bdr:"#e2e2e2",acc:"#1f2937",txt:"#111827",mut:"#6b7280",
    selBg:"#f3f4f6",tipBg:"#f0fdf4",tipTxt:"#15803d",tipBdr:"#bbf7d0",
  };
  const bg=T2.bg,sur=T2.sur,bdr=T2.bdr,acc=T2.acc,txt=T2.txt,mut=T2.mut;
  const DT = () => (
    <button onClick={()=>setDark(d=>!d)} style={{background:"none",border:`1px solid ${bdr}`,borderRadius:6,color:mut,cursor:"pointer",fontSize:11,padding:"4px 9px"}}>
      {dark?"☀️":"🌙"}
    </button>
  );

  if (lessonIdx === null) return (
    <div style={{minHeight:"100vh",background:bg,color:txt,fontFamily:"monospace",padding:"14px"}}>
      <div style={{maxWidth:560,margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
          <button onClick={onBack} style={{background:"none",border:`1px solid ${bdr}`,color:mut,padding:"4px 10px",borderRadius:5,cursor:"pointer",fontSize:10}}>← Menu</button>
          <div>
            <div style={{
              display:"inline-block",
              background:"#004990",
              borderRadius:"5px",
              padding:"4px 12px",
            }}>
              <div style={{fontSize:11,fontWeight:800,letterSpacing:"0.05em",color:"#c8d8e8",fontFamily:"monospace"}}>Alexander Machine Shop</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:4,marginTop:2}}>
              <span style={{background:"#ef4444",color:"#fff",fontWeight:900,fontSize:9,padding:"1px 5px",borderRadius:3}}>RAD</span>
              <span style={{color:mut,fontSize:9,fontWeight:600,letterSpacing:"0.1em"}}>MFG</span>
              <span style={{color:mut,fontSize:9}}>· Learn</span>
            </div>
          </div>
          <DT/>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {LESSONS.map((lesson,i)=>(
            <div key={lesson.id} onClick={()=>{setLessonIdx(i);setStepIdx(0);}} style={{
              padding:"14px 16px",borderRadius:10,cursor:"pointer",
              background:sur,border:`1px solid ${bdr}`,
              display:"flex",alignItems:"center",gap:14,transition:"border-color 0.15s",
            }}
            onMouseEnter={e=>e.currentTarget.style.borderColor=lesson.color}
            onMouseLeave={e=>e.currentTarget.style.borderColor=bdr}>
              <div style={{fontSize:26,lineHeight:1}}>{lesson.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700,color:lesson.color}}>{lesson.title}</div>
                <div style={{fontSize:10,color:mut,marginTop:2}}>{lesson.subtitle}</div>
                <div style={{fontSize:9,color:"#1e3a5f",marginTop:4}}>{lesson.steps.length} sections</div>
              </div>
              <div style={{color:mut,fontSize:16}}>›</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const lesson=LESSONS[lessonIdx], step=lesson.steps[stepIdx];
  const isLast=stepIdx===lesson.steps.length-1;
  const progress=((stepIdx+1)/lesson.steps.length)*100;
  const highlighted=step.highlight.map(code=>ALL_CODES.find(c=>c.code===code)).filter(Boolean);

  return (
    <div style={{minHeight:"100vh",background:bg,color:txt,fontFamily:"monospace",padding:"14px"}}>
      <div style={{maxWidth:560,margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
          <button onClick={()=>setLessonIdx(null)} style={{background:"none",border:`1px solid ${bdr}`,color:mut,padding:"4px 10px",borderRadius:5,cursor:"pointer",fontSize:10}}>← Lessons</button>
          <div style={{flex:1,fontSize:12,fontWeight:700,color:lesson.color}}>{lesson.icon} {lesson.title}</div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{fontSize:10,color:mut}}>{stepIdx+1}/{lesson.steps.length}</div>
            <DT/>
          </div>
        </div>
        <div style={{height:3,background:"#e5e7eb",borderRadius:99,marginBottom:14,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${progress}%`,background:lesson.color,borderRadius:99,transition:"width 0.3s"}}/>
        </div>
        <div style={{fontSize:15,fontWeight:700,color:lesson.color,marginBottom:10}}>{step.heading}</div>
        <div style={{background:sur,border:`1px solid ${bdr}`,borderRadius:10,padding:"13px 15px",marginBottom:10,fontSize:11,color:txt,lineHeight:1.75,whiteSpace:"pre-wrap"}}>
          {step.body}
        </div>
        {step.tip&&(
          <div style={{background:T2.tipBg,border:`1px solid ${T2.tipBdr}`,borderRadius:8,padding:"9px 12px",marginBottom:10,fontSize:10,color:T2.tipTxt,lineHeight:1.6}}>
            {step.tip}
          </div>
        )}
        {highlighted.length>0&&(
          <div style={{marginBottom:12}}>
            <div style={{fontSize:9,letterSpacing:"0.2em",textTransform:"uppercase",color:mut,marginBottom:6}}>Codes in this section</div>
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              {highlighted.map(c=>(
                <div key={c.code+c.name} style={{background:sur,border:`1px solid ${bdr}`,borderRadius:7,padding:"8px 11px",display:"flex",gap:10,alignItems:"flex-start"}}>
                  <div style={{fontSize:13,fontWeight:700,color:lesson.color,minWidth:52,flexShrink:0}}>{c.code}</div>
                  <div>
                    <div style={{fontSize:11,color:txt,marginBottom:2}}>{c.name}</div>
                    <div style={{fontSize:9,color:mut,lineHeight:1.5}}>{c.desc}</div>
                    <div style={{fontSize:9,color:dark?"#7dd3fc":"#1e40af",marginTop:3,whiteSpace:"pre-wrap"}}>{c.example}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{display:"flex",gap:8}}>
          {stepIdx>0&&(
            <button onClick={()=>setStepIdx(s=>s-1)} style={{padding:"11px 16px",borderRadius:7,border:`1px solid ${bdr}`,background:"transparent",color:mut,fontSize:11,cursor:"pointer"}}>← Prev</button>
          )}
          <button onClick={()=>isLast?setLessonIdx(null):setStepIdx(s=>s+1)} style={{flex:1,padding:"11px",borderRadius:7,border:"none",background:lesson.color,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>
            {isLast?"✓ Done — Back to Lessons":"Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────

const MODES=[
  {id:"code-to-name",label:"Code → Function",desc:"See a code, pick what it does"},
  {id:"name-to-code",label:"Function → Code",desc:"See a description, pick the code"},
  {id:"snippet",     label:"Read a Block",   desc:"See a real program block, identify it"},
];

const CAT_COLORS={
  Motion:"#38bdf8", Plane:"#818cf8", Units:"#fb923c", Position:"#34d399",
  Comp:"#f472b6", WCS:"#a78bfa", Lathe:"#22d3ee", Threading:"#f87171",
  Canned:"#f97316", Feed:"#06b6d4", Spindle:"#4ade80",
  "C-Axis":"#e879f9", Macro:"#c084fc", Program:"#fb7185",
  Coolant:"#60a5fa", Chuck:"#fcd34d", Tailstock:"#fb923c",
  Aux:"#94a3b8", BarFeed:"#a3e635", LiveTool:"#f472b6",
};

export default function Trainer({ dark: darkProp = false, setDark: setDarkProp, user, onScore }) {
  const [screen,  setScreen]   = useState("menu");
  const [mode,    setMode]     = useState("code-to-name");
  const [cats,    setCats]     = useState(new Set(CATEGORIES));
  const [q,       setQ]        = useState(null);
  const [sel,     setSel]      = useState(null);
  const [conf,    setConf]     = useState(false);
  const [score,   setScore]    = useState({correct:0,total:0,streak:0,best:0});
  const [search,  setSearch]   = useState("");
  const [refCat,  setRefCat]   = useState("All");
  const [showViz, setShowViz]  = useState(true);
  const [_dark, _setDark] = useState(darkProp);
  // Use parent dark state if provided, else internal
  const dark = setDarkProp ? darkProp : _dark;
  const setDark = setDarkProp ?? _setDark;

  const pool = ALL_CODES.filter(c => cats.has(c.category));

  function nextQ() {
    if (pool.length<4) return;
    setQ(makeQuestion(pool,mode)); setSel(null); setConf(false);
  }
  function start() { if (pool.length<4) return; nextQ(); setScore({correct:0,total:0,streak:0,best:0}); setScreen("quiz"); }
  function pick(v) { if (!conf) setSel(v); }
  function check() {
    if (!sel||conf) return; setConf(true);
    const ok=sel===q.correct;
    setScore(s=>{
      const st=ok?s.streak+1:0;
      const ns={correct:s.correct+(ok?1:0),total:s.total+1,streak:st,best:Math.max(s.best,st)};
      // Submit to leaderboard after every answer
      if (onScore) onScore({ correct: ns.correct, total: ns.total, streak: st, best: ns.best });
      return ns;
    });
  }

  const filtRef = ALL_CODES.filter(c=>(refCat==="All"||c.category===refCat)&&
    (c.code.toLowerCase().includes(search.toLowerCase())||
     c.name.toLowerCase().includes(search.toLowerCase())||
     c.desc.toLowerCase().includes(search.toLowerCase())));

  const T = dark ? {
    bg:"#0d1117",sur:"#161b22",bdr:"#30363d",acc:"#93a8c4",accd:"#1e2633",
    grn:"#3fb950",red:"#f85149",txt:"#c9d1d9",mut:"#8b949e",
    inp:"#0d1117",card:"#161b22",selBg:"#1e2633",
    btnDis:"#21262d",btnDisTxt:"#484f58",
    btnPrimary:"#2d4a6e",btnPrimaryTxt:"#c9d1d9",
    correctBg:"#0d1f0d",wrongBg:"#2d0e0e",tipBg:"#0d1f0d",tipTxt:"#3fb950",tipBdr:"#196127",
    exBg:"#0d1117",
  } : {
    bg:"#f8f8f8",sur:"#ffffff",bdr:"#e2e2e2",acc:"#1f2937",accd:"#f3f4f6",
    grn:"#16a34a",red:"#dc2626",txt:"#111827",mut:"#6b7280",
    inp:"#ffffff",card:"#ffffff",selBg:"#f3f4f6",
    btnDis:"#e5e7eb",btnDisTxt:"#9ca3af",
    btnPrimary:"#1f2937",btnPrimaryTxt:"#ffffff",
    correctBg:"#f0fdf4",wrongBg:"#fef2f2",tipBg:"#f0fdf4",tipTxt:"#15803d",tipBdr:"#bbf7d0",
    exBg:"#f8fafc",
  };
  const {bg,sur,bdr,acc,accd,grn,red,txt,mut} = T;
  const DarkToggle = () => (
    <button onClick={()=>setDark(d=>!d)} style={{
      background:"none",border:`1px solid ${bdr}`,borderRadius:6,
      color:mut,cursor:"pointer",fontSize:11,padding:"4px 9px",
      display:"flex",alignItems:"center",gap:4,
    }}>{dark?"☀️ Light":"🌙 Dark"}</button>
  );

  // ── Routing (all hooks above, conditionals below) ──────────────────────────
  if (screen==="teach") return <TeachScreen onBack={()=>setScreen("menu")} dark={dark} setDark={setDark}/>;

  // ── MENU ──────────────────────────────────────────────────────────────────
  if (screen==="menu") return (
    <div style={{minHeight:"100vh",background:bg,color:txt,fontFamily:"monospace",display:"flex",flexDirection:"column",alignItems:"center",padding:"18px 14px"}}>
      <div style={{maxWidth:560,width:"100%"}}>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:10}}>
          <DarkToggle/>
        </div>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{
              display:"inline-block",
              background:"#004990",
              borderRadius:"8px",
              padding:"10px 28px",
              marginBottom:10,
              boxShadow:"0 2px 8px #00000033",
            }}>
              <div style={{
                fontSize:18,
                fontWeight:800,
                letterSpacing:"0.06em",
                color:"#c8d8e8",
                fontFamily:"monospace",
                textShadow:"0 1px 2px #00000044",
              }}>Alexander Machine Shop</div>
            </div>
          <div style={{display:"inline-flex",alignItems:"center",gap:0,marginBottom:10}}>
            <div style={{background:"#ef4444",color:"#fff",fontFamily:"monospace",fontWeight:900,fontSize:11,letterSpacing:"0.06em",padding:"2px 7px 2px 8px",borderRadius:"4px 0 0 4px",lineHeight:1}}>RAD</div>
            <div style={{background:dark?"#1e2633":"#f1f5f9",border:`1px solid ${dark?"#30363d":"#cbd5e1"}`,borderLeft:"none",color:dark?"#94a3b8":"#475569",fontFamily:"monospace",fontWeight:700,fontSize:11,letterSpacing:"0.18em",padding:"2px 8px 2px 7px",borderRadius:"0 4px 4px 0",lineHeight:1}}>MFG</div>
          </div>
          <div style={{fontSize:9,letterSpacing:"0.2em",textTransform:"uppercase",color:mut,marginBottom:6}}>CNC Training Portal</div>
          <div style={{display:"inline-block",background:T.selBg,border:`1px solid ${bdr}`,borderRadius:6,padding:"3px 12px",fontSize:10,color:mut,letterSpacing:"0.05em"}}>PUMA DNT2600M · G-Code Trainer</div>
          <div style={{fontSize:10,color:mut,marginTop:6,opacity:0.7}}>{ALL_CODES.length} codes · {CATEGORIES.length} categories · Fanuc 0i-TF</div>
        </div>

        {/* Machine specs strip */}
        <div style={{background:sur,border:`1px solid ${bdr}`,borderRadius:8,padding:"8px 12px",marginBottom:16,display:"flex",flexWrap:"wrap",gap:"8px 20px"}}>
          {[["Control","Fanuc 0i-TF"],["Chuck","10\" hydraulic"],["Bar Cap","Ø81mm"],["Turret","12-sta BMT55P"],["C-Axis","Live tool"],["Max RPM","3,500"]].map(([k,v])=>(
            <div key={k} style={{fontSize:10}}>
              <span style={{color:mut}}>{k}: </span><span style={{color:acc}}>{v}</span>
            </div>
          ))}
        </div>

        {/* Mode */}
        <div style={{marginBottom:16}}>
          <div style={{fontSize:9,letterSpacing:"0.2em",textTransform:"uppercase",color:mut,marginBottom:6}}>Quiz Mode</div>
          {MODES.map(m=>(
            <div key={m.id} onClick={()=>setMode(m.id)} style={{
              padding:"9px 13px",marginBottom:5,borderRadius:7,cursor:"pointer",
              background:mode===m.id?T.selBg:sur,border:`1px solid ${mode===m.id?acc:bdr}`,
              display:"flex",justifyContent:"space-between",alignItems:"center",transition:"all 0.12s"
            }}>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:mode===m.id?acc:txt}}>{m.label}</div>
                <div style={{fontSize:10,color:mut}}>{m.desc}</div>
              </div>
              {mode===m.id&&<div style={{color:acc,fontSize:14}}>✓</div>}
            </div>
          ))}
        </div>

        {/* Category filter */}
        <div style={{marginBottom:20}}>
          <div style={{fontSize:9,letterSpacing:"0.2em",textTransform:"uppercase",color:mut,marginBottom:6,display:"flex",justifyContent:"space-between"}}>
            <span>Categories ({cats.size}/{CATEGORIES.length})</span>
            <span onClick={()=>setCats(cats.size===CATEGORIES.length?new Set():new Set(CATEGORIES))} style={{color:acc,cursor:"pointer",fontSize:9}}>
              {cats.size===CATEGORIES.length?"Deselect all":"Select all"}
            </span>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
            {CATEGORIES.map(cat=>(
              <div key={cat} onClick={()=>{const ns=new Set(cats);ns.has(cat)?ns.delete(cat):ns.add(cat);setCats(ns);}}
                style={{padding:"3px 9px",borderRadius:99,fontSize:10,cursor:"pointer",
                  background:cats.has(cat)?(CAT_COLORS[cat]||acc)+"22":sur,
                  border:`1px solid ${cats.has(cat)?(CAT_COLORS[cat]||acc):bdr}`,
                  color:cats.has(cat)?(CAT_COLORS[cat]||acc):mut,transition:"all 0.1s"}}>
                {cat}
              </div>
            ))}
          </div>
        </div>

        <button onClick={start} disabled={pool.length<4} style={{
          width:"100%",padding:"12px",borderRadius:9,border:"none",
          background:pool.length>=4?T.btnPrimary:T.btnDis,color:pool.length>=4?T.btnPrimaryTxt:T.btnDisTxt,
          fontSize:13,fontWeight:700,cursor:pool.length>=4?"pointer":"not-allowed",marginBottom:7
        }}>Start Quiz →</button>
        <button onClick={()=>setScreen("teach")} style={{
          width:"100%",padding:"12px",borderRadius:9,border:`1px solid ${acc}`,
          background:T.selBg,color:acc,fontSize:13,fontWeight:700,cursor:"pointer",marginBottom:7
        }}>📖 Learn — Structured Lessons</button>
        <button onClick={()=>setScreen("ref")} style={{
          width:"100%",padding:"10px",borderRadius:9,border:`1px solid ${bdr}`,
          background:"transparent",color:mut,fontSize:11,cursor:"pointer"
        }}>Browse Reference ({ALL_CODES.length} codes)</button>
      </div>
    </div>
  );

  // ── REFERENCE ─────────────────────────────────────────────────────────────
  if (screen==="ref") return (
    <div style={{minHeight:"100vh",background:bg,color:txt,fontFamily:"monospace",padding:"12px"}}>
      <div style={{maxWidth:640,margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
          <button onClick={()=>setScreen("menu")} style={{background:"none",border:`1px solid ${bdr}`,color:mut,padding:"4px 10px",borderRadius:5,cursor:"pointer",fontSize:10}}>← Back</button>
          <div style={{display:"flex",alignItems:"center",gap:5}}>
            <span style={{background:"#ef4444",color:"#fff",fontWeight:900,fontSize:10,padding:"2px 5px",borderRadius:3}}>RAD</span>
            <span style={{color:mut,fontSize:10,fontWeight:600}}>MFG</span>
            <span style={{color:mut,fontSize:10}}>· Reference</span>
          </div>
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:10,color:mut}}>{filtRef.length}</span>
            <DarkToggle/>
          </div>
        </div>
        <input placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)}
          style={{width:"100%",padding:"8px 11px",borderRadius:6,border:`1px solid ${bdr}`,background:T.inp,color:txt,fontSize:11,marginBottom:8,boxSizing:"border-box",outline:"none",boxShadow:"inset 0 1px 3px #0000000a"}}/>
        <div style={{display:"flex",flexWrap:"wrap",gap:3,marginBottom:10}}>
          {["All",...CATEGORIES].map(cat=>(
            <div key={cat} onClick={()=>setRefCat(cat)} style={{
              padding:"2px 8px",borderRadius:99,fontSize:9,cursor:"pointer",
              background:refCat===cat?(CAT_COLORS[cat]||acc)+"33":sur,
              border:`1px solid ${refCat===cat?(CAT_COLORS[cat]||acc):bdr}`,
              color:refCat===cat?(CAT_COLORS[cat]||acc):mut
            }}>{cat}</div>
          ))}
        </div>
        {filtRef.map(c=>(
          <div key={c.code+c.name} style={{padding:"9px 11px",marginBottom:4,borderRadius:6,background:sur,border:`1px solid ${bdr}`}}>
            <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}>
              <span style={{fontSize:14,fontWeight:700,color:CAT_COLORS[c.category]||acc}}>{c.code}</span>
              <span style={{fontSize:11,color:txt}}>{c.name}</span>
              <span style={{marginLeft:"auto",fontSize:8,padding:"1px 5px",borderRadius:99,background:(CAT_COLORS[c.category]||acc)+"22",color:CAT_COLORS[c.category]||acc}}>{c.category}</span>
            </div>
            <div style={{fontSize:10,color:mut,marginBottom:3}}>{c.desc}</div>
            <div style={{fontSize:9,color:dark?"#7dd3fc":"#1e40af",whiteSpace:"pre-wrap"}}>{c.example}</div>
          </div>
        ))}
      </div>
    </div>
  );

  // ── QUIZ ──────────────────────────────────────────────────────────────────
  if (screen==="quiz"&&q) {
    const ok=conf&&sel===q.correct;
    const pct=score.total>0?Math.round((score.correct/score.total)*100):0;
    return (
      <div style={{minHeight:"100vh",background:bg,color:txt,fontFamily:"monospace",display:"flex",flexDirection:"column",alignItems:"center",padding:"12px"}}>
        <div style={{maxWidth:540,width:"100%"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <button onClick={()=>setScreen("menu")} style={{background:"none",border:`1px solid ${bdr}`,color:mut,padding:"4px 9px",borderRadius:5,cursor:"pointer",fontSize:9}}>← Menu</button>
            <div style={{display:"flex",gap:12,fontSize:11}}>
              <span style={{color:grn}}>✓{score.correct}</span>
              <span style={{color:red}}>✗{score.total-score.correct}</span>
              <span style={{color:score.streak>=3?"#fbbf24":mut}}>🔥{score.streak}</span>
              <span style={{color:mut}}>{pct}%</span>
            </div>
            <div style={{display:"flex",gap:5,alignItems:"center"}}>
              <button onClick={()=>setScreen("ref")} style={{background:"none",border:`1px solid ${bdr}`,color:mut,padding:"4px 9px",borderRadius:5,cursor:"pointer",fontSize:9}}>Ref</button>
              <DarkToggle/>
            </div>
          </div>

          <div style={{fontSize:8,letterSpacing:"0.2em",textTransform:"uppercase",color:mut,marginBottom:7}}>
            Alexander Machine Shop · DNT2600M · {MODES.find(m=>m.id===mode)?.label}
          </div>

          <div style={{background:sur,border:`1px solid ${bdr}`,borderRadius:10,padding:"16px",marginBottom:10,textAlign:"center"}}>
            <div style={{fontSize:9,color:mut,marginBottom:7,letterSpacing:"0.1em"}}>{q.promptLabel}</div>
            <div style={{fontSize:mode==="name-to-code"?13:26,fontWeight:700,color:acc,wordBreak:"break-all",whiteSpace:"pre-wrap",marginBottom:q.promptSub?5:0}}>
              {q.prompt}
            </div>
            {q.promptSub&&<div style={{fontSize:10,color:mut,marginTop:3,whiteSpace:"pre-wrap"}}>{q.promptSub}</div>}
          </div>

          {showViz&&conf&&(
            <div style={{display:"flex",justifyContent:"center",marginBottom:10}}>
              <div>
                <div style={{fontSize:8,color:mut,textAlign:"center",marginBottom:3,letterSpacing:"0.15em"}}>VISUALIZER</div>
                <GCodeViz code={q.fullCode}/>
              </div>
            </div>
          )}

          <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:10}}>
            {q.options.map(opt=>{
              const isSel=sel===opt.value,isCorr=opt.value===q.correct;
              let bg2=sur,bc=bdr,c2=txt;
              if (conf){if(isCorr){bg2=T.correctBg;bc=grn;c2=grn;}else if(isSel){bg2=T.wrongBg;bc=red;c2=red;}}
              else if(isSel){bg2=T.selBg;bc=acc;c2=acc;}
              return (
                <div key={opt.value} onClick={()=>pick(opt.value)} style={{
                  padding:"10px 13px",borderRadius:7,cursor:conf?"default":"pointer",
                  background:bg2,border:`1px solid ${bc}`,color:c2,fontSize:12,
                  fontWeight:isSel||(conf&&isCorr)?600:400,
                  display:"flex",justifyContent:"space-between",alignItems:"center",transition:"all 0.1s"
                }}>
                  <span>{opt.label}</span>
                  {conf&&isCorr&&<span>✓</span>}
                  {conf&&isSel&&!isCorr&&<span>✗</span>}
                </div>
              );
            })}
          </div>

          {!conf?(
            <button onClick={check} disabled={!sel} style={{
              width:"100%",padding:"11px",borderRadius:7,border:"none",
              background:sel?T.btnPrimary:T.btnDis,color:sel?T.btnPrimaryTxt:T.btnDisTxt,
              fontSize:12,fontWeight:700,cursor:sel?"pointer":"not-allowed"
            }}>Check Answer</button>
          ):(
            <div>
              <div style={{padding:"10px 13px",borderRadius:7,marginBottom:7,background:ok?T.correctBg:T.wrongBg,border:`1px solid ${ok?grn:red}`}}>
                <div style={{fontSize:11,fontWeight:700,color:ok?grn:red,marginBottom:3}}>
                  {ok?`✓ Correct!${score.streak>=3?" 🔥 "+score.streak+" streak!":""}`: "✗ Not quite"}
                </div>
                <div style={{fontSize:10,color:"#374151"}}>{q.explanation}</div>
                {!ok&&<div style={{fontSize:10,color:grn,marginTop:3}}>Answer: <strong>{q.fullCode.code} — {q.fullCode.name}</strong></div>}
              </div>
              <div style={{display:"flex",gap:6}}>
                <button onClick={nextQ} style={{flex:1,padding:"11px",borderRadius:7,border:"none",background:T.btnPrimary,color:T.btnPrimaryTxt,fontSize:12,fontWeight:700,cursor:"pointer"}}>
                  Next →
                </button>
                <button onClick={()=>setShowViz(v=>!v)} style={{padding:"11px 12px",borderRadius:7,border:`1px solid ${bdr}`,background:"transparent",color:mut,fontSize:10,cursor:"pointer"}}>
                  {showViz?"Hide":"Show"} viz
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
}
