export default class HealthBar {
  constructor(scene, x, y, flipped, charName, charColor, playerName) {
    this.scene   = scene
    this.flipped = flipped
    this.W       = 380
    charColor    = charColor || 0x22cc44

    const originX = flipped ? 1 : 0
    const bx      = flipped ? x - this.W : x
    const hexStr  = `#${charColor.toString(16).padStart(6, '0')}`

    scene.add.rectangle(bx + this.W / 2, y + 14, this.W + 8, 34, charColor)
      .setOrigin(0.5).setDepth(9).setAlpha(0.16).setScrollFactor(0)

    scene.add.rectangle(bx + this.W / 2, y + 14, this.W, 26, 0x000000)
      .setOrigin(0.5).setDepth(10).setScrollFactor(0)

    this.ghost = scene.add.rectangle(x, y + 14, this.W, 26, 0xff5500)
      .setOrigin(originX, 0.5).setDepth(10).setScrollFactor(0)

    this.bar = scene.add.rectangle(x, y + 14, this.W, 26, 0x22cc44)
      .setOrigin(originX, 0.5).setDepth(11).setScrollFactor(0)

    this.shine = scene.add.rectangle(x, y + 9, this.W, 4, 0xffffff)
      .setOrigin(originX, 0.5).setDepth(12).setAlpha(0.2).setScrollFactor(0)

    scene.add.rectangle(bx + this.W / 2, y + 14, this.W + 4, 30, 0x000000)
      .setOrigin(0.5).setDepth(9).setStrokeStyle(2, charColor).setScrollFactor(0)

    const labelX = flipped ? x : bx
    const label  = `${playerName || (flipped ? 'P2' : 'P1')} · ${charName || ''}`
    scene.add.text(labelX, y - 4, label, {
      fontSize: '12px', color: hexStr, fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(flipped ? 1 : 0, 1).setDepth(12).setScrollFactor(0)
  }

  setHP(hp, maxHp) {
    const ratio = Math.max(0, hp / maxHp)
    const newW  = this.W * ratio
    this.bar.width   = newW
    this.shine.width = newW
    this.bar.setFillStyle(ratio > 0.5 ? 0x22cc44 : ratio > 0.25 ? 0xffaa00 : 0xff2222)
    this.scene.tweens.add({ targets: this.ghost, width: newW, duration: 700, ease: 'Power2' })
  }
}
