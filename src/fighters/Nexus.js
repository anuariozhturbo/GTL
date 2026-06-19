import Fighter from './Fighter.js'

export default class Nexus extends Fighter {
  setupUnique() {
    this.counterHits   = 0   // hits taken since last counter-mode reset
    this.counterActive = false
    this._counterTimer = 0
  }

  resetUnique() {
    this.counterHits   = 0
    this.counterActive = false
    this._counterTimer = 0
  }

  // Override takeDamage to track counter hits
  takeDamage(amount, isBlockable, attacker) {
    super.takeDamage(amount, isBlockable, attacker)
    if (this.state === 'dead') return
    this.counterHits++
    if (this.counterHits >= this.cfg.counterHits && !this.counterActive) {
      this._activateCounterMode()
    }
  }

  _activateCounterMode() {
    this.counterActive = true
    this.counterHits   = 0
    this._counterTimer = 4000  // 4s of counter mode

    // Blue electric pulse on body
    this.setTint(0x60a5fa)
    const tween = this.scene.tweens.add({
      targets: this, alpha: { from: 0.7, to: 1 },
      duration: 180, yoyo: true, repeat: 10,
      onComplete: () => { if (this.active) { this.clearTint(); this.setAlpha(1) } }
    })

    // Speed + attack boost while active
    this._baseSpeed = this.cfg.speed
    this.cfg = { ...this.cfg, speed: Math.floor(this.cfg.speed * 1.30), attackCooldown: Math.floor(this.cfg.attackCooldown * 0.65) }
  }

  _deactivateCounterMode() {
    this.counterActive = false
    if (this._baseSpeed) {
      this.cfg = { ...this.cfg, speed: this._baseSpeed, attackCooldown: Math.floor(this._baseSpeed / 200 * 410) }
      this._baseSpeed = null
    }
    this.clearTint()
  }

  // Electric discharge: stun + push AoE around self
  doSpecial() {
    if (this.specialCooldown > 0) return
    this.specialCooldown = this.cfg.specialCooldown
    this.setState('special')
    this.setVelocityX(0)

    // Electric ring VFX
    this._spawnDischargeRing()

    this.scene.time.delayedCall(180, () => {
      if (!this.active) return
      const opp = this.opponent
      if (opp && opp.state !== 'dead') {
        const dx = Math.abs(opp.x - this.x)
        if (dx < this.cfg.dischargeRange) {
          opp.takeDamage(this.cfg.dischargeDamage, false, this)
          opp.applyStun(this.cfg.dischargeStun)
          // Push opponent away
          const dir = opp.x > this.x ? 1 : -1
          opp.setVelocityX(dir * 500)
        }
      }
      this.scene.time.delayedCall(200, () => {
        if (this.state === 'special') this.setState('idle')
      })
    })
  }

  _spawnDischargeRing() {
    const { x, y } = this
    const ring = this.scene.add.graphics().setDepth(5)
    ring.lineStyle(4, 0x60a5fa, 1)
    ring.strokeCircle(0, 0, 16)
    ring.setPosition(x, y - 20)
    this.scene.tweens.add({
      targets: ring, scaleX: this.cfg.dischargeRange / 16, scaleY: this.cfg.dischargeRange / 16,
      alpha: 0, duration: 320, ease: 'Quad.Out', onComplete: () => ring.destroy()
    })

    // Lightning bolts
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const len   = 60 + Math.random() * 80
      const bolt  = this.scene.add.graphics().setDepth(5)
      bolt.lineStyle(1.5, 0x93c5fd, 0.9)
      bolt.lineBetween(x, y - 20, x + Math.cos(angle) * len, (y - 20) + Math.sin(angle) * len * 0.4)
      this.scene.tweens.add({ targets: bolt, alpha: 0, duration: 250, onComplete: () => bolt.destroy() })
    }

    this.scene.cameras.main.shake(220, 0.012)
  }

  updateUnique(delta) {
    if (this.counterActive) {
      this._counterTimer -= delta
      if (this._counterTimer <= 0) this._deactivateCounterMode()
    }
  }

  get specialReady() { return this.specialCooldown <= 0 }
}
