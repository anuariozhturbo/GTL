import Fighter from './Fighter.js'

export default class Phantom extends Fighter {
  setupUnique() {
    this.teleportCooldown = 0
    this._clones = []
  }

  resetUnique() {
    this.teleportCooldown = 0
    this._clones.forEach(c => c.destroy())
    this._clones = []
  }

  // On hit: leave a shadow clone at the impact point that lingers
  checkHit() {
    if (!this.opponent || this.opponent.state === 'dead') return
    if (this.distToOpponent < this.cfg.attackRange) {
      this.opponent.takeDamage(this.cfg.attackDamage, true, this)
      this._spawnAfterClone(this.x, this.y)
    }
  }

  _spawnAfterClone(x, y) {
    const clone = this.scene.add.image(x, y, this.texture.key, this.frame.name)
      .setFlipX(this.flipX)
      .setAlpha(0.45)
      .setTint(0x2d0060)
      .setDepth(0)
      .setScale(this.scaleX, this.scaleY)

    this._clones.push(clone)

    // Clone pulses then fades
    this.scene.tweens.add({
      targets: clone,
      alpha: { from: 0.45, to: 0.0 },
      duration: this.cfg.cloneDuration,
      ease: 'Quad.In',
      onComplete: () => {
        clone.destroy()
        this._clones = this._clones.filter(c => c !== clone)
      }
    })

    // Clone deals damage if opponent walks into it
    const check = this.scene.time.addEvent({ delay: 80, loop: true, callback: () => {
      if (!clone.active) { check.remove(); return }
      const opp = this.opponent
      if (opp && opp.state !== 'dead' && !opp.isBlocking) {
        const dx = Math.abs(clone.x - opp.x)
        const dy = Math.abs(clone.y - opp.y)
        if (dx < 44 && dy < 60) {
          opp.takeDamage(6, false, this)
          this.scene.spawnHitSpark(clone.x, clone.y - 30, false)
          clone.destroy()
          check.remove()
          this._clones = this._clones.filter(c => c !== clone)
        }
      }
    }})
  }

  // Special: teleport behind opponent and strike — unblockable
  doSpecial() {
    if (this.specialCooldown > 0 || !this.opponent) return
    this.specialCooldown = this.cfg.specialCooldown

    // Flash out
    this.setAlpha(0)
    this.scene.spawnHitSpark(this.x, this.y - 40, true)

    this.scene.time.delayedCall(120, () => {
      if (!this.active) return
      // Teleport to behind opponent
      const behindX = this.opponent.x + (this.opponent.x > this.x ? -80 : 80)
      this.setPosition(behindX, this.opponent.y)
      this.setAlpha(1)
      this.scene.spawnHitSpark(this.x, this.y - 40, true)

      // Unblockable strike
      if (this.distToOpponent < this.cfg.attackRange * 1.3) {
        this.opponent.takeDamage(this.cfg.teleportDamage, false, this)
        this.scene.spawnHitSpark(this.opponent.x, this.opponent.y - 50, false)
      }
    })
  }

  updateUnique(delta) {
    if (this.teleportCooldown > 0) this.teleportCooldown -= delta
  }

  get specialReady() { return this.specialCooldown <= 0 }
}
