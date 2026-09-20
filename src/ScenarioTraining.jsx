import { useState, useEffect, useMemo } from 'react'
import { SCENARIOS, CATEGORIES } from './data/scenarios.js'
import {
  validateScenarios, playableScenarios, buildSession, applyAnswer,
  loadProgress, saveProgress, resetProgress, levelInfo, categoryStats,
  SESSION_LENGTH, BADGE_THRESHOLD,
} from './scenarioEngine.js'

// ─── Content check on load ──────────────────────────────────────────────────
// Runs once when the module is imported. Broken scenarios are skipped by the
// game and reported in the browser console (F12) so they're easy to fix.
const CHECK = validateScenarios(SCENARIOS, CATEGORIES)
if (CHECK.errors.length) {
  console.error(
    `[Scenario Training] ${CHECK.errors.length} scenario error(s) in src/data/scenarios.js — those scenarios are skipped:\n  ` +
    CHECK.errors.join('\n  '),
  )
}
if (CHECK.warnings.length) {
  console.warn(`[Scenario Training] content warnings:\n  ` + CHECK.warnings.join('\n  '))
}
const PLAYABLE = playableScenarios(SCENARIOS, CATEGORIES)
const CAT_BY_ID = Object.fromEntries(CATEGORIES.map(c => [c.id, c]))

// ─── Component ──────────────────────────────────────────────────────────────
// Screens: 'menu' → 'play' → 'summary' → back to 'menu'
export default function ScenarioTraining({ dark = true, user }) {
  // ── All hooks first. No early returns above this block. ──────────────────
  const [progress, setProgress]   = useState(() => loadProgress(user?.name))
  const [screen, setScreen]       = useState('menu')
  const [catFilter, setCatFilter] = useState(new Set())      // empty = all
  const [session, setSession]     = useState([])
  const [idx, setIdx]             = useState(0)
  const [picked, setPicked]       = useState(null)           // option index
  const [streak, setStreak]       = useState(0)
  const [lastGain, setLastGain]   = useState(null)           // { xpEarned, leveledUp, newBadges }
  const [log, setLog]             = useState([])             // per-scenario results this session
  const [confirmReset, setConfirmReset] = useState(false)

  // Re-load if the signed-in user changes (sign out → sign in as someone else).
  useEffect(() => {
    setProgress(loadProgress(user?.name))
    setScreen('menu')
  }, [user?.name])

  // Scroll to the top when the scenario changes (long feedback on a tablet).
  useEffect(() => { window.scrollTo({ top: 0 }) }, [idx, screen])

  const li    = useMemo(() => levelInfo(progress.xp), [progress.xp])
  const stats = useMemo(() => categoryStats(progress, PLAYABLE), [progress])

  // ── Theme (same palette as the rest of the site) ─────────────────────────
  const T = dark ? {
    bg: '#0d1117', sur: '#161b22', bdr: '#30363d', txt: '#c9d1d9', mut: '#8b949e',
    acc: '#93a8c4', sel: '#1e2633',
    grn: '#3fb950', grnBg: '#0d1f0d', grnBdr: '#196127',
    amb: '#f0c040', ambBg: '#2a2208', ambBdr: '#7a5c10',
    red: '#f85149', redBg: '#2d0e0e', redBdr: '#7a1e1e',
    btnPrimary: '#004990', btnPrimaryTxt: '#ffffff',
    bar: '#21262d',
  } : {
    bg: '#f0f4f8', sur: '#ffffff', bdr: '#d8dee6', txt: '#1e293b', mut: '#5b6776',
    acc: '#1a3a6b', sel: '#e8eef6',
    grn: '#15803d', grnBg: '#f0fdf4', grnBdr: '#86efac',
    amb: '#b45309', ambBg: '#fffbeb', ambBdr: '#fcd34d',
    red: '#b91c1c', redBg: '#fef2f2', redBdr: '#fca5a5',
    btnPrimary: '#004990', btnPrimaryTxt: '#ffffff',
    bar: '#e2e8f0',
  }
  const mono = 'monospace'

  // ── Actions ──────────────────────────────────────────────────────────────
  function startSession() {
    const ses = buildSession(progress, [...catFilter], SESSION_LENGTH, PLAYABLE)
    if (!ses.length) return
    setSession(ses); setIdx(0); setPicked(null); setStreak(0); setLastGain(null); setLog([])
    setScreen('play')
  }

  function choose(optionIndex) {
    if (picked !== null) return
    const sc = session[idx]
    const opt = sc.options[optionIndex]
    const r = applyAnswer(progress, sc, opt.result, streak)
    setPicked(optionIndex)
    setProgress(r.progress)
    saveProgress(user?.name, r.progress)
    setStreak(r.streak)
    setLastGain({ xpEarned: r.xpEarned, leveledUp: r.leveledUp, newBadges: r.newBadges })
    setLog(l => [...l, { id: sc.id, category: sc.category, result: opt.result, xp: r.xpEarned }])
  }

  function next() {
    if (idx + 1 >= session.length) {
      const p = { ...progress, sessions: (progress.sessions || 0) + 1 }
      setProgress(p); saveProgress(user?.name, p)
      setScreen('summary')
    } else {
      setIdx(i => i + 1); setPicked(null); setLastGain(null)
    }
  }

  function quitToMenu() {
    if (log.length) {
      const p = { ...progress, sessions: (progress.sessions || 0) + 1 }
      setProgress(p); saveProgress(user?.name, p)
      setScreen('summary')
    } else {
      setScreen('menu')
    }
  }

  function doReset() {
    setProgress(resetProgress(user?.name)); setConfirmReset(false)
  }

  const poolCount = catFilter.size
    ? PLAYABLE.filter(s => catFilter.has(s.category)).length
    : PLAYABLE.length

  // ── Shared bits (hoisted below the component; see makeUI) ─────────────
  const { Page, Brand, LevelBar, Chip, Diff, bigBtn } = useMemo(() => makeUI(T, dark), [dark]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Hooks are done; conditional rendering below ──────────────────────────

  // ═══ MENU ═══════════════════════════════════════════════════════════════
  if (screen === 'menu') {
    const earned = stats.filter(c => c.earned)
    return (
      <Page>
        <Brand sub="General machining theory & troubleshooting · any lathe, any control" />

        <div style={{ marginBottom: 14 }}><LevelBar li={li} /></div>

        {/* Stats strip */}
        <div style={{ background: T.sur, border: `1px solid ${T.bdr}`, borderRadius: 10, padding: '12px 16px', marginBottom: 14, display: 'flex', flexWrap: 'wrap', gap: '10px 28px' }}>
          {[
            ['Solved', `${Object.keys(progress.solved || {}).length} / ${PLAYABLE.length}`],
            ['Answered', progress.totalAnswered || 0],
            ['Best streak', `${progress.bestStreak || 0} 🔥`],
            ['Badges', `${earned.length} / ${CATEGORIES.length}`],
            ['Sessions', progress.sessions || 0],
          ].map(([k, v]) => (
            <div key={k}>
              <div style={{ fontSize: 20, fontWeight: 800, color: T.txt }}>{v}</div>
              <div style={{ fontSize: 12, color: T.mut }}>{k}</div>
            </div>
          ))}
        </div>

        {/* Badges */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: T.mut, marginBottom: 8 }}>
            Category badges · solve {Math.round(BADGE_THRESHOLD * 100)}% of a category to earn it
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 8 }}>
            {stats.map(c => (
              <div key={c.id} style={{ background: T.sur, border: `2px solid ${c.earned ? c.color : T.bdr}`, borderRadius: 10, padding: '10px 12px', opacity: c.earned ? 1 : 0.85 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 18 }}>{c.earned ? '🏅' : '○'}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: c.earned ? c.color : T.txt, lineHeight: 1.2 }}>{c.label}</span>
                </div>
                <div style={{ height: 8, background: T.bar, borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ width: `${c.total ? Math.round((c.solved / c.total) * 100) : 0}%`, height: '100%', background: c.color }} />
                </div>
                <div style={{ fontSize: 12, color: T.mut, marginTop: 5 }}>{c.solved} / {c.total} solved{!c.earned && ` · need ${c.need}`}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Category filter */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: T.mut, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Focus on {catFilter.size === 0 ? 'all categories' : `${catFilter.size} categor${catFilter.size === 1 ? 'y' : 'ies'}`}</span>
            {catFilter.size > 0 && (
              <button onClick={() => setCatFilter(new Set())} style={{ background: 'none', border: `1px solid ${T.bdr}`, color: T.acc, borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontFamily: mono, minHeight: 36 }}>Clear</button>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {CATEGORIES.map(c => {
              const on = catFilter.has(c.id)
              return (
                <button key={c.id} onClick={() => { const n = new Set(catFilter); on ? n.delete(c.id) : n.add(c.id); setCatFilter(n) }}
                  style={{ minHeight: 44, padding: '8px 14px', borderRadius: 99, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: mono,
                    background: on ? c.color + '22' : T.sur, border: `2px solid ${on ? c.color : T.bdr}`, color: on ? c.color : T.mut }}>
                  {on ? '✓ ' : ''}{c.label}
                </button>
              )
            })}
          </div>
        </div>

        <button onClick={startSession} disabled={poolCount === 0} style={bigBtn(true, { fontSize: 18, minHeight: 64, opacity: poolCount === 0 ? 0.5 : 1, cursor: poolCount === 0 ? 'not-allowed' : 'pointer' })}>
          Start Session → {Math.min(SESSION_LENGTH, poolCount)} scenarios
        </button>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: T.mut, lineHeight: 1.6 }}>
          Best answer: 10 XP × difficulty · Partial credit: half · Solved repeats: 25%<br />
          Progress saved on this device for <b style={{ color: T.txt }}>{user?.name}</b>
        </div>

        <div style={{ textAlign: 'center', marginTop: 14 }}>
          {!confirmReset ? (
            <button onClick={() => setConfirmReset(true)} style={{ background: 'none', border: 'none', color: T.mut, fontSize: 12, cursor: 'pointer', fontFamily: mono, textDecoration: 'underline', minHeight: 36 }}>Reset my progress</button>
          ) : (
            <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span style={{ fontSize: 13, color: T.red }}>Erase all XP, badges and history for {user?.name}?</span>
              <button onClick={doReset} style={{ background: T.red, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: mono, minHeight: 40 }}>Yes, reset</button>
              <button onClick={() => setConfirmReset(false)} style={{ background: T.sur, color: T.txt, border: `1px solid ${T.bdr}`, borderRadius: 6, padding: '8px 14px', fontSize: 13, cursor: 'pointer', fontFamily: mono, minHeight: 40 }}>Cancel</button>
            </div>
          )}
        </div>
      </Page>
    )
  }

  // ═══ PLAY ═══════════════════════════════════════════════════════════════
  if (screen === 'play' && session[idx]) {
    const sc = session[idx]
    const answered = picked !== null
    const pickedOpt = answered ? sc.options[picked] : null
    const bestIdx = sc.options.findIndex(o => o.result === 'best')
    const tone = r => r === 'best' ? { fg: T.grn, bg: T.grnBg, bdr: T.grnBdr } : r === 'partial' ? { fg: T.amb, bg: T.ambBg, bdr: T.ambBdr } : { fg: T.red, bg: T.redBg, bdr: T.redBdr }
    const verdict = !answered ? null
      : pickedOpt.result === 'best' ? { label: 'Best answer', icon: '✓' }
      : pickedOpt.result === 'partial' ? { label: 'Not wrong, but not the root cause', icon: '◐' }
      : { label: 'Not this one', icon: '✗' }

    return (
      <Page>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <button onClick={quitToMenu} style={{ background: 'none', border: `1px solid ${T.bdr}`, color: T.mut, padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: mono, minHeight: 40 }}>← End session</button>
          <div style={{ fontSize: 14, color: T.mut }}>Scenario <b style={{ color: T.txt }}>{idx + 1}</b> of {session.length}</div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 14, fontSize: 15, alignItems: 'center' }}>
            <span style={{ color: streak >= 3 ? '#f0c040' : T.mut, fontWeight: 700 }}>🔥 {streak}</span>
            <span style={{ color: T.acc, fontWeight: 700 }}>Lv {li.level}</span>
            <span style={{ color: T.mut }}>{li.xp} XP</span>
          </div>
        </div>

        {/* Session progress */}
        <div style={{ height: 6, background: T.bar, borderRadius: 99, overflow: 'hidden', marginBottom: 14 }}>
          <div style={{ width: `${Math.round(((idx + (answered ? 1 : 0)) / session.length) * 100)}%`, height: '100%', background: '#004990', transition: 'width 0.3s' }} />
        </div>

        {/* Situation */}
        <div style={{ background: T.sur, border: `1px solid ${T.bdr}`, borderRadius: 12, padding: '18px 20px', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <Chip cat={sc.category} />
            <Diff n={sc.difficulty} />
            <span style={{ marginLeft: 'auto', fontSize: 12, color: T.mut }}>{sc.difficulty * 10} XP{progress.solved?.[sc.id] && answered === false ? ' · solved before (25%)' : ''}</span>
          </div>
          <div style={{ fontSize: 17, lineHeight: 1.55, color: T.txt, whiteSpace: 'pre-wrap' }}>{sc.situation}</div>
        </div>

        <div style={{ fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: T.mut, marginBottom: 8 }}>
          {answered ? 'Your pick vs. the best call' : 'What do you do?'}
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
          {sc.options.map((o, i) => {
            const isPick = picked === i, isBest = i === bestIdx
            let bg = T.sur, bdr = T.bdr, fg = T.txt, badge = null
            if (answered) {
              if (isBest) { const t = tone('best'); bg = t.bg; bdr = t.fg; fg = t.fg; badge = isPick ? '✓ Your pick — best answer' : '✓ Best answer' }
              else if (isPick) { const t = tone(o.result); bg = t.bg; bdr = t.fg; fg = t.fg; badge = o.result === 'partial' ? '◐ Your pick — partial credit' : '✗ Your pick' }
              else { fg = T.mut }
            }
            const showFeedback = answered && (isPick || isBest)
            return (
              <div key={i}>
                <button onClick={() => choose(i)} disabled={answered}
                  style={{ ...bigBtn(false), textAlign: 'left', background: bg, border: `2px solid ${bdr}`, color: fg, fontWeight: answered && (isPick || isBest) ? 700 : 500,
                    fontSize: 16, lineHeight: 1.45, cursor: answered ? 'default' : 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start',
                    borderRadius: showFeedback ? '10px 10px 0 0' : 10, opacity: answered && !isPick && !isBest ? 0.6 : 1 }}>
                  <span style={{ flexShrink: 0, width: 30, height: 30, borderRadius: '50%', border: `2px solid ${answered ? bdr : T.bdr}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: fg }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span style={{ flex: 1 }}>
                    {badge && <div style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>{badge}</div>}
                    {o.text}
                  </span>
                </button>
                {showFeedback && (
                  <div style={{ background: bg, border: `2px solid ${bdr}`, borderTop: `1px dashed ${bdr}`, borderRadius: '0 0 10px 10px', padding: '12px 18px 14px 60px', fontSize: 15, lineHeight: 1.55, color: T.txt }}>
                    {o.feedback}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Verdict + XP + explainer + next */}
        {answered && (
          <div style={{ background: T.sur, border: `2px solid ${tone(pickedOpt.result).fg}`, borderRadius: 12, padding: '16px 20px', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: sc.whyItMatters ? 12 : 0 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: tone(pickedOpt.result).fg }}>{verdict.icon} {verdict.label}</div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: lastGain?.xpEarned ? T.grn : T.mut }}>+{lastGain?.xpEarned ?? 0} XP</span>
                {lastGain?.leveledUp && <span style={{ background: '#004990', color: '#fff', fontWeight: 800, fontSize: 13, padding: '4px 10px', borderRadius: 6 }}>▲ Level {li.level}</span>}
                {lastGain?.newBadges?.map(b => <span key={b} style={{ background: (CAT_BY_ID[b]?.color || T.acc) + '22', border: `1px solid ${CAT_BY_ID[b]?.color || T.acc}`, color: CAT_BY_ID[b]?.color || T.acc, fontWeight: 800, fontSize: 13, padding: '4px 10px', borderRadius: 6 }}>🏅 {CAT_BY_ID[b]?.label} badge</span>)}
              </div>
            </div>
            {sc.whyItMatters && (
              <div style={{ borderTop: `1px solid ${T.bdr}`, paddingTop: 12 }}>
                <div style={{ fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: T.mut, marginBottom: 6 }}>Why this matters</div>
                <div style={{ fontSize: 15, lineHeight: 1.55, color: T.txt }}>{sc.whyItMatters}</div>
              </div>
            )}
          </div>
        )}

        {answered && (
          <button onClick={next} style={bigBtn(true, { fontSize: 18, minHeight: 64 })}>
            {idx + 1 >= session.length ? 'Finish session →' : 'Next scenario →'}
          </button>
        )}
      </Page>
    )
  }

  // ═══ SUMMARY ════════════════════════════════════════════════════════════
  if (screen === 'summary') {
    const n = log.length
    const best = log.filter(l => l.result === 'best').length
    const partial = log.filter(l => l.result === 'partial').length
    const bad = n - best - partial
    const xp = log.reduce((a, l) => a + l.xp, 0)
    const pct = n ? Math.round((best / n) * 100) : 0

    // Categories needing work: any category this session where < half were best
    const byCat = {}
    for (const l of log) {
      byCat[l.category] = byCat[l.category] || { n: 0, best: 0 }
      byCat[l.category].n++; if (l.result === 'best') byCat[l.category].best++
    }
    const weak = Object.entries(byCat).filter(([, v]) => v.best / v.n < 0.5).map(([k, v]) => ({ id: k, ...v }))
    const strong = Object.entries(byCat).filter(([, v]) => v.best === v.n).map(([k]) => k)

    return (
      <Page max={640}>
        <Brand sub="Session complete" />

        <div style={{ background: T.sur, border: `1px solid ${T.bdr}`, borderRadius: 12, padding: '20px', marginBottom: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 44, fontWeight: 900, color: pct >= 80 ? T.grn : pct >= 50 ? T.amb : T.red, lineHeight: 1 }}>{pct}%</div>
          <div style={{ fontSize: 14, color: T.mut, marginTop: 6 }}>best answers · {best} of {n} scenarios</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 28, marginTop: 16, flexWrap: 'wrap' }}>
            {[['✓ Best', best, T.grn], ['◐ Partial', partial, T.amb], ['✗ Missed', bad, T.red], ['XP earned', `+${xp}`, T.acc]].map(([k, v, c]) => (
              <div key={k}>
                <div style={{ fontSize: 24, fontWeight: 800, color: c }}>{v}</div>
                <div style={{ fontSize: 12, color: T.mut }}>{k}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}><LevelBar li={li} /></div>

        {weak.length > 0 && (
          <div style={{ background: T.sur, border: `1px solid ${T.bdr}`, borderRadius: 12, padding: '14px 18px', marginBottom: 14 }}>
            <div style={{ fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: T.mut, marginBottom: 10 }}>Needs work</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {weak.map(w => (
                <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <Chip cat={w.id} />
                  <span style={{ fontSize: 14, color: T.mut }}>{w.best} of {w.n} best this session</span>
                  <button onClick={() => { setCatFilter(new Set([w.id])); setScreen('menu') }}
                    style={{ marginLeft: 'auto', background: T.sel, border: `1px solid ${T.bdr}`, color: T.acc, borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: mono, minHeight: 40 }}>
                    Drill this →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {strong.length > 0 && (
          <div style={{ background: T.sur, border: `1px solid ${T.bdr}`, borderRadius: 12, padding: '14px 18px', marginBottom: 14 }}>
            <div style={{ fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: T.mut, marginBottom: 10 }}>Solid this session</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{strong.map(c => <Chip key={c} cat={c} />)}</div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={startSession} style={{ ...bigBtn(true, { minHeight: 60 }), flex: '1 1 200px' }}>Play again →</button>
          <button onClick={() => setScreen('menu')} style={{ ...bigBtn(false, { minHeight: 60 }), flex: '1 1 200px' }}>Back to menu</button>
        </div>
      </Page>
    )
  }

  // Fallback (shouldn't happen): empty session or unknown screen → menu.
  return (
    <Page>
      <Brand />
      <div style={{ textAlign: 'center', color: T.mut, fontSize: 15, marginBottom: 16 }}>
        No scenarios available for that selection.
      </div>
      <button onClick={() => setScreen('menu')} style={bigBtn(true)}>Back to menu</button>
    </Page>
  )
}

// ─── Presentational helpers ─────────────────────────────────────────────────
// Built once per theme change (not per render) so React keeps the DOM
// stable instead of remounting on every state update.
function makeUI(T, dark) {
  const mono = 'monospace'
  const Page = ({ children, max = 720 }) => (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.txt, fontFamily: mono, padding: '16px 14px 40px' }}>
      <div style={{ maxWidth: max, margin: '0 auto' }}>{children}</div>
    </div>
  )
  
  const Brand = ({ sub }) => (
    <div style={{ textAlign: 'center', marginBottom: 18 }}>
      <div style={{ display: 'inline-block', background: '#004990', borderRadius: 8, padding: '10px 28px', marginBottom: 10, boxShadow: '0 2px 8px #00000033' }}>
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '0.06em', color: '#c8d8e8' }}>Alexander Machine Shop</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ background: '#ef4444', color: '#fff', fontWeight: 900, fontSize: 11, letterSpacing: '0.06em', padding: '2px 7px 2px 8px', borderRadius: '4px 0 0 4px', lineHeight: 1 }}>RAD</div>
        <div style={{ background: dark ? '#1e2633' : '#f1f5f9', border: `1px solid ${dark ? '#30363d' : '#cbd5e1'}`, borderLeft: 'none', color: dark ? '#94a3b8' : '#475569', fontWeight: 700, fontSize: 11, letterSpacing: '0.18em', padding: '2px 8px 2px 7px', borderRadius: '0 4px 4px 0', lineHeight: 1 }}>MFG</div>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: T.acc }}>Scenario Training</div>
      {sub && <div style={{ fontSize: 13, color: T.mut, marginTop: 4 }}>{sub}</div>}
    </div>
  )
  
  const LevelBar = ({ li, compact }) => (
    <div style={{ background: T.sur, border: `1px solid ${T.bdr}`, borderRadius: 10, padding: compact ? '10px 14px' : '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
        <div style={{ fontSize: compact ? 18 : 24, fontWeight: 800, color: T.acc }}>Level {li.level}</div>
        <div style={{ fontSize: 13, color: T.mut }}>{li.xp} XP</div>
        <div style={{ marginLeft: 'auto', fontSize: 13, color: T.mut }}>{li.xpToNext} XP to Level {li.level + 1}</div>
      </div>
      <div style={{ height: compact ? 10 : 14, background: T.bar, borderRadius: 99, overflow: 'hidden', border: `1px solid ${T.bdr}` }}>
        <div style={{ width: `${li.pct}%`, height: '100%', background: '#004990', borderRadius: 99, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  )
  
  const Chip = ({ cat, small }) => {
    const c = CAT_BY_ID[cat] || { label: cat, color: T.acc }
    return (
      <span style={{ display: 'inline-block', padding: small ? '2px 9px' : '4px 12px', borderRadius: 99, fontSize: small ? 11 : 12, fontWeight: 700, background: c.color + '22', border: `1px solid ${c.color}`, color: c.color, whiteSpace: 'nowrap' }}>
        {c.label}
      </span>
    )
  }
  
  const Diff = ({ n }) => (
    <span title={`Difficulty ${n} of 3`} style={{ fontSize: 13, color: T.mut, letterSpacing: 2 }}>
      {'●'.repeat(n)}{'○'.repeat(3 - n)}
    </span>
  )
  
  const bigBtn = (primary, extra = {}) => ({
    width: '100%', minHeight: 56, padding: '14px 18px', borderRadius: 10, cursor: 'pointer',
    fontFamily: mono, fontSize: 16, fontWeight: 700, letterSpacing: '0.02em',
    background: primary ? T.btnPrimary : T.sur,
    color: primary ? T.btnPrimaryTxt : T.txt,
    border: primary ? 'none' : `2px solid ${T.bdr}`,
    ...extra,
  })

  return { Page, Brand, LevelBar, Chip, Diff, bigBtn }
}
