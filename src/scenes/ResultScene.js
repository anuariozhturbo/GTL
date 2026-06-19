export default class ResultScene extends Phaser.Scene {
  constructor() { super('ResultScene') }

  init(data) {
    this.winner  = data.winner
    this.mode    = data.mode
    this.p1Key   = data.p1
    this.p2Key   = data.p2
    this.p1Wins  = data.p1Wins
    this.p2Wins  = data.p2Wins
  }

  create() {
    const W = this.scale.width, H = this.scale.height

    const bg = this.add.graphics()
    bg.fillGradientStyle(0x050010, 0x050010, 0x150035, 0x150035, 1)
    bg.fillRect(0, 0, W, H)

    // Player names
    const user = this.registry.get('user')
    const p1Name = (!user || user.isGuest) ? 'PLAYER 1' : user.displayName
    const p2Name = 'PLAYER 2'
    const winnerName = this.winner === 1 ? p1Name : this.winner === 2 ? p2Name : null

    // Title
    const winText = this.winner === 0 ? 'DRAW!' : `${winnerName} WINS!`
    this.add.text(W / 2, 190, winText, {
      fontSize: '68px', color: '#ffdd00', fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5)

    // Characters
    this.add.text(W / 2, 300, `${this.p1Key.toUpperCase()} vs ${this.p2Key.toUpperCase()}`, {
      fontSize: '28px', color: '#aaaaaa', fontFamily: 'monospace',
    }).setOrigin(0.5)

    // Score
    this.add.text(W / 2, 360, `${this.p1Wins} — ${this.p2Wins}`, {
      fontSize: '48px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5)

    // Logged-in user stats row
    if (user && !user.isGuest) {
      const newWins   = user.wins   + (this.winner === 1 ? 1 : 0)
      const newLosses = user.losses + (this.winner === 2 ? 1 : 0)
      this.add.text(W / 2, 430, `${user.displayName}  ·  ${newWins}W  ${newLosses}L`, {
        fontSize: '16px', color: '#7c3aed', fontFamily: 'monospace', letterSpacing: 2,
      }).setOrigin(0.5)
    }

    // Buttons
    this.makeBtn(W / 2 - 160, 510, 'REMATCH', () => {
      this.scene.start('FightScene', { mode: this.mode, p1: this.p1Key, p2: this.p2Key })
    })
    this.makeBtn(W / 2 + 160, 510, 'MENU', () => {
      this.scene.start('MenuScene')
    })
  }

  makeBtn(x, y, label, cb) {
    const btn = this.add.text(x, y, label, {
      fontSize: '26px', color: '#ffffff', fontFamily: 'monospace',
      backgroundColor: '#2d0060', padding: { x: 28, y: 12 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    btn.on('pointerover',  () => btn.setColor('#ffdd00').setScale(1.05))
    btn.on('pointerout',   () => btn.setColor('#ffffff').setScale(1))
    btn.on('pointerdown',  cb)
  }
}
