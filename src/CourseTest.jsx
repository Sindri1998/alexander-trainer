import { useState, useEffect } from 'react'

// ─── Test question bank ───────────────────────────────────────────────────────
// 40 questions across 5 sections — drawn from DNT2600M code database

const SECTIONS = [
  {
    id: 'motion',
    title: 'Motion & Coordinates',
    icon: '📐',
    color: '#4d8fcc',
    questions: [
      {
        q: 'What does G00 do on the PUMA DNT2600M?',
        options: ['Linear feed move at programmed F rate', 'Rapid traverse — positioning only, no cutting', 'Clockwise arc move', 'Return to machine home'],
        answer: 1, explanation: 'G00 moves at maximum machine speed for positioning. It does not cut — never rapid into material.'
      },
      {
        q: 'On the DNT2600M, the X-axis coordinate is always programmed as:',
        options: ['Radius from centerline', 'Diameter of the part', 'Distance from machine zero', 'Incremental offset only'],
        answer: 1, explanation: 'Fanuc lathes use diameter programming. X50.0 means the tool is at a point where the part diameter is 50mm.'
      },
      {
        q: 'You want to cut a straight OD turn from Z0 to Z-80 at 0.2mm/rev. Which line is correct?',
        options: ['G00 Z-80.0 F0.2', 'G01 Z-80.0 F0.2', 'G02 Z-80.0 F0.2', 'G71 Z-80.0 F0.2'],
        answer: 1, explanation: 'G01 is linear interpolation (feed cut). G00 is rapid (no cutting). G02 is a CW arc.'
      },
      {
        q: 'G91 means:',
        options: ['Absolute positioning', 'Incremental positioning', 'Return to home', 'Cancel compensation'],
        answer: 1, explanation: 'G91 = incremental mode. Coordinates are offsets from current position. G90 = absolute (default).'
      },
      {
        q: 'What does G28 U0 W0 do?',
        options: ['Set work offset to zero', 'Move 0mm then return to machine home', 'Cancel canned cycle', 'Set max spindle speed'],
        answer: 1, explanation: 'G28 U0 W0 moves 0 in U and W (incremental) then rapids to machine home. Safer than G28 X0 Z0 which moves X to machine zero near the chuck.'
      },
      {
        q: 'A G02 arc on the DNT2600M cuts in which direction?',
        options: ['Counter-clockwise in XZ plane', 'Clockwise in XZ plane', 'Clockwise in XY plane', 'Linear with radius blend'],
        answer: 1, explanation: 'G02 = clockwise arc. G03 = counter-clockwise arc. Default plane on lathes is G18 (XZ).'
      },
      {
        q: 'What is the default feed mode at power-up on the DNT2600M?',
        options: ['G94 (feed per minute)', 'G95 (feed per revolution)', 'G93 (inverse time)', 'G98 (initial plane)'],
        answer: 1, explanation: 'G95 (feed per revolution) is the lathe default. Feed rate stays proportional to spindle speed. Switch to G94 for live tool milling.'
      },
      {
        q: 'The address "W" in G01 W-30.0 means:',
        options: ['Absolute Z position -30.0', 'Incremental Z move of -30.0mm', 'Width of cut 30.0mm', 'Retract amount 30.0mm'],
        answer: 1, explanation: 'W is the incremental Z address on Fanuc lathes. It moves 30mm in the -Z direction from wherever the tool is now.'
      },
    ]
  },
  {
    id: 'spindle',
    title: 'Spindle & Coolant',
    icon: '⚙️',
    color: '#4ade80',
    questions: [
      {
        q: 'You program G96 S220 M03 without G50 first. What is the risk?',
        options: ['The spindle runs CCW instead of CW', 'The spindle may overspeed as X approaches zero', 'The feed rate defaults to 0', 'The coolant turns off'],
        answer: 1, explanation: 'In CSS mode (G96), RPM increases as diameter decreases. Without G50 to clamp max RPM, the spindle can overspeed dangerously near the centerline.'
      },
      {
        q: 'Which code MUST be used for all threading operations (G76, G92, G32)?',
        options: ['G96 — CSS mode', 'G97 — Constant RPM', 'G94 — Feed per minute', 'G95 — Feed per revolution'],
        answer: 1, explanation: 'Threading requires G97 (constant RPM). The feed/pitch calculation depends on a fixed RPM. G96 (CSS) changes RPM continuously which would destroy the thread.'
      },
      {
        q: 'M03 S2500 does what?',
        options: ['Start spindle CCW at 2500 RPM', 'Start spindle CW at 2500 RPM', 'Set CSS to 2500 m/min', 'Stop spindle, set speed to 2500'],
        answer: 1, explanation: 'M03 = spindle CW (standard turning direction for right-hand tools). S2500 = 2500 RPM (in G97 mode) or 2500 surface speed (in G96 mode).'
      },
      {
        q: 'What is M13 on the DNT2600M?',
        options: ['Main spindle CW + flood coolant', 'Live tool spindle forward (CW)', 'Spindle orient', 'Mist coolant on'],
        answer: 1, explanation: 'M13 starts the live tool (BMT55P turret) spindle in the forward/CW direction. Use M14 for reverse (CCW), M15 to stop.'
      },
      {
        q: 'Before engaging C-axis (M35), you must first:',
        options: ['Call G96 and M03', 'Stop spindle (M05) then orient (M19)', 'Activate flood coolant (M08)', 'Call G28 and T-code'],
        answer: 1, explanation: 'Sequence: M05 (stop main spindle) → M19 (orient to reference angle) → M35 (engage C-axis servo). Without M19 first the C-axis may land at an unexpected angle.'
      },
      {
        q: 'M88 activates:',
        options: ['Flood coolant', 'Mist coolant', 'Through-tool coolant (TSC)', 'Tailstock coolant'],
        answer: 2, explanation: 'M88 = through-spindle coolant (TSC) for live tools. M08 = flood. M07 = mist. M89 turns TSC off.'
      },
      {
        q: 'What does M49 do?',
        options: ['Enable feed/speed override knobs', 'Lock out feed/speed override knobs', 'Cancel tailstock advance', 'Set gear to neutral'],
        answer: 1, explanation: 'M49 disables the feed and spindle override knobs on the panel. Use it during threading so an operator cannot accidentally bump them mid-pass.'
      },
    ]
  },
  {
    id: 'cycles',
    title: 'Turning & Canned Cycles',
    icon: '🔄',
    color: '#22d3ee',
    questions: [
      {
        q: 'In G71, the U word on the first line means:',
        options: ['Finish stock to leave on X', 'Depth of cut per roughing pass (radius)', 'Retract amount between passes', 'Start block number'],
        answer: 1, explanation: 'G71 U___ R___: U = depth of cut per pass (radius value). R = retract clearance. The second G71 line has U = X finish stock to leave (diameter).'
      },
      {
        q: 'After G71 roughing, which code runs the finish pass?',
        options: ['G71 again with different F', 'G70 P___ Q___', 'G01 along the profile', 'G73 P___ Q___'],
        answer: 1, explanation: 'G70 runs the finish pass over the same P-Q profile blocks used in G71/G72/G73. Specify finish F and S on the G70 line.'
      },
      {
        q: 'G72 removes stock in which direction?',
        options: ['Parallel to Z axis (turning passes)', 'Parallel to X axis (facing passes)', 'Following the profile shape', 'Radially at a fixed depth'],
        answer: 1, explanation: 'G72 = face rough cycle. Passes run parallel to X (facing). Use when you have more axial stock than radial, e.g. facing down a flange.'
      },
      {
        q: 'G73 is best used when:',
        options: ['Machining bar stock from full round', 'The blank is already near-net (casting/forging)', 'Threading with multiple passes', 'Drilling with chip breaking'],
        answer: 1, explanation: 'G73 pattern repeat follows the profile at an offset, reducing each pass. Ideal for castings or forgings where G71 would cut mostly air.'
      },
      {
        q: 'What does G76 P020060 mean in the threading cycle?',
        options: ['2 finish passes, 0° lead-in, 60° thread form', '20 passes, 6mm pitch, 0° angle', '2 passes, 60mm depth, 0 allowance', '020 = program number, 060 = block number'],
        answer: 0, explanation: 'G76 P is a 6-digit code: (finish passes)(min infeed angle)(thread form angle). P020060 = 2 finish passes, 0° lead-in, 60° form (standard metric thread).'
      },
      {
        q: 'The F word in G76 threading specifies:',
        options: ['Feed rate in mm/min', 'Thread pitch in mm', 'Number of finish passes', 'First pass infeed depth in μm'],
        answer: 1, explanation: 'In threading cycles, F = pitch in mm/rev. For M20×2.5, use F2.5. This is different from turning where F is chip load.'
      },
      {
        q: 'G80 is used to:',
        options: ['Start a canned drilling cycle', 'Cancel any active canned cycle', 'Set drill peck depth', 'Return to R plane after drilling'],
        answer: 1, explanation: 'G80 cancels any active canned cycle (G81, G83, G84, G85, etc.). Must be called before changing cycle type or returning to turning.'
      },
      {
        q: 'For G84 rigid tapping at 500 RPM with M8×1.25 pitch, the F word must be:',
        options: ['F1.25', 'F500', 'F625', 'F0.125'],
        answer: 2, explanation: 'Rigid tapping: F = pitch × RPM = 1.25 × 500 = 625 mm/min. The feed must be synchronized exactly to the spindle speed and pitch.'
      },
    ]
  },
  {
    id: 'tailstock',
    title: 'Tailstock & Tool Control',
    icon: '🔩',
    color: '#f97316',
    questions: [
      {
        q: 'What is the correct sequence to engage the tailstock on a shaft part?',
        options: ['M78 → M46 → M84', 'M46 → M78 → (cut)', 'M47 → M79 → M46', 'G460 → M46 → M78'],
        answer: 1, explanation: 'M46 advances the tailstock body into position first, then M78 extends the quill to apply live centre pressure. M84 (traction bar) locks the body if equipped.'
      },
      {
        q: 'Why must M79 be called before M47?',
        options: ['M79 starts the coolant needed for retract', 'M79 retracts the quill before the body moves, preventing the live centre dragging across the part', 'M79 is needed to release the chuck', 'M47 cannot run without M79 as a safety interlock only'],
        answer: 1, explanation: 'M79 retracts the quill (barrel) back into the body. If you retract the body (M47) with the quill still extended, the live centre drags across the finished part surface, damaging it.'
      },
      {
        q: 'G460 V-250.0 does what?',
        options: ['Retract tailstock to park position', 'Automatically move tailstock body to Z-250 in machine coordinates', 'Set tailstock quill pressure to 250 bar', 'Call macro O9013'],
        answer: 1, explanation: 'G460 is a Doosan macro G-code (calls O9014) that automatically handles the full tailstock advance sequence — traversing to the V (Z machine coordinate) position.'
      },
      {
        q: 'G461 calls which internal macro?',
        options: ['O9010', 'O9012', 'O9013', 'O9014'],
        answer: 2, explanation: 'G461 (auto tailstock retract) calls macro O9013. G460 (auto advance) calls O9014. These handle the full sequence automatically.'
      },
      {
        q: 'Before calling M11 (chuck open), you must:',
        options: ['Call M08 (flood coolant)', 'Call M05 (spindle stop)', 'Call G28 (home)', 'Call M46 (tailstock advance)'],
        answer: 1, explanation: 'Always stop the spindle (M05) before opening the chuck (M11). Opening a spinning chuck is an extremely dangerous crash risk.'
      },
      {
        q: 'T0202 means:',
        options: ['Tool 2, turret station 2', 'Tool 2, wear offset register 2', 'Tool 02, geometry offset 02', 'Both B and C are correct descriptions'],
        answer: 3, explanation: 'On Fanuc, T(tool number)(offset number). T0202 = turret station 2 with offset register 2. The offset stores geometry and wear compensation.'
      },
      {
        q: 'What happens if you call a T-code without going to G28 first?',
        options: ['The control alarms immediately', 'The turret indexes and the new tool may collide with the chuck, workpiece, or tailstock', 'The offset is not loaded correctly', 'The spindle stops automatically'],
        answer: 1, explanation: 'Without clearing to home first, the rotating turret can swing the incoming tool into the workpiece, chuck, or tailstock. Always G28 U0 W0 before any T-call.'
      },
    ]
  },
  {
    id: 'program',
    title: 'Program Structure & Safety',
    icon: '📋',
    color: '#a78bfa',
    questions: [
      {
        q: 'Which safety line should appear at the start of every DNT2600M program?',
        options: ['G96 G95 G40 G20', 'G21 G40 G95 G97', 'G90 G28 G54 G96', 'G00 G21 G41 G94'],
        answer: 1, explanation: 'G21 G40 G95 G97 resets key modals: metric mode, cancel compensation, feed per rev, constant RPM. This prevents a previous program leaving the machine in an unexpected state.'
      },
      {
        q: 'Why use M30 instead of M02 to end a program?',
        options: ['M30 also turns off coolant; M02 does not', 'M30 rewinds to the O-number start; M02 does not', 'M30 is required for thread programs', 'M02 causes a spindle alarm on the DNT2600M'],
        answer: 1, explanation: 'M30 ends the program AND rewinds to the beginning so the operator can press Cycle Start to run the next part. M02 ends without rewinding.'
      },
      {
        q: 'What does G50 S3000 do when used before G96?',
        options: ['Sets the WCS origin', 'Clamps maximum spindle RPM at 3000 to prevent overspeed in CSS mode', 'Sets the spindle to 3000 RPM constant', 'Stores current position as reference'],
        answer: 1, explanation: 'G50 S___ sets the maximum RPM clamp for G96 CSS mode. Without it, the spindle accelerates to dangerous speeds as the tool approaches X0.'
      },
      {
        q: 'G28 U0 W0 is preferred over G28 X0 Z0 because:',
        options: ['U0 W0 is faster to execute', 'U0 W0 is incremental — safe from any position. G28 X0 Z0 moves X to absolute machine zero which may be inside the chuck', 'U0 W0 also resets offsets', 'There is no difference on the DNT2600M'],
        answer: 1, explanation: 'G28 U0 W0 means "move 0mm in U and W then go home" — it works from any position. G28 X0 Z0 commands absolute X=0 first which is at the machine zero, often crashing into the chuck.'
      },
      {
        q: 'M54 is typically called:',
        options: ['At the start of every tool call', 'Just before M30 to increment the parts counter', 'After each threading pass', 'When the door needs to open'],
        answer: 1, explanation: 'M54 increments the parts counter on the control display. Call it just before M30 so completed parts are tracked correctly.'
      },
      {
        q: 'You are turning a 40mm diameter shaft. The correct X word to program is:',
        options: ['X20.0 (radius)', 'X40.0 (diameter)', 'X0.040 (metres)', 'X4.0 (centimetres)'],
        answer: 1, explanation: 'Always diameter on Fanuc lathes. X40.0 = 40mm diameter. The most common mistake is programming the radius (X20.0) which gives a 20mm diameter part.'
      },
      {
        q: 'Which statement about G96 CSS is TRUE?',
        options: ['RPM stays fixed regardless of diameter', 'RPM increases as tool moves to smaller diameters to keep surface speed constant', 'G96 can be used for threading', 'G96 does not require a G50 clamp on the DNT2600M'],
        answer: 1, explanation: 'CSS (Constant Surface Speed) adjusts RPM as X changes. Smaller diameter = higher RPM. Always use G50 S___ to clamp max RPM before G96.'
      },
      {
        q: 'If a chuck pressure alarm triggers mid-cut, you should:',
        options: ['Continue the cut and inspect after M30', 'Press Feed Hold immediately — do not continue', 'Increase chuck pressure in parameters', 'Call M11 to re-clamp'],
        answer: 1, explanation: 'A chuck pressure alarm during cutting means clamping force is dropping. Feed Hold immediately. Continuing risks the part ejecting from the chuck at speed.'
      },
    ]
  },
]

const PASS_SCORE = 80  // % required to pass
const TOTAL_Q = SECTIONS.reduce((n, s) => n + s.questions.length, 0)

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─── Main CourseTest Component ────────────────────────────────────────────────

export default function CourseTest({ dark, user, onScoreSubmit }) {
  const T = dark ? {
    bg: '#0d1117', sur: '#161b22', bdr: '#30363d',
    txt: '#c9d1d9', mut: '#8b949e', acc: '#4d8fcc',
    inp: '#0d1117', selBg: '#1e2633',
    correctBg: '#0d1f0d', wrongBg: '#2d0e0e',
    grn: '#3fb950', red: '#f85149',
  } : {
    bg: '#f0f4f8', sur: '#ffffff', bdr: '#e2e8f0',
    txt: '#1e293b', mut: '#64748b', acc: '#1a3a6b',
    inp: '#ffffff', selBg: '#f3f4f6',
    correctBg: '#f0fdf4', wrongBg: '#fef2f2',
    grn: '#16a34a', red: '#dc2626',
  }

  const SAVE_KEY = `ams_test_progress_${user?.name || 'guest'}`

  // state
  const [phase, setPhase]         = useState('intro')   // intro | test | result
  const [secIdx, setSecIdx]       = useState(0)
  const [qIdx, setQIdx]           = useState(0)
  const [answers, setAnswers]     = useState({})         // "secIdx-qIdx": answerIndex
  const [selected, setSelected]   = useState(null)
  const [confirmed, setConfirmed] = useState(false)
  const [shuffled, setShuffled]   = useState([])         // shuffled questions per section

  // Load saved progress
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SAVE_KEY)
      if (saved) {
        const p = JSON.parse(saved)
        if (p.phase === 'test' && p.answers && p.shuffled) {
          setPhase(p.phase)
          setSecIdx(p.secIdx || 0)
          setQIdx(p.qIdx || 0)
          setAnswers(p.answers)
          setShuffled(p.shuffled)
          return
        }
      }
    } catch {}
    // Fresh start — shuffle questions
    setShuffled(SECTIONS.map(s => shuffle(s.questions.map((q, i) => ({ ...q, _orig: i })))))
  }, [SAVE_KEY])

  // Save progress whenever it changes
  useEffect(() => {
    if (phase === 'test') {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify({ phase, secIdx, qIdx, answers, shuffled }))
      } catch {}
    }
  }, [phase, secIdx, qIdx, answers, shuffled, SAVE_KEY])

  const currentSection = SECTIONS[secIdx]
  const currentQuestions = shuffled[secIdx] || currentSection?.questions || []
  const currentQ = currentQuestions[qIdx]

  const answerKey = `${secIdx}-${qIdx}`

  function startTest() {
    const sh = SECTIONS.map(s => shuffle(s.questions.map((q, i) => ({ ...q, _orig: i }))))
    setShuffled(sh)
    setAnswers({})
    setSecIdx(0)
    setQIdx(0)
    setSelected(null)
    setConfirmed(false)
    setPhase('test')
  }

  function handleSelect(idx) {
    if (confirmed) return
    setSelected(idx)
  }

  function handleConfirm() {
    if (selected === null || confirmed) return
    setConfirmed(true)
    setAnswers(prev => ({ ...prev, [answerKey]: selected }))
  }

  function handleNext() {
    setSelected(null)
    setConfirmed(false)
    const nextQ = qIdx + 1
    if (nextQ < currentQuestions.length) {
      setQIdx(nextQ)
    } else {
      const nextSec = secIdx + 1
      if (nextSec < SECTIONS.length) {
        setSecIdx(nextSec)
        setQIdx(0)
      } else {
        finishTest()
      }
    }
  }

  function finishTest() {
    // Calculate score
    const correct = Object.entries(answers).filter(([key, val]) => {
      const [si, qi] = key.split('-').map(Number)
      const q = (shuffled[si] || SECTIONS[si].questions)[qi]
      return val === q.answer
    }).length
    const total = TOTAL_Q
    const pct = Math.round((correct / total) * 100)
    const passed = pct >= PASS_SCORE

    // Submit to leaderboard
    if (onScoreSubmit) {
      onScoreSubmit({
        name: user?.name || 'Unknown',
        testScore: pct,
        testPassed: passed,
        testCorrect: correct,
        testTotal: total,
        testDate: new Date().toISOString(),
      })
    }

    // Clear saved progress
    try { localStorage.removeItem(SAVE_KEY) } catch {}

    setPhase('result')
  }

  // ── Scoring helpers ──────────────────────────────────────────────────────────
  function getSectionScore(si) {
    const qs = shuffled[si] || SECTIONS[si].questions
    let correct = 0
    qs.forEach((q, qi) => {
      const ans = answers[`${si}-${qi}`]
      if (ans === q.answer) correct++
    })
    return { correct, total: qs.length, pct: Math.round((correct / qs.length) * 100) }
  }

  function getTotalScore() {
    let correct = 0
    SECTIONS.forEach((_, si) => { correct += getSectionScore(si).correct })
    return { correct, total: TOTAL_Q, pct: Math.round((correct / TOTAL_Q) * 100) }
  }

  // ── Global progress ──────────────────────────────────────────────────────────
  const answeredCount = Object.keys(answers).length + (confirmed ? 1 : 0)
  const globalPct = Math.round((answeredCount / TOTAL_Q) * 100)

  // ── Section progress ─────────────────────────────────────────────────────────
  function getSectionAnswered(si) {
    return Object.keys(answers).filter(k => k.startsWith(`${si}-`)).length
  }

  // ─── INTRO ────────────────────────────────────────────────────────────────
  if (phase === 'intro') return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.txt, fontFamily: 'monospace', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ maxWidth: 560, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.acc, marginBottom: 4 }}>PUMA DNT2600M</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.txt, marginBottom: 6 }}>G-Code Certification Test</div>
          <div style={{ fontSize: 11, color: T.mut }}>Alexander Machine Shop · Fanuc 0i-TF · Live Tooling</div>
        </div>

        {/* Test overview */}
        <div style={{ background: T.sur, border: `1px solid ${T.bdr}`, borderRadius: 10, padding: '16px 20px', marginBottom: 16 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.mut, marginBottom: 12 }}>Test Overview</div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 14 }}>
            {[
              ['Questions', TOTAL_Q],
              ['Sections', SECTIONS.length],
              ['Pass Score', `${PASS_SCORE}%`],
              ['Time Limit', 'None'],
            ].map(([l, v]) => (
              <div key={l}>
                <div style={{ fontSize: 20, fontWeight: 800, color: T.acc }}>{v}</div>
                <div style={{ fontSize: 10, color: T.mut }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {SECTIONS.map((s, i) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 14 }}>{s.icon}</span>
                <span style={{ fontSize: 11, color: T.txt, flex: 1 }}>{s.title}</span>
                <span style={{ fontSize: 10, color: T.mut }}>{s.questions.length} questions</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: dark ? '#0d1f0d' : '#f0fdf4', border: `1px solid ${dark ? '#196127' : '#bbf7d0'}`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 10, color: dark ? '#3fb950' : '#15803d', lineHeight: 1.7 }}>
          💡 Your progress is saved automatically. If you close the tab, you can pick up where you left off next time you log in.
        </div>

        <button
          onClick={startTest}
          style={{ width: '100%', padding: 13, background: '#004990', color: '#c8d8e8', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: 'pointer', letterSpacing: '0.04em' }}
        >Begin Test →</button>
      </div>
    </div>
  )

  // ─── RESULT ──────────────────────────────────────────────────────────────
  if (phase === 'result') {
    const total = getTotalScore()
    const passed = total.pct >= PASS_SCORE
    return (
      <div style={{ minHeight: '100vh', background: T.bg, color: T.txt, fontFamily: 'monospace', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ maxWidth: 560, width: '100%' }}>
          {/* Result banner */}
          <div style={{
            background: passed ? (dark ? '#0d1f0d' : '#f0fdf4') : (dark ? '#2d0e0e' : '#fef2f2'),
            border: `2px solid ${passed ? T.grn : T.red}`,
            borderRadius: 12, padding: '24px', textAlign: 'center', marginBottom: 20,
          }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>{passed ? '🏆' : '📚'}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: passed ? T.grn : T.red, marginBottom: 4 }}>
              {passed ? 'CERTIFIED' : 'NOT YET PASSED'}
            </div>
            <div style={{ fontSize: 36, fontWeight: 900, color: T.txt, marginBottom: 4 }}>{total.pct}%</div>
            <div style={{ fontSize: 11, color: T.mut }}>{total.correct} of {total.total} correct · Need {PASS_SCORE}% to pass</div>
            {passed && (
              <div style={{ marginTop: 10, fontSize: 11, color: T.grn }}>
                {user?.name} — PUMA DNT2600M G-Code Certification ✓
              </div>
            )}
            {!passed && (
              <div style={{ marginTop: 8, fontSize: 11, color: T.mut }}>
                Review the sections below and retry. Your score has been recorded.
              </div>
            )}
          </div>

          {/* Section breakdown */}
          <div style={{ background: T.sur, border: `1px solid ${T.bdr}`, borderRadius: 10, padding: '14px 18px', marginBottom: 16 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.mut, marginBottom: 12 }}>Section Breakdown</div>
            {SECTIONS.map((s, si) => {
              const sc = getSectionScore(si)
              const secPassed = sc.pct >= PASS_SCORE
              return (
                <div key={s.id} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11 }}>{s.icon} {s.title}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: secPassed ? T.grn : T.red }}>{sc.correct}/{sc.total} ({sc.pct}%)</span>
                  </div>
                  <div style={{ height: 5, background: T.bdr, borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${sc.pct}%`, background: secPassed ? T.grn : T.red, borderRadius: 99 }} />
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={startTest} style={{ flex: 1, padding: 11, background: '#004990', color: '#c8d8e8', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              Retake Test
            </button>
            <button onClick={() => setPhase('intro')} style={{ padding: 11, background: 'none', border: `1px solid ${T.bdr}`, color: T.mut, borderRadius: 7, fontSize: 11, cursor: 'pointer' }}>
              ← Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── TEST ────────────────────────────────────────────────────────────────
  if (!currentQ) return null
  const isCorrect = confirmed && selected === currentQ.answer
  const isWrong   = confirmed && selected !== currentQ.answer

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.txt, fontFamily: 'monospace', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 14px' }}>
      <div style={{ maxWidth: 600, width: '100%' }}>

        {/* Overall progress bar */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: T.mut }}>Overall progress</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: T.acc }}>{answeredCount}/{TOTAL_Q} · {globalPct}%</span>
          </div>
          <div style={{ height: 4, background: T.bdr, borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${globalPct}%`, background: '#004990', borderRadius: 99, transition: 'width 0.3s' }} />
          </div>
        </div>

        {/* Section tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 14, flexWrap: 'wrap' }}>
          {SECTIONS.map((s, si) => {
            const done = getSectionAnswered(si)
            const active = si === secIdx
            const complete = done === s.questions.length
            return (
              <div key={s.id} style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 10,
                background: active ? s.color + '22' : T.sur,
                border: `1px solid ${active ? s.color : T.bdr}`,
                color: active ? s.color : complete ? T.grn : T.mut,
                fontWeight: active ? 700 : 400,
              }}>
                {complete ? '✓' : s.icon} {s.title.split(' ')[0]}
                <span style={{ marginLeft: 4, opacity: 0.7 }}>{done}/{s.questions.length}</span>
              </div>
            )
          })}
        </div>

        {/* Question card */}
        <div style={{ background: T.sur, border: `1px solid ${T.bdr}`, borderRadius: 12, padding: '18px 20px', marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11 }}>{currentSection.icon}</span>
              <span style={{ fontSize: 10, color: currentSection.color, fontWeight: 700 }}>{currentSection.title}</span>
            </div>
            <span style={{ fontSize: 10, color: T.mut }}>Q{qIdx + 1} of {currentQuestions.length}</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.txt, lineHeight: 1.6 }}>{currentQ.q}</div>
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 12 }}>
          {currentQ.options.map((opt, oi) => {
            const isSel   = selected === oi
            const isCorr  = oi === currentQ.answer
            let bg2 = T.sur, bc = T.bdr, c2 = T.txt
            if (confirmed) {
              if (isCorr)          { bg2 = T.correctBg; bc = T.grn; c2 = T.grn }
              else if (isSel)      { bg2 = T.wrongBg;   bc = T.red; c2 = T.red }
            } else if (isSel)      { bg2 = T.selBg;     bc = T.acc; c2 = T.acc }
            return (
              <div key={oi} onClick={() => handleSelect(oi)} style={{
                padding: '11px 14px', borderRadius: 8,
                cursor: confirmed ? 'default' : 'pointer',
                background: bg2, border: `1px solid ${bc}`, color: c2,
                fontSize: 12, fontWeight: isSel || (confirmed && isCorr) ? 600 : 400,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                transition: 'all 0.1s',
                userSelect: 'none',
              }}>
                <span>{String.fromCharCode(65 + oi)}. {opt}</span>
                {confirmed && isCorr && <span>✓</span>}
                {confirmed && isSel && !isCorr && <span>✗</span>}
              </div>
            )
          })}
        </div>

        {/* Explanation */}
        {confirmed && (
          <div style={{
            background: isCorrect ? T.correctBg : T.wrongBg,
            border: `1px solid ${isCorrect ? T.grn : T.red}`,
            borderRadius: 8, padding: '10px 14px', marginBottom: 12,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: isCorrect ? T.grn : T.red, marginBottom: 4 }}>
              {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
            </div>
            <div style={{ fontSize: 11, color: T.txt, lineHeight: 1.6 }}>{currentQ.explanation}</div>
          </div>
        )}

        {/* Action button */}
        {!confirmed ? (
          <button onClick={handleConfirm} disabled={selected === null} style={{
            width: '100%', padding: 12, borderRadius: 8, border: 'none',
            background: selected !== null ? '#004990' : (dark ? '#21262d' : '#e5e7eb'),
            color: selected !== null ? '#c8d8e8' : T.mut,
            fontSize: 13, fontWeight: 700,
            cursor: selected !== null ? 'pointer' : 'not-allowed',
          }}>Check Answer</button>
        ) : (
          <button onClick={handleNext} style={{
            width: '100%', padding: 12, borderRadius: 8, border: 'none',
            background: '#004990', color: '#c8d8e8',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>
            {secIdx === SECTIONS.length - 1 && qIdx === currentQuestions.length - 1
              ? 'Finish Test & See Results →'
              : 'Next Question →'}
          </button>
        )}
      </div>
    </div>
  )
}
