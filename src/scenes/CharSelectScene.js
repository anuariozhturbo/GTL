const CHARACTERS = [
  {
    key: 'ash', name: 'ASH', color: 0x9b59b6, hex: '#9b59b6',
    desc: 'Aerial fighter. Jumps higher, hits harder from above.',
    weapons: 'Sledgehammer · Wings · Explosions',
    special: 'Remote Explosion (60s CD)',
    unique: 'Aerial hits deal 1.5× damage + bounce',
    stats: { hp: 200, spd: 4, pwr: 7 },
  },
  {
    key: 'merrs', name: 'MERRS', color: 0x3b82f6, hex: '#3b82f6',
    desc: 'Fastest fighter. Bow hit grants rapid attack bursts.',
    weapons: 'Sword · Bow · Fishing Rod',
    special: 'Hook Pull + Stun (20s CD)',
    unique: 'Bow hit unlocks 20s rapid-attack mode',
    stats: { hp: 200, spd: 5, pwr: 5 },
  },
  {
    key: 'dice', name: 'DICE', color: 0xf59e0b, hex: '#f59e0b',
    desc: 'Trap specialist. Place TNT, detonate for double damage.',
    weapons: 'Crossbow · TNT · Special Bolt',
    special: 'Shoot TNT → 2× explosion (20s CD)',
    unique: 'TNT = 23% max HP · Bolt burn = 10%',
    stats: { hp: 200, spd: 4, pwr: 6 },
  },
  {
    key: 'thragg', name: 'THRAGG', color: 0xef4444, hex: '#ef4444',
    desc: 'Heavy brawler. Every 3rd hit stuns the target.',
    weapons: 'Axe · Net · Spear Dash',
    special: 'Net Throw — 5s stun (20s CD)',
    unique: 'Every 3rd normal attack: 0.5s stun',
    stats: { hp: 200, spd: 3, pwr: 9 },
  },
  {
    key: 'lohe', name: 'LOHE', color: 0xfde047, hex: '#fde047',
    desc: 'Golden warrior. Every 7th hit launches the enemy across the stage.',
    weapons: 'Sword · Spear',
    special: 'Golden Lunge — 23% max HP (14s CD)',
    unique: '7th hit = massive knockback · Special grants 11s attack boost',
    stats: { hp: 210, spd: 4, pwr: 8 },
    registeredOnly: true,
  },
  {
    key: 'trackstar', name: 'TRACKSTAR', color: 0xfacc15, hex: '#facc15',
    desc: 'Max-speed fist fighter. Every clean hit makes his attacks faster.',
    weapons: 'Fists - Yellow Zip Hoodie',
    special: 'Full-Speed Dash - 10% max HP, resets on hit',
    unique: 'Each landed hit: attack speed +2 - Miss resets the boost',
    stats: { hp: 190, spd: 5, pwr: 5 },
    unlockChar: 'trackstar',
    unlockText: 'MYSTERY OVERCLOCK DROP',
  },
  {
    key: 'kendi', name: 'KENDI', color: 0x38bdf8, hex: '#38bdf8',
    desc: 'Blue-flame fighter. Double-tap jump to fly upward with flame lift.',
    weapons: 'Blue Flame - Fire Arrow',
    special: 'Homing Fire Arrow - 19% max HP',
    unique: 'Double-tap W/Up to fly with blue flames',
    stats: { hp: 195, spd: 4, pwr: 7 },
    unlockChar: 'kendi',
    unlockText: 'MYSTERY OVERCLOCK DROP',
  },
  {
    key: 'ryu', name: 'RYU', color: 0x22c55e, hex: '#22c55e',
    desc: 'Destruction fighter. Double-tap down to spike the enemy from below.',
    weapons: 'Green Destruction - Chaos Energy',
    special: 'Chaos Energy - 17% max HP, new shape every throw',
    unique: 'Double-tap S/Down: green spikes under opponent',
    stats: { hp: 210, spd: 4, pwr: 7 },
    unlockChar: 'ryu',
    unlockText: 'MYSTERY OVERCLOCK DROP',
  },
]

const STAT_MAX = { hp: 200, spd: 5, pwr: 9 }

export default class CharSelectScene extends Phaser.Scene {
  constructor() { super('CharSelectScene') }

  init(data) {
    this.mode       = data.mode || 'pvp'
    this.p1Choice   = null
    this.p2Choice   = null
    this.p1Index    = -1
    this.p2Index    = -1
    this.difficulty = 'medium'
    this.pickTarget = 1
  }

  create() {
    const W = this.scale.width, H = this.scale.height
    this._user = this.registry.get('user')

    // Disable right-click context menu so P2 can select with right click
    this.input.mouse.disableContextMenu()

    // ── Background ───────────────────────────────────────────────────
    const bg = this.add.graphics()
    bg.fillGradientStyle(0x000008, 0x000008, 0x05000e, 0x08001a, 1)
    bg.fillRect(0, 0, W, H)

    // Deep nebula layers
    bg.fillStyle(0x200040, 0.20); bg.fillCircle(W * 0.50, H * 0.50, 520)
    bg.fillStyle(0x150030, 0.22); bg.fillCircle(W * 0.10, H * 0.22, 300)
    bg.fillStyle(0x0d001f, 0.20); bg.fillCircle(W * 0.90, H * 0.80, 260)
    bg.fillStyle(0x4a1080, 0.11); bg.fillCircle(W * 0.50, H * 0.40, 340)
    bg.fillStyle(0x6b21a8, 0.07); bg.fillCircle(W * 0.50, H * 0.38, 210)
    bg.fillStyle(0x3b0f6e, 0.09); bg.fillCircle(W * 0.85, H * 0.14, 190)
    bg.fillStyle(0x1d4ed8, 0.04); bg.fillCircle(W * 0.15, H * 0.88, 230)

    // LAYER 1 – Tiny dim stars
    for (let i = 0; i < 110; i++) {
      bg.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.06, 0.28))
      bg.fillRect(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H), 1, 1)
    }
    // LAYER 2 – Medium stars
    for (let i = 0; i < 32; i++) {
      bg.fillStyle(0xddd6fe, Phaser.Math.FloatBetween(0.18, 0.48))
      bg.fillRect(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H), 2, 2)
    }

    // LAYER 3 – Twinkling animated stars
    for (let i = 0; i < 9; i++) {
      const sx  = Phaser.Math.Between(40, W - 40)
      const sy  = Phaser.Math.Between(40, H - 40)
      const col = [0xffffff, 0xddd6fe, 0xc4b5fd][i % 3]
      const sg  = this.add.graphics()
      sg.fillStyle(col, 0.85); sg.fillRect(sx, sy, 2, 2)
      sg.fillStyle(col, 0.28); sg.fillRect(sx - 1, sy, 4, 2); sg.fillRect(sx, sy - 1, 2, 4)
      this.tweens.add({
        targets: sg, alpha: 0.12,
        duration: 700 + Math.random() * 2200,
        yoyo: true, repeat: -1, ease: 'Sine.InOut',
        delay: Math.random() * 1600,
      })
    }

    // LAYER 4 – Floating energy orbs (kept near screen edges so cards are clear)
    const orbPalette = [0x9b59b6, 0x7c3aed, 0xc084fc, 0x22d3ee, 0xa855f7, 0xe879f9]
    for (let i = 0; i < 8; i++) {
      const side = i % 2
      const ox   = side === 0 ? Phaser.Math.Between(12, 140) : Phaser.Math.Between(W - 140, W - 12)
      const oy   = Phaser.Math.Between(60, H - 60)
      const r    = Phaser.Math.Between(2, 7)
      const orb  = this.add.circle(ox, oy, r, orbPalette[i % orbPalette.length],
        Phaser.Math.FloatBetween(0.10, 0.28))
      this.tweens.add({
        targets: orb,
        x:       ox + Phaser.Math.FloatBetween(-70, 70),
        y:       oy + Phaser.Math.FloatBetween(-55, 55),
        alpha: { from: Phaser.Math.FloatBetween(0.05, 0.14), to: Phaser.Math.FloatBetween(0.22, 0.45) },
        duration: 3200 + Math.random() * 4400,
        yoyo: true, repeat: -1, ease: 'Sine.InOut',
        delay: Math.random() * 2800,
      })
    }

    // LAYER 5 – Rising energy wisps
    const spawnCharWisp = () => {
      if (!this.scene.isActive('CharSelectScene')) return
      const wx  = Phaser.Math.Between(W * 0.03, W * 0.97)
      const col = [0x9b59b6, 0x7c3aed, 0xc084fc][Math.floor(Math.random() * 3)]
      const wsp = this.add.circle(wx, H + 5, Phaser.Math.Between(1, 4), col,
        Phaser.Math.FloatBetween(0.12, 0.38))
      this.tweens.add({
        targets: wsp,
        y:     Phaser.Math.Between(H * 0.2, H * 0.7),
        x:     wx + Phaser.Math.FloatBetween(-35, 35),
        alpha: 0,
        duration: Phaser.Math.Between(1900, 4000),
        ease:    'Quad.Out',
        onComplete: () => wsp.destroy(),
      })
      this.time.delayedCall(Phaser.Math.Between(380, 950), spawnCharWisp)
    }
    spawnCharWisp()

    // LAYER 6 – Sci-fi border frame
    const frame = this.add.graphics()
    frame.lineStyle(1.5, 0x3d0080, 0.65)
    frame.strokeRect(14, 14, W - 28, H - 28)
    frame.lineStyle(1, 0x200050, 0.40)
    frame.strokeRect(20, 20, W - 40, H - 40)
    frame.lineStyle(1, 0x4a1080, 0.38)
    for (let x = 100; x < W - 80; x += 72) {
      frame.lineBetween(x, 14, x, 22); frame.lineBetween(x, H - 14, x, H - 22)
    }
    for (let y = 80; y < H - 60; y += 58) {
      frame.lineBetween(14, y, 22, y); frame.lineBetween(W - 14, y, W - 22, y)
    }
    frame.lineStyle(1.5, 0x6d28d9, 0.78)
    const bL = 42
    frame.lineBetween(14, bL + 14, 14, 14); frame.lineBetween(14, 14, bL + 14, 14); frame.lineBetween(18, bL + 10, bL + 10, 18)
    frame.lineBetween(W-14, bL+14, W-14, 14); frame.lineBetween(W-14, 14, W-bL-14, 14); frame.lineBetween(W-18, bL+10, W-bL-10, 18)
    frame.lineBetween(14, H-bL-14, 14, H-14); frame.lineBetween(14, H-14, bL+14, H-14); frame.lineBetween(18, H-bL-10, bL+10, H-18)
    frame.lineBetween(W-14, H-bL-14, W-14, H-14); frame.lineBetween(W-14, H-14, W-bL-14, H-14); frame.lineBetween(W-18, H-bL-10, W-bL-10, H-18)

    // Animated corner gems
    for (const [cx, cy] of [[14, 14], [W - 14, 14], [14, H - 14], [W - 14, H - 14]]) {
      const gg = this.add.graphics()
      gg.fillStyle(0x5b0fa0, 0.90); gg.fillCircle(cx, cy, 7)
      gg.fillStyle(0xc084fc, 0.70); gg.fillCircle(cx, cy, 4)
      gg.fillStyle(0xffffff, 0.55); gg.fillCircle(cx - 1.5, cy - 1.5, 1.8)
      this.tweens.add({
        targets: gg, scaleX: 1.42, scaleY: 1.42, alpha: 0.52,
        duration: 1500 + Math.random() * 800,
        yoyo: true, repeat: -1, ease: 'Sine.InOut',
        delay: Math.random() * 900,
      })
    }

    // Slow CRT scan line (very subtle)
    const scan = this.add.graphics().setAlpha(0.045)
    scan.lineStyle(2, 0x7c3aed, 1)
    scan.lineBetween(0, 0, W, 0)
    this.tweens.add({ targets: scan, y: H, duration: 10000, repeat: -1, ease: 'Linear' })

    // Occasional shooting stars
    const spawnShootingStar = () => {
      if (!this.scene.isActive('CharSelectScene')) return
      const sX = Phaser.Math.Between(W * 0.05, W * 0.55)
      const sY = Phaser.Math.Between(0, H * 0.35)
      const travel = Phaser.Math.Between(160, 290)
      const slope  = Phaser.Math.FloatBetween(0.28, 0.52)
      const line   = this.add.graphics().setDepth(2)
      const draw   = (a) => {
        line.clear()
        line.lineStyle(1.5, 0xffffff, a * 0.78)
        line.lineBetween(0, 0, travel * 0.45, travel * 0.45 * slope)
        line.lineStyle(1, 0xddd6fe, a * 0.32)
        line.lineBetween(0, 0, travel * 0.70, travel * 0.70 * slope)
      }
      draw(0); line.setPosition(sX, sY)
      this.tweens.add({
        targets: line, x: sX + travel * 0.5, y: sY + travel * 0.5 * slope,
        duration: 95, ease: 'Quad.In',
        onUpdate: (tw) => draw(tw.progress),
        onComplete: () => this.tweens.add({
          targets: line, x: sX + travel, y: sY + travel * slope, alpha: 0, duration: 210,
          onComplete: () => line.destroy(),
        }),
      })
      this.time.delayedCall(Phaser.Math.Between(7000, 16000), spawnShootingStar)
    }
    this.time.delayedCall(Phaser.Math.Between(3000, 7000), spawnShootingStar)

    // ── Title ────────────────────────────────────────────────────────
    this.add.text(W / 2, 36, 'SELECT YOUR FIGHTER', {
      fontSize: '30px', color: '#5b0fa0', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0.45)
    const titleTxt = this.add.text(W / 2, 36, 'SELECT YOUR FIGHTER', {
      fontSize: '30px', color: '#e2d9f3', fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#3d0070', strokeThickness: 3,
    }).setOrigin(0.5)
    this.tweens.add({ targets: titleTxt, alpha: 0.78, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.InOut' })

    const hr = this.add.graphics()
    hr.lineStyle(1, 0x5a1090, 0.6)
    hr.lineBetween(W / 2 - 260, 62, W / 2 + 260, 62)
    hr.fillStyle(0x9b59b6, 0.9); hr.fillCircle(W / 2, 62, 4)

    // ── Player side labels ───────────────────────────────────────────
    const p1Label = this.mode === 'ava' ? 'AI FIGHTER 1' : 'PLAYER 1'
    const p2Label = this.mode === 'boss' ? 'BOSS' : this.mode === 'pvp' ? 'PLAYER 2' : this.mode === 'pve' ? 'AI FIGHTER' : 'AI FIGHTER 2'
    this.add.text(W * 0.25, 76, p1Label, {
      fontSize: '15px', color: '#a78bfa', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5)
    this.add.text(W * 0.75, 76, p2Label, {
      fontSize: '15px', color: '#f87171', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5)
    // Click hint
    this.add.text(W * 0.25, 92, 'Left click to pick', {
      fontSize: '10px', color: '#5a3090', fontFamily: 'monospace',
    }).setOrigin(0.5)
    if (this.mode === 'boss') {
      this.add.text(W * 0.75, 92, 'OVERCLOCK awaits', {
        fontSize: '10px', color: '#facc15', fontFamily: 'monospace',
      }).setOrigin(0.5)
    }
    if (this.mode === 'pvp') {
      this.add.text(W * 0.75, 92, 'Right click to pick', {
        fontSize: '10px', color: '#7a2020', fontFamily: 'monospace',
      }).setOrigin(0.5)
    }
    if (this.mode === 'pve') {
      this.add.text(W * 0.75, 92, 'Right click to pick AI', {
        fontSize: '10px', color: '#7a2020', fontFamily: 'monospace',
      }).setOrigin(0.5)
    }
    if (this.mode === 'ava') {
      this.add.text(W * 0.75, 92, 'Right click to pick', {
        fontSize: '10px', color: '#7a2020', fontFamily: 'monospace',
      }).setOrigin(0.5)
    }
    if (this._isMobile()) this._createMobilePickTarget(W)

    // ── Cards ────────────────────────────────────────────────────────
    const layout = this._getCardLayout()

    this.cardContainers = []
    this.cardGlowGraphics = []

    CHARACTERS.forEach((char, i) => {
      const { x, y } = this._getCardPosition(i, layout)
      this.cardContainers.push(this.createCard(char, i, x, y, layout.cardW, layout.cardH))
    })

    // ── P1 / P2 badge overlays (one per card) ───────────────────────
    // rendered after cards so they sit on top
    this.p1Badges = CHARACTERS.map((_, i) => {
      const { x, y } = this._getCardPosition(i, layout)
      const badge = this.add.text(x - layout.cardW / 2 + 8, y - layout.cardH / 2 + 8, 'P1', {
        fontSize: '13px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
        backgroundColor: '#7c3aed', padding: { x: 6, y: 3 },
      }).setDepth(5).setVisible(false)
      return badge
    })
    this.p2Badges = CHARACTERS.map((_, i) => {
      const { x, y } = this._getCardPosition(i, layout)
      const badge = this.add.text(x + layout.cardW / 2 - 8, y - layout.cardH / 2 + 8, 'P2', {
        fontSize: '13px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
        backgroundColor: '#dc2626', padding: { x: 6, y: 3 },
      }).setDepth(5).setVisible(false).setOrigin(1, 0)
      return badge
    })

    // ── Difficulty selector (pve only) ──────────────────────────────
    if (this.mode === 'pve') {
      this._createDifficultySelector(W)
    }

    // ── Info panel ───────────────────────────────────────────────────
    this.infoPanel = this.createInfoPanel(W, H)

    // ── Back button ──────────────────────────────────────────────────
    const backBtn = this.add.text(28, H - 22, '← BACK', {
      fontSize: '13px', color: '#4a2080', fontFamily: 'monospace',
    }).setOrigin(0, 1).setDepth(5).setInteractive({ useHandCursor: true })
    if (this._isMobile()) backBtn.setFontSize(18).setPadding(12, 10, 12, 10)
    backBtn.on('pointerover', () => backBtn.setColor('#cc88ff'))
    backBtn.on('pointerout',  () => backBtn.setColor('#4a2080'))
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'))

    // ── Fight button ─────────────────────────────────────────────────
    this.startBtn = this.add.text(W - 34, 84, 'FIGHT', {
      fontSize: '22px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
      backgroundColor: '#5e1e9e', padding: { x: 30, y: 10 },
    }).setOrigin(1, 0.5).setDepth(5).setInteractive({ useHandCursor: true }).setVisible(false)
    if (this._isMobile()) this.startBtn.setFontSize(28).setPadding(38, 15, 38, 15)

    this.startBtn.on('pointerover', () => {
      this.startBtn.setStyle({ backgroundColor: '#9b59b6', color: '#ffffff' })
      this.tweens.add({ targets: this.startBtn, scaleX: 1.05, scaleY: 1.05, duration: 100, ease: 'Quad.Out' })
    })
    this.startBtn.on('pointerout',  () => {
      this.startBtn.setStyle({ backgroundColor: '#5e1e9e', color: '#ffffff' })
      this.tweens.add({ targets: this.startBtn, scaleX: 1, scaleY: 1, duration: 100, ease: 'Quad.Out' })
    })
    this.startBtn.on('pointerdown', () => {
      if (this.mode === 'boss') {
        this.scene.start('FightScene', {
          mode: 'boss',
          p1: this.p1Choice,
          p2: 'overclock',
          stage: 'cybercity',
          difficulty: 'hard',
        })
        return
      }
      this.scene.start('StageSelectScene', { mode: this.mode, p1: this.p1Choice, p2: this.p2Choice, difficulty: this.difficulty })
    })

  }

  _getCardLayout() {
    if (this._isMobile()) {
      return {
        cols: window.innerWidth > window.innerHeight ? 4 : 2,
        cardW: 158,
        cardH: 232,
        gapX: 22,
        gapY: 24,
        topY: window.innerWidth > window.innerHeight ? 224 : 250,
      }
    }
    return {
      cols: 5,
      cardW: 136,
      cardH: 214,
      gapX: 18,
      gapY: 18,
      topY: 222,
    }
  }

  _isMobile() {
    return this.sys.game.device.input.touch || navigator.maxTouchPoints > 0
  }

  _createMobilePickTarget(W) {
    if (this.mode === 'boss') return

    const p2Label = this.mode === 'pve' ? 'PICK AI' : this.mode === 'ava' ? 'PICK AI 2' : 'PICK P2'
    const buttons = [
      { player: 1, label: this.mode === 'ava' ? 'PICK AI 1' : 'PICK P1', x: W / 2 - 118, color: 0x7c3aed },
      { player: 2, label: p2Label, x: W / 2 + 118, color: 0xef4444 },
    ]

    this._pickTargetButtons = []
    buttons.forEach(btn => {
      const g = this.add.graphics().setDepth(6)
      const draw = () => {
        const selected = this.pickTarget === btn.player
        g.clear()
        g.fillStyle(selected ? btn.color : 0x080018, selected ? 0.92 : 0.88)
        g.fillRoundedRect(btn.x - 104, 106, 208, 48, 8)
        g.lineStyle(2, btn.color, selected ? 1 : 0.55)
        g.strokeRoundedRect(btn.x - 104, 106, 208, 48, 8)
      }
      draw()
      const txt = this.add.text(btn.x, 130, btn.label, {
        fontSize: '18px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(7).setInteractive({ useHandCursor: true })
      txt.on('pointerdown', () => {
        this.pickTarget = btn.player
        this._pickTargetButtons.forEach(refresh => refresh())
      })
      this._pickTargetButtons.push(draw)
    })

    this.add.text(W / 2, 162, 'Tap a side, then tap a fighter', {
      fontSize: '13px', color: '#a78bfa', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(7)
  }

  _getCardPosition(index, layout = this._getCardLayout()) {
    const row = Math.floor(index / layout.cols)
    const col = index % layout.cols
    const rowStart = row * layout.cols
    const rowCount = Math.min(layout.cols, CHARACTERS.length - rowStart)
    const totalW = rowCount * layout.cardW + (rowCount - 1) * layout.gapX
    const startX = (this.scale.width - totalW) / 2 + layout.cardW / 2

    return {
      x: startX + col * (layout.cardW + layout.gapX),
      y: layout.topY + row * (layout.cardH + layout.gapY),
    }
  }

  createCard(char, i, cx, cy, W, H) {
    const container = this.add.container(cx, cy)

    // Glow graphic (drawn separately so we can update it)
    const glow = this.add.graphics()
    this.cardGlowGraphics.push(glow)
    this.drawCardGlow(glow, cx, cy, W, H, char.color, 0)

    // Card background
    const cardBg = this.add.graphics()
    cardBg.fillStyle(0x08001c, 1)
    cardBg.fillRoundedRect(-W / 2, -H / 2, W, H, 10)
    cardBg.lineStyle(1.5, char.color, 0.35)
    cardBg.strokeRoundedRect(-W / 2, -H / 2, W, H, 10)

    // Portrait background
    const portraitBg = this.add.graphics()
    portraitBg.fillStyle(char.color, 0.08)
    portraitBg.fillRoundedRect(-W / 2 + 8, -H / 2 + 8, W - 16, 108, 6)

    // Character sprite (idle frame 0, scaled up)
    const sprite = this.add.image(0, -H / 2 + 62, char.key + '_idle', 0)
    sprite.setScale(1.55).setDepth(1)

    // Divider
    const div = this.add.graphics()
    div.lineStyle(1, char.color, 0.3)
    div.lineBetween(-W / 2 + 12, -H / 2 + 124, W / 2 - 12, -H / 2 + 124)

    // Name
    const nameText = this.add.text(0, -H / 2 + 132, char.name, {
      fontSize: char.name.length > 7 ? '15px' : '17px',
      color: char.hex, fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5, 0)

    // Stat bars
    const statGraphics = this.add.graphics()
    const statLabels = []
    const statKeys = [['HP', 'hp', 0x22cc44], ['SPD', 'spd', 0x38bdf8], ['PWR', 'pwr', 0xf97316]]
    const barW = W - 24, barH = 6
    statKeys.forEach(([label, key, barColor], si) => {
      const sy = -H / 2 + 162 + si * 16
      const ratio = char.stats[key] / STAT_MAX[key]
      // Track bg
      statGraphics.fillStyle(0x1a1a2e, 1)
      statGraphics.fillRoundedRect(-W / 2 + 12, sy, barW, barH, 3)
      // Fill
      statGraphics.fillStyle(barColor, 0.85)
      statGraphics.fillRoundedRect(-W / 2 + 12, sy, barW * ratio, barH, 3)
      // Label
      statLabels.push(this.add.text(-W / 2 + 12, sy - 10, label, {
        fontSize: '9px', color: '#888888', fontFamily: 'monospace',
      }))
      statLabels.push(this.add.text(W / 2 - 12, sy - 10, String(char.stats[key]), {
        fontSize: '9px', color: '#aaaaaa', fontFamily: 'monospace',
      }).setOrigin(1, 0))
    })

    container.add([cardBg, portraitBg, sprite, div, nameText, statGraphics, ...statLabels])
    container.setSize(W, H)
    container.setInteractive({ useHandCursor: true })
    container.setDepth(2)

    container.on('pointerover', () => {
      this.drawCardGlow(this.cardGlowGraphics[i], cx, cy, W, H, char.color, 0.55)
      this.tweens.add({ targets: container, scaleX: 1.04, scaleY: 1.04, duration: 100, ease: 'Quad.Out' })
      this.showInfo(char)
    })
    container.on('pointerout', () => {
      this.refreshCardGlow(i, cx, cy, W, H, char)
      this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 100, ease: 'Quad.Out' })
    })
    container.on('pointerdown', (ptr) => {
      if (this._isLocked(char)) {
        this._showCharacterLockMsg(cx, cy, char)
        return
      }
      if (char.registeredOnly && this._user?.isGuest) {
        this._showLockMsg(cx, cy)
        return
      }
      if (this._isMobile()) {
        this.selectChar(i, this.pickTarget)
      } else if (ptr.rightButtonDown()) {
        this.selectChar(i, 2)
      } else {
        this.selectChar(i, 1)
      }
    })

    // Lock overlay for registered-only characters when user is a guest
    if (this._isLocked(char)) {
      const lockBg = this.add.graphics()
      lockBg.fillStyle(0x000000, 0.68)
      lockBg.fillRoundedRect(cx - W / 2, cy - H / 2, W, H, 10)
      lockBg.setDepth(3)

      this.add.text(cx, cy - 22, 'LOCKED', {
        fontSize: '22px', color: '#facc15', fontFamily: 'monospace',
        fontStyle: 'bold', stroke: '#000000', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(3)

      this.add.text(cx, cy + 20, char.unlockText || 'BEAT BOSS', {
        fontSize: '12px', color: '#ffffff', fontFamily: 'monospace',
        fontStyle: 'bold', align: 'center',
      }).setOrigin(0.5).setDepth(3)
    } else if (char.registeredOnly && this._user?.isGuest) {
      const lockBg = this.add.graphics()
      lockBg.fillStyle(0x000000, 0.62)
      lockBg.fillRoundedRect(cx - W / 2, cy - H / 2, W, H, 10)
      lockBg.setDepth(3)

      this.add.text(cx, cy - 16, '🔒', {
        fontSize: '36px', fontFamily: 'monospace',
      }).setOrigin(0.5).setDepth(3)

      this.add.text(cx, cy + 28, 'REGISTER TO\nUNLOCK', {
        fontSize: '13px', color: '#fde047', fontFamily: 'monospace',
        fontStyle: 'bold', align: 'center', letterSpacing: 2,
      }).setOrigin(0.5).setDepth(3)
    }

    container.charIndex = i
    container.charData  = char
    return container
  }

  _showLockMsg(cx, cy) {
    if (this._lockMsgActive) return
    this._lockMsgActive = true
    const txt = this.add.text(cx, cy - 160, 'CREATE AN ACCOUNT\nTO PLAY AS LOHE', {
      fontSize: '15px', color: '#fde047', fontFamily: 'monospace',
      fontStyle: 'bold', align: 'center', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10)
    this.time.delayedCall(1800, () => {
      txt.destroy()
      this._lockMsgActive = false
    })
  }

  drawCardGlow(g, cx, cy, W, H, color, alpha) {
    g.clear()
    if (alpha <= 0) return
    g.lineStyle(2.5, color, alpha)
    g.strokeRoundedRect(cx - W / 2, cy - H / 2, W, H, 10)
    // outer soft glow
    g.lineStyle(6, color, alpha * 0.22)
    g.strokeRoundedRect(cx - W / 2 - 3, cy - H / 2 - 3, W + 6, H + 6, 12)
  }

  refreshCardGlow(i, cx, cy, W, H, char) {
    const isP1 = this.p1Index === i
    const isP2 = this.p2Index === i
    const g = this.cardGlowGraphics[i]
    g.clear()
    if (isP1) {
      g.lineStyle(3, 0xa78bfa, 0.9)
      g.strokeRoundedRect(cx - W / 2, cy - H / 2, W, H, 10)
      g.lineStyle(8, 0xa78bfa, 0.18)
      g.strokeRoundedRect(cx - W / 2 - 4, cy - H / 2 - 4, W + 8, H + 8, 13)
    }
    if (isP2) {
      g.lineStyle(3, 0xf87171, isP1 ? 0.6 : 0.9)
      g.strokeRoundedRect(cx - W / 2 + (isP1 ? 3 : 0), cy - H / 2 + (isP1 ? 3 : 0), W - (isP1 ? 6 : 0), H - (isP1 ? 6 : 0), 10)
      g.lineStyle(8, 0xf87171, 0.15)
      g.strokeRoundedRect(cx - W / 2 - 4, cy - H / 2 - 4, W + 8, H + 8, 13)
    }
  }

  selectChar(index, player) {
    const char = CHARACTERS[index]
    if (this._isLocked(char)) return
    const layout = this._getCardLayout()

    if (player === 1) {
      const prev = this.p1Index
      this.p1Index  = index
      this.p1Choice = char.key
      // Hide old P1 badge
      if (prev >= 0) {
        const prevPos = this._getCardPosition(prev, layout)
        this.p1Badges[prev].setVisible(false)
        this.refreshCardGlow(prev, prevPos.x, prevPos.y, layout.cardW, layout.cardH, CHARACTERS[prev])
      }
      this.p1Badges[index].setVisible(true)
    } else {
      if (this.mode === 'boss') return
      const prev = this.p2Index
      this.p2Index  = index
      this.p2Choice = char.key
      if (prev >= 0) {
        const prevPos = this._getCardPosition(prev, layout)
        this.p2Badges[prev].setVisible(false)
        this.refreshCardGlow(prev, prevPos.x, prevPos.y, layout.cardW, layout.cardH, CHARACTERS[prev])
      }
      this.p2Badges[index].setVisible(true)
    }

    // Update glow for this card
    const pos = this._getCardPosition(index, layout)
    this.refreshCardGlow(index, pos.x, pos.y, layout.cardW, layout.cardH, char)

    if (this.mode === 'boss') {
      this.p2Choice = 'overclock'
      this.startBtn.setVisible(!!this.p1Choice)
    } else if (this.p1Choice && this.p2Choice) this.startBtn.setVisible(true)
  }

  _isLocked(char) {
    if (!char.unlockChar) return false
    return !(this._user?.unlockedChars || []).includes(char.unlockChar)
  }

  _showCharacterLockMsg(cx, cy, char) {
    if (this._lockMsgActive) return
    this._lockMsgActive = true
    const txt = this.add.text(cx, cy - 160, `${char.name} LOCKED\n${char.unlockText || 'BEAT THE BOSS'}`, {
      fontSize: '15px', color: '#facc15', fontFamily: 'monospace',
      fontStyle: 'bold', align: 'center', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10)
    this.time.delayedCall(1800, () => {
      txt.destroy()
      this._lockMsgActive = false
    })
  }

  _createDifficultySelector(W) {
    const difficulties = [
      { key: 'easy',   label: 'EASY',   color: '#4ade80', hoverBg: '#052e16' },
      { key: 'medium', label: 'MEDIUM', color: '#facc15', hoverBg: '#1c1400' },
      { key: 'hard',   label: 'HARD',   color: '#ef4444', hoverBg: '#2a0000' },
    ]
    const BTN_W = this._isMobile() ? 150 : 120
    const BTN_H = this._isMobile() ? 46 : 32
    const GAP = this._isMobile() ? 18 : 14
    const totalW = difficulties.length * BTN_W + (difficulties.length - 1) * GAP
    const startX = W / 2 - totalW / 2
    const ROW_Y = 570

    this.add.text(W / 2, ROW_Y - 22, 'AI DIFFICULTY', {
      fontSize: '11px', color: '#5a3090', fontFamily: 'monospace', letterSpacing: 3,
    }).setOrigin(0.5).setDepth(5)

    this._diffBtnBgs = []
    this._diffBtns = []

    difficulties.forEach((d, i) => {
      const bx = startX + i * (BTN_W + GAP)
      const isSelected = () => this.difficulty === d.key

      const bg = this.add.graphics().setDepth(4)
      this._diffBtnBgs.push({ g: bg, d, bx, BTN_W, BTN_H, ROW_Y })

      const drawBg = (hover) => {
        bg.clear()
        if (isSelected()) {
          bg.fillStyle(Phaser.Display.Color.HexStringToColor(d.hoverBg).color, 1)
          bg.fillRoundedRect(bx, ROW_Y - BTN_H / 2, BTN_W, BTN_H, 6)
          bg.lineStyle(2, Phaser.Display.Color.HexStringToColor(d.color).color, 1)
          bg.strokeRoundedRect(bx, ROW_Y - BTN_H / 2, BTN_W, BTN_H, 6)
          // Outer glow
          bg.lineStyle(6, Phaser.Display.Color.HexStringToColor(d.color).color, 0.22)
          bg.strokeRoundedRect(bx - 3, ROW_Y - BTN_H / 2 - 3, BTN_W + 6, BTN_H + 6, 8)
        } else {
          bg.fillStyle(hover ? 0x110028 : 0x080018, 1)
          bg.fillRoundedRect(bx, ROW_Y - BTN_H / 2, BTN_W, BTN_H, 6)
          bg.lineStyle(1.5, 0x2a0060, hover ? 0.7 : 0.4)
          bg.strokeRoundedRect(bx, ROW_Y - BTN_H / 2, BTN_W, BTN_H, 6)
        }
      }
      drawBg(false)

      const btn = this.add.text(bx + BTN_W / 2, ROW_Y, d.label, {
        fontSize: this._isMobile() ? '17px' : '13px', color: isSelected() ? d.color : '#444', fontFamily: 'monospace', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(5).setInteractive({ useHandCursor: true })

      const refresh = () => {
        drawBg(false)
        btn.setColor(isSelected() ? d.color : '#444')
      }

      btn.on('pointerover', () => { if (!isSelected()) { drawBg(true); btn.setColor('#cc88ff') } })
      btn.on('pointerout',  () => refresh())
      btn.on('pointerdown', () => {
        this.difficulty = d.key
        // Redraw all buttons
        this._diffBtns.forEach(b => b())
      })

      this._diffBtns.push(refresh)
    })
  }

  createInfoPanel(W, H) {
    const panel = this.add.container(W / 2, H - 92)
    const panelW = 940, panelH = 82

    const panelBg = this.add.graphics()
    panelBg.fillStyle(0x05000f, 0.95)
    panelBg.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 8)
    panelBg.lineStyle(1, 0x2a0060, 0.8)
    panelBg.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 8)

    const nameText = this.add.text(-panelW / 2 + 18, -22, '', {
      fontSize: '21px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0, 0.5)

    const descText = this.add.text(-panelW / 2 + 18, 6, '', {
      fontSize: '12px', color: '#aaaaaa', fontFamily: 'monospace',
      wordWrap: { width: 380 },
    }).setOrigin(0, 0.5)

    const weaponsText = this.add.text(-panelW / 2 + 18, 28, '', {
      fontSize: '11px', color: '#6ee7b7', fontFamily: 'monospace',
      wordWrap: { width: 390 },
    }).setOrigin(0, 0.5)

    const specialText = this.add.text(panelW / 2 - 22, -18, '', {
      fontSize: '11px', color: '#c084fc', fontFamily: 'monospace', align: 'right',
      wordWrap: { width: 450 },
    }).setOrigin(1, 0.5)

    const uniqueText = this.add.text(panelW / 2 - 22, 16, '', {
      fontSize: '11px', color: '#60a5fa', fontFamily: 'monospace', align: 'right',
      wordWrap: { width: 450 },
    }).setOrigin(1, 0.5)

    panel.add([panelBg, nameText, descText, weaponsText, specialText, uniqueText])
    panel.nameText    = nameText
    panel.descText    = descText
    panel.weaponsText = weaponsText
    panel.specialText = specialText
    panel.uniqueText  = uniqueText
    panel.setDepth(4).setVisible(false)
    return panel
  }

  showInfo(char) {
    const p = this.infoPanel
    p.nameText.setText(char.name).setColor(char.hex)
    p.descText.setText(char.desc)
    p.weaponsText.setText(`Loadout: ${char.weapons}`)
    p.specialText.setText(`Special: ${char.special}`)
    p.uniqueText.setText(`Unique: ${char.unique}`)
    p.setVisible(true)
  }
}

export { CHARACTERS }
