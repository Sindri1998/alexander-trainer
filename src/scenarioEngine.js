// ============================================================================
//  SCENARIO TRAINING — GAME ENGINE
//  Pure functions: XP rules, levels, badges, validation, and localStorage.
//  No React in here, so every rule can be unit-tested in plain Node.
//
//  Storage lives ONLY in this file (loadProgress / saveProgress). If progress
//  ever moves to Supabase, this is the one file that changes.
// ============================================================================

import { SCENARIOS, CATEGORIES } from './data/scenarios.js'

// ─── Tunables ───────────────────────────────────────────────────────────────
export const XP_PER_DIFFICULTY   = 10     // best answer: 10 × difficulty
export const PARTIAL_MULTIPLIER  = 0.5    // partial answer: half of best
export const REPEAT_MULTIPLIER   = 0.25   // scenario already solved: 25% XP
export const LEVEL_BASE          = 100    // Level 2 at 100 XP
export const LEVEL_STEP          = 50     // each level costs 50 XP more than the last
export const BADGE_THRESHOLD     = 0.8    // 80% of a category solved → badge
export const SESSION_LENGTH      = 10     // scenarios per session

export const RESULTS = ['best', 'partial', 'bad']

// ─── Validation ─────────────────────────────────────────────────────────────
// Returns { errors: string[], warnings: string[] }. Errors mean a scenario is
// unplayable and it will be skipped; warnings are content-quality nudges.
export function validateScenarios(list = SCENARIOS, cats = CATEGORIES) {
  const errors = [], warnings = []
  const ids = new Set()
  const catIds = new Set(cats.map(c => c.id))

  if (!Array.isArray(list)) return { errors: ['SCENARIOS is not an array'], warnings }

  list.forEach((s, i) => {
    const tag = `Scenario #${i + 1}${s?.id ? ` (${s.id})` : ''}`
    if (!s || typeof s !== 'object') { errors.push(`${tag}: not an object`); return }
    if (!s.id || typeof s.id !== 'string') errors.push(`${tag}: missing id`)
    else if (ids.has(s.id)) errors.push(`${tag}: duplicate id "${s.id}"`)
    else ids.add(s.id)
    if (!catIds.has(s.category)) errors.push(`${tag}: unknown category "${s.category}"`)
    if (![1, 2, 3].includes(s.difficulty)) errors.push(`${tag}: difficulty must be 1, 2, or 3`)
    if (!s.situation || typeof s.situation !== 'string') errors.push(`${tag}: missing situation text`)
    if (!Array.isArray(s.options) || s.options.length < 4 || s.options.length > 5) {
      errors.push(`${tag}: needs 4 or 5 options (has ${Array.isArray(s.options) ? s.options.length : 0})`)
      return
    }
    let best = 0, partial = 0, bad = 0
    s.options.forEach((o, j) => {
      const otag = `${tag} option ${j + 1}`
      if (!o || !o.text) errors.push(`${otag}: missing text`)
      if (!RESULTS.includes(o?.result)) errors.push(`${otag}: result must be "best", "partial", or "bad" (got ${JSON.stringify(o?.result)})`)
      if (!o?.feedback) errors.push(`${otag}: missing feedback`)
      if (o?.result === 'best') best++
      if (o?.result === 'partial') partial++
      if (o?.result === 'bad') bad++
    })
    if (best !== 1) errors.push(`${tag}: must have exactly one "best" option (has ${best})`)
    if (partial === 0) warnings.push(`${tag}: no "partial" option`)
    if (bad === 0) warnings.push(`${tag}: no "bad" option`)
  })

  cats.forEach(c => {
    if (!list.some(s => s.category === c.id)) warnings.push(`Category "${c.id}" has no scenarios`)
  })

  return { errors, warnings }
}

// Only scenarios that pass validation are playable.
export function playableScenarios(list = SCENARIOS, cats = CATEGORIES) {
  return list.filter(s => validateScenarios([s], cats).errors.length === 0)
}

// ─── XP & levels ────────────────────────────────────────────────────────────
export function baseXp(difficulty) {
  return XP_PER_DIFFICULTY * difficulty
}

// XP earned for one answer. `alreadySolved` = this user has previously chosen
// the best answer on this scenario (repeats pay less so levels can't be farmed).
export function xpForAnswer(result, difficulty, alreadySolved) {
  const base = baseXp(difficulty)
  let xp = 0
  if (result === 'best') xp = base
  else if (result === 'partial') xp = base * PARTIAL_MULTIPLIER
  else xp = 0
  if (alreadySolved) xp = xp * REPEAT_MULTIPLIER
  return Math.round(xp)
}

// Total XP required to REACH a given level (level 1 = 0 XP).
// Level n needs LEVEL_BASE + LEVEL_STEP*(n-2) more than level n-1, so:
//   L2: 100   L3: 250   L4: 450   L5: 700   L6: 1000 ...
export function xpForLevel(level) {
  if (level <= 1) return 0
  const n = level - 1                        // number of level-ups
  return n * LEVEL_BASE + LEVEL_STEP * (n * (n - 1)) / 2
}

export function levelForXp(xp) {
  let level = 1
  while (xpForLevel(level + 1) <= xp) level++
  return level
}

// Everything the progress bar needs.
export function levelInfo(xp) {
  const safe = Math.max(0, Number(xp) || 0)
  const level = levelForXp(safe)
  const floor = xpForLevel(level)
  const next  = xpForLevel(level + 1)
  const span  = next - floor
  const into  = safe - floor
  return {
    level,
    xp: safe,
    levelFloor: floor,
    nextLevelXp: next,
    xpIntoLevel: into,
    xpToNext: next - safe,
    pct: span > 0 ? Math.min(100, Math.max(0, Math.round((into / span) * 100))) : 0,
  }
}

// ─── Badges ─────────────────────────────────────────────────────────────────
// A category badge is earned when >= BADGE_THRESHOLD of that category's
// playable scenarios have been solved (best answer chosen at least once).
export function categoryStats(progress, list = SCENARIOS) {
  const solved = progress?.solved || {}
  return CATEGORIES.map(c => {
    const total = list.filter(s => s.category === c.id).length
    const done  = list.filter(s => s.category === c.id && solved[s.id]).length
    const need  = Math.ceil(total * BADGE_THRESHOLD)
    return { ...c, total, solved: done, need, earned: total > 0 && done >= need }
  })
}

export function earnedBadges(progress, list = SCENARIOS) {
  return categoryStats(progress, list).filter(c => c.earned).map(c => c.id)
}

// ─── Progress record ────────────────────────────────────────────────────────
export function emptyProgress() {
  return {
    xp: 0,
    solved: {},        // { [scenarioId]: true } — best answer chosen at least once
    seen: {},          // { [scenarioId]: count } — times shown
    answers: {},       // { [scenarioId]: 'best'|'partial'|'bad' } — most recent result
    bestStreak: 0,
    totalAnswered: 0,
    totalBest: 0,
    sessions: 0,
    lastPlayed: null,
  }
}

// Apply one answer to a progress record. Returns { progress, xpEarned,
// streak, leveledUp, newBadges }. Does not mutate the input.
export function applyAnswer(progress, scenario, result, currentStreak) {
  const p = { ...emptyProgress(), ...progress,
    solved: { ...(progress?.solved || {}) },
    seen: { ...(progress?.seen || {}) },
    answers: { ...(progress?.answers || {}) },
  }
  const before = levelForXp(p.xp)
  const badgesBefore = new Set(earnedBadges(p))

  const alreadySolved = !!p.solved[scenario.id]
  const xpEarned = xpForAnswer(result, scenario.difficulty, alreadySolved)

  p.xp += xpEarned
  p.seen[scenario.id] = (p.seen[scenario.id] || 0) + 1
  p.answers[scenario.id] = result
  p.totalAnswered += 1
  if (result === 'best') { p.solved[scenario.id] = true; p.totalBest += 1 }

  const streak = result === 'best' ? (currentStreak || 0) + 1 : 0
  p.bestStreak = Math.max(p.bestStreak || 0, streak)
  p.lastPlayed = new Date().toISOString()

  const after = levelForXp(p.xp)
  const newBadges = earnedBadges(p).filter(id => !badgesBefore.has(id))

  return { progress: p, xpEarned, streak, leveledUp: after > before, newBadges }
}

// ─── Session building ───────────────────────────────────────────────────────
export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Pick a session's worth of scenarios. Unseen first, then least-seen, then
// unsolved before solved, shuffled within each tier. `categoryIds` = null or
// empty means all categories.
export function buildSession(progress, categoryIds, count = SESSION_LENGTH, list = playableScenarios()) {
  const cats = categoryIds && categoryIds.length ? new Set(categoryIds) : null
  const pool = list.filter(s => !cats || cats.has(s.category))
  const seen = progress?.seen || {}
  const solved = progress?.solved || {}
  const tiered = shuffle(pool).sort((a, b) => {
    const sa = seen[a.id] || 0, sb = seen[b.id] || 0
    if (sa !== sb) return sa - sb
    const va = solved[a.id] ? 1 : 0, vb = solved[b.id] ? 1 : 0
    return va - vb
  })
  return tiered.slice(0, Math.min(count, tiered.length)).map(s => ({
    ...s,
    options: shuffle(s.options),
  }))
}

// ─── Storage (the only place localStorage is touched) ───────────────────────
const KEY_PREFIX = 'ams_scenarios_'

export function storageKey(userName) {
  return KEY_PREFIX + String(userName || '').trim().toLowerCase()
}

export function loadProgress(userName) {
  try {
    const raw = localStorage.getItem(storageKey(userName))
    if (!raw) return emptyProgress()
    const parsed = JSON.parse(raw)
    return { ...emptyProgress(), ...parsed }
  } catch {
    return emptyProgress()
  }
}

export function saveProgress(userName, progress) {
  try {
    localStorage.setItem(storageKey(userName), JSON.stringify(progress))
    return true
  } catch {
    return false
  }
}

export function resetProgress(userName) {
  try { localStorage.removeItem(storageKey(userName)) } catch {}
  return emptyProgress()
}
