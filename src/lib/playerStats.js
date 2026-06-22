import { supabase } from './supabase.js'

// ── XP / Level ────────────────────────────────────────────────────────────────
export function levelFromXp(xp) {
  return Math.floor(Math.sqrt((xp || 0) / 150)) + 1
}
export function xpForLevel(level) {
  return (level - 1) * (level - 1) * 150
}
export function xpForNextLevel(level) {
  return level * level * 150
}

// ── Rank tiers (by total wins) ────────────────────────────────────────────────
export const RANK_TIERS = [
  { name: 'BRONZE',  minWins: 0,  color: '#cd7f32', hex: 0xcd7f32 },
  { name: 'SILVER',  minWins: 10, color: '#c0c0c0', hex: 0xc0c0c0 },
  { name: 'GOLD',    minWins: 30, color: '#ffd700', hex: 0xffd700 },
  { name: 'DIAMOND', minWins: 75, color: '#b9f2ff', hex: 0xb9f2ff },
]

export function getRank(totalWins) {
  let rank = RANK_TIERS[0]
  for (const tier of RANK_TIERS) {
    if ((totalWins || 0) >= tier.minWins) rank = tier
  }
  return rank
}

// ── Titles (unlocked permanently when best_streak milestone is reached) ────────
export const TITLE_MILESTONES = [
  { streak: 3,  title: 'STREAK HUNTER' },
  { streak: 5,  title: 'DOMINATOR'     },
  { streak: 10, title: 'WARRIOR'        },
  { streak: 15, title: 'DESTROYER'      },
  { streak: 20, title: 'CHAMPION'       },
  { streak: 25, title: 'UNSTOPPABLE'    },
]

// ── Daily challenge pool ──────────────────────────────────────────────────────
const CHALLENGE_POOL = [
  { type: 'wins',   target: 2,    desc: 'WIN 2 FIGHTS'       },
  { type: 'wins',   target: 3,    desc: 'WIN 3 FIGHTS'       },
  { type: 'wins',   target: 4,    desc: 'WIN 4 FIGHTS'       },
  { type: 'wins',   target: 5,    desc: 'WIN 5 FIGHTS'       },
  { type: 'damage', target: 600,  desc: 'DEAL 600 DAMAGE'    },
  { type: 'damage', target: 900,  desc: 'DEAL 900 DAMAGE'    },
  { type: 'damage', target: 1200, desc: 'DEAL 1200 DAMAGE'   },
  { type: 'damage', target: 1500, desc: 'DEAL 1500 DAMAGE'   },
]

export function getTodayUTC() {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

export function getDailyChallenge(userId) {
  const seed = [...(userId + getTodayUTC())].reduce((a, c) => a + c.charCodeAt(0), 0)
  return CHALLENGE_POOL[seed % CHALLENGE_POOL.length]
}

// ── Main stat reporter — called from ResultScene ──────────────────────────────
export async function reportMatchResult({ userId, won, damageDealt }) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('xp, level, wins, losses, win_streak, best_streak, daily_date, daily_progress, daily_done, unlocked_titles, equipped_title')
    .eq('id', userId)
    .single()

  if (error || !profile) return null

  const today     = getTodayUTC()
  const challenge = getDailyChallenge(userId)

  // Win streak
  const newStreak  = won ? (profile.win_streak || 0) + 1 : 0
  const bestStreak = Math.max(profile.best_streak || 0, newStreak)
  const streakBonus = won ? newStreak * 8 : 0

  // Base XP
  let xpGained = (won ? 100 : 20) + streakBonus

  // Daily challenge
  const isNewDay  = profile.daily_date !== today
  let   dpCurrent = isNewDay ? 0 : (profile.daily_progress || 0)
  let   dailyDone = isNewDay ? false : (profile.daily_done  || false)
  let   dailyBonusAwarded = false

  if (!dailyDone) {
    if (challenge.type === 'wins'   && won)    dpCurrent += 1
    if (challenge.type === 'damage')           dpCurrent += Math.round(damageDealt || 0)
    if (dpCurrent >= challenge.target) {
      dailyDone           = true
      dailyBonusAwarded   = true
      xpGained           += 200
    }
  }

  // Titles: permanently unlocked when best_streak milestone hit
  const unlockedTitles    = [...(profile.unlocked_titles || [])]
  const newTitlesUnlocked = []
  for (const m of TITLE_MILESTONES) {
    if (bestStreak >= m.streak && !unlockedTitles.includes(m.title)) {
      unlockedTitles.push(m.title)
      newTitlesUnlocked.push(m.title)
    }
  }

  const prevXp    = profile.xp || 0
  const newXp     = prevXp + xpGained
  const prevLevel = levelFromXp(prevXp)
  const newLevel  = levelFromXp(newXp)
  const leveledUp = newLevel > prevLevel

  const totalWins   = (profile.wins   || 0) + (won ? 1 : 0)
  const totalLosses = (profile.losses || 0) + (won ? 0 : 1)

  await supabase.from('profiles').update({
    xp:              newXp,
    level:           newLevel,
    wins:            totalWins,
    losses:          totalLosses,
    win_streak:      newStreak,
    best_streak:     bestStreak,
    daily_date:      today,
    daily_progress:  dpCurrent,
    daily_done:      dailyDone,
    unlocked_titles: unlockedTitles,
  }).eq('id', userId)

  return {
    xpGained,
    streakBonus,
    prevXp,
    newXp,
    prevLevel,
    newLevel,
    leveledUp,
    newStreak,
    bestStreak,
    dailyBonusAwarded,
    dailyProgress: dpCurrent,
    challenge,
    newTitlesUnlocked,
    totalWins,
    totalLosses,
    rank: getRank(totalWins),
    unlockedTitles,
    equippedTitle: profile.equipped_title || null,
  }
}

// ── Equip a title the player has unlocked ─────────────────────────────────────
export async function equipTitle(userId, title) {
  await supabase.from('profiles').update({ equipped_title: title }).eq('id', userId)
}
