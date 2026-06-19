import { signOut, updateDisplayName } from '../lib/supabase.js'

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

    // ── User badge + Settings button (top-right) ──────────────────
    const user = this.registry.get('user')
    if (user) {
      const infoStr = user.isGuest
        ? '○ GUEST'
        : `● ${user.displayName}  ${user.wins}W · ${user.losses}L`
      this._badgeText = this.add.text(W - 60, 20, infoStr, {
        fontSize: '12px',
        color: user.isGuest ? '#333' : '#7c3aed',
        fontFamily: 'monospace',
      }).setOrigin(1, 0)

      // Gear settings button
      const gearBtn = this.add.text(W - 20, 18, '⚙', {
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

    // Dim overlay
    this._overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.55).setDepth(10)
    this._overlay.setInteractive()

    this._settingsDom = this.add.dom(W / 2, H / 2).createFromHTML(MODAL_HTML).setDepth(11)

    // Focus glow
    const nickEl = this._settingsDom.getChildByID('field-nick')
    nickEl.addEventListener('focus', () => { nickEl.style.borderColor = '#9b59b6' })
    nickEl.addEventListener('blur',  () => { nickEl.style.borderColor = '#3d0070' })
    nickEl.addEventListener('input', () => {
      nickEl.value = nickEl.value.toUpperCase()
    })

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

    // Click overlay to close
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

    // Update registry + badge
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
    this._settingsDom = null
    this._overlay = null
    this._settingsOpen = false
  }
}
