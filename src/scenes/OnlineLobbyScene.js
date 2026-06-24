import QRCode from 'qrcode'
import { CHARACTERS } from './CharSelectScene.js'
import { supabase } from '../lib/supabase.js'
import { onlineSession, clearOnlineSession } from '../lib/onlineSession.js'

const STAGES = ['neonvoid', 'volcano', 'cybercity', 'spacestation']

export default class OnlineLobbyScene extends Phaser.Scene {
  constructor() { super('OnlineLobbyScene') }

  init() {
    this._selectedChar = 'ash'
    this._searching = false
    this._matched = false
    this._mmChannel = null
    this._dotTimer = 0
    this._dotCount = 0
    this._qrOpen = false
  }

  create() {
    const W = this.scale.width
    const H = this.scale.height
    const user = this.registry.get('user')

    this._drawBackground(W, H)

    const backBtn = this.add.text(36, 24, '< BACK', {
      fontSize: '14px', fontFamily: 'monospace', color: '#3a0070',
    }).setInteractive({ useHandCursor: true })
    backBtn.on('pointerover', () => backBtn.setColor('#cc88ff'))
    backBtn.on('pointerout', () => backBtn.setColor('#3a0070'))
    backBtn.on('pointerdown', () => { this._cleanup(); this.scene.start('MenuScene') })
    this.input.keyboard.on('keydown-ESC', () => { this._cleanup(); this.scene.start('MenuScene') })

    const qrBtn = this.add.text(W - 36, 24, 'QR', {
      fontSize: '16px', fontFamily: 'monospace', fontStyle: 'bold', color: '#22d3ee',
      backgroundColor: '#001a2e', padding: { x: 14, y: 7 },
    }).setOrigin(1, 0).setDepth(5).setInteractive({ useHandCursor: true })
    qrBtn.on('pointerover', () => qrBtn.setColor('#ffffff'))
    qrBtn.on('pointerout', () => qrBtn.setColor('#22d3ee'))
    qrBtn.on('pointerdown', () => this._showQrCode(W, H))

    this.add.text(W / 2, 66, 'ONLINE BATTLE', {
      fontSize: '48px', color: '#9b59b6', fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#2d0060', strokeThickness: 4,
    }).setOrigin(0.5)

    if (!user || user.isGuest) {
      this._drawGuestWall(W, H)
      return
    }

    this.add.text(W / 2, 126, `${user.displayName || user.email}   ${user.wins ?? 0}W / ${user.losses ?? 0}L`, {
      fontSize: '13px', color: '#7c3aed', fontFamily: 'monospace',
    }).setOrigin(0.5)

    const hr = this.add.graphics()
    hr.lineStyle(1, 0x5a1090, 0.4)
    hr.lineBetween(W / 2 - 300, 152, W / 2 + 300, 152)
    hr.fillStyle(0x9b59b6, 0.9)
    hr.fillCircle(W / 2, 152, 4)

    this.add.text(W / 2, 176, 'CHOOSE YOUR ONLINE FIGHTER', {
      fontSize: '13px', color: '#5a1090', fontFamily: 'monospace',
    }).setOrigin(0.5)

    const gridBottom = this._createCharacterGrid(W, user)
    this._createFindMatch(W, gridBottom + 36)

    this._statusText = this.add.text(W / 2, gridBottom + 126, '', {
      fontSize: '18px', color: '#5a1090', fontFamily: 'monospace',
    }).setOrigin(0.5)

    this.add.text(W / 2, Math.min(H - 52, gridBottom + 170), 'Auto-matched with a random online opponent', {
      fontSize: '12px', color: '#2a0050', fontFamily: 'monospace',
    }).setOrigin(0.5)

    this.add.text(W / 2, H - 22, 'PC: keyboard controls   |   Mobile: touch controls appear in match', {
      fontSize: '12px', color: '#2a0050', fontFamily: 'monospace',
    }).setOrigin(0.5)
  }

  _drawBackground(W, H) {
    const bg = this.add.graphics()
    bg.fillGradientStyle(0x01000a, 0x01000a, 0x09001f, 0x09001f, 1)
    bg.fillRect(0, 0, W, H)
    bg.fillStyle(0x4a1080, 0.12); bg.fillCircle(W / 2, 210, 340)
    bg.fillStyle(0x7c3aed, 0.04); bg.fillCircle(W * 0.15, H * 0.75, 200)
    bg.fillStyle(0x0e7490, 0.08); bg.fillCircle(W * 0.85, H * 0.25, 180)
    for (let i = 0; i < 80; i++) {
      bg.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.08, 0.48))
      bg.fillRect(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H), 1, 1)
    }

    const frame = this.add.graphics()
    frame.lineStyle(1.5, 0x260055, 0.7)
    frame.strokeRect(18, 18, W - 36, H - 36)
    for (const [cx, cy] of [[18, 18], [W - 18, 18], [18, H - 18], [W - 18, H - 18]]) {
      frame.fillStyle(0x5b0fa0, 0.9)
      frame.fillCircle(cx, cy, 7)
      frame.fillStyle(0xc084fc, 0.6)
      frame.fillCircle(cx, cy, 3)
    }
  }

  _drawGuestWall(W, H) {
    this.add.text(W / 2, H / 2 - 40, 'SIGN IN TO PLAY ONLINE', {
      fontSize: '24px', color: '#ef4444', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5)
    const signInBtn = this.add.text(W / 2, H / 2 + 36, '[ SIGN IN ]', {
      fontSize: '20px', color: '#cc88ff', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    signInBtn.on('pointerover', () => signInBtn.setScale(1.06))
    signInBtn.on('pointerout', () => signInBtn.setScale(1))
    signInBtn.on('pointerdown', () => this.scene.start('AuthScene'))
  }

  _createCharacterGrid(W, user) {
    const cols = 5
    const cardW = 132
    const cardH = 70
    const gapX = 16
    const gapY = 16
    const topY = 244
    const fallback = CHARACTERS.find(char => !this._isLocked(char, user))?.key || 'ash'
    const selected = CHARACTERS.find(char => char.key === this._selectedChar)
    if (!selected || this._isLocked(selected, user)) this._selectedChar = fallback

    this._charBtns = []

    CHARACTERS.forEach((char, idx) => {
      const row = Math.floor(idx / cols)
      const col = idx % cols
      const rowStart = row * cols
      const rowCount = Math.min(cols, CHARACTERS.length - rowStart)
      const totalW = rowCount * cardW + (rowCount - 1) * gapX
      const startX = W / 2 - totalW / 2
      const bx = startX + col * (cardW + gapX) + cardW / 2
      const by = topY + row * (cardH + gapY)
      const locked = this._isLocked(char, user)
      const selectedNow = char.key === this._selectedChar
      const hexCol = char.hex || ('#' + char.color.toString(16).padStart(6, '0'))

      const btnG = this.add.graphics()
      const draw = (hovered, selectedCard) => {
        btnG.clear()
        btnG.fillStyle(locked ? 0x050505 : selectedCard ? 0x1a0048 : hovered ? 0x100030 : 0x050015, 1)
        btnG.fillRoundedRect(bx - cardW / 2, by - cardH / 2, cardW, cardH, 8)
        btnG.lineStyle(selectedCard ? 2.5 : 1.5, selectedCard ? char.color : hovered ? 0x9b59b6 : 0x2a0060, locked ? 0.35 : selectedCard ? 1 : hovered ? 0.85 : 0.45)
        btnG.strokeRoundedRect(bx - cardW / 2, by - cardH / 2, cardW, cardH, 8)
      }
      draw(false, selectedNow)

      this.add.image(bx, by - 13, char.key + '_idle', 0).setScale(0.78).setDepth(2).setAlpha(locked ? 0.2 : 1)
      const txt = this.add.text(bx, by + 22, locked ? 'LOCKED' : char.name, {
        fontSize: locked ? '11px' : char.name.length > 7 ? '12px' : '14px',
        fontFamily: 'monospace', fontStyle: 'bold',
        color: locked ? '#555' : selectedNow ? hexCol : '#777',
      }).setOrigin(0.5).setDepth(3).setInteractive({ useHandCursor: true })

      const ref = { key: char.key, draw, txt, hexCol, locked }
      this._charBtns.push(ref)
      txt.on('pointerover', () => { if (!this._searching && !locked && this._selectedChar !== char.key) draw(true, false) })
      txt.on('pointerout', () => draw(false, this._selectedChar === char.key))
      txt.on('pointerdown', () => {
        if (this._searching || locked) return
        this._selectedChar = char.key
        this._charBtns.forEach(btn => {
          btn.draw(false, btn.key === char.key)
          btn.txt.setColor(btn.locked ? '#555' : btn.key === char.key ? btn.hexCol : '#777')
        })
      })
    })

    return topY + (Math.ceil(CHARACTERS.length / cols) - 1) * (cardH + gapY) + cardH / 2
  }

  _createFindMatch(W, y) {
    const findG = this.add.graphics()
    const drawFind = (hovered) => {
      findG.clear()
      findG.fillStyle(hovered ? 0x2a0060 : 0x0a0028, 1)
      findG.fillRoundedRect(W / 2 - 190, y - 30, 380, 60, 10)
      findG.lineStyle(hovered ? 2 : 1.5, hovered ? 0x9b59b6 : 0x4a1080, hovered ? 1 : 0.55)
      findG.strokeRoundedRect(W / 2 - 190, y - 30, 380, 60, 10)
    }
    drawFind(false)

    this._findBtn = this.add.text(W / 2, y, 'FIND MATCH', {
      fontSize: '26px', fontFamily: 'monospace', fontStyle: 'bold', color: '#777',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })

    this._findBtn.on('pointerover', () => { if (!this._searching) { drawFind(true); this._findBtn.setColor('#cc88ff') } })
    this._findBtn.on('pointerout', () => { if (!this._searching) { drawFind(false); this._findBtn.setColor('#777') } })
    this._findBtn.on('pointerdown', () => { if (!this._searching) this._startSearch(this.registry.get('user')) })
  }

  async _showQrCode(W, H) {
    if (this._qrOpen) return
    this._qrOpen = true
    const url = window.location.origin + window.location.pathname
    const qrSrc = await QRCode.toDataURL(url, {
      width: 220,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#020617', light: '#ffffff' },
    })
    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.68).setDepth(40).setInteractive()
    const html = `
      <div style="font-family:Courier New,monospace;background:#05000f;border:1.5px solid #22d3ee;border-radius:8px;padding:20px;width:300px;text-align:center;color:#e0f2fe;box-shadow:0 0 30px rgba(34,211,238,.35)">
        <div style="font-size:16px;font-weight:bold;letter-spacing:3px;margin-bottom:12px">SCAN TO PLAY</div>
        <img src="${qrSrc}" alt="Game QR code" width="220" height="220" style="background:#fff;border-radius:4px;display:block;margin:0 auto">
        <div style="font-size:10px;color:#7dd3fc;margin-top:12px;word-break:break-all">${url}</div>
        <a href="${url}" target="_blank" rel="noreferrer" style="display:block;color:#bae6fd;font-size:11px;margin-top:8px;text-decoration:none">OPEN LINK</a>
        <button id="close-qr" style="margin-top:14px;background:#001a2e;border:1px solid #22d3ee;color:#e0f2fe;padding:8px 18px;border-radius:5px;font-family:Courier New,monospace;cursor:pointer">CLOSE</button>
      </div>`
    const dom = this.add.dom(W / 2, H / 2).createFromHTML(html).setDepth(41)
    dom.addListener('click')
    const close = () => {
      dom.destroy()
      overlay.destroy()
      this._qrOpen = false
    }
    dom.on('click', e => { if (e.target.id === 'close-qr') close() })
    overlay.on('pointerdown', close)
  }

  _isLocked(char, user) {
    if (!char) return true
    if (char.registeredOnly && user?.isGuest) return true
    if (!char.unlockChar) return false
    return !(user?.unlockedChars || []).includes(char.unlockChar)
  }

  update(_, delta) {
    if (!this._searching || this._matched) return
    this._dotTimer += delta
    if (this._dotTimer >= 500) {
      this._dotTimer -= 500
      this._dotCount = (this._dotCount + 1) % 4
      this._statusText?.setText('SEARCHING FOR OPPONENT' + '.'.repeat(this._dotCount))
    }
  }

  async _startSearch(user) {
    this._searching = true
    this._findBtn.disableInteractive()
    this._findBtn.setColor('#444')
    this._statusText.setColor('#9b59b6').setText('CONNECTING...')
    clearOnlineSession()

    const mmChannel = supabase.channel('gtl-matchmaking', {
      config: { presence: { key: user.id } },
    })
    this._mmChannel = mmChannel

    mmChannel.on('presence', { event: 'sync' }, () => {
      if (this._matched) return
      const users = Object.values(mmChannel.presenceState()).flat()
      if (users.length < 2) return

      const sorted = users.sort((a, b) => (a.userId < b.userId ? -1 : 1))
      const iAmP1 = sorted[0].userId === user.id
      const iAmP2 = sorted[1].userId === user.id
      if (!iAmP1 && !iAmP2) return

      if (iAmP1) {
        const ids = [sorted[0].userId, sorted[1].userId].sort()
        const roomId = ids.map(id => id.slice(0, 8)).join('-')
        const stage = STAGES[Math.floor(ids[0].charCodeAt(0) % STAGES.length)]
        const payload = {
          roomId, stage,
          p1Id: sorted[0].userId, p1Char: sorted[0].charKey, p1Name: sorted[0].displayName,
          p2Id: sorted[1].userId, p2Char: sorted[1].charKey, p2Name: sorted[1].displayName,
        }
        mmChannel.send({ type: 'broadcast', event: 'match_found', payload })
        this._onMatchFound(payload, true)
      }
    })

    mmChannel.on('broadcast', { event: 'match_found' }, ({ payload }) => {
      if (this._matched) return
      if (payload.p2Id !== user.id) return
      this._onMatchFound(payload, false)
    })

    await mmChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await mmChannel.track({
          userId: user.id,
          charKey: this._selectedChar,
          displayName: user.displayName || user.email || 'PLAYER',
        })
        this._statusText.setText('SEARCHING FOR OPPONENT')
      }
    })
  }

  _onMatchFound(payload, isP1) {
    if (this._matched) return
    this._matched = true

    const remoteName = isP1 ? (payload.p2Name || 'OPPONENT') : (payload.p1Name || 'OPPONENT')
    this._statusText.setColor('#a78bfa').setText('OPPONENT FOUND: ' + remoteName)

    this._mmChannel?.unsubscribe()
    this._mmChannel = null

    const gameChannel = supabase.channel('game:' + payload.roomId, {
      config: { broadcast: { self: false } },
    })
    onlineSession.active = true
    onlineSession.channel = gameChannel
    onlineSession.roomId = payload.roomId
    onlineSession.isP1 = isP1
    onlineSession.remoteDisplayName = remoteName

    gameChannel.subscribe(() => {
      let count = 3
      this._statusText.setColor('#fbbf24').setText('STARTING IN ' + count + '...')
      this.time.addEvent({
        delay: 1000, repeat: 2,
        callback: () => {
          count--
          if (count > 0) {
            this._statusText.setText('STARTING IN ' + count + '...')
          } else {
            this.scene.start('FightScene', {
              mode: 'online',
              p1: isP1 ? payload.p1Char : payload.p2Char,
              p2: isP1 ? payload.p2Char : payload.p1Char,
              stage: payload.stage,
            })
          }
        },
      })
    })
  }

  _cleanup() {
    this._mmChannel?.unsubscribe()
    this._mmChannel = null
    if (!this._matched) clearOnlineSession()
  }

  shutdown() {
    this._cleanup()
  }
}
