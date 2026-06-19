import { signOut } from '../lib/supabase.js'

export default class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene') }

  create() {
    const W = this.scale.width, H = this.scale.height

    // ── Background ───────────────────────────────────────────────
    const bg = this.add.graphics()
    bg.fillGradientStyle(0x01000a, 0x01000a, 0x09001f, 0x09001f, 1)
    bg.fillRect(0, 0, W, H)

    // Nebula blobs
    bg.fillStyle(0x4a1080, 0.12); bg.fillCircle(W / 2, 190, 320)
    bg.fillStyle(0x6b21a8, 0.07); bg.fillCircle(W / 2, 190, 200)
    bg.fillStyle(0x7c3aed, 0.04); bg.fillCircle(W * 0.15, H * 0.75, 200)
    bg.fillStyle(0x3b0f6e, 0.07); bg.fillCircle(W * 0.85, H * 0.25, 170)

    // Horizon glow band
    bg.fillStyle(0x4a1080, 0.10)
    bg.fillRect(0, H / 2 - 40, W, 80)
    bg.lineStyle(1, 0x4a1080, 0.35)
    bg.lineBetween(0, H / 2 - 40, W, H / 2 - 40)
    bg.lineBetween(0, H / 2 + 40, W, H / 2 + 40)

    // Sparse stars
    for (let i = 0; i < 80; i++) {
      const sx = Phaser.Math.Between(0, W)
      const sy = Phaser.Math.Between(0, H)
      bg.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.15, 0.65))
      bg.fillRect(sx, sy, 1, 1)
    }

    // Corner gems
    const cg = this.add.graphics()
    for (const [cx, cy] of [[18, 18], [W - 18, 18], [18, H - 18], [W - 18, H - 18]]) {
      cg.fillStyle(0x5b0fa0, 0.9); cg.fillCircle(cx, cy, 7)
      cg.fillStyle(0xc084fc, 0.6); cg.fillCircle(cx, cy, 3)
    }
    // Neon border lines
    cg.lineStyle(1.5, 0x260055, 0.7)
    cg.lineBetween(30, 18, W - 30, 18)
    cg.lineBetween(30, H - 18, W - 30, H - 18)
    cg.lineBetween(18, 30, 18, H - 30)
    cg.lineBetween(W - 18, 30, W - 18, H - 30)

    // ── Title ────────────────────────────────────────────────────
    this.add.text(W / 2, 148, 'CHAOS', {
      fontSize: '122px', color: '#9b59b6', fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#2d0060', strokeThickness: 5,
    }).setOrigin(0.5)

    this.add.text(W / 2, 262, 'CONSTRUCT', {
      fontSize: '52px', color: '#e2d9f3', fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#3d0070', strokeThickness: 3,
    }).setOrigin(0.5)

    // Subtitle
    this.add.text(W / 2, 326, '— SELECT GAME MODE —', {
      fontSize: '14px', color: '#5a1090', fontFamily: 'monospace', letterSpacing: 4,
    }).setOrigin(0.5)

    // Horizontal rule
    const hr = this.add.graphics()
    hr.lineStyle(1, 0x5a1090, 0.55)
    hr.lineBetween(W / 2 - 220, 350, W / 2 + 220, 350)
    hr.fillStyle(0x9b59b6, 0.9); hr.fillCircle(W / 2, 350, 5)

    // ── Mode buttons ─────────────────────────────────────────────
    const modes = [
      { label: 'VS  PLAYER VS PLAYER', mode: 'pvp' },
      { label: 'AI  PLAYER VS AI',      mode: 'pve' },
      { label: 'AA  AI VS AI',          mode: 'ava' },
    ]

    modes.forEach(({ label, mode }, i) => {
      const by = 418 + i * 82

      const btnBg = this.add.graphics()
      const outerGlow = this.add.graphics()

      const drawBtn = (hovered) => {
        outerGlow.clear()
        btnBg.clear()
        if (hovered) {
          // Outer purple glow halo
          outerGlow.lineStyle(10, 0x9b59b6, 0.18)
          outerGlow.strokeRoundedRect(W / 2 - 234, by - 28, 468, 60, 11)
          outerGlow.lineStyle(5, 0x9b59b6, 0.32)
          outerGlow.strokeRoundedRect(W / 2 - 232, by - 26, 464, 56, 10)
          btnBg.fillStyle(0x1a0048, 1)
          btnBg.fillRoundedRect(W / 2 - 230, by - 24, 460, 52, 9)
          btnBg.lineStyle(2, 0x9b59b6, 1)
          btnBg.strokeRoundedRect(W / 2 - 230, by - 24, 460, 52, 9)
        } else {
          btnBg.fillStyle(0x0a0028, 1)
          btnBg.fillRoundedRect(W / 2 - 230, by - 24, 460, 52, 9)
          btnBg.lineStyle(1.5, 0x4a1080, 0.55)
          btnBg.strokeRoundedRect(W / 2 - 230, by - 24, 460, 52, 9)
        }
      }
      drawBtn(false)

      const btn = this.add.text(W / 2, by, label, {
        fontSize: '26px', color: '#888888', fontFamily: 'monospace',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true })

      btn.on('pointerover',  () => { drawBtn(true);  btn.setColor('#cc88ff').setScale(1.04) })
      btn.on('pointerout',   () => { drawBtn(false); btn.setColor('#888888').setScale(1) })
      btn.on('pointerdown',  () => this.scene.start('CharSelectScene', { mode }))
    })

    // ── Footer ───────────────────────────────────────────────────
    this.add.text(W / 2, H - 22, 'Tab = toggle controls   |   Chaos Construct v1.0', {
      fontSize: '12px', color: '#2a0050', fontFamily: 'monospace',
    }).setOrigin(0.5)

    // ── User badge (top-right) ─────────────────────────────────────
    const user = this.registry.get('user')
    if (user) {
      const infoStr = user.isGuest
        ? '○ GUEST'
        : `● ${user.displayName}  ${user.wins}W · ${user.losses}L`
      this.add.text(W - 20, 20, infoStr, {
        fontSize: '12px',
        color: user.isGuest ? '#333' : '#7c3aed',
        fontFamily: 'monospace',
      }).setOrigin(1, 0)

      const logoutBtn = this.add.text(W - 20, 38, '[ SIGN OUT ]', {
        fontSize: '10px', color: '#2a0050', fontFamily: 'monospace',
      }).setOrigin(1, 0).setInteractive({ useHandCursor: true })
      logoutBtn.on('pointerover', () => logoutBtn.setColor('#9b59b6'))
      logoutBtn.on('pointerout',  () => logoutBtn.setColor('#2a0050'))
      logoutBtn.on('pointerdown', async () => {
        if (!user.isGuest) await signOut()
        this.registry.remove('user')
        this.scene.start('AuthScene')
      })
    }
  }
}
