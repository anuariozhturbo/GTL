import { signOut, updateDisplayName } from '../lib/supabase.js'

export default class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene') }

  create() {
    const W = this.scale.width, H = this.scale.height

    // ── LAYER 1 – Deep space base ─────────────────────────────────
    const bg = this.add.graphics()
    bg.fillGradientStyle(0x000008, 0x000008, 0x05000e, 0x08001a, 1)
    bg.fillRect(0, 0, W, H)

    // Large deep nebula masses (barely visible, give spatial depth)
    bg.fillStyle(0x200040, 0.20); bg.fillCircle(W * 0.28, H * 0.22, 400)
    bg.fillStyle(0x150030, 0.25); bg.fillCircle(W * 0.72, H * 0.72, 440)
    bg.fillStyle(0x0d001f, 0.22); bg.fillCircle(W * 0.08, H * 0.58, 310)
    bg.fillStyle(0x180038, 0.18); bg.fillCircle(W * 0.92, H * 0.38, 280)

    // Mid nebula (visible purple / violet)
    bg.fillStyle(0x4a1080, 0.14); bg.fillCircle(W / 2, H * 0.32, 290)
    bg.fillStyle(0x6b21a8, 0.09); bg.fillCircle(W / 2, H * 0.30, 190)
    bg.fillStyle(0x7c3aed, 0.05); bg.fillCircle(W / 2, H * 0.28, 110)
    bg.fillStyle(0x3b0f6e, 0.10); bg.fillCircle(W * 0.82, H * 0.16, 180)
    bg.fillStyle(0x1d4ed8, 0.04); bg.fillCircle(W * 0.86, H * 0.62, 240) // cool blue hint
    bg.fillStyle(0x4a1080, 0.09); bg.fillCircle(W * 0.18, H * 0.82, 210)

    // Horizon energy band
    bg.fillStyle(0x3d0070, 0.08)
    bg.fillRect(0, H / 2 - 50, W, 100)
    bg.lineStyle(1, 0x4a1080, 0.28)
    bg.lineBetween(0, H / 2 - 50, W, H / 2 - 50)
    bg.lineBetween(0, H / 2 + 50, W, H / 2 + 50)

    // ── LAYER 2 – Star field (3 tiers) ───────────────────────────
    const starBg = this.add.graphics()
    // Far stars: tiny, dim (120)
    for (let i = 0; i < 120; i++) {
      starBg.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.08, 0.30))
      starBg.fillRect(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H), 1, 1)
    }
    // Mid stars: slightly brighter (40)
    for (let i = 0; i < 40; i++) {
      starBg.fillStyle(0xddd6fe, Phaser.Math.FloatBetween(0.25, 0.55))
      starBg.fillRect(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H), 2, 2)
    }
    // Near stars: bright + coloured tint, animated twinkle (10)
    for (let i = 0; i < 10; i++) {
      const sx  = Phaser.Math.Between(40, W - 40)
      const sy  = Phaser.Math.Between(40, H - 40)
      const col = [0xffffff, 0xddd6fe, 0xc4b5fd, 0xbae6fd][i % 4]
      const sg  = this.add.graphics()
      sg.fillStyle(col, 0.9);  sg.fillRect(sx, sy, 2, 2)
      sg.fillStyle(col, 0.35); sg.fillRect(sx - 1, sy, 4, 2)
      sg.fillStyle(col, 0.35); sg.fillRect(sx, sy - 1, 2, 4)
      this.tweens.add({
        targets: sg, alpha: 0.18,
        duration: 900 + Math.random() * 2200,
        yoyo: true, repeat: -1, ease: 'Sine.InOut',
        delay: Math.random() * 1800,
      })
    }

    // ── LAYER 3 – Floating energy orbs ───────────────────────────
    const orbPalette = [0x9b59b6, 0x7c3aed, 0xc084fc, 0x22d3ee, 0xa855f7, 0xe879f9, 0x818cf8, 0x34d399]
    for (let i = 0; i < 10; i++) {
      const ox  = Phaser.Math.Between(60, W - 60)
      const oy  = Phaser.Math.Between(60, H - 60)
      const r   = Phaser.Math.Between(2, 8)
      const orb = this.add.circle(ox, oy, r, orbPalette[i % orbPalette.length], Phaser.Math.FloatBetween(0.12, 0.38))
      this.tweens.add({
        targets: orb,
        x: ox + Phaser.Math.FloatBetween(-90, 90),
        y: oy + Phaser.Math.FloatBetween(-70, 70),
        alpha: { from: Phaser.Math.FloatBetween(0.05, 0.18), to: Phaser.Math.FloatBetween(0.35, 0.60) },
        duration: 3500 + Math.random() * 4500,
        yoyo: true, repeat: -1, ease: 'Sine.InOut',
        delay: Math.random() * 3000,
      })
    }

    // ── LAYER 4 – Border frame ────────────────────────────────────
    const frame = this.add.graphics()
    // Outer border
    frame.lineStyle(1.5, 0x3d0080, 0.75)
    frame.strokeRect(14, 14, W - 28, H - 28)
    // Inner inset
    frame.lineStyle(1, 0x200050, 0.45)
    frame.strokeRect(20, 20, W - 40, H - 40)

    // Horizontal tick marks along top/bottom edges
    frame.lineStyle(1, 0x4a1080, 0.45)
    for (let x = 100; x < W - 80; x += 70) {
      frame.lineBetween(x, 14, x, 21)
      frame.lineBetween(x, H - 14, x, H - 21)
    }
    // Vertical tick marks along sides
    for (let y = 80; y < H - 60; y += 56) {
      frame.lineBetween(14, y, 21, y)
      frame.lineBetween(W - 14, y, W - 21, y)
    }

    // Corner bracket cuts (diagonal sci-fi corners)
    frame.lineStyle(1.5, 0x6d28d9, 0.80)
    const bLen = 48
    // TL
    frame.lineBetween(14, bLen + 14, 14, 14); frame.lineBetween(14, 14, bLen + 14, 14)
    frame.lineBetween(18, bLen + 10, bLen + 10, 18)
    // TR
    frame.lineBetween(W - 14, bLen + 14, W - 14, 14); frame.lineBetween(W - 14, 14, W - bLen - 14, 14)
    frame.lineBetween(W - 18, bLen + 10, W - bLen - 10, 18)
    // BL
    frame.lineBetween(14, H - bLen - 14, 14, H - 14); frame.lineBetween(14, H - 14, bLen + 14, H - 14)
    frame.lineBetween(18, H - bLen - 10, bLen + 10, H - 18)
    // BR
    frame.lineBetween(W - 14, H - bLen - 14, W - 14, H - 14); frame.lineBetween(W - 14, H - 14, W - bLen - 14, H - 14)
    frame.lineBetween(W - 18, H - bLen - 10, W - bLen - 10, H - 18)

    // ── Animated corner gems ──────────────────────────────────────
    for (const [cx, cy] of [[14, 14], [W - 14, 14], [14, H - 14], [W - 14, H - 14]]) {
      const gg = this.add.graphics()
      gg.fillStyle(0x5b0fa0, 0.95); gg.fillCircle(cx, cy, 8)
      gg.fillStyle(0xc084fc, 0.75); gg.fillCircle(cx, cy, 4.5)
      gg.fillStyle(0xffffff,  0.60); gg.fillCircle(cx - 1.5, cy - 1.5, 2)
      this.tweens.add({
        targets: gg, scaleX: 1.45, scaleY: 1.45, alpha: 0.55,
        duration: 1600 + Math.random() * 700,
        yoyo: true, repeat: -1, ease: 'Sine.InOut',
        delay: Math.random() * 800,
      })
    }

    // ── TITLE – "CHAOS" ───────────────────────────────────────────
    // Glow halo (wide stroke, low alpha — breathes)
    const chaosGlow = this.add.text(W / 2, 150, 'CHAOS', {
      fontSize: '122px', fontFamily: 'monospace', fontStyle: 'bold',
      color: '#7c3aed', stroke: '#4a0090', strokeThickness: 18,
    }).setOrigin(0.5).setAlpha(0.28)

    // Drop shadow offset copy
    this.add.text(W / 2 + 5, 155, 'CHAOS', {
      fontSize: '122px', fontFamily: 'monospace', fontStyle: 'bold',
      color: '#1a0030',
    }).setOrigin(0.5).setAlpha(0.55)

    // Main title
    this.add.text(W / 2, 150, 'CHAOS', {
      fontSize: '122px', fontFamily: 'monospace', fontStyle: 'bold',
      color: '#b080ff', stroke: '#2d0060', strokeThickness: 4,
    }).setOrigin(0.5)

    // Glow breath tween
    this.tweens.add({
      targets: chaosGlow,
      alpha: { from: 0.28, to: 0.62 },
      scaleX: { from: 1.00, to: 1.015 },
      scaleY: { from: 1.00, to: 1.015 },
      duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.InOut',
    })

    // ── "CONSTRUCT" ───────────────────────────────────────────────
    this.add.text(W / 2, 264, 'CONSTRUCT', {
      fontSize: '52px', fontFamily: 'monospace', fontStyle: 'bold',
      color: '#e2d9f3', stroke: '#3d0070', strokeThickness: 3,
      letterSpacing: 10,
    }).setOrigin(0.5)

    // Decorative underline with animated sliding bead
    const underG = this.add.graphics()
    underG.lineStyle(1, 0x7c3aed, 0.50)
    underG.lineBetween(W / 2 - 215, 298, W / 2 + 215, 298)
    // End dots
    underG.fillStyle(0x9b59b6, 0.7); underG.fillCircle(W / 2 - 215, 298, 3)
    underG.fillStyle(0x9b59b6, 0.7); underG.fillCircle(W / 2 + 215, 298, 3)
    // Sliding bead
    const bead = this.add.circle(W / 2 - 215, 298, 4, 0xc084fc, 0.95)
    this.tweens.add({
      targets: bead, x: W / 2 + 215,
      duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.InOut',
    })

    // ── Subtitle + divider ────────────────────────────────────────
    this.add.text(W / 2, 330, '— SELECT GAME MODE —', {
      fontSize: '13px', color: '#5a1090', fontFamily: 'monospace', letterSpacing: 6,
    }).setOrigin(0.5)

    const divG = this.add.graphics()
    divG.lineStyle(1, 0x5a1090, 0.45)
    divG.lineBetween(W / 2 - 250, 352, W / 2 + 250, 352)
    // Flanking small ticks
    divG.lineStyle(1, 0x5a1090, 0.35)
    for (const dx of [-80, -40, 40, 80]) {
      divG.fillStyle(0x5a1090, 0.35); divG.fillCircle(W / 2 + dx, 352, 2)
    }
    // Center gem (animated)
    const centerGem = this.add.graphics()
    centerGem.fillStyle(0x9b59b6, 0.90); centerGem.fillCircle(W / 2, 352, 5)
    centerGem.fillStyle(0xffffff,  0.50); centerGem.fillCircle(W / 2 - 1, 351, 2)
    this.tweens.add({ targets: centerGem, alpha: 0.45, duration: 1500, yoyo: true, repeat: -1 })

    // ── Button panel (frosted glass behind all 4 buttons) ─────────
    const panelG = this.add.graphics()
    panelG.fillStyle(0x04000f, 0.60)
    panelG.fillRoundedRect(W / 2 - 268, 364, 536, 270, 12)
    panelG.lineStyle(1, 0x2a0060, 0.55)
    panelG.strokeRoundedRect(W / 2 - 268, 364, 536, 270, 12)
    // Inner subtle glow on top edge
    panelG.lineStyle(1, 0x7c3aed, 0.20)
    panelG.lineBetween(W / 2 - 200, 365, W / 2 + 200, 365)

    // ── Mode buttons ─────────────────────────────────────────────
    const modes = [
      { label: '🌐  ONLINE RANKED',    mode: 'online', icon: '◈' },
      { label: 'VS  PLAYER VS PLAYER', mode: 'pvp',    icon: '⚔' },
      { label: 'AI  PLAYER VS AI',     mode: 'pve',    icon: '◉' },
      { label: 'AA  AI VS AI',         mode: 'ava',    icon: '⬡' },
    ]

    modes.forEach(({ label, mode }, i) => {
      const by       = 397 + i * 62
      const isOnline = mode === 'online'
      const accentC  = isOnline ? 0x22d3ee : 0x9b59b6
      const accentH  = isOnline ? '#22d3ee' : '#cc88ff'

      const btnBg    = this.add.graphics()
      const outerGlow = this.add.graphics()

      const drawBtn = (hovered) => {
        outerGlow.clear(); btnBg.clear()
        if (hovered) {
          outerGlow.lineStyle(10, accentC, 0.14)
          outerGlow.strokeRoundedRect(W / 2 - 232, by - 22, 464, 46, 8)
          outerGlow.lineStyle(4, accentC, 0.28)
          outerGlow.strokeRoundedRect(W / 2 - 230, by - 20, 460, 42, 7)
          btnBg.fillStyle(isOnline ? 0x001a2e : 0x140038, 1)
          btnBg.fillRoundedRect(W / 2 - 228, by - 18, 456, 38, 6)
          btnBg.lineStyle(1.5, accentC, 0.95)
          btnBg.strokeRoundedRect(W / 2 - 228, by - 18, 456, 38, 6)
          // Bright left accent bar
          btnBg.fillStyle(accentC, 0.90)
          btnBg.fillRect(W / 2 - 228, by - 18, 4, 38)
        } else {
          btnBg.fillStyle(0x07001a, 1)
          btnBg.fillRoundedRect(W / 2 - 228, by - 18, 456, 38, 6)
          btnBg.lineStyle(1, isOnline ? 0x0e4f5f : 0x3a0070, 0.50)
          btnBg.strokeRoundedRect(W / 2 - 228, by - 18, 456, 38, 6)
          // Subtle left accent bar
          btnBg.fillStyle(isOnline ? 0x0e7490 : 0x4a1080, 0.55)
          btnBg.fillRect(W / 2 - 228, by - 18, 3, 38)
        }
      }
      drawBtn(false)

      const btn = this.add.text(W / 2 + 4, by, label, {
        fontSize: '22px', color: '#777', fontFamily: 'monospace',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true })

      btn.on('pointerover', () => {
        drawBtn(true)
        btn.setColor(accentH).setScale(1.03)
      })
      btn.on('pointerout', () => {
        drawBtn(false)
        btn.setColor('#777').setScale(1)
      })
      btn.on('pointerdown', () => {
        if (mode === 'online') {
          const user = this.registry.get('user')
          if (!user || user.isGuest) {
            if (this._onlineLockMsg) return
            this._onlineLockMsg = this.add.text(W / 2, by + 30, 'Sign in to play online', {
              fontSize: '12px', color: '#ef4444', fontFamily: 'monospace',
            }).setOrigin(0.5)
            this.time.delayedCall(2200, () => { this._onlineLockMsg?.destroy(); this._onlineLockMsg = null })
            return
          }
          this.scene.start('OnlineLobbyScene')
        } else {
          this.scene.start('CharSelectScene', { mode })
        }
      })
    })

    // Panel bottom accent
    const panelBotG = this.add.graphics()
    panelBotG.lineStyle(1, 0x5a1090, 0.25)
    panelBotG.lineBetween(W / 2 - 180, 636, W / 2 + 180, 636)
    panelBotG.fillStyle(0x9b59b6, 0.5); panelBotG.fillCircle(W / 2, 636, 3)

    // ── SHOOTING STARS (periodic) ─────────────────────────────────
    const spawnStar = () => {
      if (!this.scene.isActive('MenuScene')) return
      const startX = Phaser.Math.Between(W * 0.05, W * 0.55)
      const startY = Phaser.Math.Between(0, H * 0.45)
      const travel = Phaser.Math.Between(180, 320)
      const angle  = Phaser.Math.FloatBetween(0.28, 0.50) // diagonal ratio
      const line   = this.add.graphics().setDepth(2)
      const drawStar = (alpha) => {
        line.clear()
        line.lineStyle(1.5, 0xffffff, alpha * 0.85)
        line.lineBetween(0, 0, travel * 0.45, travel * 0.45 * angle)
        line.lineStyle(1, 0xddd6fe, alpha * 0.45)
        line.lineBetween(0, 0, travel * 0.7, travel * 0.7 * angle)
      }
      drawStar(0)
      line.setPosition(startX, startY)

      this.tweens.add({
        targets: line, x: startX + travel * 0.5, y: startY + travel * 0.5 * angle,
        duration: 90, ease: 'Quad.In',
        onUpdate: (tween) => drawStar(tween.progress),
        onComplete: () => {
          this.tweens.add({
            targets: line, x: startX + travel, y: startY + travel * angle,
            alpha: 0, duration: 200, ease: 'Quad.Out',
            onComplete: () => line.destroy(),
          })
        },
      })
      this.time.delayedCall(Phaser.Math.Between(4500, 11000), spawnStar)
    }
    this.time.delayedCall(Phaser.Math.Between(1500, 3500), spawnStar)

    // ── FOOTER ────────────────────────────────────────────────────
    const footerG = this.add.graphics()
    footerG.fillStyle(0x000000, 0.40)
    footerG.fillRect(0, H - 36, W, 36)
    footerG.lineStyle(1, 0x2a0050, 0.60)
    footerG.lineBetween(0, H - 36, W, H - 36)

    this.add.text(W / 2, H - 18, 'Tab = toggle controls   ·   Chaos Construct v1.0   ·   2025', {
      fontSize: '11px', color: '#2a0050', fontFamily: 'monospace',
    }).setOrigin(0.5)

    // ── USER BADGE + SETTINGS ─────────────────────────────────────
    const user = this.registry.get('user')
    if (user) {
      const infoStr = user.isGuest
        ? '○ GUEST'
        : `● ${user.displayName}  ${user.wins}W · ${user.losses}L`
      this._badgeText = this.add.text(W - 62, 22, infoStr, {
        fontSize: '12px',
        color: user.isGuest ? '#333' : '#7c3aed',
        fontFamily: 'monospace',
      }).setOrigin(1, 0)

      const gearBtn = this.add.text(W - 22, 20, '⚙', {
        fontSize: '20px', color: '#3a0070', fontFamily: 'monospace',
      }).setOrigin(1, 0).setInteractive({ useHandCursor: true })
      gearBtn.on('pointerover',  () => gearBtn.setColor('#cc88ff'))
      gearBtn.on('pointerout',   () => gearBtn.setColor('#3a0070'))
      gearBtn.on('pointerdown',  () => this._openSettings(W, H, user))
    }
  }

  _openSettings(W, H, user) {
    if (this._settingsOpen) return
    this._settingsOpen = true

    const MODAL_HTML = `
<style>
  #cc-settings * { box-sizing: border-box; }
  #cc-settings button { transition: background 0.15s, box-shadow 0.15s, color 0.15s; }
  #btn-save:hover  { background:#7c3aed !important; box-shadow:0 0 18px rgba(155,89,182,0.8); }
  #btn-signout:hover { background:#3d0000 !important; border-color:#ff4444 !important; color:#ff8888 !important; }
  #btn-close:hover { color:#cc88ff !important; }
  #field-nick::placeholder { color:#4a2070; }
</style>
<div id="cc-settings" style="
  font-family:'Courier New',monospace;
  background:rgba(3,0,18,0.97);
  border:1.5px solid #4a0e8a;
  border-radius:12px;
  padding:28px 28px 22px;
  width:320px;
  box-shadow:0 0 40px rgba(91,15,160,0.45),inset 0 0 30px rgba(20,0,50,0.5);
  color:#e9d5ff;
  position:relative;
">
  <button id="btn-close" style="position:absolute;top:12px;right:16px;background:none;border:none;
    color:#3a0070;font-size:18px;cursor:pointer;font-family:'Courier New',monospace;padding:0;">✕</button>
  <div style="font-size:15px;font-weight:bold;letter-spacing:4px;color:#9b59b6;margin-bottom:20px;text-align:center;">
    ⚙ SETTINGS
  </div>
  <div style="font-size:11px;color:#5a1090;letter-spacing:2px;margin-bottom:6px;">DISPLAY NAME</div>
  <input id="field-nick" type="text" maxlength="12"
    value="${user.isGuest ? '' : (user.displayName || '')}"
    ${user.isGuest ? 'disabled placeholder="sign in to change name"' : 'placeholder="max 12 chars"'}
    style="width:100%;margin-bottom:10px;
    background:${user.isGuest ? '#060018' : '#080020'};border:1px solid #3d0070;color:${user.isGuest ? '#333' : '#e9d5ff'};
    padding:10px 12px;border-radius:6px;font-family:'Courier New',monospace;
    font-size:14px;outline:none;letter-spacing:2px;text-transform:uppercase;">
  <div id="settings-msg" style="font-size:11px;min-height:16px;margin-bottom:10px;
    letter-spacing:1px;text-align:center;color:#ff6b6b;"></div>
  <button id="btn-save" style="width:100%;background:#3d0070;border:1.5px solid #7c3aed;
    color:#fff;padding:11px;cursor:pointer;font-family:'Courier New',monospace;
    font-size:14px;font-weight:bold;border-radius:6px;margin-bottom:12px;letter-spacing:3px;
    ${user.isGuest ? 'opacity:0.3;pointer-events:none;' : ''}">SAVE NAME</button>
  <div style="border-top:1px solid #1a0040;margin-bottom:12px;"></div>
  <button id="btn-signout" style="width:100%;background:#0a0000;border:1.5px solid #4a0000;
    color:#aa3333;padding:11px;cursor:pointer;font-family:'Courier New',monospace;
    font-size:14px;font-weight:bold;border-radius:6px;letter-spacing:3px;">SIGN OUT</button>
</div>`

    this._overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.55).setDepth(10)
    this._overlay.setInteractive()

    this._settingsDom = this.add.dom(W / 2, H / 2).createFromHTML(MODAL_HTML).setDepth(11)

    this._modalZone = this.add.zone(W / 2, H / 2, 360, 320).setDepth(12).setInteractive()

    const nickEl = this._settingsDom.getChildByID('field-nick')
    nickEl.addEventListener('focus', () => { nickEl.style.borderColor = '#9b59b6' })
    nickEl.addEventListener('blur',  () => { nickEl.style.borderColor = '#3d0070' })
    nickEl.addEventListener('input', () => { nickEl.value = nickEl.value.toUpperCase() })

    this._settingsDom.addListener('click')
    this._settingsDom.on('click', async e => {
      const id = e.target.id || e.target.closest('button')?.id
      if (id === 'btn-close') {
        this._closeSettings()
      } else if (id === 'btn-save') {
        await this._saveNickname(user)
      } else if (id === 'btn-signout') {
        this._closeSettings()
        if (!user.isGuest) await signOut()
        this.registry.remove('user')
        this.scene.start('AuthScene')
      }
    })

    this._settingsDom.addListener('keydown')
    this._settingsDom.on('keydown', e => {
      if (e.key === 'Enter') this._saveNickname(user)
      if (e.key === 'Escape') this._closeSettings()
    })

    this._overlay.on('pointerdown', () => this._closeSettings())
  }

  async _saveNickname(user) {
    if (user.isGuest) return
    const nickEl  = this._settingsDom.getChildByID('field-nick')
    const msgEl   = this._settingsDom.getChildByID('settings-msg')
    const saveBtn = this._settingsDom.getChildByID('btn-save')
    const name = nickEl.value.trim().toUpperCase().slice(0, 12)

    if (!name) { msgEl.textContent = 'Name cannot be empty'; return }

    saveBtn.textContent = '···'
    saveBtn.disabled = true
    msgEl.style.color = '#ff6b6b'
    msgEl.textContent = ''

    const error = await updateDisplayName(user.id, name)
    if (error) {
      msgEl.textContent = error.message
      saveBtn.textContent = 'SAVE NAME'
      saveBtn.disabled = false
      return
    }

    user.displayName = name
    this.registry.set('user', user)
    if (this._badgeText) {
      this._badgeText.setText(`● ${user.displayName}  ${user.wins}W · ${user.losses}L`)
    }

    msgEl.style.color = '#a78bfa'
    msgEl.textContent = '✓ SAVED'
    saveBtn.textContent = 'SAVE NAME'
    saveBtn.disabled = false
  }

  _closeSettings() {
    this._settingsDom?.destroy()
    this._overlay?.destroy()
    this._modalZone?.destroy()
    this._settingsDom = null
    this._overlay     = null
    this._modalZone   = null
    this._settingsOpen = false
  }
}
