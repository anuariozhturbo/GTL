import { unlockCharacter } from '../lib/supabase.js'
import { reportMatchResult, getDailyChallenge, levelFromXp, xpForLevel, xpForNextLevel, getRank, RANK_TIERS } from '../lib/playerStats.js'

const BOSS_UNLOCK_CHARS = ['trackstar', 'kendi']

export default class ResultScene extends Phaser.Scene {
  constructor() { super('ResultScene') }

  init(data) {
    this.winner      = data.winner
    this.mode        = data.mode
    this.p1Key       = data.p1
    this.p2Key       = data.p2
    this.p1Wins      = data.p1Wins
    this.p2Wins      = data.p2Wins
    this.userId      = data.userId      || null
    this.localWon    = data.localWon    ?? false
    this.damageDealt = data.damageDealt || 0
  }

  create() {
    const W = this.scale.width, H = this.scale.height
    const user = this.registry.get('user')

    // ── Background ────────────────────────────────────────────────
    const bg = this.add.graphics()
    bg.fillGradientStyle(0x050010, 0x050010, 0x150035, 0x150035, 1)
    bg.fillRect(0, 0, W, H)
    bg.fillStyle(0x4a1080, 0.08); bg.fillCircle(W / 2, H / 2, 500)
    for (let i = 0; i < 60; i++) {
      bg.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.06, 0.30))
      bg.fillRect(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H), 1, 1)
    }

    // ── Winner announcement ───────────────────────────────────────
    const p1Name = (user && !user.isGuest) ? user.displayName : 'PLAYER 1'
    const p2Name = 'PLAYER 2'
    const winnerName = this.winner === 1 ? p1Name : this.winner === 2 ? p2Name : null
    const winText    = this.winner === 0 ? 'DRAW!' : `${winnerName} WINS!`

    const titleGlow = this.add.text(W / 2, 148, winText, {
      fontSize: '68px', color: '#7c3aed', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0.35)
    const titleTxt = this.add.text(W / 2, 148, winText, {
      fontSize: '68px', color: '#ffdd00', fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5)
    this.tweens.add({ targets: titleGlow, alpha: 0.18, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' })

    this.add.text(W / 2, 232, `${this.p1Key.toUpperCase()}  vs  ${this.p2Key.toUpperCase()}`, {
      fontSize: '26px', color: '#aaaaaa', fontFamily: 'monospace',
    }).setOrigin(0.5)

    this.add.text(W / 2, 286, `${this.p1Wins} — ${this.p2Wins}`, {
      fontSize: '44px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5)

    // ── Stats panel (loaded async) ────────────────────────────────
    if (this.mode === 'boss' && this.localWon) {
      this._unlockBossReward(W, H, user)
    }

    if (this.userId) {
      this._statusTxt = this.add.text(W / 2, 360, 'CALCULATING...', {
        fontSize: '14px', color: '#5a1090', fontFamily: 'monospace', letterSpacing: 3,
      }).setOrigin(0.5)
      this.time.delayedCall(900, () => this._loadStats(W, H, user))
    } else {
      this._addButtons(W, H, 420)
    }
  }

  async _unlockBossReward(W, H, user) {
    const currentUnlocks = user?.unlockedChars || []
    const missingUnlocks = BOSS_UNLOCK_CHARS.filter(char => !currentUnlocks.includes(char))
    const alreadyUnlocked = missingUnlocks.length === 0
    const randomUnlock = alreadyUnlocked
      ? null
      : Phaser.Utils.Array.GetRandom(missingUnlocks)
    const label = !user || user.isGuest
      ? 'SIGN IN TO CLAIM MYSTERY DROP'
      : alreadyUnlocked
        ? 'BOSS CHARACTERS ALREADY UNLOCKED'
        : `MYSTERY DROP: ${randomUnlock.toUpperCase()}`
    const message = this.add.text(W / 2, H - 130, label, {
      fontSize: '24px', color: '#facc15', fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(20)
    this.tweens.add({ targets: message, alpha: 0.45, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.InOut' })

    if (!user || user.isGuest || !user.id || alreadyUnlocked) return

    await unlockCharacter(user.id, randomUnlock).catch(() => null)
    const unlockedChars = [...new Set([...currentUnlocks, randomUnlock])]
    this.registry.set('user', { ...user, unlockedChars })
  }

  async _loadStats(W, H, user) {
    const stats = await reportMatchResult({
      userId:      this.userId,
      won:         this.localWon,
      damageDealt: this.damageDealt,
    }).catch(() => null)

    this._statusTxt?.destroy()

    if (!stats) {
      this._addButtons(W, H, 420)
      return
    }

    // Update registry so MenuScene shows fresh numbers
    if (user) {
      const currentUser = this.registry.get('user') || user
      this.registry.set('user', {
        ...currentUser,
        wins:          stats.totalWins,
        losses:        stats.totalLosses,
        xp:            stats.newXp,
        level:         stats.newLevel,
        winStreak:     stats.newStreak,
        bestStreak:    stats.bestStreak,
        equippedTitle: stats.equippedTitle,
        unlockedTitles: stats.unlockedTitles,
        unlockedChars: currentUser.unlockedChars || [],
      })
    }

    const panelY = 330
    this._drawStatsPanel(W, H, panelY, stats)
    this._addButtons(W, H, panelY + 235)
  }

  _drawStatsPanel(W, H, panelY, stats) {
    // Frosted panel
    const panel = this.add.graphics()
    panel.fillStyle(0x04000f, 0.72)
    panel.fillRoundedRect(W / 2 - 320, panelY, 640, 220, 10)
    panel.lineStyle(1, 0x3d0070, 0.55)
    panel.strokeRoundedRect(W / 2 - 320, panelY, 640, 220, 10)

    const col1 = W / 2 - 260  // left column
    const col2 = W / 2 + 60   // right column
    let   row  = panelY + 22

    // ── XP bar ───────────────────────────────────────────────────
    const xpStart  = xpForLevel(stats.prevLevel)
    const xpEnd    = xpForNextLevel(stats.prevLevel)
    const xpRange  = xpEnd - xpStart
    const prevFill = Math.min(1, (stats.prevXp - xpStart) / xpRange)
    const newFill  = Math.min(1, (stats.newXp  - xpStart) / xpRange)

    const rank = stats.rank
    this.add.text(col1, row, `LVL ${stats.prevLevel}`, {
      fontSize: '13px', color: rank.color, fontFamily: 'monospace', fontStyle: 'bold',
    })
    this.add.text(col1 + 72, row, `[${rank.name}]`, {
      fontSize: '13px', color: rank.color, fontFamily: 'monospace',
    })
    if (stats.leveledUp) {
      const lvlUpTxt = this.add.text(col1 + 160, row, `→ LVL ${stats.newLevel}!`, {
        fontSize: '13px', color: '#ffd700', fontFamily: 'monospace', fontStyle: 'bold',
      })
      this.tweens.add({ targets: lvlUpTxt, alpha: 0.4, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.InOut' })
    }
    row += 22

    const barX = col1, barW = 530, barH = 12
    const barBg = this.add.graphics()
    barBg.fillStyle(0x150030, 1); barBg.fillRoundedRect(barX, row, barW, barH, 4)
    barBg.fillStyle(0x3d0070, 0.5); barBg.fillRoundedRect(barX, row, barW * prevFill, barH, 4)

    const barFill = this.add.graphics()
    barFill.fillStyle(rank.hex, 0.9)
    barFill.fillRoundedRect(barX, row, barW * prevFill, barH, 4)

    const xpLabelR = this.add.text(barX + barW + 8, row - 1, `${stats.newXp} XP`, {
      fontSize: '11px', color: '#5a1090', fontFamily: 'monospace',
    })

    // Animate bar filling
    const target = barW * newFill
    const from   = barW * prevFill
    this.tweens.add({
      targets: {},
      t: 0, duration: 1100, ease: 'Quad.Out',
      onUpdate: (tw) => {
        const w = from + (target - from) * tw.progress
        barFill.clear()
        barFill.fillStyle(rank.hex, 0.9)
        barFill.fillRoundedRect(barX, row, Math.max(0, w), barH, 4)
      },
      onComplete: () => {
        xpLabelR.setColor('#c084fc')
      },
    })
    row += 22

    // XP gained breakdown
    let xpLine = `+${stats.xpGained} XP`
    if (stats.streakBonus > 0) xpLine += `  (streak +${stats.streakBonus})`
    if (stats.dailyBonusAwarded) xpLine += `  (daily +200)`
    this.add.text(col1, row, xpLine, {
      fontSize: '12px', color: '#7c3aed', fontFamily: 'monospace',
    })
    row += 26

    // ── Win streak ───────────────────────────────────────────────
    const streakColor = stats.newStreak >= 5 ? '#ffd700' : stats.newStreak >= 3 ? '#f97316' : '#c084fc'
    if (stats.newStreak > 0) {
      this.add.text(col1, row, `WIN STREAK`, { fontSize: '12px', color: '#5a1090', fontFamily: 'monospace' })
      const streakVal = this.add.text(col1 + 106, row, `${stats.newStreak}`, {
        fontSize: '14px', color: streakColor, fontFamily: 'monospace', fontStyle: 'bold',
      })
      this.tweens.add({ targets: streakVal, alpha: 0.5, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.InOut' })
      if (stats.bestStreak > 0 && stats.newStreak >= stats.bestStreak) {
        this.add.text(col1 + 148, row, `(BEST!)`, { fontSize: '11px', color: '#ffd700', fontFamily: 'monospace' })
      }
    } else {
      this.add.text(col1, row, `STREAK RESET`, { fontSize: '12px', color: '#444', fontFamily: 'monospace' })
    }
    row += 24

    // ── Daily challenge ──────────────────────────────────────────
    const ch       = stats.challenge
    const dpFill   = Math.min(1, stats.dailyProgress / ch.target)
    const doneColor = stats.dailyDone ? '#22c55e' : '#5a1090'
    this.add.text(col1, row, `DAILY: ${ch.desc}`, { fontSize: '12px', color: doneColor, fontFamily: 'monospace' })
    const chStatus = stats.dailyDone
      ? (stats.dailyBonusAwarded ? ' ✓ +200 XP' : ' ✓ DONE')
      : `  ${Math.min(stats.dailyProgress, ch.target)}/${ch.target}`
    this.add.text(col1 + 340, row, chStatus, {
      fontSize: '12px', color: stats.dailyBonusAwarded ? '#22c55e' : '#7c3aed', fontFamily: 'monospace', fontStyle: 'bold',
    })
    row += 22

    // Mini progress bar for daily
    const dBarBg = this.add.graphics()
    dBarBg.fillStyle(0x150030, 1); dBarBg.fillRoundedRect(col1, row, 200, 6, 2)
    dBarBg.fillStyle(stats.dailyDone ? 0x22c55e : 0x7c3aed, 0.75)
    dBarBg.fillRoundedRect(col1, row, 200 * dpFill, 6, 2)
    row += 16

    // ── New title unlocked? ──────────────────────────────────────
    if (stats.newTitlesUnlocked && stats.newTitlesUnlocked.length > 0) {
      row += 6
      const titleStr = stats.newTitlesUnlocked[0]
      const unlockGlow = this.add.text(W / 2, row + 2, `TITLE UNLOCKED: ${titleStr}`, {
        fontSize: '16px', color: '#ffd700', fontFamily: 'monospace',
      }).setOrigin(0.5).setAlpha(0)
      this.tweens.add({ targets: unlockGlow, alpha: 1, duration: 600, ease: 'Cubic.Out' })
      this.tweens.add({
        targets: unlockGlow, scaleX: 1.06, scaleY: 1.06,
        duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: 600,
      })
    }
  }

  _addButtons(W, H, y) {
    const btnY = Math.min(y, H - 80)
    this.makeBtn(W / 2 - 160, btnY, 'REMATCH', () => {
      this.scene.start('FightScene', { mode: this.mode, p1: this.p1Key, p2: this.p2Key })
    })
    this.makeBtn(W / 2 + 160, btnY, 'MENU', () => {
      this.scene.start('MenuScene')
    })
  }

  makeBtn(x, y, label, cb) {
    const btn = this.add.text(x, y, label, {
      fontSize: '26px', color: '#ffffff', fontFamily: 'monospace',
      backgroundColor: '#2d0060', padding: { x: 28, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    btn.on('pointerover',  () => btn.setColor('#ffdd00').setScale(1.05))
    btn.on('pointerout',   () => btn.setColor('#ffffff').setScale(1))
    btn.on('pointerdown',  cb)
  }
}
