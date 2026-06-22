import { getProfile }                                          from '../lib/supabase.js'
import { getDailyChallenge, getTodayUTC, levelFromXp,
         xpForLevel, xpForNextLevel, getRank, RANK_TIERS,
         TITLE_MILESTONES, equipTitle }                        from '../lib/playerStats.js'

export default class ProfileScene extends Phaser.Scene {
  constructor() { super('ProfileScene') }

  create() {
    const W = this.scale.width, H = this.scale.height
    const user = this.registry.get('user')

    // ── Animated background (same palette as menu) ────────────────
    const bg = this.add.graphics()
    bg.fillGradientStyle(0x000008, 0x000008, 0x05000e, 0x08001a, 1)
    bg.fillRect(0, 0, W, H)
    bg.fillStyle(0x200040, 0.20); bg.fillCircle(W * 0.5, H * 0.5, 520)
    bg.fillStyle(0x150030, 0.18); bg.fillCircle(W * 0.1, H * 0.2, 280)
    bg.fillStyle(0x0d001f, 0.16); bg.fillCircle(W * 0.9, H * 0.8, 250)
    bg.fillStyle(0x4a1080, 0.09); bg.fillCircle(W * 0.5, H * 0.4, 340)
    for (let i = 0; i < 80; i++) {
      bg.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.05, 0.25))
      bg.fillRect(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H), 1, 1)
    }
    for (let i = 0; i < 20; i++) {
      bg.fillStyle(0xddd6fe, Phaser.Math.FloatBetween(0.14, 0.40))
      bg.fillRect(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H), 2, 2)
    }

    // Twinkling stars
    for (let i = 0; i < 7; i++) {
      const sx = Phaser.Math.Between(40, W - 40), sy = Phaser.Math.Between(40, H - 40)
      const sg = this.add.graphics()
      sg.fillStyle(0xddd6fe, 0.80); sg.fillRect(sx, sy, 2, 2)
      sg.fillStyle(0xddd6fe, 0.25); sg.fillRect(sx - 1, sy, 4, 2); sg.fillRect(sx, sy - 1, 2, 4)
      this.tweens.add({ targets: sg, alpha: 0.12, duration: 800 + Math.random() * 2000, yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: Math.random() * 1500 })
    }

    // Sci-fi frame + corner gems
    const frame = this.add.graphics()
    frame.lineStyle(1.5, 0x3d0080, 0.65); frame.strokeRect(14, 14, W - 28, H - 28)
    frame.lineStyle(1, 0x200050, 0.38);   frame.strokeRect(20, 20, W - 40, H - 40)
    const bL = 42
    frame.lineStyle(1.5, 0x6d28d9, 0.75)
    frame.lineBetween(14, bL+14, 14, 14); frame.lineBetween(14, 14, bL+14, 14)
    frame.lineBetween(W-14, bL+14, W-14, 14); frame.lineBetween(W-14, 14, W-bL-14, 14)
    frame.lineBetween(14, H-bL-14, 14, H-14); frame.lineBetween(14, H-14, bL+14, H-14)
    frame.lineBetween(W-14, H-bL-14, W-14, H-14); frame.lineBetween(W-14, H-14, W-bL-14, H-14)
    for (const [cx, cy] of [[14,14],[W-14,14],[14,H-14],[W-14,H-14]]) {
      const gg = this.add.graphics()
      gg.fillStyle(0x5b0fa0, 0.90); gg.fillCircle(cx, cy, 7)
      gg.fillStyle(0xc084fc, 0.70); gg.fillCircle(cx, cy, 4)
      this.tweens.add({ targets: gg, scaleX: 1.4, scaleY: 1.4, alpha: 0.5, duration: 1600 + Math.random() * 700, yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: Math.random() * 800 })
    }

    // Rising wisps
    const spawnWisp = () => {
      if (!this.scene.isActive('ProfileScene')) return
      const wx = Phaser.Math.Between(W * 0.05, W * 0.95)
      const col = [0x9b59b6, 0x7c3aed, 0xc084fc][Math.floor(Math.random() * 3)]
      const wsp = this.add.circle(wx, H + 4, Phaser.Math.Between(1, 4), col, Phaser.Math.FloatBetween(0.12, 0.36))
      this.tweens.add({ targets: wsp, y: Phaser.Math.Between(H * 0.2, H * 0.75), x: wx + Phaser.Math.FloatBetween(-30, 30), alpha: 0, duration: Phaser.Math.Between(2000, 4200), ease: 'Quad.Out', onComplete: () => wsp.destroy() })
      this.time.delayedCall(Phaser.Math.Between(350, 900), spawnWisp)
    }
    spawnWisp()

    // ── Back button ───────────────────────────────────────────────
    const backBtn = this.add.text(36, 24, '← BACK', {
      fontSize: '14px', fontFamily: 'monospace', color: '#9b59b6',
    }).setInteractive({ useHandCursor: true })
    backBtn.on('pointerover',  () => backBtn.setColor('#cc88ff'))
    backBtn.on('pointerout',   () => backBtn.setColor('#9b59b6'))
    backBtn.on('pointerdown',  () => this.scene.start('MenuScene'))
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('MenuScene'))

    // ── Title ─────────────────────────────────────────────────────
    this.add.text(W / 2, 22, 'PLAYER PROFILE', {
      fontSize: '28px', color: '#c084fc', fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#2d0060', strokeThickness: 3,
    }).setOrigin(0.5, 0)

    const divG = this.add.graphics()
    divG.lineStyle(1, 0x5a1090, 0.55)
    divG.lineBetween(W / 2 - 380, 62, W / 2 + 380, 62)
    divG.fillStyle(0x9b59b6, 0.9); divG.fillCircle(W / 2, 62, 4)

    if (!user || user.isGuest) {
      this.add.text(W / 2, H / 2, 'Sign in to view your profile', {
        fontSize: '20px', color: '#3a0070', fontFamily: 'monospace',
      }).setOrigin(0.5)
      return
    }

    this._user   = user
    this._titleY = 510  // y where title buttons start (will be set after render)
    this._draw(W, H, user)

    // Fetch fresh data in background — re-render if newer
    this._refreshFromServer(W, H)
  }

  _draw(W, H, user) {
    if (this._contentGroup) this._contentGroup.forEach(o => o.destroy())
    this._contentGroup = []
    const add = (obj) => { this._contentGroup.push(obj); return obj }

    const rank     = getRank(user.wins || 0)
    const rankIdx  = RANK_TIERS.findIndex(t => t.name === rank.name)
    const nextTier = RANK_TIERS[rankIdx + 1] || null
    const xp       = user.xp || 0
    const level    = user.level || 1
    const xpStart  = xpForLevel(level)
    const xpEnd    = xpForNextLevel(level)
    const xpRange  = xpEnd - xpStart
    const xpFill   = Math.min(1, (xp - xpStart) / xpRange)

    // ── Left column: identity ─────────────────────────────────────
    const LX = 60

    add(this.add.text(LX, 82, `● ${user.displayName}`, {
      fontSize: '28px', color: '#e2d9f3', fontFamily: 'monospace', fontStyle: 'bold',
    }))

    add(this.add.text(LX, 120, `LVL ${level}`, {
      fontSize: '18px', color: rank.color, fontFamily: 'monospace', fontStyle: 'bold',
    }))
    add(this.add.text(LX + 82, 120, `[${rank.name}]`, {
      fontSize: '18px', color: rank.color, fontFamily: 'monospace',
    }))
    if (user.equippedTitle) {
      add(this.add.text(LX + 82 + 118, 122, user.equippedTitle, {
        fontSize: '13px', color: '#ffd700', fontFamily: 'monospace',
      }))
    }

    // XP bar
    const barX = LX, barW = 420, barH = 14, barY = 148
    const barG  = add(this.add.graphics())
    barG.fillStyle(0x150030, 1);      barG.fillRoundedRect(barX, barY, barW, barH, 4)
    barG.fillStyle(rank.hex, 0.85);   barG.fillRoundedRect(barX, barY, 0, barH, 4)
    this.tweens.add({
      targets: {}, t: 0, duration: 1000, ease: 'Quad.Out',
      onUpdate: (tw) => {
        barG.clear()
        barG.fillStyle(0x150030, 1); barG.fillRoundedRect(barX, barY, barW, barH, 4)
        barG.fillStyle(rank.hex, 0.85); barG.fillRoundedRect(barX, barY, barW * xpFill * tw.progress, barH, 4)
      },
    })
    add(this.add.text(barX + barW + 10, barY, `${xp} / ${xpEnd} XP`, {
      fontSize: '11px', color: '#5a1090', fontFamily: 'monospace',
    }))
    const rankHint = nextTier
      ? `${nextTier.name} at ${nextTier.minWins} wins · ${Math.max(0, nextTier.minWins - (user.wins || 0))} to go`
      : 'MAX RANK'
    add(this.add.text(barX, barY + 18, rankHint, {
      fontSize: '11px', color: '#3a0070', fontFamily: 'monospace',
    }))

    // ── Stat cards ────────────────────────────────────────────────
    const cards = [
      { label: 'WINS',        value: user.wins   || 0, color: '#22c55e' },
      { label: 'LOSSES',      value: user.losses || 0, color: '#ef4444' },
      { label: 'BEST STREAK', value: user.bestStreak || 0, color: '#ffd700' },
    ]
    const cardW = 190, cardH = 78, cardGap = 18
    const cardStartX = LX
    const cardY      = 188
    cards.forEach(({ label, value, color }, i) => {
      const cx = cardStartX + i * (cardW + cardGap)
      const cg = add(this.add.graphics())
      cg.fillStyle(0x04000f, 0.70); cg.fillRoundedRect(cx, cardY, cardW, cardH, 8)
      cg.lineStyle(1, 0x2a0060, 0.55); cg.strokeRoundedRect(cx, cardY, cardW, cardH, 8)
      add(this.add.text(cx + 14, cardY + 10, label, {
        fontSize: '11px', color: '#3a0070', fontFamily: 'monospace', letterSpacing: 2,
      }))
      add(this.add.text(cx + 14, cardY + 30, String(value), {
        fontSize: '26px', color, fontFamily: 'monospace', fontStyle: 'bold',
      }))
    })

    // Current streak
    const streakY = 280
    const sc = (user.winStreak || 0)
    const streakColor = sc >= 5 ? '#ffd700' : sc >= 3 ? '#f97316' : '#9b59b6'
    if (sc > 0) {
      add(this.add.text(LX, streakY, `CURRENT STREAK`, {
        fontSize: '12px', color: '#3a0070', fontFamily: 'monospace', letterSpacing: 2,
      }))
      const scTxt = add(this.add.text(LX + 162, streakY, `▲ ${sc}`, {
        fontSize: '14px', color: streakColor, fontFamily: 'monospace', fontStyle: 'bold',
      }))
      this.tweens.add({ targets: scTxt, alpha: 0.4, duration: 550, yoyo: true, repeat: -1, ease: 'Sine.InOut' })
    } else {
      add(this.add.text(LX, streakY, 'No active streak', {
        fontSize: '12px', color: '#2a0050', fontFamily: 'monospace',
      }))
    }

    // ── Divider ────────────────────────────────────────────────────
    const div1 = add(this.add.graphics())
    div1.lineStyle(1, 0x2a0060, 0.40); div1.lineBetween(LX, 308, W - LX, 308)

    // ── Daily challenge ────────────────────────────────────────────
    add(this.add.text(LX, 320, 'DAILY CHALLENGE', {
      fontSize: '12px', color: '#5a1090', fontFamily: 'monospace', letterSpacing: 3, fontStyle: 'bold',
    }))

    const ch      = getDailyChallenge(user.id)
    const today   = getTodayUTC()
    const isToday = (user.dailyDate || '') === today
    const dprog   = isToday ? (user.dailyProgress || 0) : 0
    const ddone   = isToday && (user.dailyDone || false)
    const dpct    = Math.min(1, dprog / ch.target)
    const dcolor  = ddone ? '#22c55e' : '#9b59b6'

    add(this.add.text(LX, 344, ch.desc, {
      fontSize: '16px', color: dcolor, fontFamily: 'monospace', fontStyle: 'bold',
    }))

    const dbarX = LX, dbarW = 240, dbarH = 10, dbarY = 368
    const dbarG = add(this.add.graphics())
    dbarG.fillStyle(0x150030, 1); dbarG.fillRoundedRect(dbarX, dbarY, dbarW, dbarH, 4)
    dbarG.fillStyle(ddone ? 0x22c55e : 0x7c3aed, 0.85); dbarG.fillRoundedRect(dbarX, dbarY, dbarW * dpct, dbarH, 4)

    const dStatusStr = ddone ? '✓ COMPLETE' : `${Math.min(dprog, ch.target)} / ${ch.target}`
    add(this.add.text(dbarX + dbarW + 14, dbarY - 1, dStatusStr, {
      fontSize: '13px', color: ddone ? '#22c55e' : '#5a1090', fontFamily: 'monospace', fontStyle: 'bold',
    }))
    add(this.add.text(LX, dbarY + 16, ddone ? 'Bonus already claimed · resets at midnight UTC' : '+200 XP bonus on completion · resets at midnight UTC', {
      fontSize: '11px', color: '#2a0050', fontFamily: 'monospace',
    }))

    // ── Divider ────────────────────────────────────────────────────
    const div2 = add(this.add.graphics())
    div2.lineStyle(1, 0x2a0060, 0.40); div2.lineBetween(LX, 406, W - LX, 406)

    // ── Titles ────────────────────────────────────────────────────
    add(this.add.text(LX, 418, 'YOUR TITLES', {
      fontSize: '12px', color: '#5a1090', fontFamily: 'monospace', letterSpacing: 3, fontStyle: 'bold',
    }))
    add(this.add.text(LX + 168, 420, 'click to equip', {
      fontSize: '10px', color: '#2a0050', fontFamily: 'monospace',
    }))

    const unlocked = user.unlockedTitles || []
    if (unlocked.length === 0) {
      add(this.add.text(LX, 444, 'No titles yet — reach a 3-win streak to unlock STREAK HUNTER', {
        fontSize: '12px', color: '#2a0050', fontFamily: 'monospace',
      }))
    } else {
      this._renderTitleButtons(LX, 442, unlocked, user, W, add)
    }

    // Locked titles hint
    const locked = TITLE_MILESTONES.filter(m => !unlocked.includes(m.title))
    if (locked.length > 0) {
      const lockStr = 'LOCKED:  ' + locked.map(m => `${m.title} (↑${m.streak})`).join('   ')
      add(this.add.text(LX, H - 56, lockStr, {
        fontSize: '11px', color: '#2a0040', fontFamily: 'monospace',
      }))
    }
  }

  _renderTitleButtons(startX, startY, titles, user, W, add) {
    const btnPadX = 18, btnPadY = 8, gap = 10
    let cx = startX, cy = startY

    titles.forEach(title => {
      const isEq    = title === (user.equippedTitle || null)
      const textW   = title.length * 9 + btnPadX * 2
      const btnH    = 32

      if (cx + textW > W - 60) { cx = startX; cy += btnH + gap + 6 }

      const btnG = add(this.add.graphics())
      const draw = (hover) => {
        btnG.clear()
        btnG.fillStyle(isEq ? 0x2a0060 : (hover ? 0x100030 : 0x08001a), 1)
        btnG.fillRoundedRect(cx, cy, textW, btnH, 6)
        btnG.lineStyle(isEq ? 2 : 1, isEq ? 0x9b59b6 : (hover ? 0x5a1090 : 0x2a0060), 1)
        btnG.strokeRoundedRect(cx, cy, textW, btnH, 6)
      }
      draw(false)

      const col  = isEq ? '#ffd700' : '#6a3090'
      const lbl  = isEq ? `▶ ${title}` : title
      const txt  = add(this.add.text(cx + btnPadX, cy + btnPadY, lbl, {
        fontSize: '13px', color: col, fontFamily: 'monospace', fontStyle: isEq ? 'bold' : 'normal',
      }).setInteractive({ useHandCursor: true }))

      txt.on('pointerover',  () => draw(true))
      txt.on('pointerout',   () => draw(false))
      txt.on('pointerdown',  () => this._doEquip(title, W))

      cx += textW + gap
    })
  }

  async _doEquip(title, W) {
    const user = this._user
    if (!user || user.isGuest) return
    user.equippedTitle = title
    this.registry.set('user', user)
    await equipTitle(user.id, title).catch(() => {})
    this._draw(W, this.scale.height, user)
  }

  async _refreshFromServer(W, H) {
    const user = this._user
    if (!user?.id) return
    const profile = await getProfile(user.id).catch(() => null)
    if (!profile) return
    const fresh = {
      ...user,
      wins:          profile.wins          ?? user.wins,
      losses:        profile.losses        ?? user.losses,
      xp:            profile.xp            ?? user.xp,
      level:         profile.level         ?? user.level,
      winStreak:     profile.win_streak    ?? user.winStreak,
      bestStreak:    profile.best_streak   ?? user.bestStreak,
      equippedTitle: profile.equipped_title ?? user.equippedTitle,
      unlockedTitles: profile.unlocked_titles ?? user.unlockedTitles,
      dailyDate:     profile.daily_date    ?? user.dailyDate,
      dailyProgress: profile.daily_progress ?? user.dailyProgress,
      dailyDone:     profile.daily_done    ?? user.dailyDone,
    }
    this._user = fresh
    this.registry.set('user', fresh)
    this._draw(W, H, fresh)
  }
}
