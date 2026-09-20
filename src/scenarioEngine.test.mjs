// Run with:  node src/scenarioEngine.test.mjs
// Plain Node, no test framework. Exits non-zero on any failure.
import assert from 'node:assert/strict'
import {
  validateScenarios, playableScenarios, xpForAnswer, xpForLevel, levelForXp,
  levelInfo, applyAnswer, emptyProgress, categoryStats, earnedBadges,
  buildSession, storageKey, SESSION_LENGTH, BADGE_THRESHOLD,
} from './scenarioEngine.js'
import { SCENARIOS, CATEGORIES } from './data/scenarios.js'

let passed = 0
function test(name, fn) {
  try { fn(); passed++; console.log('  ✓', name) }
  catch (e) { console.error('  ✗', name, '\n    ', e.message); process.exitCode = 1 }
}

console.log('\n── Scenario data ──')
test('every scenario is valid (no errors)', () => {
  const { errors } = validateScenarios(SCENARIOS, CATEGORIES)
  assert.deepEqual(errors, [])
})
test('no validation warnings either', () => {
  const { warnings } = validateScenarios(SCENARIOS, CATEGORIES)
  assert.deepEqual(warnings, [])
})
test('45 scenarios, 5 per category, all 9 categories covered', () => {
  assert.equal(SCENARIOS.length, 45)
  for (const c of CATEGORIES) {
    assert.equal(SCENARIOS.filter(s => s.category === c.id).length, 5, c.id)
  }
})
test('every scenario has exactly one best, ≥1 partial, ≥1 bad', () => {
  for (const s of SCENARIOS) {
    const r = s.options.map(o => o.result)
    assert.equal(r.filter(x => x === 'best').length, 1, s.id)
    assert.ok(r.includes('partial'), s.id + ' partial')
    assert.ok(r.includes('bad'), s.id + ' bad')
  }
})
test('difficulty mix includes 1, 2 and 3', () => {
  const d = new Set(SCENARIOS.map(s => s.difficulty))
  assert.deepEqual([...d].sort(), [1, 2, 3])
})
test('validator catches a scenario with no best answer', () => {
  const broken = [{ ...SCENARIOS[0], id: 'x', options: SCENARIOS[0].options.map(o => ({ ...o, result: 'bad' })) }]
  const { errors } = validateScenarios(broken, CATEGORIES)
  assert.ok(errors.some(e => e.includes('exactly one "best"')))
})
test('validator catches duplicate ids and bad category', () => {
  const broken = [SCENARIOS[0], { ...SCENARIOS[1], id: SCENARIOS[0].id, category: 'nope' }]
  const { errors } = validateScenarios(broken, CATEGORIES)
  assert.ok(errors.some(e => e.includes('duplicate id')))
  assert.ok(errors.some(e => e.includes('unknown category')))
})
test('playableScenarios drops broken ones and keeps good ones', () => {
  const broken = { ...SCENARIOS[0], id: 'zz', options: [] }
  assert.equal(playableScenarios([...SCENARIOS, broken], CATEGORIES).length, SCENARIOS.length)
})

console.log('\n── XP rules ──')
test('best = 10×difficulty, partial = half, bad = 0', () => {
  assert.equal(xpForAnswer('best', 1, false), 10)
  assert.equal(xpForAnswer('best', 3, false), 30)
  assert.equal(xpForAnswer('partial', 2, false), 10)
  assert.equal(xpForAnswer('partial', 1, false), 5)
  assert.equal(xpForAnswer('bad', 3, false), 0)
})
test('repeat of an already-solved scenario pays 25%, rounded', () => {
  assert.equal(xpForAnswer('best', 2, true), 5)     // 20 × .25
  assert.equal(xpForAnswer('best', 1, true), 3)     // 10 × .25 = 2.5 → 3
  assert.equal(xpForAnswer('partial', 1, true), 1)  // 5 × .25 = 1.25 → 1
  assert.equal(xpForAnswer('bad', 3, true), 0)
})

console.log('\n── Level thresholds ──')
test('thresholds: L1=0, L2=100, L3=250, L4=450, L5=700, L6=1000', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(xpForLevel), [0, 100, 250, 450, 700, 1000])
})
test('0 XP is level 1 with 0% progress and 100 to go', () => {
  const li = levelInfo(0)
  assert.equal(li.level, 1); assert.equal(li.pct, 0); assert.equal(li.xpToNext, 100)
})
test('negative / NaN / undefined XP clamps to 0 without crashing', () => {
  assert.equal(levelInfo(-50).level, 1)
  assert.equal(levelInfo(NaN).xp, 0)
  assert.equal(levelInfo(undefined).level, 1)
})
test('99 XP is still level 1, 100 XP is exactly level 2 with 0% into it', () => {
  assert.equal(levelForXp(99), 1)
  const li = levelInfo(100)
  assert.equal(li.level, 2); assert.equal(li.pct, 0); assert.equal(li.xpIntoLevel, 0); assert.equal(li.xpToNext, 150)
})
test('249 → L2, 250 → L3, 450 → L4 (threshold exactly)', () => {
  assert.equal(levelForXp(249), 2); assert.equal(levelForXp(250), 3); assert.equal(levelForXp(450), 4)
})
test('pct never exceeds 100 and grows monotonically inside a level', () => {
  let last = -1
  for (let xp = 100; xp < 250; xp++) {
    const p = levelInfo(xp).pct
    assert.ok(p >= last && p <= 100, `xp ${xp} pct ${p}`)
    last = p
  }
})
test('levelForXp handles very large XP without hanging', () => {
  assert.ok(levelForXp(1e7) > 100)
})

console.log('\n── applyAnswer ──')
const s1 = SCENARIOS.find(s => s.difficulty === 1)
const s3 = SCENARIOS.find(s => s.difficulty === 3)
test('first answer on empty progress: best → XP, solved, streak 1', () => {
  const r = applyAnswer(emptyProgress(), s1, 'best', 0)
  assert.equal(r.xpEarned, 10); assert.equal(r.streak, 1)
  assert.equal(r.progress.xp, 10); assert.equal(r.progress.solved[s1.id], true)
  assert.equal(r.progress.totalAnswered, 1); assert.equal(r.progress.totalBest, 1)
  assert.equal(r.leveledUp, false)
})
test('applyAnswer does not mutate its input', () => {
  const p = emptyProgress()
  applyAnswer(p, s1, 'best', 0)
  assert.equal(p.xp, 0); assert.deepEqual(p.solved, {})
})
test('partial ends streak and gives half XP; bad gives 0 and ends streak', () => {
  const r1 = applyAnswer(emptyProgress(), s3, 'partial', 4)
  assert.equal(r1.xpEarned, 15); assert.equal(r1.streak, 0); assert.equal(r1.progress.solved[s3.id], undefined)
  const r2 = applyAnswer(emptyProgress(), s3, 'bad', 4)
  assert.equal(r2.xpEarned, 0); assert.equal(r2.streak, 0)
})
test('bestStreak persists across streak resets', () => {
  let p = emptyProgress()
  let st = 0
  for (let i = 0; i < 3; i++) { const r = applyAnswer(p, SCENARIOS[i], 'best', st); p = r.progress; st = r.streak }
  assert.equal(p.bestStreak, 3)
  const r = applyAnswer(p, SCENARIOS[3], 'bad', st)
  assert.equal(r.streak, 0); assert.equal(r.progress.bestStreak, 3)
})
test('repeat best on solved scenario pays 25%', () => {
  const r1 = applyAnswer(emptyProgress(), s3, 'best', 0)
  const r2 = applyAnswer(r1.progress, s3, 'best', r1.streak)
  assert.equal(r2.xpEarned, 8) // 30 × .25 = 7.5 → 8
  assert.equal(r2.progress.seen[s3.id], 2)
})
test('leveledUp fires exactly when crossing 100', () => {
  const p = { ...emptyProgress(), xp: 90 }
  const r = applyAnswer(p, s1, 'best', 0)   // +10 → 100
  assert.equal(r.progress.xp, 100); assert.equal(r.leveledUp, true)
  const r2 = applyAnswer(r.progress, SCENARIOS[1], 'bad', 0)
  assert.equal(r2.leveledUp, false)
})
test('progress loaded from an old/partial record still works', () => {
  const r = applyAnswer({ xp: 5 }, s1, 'best', 0)   // missing solved/seen/answers
  assert.equal(r.progress.xp, 15); assert.equal(r.progress.totalAnswered, 1)
})

console.log('\n── Badges ──')
test('badge threshold is 4 of 5 at launch and none earned at start', () => {
  const st = categoryStats(emptyProgress())
  for (const c of st) { assert.equal(c.total, 5); assert.equal(c.need, 4); assert.equal(c.earned, false) }
  assert.deepEqual(earnedBadges(emptyProgress()), [])
})
test('badge earned on the 4th solved scenario in a category, reported once', () => {
  const cat = CATEGORIES[0].id
  const list = SCENARIOS.filter(s => s.category === cat)
  let p = emptyProgress(), st = 0, r
  for (let i = 0; i < 3; i++) { r = applyAnswer(p, list[i], 'best', st); p = r.progress; st = r.streak; assert.deepEqual(r.newBadges, []) }
  r = applyAnswer(p, list[3], 'best', st)
  assert.deepEqual(r.newBadges, [cat])
  const r5 = applyAnswer(r.progress, list[4], 'best', r.streak)
  assert.deepEqual(r5.newBadges, [])        // not re-awarded
  assert.deepEqual(earnedBadges(r5.progress), [cat])
})
test('partial answers do not count toward badges', () => {
  const cat = CATEGORIES[1].id
  let p = emptyProgress()
  for (const s of SCENARIOS.filter(s => s.category === cat)) p = applyAnswer(p, s, 'partial', 0).progress
  assert.deepEqual(earnedBadges(p), [])
})

console.log('\n── Session building ──')
test('default session is 10 scenarios with shuffled options and no duplicates', () => {
  const ses = buildSession(emptyProgress(), null)
  assert.equal(ses.length, SESSION_LENGTH)
  assert.equal(new Set(ses.map(s => s.id)).size, SESSION_LENGTH)
  for (const s of ses) assert.equal(s.options.filter(o => o.result === 'best').length, 1)
})
test('category filter restricts and shrinks the session (5 in a category)', () => {
  const ses = buildSession(emptyProgress(), [CATEGORIES[2].id])
  assert.equal(ses.length, 5)
  assert.ok(ses.every(s => s.category === CATEGORIES[2].id))
})
test('unseen scenarios come before seen ones', () => {
  const p = emptyProgress()
  const all = playableScenarios()
  for (let i = 0; i < all.length - 3; i++) p.seen[all[i].id] = 1
  const ses = buildSession(p, null, 5)
  const unseen = ses.filter(s => !p.seen[s.id]).length
  assert.equal(unseen, 3)
  assert.ok(ses.slice(0, 3).every(s => !p.seen[s.id]))
})
test('empty pool returns empty session, no crash', () => {
  assert.deepEqual(buildSession(emptyProgress(), ['does-not-exist']), [])
})

console.log('\n── Storage key ──')
test('storage key is per-user, case/space-insensitive, and separate from ams_user', () => {
  assert.equal(storageKey('John Smith'), 'ams_scenarios_john smith')
  assert.equal(storageKey(' john smith '), storageKey('John Smith'))
  assert.notEqual(storageKey('a'), storageKey('b'))
  assert.ok(!storageKey('x').startsWith('ams_user'))
})

console.log(`\n${passed} passed${process.exitCode ? ', FAILURES above' : ''}\n`)
