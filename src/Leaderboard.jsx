import { useState, useEffect } from 'react'
import { supabase } from './supabase.js'

// ─── Score helpers (exported so other components can call them) ────────────────
// Backed by Supabase so all users share one central leaderboard.
// Fire-and-forget: callers do not await these, so failures are swallowed.

export async function saveTrainerScore(userName, { correct, total, streak, best }) {
  try {
    const { data: existing } = await supabase
      .from('scores')
      .select('quiz_correct, quiz_total, best_streak')
      .eq('name', userName)
      .single()

    const newCorrect = (existing?.quiz_correct || 0) + correct
    const newTotal   = (existing?.quiz_total   || 0) + total
    const newStreak  = Math.max(existing?.best_streak || 0, best || streak || 0)

    await supabase.from('scores').upsert({
      name:         userName,
      quiz_correct: newCorrect,
      quiz_total:   newTotal,
      best_streak:  newStreak,
      last_seen:    new Date().toISOString(),
      updated_at:   new Date().toISOString(),
    }, { onConflict: 'name' })
  } catch {}
}

export async function saveTestScore(userName, { testScore, testPassed, testCorrect, testTotal, testDate }) {
  try {
    const { data: existing } = await supabase
      .from('scores')
      .select('best_test_score, test_passed, test_attempts')
      .eq('name', userName)
      .single()

    await supabase.from('scores').upsert({
      name:            userName,
      best_test_score: Math.max(existing?.best_test_score || 0, testScore),
      test_passed:     existing?.test_passed || testPassed,
      test_attempts:   (existing?.test_attempts || 0) + 1,
      last_test_date:  testDate,
      last_seen:       new Date().toISOString(),
      updated_at:      new Date().toISOString(),
    }, { onConflict: 'name' })
  } catch {}
}

// ─── Leaderboard Component ────────────────────────────────────────────────────

const TABS = [
  { id: 'test',    label: '🏆 Test Score' },
  { id: 'quiz',    label: '📊 Quiz Stats' },
  { id: 'streak',  label: '🔥 Best Streak' },
]

export default function Leaderboard({ dark, user }) {
  const T = dark ? {
    bg: '#0d1117', sur: '#161b22', bdr: '#30363d',
    txt: '#c9d1d9', mut: '#8b949e', acc: '#4d8fcc',
    grn: '#3fb950', red: '#f85149', gold: '#f0c040',
    silver: '#a8b4c0', bronze: '#cd7f32',
    row: '#161b22', rowHl: '#1e2633',
  } : {
    bg: '#f0f4f8', sur: '#ffffff', bdr: '#e2e8f0',
    txt: '#1e293b', mut: '#64748b', acc: '#1a3a6b',
    grn: '#16a34a', red: '#dc2626', gold: '#b45309',
    silver: '#64748b', bronze: '#92400e',
    row: '#ffffff', rowHl: '#f0f4ff',
  }

  const [tab, setTab]     = useState('test')
  const [board, setBoard] = useState({})
  const [tick, setTick]   = useState(0)

  // Fetch the shared leaderboard from Supabase whenever tick changes
  useEffect(() => {
    supabase
      .from('scores')
      .select('*')
      .order('best_test_score', { ascending: false })
      .then(({ data }) => {
        if (data) {
          // Convert array to object keyed by name to match existing board shape
          const obj = {}
          data.forEach(row => {
            obj[row.name] = {
              name:          row.name,
              quizCorrect:   row.quiz_correct,
              quizTotal:     row.quiz_total,
              bestStreak:    row.best_streak,
              bestTestScore: row.best_test_score,
              testPassed:    row.test_passed,
              testAttempts:  row.test_attempts,
              lastTestDate:  row.last_test_date,
              lastSeen:      row.last_seen,
            }
          })
          setBoard(obj)
        }
      })
  }, [tick])

  // Real-time subscription — updates the board instantly when any user's score changes
  useEffect(() => {
    const channel = supabase
      .channel('scores-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, () => {
        setTick(t => t + 1)
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const entries = Object.values(board)
  const currentUserName = user?.name

  // ── Sorted lists per tab ──────────────────────────────────────────────────
  const sortedByTest = [...entries]
    .filter(e => e.bestTestScore !== undefined)
    .sort((a, b) => (b.bestTestScore || 0) - (a.bestTestScore || 0))

  const sortedByQuiz = [...entries]
    .filter(e => e.quizTotal > 0)
    .sort((a, b) => {
      const pctA = a.quizTotal ? a.quizCorrect / a.quizTotal : 0
      const pctB = b.quizTotal ? b.quizCorrect / b.quizTotal : 0
      if (Math.abs(pctA - pctB) > 0.001) return pctB - pctA
      return (b.quizTotal || 0) - (a.quizTotal || 0)
    })

  const sortedByStreak = [...entries]
    .filter(e => e.bestStreak > 0)
    .sort((a, b) => (b.bestStreak || 0) - (a.bestStreak || 0))

  const medalColor = (i) => i === 0 ? T.gold : i === 1 ? T.silver : i === 2 ? T.bronze : T.mut
  const medalLabel = (i) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`

  function formatDate(iso) {
    if (!iso) return '—'
    try {
      return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } catch { return '—' }
  }

  // ── My stats card ─────────────────────────────────────────────────────────
  const me = board[currentUserName]
  const myQuizPct = me?.quizTotal ? Math.round((me.quizCorrect / me.quizTotal) * 100) : null

  const TableHeader = ({ cols }) => (
    <div style={{ display: 'flex', padding: '6px 14px', borderBottom: `1px solid ${T.bdr}`, background: T.sur }}>
      {cols.map((c, i) => (
        <div key={i} style={{ flex: c.flex || 1, fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: T.mut, textAlign: c.right ? 'right' : 'left' }}>
          {c.label}
        </div>
      ))}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.txt, fontFamily: 'monospace', padding: '16px 14px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 28, marginBottom: 4 }}>🏆</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.acc }}>Leaderboard</div>
          <div style={{ fontSize: 10, color: T.mut, marginTop: 2 }}>Alexander Machine Shop · PUMA DNT2600M Training</div>
        </div>

        {/* My stats card */}
        {me && (
          <div style={{ background: T.sur, border: `2px solid #004990`, borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#004990', marginBottom: 8 }}>Your Stats — {me.name}</div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {[
                ['Best Test', me.bestTestScore != null ? `${me.bestTestScore}%` : '—', me.testPassed ? T.grn : T.txt],
                ['Certified', me.testPassed ? 'YES ✓' : 'No', me.testPassed ? T.grn : T.mut],
                ['Test Attempts', me.testAttempts || 0, T.txt],
                ['Quiz Accuracy', myQuizPct != null ? `${myQuizPct}%` : '—', T.txt],
                ['Questions Answered', me.quizTotal || 0, T.txt],
                ['Best Streak', me.bestStreak || 0, me.bestStreak >= 10 ? '#f0c040' : T.txt],
              ].map(([label, val, col]) => (
                <div key={label}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: col }}>{val}</div>
                  <div style={{ fontSize: 9, color: T.mut }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: '8px 4px', borderRadius: 7, cursor: 'pointer',
              background: tab === t.id ? '#004990' : T.sur,
              border: `1px solid ${tab === t.id ? '#004990' : T.bdr}`,
              color: tab === t.id ? '#c8d8e8' : T.mut,
              fontSize: 11, fontWeight: tab === t.id ? 700 : 400,
              fontFamily: 'monospace',
            }}>{t.label}</button>
          ))}
        </div>

        {/* ── TEST SCORE TAB ── */}
        {tab === 'test' && (
          <div style={{ background: T.sur, border: `1px solid ${T.bdr}`, borderRadius: 10, overflow: 'hidden' }}>
            <TableHeader cols={[
              { label: 'Rank', flex: 0.4 },
              { label: 'Name', flex: 2 },
              { label: 'Best Score', flex: 1, right: true },
              { label: 'Certified', flex: 0.8, right: true },
              { label: 'Attempts', flex: 0.7, right: true },
              { label: 'Last Test', flex: 0.9, right: true },
            ]} />
            {sortedByTest.length === 0 && (
              <div style={{ padding: '24px', textAlign: 'center', fontSize: 11, color: T.mut }}>
                No test scores yet. Be the first to take the certification test!
              </div>
            )}
            {sortedByTest.map((entry, i) => {
              const isMe = entry.name === currentUserName
              return (
                <div key={entry.name} style={{
                  display: 'flex', padding: '10px 14px', alignItems: 'center',
                  background: isMe ? (dark ? '#0d1f35' : '#eff6ff') : (i % 2 === 0 ? T.row : T.bg),
                  borderBottom: `1px solid ${T.bdr}`,
                  borderLeft: isMe ? '3px solid #004990' : '3px solid transparent',
                }}>
                  <div style={{ flex: 0.4, fontSize: 14 }}>{medalLabel(i)}</div>
                  <div style={{ flex: 2, fontSize: 12, fontWeight: isMe ? 700 : 400, color: isMe ? T.acc : T.txt }}>
                    {entry.name}{isMe ? ' (you)' : ''}
                  </div>
                  <div style={{ flex: 1, textAlign: 'right', fontSize: 13, fontWeight: 700, color: entry.bestTestScore >= 80 ? T.grn : T.red }}>
                    {entry.bestTestScore}%
                  </div>
                  <div style={{ flex: 0.8, textAlign: 'right', fontSize: 11, color: entry.testPassed ? T.grn : T.mut }}>
                    {entry.testPassed ? '✓ Yes' : '✗ No'}
                  </div>
                  <div style={{ flex: 0.7, textAlign: 'right', fontSize: 11, color: T.mut }}>
                    {entry.testAttempts || 1}
                  </div>
                  <div style={{ flex: 0.9, textAlign: 'right', fontSize: 10, color: T.mut }}>
                    {formatDate(entry.lastTestDate)}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── QUIZ STATS TAB ── */}
        {tab === 'quiz' && (
          <div style={{ background: T.sur, border: `1px solid ${T.bdr}`, borderRadius: 10, overflow: 'hidden' }}>
            <TableHeader cols={[
              { label: 'Rank', flex: 0.4 },
              { label: 'Name', flex: 2 },
              { label: 'Accuracy', flex: 1, right: true },
              { label: 'Correct', flex: 0.8, right: true },
              { label: 'Total Answered', flex: 1, right: true },
            ]} />
            {sortedByQuiz.length === 0 && (
              <div style={{ padding: '24px', textAlign: 'center', fontSize: 11, color: T.mut }}>
                No quiz stats yet. Start the G-Code Trainer to build your score!
              </div>
            )}
            {sortedByQuiz.map((entry, i) => {
              const isMe = entry.name === currentUserName
              const pct = entry.quizTotal ? Math.round((entry.quizCorrect / entry.quizTotal) * 100) : 0
              return (
                <div key={entry.name} style={{
                  display: 'flex', padding: '10px 14px', alignItems: 'center',
                  background: isMe ? (dark ? '#0d1f35' : '#eff6ff') : (i % 2 === 0 ? T.row : T.bg),
                  borderBottom: `1px solid ${T.bdr}`,
                  borderLeft: isMe ? '3px solid #004990' : '3px solid transparent',
                }}>
                  <div style={{ flex: 0.4, fontSize: 14 }}>{medalLabel(i)}</div>
                  <div style={{ flex: 2, fontSize: 12, fontWeight: isMe ? 700 : 400, color: isMe ? T.acc : T.txt }}>
                    {entry.name}{isMe ? ' (you)' : ''}
                  </div>
                  <div style={{ flex: 1, textAlign: 'right' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: pct >= 80 ? T.grn : pct >= 60 ? '#f59e0b' : T.red }}>{pct}%</span>
                  </div>
                  <div style={{ flex: 0.8, textAlign: 'right', fontSize: 11, color: T.txt }}>{entry.quizCorrect || 0}</div>
                  <div style={{ flex: 1, textAlign: 'right', fontSize: 11, color: T.mut }}>{entry.quizTotal || 0}</div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── STREAK TAB ── */}
        {tab === 'streak' && (
          <div style={{ background: T.sur, border: `1px solid ${T.bdr}`, borderRadius: 10, overflow: 'hidden' }}>
            <TableHeader cols={[
              { label: 'Rank', flex: 0.4 },
              { label: 'Name', flex: 2 },
              { label: 'Best Streak 🔥', flex: 1, right: true },
            ]} />
            {sortedByStreak.length === 0 && (
              <div style={{ padding: '24px', textAlign: 'center', fontSize: 11, color: T.mut }}>
                No streak data yet. Build a streak in the G-Code Trainer!
              </div>
            )}
            {sortedByStreak.map((entry, i) => {
              const isMe = entry.name === currentUserName
              const streak = entry.bestStreak || 0
              const fireColor = streak >= 20 ? '#ef4444' : streak >= 10 ? '#f97316' : streak >= 5 ? '#fbbf24' : T.txt
              return (
                <div key={entry.name} style={{
                  display: 'flex', padding: '12px 14px', alignItems: 'center',
                  background: isMe ? (dark ? '#0d1f35' : '#eff6ff') : (i % 2 === 0 ? T.row : T.bg),
                  borderBottom: `1px solid ${T.bdr}`,
                  borderLeft: isMe ? '3px solid #004990' : '3px solid transparent',
                }}>
                  <div style={{ flex: 0.4, fontSize: 14 }}>{medalLabel(i)}</div>
                  <div style={{ flex: 2, fontSize: 12, fontWeight: isMe ? 700 : 400, color: isMe ? T.acc : T.txt }}>
                    {entry.name}{isMe ? ' (you)' : ''}
                  </div>
                  <div style={{ flex: 1, textAlign: 'right', fontSize: 18, fontWeight: 800, color: fireColor }}>
                    {streak} 🔥
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 10, color: T.mut }}>
          Scores update in real time · Shared across all users
        </div>
      </div>
    </div>
  )
}
