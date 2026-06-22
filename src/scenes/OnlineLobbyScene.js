import { supabase }                          from '../lib/supabase.js'
import { onlineSession, clearOnlineSession } from '../lib/onlineSession.js'

const CHARS = [
  { key: 'ash',    label: 'ASH',    color: 0x7c3aed },
  { key: 'merrs',  label: 'MERRS',  color: 0x60a5fa },
  { key: 'dice',   label: 'DICE',   color: 0xf59e0b },
  { key: 'thragg', label: 'THRAGG', color: 0xef4444 },
  { key: 'lohe',   label: 'LOHE',   color: 0xfde047 },
]
const STAGES = ['neonvoid', 'volcano', 'cybercity', 'spacestation']

export default class OnlineLobbyScene extends Phaser.Scene {
  constructor() { super('OnlineLobbyScene') }

  init() {
    this._selectedChar = 'ash'
    this._searching    = false
    this._matched      = false
    this._mmChannel    = null
    this._dotTimer     = 0
    this._dotCount     = 0
  }

  create() {
    const W = this.scale.width, H = this.scale.height
    const user = this.registry.get('user')

    // ── Background ────────────────────────────────────────────────
    const bg = this.add.graphics()
    bg.fillGradientStyle(0x01000a, 0x01000a, 0x09001f, 0x09001f, 1)
    bg.fillRect(0, 0, W, H)
    bg.fillStyle(0x4a1080, 0.12); bg.fillCircle(W / 2, 200, 320)
    bg.fillStyle(0x7c3aed, 0.04); bg.fillCircle(W * 0.15, H * 0.75, 200)
    bg.fillStyle(0x3b0f6e, 0.07); bg.fillCircle(W * 0.85, H * 0.25, 170)
    for (let i = 0; i < 60; i++) {
      bg.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.1, 0.5))
      bg.fillRect(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H), 1, 1)
    }

    // Corner gems + border
    const cg = this.add.graphics()
    for (const [cx, cy] of [[18, 18], [W - 18, 18], [18, H - 18], [W - 18, H - 18]]) {
      cg.fillStyle(0x5b0fa0, 0.9); cg.fillCircle(cx, cy, 7)
      cg.fillStyle(0xc084fc, 0.6); cg.fillCircle(cx, cy, 3)
    }
    cg.lineStyle(1.5, 0x260055, 0.7)
    cg.lineBetween(30, 18, W - 30, 18);   cg.lineBetween(30, H - 18, W - 30, H - 18)
    cg.lineBetween(18, 30, 18, H - 30);   cg.lineBetween(W - 18, 30, W - 18, H - 30)

    // Back button
    const backBtn = this.add.text(36, 24, '← BACK', {
      fontSize: '14px', fontFamily: 'monospace', color: '#3a0070',
    }).setInteractive({ useHandCursor: true })
    backBtn.on('pointerover',  () => backBtn.setColor('#cc88ff'))
    backBtn.on('pointerout',   () => backBtn.setColor('#3a0070'))
    backBtn.on('pointerdown',  () => { this._cleanup(); this.scene.start('MenuScene') })
    this.input.keyboard.on('keydown-ESC', () => { this._cleanup(); this.scene.start('MenuScene') })

    // Title
    this.add.text(W / 2, 72, 'ONLINE BATTLE', {
      fontSize: '52px', color: '#9b59b6', fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#2d0060', strokeThickness: 4,
    }).setOrigin(0.5)

    // ── Guest wall ────────────────────────────────────────────────
    if (!user || user.isGuest) {
      this.add.text(W / 2, H / 2 - 40, 'YOU MUST BE SIGNED IN TO PLAY ONLINE', {
        fontSize: '22px', color: '#ef4444', fontFamily: 'monospace',
      }).setOrigin(0.5)
      const signInBtn = this.add.text(W / 2, H / 2 + 36, '[ SIGN IN ]', {
        fontSize: '20px', color: '#cc88ff', fontFamily: 'monospace',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      signInBtn.on('pointerover',  () => signInBtn.setScale(1.06))
      signInBtn.on('pointerout',   () => signInBtn.setScale(1))
      signInBtn.on('pointerdown',  () => this.scene.start('AuthScene'))
      return
    }

    // Signed-in user line
    this.add.text(W / 2, 145, `● ${user.displayName || user.email}   ${user.wins ?? 0}W · ${user.losses ?? 0}L`, {
      fontSize: '13px', color: '#7c3aed', fontFamily: 'monospace',
    }).setOrigin(0.5)

    // Divider
    const hr = this.add.graphics()
    hr.lineStyle(1, 0x5a1090, 0.4)
    hr.lineBetween(W / 2 - 300, 172, W / 2 + 300, 172)
    hr.fillStyle(0x9b59b6, 0.9); hr.fillCircle(W / 2, 172, 4)

    this.add.text(W / 2, 196, '— CHOOSE YOUR FIGHTER —', {
      fontSize: '13px', color: '#5a1090', fontFamily: 'monospace', letterSpacing: 4,
    }).setOrigin(0.5)

    // ── Character selector ────────────────────────────────────────
    const charBtnW = 150, charBtnH = 66, gap = 18
    const totalW   = CHARS.length * charBtnW + (CHARS.length - 1) * gap
    const startX   = W / 2 - totalW / 2

    this._charBtns = []

    CHARS.forEach(({ key, label, color }, idx) => {
      const bx     = startX + idx * (charBtnW + gap) + charBtnW / 2
      const by     = 268
      const hexCol = '#' + color.toString(16).padStart(6, '0')
      const isDefault = key === 'ash'

      const btnG = this.add.graphics()
      const draw = (hovered, selected) => {
        btnG.clear()
        const fillC = selected ? 0x1a0048 : (hovered ? 0x100030 : 0x050015)
        const lineC = selected ? color      : (hovered ? 0x9b59b6 : 0x2a0060)
        const lineA = selected ? 1          : (hovered ? 0.85     : 0.45)
        const lineW = selected ? 2.5        : 1.5
        btnG.fillStyle(fillC, 1)
        btnG.fillRoundedRect(bx - charBtnW / 2, by - charBtnH / 2, charBtnW, charBtnH, 8)
        if (selected) { btnG.fillStyle(color, 0.10); btnG.fillRoundedRect(bx - charBtnW / 2, by - charBtnH / 2, charBtnW, charBtnH, 8) }
        btnG.lineStyle(lineW, lineC, lineA)
        btnG.strokeRoundedRect(bx - charBtnW / 2, by - charBtnH / 2, charBtnW, charBtnH, 8)
      }
      draw(false, isDefault)

      const txt = this.add.text(bx, by, label, {
        fontSize: '17px', fontFamily: 'monospace', fontStyle: 'bold',
        color: isDefault ? hexCol : '#555',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true })

      const ref = { key, draw, txt, hexCol }
      this._charBtns.push(ref)

      txt.on('pointerover',  () => { if (this._selectedChar !== key && !this._searching) draw(true, false) })
      txt.on('pointerout',   () => draw(false, this._selectedChar === key))
      txt.on('pointerdown',  () => {
        if (this._searching) return
        this._selectedChar = key
        this._charBtns.forEach(b => {
          b.draw(false, b.key === key)
          b.txt.setColor(b.key === key ? b.hexCol : '#555')
        })
      })
    })

    // ── FIND MATCH button ─────────────────────────────────────────
    const fbY  = 392
    const findG = this.add.graphics()
    const drawFind = (hovered) => {
      findG.clear()
      findG.fillStyle(hovered ? 0x2a0060 : 0x0a0028, 1)
      findG.fillRoundedRect(W / 2 - 190, fbY - 30, 380, 60, 10)
      findG.lineStyle(hovered ? 2 : 1.5, hovered ? 0x9b59b6 : 0x4a1080, hovered ? 1 : 0.55)
      findG.strokeRoundedRect(W / 2 - 190, fbY - 30, 380, 60, 10)
    }
    drawFind(false)

    this._findBtn = this.add.text(W / 2, fbY, 'FIND MATCH', {
      fontSize: '26px', fontFamily: 'monospace', fontStyle: 'bold', color: '#777',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })

    this._findBtn.on('pointerover',  () => { if (!this._searching) { drawFind(true);  this._findBtn.setColor('#cc88ff') } })
    this._findBtn.on('pointerout',   () => { if (!this._searching) { drawFind(false); this._findBtn.setColor('#777') } })
    this._findBtn.on('pointerdown',  () => { if (!this._searching) this._startSearch(user) })

    // Status text
    this._statusText = this.add.text(W / 2, 492, '', {
      fontSize: '18px', color: '#5a1090', fontFamily: 'monospace',
    }).setOrigin(0.5)

    // Mode hint
    this.add.text(W / 2, 560, 'Auto-matched with a random online opponent', {
      fontSize: '12px', color: '#2a0050', fontFamily: 'monospace',
    }).setOrigin(0.5)

    // Footer
    this.add.text(W / 2, H - 22, 'ESC to go back', {
      fontSize: '12px', color: '#2a0050', fontFamily: 'monospace',
    }).setOrigin(0.5)
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
      config: { presence: { key: user.id } }
    })
    this._mmChannel = mmChannel

    // Presence sync: fires whenever someone joins or leaves
    mmChannel.on('presence', { event: 'sync' }, () => {
      if (this._matched) return
      const users  = Object.values(mmChannel.presenceState()).flat()
      if (users.length < 2) return

      // Deterministic pairing: sort by userId so both clients agree on P1/P2
      const sorted = users.sort((a, b) => (a.userId < b.userId ? -1 : 1))
      const iAmP1  = sorted[0].userId === user.id
      const iAmP2  = sorted[1].userId === user.id
      if (!iAmP1 && !iAmP2) return  // we're not in the first pair

      if (iAmP1) {
        const ids     = [sorted[0].userId, sorted[1].userId].sort()
        const roomId  = ids.map(id => id.slice(0, 8)).join('-')
        const stage   = STAGES[Math.floor(ids[0].charCodeAt(0) % STAGES.length)]  // deterministic
        const payload = {
          roomId, stage,
          p1Id:   sorted[0].userId, p1Char: sorted[0].charKey, p1Name: sorted[0].displayName,
          p2Id:   sorted[1].userId, p2Char: sorted[1].charKey, p2Name: sorted[1].displayName,
        }
        mmChannel.send({ type: 'broadcast', event: 'match_found', payload })
        this._onMatchFound(payload, true)
      }
    })

    // P2 receives the match_found broadcast from P1
    mmChannel.on('broadcast', { event: 'match_found' }, ({ payload }) => {
      if (this._matched) return
      if (payload.p2Id !== user.id) return  // not for us
      this._onMatchFound(payload, false)
    })

    await mmChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await mmChannel.track({
          userId:      user.id,
          charKey:     this._selectedChar,
          displayName: user.displayName || user.email || 'PLAYER',
        })
        this._statusText.setText('SEARCHING FOR OPPONENT')
      }
    })
  }

  _onMatchFound(payload, isP1) {
    if (this._matched) return
    this._matched = true

    const remoteName = isP1
      ? (payload.p2Name || 'OPPONENT')
      : (payload.p1Name || 'OPPONENT')

    this._statusText.setColor('#a78bfa').setText('OPPONENT FOUND: ' + remoteName)

    // Leave matchmaking immediately so other players don't try to pair with us
    this._mmChannel?.unsubscribe()
    this._mmChannel = null

    // Open the dedicated game channel
    const gameChannel = supabase.channel('game:' + payload.roomId, {
      config: { broadcast: { self: false } }
    })
    onlineSession.active            = true
    onlineSession.channel           = gameChannel
    onlineSession.roomId            = payload.roomId
    onlineSession.isP1              = isP1
    onlineSession.remoteDisplayName = remoteName

    gameChannel.subscribe(() => {
      // Short countdown then launch FightScene
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
              mode:  'online',
              p1:    isP1 ? payload.p1Char : payload.p2Char,
              p2:    isP1 ? payload.p2Char : payload.p1Char,
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
