export default class RoundUI {
  constructor(scene, W, p1Wins, p2Wins, roundNum, p1Key, p2Key) {
    this.scene = scene
    const CHAR_COLORS = { ash: 0x7c3aed, merrs: 0x60a5fa, dice: 0xf59e0b, thragg: 0xef4444, trackstar: 0xfacc15, kendi: 0x38bdf8, overclock: 0xf97316 }
    const c1 = CHAR_COLORS[p1Key] || 0x9b59b6
    const c2 = CHAR_COLORS[p2Key] || 0x9b59b6

    // ── Timer pill ────────────────────────────────────────────────
    const timerBg = scene.add.graphics().setDepth(10).setScrollFactor(0)
    timerBg.fillStyle(0x000000, 0.78)
    timerBg.fillRoundedRect(W / 2 - 32, 6, 64, 50, 9)
    timerBg.lineStyle(1.5, 0x6b21a8, 0.85)
    timerBg.strokeRoundedRect(W / 2 - 32, 6, 64, 50, 9)

    this.timerText = scene.add.text(W / 2, 32, '99', {
      fontSize: '40px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(11).setScrollFactor(0)

    this.roundLabel = scene.add.text(W / 2, 56, `ROUND ${roundNum}`, {
      fontSize: '10px', color: '#7c3aed', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5, 1).setDepth(11).setScrollFactor(0)

    // ── Win gems (P1 left, P2 right) ─────────────────────────────
    this.gems1 = this._createGems(scene, W / 2 - 90, 30, c1)
    this.gems2 = this._createGems(scene, W / 2 + 90, 30, c2)
    this.setWins(p1Wins, p2Wins)

    // ── Announcement text ─────────────────────────────────────────
    this.announcement = scene.add.text(W / 2, 280, '', {
      fontSize: '82px', color: '#ffdd00', fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 9,
    }).setOrigin(0.5).setDepth(20).setAlpha(0).setScrollFactor(0)
  }

  _createGems(scene, cx, cy, color) {
    return [0, 1].map(i =>
      scene.add.rectangle(cx + (i - 0.5) * 22, cy, 14, 20, 0x1a1a1a)
        .setDepth(10).setStrokeStyle(1.5, 0x333333).setScrollFactor(0)
    )
  }

  setRound(n) {
    this.roundLabel.setText(`ROUND ${n}`)
  }

  setTime(t) {
    this.timerText.setText(String(Math.ceil(t)))
    if (t <= 10) {
      this.timerText.setColor('#ff4444')
      this.scene.tweens.add({ targets: this.timerText, scaleX: 1.18, scaleY: 1.18,
        duration: 90, yoyo: true })
    } else {
      this.timerText.setColor('#ffffff')
    }
  }

  setWins(p1, p2) {
    this.gems1.forEach((g, i) => {
      g.setFillStyle(i < p1 ? 0xffdd00 : 0x1a1a1a)
      g.setStrokeStyle(1.5, i < p1 ? 0xfbbf24 : 0x333333)
    })
    this.gems2.forEach((g, i) => {
      g.setFillStyle(i < p2 ? 0xffdd00 : 0x1a1a1a)
      g.setStrokeStyle(1.5, i < p2 ? 0xfbbf24 : 0x333333)
    })
  }

  showAnnouncement(text, duration) {
    this.announcement.setText(text).setAlpha(1).setScale(0.35)
    this.scene.tweens.add({
      targets: this.announcement, scaleX: 1, scaleY: 1,
      duration: 220, ease: 'Back.Out',
    })
    this.scene.tweens.add({
      targets: this.announcement, alpha: 0,
      delay: duration - 300, duration: 300,
    })
  }
}
