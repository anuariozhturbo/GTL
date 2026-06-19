import Fighter from './Fighter.js'

export default class Golem extends Fighter {
  setupUnique() {
    this.isStomping = false
  }

  resetUnique() {
    this.isStomping = false
  }

  // Heavy hit — massive knockback
  checkHit() {
    if (!this.opponent || this.opponent.state === 'dead') return
    if (this.distToOpponent < this.cfg.attackRange) {
      this.opponent.takeDamage(this.cfg.attackDamage, true, this)
      // Extra knockback — send them flying
      const dir = this.opponent.x > this.x ? 1 : -1
      this.opponent.setVelocityX(dir * 620)
      this.opponent.setVelocityY(-260)
    }
  }

  // Special: ground stomp — AoE stun in a wide radius
  doSpecial() {
    if (this.specialCooldown > 0 || this.isStomping) return
    if (!this.body.blocked.down) return  // must be grounded
    this.specialCooldown = this.cfg.specialCooldown
    this.isStomping = true
    this.setState('special')
    this.setVelocityX(0)

    // Wind-up delay
    this.scene.time.delayedCall(300, () => {
      if (!this.active) return
      // Screen shake + dust ring
      this.scene.cameras.main.shake(400, 0.022)
      this._spawnStompRing()

      // Damage + stun everything in range
      const opp = this.opponent
      if (opp && opp.state !== 'dead') {
        const dx = Math.abs(opp.x - this.x)
        if (dx < this.cfg.stompRange) {
          opp.takeDamage(this.cfg.stompDamage, false, this)
          opp.applyStun(this.cfg.stompStunDuration)
        }
      }

      this.scene.time.delayedCall(300, () => {
        this.isStomping = false
        if (this.state === 'special') this.setState('idle')
      })
    })
  }

  _spawnStompRing() {
    const { x, y } = this
    const cols = [0x9ca3af, 0x6b7280, 0xd1d5db]
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2
      const speed = 80 + Math.random() * 120
      const size  = 4 + Math.random() * 5
      const p = this.scene.add.circle(x, y + 38, size, cols[i % 3], 0.9).setDepth(2)
      this.scene.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * speed,
        y: (y + 38) + Math.sin(angle) * speed * 0.35,
        alpha: 0, scaleX: 0.2, scaleY: 0.2,
        duration: 420 + Math.random() * 200, ease: 'Quad.Out',
        onComplete: () => p.destroy()
      })
    }
    // Ring wave
    const ring = this.scene.add.graphics().setDepth(3)
    ring.lineStyle(5, 0xd1d5db, 0.9)
    ring.strokeEllipse(0, 0, 20, 8)
    ring.setPosition(x, y + 38)
    this.scene.tweens.add({
      targets: ring, scaleX: this.cfg.stompRange / 10, scaleY: this.cfg.stompRange / 25,
      alpha: 0, duration: 380, ease: 'Quad.Out', onComplete: () => ring.destroy()
    })
  }

  updateUnique(delta) {}
  get specialReady() { return this.specialCooldown <= 0 }
}
